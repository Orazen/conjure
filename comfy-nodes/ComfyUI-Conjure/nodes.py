import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
EFFECTS_DIR = os.path.join(HERE, "effects")

MOTION_PREFIX = "Use the provided start image as the first frame."
TRANSFORM_PREFIX = (
    "Use the provided start image as the first frame and the provided end image as the final frame anchor."
)
BASE_NEGATIVE = (
    "blurry, out of focus, overexposed, underexposed, low contrast, washed out colors, excessive noise, "
    "grainy texture, flickering, distorted proportions, deformed facial features, extra limbs, watermark, "
    "text, subtitles, pc game, console game, video game, cartoon, childish, ugly, static image, frozen frame, no motion"
)


def render_template(text, subject):
    """Same rules as server/effects.ts renderTemplate: fill {subject}, capitalise sentence starts."""
    filled = text.replace("{subject}", subject.strip())
    return re.sub(r"(^\s*|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), filled)


def compose(effect, subject=None, duration=None, fps=24):
    subject = (subject or "").strip() or effect.get("subject", "the person")
    prefix = TRANSFORM_PREFIX if effect["pipeline"] == "transform" else MOTION_PREFIX
    parts = [prefix, render_template(effect["motion"], subject)]
    if effect.get("sound"):
        parts.append(("Audio: " + render_template(effect["sound"], subject) + ".").replace("..", "."))
    end_frame = render_template(effect.get("endFrame", ""), subject) if effect["pipeline"] == "transform" else ""
    negative = ", ".join(x for x in [BASE_NEGATIVE, effect.get("negative")] if x)
    seconds = int(round(duration or effect.get("duration", 5)))
    seconds = max(2, min(10, seconds))
    frames = (round(seconds * fps) // 8) * 8 + 1  # LTX wants 8n+1 frames
    return " ".join(parts), end_frame, negative, frames, float(fps), effect["pipeline"]


def bundled_effects():
    if not os.path.isdir(EFFECTS_DIR):
        return {}
    out = {}
    for name in sorted(os.listdir(EFFECTS_DIR)):
        if name.endswith(".json") and not name.startswith("_"):
            try:
                with open(os.path.join(EFFECTS_DIR, name), encoding="utf-8") as f:
                    e = json.load(f)
                out[e["id"]] = e
            except Exception as err:  # noqa: BLE001
                print(f"[Conjure] skipping {name}: {err}")
    return out


class ConjureEffectRecipe:
    """Outputs the prompts + frame count for a Conjure effect."""

    CATEGORY = "Conjure"
    FUNCTION = "build"
    RETURN_TYPES = ("STRING", "STRING", "STRING", "INT", "FLOAT", "STRING")
    RETURN_NAMES = ("motion_prompt", "end_frame_prompt", "negative_prompt", "frames", "fps", "pipeline")
    OUTPUT_TOOLTIPS = (
        "LTX-2.5 prompt: motion, camera and sound.",
        "FLUX 3 edit instruction for the final frame (empty for motion effects).",
        "Negative prompt for LTX-2.5.",
        "Frame count (8n+1) for EmptyLTXVLatentVideo / LTXVEmptyLatentAudio.",
        "Frame rate for LTXVConditioning / CreateVideo.",
        "'transform' (FLUX 3 end frame + LTX-2.5 FLF2V) or 'motion' (LTX-2.5 I2V).",
    )

    @classmethod
    def INPUT_TYPES(cls):
        names = list(bundled_effects().keys()) or ["(no bundled effects)"]
        return {
            "required": {
                "effect": (names, {"tooltip": "A bundled Conjure effect."}),
                "subject": ("STRING", {"default": "", "tooltip": "Who/what is in the photo, e.g. 'my dog'. Blank = recipe default."}),
                "seconds": ("INT", {"default": 0, "min": 0, "max": 10, "tooltip": "0 = the recipe's length."}),
                "fps": ("INT", {"default": 24, "min": 8, "max": 60}),
            },
            "optional": {
                "recipe_json": ("STRING", {"multiline": True, "default": "", "tooltip": "Paste any Conjure recipe JSON to override the dropdown."}),
            },
        }

    def build(self, effect, subject, seconds, fps, recipe_json=""):
        if recipe_json and recipe_json.strip():
            recipe = json.loads(recipe_json)
        else:
            recipe = bundled_effects().get(effect)
            if recipe is None:
                raise ValueError(f"Unknown Conjure effect '{effect}'")
        return compose(recipe, subject, seconds or None, fps)


NODE_CLASS_MAPPINGS = {"ConjureEffectRecipe": ConjureEffectRecipe}
NODE_DISPLAY_NAME_MAPPINGS = {"ConjureEffectRecipe": "Conjure Effect Recipe"}
