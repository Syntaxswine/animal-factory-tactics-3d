# Spotlight guard tower

Variant: wooden-spotlight-tower in painted-furniture.html. Reuses the three-story timber tower with 3×3 supports, 5×5 platform and side ladder. The original tower remains available.

A bolted pedestal on the front-left deck supports a rust-red searchlight in a swivel yoke, with pivot hubs, a silver recessed reflector, pale bulb, protective bars, carry handle, cable and control box. The fixture sits clear of the ladder aperture; its forward aim clears the railing with a slight downward tilt. Honey, cream and sage timber finishes remain available through the model library.

The emitter-0 anchor is parented to spotlight-head, marked future-light and disabled, with spot distribution and a PI/8 cone angle. It points along local +Z; the head's .22-radian X rotation tilts it downward. No Light or emissive material is added. Day/night lighting, beam effects, aiming interaction and gameplay placement are deferred.

Hostile review: 9/10 after changing the inner dish from chipped enamel to clean silver and improving bulb visibility. Furniture tests include footprint/resource invariants, passive world-space aim, ladder clearance and unobstructed outgoing beam direction. tools/spotlight-review.mjs checks two views, browser errors and mobile overflow. Full project suite: 594 passing tests.

## Iron stair guardhouse variant

The iron-searchlight-stair-tower variant uses the pictured 6×5 rusty iron switchback tower. A bolted wall plate and two braced arms hold a compact searchlight below the front window, centered on the guardhouse. The shortened pedestal shares the original lamp geometry/materials. Its .35-radian downward aim clears the wall, frame and staircase; the existing 54 treads remain intact. Both original towers remain available. Active lighting is still deferred.
