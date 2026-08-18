export interface RuntimeManifest {
  version: string;
}

export interface BrowserRuntime {
  getManifest(): RuntimeManifest;
}

export interface RuntimeMetadataAdapter {
  getVersion(): string;
}

export function createRuntimeMetadataAdapter(runtime: BrowserRuntime): RuntimeMetadataAdapter {
  return {
    getVersion: () => runtime.getManifest().version
  };
}
