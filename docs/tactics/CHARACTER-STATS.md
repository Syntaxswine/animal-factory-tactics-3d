# Character stat system: first pass

The 3D battle and editor playtest enable `statSystem: true`. The pinned sprite core remains opt-in for other callers. Source changes live in `tools/core-clock-adapter.mjs`; regenerate core with `node tools/sync-tactics-core.mjs`.

All 13 values are integers from 1 to 100: Strength, Endurance, Dexterity, Agility, Intelligence, Perception, Mechanical, Medical, Firearms, Heavy Weapons, Explosives, Leadership and Sneak.

## Derived values

- Maximum HP: 50 + Strength (51-150).
- Maximum stamina: 50 + Endurance (51-150).
- AP per round: 4 + round(14 * (Agility - 1) / 99), yielding 4-18 AP.
- Flat damage resistance: ceil(Endurance / 10), yielding 1-10 damage removed per impact, floored at zero damage.
- Base ranged accuracy: 75% relevant weapon skill + 25% Dexterity. Existing weapon, range, cover, aim and chance-cap rules still apply.
- Melee uses Dexterity, with existing melee modifiers.
- Intelligence adds floor(Intelligence / 10) to Medical and Mechanical checks, capped at 100. Medical currently feeds stabilization costs.
- Sneak and Perception feed existing awareness through compatibility fields.

Pistols, rifles, assault rifles, SMGs, shotguns and sniper rifles use Firearms. HMGs, RPGs, grenade launchers and flamethrowers use Heavy Weapons. Thrown grenades use Explosives. Shotgun resistance applies per pellet; explosive resistance applies once per affected unit after blast falloff. Fuel-tank instant kills and ongoing burning/bleeding retain existing special rules.

## Profiles and integration

`dist/tactics/character-stats.js` contains editable initial profiles for Yakov, Anya, Misha and Vera, plus a lower guard baseline. These are starting balance values, independent of species. Map starts/guards can provide a partial `stats` object; custom cast stats also work, with map values taking precedence. Legacy authored perception is accepted if no canonical Perception is supplied. New spawned units inherit the enabled system.

The character screen displays all 13 assigned values, HP, stamina capacity, AP and resistance. Training spends one existing skill point per stat level and preserves injuries and spent resources. Legacy training names map to the corresponding canonical stat. No new training UI is included.

`migrateStats` is available for a future save/load integration; it preserves current HP/AP and initializes missing stats. This does not introduce a save format or automatically migrate existing campaign saves.

## Still to build

Stamina expenditure and recovery; forcing doors and lockpicking; repairs and expanded medical actions; mine disarming; leadership, militia training and morale bonuses. Mechanical and Leadership are assigned and displayed but do not yet have those action systems. Campaign integration and balance tuning remain separate work.

## Verification

Focused regression coverage checks bounds, resource endpoints, weapon skill selection, Intelligence bonuses, perception preservation, custom cast/map overrides, spawning, actual bullet damage, low-AP restrictions, training and migration. Browser review covers populated character records, portrait loading, roster switching, pause restoration and narrow-screen layout.
