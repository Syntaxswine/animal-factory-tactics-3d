# The plateau ambush — modular animation study

**User review update, October 12, 2026:** The latest composition still misses the user's target. Animated sprites are being considered for another pass. Technical review results below are preserved as evidence, not final visual acceptance. See the [Claude handoff](INTRO-CLAUDE-HANDOFF.md) for the current brief, storyboard and marked map.

Open `tactics/intro-study.html` and press **Play**. This is a 35-second silent study built from the [earlier twelve-shot storyboard](intro-storyboard/README.md). It covers the overseas hen's briefing, radar contact, two SAM launches, a tail strike, the rapid cliff descent and a survivable landing in a wooded clearing. It is packaged for the 3D project, with no changes to gameplay, campaign state or the existing static helicopter assets.

## Sector geography

The crash sector, SAM sector and central relay objective are separate places. The crash set follows the user's marked Tutorial 1 example: a grassy pocket on lower ground, surrounded by woodland, beneath a broad curved plateau with **two ordinary 2-tile cliff tiers**. Forest patches leave a clear approach, landing/rotor sweep, cabin exit and winding open paths. This is a cinematic interpretation of the rough example, not an edit or exact import of the 240 × 240 gameplay map.

The launcher and its own terrain belong to a separate Three.js scene, over 300 native tile units from the crash coordinates. The sequence cuts to that sector for radar and launch, then returns to the helicopter at 19.4 seconds. Projectiles follow one continuous authored path between the spaces. No SAM or relay object exists in the crash scene, even when orbiting or seeking. The relay remains a remote objective named in the overseas briefing; its sector is not shown in this study.

The final pullback reveals the lower clearing and surrounding forest. The older painted storyboard sheets predate this correction and remain action references only.

## Inspect the pieces

The **Study** menu isolates the missile, launcher, helicopter flight, descent/crash, radio room and radar. **Camera** selects directed, three-quarter, side, nose, tail or top views; drag a paused scene to orbit. Playback supports normal, half and quarter speed, arbitrary seeking, restart and twelve shot buttons. Smoke/dust and surrounding trees have separate toggles for unobstructed component inspection. Grey forms apply to the missile, helicopter and launcher.

Useful URLs:

- `tactics/intro-study.html?module=missile&view=nose` — four fins forming a **+**.
- `tactics/intro-study.html?module=missile&view=three&section=1` — reveal the two continuous plates through the body.
- `tactics/intro-study.html?module=missile&view=tail&roll=45` — the same joint rotated to an **X**.
- `tactics/intro-study.html?module=launch&time=17.6` — inspect the staggered launches.
- `tactics/intro-study.html?module=crash&time=28.25&effects=0&trees=0` — close rotor contact.
- `tactics/intro-study.html?module=crash&time=33&effects=0&trees=0` — settled cabin and open exit.
- `tactics/intro-study.html?play` — full sequence. Reduced-motion preferences keep this paused.

The missile has **two solid fin plates meeting at 90 degrees**, giving four equally spaced fins. Each plate continues through the central cylinder. A + and an X are the same construction at different roll angles; roll never changes the angle between the planes. The 360-triangle projectile is 3.53 tiles long. The helicopter retains its approved native scale of 8.65 tiles along the body, established against the 4.7-tile truck. The raised launcher saddles leave clearance under the lower fins. A released missile inherits the mounted position and full orientation, including roll.

## Sequence and physical continuity

| Time | Beat |
| --- | --- |
| 0–4 s | Helicopter approaches the plateau. |
| 4–9 s | Overseas hen at a stationary desk, headphones and microphone. Caption: “Your mission is to take out the central relay station.” |
| 9–12 s | Return to the approaching aircraft. |
| 12–14 s | Radar sweep reveals the aircraft. |
| 14–17 s | Cut to the separate SAM sector; rails turn and elevate. |
| 17–19.4 s | Missiles leave the remote SAM at 17.4 and 17.95 s. Both rails empty after the second launch. |
| 19.4–20.5 s | Cut back to the helicopter in the crash sector; the first missile arrives and strikes the tail at 20.5 s. The second follows a distinct miss path. |
| 20.5–24.5 s | Localized damage, attached tail and smoke, then rapid descent past the cliff face. |
| 24.5–26 s | Brief nose-up flare; skids approach the ground. |
| 26–28 s | Ground contact, skid buckling, forward slide and soil disturbance. |
| 28–30 s | Short rock, rotor-tip contact, fractured blade section settles on the ground. |
| 30–35 s | Cushion folds and the complete bench stows against the rear bulkhead; near-side door slides aft. Camera pulls back to show the lower wooded clearing and two-tier curved plateau. |

The same rigid cabin stays visible throughout. Skid tubes deform between the intact and collapsed shapes; the aircraft's contact height is calculated from their actual vertices, so compression begins with support on the ground. The rotor slows continuously, reaches a measured tip contact and loses a separate blade section with continuous position/orientation. The section lands instead of disappearing. Rewinding restores every component.

