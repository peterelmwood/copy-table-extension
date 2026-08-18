# Contract: Firefox Extension Manifest

The built `dist/manifest.json` MUST satisfy all of the following:

- `manifest_version` equals `3`.
- `name` equals `Copy Table`.
- `version` is a valid semantic version accepted by Firefox.
- `action.default_popup` points to `popup/index.html`.
- `background.scripts` and `background.service_worker` point to the same generated background module.
- The manifest declares no `permissions`, `host_permissions`, `optional_permissions`, content scripts, externally connectable origins, native messaging, web-accessible resources, update URL, content-security-policy override, or remote code.
- Every referenced file exists in `dist/` with matching case.
- `web-ext lint --source-dir dist` exits successfully for the Firefox target.

This contract is enforced by automated tests and Mozilla linting. A permission change is a contract change requiring an approved feature specification.
