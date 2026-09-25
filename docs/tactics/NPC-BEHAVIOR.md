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

Combat behavior is Fight, Cower or Flee. Cowerers kneel in place; fleeing
characters move away from the threat using walkable, unoccupied same-floor
steps and pay movement AP during turns. Both react to nearby gunfire or direct
attacks. They never shoot, even when provoked or cornered. Fleeing currently
uses local escape steps rather than strategic evacuation or exit selection.
These reactions reuse existing poses and movement, with no new animations.

Non-hostile characters do not initiate combat, pursue the player, or draw
automatic overwatch fire. Noncombatants do not hold combat open or prevent
encounter clearance, and can continue fleeing in exploration. They remain
visible under normal visibility rules and may still be deliberately attacked.

This implements relationships toward the player, not a complete faction war
system: allied NPCs do not yet fight other guards on the player's behalf.
Dialogue, shops, faction-wide retaliation, recovery from fear and reconciliation
after an attack remain separate work.
