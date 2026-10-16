# Conjure: design system

This is the build rulebook. The rules themselves live in [REFERENCE.md](REFERENCE.md); this file says how to apply them. Tokens are defined once, in `web/src/styles.css` `:root`.

## Tokens (named by job)

```
--bg #0E0E10   --surface #16161A   --raised #1E1E23   --line #2A2A31
--ink #F2F1EE  --muted #A3A1A8     --faint #6C6A72
--accent #F2B33D (the only accent)    --danger #F06A5D (error glyphs only)
--s1 4  --s2 8  --s3 12  --s4 16  --s5 24  --s6 32  --s7 48  --s8 64
--r-control 6px   --r-panel 10px
```

## Type scale

`--t-display 56/60` · `--t-title 32/38` · `--t-section 20/26` · `--t-body 15/22` · `--t-label 13/18` · `--t-caption 12/16` · `--t-mono 12.5/19`

## Components

| Component | What it's for | Rules |
|---|---|---|
| **Tile** | One effect in the gallery | The media fills the tile. The name and meta sit on a dark fade at the bottom. Featured tiles span 3 grid rows, the rest span 2. No badges. |
| **Drawer** | One effect: example, recipe, render controls | Right side, 720px, `--surface`. The header has the name and tagline in plain text. |
| **Primary button** | One per view: the action that spends GPU | Solid `--accent` fill, `#16130A` text. |
| **Button** | Everything else | `--raised` fill, 1px `--line`. Text only, no glyphs. |
| **Tabs** | Gallery filters, top navigation | Plain text. The active tab is `--ink` with a 2px `--accent` underline. |
| **Segmented control** | Aspect and quality | `--surface` track. The selected segment is `--raised` with `--ink` text. |
| **Meta line** | Pipeline, length, tags, status | Plain text joined with `·`. No pills. |
| **Notice** | Mock mode, showcase, errors | A plain sentence starting with a bold label ("Mock mode."). Errors use `--danger` text. No tinted boxes. |
| **Progress** | A render in flight | 4px bar, `--accent` on `--raised`, showing the real percentage. |
| **Compare** | Before/after on a result | A 2px ink handle and a 28px knob drawn with two bars. Small-caps labels on a dark fade. |

## Decision log

- **2026-10-16:** Adopted the "remove AI design slop" checklist (29 tells). We removed the gold-pink-violet gradient, the gradient text and borders, the italic serif headline, the emoji effect icons, the ✦ sparkle mark, the ↻ arrow, the tag pills and the tinted notice boxes, and dropped Instrument Serif to cap the faces at two.
- **2026-10-16:** Chose Midas gold `#F2B33D` as the single accent, because the flagship effect is Midas Touch and gold reads as "conjured". The chrome stays neutral so the renders carry the colour.
- **2026-10-16:** Varied tile heights (featured effects span 3 rows) instead of a uniform card grid.
- **2026-10-16:** The `icon` field stays in the recipe schema for backwards compatibility, but the UI no longer renders it.
