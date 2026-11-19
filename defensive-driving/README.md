# Defensive driving (EN / ID / MS)

Short narrated course for contractor drivers. Static page, no login, no backend.
Sits next to the Driver Induction (`../induction/`) and ends with a link to it.

## Files
• `index.html` the course page (Common Rules: Jost light title, version above EN/ID/MS toggle, adapts to phone, laptop and large monitor)
• `content.js` all text in three languages. The only place to edit wording. Bump `version` when you change it
• `scripts/en.txt`, `id.txt`, `ms.txt` the narration scripts, one block per module, generated from `content.js`
• `audio/<lang>/m<n>.mp3` the recorded narration (see `audio/README.txt`)
• `sw.js` service worker (network first)

## Adding or replacing narration
1. Open `scripts/<lang>.txt` and generate one audio file per block (Clipchamp, Azure Speech Studio or ElevenLabs).
2. Save as `audio/<lang>/m1.mp3`, `m2.mp3` ... and commit.
3. No code change needed. The page uses the MP3 when it exists, else the browser voice.

## After editing `content.js`
Regenerate the scripts so audio and screen text stay matched, then re-record the changed modules.
