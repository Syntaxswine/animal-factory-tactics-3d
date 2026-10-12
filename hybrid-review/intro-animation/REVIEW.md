# Independent review — intro sector geography

**October 12, 2026 · 9/10 · Approved as a modular animation study. No blockers.**

**Subsequent user review:** The user said this still misses the mark and is considering animated sprites. The score below remains a historical technical/art-study assessment; the composition has not received user approval. The [Claude handoff](../../docs/tactics/INTRO-CLAUDE-HANDOFF.md) carries that unresolved direction forward.

This supersedes the nearby-site staging in `386de27`. The crash, SAM and relay belong to separate sectors. The user's [marked map reference](../../docs/tactics/intro-storyboard/crash-sector-reference.png) places the wreck in a lower grassy pocket beneath a curved two-tier plateau, with woodland around it. The current scene and [full recorded sequence](sequence-playback.webm) use that relationship. The relay remains an offscreen briefing objective.

## Independent evidence

The reviewer inspected fresh renders, uninterrupted playback and source/geometry. The launcher is owned by its own scene; neither it nor a relay model appears in the crash scene under camera changes or seeking. The sequence cuts from the remote launcher back to the helicopter at 19.4 seconds. The same continuous missile track spans that cut.

- Two curved cliff tiers each retain the ordinary 2-tile wall height. Forest patches surround the landing clearing and leave the exit and rotor sweep open.
- The missile, helicopter and support-sampler source hashes are unchanged from the previous approved mechanics. Fin layout, grounded skid compression, rotor separation and the open doorway remain intact.
- **14 focused tests passed independently.** The builder's delivery run adds static helicopter and distribution validation: **27 passing tests**.
- A 60 Hz terrain audit sampled **7,522,468 visible actor vertices**. Minimum terrain clearance was approximately **0.002 tile**. The incoming missile nose first contacted the tail boom; no cabin interception was found.
- Real-time playback reached 35 seconds in **35.06 seconds**, with no errors. Rewinds and sector-cut transforms were checked.
- The builder captured **24 desktop states plus mobile**, verified actual scene submission for **60 time/camera combinations**, and tested real controls, replay, reduced motion, missing-atlas cleanup and double disposal. Resources held at **258 geometries / 21 textures** across replay.
- Disposable review and capture browsers closed through their owner APIs. Exact process identity checks and closure receipts confirm exit. The retained preview's original expiry remains October 13, 2026, 1:37 p.m. Eastern.

The [current compact review record](independent-review.json) preserves checks and refreshed source hashes. [Browser checks](browser-checks.json) and the current PNGs accompany it. The [previous review data](independent-review-386de27.json) is historical and applies to the earlier scenery.

Approval covers the silent animation study and corrected cinematic geography. This is a visual interpretation of the rough map, not an exact map import or gameplay placement. Final audio, squad evacuation and campaign integration remain separate work.
