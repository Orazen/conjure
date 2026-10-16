# Submission checklist: Open Source Higgsfield challenge

**Deadline: Friday Oct 30, 2026, 9:00 PT = 17:00 Rome time.** (Europe leaves summer time on Oct 25, so Rome is UTC+1 that week.)
Winners are announced Nov 6. Entry form: https://form.typeform.com/to/V1dSQrkS

Categories this entry is built for:

| Prize | Why Conjure fits |
|---|---|
| **Best Overall** ($10k) | A complete app: 22 effects, Effect Builder, sharing, ComfyUI node pack, tests |
| **Most Viral** (RTX 5090) | One-tap effects on your own photo, before/after slider, vertical before→after reel, caption with the hashtag |
| **Open Weights Only** (RTX 5090) | FLUX 3 Image Klein + LTX-2.5 only. No partner nodes, no closed APIs |
| **LTX VFX bonus** ($2k) | LTX-2.5 is the core video model in every effect (video + generated audio) |
| **FLUX bonus** | FLUX 3 Image Klein is the core image model in every transform effect |
| Most Innovative (RTX 5090) | A one-line idea becomes a working effect: Gemma 4 *inside ComfyUI* writes the recipe, which compiles into a validated two-model graph (FLUX 3 → LTX-2.5). Plus a custom node pack. The demo video must say *why* this is novel (see DEMO_SCRIPT.md) |

---

## 1. Get compute (~$20)

1. Sign up at https://comfy.org/cloud. The free trial gives 5 runs, which is enough to test a couple of effects.
2. To render all the examples, subscribe to **Standard ($20/mo)**: 4,200 credits ≈ 4 GPU-hours on 96 GB cards. Cancel after the challenge if you like.
3. Create an API key: https://platform.comfy.org/profile/api-keys

## 2. Run it locally

```bash
cd conjure
npm install
cp .env.example .env        # paste COMFY_API_KEY=... into .env
npm run doctor              # must print ✔
npm run dev                 # http://localhost:5173
```

Try one effect from the UI (Draft quality is cheapest). If it fails with a "model failed to load" message, LTX-2.5 or FLUX 3 isn't on your Comfy Cloud yet. Tell Claude the exact error.

## 3. Render the showcase

```bash
npm run samples                                        # 6 synthetic sample photos (FLUX 3)
npm run examples -- --only=midas-touch,inflate,dust-to-dust --quality=draft   # cheap test
npm run examples                                       # all 22, standard quality
```

Watch a few results. If an effect looks weak, tweak its prompt in `effects/<id>.json` (or ask Claude to). Then re-render just that one with `--only=<id> --force`. Restart `npm run dev` and the cards now autoplay real previews.

## 4. Put it on GitHub

1. Create a **public** repo at https://github.com/new named `conjure` (no README, since we already have one).
2. In the project folder:

```bash
git add -A && git commit -m "Conjure: open-source one-tap VFX effects"
git branch -M main
git remote add origin https://github.com/<your-username>/conjure.git
git push -u origin main
```

3. Add `CONJURE_GITHUB_REPO=<your-username>/conjure` to `.env` (this enables the "Submit to community" button).
4. Replace `<you>` in README's clone URL and `YOUR_GITHUB` in `comfy-nodes/ComfyUI-Conjure/pyproject.toml`.
5. Swap `docs/screenshots/home.png` for a real screenshot or GIF that shows rendered previews.
6. **Turn on the live link:** repo **Settings → Pages → Source: GitHub Actions**. The next push publishes the showcase at `https://<your-username>.github.io/conjure/`. That's your "live link" for the form.

## 5. Record the demo (≤ 2 min)

Follow **docs/DEMO_SCRIPT.md**. Screen-record with QuickTime (File → New Screen Recording) or OBS. Polish doesn't matter: the judges score the work, not the editing. Upload it to YouTube (unlisted is fine) or X.

## 6. Social post

Post the video on X / Reddit / LinkedIn with **#OpenSourceHiggsfield**. Copy is ready in **docs/SOCIAL_POST.md**.

## 7. Submit the form

https://form.typeform.com/to/V1dSQrkS. Have these ready:

- GitHub repo URL
- Demo video URL (≤ 2 min)
- Social post URL
- Live link: `https://<your-username>.github.io/conjure/` (the GitHub Pages showcase)
- Short description: *"Conjure is an open-source rebuild of one-tap viral video effects. FLUX 3 Image Klein paints where the shot ends up and LTX-2.5 animates the move with sound, all open weights, all through the Comfy SDK. Type any idea ('turn me into a chocolate statue') and Gemma 4, running inside ComfyUI, writes a new effect for you. Effects are tiny JSON recipes anyone can remix, share as a link, or contribute by PR, and a ComfyUI node pack brings them into any graph."*
- Tools used besides Comfy (they must also be stated in the video): ffmpeg (share reel), React/Vite + Hono (app), Claude as an AI coding assistant.

## Rules to keep in mind

- One submission per person. Lawful + SFW. No unlicensed IP or likenesses: use the synthetic samples or photos of yourself, with consent.
- The repo must keep the MIT license and the local run instructions (already in README).
