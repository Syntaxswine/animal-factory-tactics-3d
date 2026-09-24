import {canControl,movementNeighbors,combatCosts,occupant} from './core/engine.js';
import {roofNeighbors} from './core/maps.js';
import {canMoveStamina} from './stamina.js';
export function nearbyCliffClimbs(state,unit){
 if(!unit)return [];
 const legal=movementNeighbors(state,unit);
 return roofNeighbors(state,unit).filter(p=>p.kind==='cliff').map(to=>{
  const reason=!canControl(state,unit)?'Select an active merc.':
   occupant(state,to.x,to.y,to.z)?'Landing occupied.':
   !legal.some(p=>p.kind==='cliff'&&p.x===to.x&&p.y===to.y&&p.z===to.z)?(unit.stance==='standing'?'Climb route blocked.':'Stand up to climb.'):
   !canMoveStamina(unit,to)?'Not enough stamina.':
   combatCosts(state)&&unit.ap<8?'Requires 8 AP.':'';
  return {to,label:to.z>(unit.z||0)?'Climb cliff':'Descend cliff',ok:!reason,reason};
 });
}
