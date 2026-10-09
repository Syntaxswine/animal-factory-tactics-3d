# Independent workspace

This editor work now runs from AnimalFactory3D/game, an independent repository on work/editor-3d. The upstream is the 3D repository https://github.com/Syntaxswine/animal-factory-tactics-3d.git, not the original 2D repository. This branch is not canonical main.

Run npm run serve:workspace for the local preview on port 4363. The editor is /tactics/editor-3d.html?editing=1, the library is /tactics/sector-library.html, and Quick Fight is /tactics/battle-3d.html. Run npm run build:tactics-3d to produce the deployment build with missing-module checks.

The authoritative map collection is now ../sectors/<role>/<configuration>/<variant>.json. The workspace server and npm run build:tactics-3d export it to dist/tactics/sector-library without changing existing URLs. npm run export:sectors performs the same export independently. Runtime edits that differ from the recorded export are rejected for manual reconciliation. Keep the .export-state.json file with the authoring collection. Git tracks the runtime export as its portable backup; commit and push those generated map changes after authoring. Clones without the sibling authoring collection can build the committed export.

In the editor, use Sector presets to browse all configurations and their saved maps. Open a configuration at 0 degrees and edit it; the main Save button defaults to creating a new variant in that configuration's folder and suggests an unused filename. Save creates a map, SVG preview and progress metadata; it never overwrites an existing variant. Ready for review checks normal map validation but does not certify campaign interchangeability. Published static pages can save through a selected portable map folder or download variant JSON with the intended destination shown. Existing browser saves remain available in Settings; ordinary maps without a sector configuration keep their existing Save behavior.

The original editor directory and its preview remain available for rollback. Avoid continuing edits in both workspaces. Other study snapshots have not been cut over. No canonical branch or GitHub Pages deployment was changed by this migration. Browser saves are origin-specific: saves on the old port do not automatically appear on 4363. Export maps or saves from the old preview before importing them in this one.

## Portable map folders

Use Choose map library folder on the library page or in the editor save dialog. Select the root containing animal-factory-map-library.json, not a role or configuration subfolder. The root name is normally AnimalFactoryMaps, but location and name are arbitrary; the identity file and version define the library. The existing sibling sectors collection has this marker too.

Create library in empty folder copies the bundled configurations, existing variants, and previews into role/configuration folders and writes the identity marker after completion. This refuses nonempty folders. Copy the entire library when moving between computers, then select it again on the destination. A remembered browser handle is only a convenience for that browser/origin; it does not travel with the project.

Direct reads and writes use the user-selected directory, including when running the published HTTPS editor, without a development server or a hardcoded drive path. Current browsers such as Chrome and Edge provide the writable directory picker. Unsupported browsers retain JSON export or can run the local workspace server. AFT_MAP_LIBRARY sets that server and build export source to any chosen folder. Permission denial/revocation requires choosing the folder again.

Saved variants are published in the folder catalog only after their JSON and SVG finish writing. Interrupted writes may leave unregistered files for recovery; existing names are not reused. Avoid editing the same configuration simultaneously from different browsers or machines. These are local folders, not a cloud sync service.
