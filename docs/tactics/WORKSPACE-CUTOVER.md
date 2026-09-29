# Independent workspace

This editor work now runs from AnimalFactory3D/game, an independent repository on work/editor-3d. The upstream is the 3D repository https://github.com/Syntaxswine/animal-factory-tactics-3d.git, not the original 2D repository. This branch is not canonical main.

Run npm run serve:workspace for the local preview on port 4363. The editor is /tactics/editor-3d.html?editing=1, the library is /tactics/sector-library.html, and Quick Fight is /tactics/battle-3d.html. Run npm run build:tactics-3d to produce the deployment build with missing-module checks.

The active sector files remain under dist/tactics/sector-library. The sibling ../sectors collection is still an unsynchronized authoring staging copy. Do not edit both and expect changes to propagate; the export pipeline is a separate milestone.

The original editor directory and its preview remain available for rollback. Avoid continuing edits in both workspaces. Other study snapshots have not been cut over. No canonical branch or GitHub Pages deployment was changed by this migration. Browser saves are origin-specific: saves on the old port do not automatically appear on 4363. Export maps or saves from the old preview before importing them in this one.
