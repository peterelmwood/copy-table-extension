# Contract: Context Menu

The extension MUST create exactly this hierarchy:

> Amended by issue #9: the parent item is titled **Copy table as** (originally **Copy as**) so users know it only works on tables. Menu IDs are unchanged.
>
> Amended after issue #7: an **HTML source** child (`copy-table:copy-as:html-source`) follows **HTML**. **HTML** writes rich text; **HTML source** writes the same markup as plain text for code editors.
>
> Amended by issue #14: a **JSON** child (`copy-table:copy-as:json`) follows **CSV** as the last item. It writes plain text, and its success toast reads "Copied as JSON.".
>
> Renamed for clarity: **HTML** is labelled **Rich text** and **HTML source** is labelled **HTML code**, naming what each pastes as rather than the shared markup. Menu IDs and format identifiers (`html`, `html-source`) are unchanged.

| ID                               | Parent | Label           | Contexts                       |
| -------------------------------- | ------ | --------------- | ------------------------------ |
| `copy-table:copy-as`             | none   | `Copy table as` | ordinary page element contexts |
| `copy-table:copy-as:html`        | parent | `Rich text`     | inherited                      |
| `copy-table:copy-as:html-source` | parent | `HTML code`     | inherited                      |
| `copy-table:copy-as:markdown`    | parent | `Markdown`      | inherited                      |
| `copy-table:copy-as:text`        | parent | `Plain text`    | inherited                      |
| `copy-table:copy-as:csv`         | parent | `CSV`           | inherited                      |
| `copy-table:copy-as:json`        | parent | `JSON`          | inherited                      |

Creation is idempotent across background restarts. Only child selections start work. Unknown menu IDs are ignored without page or clipboard access.

The menu can be visible inside a cross-origin embedded document because the parent uses the ordinary `all` element context. Direct inspection there is intentionally unsupported by the approved permission set. Selection must fail with fixed restriction feedback and must not inspect a top-level or same-origin fallback target.

The manifest permission allowlist is exactly `activeTab`, `clipboardWrite`, `menus`, `notifications`, and `scripting`. It contains no host, optional-host, clipboard-read, tabs, storage, network, or persistent content-script authority. `notifications` is used only for two fixed, payload-free fallbacks: when Firefox rejects the exact-frame content injection before a page receiver exists, and when a started extraction/outcome message channel becomes unavailable after payload release. Titles and messages are fixed, actionable copy and never include a URL, target, format, serialized payload, or page metadata.