The near-side door slides open rather than becoming the static asset's detached far-side door. This deliberate staging difference makes the exit action visible and avoids a hidden door teleport. The bench cushion folds first; the cushion and back then stow together against the rear bulkhead. The static reference remains unchanged. A clear opening is demonstrated, but squad emergence and character passage are still separate work.

Smoke particles sample the full aircraft/airframe transform at their birth and then move in world space. The source transitions from tail damage toward the engine as the wreck settles. A brief tail flash and skid dust support the action; there is no cabin fireball. The clearing has surrounding trees and a clear camera/aircraft corridor. The two cliff tiers retain ordinary wall height; their scene placement does not change gameplay traversal or map heights.

## Module contracts

| Module | Responsibility |
| --- | --- |
| `sam-missile.js` | Painted cylinder, nose, exhaust and two perpendicular fin plates; reveal/grey modes and diagnostics. |
| `intro-launcher.js` | Retained site base, yaw/pitch cradle, pistons, raised saddles and sequential release. |
| `intro-helicopter.js` | Rigid airframe, damaged tail, morphing skids, rotor fracture, door and bench actions. |
| `intro-ground-contact.js` | Pure support-height calculation from actual approved rail vertices; temporary extraction assets are immediately disposed. |
| `intro-timeline.js` | Shot boundaries, deterministic flight/launch samples and shared emitter transforms. |
| `intro-effects.js` | Bounded painted smoke, ignition/impact flash and dust pools, sampled from birth times. |
| `intro-geography.js` | Sector routing, native-height plateau contours, ground-height samples and crown-aware forest placement. |
| `intro-environment.js` | Independent crash and SAM terrain/forest sets; no relay model. |
| `intro-radio-room.js` / `intro-radar.js` | Overseas handler insert and radar display. |
| `intro-paint.js` | Owned low-poly geometry/material kit over an existing atlas. |
| `intro-study.js` | Playback, scene/camera selection, controls, loading and teardown. |

Factories own their geometry and materials and borrow caller-owned input textures. The radio-room paint helper owns its main hen input texture; the viewer owns the underlay and tail inputs. Disposal is idempotent, including failed initialization. No per-frame geometry or texture creation occurs. Replay does not accumulate particles, change scene topology irreversibly or grow renderer resources.

The study exposes `window.introReady`, `window.introState`, and `window.introStudy.set({module, time, view, playing, effects, trees, grey, section, roll})` for repeatable reviews. `dispose()` stops playback and releases owned resources. Hidden pages suspend their animation loop; reaching the sequence end stops it.

## Art and scope

This pass reuses the approved helicopter, strategic-site, hen, foliage, ground and fire paintings. It adds no generated texture or detailed missile sculpt. Radar is a code-drawn display. Voice acting, sound effects/music, lip-sync, populated cabin, character evacuation, campaign handoff, collision/navigation and combat SAM rules are not included in this study.

The missile curve and helicopter motion are authored cinematic timing, not a flight or missile-guidance simulation. The support/contact checks establish specific visual contacts; they do not establish real-world aircraft survivability.

## Validation

Run:

```powershell
node --test tests/intro-animation.test.mjs tests/utility-helicopter.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/capture-intro-study.mjs
```

The focused tests cover perpendicular through-body plates, mounted fin clearance, launch position and roll continuity, tail-hit alignment, deterministic samples, continuous rotor deceleration, actual skid support during compression, clear central doorway rays, blade-fragment contact and rewind, and transformed smoke emitters. The existing static-model tests remain applicable. Distribution validation checks the module graph and dynamically loaded hen assets.

All **27 focused, existing helicopter and distribution tests pass**, including native cliff heights, actual terrain ray hits, low-ground landing/exit clearance, remote missile continuity and owned terrain disposal. The browser pass captures 24 desktop states plus mobile and checks actual scene submission in 60 combinations of time and camera angle. It exercises real controls, six seek/replay cycles, reduced-motion startup, missing-atlas cleanup and double disposal. It reports no unexpected browser errors and stable resources at 258 geometries / 21 textures across replay. These checks establish the listed contacts and playback behavior; the visual review remains separate evidence.

Screenshots and browser results are in [the review folder](../../hybrid-review/intro-animation/). The independent [review record](../../hybrid-review/intro-animation/REVIEW.md) records the final gate and its limits.

## Preview lifetime

`tools/serve-intro-study.mjs 4476` serves read-only GET/HEAD requests from `dist`. This task's retained preview is registered with the shared helper lifecycle utility and has a real shutdown timer at **October 13, 2026, 1:37 p.m. Eastern**. Its local identity, launch/restart requirements and receipts live under `artifacts/intro-animation/server/`. Create that directory's `STOP` file to stop it early. A deliberate restart must be registered as a new process lifetime.

Capture/review browsers close through their owning API in `finally`; receipts are in `artifacts/intro-animation/helpers/`. The feature branch is pushed for review and integration; it does not deploy Pages.
