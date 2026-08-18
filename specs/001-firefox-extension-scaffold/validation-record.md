# Release Validation Record — Pending Owner Evidence

**Status**: Pending. Automated gates establish a release candidate only; they
do not establish SC-001, SC-005, or the interactive Firefox smoke check.

**Release commit**: `____________`
**Owner**: `____________`
**Recorded on**: `____________`

## Required environment details

| Field                              | Value |
| ---------------------------------- | ----- |
| Operating system                   |       |
| Node.js version (`node --version`) |       |
| npm version (`npm --version`)      |       |
| Firefox version/channel            |       |
| Clean checkout location            |       |

## Five clean-checkout attempts

For each attempt, begin from a new clean checkout, run `npm install` followed
by `npm run verify`, then load `dist/manifest.json` in
`about:debugging#/runtime/this-firefox`.

| Attempt | Start/end time | Verify result | Firefox recognizes Copy Table with no startup error | Popup ready/version and keyboard Close control | Intervention or error | Pass |
| ------- | -------------- | ------------- | --------------------------------------------------- | ---------------------------------------------- | --------------------- | ---- |
| 1       |                |               |                                                     |                                                |                       |      |
| 2       |                |               |                                                     |                                                |                       |      |
| 3       |                |               |                                                     |                                                |                       |      |
| 4       |                |               |                                                     |                                                |                       |      |
| 5       |                |               |                                                     |                                                |                       |      |

## Release-gate decision

Record the elapsed time for each attempt, confirm that at least four of five
complete without undocumented intervention, and confirm the successful paths
take ten minutes or less. The owner must record whether the Firefox popup was
opened, its ready state and version were visible, and its keyboard Close control
worked. Do not mark this gate passed until all required evidence is present.
