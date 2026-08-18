# Quickstart: Copy Table as Structured Formats

## Verify

```powershell
$env:npm_config_script_shell = 'C:\Program Files\PowerShell\7\pwsh.exe'
npm run verify
```

Verification covers the menu contract, permissions, target resolution, extraction, all serializers, failure paths, performance trials, build, Mozilla lint, and deterministic packaging.

The release gate runs 20 automated 100×50 conversion/write/acknowledgement
attempts and requires at least 19 to complete in under two seconds. It also
checks the package for the reviewed file list, source maps, remote-code markers,
and likely embedded secrets.

## Temporary Firefox test

```powershell
npm run start:firefox
```

On a normal HTTPS page containing a semantic table:

1. Right-click a cell.
2. Expand **Copy as**.
3. Choose **HTML**, **Markdown**, **Plain text**, or **CSV**.
4. Paste into a plain-text editor and compare with the source table.
5. Repeat inside a nested table and outside any table.

The nested table must be selected when clicked. Outside a table, feedback must appear and the existing clipboard must remain unchanged.

If Firefox reports a restricted page, record the fixed extension notification;
if it reports a clipboard failure, record the in-page message. Do not retry
automatically or inspect the clipboard. Table data is not stored, logged, or
transmitted by Copy Table.

## Manual release evidence

Record Firefox version, page fixture, chosen format, elapsed time, pasted output, feedback, and any console error in `validation-record.md`. Do not mark GUI scenarios complete from automated DOM tests alone.
