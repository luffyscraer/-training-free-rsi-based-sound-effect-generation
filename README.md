# Training-free RSI-based Sound Effect Generation

Static, dependency-free research audio demo for GitHub Pages. Ten complete Chinese/English excerpts, final mixes, matched narration references, downloadable WAVs, and event timelines.

## Local preview

Run `python -m http.server 8080 --bind 127.0.0.1` from this directory. Open `http://127.0.0.1:8080` on the same machine (or forward the port over SSH). Do not open index.html via file:// because the sample index is fetched as JSON.

## Publish

Target owner: `luffyscraer`

Target repository (created by the owner): `-training-free-rsi-based-sound-effect-generation`

Expected URL after a successful deployment:
https://luffyscraer.github.io/-training-free-rsi-based-sound-effect-generation/

Latest local export: `final_review_v8` (2026-10-28). Nine excerpts are provisionally acceptable on current evidence; ZH05 is explicitly pending listening confirmation. Check the deployed data index's `revision` before assuming a new export is live.

Alongside that audio, the 2026-10-29 update displays `ten_case_types_20261028`: 10 retained executable plans, 86 events, five actual text-review replies per case, zero accepted plans, and no newly generated audio. Planning/text review used Qwen3.5-9B with modified production prompts, not the frozen P/Q-optimized prompts. The configured local listener is Qwen2.5-Omni-7B (4-bit), but it did not review final mixes in this planning-only run. The older audio used qwen3.8-max planning/text review and qwen3.8-omni-flash listening, plus Codex-assisted evidence review and repairs.

The new plan timestamps are compiled targets on the input narration, not verified audible onsets or positions in the old mix. ZH01/ZH03 received a supplemental fifth review with an updated reviewer prompt, without new planning. Invalid replies consume the five-response budget. This display is not a controlled model comparison. Re-export the whitelisted planning data with `python tools/export_planning_comparison.py /path/to/ten_case_types_20261028`.

1. Authenticate to GitHub locally using `gh auth login` (never put a token in page files).
2. Create the public repository above, and push **only this directory** to its `main` branch. Do not upload the parent audiobook project or experiment directories.
3. In the repository's Settings → Pages, set Build and deployment → Source to **GitHub Actions**.
4. Run the included Deploy demo to GitHub Pages workflow, or push another commit to main.

## Contents

- `index.html`, `style.css`, `app.js`: responsive page, language filters, native audio controls, timeline seeking; only one player runs at a time.
- `data/cases.json`, `data/plans/`: whitelisted public event data. No absolute server paths, credentials, raw API requests, or private review logs.
- `media/`: 192 kbps MP3 listening copies and original selected WAV mixes. No loudness normalization or editing is performed during export.
- `ATTRIBUTION.md`: audio licensing and provenance notes.
- `.github/workflows/pages.yml`: publishes only the public page assets.

The page showcases selected iterative results. It does not claim controlled improvements, measured perceptual accuracy, or universal approval. Existing experiment code, prompts, and audio masters are unchanged.
