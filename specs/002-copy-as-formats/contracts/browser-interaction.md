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

The message is sent only to the menu event's `tab.id` and `frameId`, after one-off injection of the reviewed content bundle. Supported targets are the top-level document and same-origin embedded documents. Cross-origin embedded documents are deliberately excluded without host permission and never fall back to another frame or table.

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

The injected `runtime.onMessage` listener returns an extraction response through a real `Promise`. It returns no response for unrelated messages or payload-free outcome messages; those branches do not reserve Firefox's response channel.

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

If extraction-response delivery rejects after injection, or delivery of this outcome rejects, background shows one `basic` extension notification with fixed title `Copy Table` and fixed message `Copy Table could not deliver the result because the page became unavailable. Try again.` It is attempted once only after response/payload references are released and contains no URL, target, format, payload, or page metadata. Background does not retry extraction, clipboard access, or outcome delivery.

## Protected-page fallback

If exact-frame injection is rejected before the content handler can exist,
including an attempted action in an unsupported cross-origin embedded document,
background does not attempt a same-frame outcome message. It creates one local
Firefox `basic` notification with the fixed title `Copy Table` and fixed message
`Copy Table cannot access this protected page. Open a normal web page and try again.`
The notification contains no URL, target, format, payload, or page metadata and
does not read or alter the clipboard.

## Clipboard invariant

- Success performs one and only one clipboard write with the returned payload.
- Extraction/injection failure performs zero clipboard operations.
- Clipboard failure performs one rejected write and no retry or clipboard read.
- All payload references, including the content response field, are released after the attempt and before awaiting in-page outcome or fixed notification feedback.
