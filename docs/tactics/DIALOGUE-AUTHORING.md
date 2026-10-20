# Dialogue authoring and integration

Implements the approved [19 October proposal](DIALOGUE-INFRASTRUCTURE-PROPOSAL-2026-10-19.md). The bomb conversation is invented rehearsal content, not an installed campaign quest. Permission to inspect a bomb does not disarm it. Trading, quest rewards, timed conversations and a visual node editor are outside this tranche.

## Try it

On the project's development server, open:

- `tactics/battle-3d.html?study=dialogue` — Nadia and a friendly Red Hat yard worker, surrounded by the four existing mercs.
- `tactics/editor-3d.html?editing=1&study=dialogue` — the same map, ready to edit, export or playtest.

Right-click Nadia. Yakov starts the conversation but cannot make the Explosives offer. Choose Anya in **Speaker** to see 20%; choose Misha to see 40% and **Creator · no roll**. The Creator response records reassurance once, raising Misha's offer to 50%. There is one attempt for the whole team. A saved failure remains a failure when you change speakers or reopen the sector. **Last response** preserves the actual wording, including natural 1/100 text. The nearby friendly Red Hat demonstrates a flat conversation with no checks.

Conversation pauses tactical and campaign time. It does not change the selected squad leader, facing, position, AP, stamina, equipment or allegiance. The speaker must be conscious and present, within two tiles, on the same support level, with a clear potential sightline to an identified character. Combat, fright, hostility and an unfinished action block talking. No approach order is issued automatically. Leave, X and Escape remain available, including when content is missing or a checkpoint fails.

## Author without changing engine code

For a conversation local to a map:

1. Select a character in the editor. Expand **Dialogue, shop & scripting**, check **Can talk**, and expand **Author dialogue JSON**.
2. Use **Load referenced dialogue** to inspect existing content, or import a JSON file. The text area also accepts pasted JSON.
3. Edit the definition, then click **Save / replace this dialogue**. A new ID creates a separate resource. Replacing an existing ID deliberately updates every character using it in this map. Both operations support Undo/Redo.
4. Set **Dialogue reference** to that ID and click **Apply character changes**. Appearance, faction and combat behavior remain independent.
5. Playtest. Browser save/export/import and modular blocks carry embedded definitions. Duplicate characters get new internal IDs and independent dialogue history. Renaming preserves identity.

For a shared shipped conversation, add `dist/tactics/dialogues/your_id.json` and an `{ "id": "your_id", "version": 1 }` entry to `dist/tactics/dialogues/manifest.json`. Rebuild. The editor reference picker discovers it and exports resolved content with the map. No engine file or per-conversation build entry is necessary. User maps may retain unresolved references while unfinished; diagnostics identify them. Shipped sector-library maps with unresolved enabled conversations fail packaging.

Existing game saves retain the exact pinned content and version. Editing a JSON file, changing its version, increasing a merc's skill or resting does not erase attempts. To test new content from the beginning, start a fresh rehearsal or deliberately load a save made before the attempt. Loading an older save is a legitimate rewind, not an ironman system.

## Smallest fixed conversation

```json
{
  "schemaVersion": 1,
  "id": "orchard_worker",
  "version": 1,
  "entry": [{ "node": "hello" }],
  "nodes": {
    "hello": { "npc": "The north road is clear. Watch the orchard gate." }
  }
}
```

Replace `npc` with an array of lines for seeded daily flavour. Opening or inspecting it does not consume a roll or update a visit counter. Its selection is fixed for the open panel and stable across same-day reopening and save/load.

For the complete ordinary/personality/checked example, use [yard_bomb_permission.json](../../dist/tactics/dialogues/yard_bomb_permission.json). A second minimal example is [yard_worker_flavour.json](../../dist/tactics/dialogues/yard_worker_flavour.json).

## Authoring contract

| Field | Meaning |
| --- | --- |
| `id`, `version` | Stable readable resource ID and positive integer content version. |
| `facts` | Optional object declaring boolean facts and their initial values. |
| `entry` | First matching attempt-result route, ending with one unconditional node. |
| `nodes[id].npc` | One line or 1–32 flavour lines, each at most 2,000 characters. |
| `choices[]` | At most 32 choices per node; IDs unique across this resource. |
| `text`, `to` | Ordinary reply and destination. No roll. |
| `requires.archetype` | One existing archetype, displayed with a readable coloured badge. No implied check. |
| `requires.fact` | `{ "id": "reassured", "is": false }`; ANDed with other requirements. |
| `set` | Assignments to declared boolean facts, applied once on selection. Never on node entry. |
| `check` | Explicit percentile check: `attemptId`, `skill`, optional `minimum`, `difficulty`, `modifiers`. |
| `outcomes` | Both `success` and `failure`, each with `to` and optional `set`. Replaces top-level `to`/`set`. |
| `rollText` | Optional `"1"` and `"100"` response overrides; same normal outcome effects. |

