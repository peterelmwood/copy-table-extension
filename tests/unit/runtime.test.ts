import { describe, expect, it } from "vitest";

describe("runtime metadata adapter", () => {
  it("reads the installed manifest version from an injected browser runtime", async () => {
    const { createRuntimeMetadataAdapter } = await import("../../src/browser/runtime");
    const runtimeMetadata = createRuntimeMetadataAdapter({
      getManifest: () => ({ version: "1.2.3" })
    });

    expect(runtimeMetadata.getVersion()).toBe("1.2.3");
  });
});
