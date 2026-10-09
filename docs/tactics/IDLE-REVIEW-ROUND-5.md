# Review round 5 of 5: Animal Factory 3D idle study (4a819dc, phantom-wrench 7fc89f7)

> One independent review agent, October 9, 2026, on `anim/idle-look-around` at `4a819dc` (draft
> [PR #4](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/4)), with phantom-wrench at `7fc89f7`.
> Reproduced as the reviewer wrote it, except that its local evidence folder is named, not given as a path: the
> logs, renders and tools in it were not published. Line numbers (l.N) are of `IDLE-LOOK-AROUND.md` at `4a819dc`,
> and `file:line` of the code there; the doc's later corrections move them. The author's answers are in
> [IDLE-LOOK-AROUND.md](IDLE-LOOK-AROUND.md), "Review round 5 of 5".

**Score: 8/10** (round 4 gave 7). That is still under the 9/10 target. This was round 5 of 5, so under the standing
rule I stop here: a sixth round needs the boss's go-ahead.

**In short:**
- v5 fixes round 4's MUST-FIX in substance. The fit and the census now test the surface as it is drawn.
  - On fresh seeds, round 4's strict surface census finds at most 6.5 mm of sinking (round 4: 16.2 mm).
  - None of the slides I rendered shows at the close-up scale.
- The physics is excellent again. phantom-wrench passes on all eleven characters (seed 3), and its negative control
  fails on all eleven at both 1 cm and 0.5 cm.
- Most of the doc's numbers reproduce. The liveliness table and the pig director's look sides match to the digit; the
  CoP margins and the head, hip, knee and wrist rows fall within their stated bounds on fresh seeds.
- What holds it under 9 (all SHOULD-FIX; I found no MUST-FIX):
  1. The fit never probes motions that the loop combines. On fresh seeds v5's own census fails in 3 of 3,960 frames,
     always on the two characters whose arms the clothes hold.
  2. The slide rule is not what the doc says. Edges creep 15–18 mm on those two characters, yet the boss's open
     question is framed as "6 mm, two pixels".
  3. The depth rule treats a bib covering a shirt (natural) the same as braces sinking into a shirt (clipping). The
     natural case limits three characters' range.
  4. The tests do not pin the trunk and arm fits. Two loosening mutants survive, and one of them brings back a defect
     the doc says v5 fixed.
  5. `rigKey` depends on the worker's current pose, so a posed or game-driven worker refits for 22–37 s.

All evidence is in the reviewer's local evidence folder (`review-idle-5`, not published),
in `logs\`, `img\`, `pw\`, `mut\`, `checker\` and `tools\`. The paths below are relative to that folder. At the
study's close-up scale (280–400 px per metre; about 350 in my renders), 3 mm is about 1 px, 6 mm is 2 px and 15 mm is 5 px.

## MUST-FIX

None.

## SHOULD-FIX

**S1. The fit never probes what the loop combines, and v5's own census fails on fresh seeds.**

*How I measured.* I ran the census test's own census (lifted out unchanged, `tools\censusrun.mjs`) through all eleven
characters on seeds 5–10, every 0.5 s: 3,960 frames in `logs\loops\census-*.log` and `logs\csweep\*.log`. Three
frames fail the v5 rule:

| character, seed, time | what sinks | depth | what the loop combines there |
|---|---|---|---|
| pig foreman, s6, 7.7–8.2 s | waistband and left hand, into each other | 3.1–3.3 mm | a 43° look right, hips turned −8.1°, a quarter lean left, the bottom of an exhale |
| pig foreman, s9, 14.2–14.7 s | right forearm into the shirt (round 4's spot) | 3.6–3.8 mm | the top of the sigh (breath 2.5–2.8) during the lean left |
| sheep, s6, 7.0–7.1 s | shirt into the left forearm | 3.1–3.6 mm | mid-way through a look left (the chest twisting from 5° to 9.5°, the arm lagging), leaning right |

The windows at 0.1 s steps are in `logs\census-failures-fine.log`, and the states in `logs\state-failures.log`.

*An independent check agrees.* My own code (`tools\slideaudit.mjs`: 3 mm points, diagonal rays, its own nearest points)
flags the same two seed-6 points as outside v5's allowance (`logs\slideloop\pig-foreman-6.log`, `sheep-6.log`).

*Why they fail.*
- The probes never turn the hips, though the loop turns them up to 10·tanh (8.1° here).
- The probes never lag the arms' heading; they add 1° of outward swing for the lag instead (`idle-motion.js:491`).
- The probes take a sigh only standing (doc l.265, "a sigh standing and an ordinary breath leaning"). The doc's
  "Probing a lean with a sigh's shrug ... dropped" (l.530) has exactly this cost, and the doc does not mention it.

*How big.* 0.1–0.8 mm over the rule, about 1.1–1.3 px. I could not see it
(`img\diff\foreman-s6-8.0-lefthand-*.png`, `img\diff\sheep-s6-7.1-leftforearm-*.png`).

*Overclaim in the doc.* The round-4 table (l.557) says "the census finds none through every loop". That is true only
of the loops it ran.

*Fix:*
- Probe the lean with the hips at their widest turn and the arms lagged, and probe the sigh inside a lean. If that
  costs too much, keep the plan from putting a sigh on a lean for characters fitted that way, or keep a reserve on the
  held characters' arm shares.
- Run the census on the two held characters over several seeds every 0.5 s (S4).
- Correct l.557.

**S2. The slide allowance does not do what the doc says, and the boss's open question rests on it.**

*The doc.* l.231–233: "So an edge may advance 6 mm over the surface it already covers, and no further". l.226: "An
edge may slide two pixels". Still open, l.654–659: "v5 lets a layer's edge slide 6 mm over what it already covers, two
pixels at the close-up".

*The code bounds depth, not travel* (`idle-motion.js:401`, `437–440`).
- Within 6 mm of a hidden point, a point may go as deep as that hidden point lay, plus 3 mm.
- Further out, it may go 3 mm deep.
- A cover that advances at a shallow depth is not bounded at all.
- The "same stretch within 1 cm" test does not bound the cover's own slide either. At the foreman's left hand the
  covering surface slid 12–14 mm and passed (the `slide` column in `logs\slide\pig-foreman-6.log`).
- The allowance itself is 5–9 mm on the strict-sinking points, 7–9 mm on most (the `allow` column in `logs\slide\*.log`).

*Measured.* I ran `tools\slideaudit.mjs` through 9 loops at 0.5 s (`logs\slideloop\*.log`, summary from
`tools\slidesum.cjs`). It measures how far a cover advanced over a part's surface, in frames the census passes:

| character, seed | cover advance | detail |
|---|---|---|
| sheep, s6 | neckerchief over the neck: **18.4 mm** (9 frames over 6 mm) | |
| sheep, s6 | left forearm over the shirt: **15.1 mm** (22 frames over 6 mm) | a continuous band: 144 / 134 / 107 / 63 / 31 / 2 points in 3 mm bins (`tools\slideaudit2.mjs`) |
| sheep, s6 | neckerchief under the waistcoat collar: 9.9 mm | |
| pig foreman, s6 | trousers over the hands: **16.3 mm** (over 6 mm in most frames) | |
| dog, s5 | the knot over a neckerchief end: 14.3 mm | |
| skunk, rabbit | 7.2 and 7.3 mm | |
| horse, bull, cow, goat | 5.0–6.4 mm | |

*Visually* none of these reads as a tear at the close-up (`img\seq\close-*.png`,
`img\diff\sheep-s6-19-neck-*.png`, `img\diff\foreman-s6-9.5-*.png`).

*Strict sinking on fresh seeds* (round 4's `sdepth.mjs`, seeds 5–6, 1,320 frames, `logs\sdepth-56-summary.txt`):
420 frames over 3 mm, 53 over 5 mm, worst 6.5 mm (the horse's shirt under its overalls, s5 at 5 s). The doc reports 333,
19 and 5.9 mm on seeds 1–2.

*Fix:*
- Describe the rule as it is: a depth bound with a 6 mm zone, not a bound on how far an edge travels.
- Measure the edge advance itself and give the boss that number, in pixels, with the 15–18 mm renders, rather than the
  6 mm parameter.

**S3. The depth rule cannot tell a natural slide from clipping, and that costs range.**

*Two cases the rule scores alike.*
- An inner layer going under an outer one: the bib's edge covers more shirt. This is natural.
- An outer layer going into an inner one: the braces vanish into the shirt. This is clipping.

*Which way the limits fail.* The limits the doc names (l.300–304) fail, at the step past them, in the natural direction
on three characters. My census of the posed head (`tools\censusrun.mjs` pose mode, `logs\limits-past.log`):

| character | pose | what the census finds |
|---|---|---|
| horse | 32.5° right, tilted −5° | shirt into the overalls, 4.3 mm |
| horse | 35° right | shirt into the overalls, 7.5 mm |
| bull | nod 17.5–20° | shirt into the overalls, 3.0–3.5 mm |
| cow | 24° turn, nod 17.5° | shirt into the overalls, 4.2 mm |

Rendered at about 2100 px/m, the bull at 20° and the horse at 35° right show nothing
(`img\diff\bull-pose-nod20-bibtop-zoom.png`, `img\diff\horse-pose-35right-bibtop-zoom.png`).

*The goat.* Its limit is the clipping direction (braces into the shirt, 6.9–7.2 mm at 20°), and even that does not
show (`img\diff\goat-pose-nod20-back-zoom.png`). "Shows at rest" means outside every other part, not visible, and a
strap's side facing the shirt is never seen.

*Cost to naturalism* (`logs\glances5.log`, 30 seeds). The bull's glances at the ground go 12.6–16.4° down (median
14.8°), the goat's and the cow's at most 21.5°. Every character's glances stop at 26°. At 15° the gaze meets the floor
5–6 m ahead, not "in front" (l.53). The boss's note was about heads that "tilt down that far".

*Fix:*
- Make the rule directional with the layer order the neck glue already has (`rank`, `idle-motion.js:273`):
  - an inner layer going under an outer one is a slide, bounded only against punching through;
  - an outer layer going into an inner one is held to 3 mm.
- Or test whether a point can be seen from some view, not whether it lies inside a part.
- Refit, and report what the horse, bull and cow gain.

**S4. The tests do not pin the trunk and arm fits; two loosening mutants survive, and one brings back a fixed defect.**

*The pass.* 11 mutants of 4a819dc (`tools\mutate5.mjs`, `mut\*.log`). Each lives on a `_mut-idle-<n>` copy, and every
copy is deleted in a `finally` block. Fit mutants are judged on their own refitted tables (`tools\fitmut5.mjs`).
- **Killed (6):**
  - slide 8 mm;
  - same stretch within 2 cm;
  - fit points 8 mm apart;
  - graze 4 mm;
  - neck layers glued from 0.3 of the branch below the base;
  - no angular momentum in the balance plan.
- **Survived (5):**
  - **F4, the knee fix reverted** (lean probes without the legs bent to the hooves). The pig director's row returns to
    a full lean and every test passes. On seed 2 the census then finds his trousers through themselves at the knee,
    3.3–3.6 mm in 5 frames (`mut\census-4b-pig-director-2.log`). That is the defect the doc says the fix removed
    (l.319, l.573). The census test runs him on seed 11 (and seed 1 is clean too), where it does not occur.
  - **F5, the arm probes without the millimetre in hand.** Five rows loosen:
    - bull: rounding 5 → 7.5°;
    - sheep: lean ¾ → 1, shrug 0 → ¼, rounding 0 → 2.5°;
    - skunk: rounding 7.5 → 10°;
    - pig foreman: ease 0 → ¼;
    - pig director: lean ¾ → 1.

    The tests pass. On seeds 1–2 the census then finds the sheep's forearm 5.0 mm into its shirt, the foreman's
    waistband 4.2 mm into his hand, and the director's knee fold again (`mut\mutcensus-5b.log`).
  - **K1, `rigKey` hashing only the first part's vertex positions.** The key test edits only `parts[0]`
    (`tests/idle-fits.test.mjs:43-45`). A neckerchief edit, the asset change the doc proposes to the boss, would then
    keep a stale row.
  - **S1, glances at the ground no longer held to the reach** (a v5 fix). The director then glances 13.2–14.9° aside
    on 5 of 30 seeds, past his 12.3° reach. The reach test covers only the foreman and the sheep
    (`tests/idle-motion.test.mjs:193`). The census stays clean (`logs\s1probe.log`).
  - **S4, the knees not following the hips** (the doc's 15%, l.75). The knee test still passes.
- **The doc's claim.** It says that of 37 mutants four survive, three equivalent and one stricter (l.456). Its pass has
  no mutant that loosens the trunk or arm fits.

*Fix:*
- The census test samples one seed per character every 2 s (`tests/idle-clothing.test.mjs:116,122`). Sample the held
  characters' loops (the sheep, the pig foreman, the pig director) every 0.5 s on 3–4 seeds, including seed 2.
- Extend the key test with an edit on a later part.
- Run the reach test on the director.

**S5. `rigKey` depends on the worker's current pose, so a posed or game-driven worker refits for 22–37 s on the main thread.**

*The doc.* l.273–275: "a hash of the rig's bones (names, rest places, turns and scales)".

*The code.* It hashes `b.position`, `b.quaternion` and `b.scale` as they are (`idle-motion.js:157`), before
`createIdle` poses the rig neutral (l.181–182).

*Measured* (`tools\posedkey.mjs` → `logs\posedkey.log`; `tools\refitcost.mjs` → `logs\refitcost.log`):

| worker before createIdle | in the shipped table? | createIdle |
|---|---|---|
| horse at rest | yes | 1.0 s |
| horse after `pose('carry')` | no | 33.3 s |
| dog with its head turned 11° | no | 25.2 s |
| dog on the game's motion, restored | no | 22.2 s |
| the same dog, restored again | (cached) | 1.0 s |
| the same dog, left mid-walk at 0.37 s and at 0.91 s | no (a new key each pose) | 22.6 and 23.3 s |

The re-weighted case is documented (l.276). The pose case is not, and it makes the in-memory cache useless for a
worker the game leaves mid-motion.

*Fix:*
- Hash the rest pose: call `worker.pose('neutral')` before hashing, or hash the skeleton's bind data.
- Ship rows for the game-motion-weighted rigs, or key the fit on the rig's own data captured before the game re-weights it.
- Put the refit cost in Integration (Still open).

## NITS

- **The director's glances at the ground** go 5.1–8.9° down (median 6.8°, `logs\glances5.log`), labelled "Glance
  down". In `img\seq\pig-director-s3-down.png` one goes from −4° to −5.8°. This is round 4's foreman nit moved to the
  director (his reach down is 10°). *Fix:* don't plan ground glances shallower than about 12°, or label them drifts.
- **The sweeps ran before the knee fix.** The sweep logs are from 22:09–22:25, the knee patch is 23:07 and the final
  table 23:12. Their base sums 1,822.5; the shipped table sums 1,820 (`logs\reachsum.log`; the author's own `cmpsweep`
  on `gen-v5g` also gives 1820.0). The doc says "the shipped table sums 1,822.5" (l.378), and every sweep row carries
  the director's full lean. *Fix:* re-run them, or say so.
- **Wording that contradicts the confirmation rule.** "The next 2.5° (or quarter) past each limit is what fails"
  (l.310) cannot be right, because 2.5° past is confirmed clear. The director is clean at 5° and fails at 7.5°
  (4.1–4.4 mm). The sheep is clean at 22.5° left and at 12.5° right, both tilted ±2.5°, and fails at 25° and 15°
  (3.0–4.0 mm) (`logs\limits-past.log`). *Fix:* say 5° past.
- **Sample maxima are exceeded on fresh samples:**
  - seam velocity jump 0.056 mm/s on 88 builds (`logs\robust5.log`; doc 0.04, l.358);
  - leg reach 99.17% on seeds 9–12 (`logs\claims-9-12.log`; doc 99.14%, l.154);
  - strict census 6.5 mm (S2; doc 5.9).

  *Fix:* give the scope with each number, or quote a bound.
- **"Arm out ... at most 4.2°"** (l.352). The upper arm's full angle in the chest's frame reaches 8.0° (the cow) on
  seeds 9–12. *Fix:* say which component is meant.
- **The game's tail stays frozen** during an idle on a game-driven worker: the bull's is at 1.6° before and during
  (`logs\integ5.log`). Round 4 noted this; the doc does not mention it.
- **Cloth stretch on glances down.** The horse's shirt back stretches 55% on a glance down (17% on the rig's own
  weights), and the goat's beard 53% (0%) (`logs\strain-*.log`). It reads as the collar pulling
  (`img\diff\horse-s3-15-*.png`). *Fix:* list it with the shoulder pull in Still open.

## Round-4 items

| item | status | evidence |
|---|---|---|
| M1 vertices, not surfaces | mostly fixed | surface points in the fit and the census; strict worst 6.5 mm on seeds 5–6 (was 16.2); no visible slide in renders. But 3 rule failures on fresh seeds (S1), and the slide is misdescribed (S2) |
| M1 fix 2, bound hidden points | answered, holds | `logs\shallow-foreman-1.log` 4.1 mm (the doc's number); on seed 6 a hidden vertex goes 7.5 mm, but the census flags the showing surface beside it at that moment (S1) |
| S1 the sheep's hold is partly the rounding | fixed | 2.5° steps, confirmed; my census at and past the sheep's and the director's limits agrees with the fit. Wording nit |
| S2 knife-edge local numbers | partly fixed | sweeps published with criteria, but run on the pre-knee module; a single character's nod still swings 7.5–10° over the glue margins (the doc says so) |
| S3 neck glue | fixed | chest cloth on seed 3: 0.2–3.1 mm within 3 cm below the neck base, 0 beyond (`logs\dragloop2-s3.log`) |
| S4 arm strip | fixed | the director's upper sleeve on seed 3: 19.0 mm (rig's own weights 15.6; v4 31) (`logs\sleeveshear-director-3.log`); the test passes |
| S5 tests | partly fixed | constants restated, bone moved, sigh sampled, mutation pass on this revision; but F4, F5, K1, S1 and S4 survive (S4) |
| nit: director's looks one-sided | fixed | 97 left / 89 right, 15% / 13% (`logs\sides.log`) |
| nit: foreman's glances 5–9° | fixed for him (10.2–14.0°), moved to the director | `logs\glances5.log` |
| nit: disposal order | fixed | both orders restore the rig (`logs\integ5.log`, and the test) |
| nit: `rigKey` sums positions | fixed | every edit changes the key (`logs\keyedits.log`), but see S5 and K1 |
| nit: loops depend on asset bytes | fixed | the seed is mixed with names |
| nit: `eye[2]`, which twist share | fixed (documented) | — |
| nit: timings and seam | answered | load named; character switch 0.49–1.57 s and seed rebuild 0.22–0.39 s under my load (`logs\pagecheck.log`); seam still 0.056 mm/s |
| nit (part of the disposal nit): frozen tail | not fixed | `logs\integ5.log` |

## What I ran

- **The three test files, side by side** (another agent's suites shared the machine): motion 33/33 in 679 s, clothing
  2/2 in 771 s, fits 4/4 in 426 s (`logs\test-*.log`).
- **Census on fresh seeds:** the v5 census on seeds 5–10 (3,960 frames), the strict census on seeds 5–6, and slide
  audits on 9 loops, all every 0.5 s.
- **phantom-wrench** (`pw\`):
  - all eleven characters on seed 3 pass;
  - the 1 cm control (seed 3) fails on all eleven, 10.6–30.0 s of 30 over the gate;
  - the 0.5 cm control (seed 4) fails on all eleven, 1.55–24.95 s.
- **Other checks:**
  - CoP on seeds 7–8: dog 3.0 cm, rabbit 2.9 cm, the others 5.3–9.0 cm (`logs\cop-78.log`);
  - doc rows on seeds 9–12 (`logs\claims-9-12.log`);
  - liveliness on seeds 1–4, matching the doc to the digit (`logs\lively-1234.log`);
  - peak acceleration on seed 2: 0.51–2.10 m/s² (`logs\accel-2.log`);
  - 88 robustness builds with no failures;
  - 195 intermediate nod poses below the fitted limits, all clean (`logs\monotone.log`);
  - every part a closed surface (`logs\closed.log`).
- **The browser checker,** copied with its output redirected (`checker\`): 35 configurations, 866 seeks, no errors. Its
  seven images are byte-identical to the committed ones.
- **49 renders** with the study's own renderer: 27 contact sheets of frame sequences at 0.1–0.25 s through wide looks,
  glances down, leans and sighs on all eleven characters (`img\seq\`), and 22 before/after/difference shots
  (`img\diff\`). Naturalism by eye:
  - the neck reads as a bend, and the head leads, the chest and then the hips follow;
  - the leans and the sigh read;
  - no clothes tear or swim at the close-up;
  - the director stays nearly still in the head (his yaw range is 8.9–18.5° a loop) and the two held pairs of arms never
    ease, both as documented;
  - the pig foreman's chest cannot twist (0° / 2.5°), so his 41° looks turn only his head and hips. It reads as a stiff
    torso, which is plausible for him (`img\seq\pig-foreman-s3-wide.png`).
- **Not run:** `npm run check`, or the checker in place.

`git status` is clean in both repositories, no `_mut-idle-*` file remains in either, and none of my processes is
still running.
