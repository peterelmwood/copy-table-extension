# Design sources

These files are the record of how Copy Table's icon and visual system were
decided. They are documentation, not part of the extension: nothing here is
read by `scripts/build.mjs`, shipped in `dist/`, or included in the release
archive.

## What is here

| File | What it holds |
| --- | --- |
| `copy-table-directions/Main.dc.html` | Blueprint as built — tokens, type, the popup and toast as shipped, and where the build departs from the original pitch |
| `copy-table-directions/Icons.dc.html` | Icon construction: the two optical cuts, the mask, and the manifest mapping |
| `copy-table-directions/Blueprint.dc.html` | Direction A, chosen |
| `copy-table-directions/Ledger.dc.html` | Direction B, not built |
| `copy-table-directions/Stamp.dc.html` | Direction C, not built |
| `copy-table-directions/canvas.json` | Artboard layout, pages, and sticky notes |

Ledger and Stamp are kept deliberately. A direction that was rejected is only
useful as a record if the case made for it is still legible, so both boards
keep their original motivation and tradeoff text unchanged.

## Do not open the `.dc.html` files directly in a browser

They will render, but wrongly — unstyled in places, and with template holes such
as `{{accent}}` showing as literal text.

Each file begins with:

```html
<script src="./support.js"></script>
```

**That is not a missing dependency, and `support.js` should not be added to this
repository.** The line is a required marker of the Design Components format: the
canvas runtime replaces it with an inline runtime when it renders each artboard
inside a sandboxed preview frame. There is no `support.js` file anywhere — it is
substituted at render time, never fetched. Removing the line, or committing a
stub in its place, breaks re-seeding.

## How to view them

Open the published canvas, which renders every artboard with the runtime in
place. Ask whoever last re-seeded it for the link, or regenerate it yourself.

## How to regenerate the canvas

The single-file canvas is generated output and is gitignored, alongside `dist/`
and `web-ext-artifacts/`. It is re-seeded from the `.dc.html` sources and
`canvas.json` in this directory using the `seed-canvas.mjs` helper that ships
with the `/design` skill:

```bash
node <design-skill>/seed-canvas.mjs --template <design-skill>/payload.template.html --out copy-table-icon-directions.html --title "Copy Table Icon Directions" --artboard Main.dc.html --artboard Icons.dc.html --artboard Blueprint.dc.html --artboard Ledger.dc.html --artboard Stamp.dc.html --canvas canvas.json
```

Run it from `design/copy-table-directions/`. The helper owns the escaping and
the layout checks, so seeding by hand or editing the generated file is not
supported — change the `.dc.html` sources and re-seed instead.

## Keeping these honest

If the popup, the toast, or the icons change in `src/`, `Main.dc.html` and
`Icons.dc.html` go stale, because both describe what shipped rather than what
was proposed. Update them in the same change, or delete the claim rather than
leave a wrong one standing.
