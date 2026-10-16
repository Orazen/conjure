"""ComfyUI-Conjure: use Conjure effect recipes inside any ComfyUI graph.

One node, "Conjure Effect Recipe", turns a recipe (bundled, or pasted JSON) into
the exact prompts and timing the Conjure app sends to FLUX 3 and LTX-2.5, so you
can drop an effect into your own workflows.
"""
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = None
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
