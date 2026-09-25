# NPC allegiance and reactions

Editor placement category, faction, attitude and combat behavior are independent.
Guards default to hostile fighters; NPCs default to neutral cowerers. Legacy guards
without character metadata retain their original behavior. Older NPC records
without a combatBehavior field use cower.

Player-faction characters start non-hostile even if their authored starting
attitude says hostile. Other characters use friendly/neutral/hostile attitude.
Unaffiliated characters are not treated as a shared allied faction. A valid
player attack, including a miss, makes its target hostile. Collateral damage
from a player also provokes the victim. Hostility persists in encounter saves;
it overrides the initial faction relationship, not the character's faction.

Combat behavior is Fight, Cower or Flee. Cowerers seek reachable nearby cover against the known threat, then kneel; fleeing
characters move away from the threat using walkable, unoccupied same-floor
steps and pay movement AP during turns. Initial fright uses the existing guard Alert/Broken events, including gunfire,
alert reports and direct attacks; Suspicious events alone do not cause panic. Once frightened, cowerers switch to fleeing if a visible person is
within 10 tiles on their floor, or if they take damage. This flight state
persists in encounter saves. Proximity alone does not frighten an idle NPC.
Cover search is bounded to 256 visited cells and 24 movement AP; without
reachable cover they kneel in place. They never shoot, even when provoked or cornered. Fleeing currently
uses local escape steps rather than strategic evacuation or exit selection.
These reactions reuse existing poses and movement, with no new animations.

Non-hostile characters do not initiate combat, pursue the player, or draw
automatic overwatch fire. Noncombatants do not hold combat open or prevent
encounter clearance, and can continue fleeing in exploration. They remain
visible under normal visibility rules and may still be deliberately attacked.

This implements relationships toward the player, not a complete faction war
system: allied NPCs do not yet fight other guards on the player's behalf.
Fear stands down after the existing guard alert duration (three rounds worth
of exploration ticks) with no fighting, fire or active hostile alerts. Refresh
queries do not advance that timer. The characterTalkStatus readiness hook blocks
dialogue during fighting or fear and refuses hostile characters afterward.
Dialogue UI/content, shops, faction-wide retaliation and reconciliation after
an attack remain separate work.
