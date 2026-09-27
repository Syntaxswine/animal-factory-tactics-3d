# Roof mantle equipment inspection

Open `tactics/roof-mantle-study.html` and select **Animal**, **Outfit**, and **Weapon**. The URL records the selection. Use Side and From below at Close scale for attachments; use Full climb or Gameplay for timing. The phase buttons and timeline support forward/reverse inspection.

This extends the approved 6.25-second roof mantle to the complete existing equipment catalog. All eleven mammal rigs can use the twelve weapon models or empty hands. Original and Red Hat outfits are included. The hen and donkey guide remain unarmed; the selector disables unsupported equipment for them.

| Equipment | During the climb | Inspection focus |
| --- | --- | --- |
| Empty hands | Empty | No invented weapon contact or visible sling |
| NR-40 knife | Sheath | One-handed transfer and blade clearance |
| TT-33 pistol | Holster | One-handed transfer and hip clearance |
| Fragmentation grenade | Pouch | One-handed transfer; ring and lever remain intact |
| Mosin-Nagant rifle | Sling | Existing approved placement and animation retained |
| AK-47 | Sling | Curved magazine and receiver clearance |
| PPSh SMG | Sling | Drum clearance through the forward lean |
| Pump-action shotgun | Sling | Full barrel and stock clearance |
| Sniper rifle | Sling | Scope and long barrel clearance |
| Heavy machine gun | Sling, turned sideways | Upper-handle glove, receiver, belt and deployed bipod |
| Grenade launcher | Sling | Cylinder and foregrip clearance |
| RPG | Sling | Full warhead, rear venturi and shorter pig reach |
| Flamethrower | Back-mounted lance and tanks | Actual tank, hose, straps and lance surfaces |

## Corrections made during inspection

- Transition hands follow each weapon's authored hand count and palm offsets. The HMG retains its overhand handle glove and opens into the ledge glove during stowing. Small arms do not invent a second-hand support anchor.
- Knife, pistol and grenade holders follow the pelvis independently of chest lean. Their rigid hip-relative attachment is tested through the lean, flat pause and gather; they do not receive the rifle’s prone tuck.
- The rifle's broad shoulder transfer was too wide for small weapons and some skunk/pig loadouts. Other equipment now follows a closer transfer arc; fixed limb lengths and exact reach remain enforced.
- The RPG begins 0.32 units farther from the wall, with feet fixed at that starting mark through stowing and crouching. Its jump closes that distance. Both pigs draw the original shoulder carry inward; this temporary pose adjustment restores the original weapon configuration immediately afterward.
- The HMG turns a quarter revolution about its long axis so its deployed bipod and ammunition face outward. Its receiver sits closer to the back. It does not receive the rifle's additional prone tuck, and its transition sweeps away from the wall to clear the bipod.
- Weapon geometry, dimensions, anchors and canonical carry definitions are preserved. The existing ladder/cliff controllers are unchanged.

## Evidence and review

The 144-test equipment suite covers all 143 mammal/equipment combinations plus catalog coverage, using actual indexed weapon surfaces, tanks, hoses, holders and slings. It checks roof/floor clearance, authored palm contact, fixed bones, phase continuity, reverse playback and exact ownership restoration. Ten applicable HMG body cross-sections also guard against receiver burial; the skunk’s lateral placement receives visual review because its tail makes a rear section inappropriate. The existing 70 animal/hen/horse/cliff tests remain regression coverage.

The browser matrix passed **289 animal/outfit/equipment combinations and 11,560 rendered samples**, covering original and Red Hat clothing for every supported loadout, plus the unarmed hen and guide. After the final HMG correction, a focused 25-combination/1,000-sample rerun also passed. After the belt attachment correction, a further 69-combination/2,760-sample small-arm rerun passed. No browser run reported errors. Each combination is rendered at close side/rear, full-climb and gameplay scales. Every equipment mode also receives normal-time horse playback. The independent hostile review additionally inspects attachment appearance and grip correctness; geometry proximity alone is not a visual approval.

**9/10 hostile review passed** for the bounded all-equipment mantle study. All **214 focused/regression tests pass** (144 equipment plus 70 existing motion tests), and the Pages build/module-closure check passes. Independent visual inspection covers every weapon type on the horse, with stressed pig/skunk, original/Red Hat, grip, side/rear and belt-attachment checks.

Reproduce with:

```text
node --test tests/roof-mantle-weapons.test.mjs
node tools/roof-mantle-weapons-review.mjs
node tools/build-tactics-3d.mjs
```

The browser tool uses `REVIEW_URL` (default port 4439) and `PLAYWRIGHT_PATH`. Optional `ANIMALS` and `WEAPONS` comma-separated filters support focused reruns. Reports are local under `artifacts/roof-mantle-weapons/`.

This is equipment presentation approval for the authored mantle study. It does not establish traversal rules, gameplay integration, handling during approach/descent, or a new approval of the underlying weapon artwork. The previously documented hen apron strain limitation remains unchanged.
