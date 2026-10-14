# Independent loading-screen review

Reviewed October 14, 2026. **Score: 9.0/10. Approved for the visual study and reusable progress presentation. No remaining blockers in this scope.** This does not approve or establish gameplay loading integration.

## Art judgment

The painterly command room clearly communicates all three requested qualities: military olive controls and deployment framing; industrial girders, pipework, steel cabinets and wear; retrofuturist amber radar, analog gauges and tape reels. Its lighting and softened painted detail fit the established game's art direction. The cream title occupies deliberate dark space rather than covering the main console, and the bottom loading readout remains separated from the illustration.

The title, percentage and progress bar retain a useful hierarchy on the laptop and portrait-phone crops. At the smallest landscape size, the illustration still shows enough radar and machinery to carry the concept. The compact layout removes secondary copy rather than hiding progress. Normal, interrupted and ready states are visibly distinct, with status text as well as colour.

Optional polish only: the tiny technical masthead/footer labels are atmospheric more than useful at 568×320; keep them secondary. A future deployed version should use the game's final identity treatment once established. Neither warrants holding this concept.

## Issue found and resolved

The initial independent capture at **568×320** produced a 570px-tall page, putting the progress bar below the viewport. The portrait layout was still active because the compact rule excluded widths below 761px. The builder changed that rule to use short height plus landscape aspect ratio. The final fresh capture is exactly 568×320, with the loading readout ending at y=304 and no scrolling. The complete independent sweep passed after this repair.

## Fresh verification

- Six independently captured viewports: 1920×1080, 1366×768, 390×844, 320×568, 844×390 and 568×320. No horizontal or vertical overflow; progress remains visible. These are fresh captures, not the builder's screenshot set.
- Keyboard Tab/Enter/Space play, pause and replay work. Paused elapsed time stays fixed with no pending animation frame.
- Hiding the document suspends frame requests; showing it resumes without advancing during the hidden interval.
- Indeterminate progress, finite-number validation, clamping, literal error-message rendering, ready status and `aria-busy` transitions pass.
- Reduced-motion mode begins static, with no CSS animation or pending animation frame; the indeterminate indicator is static too.
- Double disposal is safe. The frame count is zero, CSS animation is paused, the Replay listener is removed, and progress calls no longer mutate the disposed screen.
- No page, console or request errors during the final review.

See `review.json` for frozen source hashes and measured viewport/controller results, and `review.mjs` for the independent reproduction. Fresh art captures include `desktop.png`, `laptop.png`, `phone.png`, `small-phone.png`, `landscape.png`, `small-landscape.png`, `indeterminate.png`, `error.png` and `ready.png`.

The temporary owned review browser closed in `finally`; `browser-closed.json` records its identity and confirms that its process exited. The pre-existing preview server was reused without changing its lifetime.
