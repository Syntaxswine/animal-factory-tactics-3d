# Independent workspace

This editor work now runs from AnimalFactory3D/game, an independent repository on work/editor-3d. The upstream is the 3D repository https://github.com/Syntaxswine/animal-factory-tactics-3d.git, not the original 2D repository. This branch is not canonical main.

Run npm run serve:workspace for the local preview on port 4363. The editor is /tactics/editor-3d.html?editing=1, the library is /tactics/sector-library.html, and Quick Fight is /tactics/battle-3d.html. Run npm run build:tactics-3d to produce the deployment build with missing-module checks.

The authoritative map collection is now ../sectors/<role>/<configuration>/<variant>.json. The workspace server and npm run build:tactics-3d export it to dist/tactics/sector-library without changing existing URLs. npm run export:sectors performs the same export independently. Runtime edits that differ from the recorded export are rejected for manual reconciliation. Keep the .export-state.json file with the authoring collection. Git tracks the runtime export as its portable backup; commit and push those generated map changes after authoring. Clones without the sibling authoring collection can build the committed export.

In the editor, open a library configuration at 0 degrees, then choose Save as new sector variant. Use a unique lowercase filename. Save creates a map, SVG preview and progress metadata; it never overwrites an existing variant. Ready for review checks normal map validation but does not certify campaign interchangeability. Published static pages retain JSON export; direct disk saving requires the local workspace server. Existing browser saves remain available through the ordinary Save controls.

The original editor directory and its preview remain available for rollback. Avoid continuing edits in both workspaces. Other study snapshots have not been cut over. No canonical branch or GitHub Pages deployment was changed by this migration. Browser saves are origin-specific: saves on the old port do not automatically appear on 4363. Export maps or saves from the old preview before importing them in this one.