Modifiers have a unique `id`, a boolean `fact` condition and an integer `add` from −20 to +20. Applied modifiers sum and clamp to that range. There are no implicit difficulty-mode, species, Leadership, Intelligence, injury, fatigue or equipment bonuses. Only the chosen speaker's stored raw skill is used. Missing stats hide the checked choice and report the compatibility issue.

Supported skills are the current stat registry: Strength, Endurance, Dexterity, Agility, Intelligence, Perception, Mechanical, Medical, Firearms, Heavy weapons, Explosives, Leadership, Sneak and Climbing. JSON uses the exact keys in `character-stats.js`, including `heavyWeapons`. Archetype spelling/case follows the existing registry: Innocent, Sage, Explorer, Rebel, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator.

```text
chance = clamp(floor(50 + rawSkill - difficulty + modifier + 0.5), 1, 99)
visible = ready AND conditions AND rawSkill >= minimum AND chance >= 20
success = roll <= chance                 // roll 1..100, inclusive
```

Minimum defaults to 1; difficulty defaults to 50. Numeric inputs must be integers. Natural 1 succeeds and natural 100 fails within the displayed odds; neither adds another probability or another effect. An option at 20% succeeds on exactly 20 of the 100 rolls. Combined personality/check choices are supported explicitly; personality alone never rolls.

Resources are data only, with a 256 KiB and 256-node limit. Unknown fields, malformed numbers, duplicate IDs, invalid facts, missing destinations and arbitrary code are rejected. Unreachable nodes produce author warnings. Player-driven cycles are allowed; there is no automatic branch traversal loop.

## Plateau tutorial intro

`plateau_intro` is the authored tutorial briefing. Right-clicking its friendly guide uses the normal conversation UI. Opening, inspecting, switching speakers and choosing an informational reply never roll, spend AP, consume supplies or destroy anything.

In the editor, select an existing NPC/guard and use **Plateau tutorial → Use as intro guide**. This enables **Can talk** and embeds the dialogue without changing identity, appearance or faction. Keep the character friendly. Select each existing radio tower, SAM site and crash-sector crate, then assign its **Mission role** in the same panel. Use exactly one of each role across the campaign. The roles survive moving, rotating, map export/import, modular blocks and destruction; duplicate roles are rejected. Clear a copied object's role if it is decorative.

The guide derives three read-only variables from the actual game:

| Variable | Source |
| --- | --- |
| `has_explosives` | At least one conscious, present squad merc in this sector carries demolition explosives. Unsearched crates, dropped items, dead/away mercs and other sectors do not count. |
| `radio_destroyed` | The object tagged `plateau-radio` is a destroyed radio tower. |
| `sam_destroyed` | The object tagged `plateau-sam` is a destroyed SAM site. |

Campaign lookup uses each visited sector's saved objects and unvisited sectors' authored maps. Missing or ambiguous sites produce a closable setup diagnostic; absence never means destruction. A standalone playtest needs both sites in its one map. A completed objective takes precedence over the inventory question: both destroyed → liberate the town; radio only → deal with the SAM; SAM only → finish the radio tower; neither → the opening briefing. Every reopening reflects the current world. Leaving or saving does not lock in stale answers.

The tagged crate starts a **new encounter/sector** with two demolition charges. Search it and take them through the existing inventory system. The acting merc must carry a charge, stand beside the site's control equipment and right-click the site → **Plant explosives**. The action uses one charge, 3 stamina and 6 AP in combat, or one minute outside combat. These are implementation defaults using the existing sabotage cost. It commits the demolition immediately through the existing wreck conversion; this tranche does not add a timed fuse, blast radius or planting animation. Free legacy sabotage cannot bypass the charge requirement on these two objectives. Other explosions and flamethrowers still count. Empty crates and destroyed sites persist; loading never replenishes either.

