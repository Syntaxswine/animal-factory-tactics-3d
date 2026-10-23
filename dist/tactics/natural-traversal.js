import {toWorld} from './hybrid-world.js';
import {createWindowDive} from './window-dive.js';
import {createWallVault} from './wall-vault.js';
import {createWallClimb} from './wall-climb.js';
import {createHenCrossing} from './hen-crossing.js';
// Battle presentation for crossings that the physics audit accepts (docs/tactics/NATURAL-TRAVERSAL.md).
// Same contract as createSimpleTraversal(model, event, unit): {duration, climb: {skeleton, equipmentState},
// apply(progress) -> {worldRoot}, dispose()}, so the battle can choose it per event kind. It never changes
// simulation state, AP or the clock. Every mammal shares the traversal skeleton and is fitted to its own body; the hen,
// with wings and no hands, has her own crossings (hen-crossing.js): she hops up on her wings and down the other side.
// low-wall is the proposed waist-high wall (not a game edge yet).
const MOTIONS={window:createWindowDive,'low-wall':createWallVault,wall:createWallClimb};
export const naturalTraversal=(e,unit)=>Object.hasOwn(MOTIONS,e?.kind??'');
export function createNaturalTraversal(model,event,unit){
 const {worker,profile}=model;
 if(!naturalTraversal(event,unit))throw Error('No natural traversal for '+event?.kind);
 const dx=event.to.x-event.from.x,dy=event.to.y-event.from.y;
 if(Math.abs(dx)+Math.abs(dy)!==1||(event.to.z??0)!==(event.from.z??0))throw Error('A crossing joins two side-by-side tiles on one level');
 const heading=Math.atan2(dy,dx)*180/Math.PI,origin=toWorld(event.from),hen=profile?.id==='hen';
 const motion=hen?createHenCrossing(worker,profile,event.kind):MOTIONS[event.kind](worker,profile);
 let disposed=false;
 return {duration:motion.duration,phases:motion.phases,fit:motion.fit,getup:motion.getup,roll:motion.roll,climb:{skeleton:motion.climb?.skeleton||worker.skeleton,get equipmentState(){return 'carried';}},
  apply(progress){if(disposed)throw Error('Traversal already disposed');const r=motion.apply(progress,{origin,heading});return {worldRoot:r.worldRoot,phase:r.phase,com:r.com};},
  dispose(){if(disposed)return;motion.dispose();disposed=true;}};
}
