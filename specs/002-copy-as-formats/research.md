# Research: Copy Table as Structured Formats

## Decision 1: Use interaction-scoped `activeTab`, not persistent host patterns

**Decision**: Request menu, scripting, active-tab, clipboard-write, and notifications capabilities, with no host patterns and no clipboard-read authority. The notification capability is used only for fixed payload-free feedback after rejected exact-frame injection or loss of a started extraction/outcome message channel.

**Rationale**: Firefox grants `activeTab` when a user selects an extension context-menu item. It permits programmatic injection into the clicked tab only for that user action, matching the constitution's explicit-interaction and least-privilege rules. The accepted grant covers the top-level document and same-origin frames; direct inspection of a cross-origin embedded document can require host permission and is explicitly outside this feature.

**Alternatives considered**:

- Persistent all-site host access and a declared content script: rejected because it can inspect every matching page before a user request.
- Optional broad host access: rejected because the action-specific grant is sufficient for supported top-level and same-origin documents, while cross-origin embedded documents are an explicit product exclusion.

## Decision 7: Use a fixed extension notification only for rejected injection

**Decision**: When Firefox rejects exact-frame injection before the content
handler exists, show one `basic` extension notification with fixed restriction
copy. Do not send a same-frame outcome message, retry the injection, or include
any page-derived data.

**Rationale**: Browser-protected pages cannot render the injected in-page toast.
Firefox's notifications API is extension controlled and requires the narrow
`notifications` permission, without granting host, tab, clipboard-read, or
network authority. The fixed message remains useful while disclosing no URL,
target, requested format, converted table, or other page metadata.

**Alternatives considered**:

- A same-frame outcome message: rejected because a rejected injection means no
  content receiver exists.
- Persistent content scripts or broad host access: rejected because they would
  weaken interaction-scoped access.
- A notification for every result: rejected because ordinary pages can show the
  less disruptive in-page toast; the capability is limited to rejected
  injection and lost post-injection message delivery.

## Decision 8: Use one fixed notification when a started message channel is lost

**Decision**: If extraction-response delivery rejects after injection, or if a
payload-free outcome cannot be delivered to the injected frame, show one fixed
extension notification. Release every response/payload reference first. Do not
retry extraction, clipboard access, or outcome delivery, and do not include a
URL, target, format, payload, or page metadata.

**Rationale**: Navigation, frame removal, or revoked access can invalidate the
page receiver after an operation starts. An extension-controlled notification
preserves visible bounded feedback without extending page authority or payload
lifetime.

## Decision 2: Resolve Firefox's expiring target handle in the clicked document

**Decision**: For a supported top-level or same-origin document, inject a guarded content bundle into the exact `frameId`, then call the menu target-element resolver inside that document using `targetElementId`. Never substitute another frame or table when the exact frame is unsupported.

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

**Decision**: Build a rectangular logical matrix with origin-cell metadata, top-left span ownership, empty covered and padding positions, row-group/section metadata, visible text, and safe inline tokens. Normalize `rowspan="0"` to the remaining rows in its owning group, clip positive row spans at that group boundary, enforce the HTML row-span limit separately from the column-span limit, and preserve row-group boundaries for reconstructed HTML.

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
- [MDN notifications](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Notifications)
- [MDN runtime.onMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)
- [WHATWG table model](https://html.spec.whatwg.org/multipage/tables.html)
