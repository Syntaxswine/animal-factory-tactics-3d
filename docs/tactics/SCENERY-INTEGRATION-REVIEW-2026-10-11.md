# Helicopter and furnishing integration review

Reviewed `5b9bb71` from `work/editor-3d` together with its dependency `378fe48` (character context menus and patrol routes), against canonical `c787658`.

The integration supplies working editor and gameplay props. The smoking crash can set four existing squad starts beside its exit, preserving identities and equipment. This is a spawn setup command; no boarding or evacuation animation is implied.

## Verified behavior

- Fresh editor check selected the raised crash, set four starts, undid and redid the command, then launched the editor's Playtest. The crash and four mercs appeared on level 3, and a merc successfully walked away from the start area.
- Automated checks cover placement, rotation, undo/redo, export/import, reusable blocks, unsupported placement, physical clearance, and bullet/line-of-sight/grenade collision. Rotor overhang stays walkable where the physical model leaves sufficient clearance.
- The scene owner uses the same model in editor and game, handles terrain discovery and concealed interiors, honors reduced motion, and disposes removed instances and owned resources. Residual engine smoke is cosmetic.
- A separate campaign exercise added a rotated smoking crash, chair and console to an opening sector, left for the checkpoint, returned, and saved/reloaded the complete campaign. All three props and their transforms survived.
- The merged source passes all **46 focused tests** for scenery, patrols, the imported models and deployment. Generated shared-core and helicopter collision data are current; the asset audit passes.
- The full `npm run check` passes: **2,245 tests, zero failures**, followed by a successful asset audit.

The browser preview was the coder's existing server. Ten integration/controller/renderer/core files were compared with the merged checkout and matched after line-ending normalization. No game-script or missing-module errors were captured. The playtest popup emitted two Electron preload errors from `node:electron/js2c/sandbox_bundle`; the game rendered and accepted movement despite those host-level messages.

## Merge resolution

The two deployment file lists conflicted with earlier canonical asset releases. Their resolution adds the new integration modules while retaining the helicopter, furniture, console and RPG studies, existing deployment assets, and all missing-module checks. The chair documentation's earlier canonical review note is preserved. No gameplay-code conflict required manual resolution.

## Remaining tutorial work

The foliage-painted tutorial clearing could not be located by the coder. Neither its helicopter placement nor the finished tutorial opening is included in this branch. The original terrain-only tutorial variants and current two-sector campaign foundation remain unchanged.

Once that authored map is available, place the survivable crash, use **Set squad start beside crash**, and validate routes through its actual terrain. A cutscene or animated squad exit can be added separately. Chairs and consoles are placeable scenery with cover; sitting, computer use and telephone interactions remain unwired.

The temporary review tabs were closed. This review started no preview server and left the coder's existing preview on its original expiry.
