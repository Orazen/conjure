# Demo video script (target 1:50, hard limit 2:00)

Record the app at 1440p if you can. Turn the sound up: the generated audio is part of the wow.
Judging is on the work, not the editing, so one take with simple cuts is fine.

| Time | On screen | Voice-over (read it naturally) |
|---|---|---|
| **0:00–0:08** | Full-screen **Midas Touch** result: gold spreading over the person, chime at the end. | "One photo. One tap. And I'm a gold statue, with the sound effects generated too." |
| **0:08–0:25** | The Conjure home page. Drop a photo into the dock and tap **Inflate** on the dog photo. Show the progress stages, then the result. | "This is Conjure, an open-source rebuild of one-tap viral video effects. Drop in any photo, pick an effect, done. It has 22 effects so far: transformations, superpowers, camera moves." |
| **0:25–0:50** | Open a transform effect. Point at the pipeline chips. Show the end frame appearing mid-render ("End frame, painted by FLUX 3"), then the final video. Drag the **before/after** slider. | "Here's how it works. FLUX 3 Image Klein paints where the shot should end up. Then LTX-2.5 generates the move from my photo to that frame, with a matching soundtrack. Both run in one ComfyUI job through the Comfy SDK. Open weights only, no closed APIs. The same code runs on Comfy Cloud, a Comfy API deployment, or your own GPU." |
| **0:50–1:20** | **Effect Builder**: remix *Turn to Stone* into "Chocolate Statue". Edit the end frame and the sound, hit **Test on my photo**, then show **Copy effect link** and **Submit to community (GitHub PR)** opening GitHub with the file pre-filled. | "The part I'm proudest of: effects aren't node graphs, they're tiny recipes. The end state, the motion, the sound. Anyone can write one in the builder, test it on their own photo, and share it as a link, because the whole recipe lives in the URL. Or open a pull request that adds it for everyone. The server compiles each recipe into a validated ComfyUI graph." |
| **1:20–1:35** | ComfyUI with `workflows/ui/conjure_transform_flux3_ltx25.ui.json` open (the groups are visible), then the **Conjure Effect Recipe ✦** node feeding the prompts. | "And if you live in ComfyUI, every effect ships as a ready-to-run workflow, plus a custom node that turns any recipe into prompts and frame counts inside your own graphs." |
| **1:35–1:50** | Tap **Make before→after reel**, play the vertical reel, show **Copy caption**. End on the GitHub repo page. | "One tap gives you a vertical reel that's ready to post. It's all MIT-licensed on GitHub. Built with ComfyUI, LTX-2.5 and FLUX 3, plus ffmpeg for the reels, with Claude as my coding assistant. #OpenSourceHiggsfield." |

**Why it's innovative** (say it if you have time, or put it in the description): effects are data compiled into Comfy graphs, so the community can grow the effect library without touching nodes. Two open models are chained in a single job (image edit → first/last-frame video with audio). And one recipe format works across the web app, the node pack and the plain workflows.

### Shot list to prepare before recording

- [ ] `npm run examples` done, so the cards autoplay real previews
- [ ] One fresh render of **Midas Touch** and one of **Inflate** (dog) at Standard quality
- [ ] A "Chocolate Statue" remix tested once, so the builder demo isn't waiting on a GPU (cut from "Test" straight to the finished render)
- [ ] ComfyUI open with the UI workflow and the recipe node example loaded
- [ ] GitHub repo pushed
