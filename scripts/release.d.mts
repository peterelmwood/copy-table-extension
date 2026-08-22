export type ReleaseVersion = {
  tag: string;
  version: string;
};

export type ReviewerSourceArchiveOptions = {
  artifactsDirectory: string;
  projectRoot: string;
  version: string;
};

export function parseStableTag(tag: string): string;

export function validateReleaseVersions(
  tag: string,
  packageVersion: string,
  manifestVersion: string
): ReleaseVersion;

export function createReviewerSourceArchive(options: ReviewerSourceArchiveOptions): Promise<string>;

export function collectRegularFiles(directory: string): Promise<string[]>;
