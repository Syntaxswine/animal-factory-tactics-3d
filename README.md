# Animal Factory Tactics 3D

Independent 3D experiment for Animal Factory Tactics: painted animal characters and isometric industrial environments.

The first playable encounter is at `tactics/battle-3d.html`: modeled characters and scenery with the pinned current sprite core, movement, shooting, reloads and guard turns. Easy reveals scenery while people still require line of sight. See [encounter scope](docs/tactics/PLAYABLE-3D.md) and [missing visual elements](docs/tactics/MISSING-3D-VISUALS.md).

The [environment workshop](https://syntaxswine.github.io/animal-factory-tactics-3d/tactics/environment-gallery.html) now includes 76 inspectable scenery, terrain and access entries plus courtyard and clinic scenes. The modeled scenery is also used by the older hybrid game/editor. See [environment validation and limits](docs/tactics/ENVIRONMENT-MODELS.md).

[Open the experimental site](https://syntaxswine.github.io/animal-factory-tactics-3d/) · [Main game source](https://github.com/Syntaxswine/animal-factory/tree/tactics-prototype)

The encounter now animates walking, tile-to-tile travel, turning and rifle firing, including aim, recoil, muzzle flash and the resolved shot path. Select Anya to try the rifle. Other weapon animations, stances and the wider interface are still being connected. The site also retains an older hybrid prototype with sprite characters and experimental collision rules; that prototype does not establish gameplay parity.

The [3D map editor](docs/tactics/THREED-EDITOR-EDITING.md) at `tactics/editor-3d.html` now supports brush previews, terrain/room/object/start tools, selection, rotation, deletion, undo/redo, named browser saves, JSON exchange and playtesting the edited snapshot. Five camera views and three floors remain available. Reusable blocks can be edited, captured, saved and placed across all three floors. Connection rules, row/column feature planning, and seeded or connected-block generation are available. Saved Red Hats outfits now render in the editor and battle.

The site opens on the game title screen (`dist/tactics-3d.html` locally). Quick Fight launches the full authored factory; Map Editor opens the 3D editing workspace. Options remember Easy/Standard difficulty and device/reduced/full motion for subsequent fights in the separate `animal-factory-tactics-3d:options:v1` storage key. Campaign and Save / Load are explicitly marked coming soon; no game-save or story-mode integration is implied. Existing studies remain under Models & art galleries (`tactics-3d-gallery.html`). `tools/title-3d-review.mjs` checks navigation, saved options applied to combat, storage failure handling and mobile layout; use `REVIEW_URL` for packaged or published title pages.

The main sprite game continues separately. The target is one authoritative game core with an optional 3D presentation. See [project scope and shared-core contract](docs/tactics/THREED-PROJECT.md) for the current boundary and next steps.

## Development

Requires Node.js 24. No dependency installation is needed for the build or Node checks; Three.js is vendored.

- npm run serve — open /tactics-3d.html on the printed local address.
- npm run check — repository tests and asset validation.
- npm run build:tactics-3d — create the Pages distribution.

Pushes to main run checks and publish the independent GitHub Pages site. Browser review scripts additionally require Playwright and Edge.

The [shared game clock](docs/tactics/GAME-CLOCK.md) advances one minute per completed combat round, pauses while choosing actions, and runs at one game minute per three real seconds during exploration. The editor can set a map start time; the encounter shows day/dusk/night and supports pause/resume. Lighting and night detection are the next layer.
