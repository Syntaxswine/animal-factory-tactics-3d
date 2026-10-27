# Integration review — 27 October 2026

Canonical base: `aa61ffa1`. Reviewed coder branch: `bf93606d` (including
`04cdcaa3` and `a20b343a`). Garden source: `b140b9f9` / PR #13. Traversal source
triaged separately: `b1d042b3` / draft PR #12.

## Approved for canonical

The coder's checkpoint, audio, loading, editor-layer and rendering corrections
are approved as incremental fixes. The three furnished town variants and the
standalone Greek Key Garden are approved as optional sector presets. This does
not declare the campaign or tutorial sequence complete.

Walking now dirties a checkpoint without serializing the whole campaign each
tile. The 30-second deadline is fixed rather than reset by continued movement;
round/outcome boundaries, explicit saves and hiding a dirty tab still checkpoint.
Failed or stale writes do not advance the committed revision. Native tests and
the actual IndexedDB browser journey preserve identity, reload and leave/revisit.

The shot-command boundary resumes audio before consuming immediate discharges.
The camera-right axis agrees with the real screen projection, and projectile
receipts preserve the surface struck before destruction. Unknown surfaces stay
silent; open window frames are not treated as glass panes. Higher-floor character
duplication uses the shared layer limit. Optional blood atlas failures no longer
poison required sector loading, and Blood Off avoids those atlas requests.

Rendering replaces repeated static work with cached terrain matrices, exact
rigid-part batches and bounded vegetation shadow shapes. The actual foliage
movement, sight and shot volumes remain intact. Moving lights, equipment that
deforms and painted object-space weapons retain the treatment they require.

## Independent checks

- **1,067 tests passed across 126 files**, zero failures, skips or TODOs. This
  combines the earlier functional review with the affected rendering, foliage,
  audio, checkpoint, town, garden and crawl checks. It is not the entire art
  catalogue. After the garden source-copy correction below, its five checks
  passed again, including the new ordinary-export regression. Twenty sector
  authoring/preset/library and deployment checks then passed on the final export.
- All 20 shared core modules and eleven deterministic real-attack fixture cases
  reproduce. All 49 changed/new JavaScript modules parse. Asset audit and the
  Pages build pass, including the existing module/worker closure tests.
- Actual browser saves: six observations each for two and six initialized
  sectors. Preparation p95 was **9.8 / 20.2 ms**; complete checkpoint p95 was
  **83.1 / 217.4 ms**. Five walking steps caused no writes before the deadline,
  followed by one scheduled checkpoint. Both cases passed reload, competing-tab
  rejection, injected write failure, pending-transition rejection and revisit.
  These are small samples from this machine, not universal storage guarantees.
- Actual HUD → draw pistol → full-aim torso → Fire: Yakov spent 2 AP drawing and
  8 AP firing, ammo 8 → 7, Boris HP 70 → 46. Diagnostics showed one `tt33` cue,
  eleven decoded clips and running audio. Anya's shotgun then spent 10 AP and one
  shell, resolved two body contacts and added its report and pump cues (three
  cumulative cues). No application warning/error was reported. This verifies
  scheduling and decoding, not a recording of physical speakers.
- Opened the town gallery, Linden Square in the editor and through its actual
  Playtest control, and moved along the street. Inspected the garden at overview
  and gameplay scale. The map tests check all three towns' road ports, reachable
  rooms, stairs, editor round-trip and peaceful talkable residents; garden tests
  check all starts, ordered linked curls and denied outside shortcuts.

## Performance remains an open gate

An independent 60-second temperate `trees-v1` sector sample used Chrome 155,
RTX 3080 / ANGLE D3D11, 1236 × 394 CSS pixels at DPR 1, proxy foliage shadows,
day/night camera changes, cutaways, a lit room and fire. Other review tabs and
the regression runner were closed/finished before measurement.

| Measurement | Median | p95 | p99 |
| --- | ---: | ---: | ---: |
| CPU draw | 8.5 ms | 15.0 ms | 19.3 ms |
| GPU | 11.6 ms | 15.7 ms | 18.5 ms |
| Display interval | 16.7 ms | 19.4 ms | 94.1 ms |
| Draw submissions | 714 | 828 | 850 |

The run completed 92 individual movement steps and eight accepted shots; it did
not merely attempt commands after AP ran out. No application diagnostics occurred.
The night/close phase still reached **17.2 ms CPU draw at p95**, and the display
tails remain visible. The improvement can ship; **H2 is not closed**. Continue
profiling movement/visibility, simulation and view-change stalls. This one run
does not certify every biome, device, viewport or a finished campaign.

## Maps and source-copy correction

Linden Square, Last Shift and Floodmark give reused buildings a purpose through
their furniture and nearby work: a public hall converted to a ward, a workshop
waiting on its next shift, and a bridge settlement sheltering displaced people.
These are useful foundations. Keep later combat and story passes focused on
distinct approaches, useful flanking routes and why people occupy each room.
They currently have two peaceful residents each, not authored combat encounters
or functioning settlement economies.

The garden's dirt corridor and low hedge border read clearly at gameplay scale.
Its long linked route is useful for movement practice; it is not the agreed
five-sector combat/introduction sequence and has no scripted lesson/finish event.

The initial garden delivery wrote only the bundled runtime collection. A later
export from the organized authoring collection could remove its catalogue entry.
The reviewed correction makes the generator copy the garden into
`sectors/tutorial/tutorial-greek-key` when that collection exists, then export
from the source. Other named variants are retained. A new regression reproduces
generation → additional saved variant → regeneration → ordinary export, checking
the retained files and counts. The bundled CSV and inventory now include the map.

Five files were also **copied** into the user's organized garden source folder.
Existing different files would reject the copy; the real shared export-state and
other authoring files were left alone. Reproduction used an isolated copy of the
reviewed collection, rather than advancing the real export-state against a test
output folder. No existing worktree or server was moved.

## Traversal stays in draft

The `b1d042b3` change measures the tail in its posed shape, addressing support
that the solver previously inferred under a straight plume rather than the
played tail. That is a sensible correction. The author's latest report still
lists elbows folding beyond the rig's limit and support/recovery cases needing
work, including the skunk and goat. That branch remains draft/WIP and is not
included here. This round is a source/report triage, not a new full visual or
physics signoff of its entire traversal catalogue.

Crawling also remains a separately approved study until the gameplay wiring
described in the 24 October handoff is completed. These maps and coder fixes do
not wire either study merely by sharing the repository.

The local evidence bundle is `artifacts/oct27-push-review/`: regression logs and
plan, the final garden test log, browser checkpoint/audio/render summaries and
the organized source-copy receipt. Temporary review helpers are retired when
verification is complete; the unrelated retained town preview is preserved.
