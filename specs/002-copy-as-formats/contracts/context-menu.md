# Contract: Context Menu

The extension MUST create exactly this hierarchy:

| ID | Parent | Label | Contexts |
|---|---|---|---|
| `copy-table:copy-as` | none | `Copy as` | ordinary page element contexts |
| `copy-table:copy-as:html` | parent | `HTML` | inherited |
| `copy-table:copy-as:markdown` | parent | `Markdown` | inherited |
| `copy-table:copy-as:text` | parent | `Plain text` | inherited |
| `copy-table:copy-as:csv` | parent | `CSV` | inherited |

Creation is idempotent across background restarts. Only child selections start work. Unknown menu IDs are ignored without page or clipboard access.

The manifest permission allowlist is exactly `activeTab`, `clipboardWrite`, `menus`, `notifications`, and `scripting`. It contains no host, optional-host, clipboard-read, tabs, storage, network, or persistent content-script authority. `notifications` is used only when Firefox rejects the exact-frame content injection before a page receiver exists; its title and message are fixed, actionable copy and never include a URL, target, format, serialized payload, or page metadata.
