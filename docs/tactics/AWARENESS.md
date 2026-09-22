# 3D visual awareness

3D encounters opt into exposure-based awareness with `createGame(..., {awareness:true})`. The older sprite prototype retains its existing detection rules. The pinned engine adapter is reproducible; never hand-edit core files.

## Visibility, suspicion, identification

Existing species cones, binocular/peripheral acuity, stealth range, 3D body-region visibility and woodland depth determine whether evidence can reach an observer. Each observer holds a separate 0–100 awareness score for each opponent. At 25 they glimpse something and can investigate; at 100, inside the identification lobe, they identify a target. Peripheral evidence caps at 99 until the observer faces it. An exposed body within 1.5 tiles is immediately recognizable. Awareness queries and UI refreshes never add time.

Evidence rates combine distance, visible head/torso/legs (25/50/25 percent), illumination on those regions, movement, running, stance, sneaking, stealth skill, perception, foliage depth and observer alertness. Perception defaults to 50; map starts and guards may specify a 0–100 `perception` rating. The underlying calculation also accepts `skills.perception` investments (+3 each), but a perception training UI is not implemented. This first balance pass uses named thresholds and a pure rate function in `awareness.js` for tuning.

Exploration samples every five game seconds (a quarter real second at current pacing). Combat uses action snapshots: AP spent by the observer or target provides its fraction of a sixty-second round as evidence, capped at sixty per observer-target pair in a round. Free facing changes, repeated queries and AP refills add no exposure. The next round settles any remaining exposure. Entering combat does not grant another minute. This is a detection timing approximation within the existing one-minute-round model; it does not advance the world clock or grant more AP. Pausing and thinking give no extra awareness.

## Illumination and contrast

Sunlight uses the shared daylight direction and strength. Rays from each exposed body region toward the sun use the same solid geometry as sight and projectiles, ignoring character bodies. Daylight reaches 100%; sun-blocked daytime ambient is 25%; night ambient is 12%. These gameplay values are separate from display exposure. The geometry uses existing tactical wall/prop/floor approximations, so decorative mesh shadows are not guaranteed to match detection pixel for pixel. A brighter sample two tiles behind a darker target provides a limited silhouette bonus. This is a first approximation, not a full image-contrast model.

Artificial lamps and their five-tile brightness bands remain separate work. No invisible lamp sources are introduced by this system.

## Memory, sound and feedback

An identified target's last-known position updates only with fresh visual identification. Losing LOS immediately prevents targeting; awareness decays by two points per game second while the stored position remains fixed. Existing noise, investigation, guard alert/search/stand-down behavior and social shouts continue to operate. Hearing and reports provide an investigation destination, not visual identification through walls.

The 3D scene renders only identified enemy models. Amber question marks show approximate glimpses on a six-tile grid; muted question marks show remembered positions. They are not targetable and do not disclose identities. The selected merc's light exposure and perception appear in the sidebar; hidden observers' awareness scores are not exposed there.

## Validation

`tests/awareness.test.mjs` covers factors, roof occlusion, day/night differences, deterministic frame chunks, pause, free queries, stale memory, blocked sight, and bounded combat exposure. `tools/awareness-review.mjs` checks a real playtest. Existing core tests remain applicable to the unchanged default rules.
