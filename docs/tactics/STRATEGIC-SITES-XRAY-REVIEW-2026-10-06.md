# Strategic sites and floor cutaway review

Approved `d988684` (strategic site artwork) and `19bed69` (selected-floor X-ray) for integration with canonical `a3250f5` on October 6, 2026. These commits were reviewed independently of their campaign ancestry. The campaign remains held for the arrival-state problem described in [the campaign integration review](INTEGRATION-REVIEW-2026-10-06.md).

## Strategic sites

The radio tower, radar tower and SAM site fit the painted character style. Intact and destroyed forms remain recognizable, and the radar mount and SAM supports read coherently from alternate angles. Approved as static presentation assets and a comparison viewer.

All six forms were inspected in the browser. Additional checks covered the radar rear mount, the SAM at 58 CSS pixels per tile from the side, the destroyed radar from above, and the tile grid. No site-viewer console errors or warnings occurred. Geometry tests cover the 8 by 8 footprint, rotated debris, ground contact, shared resource ownership and disposal.

The full release audit initially rejected the new atlas as an unattached environment sprite. The integration adds explicit validation of the runtime atlas, the three manifest reference images, and their PNG dimensions and color type. The audit now passes, and a negative probe confirmed that an additional unreferenced PNG still fails. The gameplay catalog is unchanged.

Editor placement, collision and cover geometry, destructible state, persistence and strategic effects still need integration. Intact and destroyed forms are not a destruction animation. Those limits are already stated in the viewer and [builder handoff](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/d9886843fa97e1a893537ca68a1f3a9732b83c3f/docs/tactics/STRATEGIC-SITES-HANDOFF.md).

## Selected floor cutaways

Independent UI checks used a validated three-story fixture with an explored ground floor, undiscovered upper rooms and separate stacked platforms. Real floor buttons and pointer interactions confirmed that:

- Ground-floor cutaways expose the squad through overhead walls, slabs and masks.
- Undiscovered rooms on the selected upper floor remain black, including a concealed barrel.
- Lower walls remain solid, and roof panels above the selected floor cut away.
- An overhead platform cuts away when selecting below it, but remains solid when its own floor is selected.

No runtime or shader errors occurred with the validated fixture.

## Release validation

All 1,843 tests passed on the combined implementation. The subsequent asset-audit registration correction passed the asset check and its negative probe. The Pages build, transitive module validation, generated-core check and Git whitespace check passed. The build conflict was resolved by retaining the current weapon HUD files, adding the strategic-site viewer and manifest, and keeping campaign modules out of this release.

The original campaign changes and fatal-burn changes were not included by merging branch ancestry. Builders can continue that work separately and use the existing campaign review for the outstanding release requirements. Temporary review browser tabs and the preview server were closed; the preview port was confirmed released.
