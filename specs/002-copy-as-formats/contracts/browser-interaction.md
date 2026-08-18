# Contract: Browser Interaction

## Background to content request

```text
{
  type: "copy-table:extract",
  requestId: string,
  targetElementId: integer,
  format: "html" | "markdown" | "text" | "csv"
}
```

The message is sent only to the menu event's `tab.id` and `frameId`, after one-off injection of the reviewed content bundle.

## Content to background response

Success:

```text
{ ok: true, requestId: string, format: CopyFormat, payload: string }
```

Failure:

```text
{
  ok: false,
  requestId: string,
  format: CopyFormat,
  reason: "no-table" | "target-expired" | "invalid-table" | "unexpected"
}
```

Failures never contain table text or page metadata. Background maps injection failures to `restricted-page` and clipboard exceptions to `clipboard-failed`.

## Background to content outcome

```text
{
  type: "copy-table:outcome",
  requestId: string,
  format: CopyFormat,
  status: CopyOutcomeStatus
}
```

Content displays one fixed, non-blocking toast and removes it automatically. Outcome messages contain no serialized payload.

## Clipboard invariant

- Success performs one and only one clipboard write with the returned payload.
- Extraction/injection failure performs zero clipboard operations.
- Clipboard failure performs one rejected write and no retry or clipboard read.
- All payload references are released after the attempt.
