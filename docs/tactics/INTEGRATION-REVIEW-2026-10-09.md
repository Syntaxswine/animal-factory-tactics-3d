# Builder integration review — 9 October 2026

Approved for canonical after the integration fixes below. Reviewed against `b546dfb` on the 3D repository; no new 2D commits were found in this review.

## Scope

| Source | Reviewed head | Result |
| --- | --- | --- |
| `work/editor-3d` | `b4718d7` | Include visible-fire route warnings, habitat-aware foliage brushes, independent density/passability and upper-level foliage. |
| `work/painted-chairs` | `5bd0e47` | Include the four-chair collection and the horse's unarmed sit/stand study. Cherry-pick the seven new chair commits after `bba7416`; do not replay the branch's previously integrated blast and weapon history. |
| PR #6, `anim/skinning-corrections` | `ffda21f` | Include shared neck/clothing/hair weights, with the legacy motion adapter correction described below. |
| PR #5, `anim/idle-v5-handoff-notes` | `8f2799f` | Include the author's clarifications and correct the earlier handoff text. |
| Draft PR #4, `anim/idle-look-around` | `b8f6a53` | Keep the v5 code separate. Its report is useful evidence, not release approval. |

## Integration fixes

1. **Motion adapters discarded the new clothing fit.** `createMammalMotion` and `createDogMotion` rebuilt torso weights without retaining the model's fitted head influence. The horse's 203 head-weighted garment vertices fell to zero when its motion adapter was installed; the dog and sheep reproduced the same loss. The horse chair study also uses this adapter. Preserve the fitted head share while repartitioning the remaining weight, leaving vertices with no head influence unchanged. Regression tests failed before this fix and pass afterward across all eleven mammals, seated playback and exact disposal/restoration.
2. **The chair atlas failed release validation.** Register the actual shared chair atlas with its expected PNG dimensions and format in `check-assets.mjs`. The original unattached-asset error is resolved without removing the orphan-asset check.
3. **The base Pages build omitted linked chair studies.** Include both viewers and their module dependencies, including the new clothing-weight helper, in the literal build file list. Preserve the guardhouse study entries when resolving the build-script merge conflict, and retain transitive/worker missing-module checks.
4. **The core-manifest test omitted the new foliage adapter.** Add `woodland.js` to the expected override list; retain the pinned revision and every file checksum. Core synchronization verifies all twenty modules.

## Verification

- The broad `npm run check` run completed **2,196 tests: 2,194 passed and two failed** (the stale manifest expectation and base Pages file list above). Both failed tests pass after their fixes. This is not a claim that the original broad run was green.
- The affected adapter, prone, dog, horse-chair, chair, paint-lifecycle, Pages-list and actual deployment-build suites pass **68/68** on the final code, including the two new regressions. The complete battle-3D file passes **3/3**. The additional idle/motion disposal lifecycle test passes **1/1**.
- Asset validation and `sync-tactics-core.mjs --check` pass. The packaged 3D module graph and its missing-import regression pass.
- Fresh browser review of the packaged output: Quick Fight renders its battlefield and squad, and Pause works; the editor renders, exposes the new independent foliage controls, paints a disposable passable patch and removes it with Undo; the horse chair viewer renders seated wingback and wooden-chair poses plus side lowering/rising poses. No warning/error console entries were observed on these pages. Browser access initially timed out but recovered after the long test run.
- Reviewed the builder's supplied neck-turn comparison and foliage/plateau captures separately. Those are author-supplied evidence, not new renders from this review. The chair videos and the builder's larger configuration matrix were not independently replayed in full.

## Remaining work

- Chairs are approved assets and an unarmed horse study. Editor placement, occupied/approach cells, other species, tails, outfits and weapons still need their own integration and fit checks.
- Shared neck fitting improves the collar and mane attachments without changing approved silhouettes. Paint seams and the sheep/director overhangs remain separate asset polish. This does not certify every existing combat pose as free of clipping.
- Draft idle v5 remains held: the reported 6 mm parameter determines a neighborhood/depth allowance, **not a 6 mm travel cap** (measured travel reaches roughly 15–18 mm). Pose-dependent fit keys can cause reported 22–37 second main-thread refits, and motion/layer-direction coverage is incomplete. See [the corrected handoff](IDLE-SKINNING-V5-HANDOFF.md).
- Model construction is more expensive with the shared fit: a small five-sample horse benchmark under concurrent load measured a median of about 49 ms before and 89 ms after. This is one-time construction work, not a per-frame cost or an FPS benchmark; consider caching/precomputation when profiling large rosters.

The disposable local review server is stopped after review. Its source, exact process identity and restart record remain in the local review artifacts; no builder-owned service is retired by this review.
