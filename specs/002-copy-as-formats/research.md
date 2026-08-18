# Research: Copy Table as Structured Formats

## Decision 1: Use interaction-scoped `activeTab`, not persistent host patterns

**Decision**: Request menu, scripting, active-tab, and clipboard-write capabilities, with no host patterns and no clipboard-read authority.

**Rationale**: Firefox grants `activeTab` when a user selects an extension context-menu item. It permits programmatic injection into the clicked tab only for that user action, matching the constitution's explicit-interaction and least-privilege rules.

**Alternatives considered**:

- Persistent all-site host access and a declared content script: rejected because it can inspect every matching page before a user request.
- Optional broad host access: rejected because the action-specific grant is sufficient for ordinary web pages.

## Decision 2: Resolve Firefox's expiring target handle in the clicked document

**Decision**: Inject a guarded content bundle into the exact `frameId`, then call the menu target-element resolver inside that document using `targetElementId`.

**Rationale**: Firefox's target handle works only in the document containing the clicked element and expires when another context menu opens. Exact-frame injection preserves target fidelity across multi-frame pages without retaining element references.

**Alternatives considered**:

- Coordinates plus `elementFromPoint`: rejected because layout may change and coordinates do not identify nested-frame content reliably.
- Last observed `contextmenu` event from a permanent content script: rejected because it requires persistent host registration and retains interaction state.

## Decision 3: Use a guarded message handler for modular, testable content logic

**Decision**: Inject a built content file on demand and install its message handler once per page/frame using a versioned global guard. The handler stores no table payload and performs work only for a menu-originated request.

**Rationale**: File injection allows extraction and serializers to remain modular bundles. Passing a function to the injection API would serialize the function without imported closures; repeated unguarded file injection would duplicate listeners.

**Alternatives considered**:

- One giant self-contained injected function: rejected because it duplicates pure logic and is difficult to unit test.
- Manifest-declared persistent content script: rejected for least-privilege reasons.

## Decision 4: Write clipboard text from the Firefox background page

**Decision**: Content code returns one string to the background page, whose injectable clipboard adapter performs exactly one `writeText` call under clipboard-write authority.

**Rationale**: Extension pages are secure contexts and Firefox's clipboard-write permission removes transient-activation timing risk after asynchronous extraction. It also centralizes success/failure handling and guarantees no clipboard read.

**Alternatives considered**:

- Clipboard write from the content script: rejected because ordinary HTTP pages are not secure contexts.
- Legacy `execCommand('copy')`: rejected because it is deprecated and fragile after asynchronous work.

## Decision 5: Normalize once, serialize four ways

**Decision**: Build a rectangular logical matrix with origin-cell metadata, top-left span ownership, empty covered positions, section/header metadata, visible text, and safe inline tokens.

**Rationale**: One model prevents format drift. HTML can reconstruct safe semantic spans while flattened formats share identical geometry and text.

**Alternatives considered**:

- Independent DOM traversal per serializer: rejected because edge-case behavior would diverge.
- Repeat a spanning value into every covered position: rejected because repetition invents data; empty placeholders preserve the source geometry.

## Decision 6: Reconstruct safe HTML instead of sanitizing copied markup

**Decision**: Generate a new table from allowlisted semantic metadata and safe inline tokens. Preserve safe links, line breaks, visible text, captions, sections, headers, and spans; omit scripts, styles, event attributes, controls, hidden/nested table content, and unsafe URLs.

**Rationale**: Reconstruction makes the security contract reviewable and deterministic and never places executable page markup on the clipboard.

## Sources

- [MDN menus.getTargetElement](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/getTargetElement)
- [MDN scripting API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting)
- [MDN permissions and activeTab](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions)
- [MDN clipboard interaction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)
- [MDN content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
