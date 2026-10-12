# Independent review — modular intro animation

**October 12, 2026 · 9/10 · Approved as a modular animation study.**

The independent reviewer performed code/geometry inspection, 33 fresh rendered states and uninterrupted playback. The approved source hashes and compact results are preserved in [independent-review.json](independent-review.json). The complete silent [recorded sequence](sequence-playback.webm) includes the radar insert and mission caption.

> 9/10 — approved as a modular animation study. No remaining blockers.

## Findings resolved before approval

- The two continuous missile fin plates cross through the cylinder at **90 degrees**. Plus and X silhouettes are different roll angles of that same construction. Released missiles now retain the full mounted orientation, removing a 29.49-degree roll jump.
- Both additional hen input textures are disposed by their owner. The radio desk was moved clear of the hen's body while retaining microphone reach.
- Damage smoke samples the full aircraft/airframe transform at emission; emitted puffs remain in world space.
- Skid compression uses the actual intact/collapsed support vertices, keeping the lowest rail in contact rather than merely avoiding ground penetration.
- The rotor splits continuously at measured ground contact; its detached section settles visibly instead of disappearing.
- The complete bench, including its back, stows against the rear bulkhead. The sliding door and bench leave the central near-side opening clear.
- A Trees checkbox enables side inspection without removing the woodland from the sequence's default staging. The directed crash camera and final pullback remain clear.

## Verification

- Eleven focused intro tests pass independently. The delivery run adds the eleven unchanged static helicopter tests and two distribution tests: **24 passing tests**.
- The reviewer checked all twelve shots, missile reveal/roll, no-effects crash views, doorway, grey forms and mobile controls.
- Exact rewind, reduced motion, visibility suspension and texture disposal pass. Renderer resources remain **270 geometries / 20 textures** after repeated replay.
- Real-time playback reaches the 35-second end without errors (35.371 seconds measured wall time in the review harness).
- The builder's [browser check record](browser-checks.json) adds 21 desktop samples, mobile, real controls, deliberate missing-atlas cleanup and double teardown.
- Review/capture browsers close through their owner API; exact process identities and successful exit receipts remain in the local task's helper records. The retained preview keeps its existing fixed expiry.

The review harness needed two corrections: the initially selected recording path required an unavailable ffmpeg binary, and a subsequent wait used the wrong timeout argument. Browser MediaRecorder with a corrected wait completed the recording. Neither was a product defect.

Approval covers the silent animation study and component inspection. Final audio, populated cabin, squad evacuation and gameplay/campaign integration remain outside this gate. The existing static helicopter assets are unchanged.
