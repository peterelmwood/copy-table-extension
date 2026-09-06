export interface ArtifactPathOptions {
  artifactsOverride: string | undefined;
  projectRoot: string;
}

export interface GeneratedOutputOptions extends ArtifactPathOptions {
  distDirectory: string;
}

export function extensionArchiveFileName(version: string): string;
export function resolveArtifactsDirectory(options: ArtifactPathOptions): Promise<string>;
export function cleanGeneratedOutput(options: GeneratedOutputOptions): Promise<void>;
