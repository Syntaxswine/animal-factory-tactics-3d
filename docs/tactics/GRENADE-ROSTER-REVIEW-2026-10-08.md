# Grenade roster review — October 8, 2026

Approve `f8eb82a` (`work/grenade-throw`) as an expansion of the animation study. It adds twelve animals with original and Red Hat outfits, plus the donkey guide: 25 selections. Keep the hen's feather-cup grip and the skunk's raised backswing. These are useful adaptations to their anatomy. The pig director's clothing still has some close-up compression, which is polish at this stage.

This does **not** wire these throws into battle. Repository consumers of `createGrenadeThrow`, `createHenGrenadeThrow` and `createGrenadeActor` remain the study and its adapters. The motion resets the actor into local space, aims at a fixed five-tile target on flat ground, and does not consume inventory or AP or cause damage/detonation. Gameplay integration still needs world position/facing, actual targets and terrain/obstructions, weapon stow/restore, interruption handling, and one authoritative release event. Use the timing export rather than hard-coding 1.92 seconds.

## Independent validation

All 59 focused tests passed on `f8eb82a`:

```sh
node --test tests/grenade-roster.test.mjs tests/grenade-throw.test.mjs tests/animal-motion-paint-lifecycle.test.mjs tests/tactics-3d-deployment.test.mjs tests/tactics-pages-files.test.mjs
```

The asset audit, packaged 3D build, and Git whitespace check also passed. The module-list fix that protects Pages from missing imports remains intact. The checks cover native limb lengths, posed sole contact, release continuity, independent approximate balance, grenade/character clearance, hen feather contact, skunk forearm/tail clearance, deterministic seeking, restored skin weights, painting failure cleanup, and deployment closure.

Browser inspection used the packaged output, including hen, pig director, skunk Red Hat and donkey guide keyframes; hen Red Hat release at gameplay scale; pig foreman Red Hat quarter-speed playback and recovery; and changing actors/outfits while an earlier selection was loading. No browser warnings or errors occurred. These checks do not independently repeat the builder's exhaustive texture-memory audit or establish general physical correctness beyond the study's assumptions.

## Separate horse correction: integration hold

`9605c30` (`anim/grenade-throw-corrections`) is a sibling of the roster commit, not its continuation. Its 21 horse tests and four deployment tests passed independently. It improves the horse's hand placement, follow-through, neck limit, toe pivot, time validation, and angular continuity. It changes release from 1.92 to 1.94 seconds and substantially changes the pose curves.

Do not combine the branches by simply resolving their text conflicts. A local reconciliation probe preserved the corrected horse curves/timing/guards and toe-pivot hold, retained the roster bone mappings, anatomy offsets, native soles and mass models, and used the roster's 2.5 ms/six-pass balance solver. Of 61 animation tests, 51 passed and 10 failed:

| Area | Reproduction/result |
| --- | --- |
| Pig foreman | `motion.at(0)` throws: right-arm target 0.5139 m away, arm length 0.5049 m. Three roster tests fail. |
| Pig director | `motion.at(0)` throws: right-arm target 0.5486 m away, arm length 0.5049 m. Three roster tests fail. |
| Skunk | Reconstructed required pressure is 0.02138 m outside the supporting soles at approximately 3.84 s; the roster allowance is 0.016 m. |
| Rabbit | Same recovery check reaches 0.01988 m outside at approximately 3.84 s. |
| Hen | Reconstructed ground normal becomes nonpositive, failing the support check. |
| Horse fixture | Expected failure: the old `fc1573e` pose fixture differs from the intentionally revised horse. This is distinct from the nine anatomy/support failures above. |

These are results of the **combined probe**, not failures of either submitted branch in isolation. The probe was aborted; its motion changes are not part of the approved roster release. The local diagnostic code and full output were retained in `artifacts/oct08-grenade-roster/` in the review checkout.

Rebase the horse corrections onto the roster, refit preparation and recovery for the affected animals, preserve the hen's visible feather contact and the skunk's tail clearance, then rerun both animation suites plus deployment checks. Update the horse fixture only after reviewing the new baseline; keep the anatomical and support checks meaningful. Recheck the 25 painted selections and gameplay-size motion before asking for combined approval. Regenerate screenshots/reports for the final implementation so evidence from the two separate baselines is not mistaken for validation of the merged result.
