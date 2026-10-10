# Painted-chair refinement hostile review

## Solid upholstered sides and outward-rolled armrests

The follow-up to `3836984` replaces the separated wing and arm supports with continuous upholstered sides, and adds eight-sided cylindrical armrests following the user's classic-chair reference. The cylinders are flush with the inner panel faces and roll outward over the side, as clarified by the user. The wingback is 480 triangles; the other three chair models are unchanged.

Independent read-only reviewer `strategic_sites_hostile`: **9/10, approved, no blockers**. Fresh final top, grey and seated-fit renders were checked against exact geometry. Inner roll edges measure X ±0.4399999993, matching panel inner faces ±0.4400000007. Outer edges reach ±0.5400000007, giving 0.04 padding overhang per side and an unchanged 0.88 inner opening. The rolls stay supported by the shell and join the back. Their top is still Y 0.72; seat, pelvis, back, foot and approach anchors are unchanged. The base occupies 1×1 tile; full visible padding width is 1.08 and is declared separately in metadata.

The continuous sides passed 5,642 independent side-directed ray checks across the lower panels, old gap and wings with zero misses. All six chair tests passed independently. Builder verification covered ten final rendered views, including both skins, grey forms, top/side/rear/front/three-quarter, gameplay scale and shared fitting mannequin. No browser errors occurred. Owned render browsers closed with exit code 0 and exact process identities were verified absent; the reviewer launched no helper. Preview 4476 keeps its original deadline.

Evidence: `side-shell-three.png`, `side-shell-side.png`, `side-shell-grey.png`, `side-shell-top.png`, `side-shell-fit.png` and `side-shell-check.json`. Native seated character fitting and gameplay integration remain future work.

## Cushion-gap follow-up

The follow-up to `2125cc1` enlarges the wingback's outer seat padding to X ±0.48, Z −0.46…0.30 and Y 0.36…0.48, and tucks the back cushion's lower bevels into it. The common usable sitting area, seat height and every anchor are unchanged. Other chair geometry is untouched; the wingback remains 448 triangles.

Independent read-only reviewer `strategic_sites_hostile`: **9/10, approved, no blockers**. Final front, three-quarter, side, rear, top, grey, alternate-finish and gameplay renders show the joint closed with proportionate padding beneath the arms. The reviewer cast 2,937 front rays over X −0.44…0.44 and Y 0.375…0.695 against the actual seat/back triangles, finding zero holes. All six chair tests pass independently, including torso, rise and heel clearance. No reviewer helper was launched.

Builder verification: six chair tests, nine fresh rendered views and no browser errors. Both short-lived render browsers closed with exit code 0 and their exact process identities were verified absent. Preview 4476 retains its original deadline. Evidence: `cushion-front.png`, `cushion-three.png`, `cushion-check.json`.

## Height and closed-back revision (`2125cc1`)

October 9, 2026. Independent read-only reviewer: `strategic_sites_hostile`. **9/10 — approved for assets and the shared furniture-contact/fit-study scope. No blocking findings.**

The refinement closes the wingback's back into the seat, replaces its plain legs with faceted cabriole front legs and shaped rear legs, and lowers the other chair backs to the horse's rolled cuffs. Paint continues to carry the surface detail. Triangle counts are 448 wingback, 180 wooden, 248 metal and 284 desk.

The reviewer inspected nine fresh views: the collection beside an unscaled horse, wingback front/side/rear, grey forms, shared fit guide, alternate finishes and 58 px/tile gameplay scale. Continuous upholstery reads clearly from front and rear. Decorative leg shapes remain connected and grounded. Complete chair heights measure 1.361483 for the wingback, 0.986590 for wood, 0.985898 for metal and 0.987944 for desk.

All four models retain the exact original seat, pelvis, back, foot and approach anchors. The seat measures 0.48 high and 0.84×0.62 across; floor bounds agree within floating-point error and full models fit inside 1×1 tile. All six permanent chair tests passed independently. No browser errors were observed.

The review browser closed with exit code 0 and its exact process identity was verified absent. The registered port 4476 preview was left running for user review with its original October 9, 2026, 22:30 UTC deadline.

Builder verification: **14 focused/build tests and 100 browser configurations passed**. The checker covers both finishes, all angles/scales, native references, deliberately delayed stale reference loading, mobile overflow, resource stability and repeated teardown. After warming the variants, the renderer remained at 46 geometries / 2 textures with no character selected.

Limits: the gold mannequin is a static furniture fit guide. Native animal references stand beside the chairs. Native seated surface contact, sit/stand movement, species-specific adapters, outfits/weapons and gameplay placement still need their own validation. The wingback now has no tail opening; eventual species tail handling must accommodate its solid back.

Evidence: `native-cuff-front.png`, `wingback-closed.png`, `collection.png`, `alternate-finishes.png`, `shared-seat-fit.png`, `gameplay.png`, `browser-check.json` and `independent-review.json`.