These variables are declared in a resource with `"variables": ["has_explosives", "radio_destroyed", "sam_destroyed"]`. Entry routes can use `"when": {"variables": {"radio_destroyed": true}}`; choice requirements can use `"requires": {"variables": {"has_explosives": true}}`. Conditions are AND comparisons of declared booleans; routes use the first match, ending with an unconditional route. They cannot assign world variables or execute code. Ordinary choices stay ordinary. A checked/effectful choice that also uses variables stores its input snapshot in its existing receipt so save validation can replay the historical result. Live previews include world inputs and reject stale selections.

Try `battle-3d.html?study=tutorial-intro`, or `editor-3d.html?editing=1&study=tutorial-intro`. This compact rehearsal includes the guide, two sites and crate. It does not replace the authored plateau layout or the current two-sector foundation campaign; authors can attach these roles to the plateau's existing objects. Site destruction currently updates this briefing, not a new global SAM deployment rule.

`tests/tutorial-intro.test.mjs` covers all eight progress/inventory combinations, real search/transfer, double activation, costs and range, alternate destruction, editor undo/rotation/blocks, missing roles, and cross-sector save/load without restocking.

## Persistence seams

`dialogue-schema.js` validates content and computes canonical SHA-256 hashes. `dialogue-state.js` owns pure previews, the isolated unbiased percentile stream and receipt replay. `dialogue-session.js` owns transient node/speaker selection. `dialogue-rules.js` reuses the real game's talk restrictions, potential sight, support heights and personalities. `battle-dialogue.js` presents the modal using text nodes.

There is one canonical dialogue subtree: on the standalone encounter, or on the campaign root. It is keyed by stable NPC instance and resource IDs. Every effectful choice stages a candidate; the result becomes visible only after an atomic checkpoint succeeds. Standalone checkpoints compare the prior Autosave token in the same IndexedDB transaction. Campaign checkpoints use the existing campaign revision check. A second tab cannot overwrite a newer checkpoint. Storage failure retains the uncommitted candidate for an explicit retry; leaving discards a failed candidate. A pending write blocks world commands even if the panel is closed. No result or effect is replayed from a saved animation or an open UI session.

Save validation verifies pinned content hashes, replays receipts in command order, checks effective odds, natural-roll text, final facts, attempts and final RNG state, and verifies character references. Legacy saves initialize missing optional dialogue state once on load. Malformed supplied state is rejected. Saves load paused with the panel closed. No change to the existing save-format version is required for this optional subtree.

Generated core changes live in `tools/core-dialogue-adapter.mjs`; regenerate with `node tools/sync-tactics-core.mjs`. Both build paths validate and package the data manifest. The 3D build additionally ships the dialogue presentation and fixture.

## Evidence and remaining human review

Automated coverage is in `tests/dialogue.test.mjs` and `tests/dialogue-integration.test.mjs`: minimum/20% boundaries, every roll at each percentage, actual committed outcomes at 20/50/99%, natural text, unbiased RNG endpoints, ordinary choices, nonstacking personality effects, no-roll inspection, stale inputs, double clicks, failed writes, closing mid-write, retries, save migration/corruption, campaign ownership, resource conflicts, undo/export and block duplication.

Browser review uses packaged assets, real right-click dispatch and real IndexedDB. It checks exact odds and speaker changes, pause/exit behavior, persisted encounter and campaign responses, campaign-map navigation, and a two-writer save race. These are engineering checks, not a claim that an independent person has approved the writing or usability.

Implementation verification: the full `npm run check` passed 2,634 tests and the asset check. After the final editor/UI fixes, the 18 dialogue tests and both packaging tests passed again; the generated-core check and `npm run build:tactics-3d` also passed. In the packaged editor, a new flat conversation was authored, saved, attached to Nadia and opened successfully through Playtest. This caught and fixed a scene-refresh race that had restored the previous dialogue reference after saving new JSON.

**Independent author exercise (still to run):** Give another author the fixed example above and the editor. Ask them to add a new NPC with one ordinary information choice, one personality choice and one skill check, export/reimport the map and demonstrate failure persisting after reload. Pass if they need no engine edits and can diagnose one deliberately misspelled branch destination using the validator. Record any help they needed.

**Uncoached player exercise (still to run):** Give five players the rehearsal and ask them to get permission to inspect the bomb. Before and after a check, ask who is speaking, what is being attempted, whether a roll occurs, what the percentage means, what changed, whether the bomb is now safe, and how to leave. Pass if at least four correctly understand the speaker/action/result without coaching, all can exit safely, and nobody believes permission automatically disarmed the bomb. Record observations before revising wording or layout.
