import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, resolve, sep } from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

export interface FixtureServer {
  /** Absolute http URL for a path relative to the served root, e.g. `tables/basic-table.html`. */
  url(path: string): string;
  close(): Promise<void>;
}

/**
 * Serves a fixture directory over loopback http. Pages are loaded over http
 * rather than `file://` so frames on the same server share an origin, as they
 * would on a real site.
 */
export async function startFixtureServer(rootDirectory: string): Promise<FixtureServer> {
  const root = resolve(rootDirectory);

  const server: Server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://fixture").pathname);
    const filePath = resolve(root, `.${pathname}`);
    if (!filePath.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }

    readFile(filePath).then(
      (body) => {
        response.writeHead(200, {
          "content-type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
          "cache-control": "no-store"
        });
        response.end(body);
      },
      () => {
        response.writeHead(404).end();
      }
    );
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: (path) => new URL(path, `http://127.0.0.1:${port}/`).href,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.closeAllConnections();
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      })
  };
}
