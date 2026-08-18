# Contract: Build and Package Verification

## Commands

| Command                  | Required result                                                                  |
| ------------------------ | -------------------------------------------------------------------------------- |
| `npm run clean`          | Removes only generated `dist/` and `web-ext-artifacts/` content                  |
| `npm run build`          | Recreates `dist/` from committed source with no stale files                      |
| `npm run typecheck`      | Exits zero with no TypeScript errors                                             |
| `npm run lint`           | Exits zero with no lint violations                                               |
| `npm test`               | Runs all unit and integration tests and exits zero                               |
| `npm run lint:extension` | Mozilla `web-ext` lint exits zero against `dist/`                                |
| `npm run package`        | Produces one byte-reproducible Firefox archive in `web-ext-artifacts/`           |
| `npm run verify`         | Runs the complete clean quality pipeline and removes generated output on failure |

## Artifact contents

The built directory and packaged archive MUST contain:

- `manifest.json`
- `background.js`
- `popup/index.html`
- `popup/popup.js`
- `popup/popup.css`

They MUST NOT contain TypeScript sources, tests, dependency directories, development configuration, secrets, source maps, or prior build output.

Running `npm run build` twice from the same committed inputs MUST produce the same file set and equivalent file contents. Running `npm run package` twice from the same committed inputs MUST produce archives with the same SHA-256 hash; entry order, timestamps, permissions, and compression are fixed.
