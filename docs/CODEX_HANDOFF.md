# Handoff: finish the Open Source Higgsfield submission for Conjure

You are working in this repo (Desktop/openhiggs/conjure). The app, effects, renders, tests and docs are DONE.
Do NOT rewrite the app. Your job is to ship it. Deadline: Fri Oct 30 2026, 9:00 PT (17:00 Rome).

Read first: README.md, docs/SUBMISSION.md, docs/DEMO_SCRIPT.md, docs/SOCIAL_POST.md, REFERENCE.md (design rules).

## Rules
- NEVER commit `.env` (it holds COMFY_API_KEY; it is in .gitignore). Check `git status` before every push.
- Do not touch effects/, workflows/ or examples/ unless asked. Don't use emoji, gradients or pill tags in any UI or graphic (REFERENCE.md).
- Ask Ram before anything public (pushing, posting, submitting the form).

## Steps
1. Verify locally: `npm install && npm test && npm run validate && npm run build`. Everything must pass. (`npm run doctor` checks the Comfy Cloud key.)
2. GitHub. Ram creates a public empty repo `conjure`. Then:
   `git remote add origin https://github.com/<user>/conjure.git && git branch -M main && git push -u origin main`
   (examples/ is ~130 MB, which is fine. No single file is over 100 MB.)
3. Replace placeholders: `<you>` in README.md, `YOUR_GITHUB` in comfy-nodes/ComfyUI-Conjure/pyproject.toml. Add `CONJURE_GITHUB_REPO=<user>/conjure` to .env. Commit and push.
4. Live link: in the GitHub repo go to Settings → Pages → Source: "GitHub Actions". Wait for the "Live showcase" workflow to go green. The URL is https://<user>.github.io/conjure/ . Check that it loads the effects with videos.
5. Screenshot: run `npm run dev`, open http://localhost:5173, take a screenshot showing the playing effect tiles, save it over docs/screenshots/home.png, then commit and push.
6. Demo video (2 min max): help Ram record it following docs/DEMO_SCRIPT.md. The app runs with `npm run dev`, and the key is in .env.
   Pre-render the chocolate-statue wizard effect before recording. The video must mention the other tools used (ffmpeg, Claude/Codex as coding assistants).
7. Social post with #OpenSourceHiggsfield: the text is in docs/SOCIAL_POST.md. Fill in the repo and video links.
8. Submit https://form.typeform.com/to/V1dSQrkS with the repo URL, video URL, post URL, live link (Pages URL) and the description in docs/SUBMISSION.md.
   Target categories: Best Overall, Most Viral, Open Weights Only, LTX bonus, FLUX bonus, Most Innovative.

Report back: repo URL, Pages URL, video URL, post URL, and confirmation that the form was submitted.
