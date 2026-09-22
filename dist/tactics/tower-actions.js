import {TOWERS,towerEntry,towerSlots,towerForUnit,towerPost} from './tower-geometry.js';
import {canControl,combatCosts,refresh,emitNoise} from './core/engine.js';
import {passable} from './core/maps.js';
import {advanceClock} from './game-clock.js';
export const TOWER_CLIMB_AP=6;
const vacant=(s,p)=>!s.units.some(u=>u.x===p.x&&u.y===p.y&&(u.z||0)===(p.z||0)&&!u.away&&(u.hp>0||['bleeding','stable'].includes(u.casualty)));
export function towerClimbPreview(s,u){
 const occupied=towerForUnit(s,u),tower=occupied||(s.props||[]).find(p=>TOWERS[p.kind]&&(()=>{const e=towerEntry(p);return e.x===u?.x&&e.y===u?.y&&e.z===(u?.z||0);})());
 if(!tower)return {ok:false,reason:'Stand at a tower entrance.',tower:null};
 const destination=occupied?towerEntry(tower):towerSlots(tower).find(p=>vacant(s,p));
 let reason='';if(!canControl(s,u)||s.queue.length)reason='Cannot climb now.';else if(u.stance!=='standing')reason='Stand up to climb.';else if(combatCosts(s)&&u.ap<TOWER_CLIMB_AP)reason='Climbing needs 6 AP.';else if(!destination||!vacant(s,destination))reason=occupied?'Tower exit is occupied.':'All tower posts are occupied.';else if(occupied&&!passable(s,destination))reason='Tower exit is blocked.';
 return {ok:!reason,reason,tower,destination,descending:!!occupied,cost:TOWER_CLIMB_AP};
}
export function climbTower(s,u){const r=towerClimbPreview(s,u);if(!r.ok)return false;
 const pose=()=>({x:u.x,y:u.y,z:u.z||0,...(u.towerPost?{towerPost:{...u.towerPost}}:{})}),from=pose(),combat=combatCosts(s);
 if(combatCosts(s))u.ap-=r.cost;else if(s.clock){advanceClock(s.clock,.5);s.awarenessSeconds=(s.awarenessSeconds||0)+30;}
 Object.assign(u,r.destination);if(r.descending)delete u.towerPost;else u.towerPost=towerPost(r.tower,r.destination);
 s.towerTraversal={id:(s.towerTraversal?.id||0)+1,unitId:u.id,direction:r.descending?'down':'up',access:r.tower.kind.includes('-stair-')?'stairs':'ladder',tower:{...r.tower},from,to:pose(),apCost:combat?r.cost:0,gameMinutes:.5};
 u.steps++;u.overwatch=null;u.moved=true;emitNoise(s,u,10);s.log.unshift(u.name+(r.descending?' descended from the tower.':' climbed to a tower lookout.'));refresh(s);return true;
}
