# ComfyUI-Conjure

One node, **Conjure Effect Recipe ✦**, that turns a [Conjure](../../README.md) effect recipe into the exact prompts and timing Conjure sends to **FLUX 3 Image Klein** and **LTX-2.5**, so any effect drops into your own graphs.

| Output | Wire it to |
|---|---|
| `motion_prompt` | `CLIPTextEncode.text` on the LTX-2.5 text encoder (positive) |
| `end_frame_prompt` | `CLIPTextEncode.text` on the FLUX 3 text encoder (transform effects) |
| `negative_prompt` | LTX-2.5 negative `CLIPTextEncode.text` |
| `frames` | `EmptyLTXVLatentVideo.length` and `LTXVEmptyLatentAudio.frames_number` (always 8n+1) |
| `fps` | `LTXVConditioning.frame_rate`, `CreateVideo.fps` |
| `pipeline` | `transform` or `motion` (tells you which graph the recipe expects) |

Pick a bundled effect, or paste any recipe JSON into `recipe_json` (for example one copied from the Conjure Effect Builder).

## Install

Copy or symlink this folder into `ComfyUI/custom_nodes/`, then restart ComfyUI. There are no extra Python dependencies.

`example_workflows/` has ready-made transform (FLUX 3 → LTX-2.5) and motion (LTX-2.5) graphs driven by the node.

MIT licensed.
