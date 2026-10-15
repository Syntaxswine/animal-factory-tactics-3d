# Chair and defeat review — 9 October 2026

Approved for canonical after correcting local-map contract expiry. Reviewed `work/editor-3d` at `84068a1` against canonical `d1928b6`; the branch merged without conflicts.

## Scope and result

- **Chair test:** `5bd0e47` was already reviewed and included in `d1928b6`. The smaller chair footprints, lower seats and corrected elbow direction remain the approved study baseline. This is the unarmed horse sit/stand study, not a new gameplay sitting action. Other animals, equipment and occupied/approach cells still need integration. See [the preceding review](INTEGRATION-REVIEW-2026-10-09.md) and [chair fitting contract](PAINTED-CHAIRS.md).
- **Death revision:** `84068a1` adds the delayed squad-defeat return, deceased portrait treatment and campaign replacement hiring. It does not replace the character death animation. Quick Fight returns to the main menu; campaign defeat saves the outcome before returning to the paused overmap. Failed campaign checkpoints keep the encounter available for retry or loading another save.
- Deceased portraits are distinct from bleeding, stabilized, captured and departed mercs. Fallen campaign identities remain in the memorial, while replacements enter the sector population and roster through the saved campaign transition.
- Replacement hiring uses the existing recruitment prices and paid contracts. Arrival is limited to initialized, visited, peaceful sectors outside Red Hat ownership. Future SAM and deployment rules remain separate work.

## Integration correction

The builder settled contract deadlines only for inactive sectors. Reproduction: hire a merc for one day, enter a local sector, advance its clock beyond the deadline, then synchronize the encounter. The contract remained active and unexpired, allowing paid service to continue indefinitely while staying on the local map.

`syncCampaignEncounter` now settles the active sector's contracts before reconciling its population. Both active and inactive sectors use the existing core contract rules: mark expiry during combat, then let the merc leave when combat has ended. Previously marked expired contracts are revisited so they can settle at the next safe synchronization. Dead, captured and departed mercs retain their existing treatment.

Two regressions failed before the correction and pass afterward: peaceful local expiry and combat expiry followed by departure when safe. Saved campaigns validate after both paths.

## Verification

- Initial affected battle, defeat, hiring, HUD, character-record and deployment suites: **33/33 passed**.
- Final campaign, hiring and defeat suites after the expiry correction: **37/37 passed**, including both new regressions. These overlap the initial suites; the counts are not additive.
- Additional encounter-save, tactical-world and clock test invocation: **9/9 passed**.
- Final 3D deployment build, asset validation, twenty-module core synchronization and diff whitespace checks passed. Missing-module checks remain enabled. The preceding canonical release completed its full **2,198-test** CI run; this review's local checks are the focused suites above, not a claim of another full local run.

Fresh browser checks used the packaged output and disposable saved encounters on a separate localhost origin:

1. A dead merc shows the grey `DECEASED` stamp in the squad HUD and character record. A stabilized merc does not acquire that stamp.
2. A defeated Quick Fight returns to the main menu.
3. A defeated campaign returns with four fallen records, no surviving squad and the clock paused at Day 1, 08:00.
4. Hiring Nadia for a week charges $605 once, leaving $19,395. Reloading preserves the balance, replacement group, contract and fallen records; entering the peaceful sector renders the replacement as its sole active squad member.

No game-page warning/error console entries were observed in these checks. The disposable fixture initially failed saved-population validation because it omitted encounter synchronization; correcting the fixture resolved that setup error. The transient notice timing and failed-save retry were verified by automated tests, not independently captured as fresh browser demonstrations in this review.

The temporary browser tab and diagnostic server are closed after review. Their source, final fixture snapshot and exact process identity remain in local review artifacts for deliberate reproduction.
