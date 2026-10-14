# Painted command-room loading screen

The loading-screen study uses a worn olive military console inside a factory: an amber CRT, analog gauges, reel recorder, telephone and heavy pipework. The background is painterly; cream typography and an amber segmented progress display remain live HTML/CSS. This delivers the requested military, industrial and retrofuturist direction while matching the existing Animal Factory Tactics title treatment.

Open `tactics/loading-screen-study.html`. The study runs a clearly labelled simulated fourteen-second loading sequence and then holds on **Deployment ready**. Replay and Pause/Play controls are only part of the study. `?progress=62` gives a reproducible paused composition. This does not replace the game's existing loading flow.

## Assets

- `dist/assets/ui/loading-screen/command-room-v1.png`: original generated pixels, 1672 × 941, approximately 1.85 MiB. The requested composition was 16:9; the delivered file's actual dimensions are recorded here.
- `dist/assets/ui/loading-screen/PROMPT.json`: complete generation prompt and provenance. Generated with the built-in ImageGen tool, then copied into the project unchanged. No external image API was used.
- `dist/tactics/loading-screen-study.html`: composited screen markup and preview-only controls.
- `dist/tactics/loading-screen.css`: responsive presentation, status lights and reduced-motion support.
- `dist/tactics/loading-screen.js`: reusable presentation controller.
- `dist/tactics/loading-screen-study.js`: simulated progress and study controls; do not use its timer for real loading.

## Integration contract

Use the screen markup and stylesheet as a full-screen loading view. Omit the study controls/script. Call `bindLoadingScreen(screenElement)` from `loading-screen.js`, then supply real loading state:

```js
const view = bindLoadingScreen(screenElement);
view.setProgress(null, 'Receiving sector'); // unknown total: no invented percentage
view.setProgress(62, 'Preparing squad equipment'); // finite percentage, clamped 0–100
view.ready(); // 100%, busy=false; does not navigate or enable gameplay
view.error('Unable to load this sector. Please try again.');
view.setPaused(document.hidden); // pause decorative motion when hidden
view.dispose(); // idempotent; stops motion and ignores subsequent updates
```

The caller owns retry, completion, navigation, DOM removal and actual asset/resource loading. State text is assigned as text, never HTML. A progressbar exposes determinate values or an indeterminate state; stage changes are a polite status announcement. The generated painting contains no baked title, labels or progress indicators. A dark CSS fallback and all text remain available if the decorative image cannot load.

The study pauses its animation loop when hidden, starts paused under reduced-motion preferences, and removes listeners/cancels its frame on disposal. Its CSS omits decorative motion for reduced-motion users. Small portrait and landscape layouts keep the title and loading readout inside the viewport; tall desktop and ultrawide layouts preserve the painted console as the focal point.

## Review and reproduction

Run `node tools/check-loading-screen.mjs` against the local preview, then `node --test tests/tactics-3d-deployment.test.mjs`. Browser evidence is saved under `artifacts/loading-screen/`; selected final evidence belongs in `hybrid-review/loading-screen/`.

The browser check covers seven sizes (1920×1080, 1366×768, 2560×1080, 390×844, 320×568, 844×390 and 568×320), actual title text bounds, whole-viewport fit, image loading, unknown/finite/clamped progress, error text, ready state, replay/pause, reduced motion and repeated disposal. The existing distribution tests include every new module, stylesheet and asset. Gameplay wiring and final user approval remain separate from these checks.

Final independent review: **9.0/10**, with no remaining blockers for the study and reusable progress presentation. The reviewer checked six viewport sizes, keyboard controls, hidden-page suspension, reduced motion, safe status handling and teardown. A small-landscape overflow was fixed and independently rechecked. Both distribution tests pass; both browser passes have zero browser or failed-request errors. See the [review](../../hybrid-review/loading-screen/independent/FINAL-REVIEW.md), [builder results](../../hybrid-review/loading-screen/builder/report.json) and [composited screen](../../hybrid-review/loading-screen/builder/desktop.png).

The retained read-only preview on port 4476 has a real shutdown timer for **14 October 2026, 17:19 EDT / 21:19 UTC**, preserving the earlier preview deadline. Its owned source is `tools/serve-loading-screen.mjs`; the lifecycle registration and restart specification are in `artifacts/loading-screen/preview-spec.json`. A future deliberate restart needs a fresh explicit expiry within twenty-four hours; the old command intentionally refuses an expired deadline.
