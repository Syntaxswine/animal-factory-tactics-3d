# Animal Factory Tactics 3D

Independent 3D experiment for Animal Factory Tactics: painted animal characters and isometric industrial environments.

The first playable encounter is at `tactics/battle-3d.html`: modeled characters and scenery with the pinned current sprite core, movement, shooting, reloads and guard turns. Easy reveals scenery while people still require line of sight. See [encounter scope](docs/tactics/PLAYABLE-3D.md) and [missing visual elements](docs/tactics/MISSING-3D-VISUALS.md).

The [environment workshop](https://syntaxswine.github.io/animal-factory-tactics-3d/tactics/environment-gallery.html) now includes 76 inspectable scenery, terrain and access entries plus courtyard and clinic scenes. The modeled scenery is also used by the older hybrid game/editor. See [environment validation and limits](docs/tactics/ENVIRONMENT-MODELS.md).

[Open the experimental site](https://syntaxswine.github.io/animal-factory-tactics-3d/) · [Main game source](https://github.com/Syntaxswine/animal-factory/tree/tactics-prototype)

The encounter currently uses carry poses and tile-step movement; gameplay animation and the wider interface are still being connected. The site also retains an older hybrid prototype with sprite characters and experimental collision rules; that prototype does not establish gameplay parity.

The main sprite game continues separately. The target is one authoritative game core with an optional 3D presentation. See [project scope and shared-core contract](docs/tactics/THREED-PROJECT.md) for the current boundary and next steps.

## Development

Requires Node.js 24. No dependency installation is needed for the build or Node checks; Three.js is vendored.

- npm run serve — open /tactics-3d.html on the printed local address.
- npm run check — repository tests and asset validation.
- npm run build:tactics-3d — create the Pages distribution.

Pushes to main run checks and publish the independent GitHub Pages site. Browser review scripts additionally require Playwright and Edge.
