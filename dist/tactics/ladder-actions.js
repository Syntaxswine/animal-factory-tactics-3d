import {roofNeighbors} from './core/maps.js';
import {canControl,combatCosts,movementNeighbors,occupant} from './core/engine.js';
import {canMoveStamina} from './stamina.js';
import {climbTower,towerClimbPreview} from './tower-actions.js';
export function climbPreview(state,unit,preferredLevel){
 const tower=towerClimbPreview(state,unit);
 if(tower.tower)return {...tower,kind:'tower',label:tower.descending?'Descend tower':'Climb tower'};
 if(!unit)return {...tower,label:'Climb ladder',kind:'ladder'};
 const z=unit.z||0,connections=(state.stairs||[]).filter(p=>p.x===unit.x&&p.y===unit.y&&(p.z===z||p.z+1===z));
 const candidates=(connections.length?connections.map(p=>({p,to:{x:p.x,y:p.y,z:p.z===z?z+1:z-1}})):roofNeighbors(state,unit).filter(p=>p.kind==='roof').map(to=>({p:{kind:'roof'},to}))).sort((a,b)=>(b.to.z===preferredLevel)-(a.to.z===preferredLevel)||b.to.z-a.to.z);
 if(!candidates.length)return {...tower,kind:'ladder',label:'Climb ladder',reason:'Stand beside a climbable roof, on a ladder tile or at a tower entrance.'};
 const {p,to}=candidates[0],step=movementNeighbors(state,unit).find(q=>q.x===to.x&&q.y===to.y&&q.z===to.z);
 const reason=!canControl(state,unit)||state.queue.length?'Cannot climb now.':unit.stance!=='standing'?'Stand up to climb.':!step?'Landing is blocked.':occupant(state,to.x,to.y,to.z)?'Landing is occupied.':!canMoveStamina(unit,step)?'Not enough stamina.':combatCosts(state)&&unit.ap<step.cost?'Not enough AP.':'';
 return {ok:!reason,reason,kind:p.kind==='roof'?'roof':'ladder',destination:to,cost:step?.cost??(p.kind==='ladder'?3:2),label:(to.z>z?'Climb ':'Descend ')+(p.kind==='roof'?'roof':p.kind==='ladder'?'ladder':'stairs')};
}
export function performClimb(state,unit,preferredLevel){const p=climbPreview(state,unit,preferredLevel);if(!p.ok)return false;if(p.kind==='tower')return climbTower(state,unit);unit.overwatch=null;state.queue=[{id:unit.id,...p.destination,cost:p.cost}];return true;}
