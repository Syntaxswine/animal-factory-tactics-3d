# Grenade throwing study review

Approved `c8af45f` as the horse throwing baseline and replacement grenade prop, with the build-list correction below. Reviewed against canonical `9c30612` on October 7, 2026.

## Motion and appearance

The rear-leg load, lateral weight transfer and planted forward step give the throw believable support. The forward hoof lands before release, and the character follows through without skating the planted feet. The grenade remains in the palm until release, then follows a readable arc, small bounce and settling slide. The painted casing fits the existing character and equipment style.

Independent browser inspection used the freshly packaged Pages output: six keyframes from side, three-quarter, front and rear views; quarter-speed playback; release, flight, bounce and settled landing through the visible timeline controls; and the close-up prop beside its reference drawing. No browser errors or warnings occurred.

Optional polish: lower or relax the free arm during the wind-up and soften the two-fists-up recovery. These currently read a little like a boxing guard. Keep the planted feet and weight transfer. Brighter wear on the lever could better match the reference at close range. These are not release blockers for the study.

## Release correction and checks

The initial review run passed 226 of 227 focused tests. The base Pages file-list test failed because the five grenade files were copied in a separate loop rather than registered in the existing `files` list. The files were present in the built output, but the release suite would fail.

The correction registers all five files in the base list and removes the duplicate copy loop from the 3D wrapper. Missing-module validation remains enabled. All four deployment tests then passed. The other 223 animation, weapon, horse mesh, stow/draw, fire-roster and roof-mantle equipment tests passed in the initial run. The asset audit and Git whitespace check also passed. The builder's separate browser automation report was read as supporting material; it was not rerun as part of this review.

Temporary review browser and server helpers were closed, with process exit and port release verified.

## Integration scope

This is a horse-only, local-space, flat-ground throwing study. It does not add combat throws or detonation. The current motion resets the worker transform and owns temporary hoof-weight changes; gameplay must adapt it to the actor's world placement and existing pose, then restore the normal pose/animation state.

Next integration work is fitting the other animals, target-facing and range handling, obstacle and terrain collisions, inventory/AP/event timing, and the existing grenade effect. Keep the continuous hand-to-projectile release and grounded foot contacts as acceptance requirements. The study's fixed five-tile target is not a new gameplay range specification.
