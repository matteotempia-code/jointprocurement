# Automated Product Demo Video

The video subsystem is a presentation recorder, not a test suite. It resets the synthetic demo state, checks narrative prerequisites, records nine independent Chromium clips, and validates the encoded WebM files.

## Commands

```powershell
npm run demo:video:prepare
npm run demo:video:check
npm run demo:video
npm run demo:video:scene -- smart-import
npm run demo:video:clean
npm run demo:video:assemble -- --voiceover "C:\\path\\joint_procurement_voiceover.zip"
npm run demo:video:validate-final
```

`demo:video:assemble` extracts and validates the nine supplied voice tracks, aligns them scene by scene, normalizes narration, adds restrained title cards and transitions, and exports clean and subtitled H.264/AAC masters. The ZIP path can also be supplied through `VOICEOVER_ZIP_PATH`. Optional licensed music may be supplied through `MUSIC_PATH`; without it the master remains voice-only. Final artifacts and the machine-readable assembly report live in `artifacts/video-demo/final/`.

`demo:video` is self-contained: it cleans old video outputs, prepares data, starts an isolated Next development server, verifies readiness, records every scene, and performs technical decoding checks. `demo:video:scene` resets data but overwrites only the selected clip, so successful clips from other scenes remain available.

## Deterministic state

Preparation runs the canonical Prisma seed and regenerates the repository-owned XLSX/CSV fixtures. It guarantees the six personas, scoped purchasing data, a pending approval, open orders, receiving and quality history, analytics, import exceptions, provenance, and versioned price changes. All names and commercial values are synthetic.

## Production isolation

- The cursor and temporary focus treatment are injected by Playwright into recording contexts only.
- The closing route `/demo-roadmap` is server-gated by `VIDEO_DEMO_MODE=1`, requires the Executive role, and is absent from ordinary navigation.
- Video compilation uses `.next-video-demo`, allowing it to run beside a normal developer server without sharing Next's lock.
- No authorization rule is bypassed; every scene switches through the visible demo role control.

## Artifacts

- `artifacts/video-demo/clips/`: deterministic WebM clips.
- `artifacts/video-demo/screenshots/`: one representative still per scene.
- `artifacts/video-demo/manifests/`: timings and visual beats for later audio synchronization.
- `artifacts/video-demo/narration/`: provisional Italian cue sheets.
- `artifacts/video-demo/reports/`: preparation, readiness, recording and decoder validation reports.

## Technical validation

When FFmpeg/ffprobe is unavailable, the validator uses Chromium's WebM decoder. It checks encoded duration, 1920×1080 dimensions, file size, three non-black frames, scene manifest beats, representative stills, and browser console errors. A failed scene preserves its diagnostic recording and can be rerun independently.
