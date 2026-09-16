# Contract: Release Validation and Artifacts

## Stable Version Contract

- Accepted tag grammar: `^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$`.
- The captured version is compared byte-for-byte with `package.json` and
  `src/manifest.json` versions.
- Pre-release suffixes, build metadata, leading zeroes, missing components, and
  mismatches fail before build or network access.

## Reviewer Source Contract

The source archive contains only:

- all regular files under `src/`, `scripts/`, and `tests/`;
- `package.json` and `package-lock.json`;
- `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, and
  `prettier.config.js`;
- `README.md`, `AMO_BUILD.md`, `LICENSE`, and `amo-metadata.json`.

It contains no symbolic links and no files from `node_modules/`, `dist/`,
`web-ext-artifacts/`, coverage/test-output directories, `.git/`, `.github/`,
`.squad/`, `.specify/`, editor state, environment files, credential files, or
unrelated local files.

Entries are normalized to forward-slash paths, sorted bytewise, stamped with a
fixed ZIP timestamp and mode, and compressed with fixed settings. Repeated
packaging of the same committed inputs produces the same SHA-256 digest.

## AMO Metadata Contract

`amo-metadata.json` must contain:

- `summary.en-US`: a non-empty, single-sentence description;
- `categories`: exactly `["web-development"]`;
- `version.license`: exactly `"ISC"`.

No credential, release status, or owner-private value belongs in the metadata.

## Dry-Run Contract

The no-credential dry run performs version validation, the full verification
pipeline, extension packaging, reviewer-source packaging, and artifact
inspection. It does not invoke `web-ext sign`, require AMO credentials, create
a tag, modify versions, or contact AMO.
