import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

const distDirectory = resolve(import.meta.dirname, "../../dist");
const manifestPath = resolve(distDirectory, "manifest.json");
const projectRoot = resolve(import.meta.dirname, "../..");
const sourceManifestPath = resolve(projectRoot, "src/manifest.json");

beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build.mjs", "build"], {
    cwd: projectRoot,
    stdio: "pipe"
  });
});

describe("Firefox manifest contract", () => {
  it("identifies a permission-minimal Manifest V3 Firefox extension", () => {
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    const action = manifest.action as Record<string, unknown>;
    const background = manifest.background as Record<string, unknown>;
    const browserSpecificSettings = manifest.browser_specific_settings as Record<string, unknown>;
    const gecko = browserSpecificSettings.gecko as Record<string, unknown>;
    const dataCollectionPermissions = gecko.data_collection_permissions as Record<string, unknown>;

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Copy Table");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
    expect(action.default_popup).toBe("popup/index.html");
    expect(background.scripts).toEqual(["background.js"]);
    expect(background.service_worker).toBe("background.js");
    expect(manifest.permissions).toEqual([
      "activeTab",
      "clipboardWrite",
      "menus",
      "notifications",
      "scripting"
    ]);
    expect(manifest.permissions).not.toContain("tabs");
    expect(manifest.permissions).not.toContain("storage");
    expect(manifest.permissions).not.toContain("webRequest");
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.permissions).not.toContain("clipboardRead");
    expect(manifest.externally_connectable).toBeUndefined();
    expect(manifest.native_messaging).toBeUndefined();
    expect(manifest.web_accessible_resources).toBeUndefined();
    expect(manifest.content_security_policy).toBeUndefined();
    expect(manifest.update_url).toBeUndefined();
    expect(manifest.developer).toBeUndefined();
    expect(gecko.id).toBe("copy-table@peterelmwood.com");
    expect(dataCollectionPermissions.required).toEqual(["none"]);
  });

  it("references only emitted extension files", () => {
    expect(existsSync(resolve(distDirectory, "background.js"))).toBe(true);
    expect(existsSync(resolve(distDirectory, "content/content-handler.js"))).toBe(true);
    expect(existsSync(resolve(distDirectory, "popup/index.html"))).toBe(true);
    expect(existsSync(resolve(distDirectory, "popup/popup.js"))).toBe(true);
    expect(existsSync(resolve(distDirectory, "popup/popup.css"))).toBe(true);
  });

  it("copies the reviewed source manifest without synthesis", () => {
    expect(readFileSync(manifestPath, "utf8")).toBe(readFileSync(sourceManifestPath, "utf8"));
  });

  it("emits a classic script Firefox can execute for background.scripts", () => {
    const backgroundSource = readFileSync(resolve(distDirectory, "background.js"), "utf8");

    expect(backgroundSource).not.toMatch(/\b(?:export|import)\b/);
    expect(() => runInNewContext(backgroundSource, Object.create(null))).not.toThrow();
  });
});
