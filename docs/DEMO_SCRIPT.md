# Demo video script (target 1:50, hard limit 2:00)

Record the app at 1440p if you can. Turn the sound up: the generated audio is part of the wow.
Judging is on the work, not the editing, so one take with simple cuts is fine.

| Time | On screen | Voice-over (read it naturally) |
|---|---|---|
| **0:00–0:08** | Full-screen **Midas Touch** result: gold spreading over the person, chime at the end. | "One photo. One tap. And I'm a gold statue, with the sound effects generated too." |
| **0:08–0:25** | The Conjure home page. Drop a photo into the dock and tap **Inflate** on the dog photo. Show the progress stages, then the result. | "This is Conjure, an open-source rebuild of one-tap viral video effects. Drop in any photo, pick an effect, done. It has 22 effects so far: transformations, superpowers, camera moves." |
| **0:25–0:50** | Open a transform effect. Point at the pipeline chips. Show the end frame appearing mid-render ("End frame, painted by FLUX 3"), then the final video. Drag the **before/after** slider. | "Here's how it works. FLUX 3 Image Klein paints where the shot should end up. Then LTX-2.5 generates the move from my photo to that frame, with a matching soundtrack. Both run in one ComfyUI job through the Comfy SDK. Open weights only, no closed APIs. The same code runs on Comfy Cloud, a Comfy API deployment, or your own GPU." |
| **0:50–1:22** | Type **"turn me into a chocolate statue"** into *Imagine any effect…* → the builder opens with Gemma 4's recipe → **Test on my photo** → cut to the finished chocolate render. Then show **Copy effect link** and **Submit to community (GitHub PR)**. | "Now the part I'm proudest of. I can describe any effect in one sentence. Gemma 4, an open model running inside ComfyUI, writes a full recipe: the end state, the motion, the sound. Then FLUX 3 and LTX-2.5 render it. Effects aren't node graphs, they're tiny recipes, so I can share this one as a link or open a pull request that adds it for everyone." |
| **1:22–1:36** | ComfyUI with `workflows/ui/conjure_transform_flux3_ltx25.ui.json` open (the groups are visible), then the **Conjure Effect Recipe ✦** node feeding the prompts. | "And if you live in ComfyUI, every effect ships as a ready-to-run workflow, plus a custom node that turns any recipe into prompts and frame counts inside your own graphs." |
| **1:36–1:52** | Tap **Make before→after reel**, play the vertical reel, show **Copy caption**. End on the GitHub repo page. | "One tap gives you a vertical reel that's ready to post. It's all MIT-licensed on GitHub. Built with ComfyUI, LTX-2.5, FLUX 3 and Gemma 4, plus ffmpeg for the reels, with Claude as my coding assistant. #OpenSourceHiggsfield." |

**Why it's innovative** (say it if you have time, or put it in the description): a one-line idea becomes a working VFX effect, entirely on open weights inside ComfyUI. An LLM writes the recipe, and the recipe compiles to a validated graph that chains an image-edit model into a first/last-frame video model with audio, in one job. Because effects are data, not graphs, the community can grow the library without touching nodes. And one recipe format works across the web app, the node pack and the plain workflows.

### Shot list to prepare before recording

- [ ] `npm run examples` done, so the cards autoplay real previews
- [ ] One fresh render of **Midas Touch** and one of **Inflate** (dog) at Standard quality
- [ ] The wizard's "chocolate statue" recipe rendered once beforehand, so the demo can cut from "Test" straight to the finished render
- [ ] ComfyUI open with the UI workflow and the recipe node example loaded
- [ ] GitHub repo pushed
