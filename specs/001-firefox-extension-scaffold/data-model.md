# Data Model: Firefox Extension Scaffold

This feature has no persisted user data. Its model describes build-time and runtime state only.

## Extension Artifact

Represents the installable Firefox package.

| Field           | Type                  | Rules                                                                                             |
| --------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| name            | string                | Human-readable product name: `Copy Table`                                                         |
| version         | semantic version      | Matches the source manifest                                                                       |
| manifestVersion | integer               | Must be `3`                                                                                       |
| files           | set of paths          | Contains the manifest, popup assets, and background bundle; contains no source maps or test files |
| permissions     | set of strings        | Empty for the scaffold                                                                            |
| hostPermissions | set of match patterns | Empty for the scaffold                                                                            |
| target          | enum                  | `firefox` only in this feature                                                                    |

**Validation**: The package is valid only when Mozilla lint passes and its contents match the build-verification contract.

## Readiness State

Represents what the user sees after selecting the toolbar action.

| Field       | Type   | Rules                                                                    |
| ----------- | ------ | ------------------------------------------------------------------------ |
| productName | string | `Copy Table`                                                             |
| status      | enum   | `ready` for this scaffold                                                |
| message     | string | Explains that structured-data copy actions are coming in a later feature |
| version     | string | Read from browser runtime metadata, never duplicated in UI source        |

**State transition**: `popup closed` → `ready` when the popup document loads. There are no loading, error, capture, or clipboard states in this feature.

## Permission Declaration

Represents the reviewed authority requested by the extension.

| Field               | Type | Rules |
| ------------------- | ---- | ----- |
| apiPermissions      | set  | Empty |
| hostPermissions     | set  | Empty |
| optionalPermissions | set  | Empty |

Any addition to these sets requires a later approved spec, explicit rationale, and updated tests.
