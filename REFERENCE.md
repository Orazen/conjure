# Conjure: visual reference

Read this before designing, generating or laying out anything for Conjure: the app, the README, the showcase, social graphics or the demo video's title cards.

## Colour (each one has one job)

| Token | Hex | Job |
|---|---|---|
| `--bg` | `#0E0E10` | Page background. Flat, with no gradients or glows. |
| `--surface` | `#16161A` | Panels, the drawer, inputs |
| `--raised` | `#1E1E23` | Hovered or selected surfaces |
| `--line` | `#2A2A31` | Hairlines and borders, 1px |
| `--ink` | `#F2F1EE` | Primary text |
| `--muted` | `#A3A1A8` | Secondary text |
| `--faint` | `#6C6A72` | Hints, captions, disabled |
| `--accent` | `#F2B33D` | **The one accent: Midas gold.** Primary button, active tab underline, focus ring, progress, selected state. Nothing else. |
| `--danger` | `#F06A5D` | Error text only, as glyph colour, never a fill |

The effect artwork brings the colour. The chrome stays neutral so the renders are the loudest thing on screen.

## Type

Two faces, and no more.

- **Inter Tight** for everything you read.
- **JetBrains Mono** only for strings you type or copy: recipe JSON, terminal commands, seeds and ids.

| Role | Size / line-height | Weight |
|---|---|---|
| Display (home headline) | 56 / 60 | 600 |
| Page title | 32 / 38 | 600 |
| Section title | 20 / 26 | 600 |
| Body | 15 / 22 | 400 |
| UI label | 13 / 18 | 500 |
| Caption | 12 / 16 | 400 |
| Mono | 12.5 / 19 | 400 |

## Spacing

4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Nothing in between. Radius: 6px for controls, 10px for panels and cards.

## Never

1. No gradients: no purple-to-blue, no gradient text, no gradient borders, no background glows.
2. No emoji, sparkles (✦), or loop arrows (↻) standing in for icons. Draw the icon, or use the word.
3. No pills, chips or tinted boxes behind a word. Status, tags and metadata are plain text, separated by `·`.
4. No coloured strip down a card edge, and no italic used for emphasis.
5. No grid of identical rectangles. Featured effects get taller tiles.

## Done right: an effect tile

A tile is the render itself: the effect's preview video fills the tile edge to edge. At the bottom, over a dark fade, the name sits in 15/20 semibold ink, with one line of meta in 12/16 muted: `Transform · 5 s · sound`. There's no badge and no icon. On hover the video plays. If an effect has no render yet, the tile is a flat field of the effect's own first colour, with the name set in 20/26 ink. It never shows a stand-in emoji.
