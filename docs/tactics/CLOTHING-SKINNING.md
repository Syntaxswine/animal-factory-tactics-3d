# Clothing and skinning on the game's characters

**Direction (the boss, 2026-10-09):** "yeah, i sent it to you because i like the work you have done so far
and thought you could add it to the existing models in the game where needed"

"It" is the [clothing and skinning handoff](IDLE-SKINNING-V5-HANDOFF.md) (`b546dfb`). The handoff collects
the corrections the idle study's fifth version
([PR #4](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/4), not merged) made to how the
characters' clothes follow their bones. Those corrections live inside the idle and are undone when it
ends, so none of the game's other motions has them.

## Plan

1. **Measure first.** Lift the idle's surface census (v5's `tests/idle-clothing.test.mjs`: points 4 mm
   apart across every triangle near another part, skinned as the GPU draws them) out into a tool that
   checks any posed character. Run it through the game's own motions (walking, aiming and firing,
   throwing, climbing, ladders, mantling, prone, casualty, the armed idle) on every character and outfit,
   against the weights as they ship. Where those weights sink skin into cloth or tear a seam is where the
   corrections are needed.
2. **Move the corrections that belong to the weights** into the characters themselves, so every motion
   inherits them: the layers on the neck taking the weights of the layer under them, the forearm's weight
   stripped from the shirt beside the hand (the upper arm's kept), sleeve ends on the forearm under them,
   hair on the skin it grows from, the waist blend. Each motion's own edits keep working on top. Whether
   that means new weights in the mesh files or a step when a character is made is for the survey to
   decide.
3. **Local fixes to the clothes** where weights cannot help, keeping the approved shapes. The handoff's
   list: the sheep's neckerchief under its wool ruff, the pig director's collar under his jowls, the pig
   foreman's hem and waistband by his forearms, the goat's collar showing through its throat at rest.
4. **Regressions.** Each changed character at rest, turning, glancing down, breathing, leaning and moving
   its arms, from the front, side, rear and three-quarter, close up and at gameplay size; armed carries; a
   throw and a climb; the outfit variants. Hands, grips, weapon scale and proportions unchanged.

The idle's review rounds 4 and 5 are carried: measure surfaces, not vertices; probe the combinations the
game actually plays; key any cache on the rest pose, not the current one; and tell an inner layer going
under an outer one (natural) from an outer layer going into an inner one (clipping).
