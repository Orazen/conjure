# Social posts (attach the demo video)

## X / Twitter

> I rebuilt one-tap viral video effects as open source ✦
>
> Drop a photo and tap an effect: gold statue, inflate, disintegrate, earth zoom-out… with generated sound.
>
> FLUX 3 paints the final frame → LTX-2.5 animates the move. Open weights only, running on @ComfyUI.
>
> Every effect is a remixable recipe. Code: <repo link>
>
> #OpenSourceHiggsfield

## Reddit (r/comfyui, r/StableDiffusion)

**Title:** I built Conjure, an open-source "one-tap effects" app (gold statue, inflate, disintegrate…). FLUX 3 Klein → LTX-2.5 with audio, open weights only

**Body:**

For the Comfy *Open Source Higgsfield* challenge I rebuilt the viral one-tap effect apps as an open-source project.

- **Transform effects:** FLUX 3 Image Klein edits your photo into the *final frame* (gold, marble, ice, werewolf…). Then LTX-2.5 does first→last-frame video **with generated audio**, all in one ComfyUI job.
- **Motion effects:** LTX-2.5 image-to-video (two-stage, latent x2 refine) for disintegrate, bullet time, crash zoom, superpowers…
- **Effects are JSON recipes, not graphs.** There's a built-in Effect Builder: write one, test it on your photo, share it as a link, or open a PR.
- Runs through the **Comfy SDK** on Comfy Cloud, a Comfy API deployment, or your own GPU via `comfy-api-proxy`.
- For ComfyUI users there are 22 ready-to-run workflows plus a tiny custom node (*Conjure Effect Recipe*) that outputs the prompts and frame counts for any recipe.

Repo (MIT): <repo link> · Demo: <video link>

Feedback and effect PRs welcome. #OpenSourceHiggsfield

## LinkedIn

> For Comfy's *Open Source Higgsfield* challenge I built **Conjure**, an open-source rebuild of one-tap AI video effects.
>
> Under the hood: FLUX 3 Image Klein paints where the shot ends, and LTX-2.5 generates the video and the audio, all open weights and all through the Comfy Developer Platform SDK. Effects are small JSON recipes, so anyone can create and share new ones without touching a node graph.
>
> Code (MIT): <repo link> · Demo: <video link>
>
> #OpenSourceHiggsfield #ComfyUI #GenerativeAI #OpenSource
