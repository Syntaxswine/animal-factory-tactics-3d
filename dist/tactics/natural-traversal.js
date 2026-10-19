import {toWorld} from './hybrid-world.js';
import {createWindowDive} from './window-dive.js';
// Battle presentation for crossings that the physics audit accepts (docs/tactics/NATURAL-TRAVERSAL.md).
// Same contract as createSimpleTraversal(model, event, unit): {duration, climb: {skeleton, equipmentState},
// apply(progress) -> {worldRoot}, dispose()}, so the battle can choose it per event kind. It never changes
// simulation state, AP or the clock.
export const naturalTraversal=e=>e?.kind==='window';
export function createNaturalTraversal(model,event,unit){
 const {worker,profile}=model;
 if(!naturalTraversal(event))throw Error('No natural traversal for '+event?.kind);
 const dx=event.to.x-event.from.x,dy=event.to.y-event.from.y;
 if(Math.abs(dx)+Math.abs(dy)!==1||(event.to.z??0)!==(event.from.z??0))throw Error('A window crossing joins two side-by-side tiles on one level');
 const heading=Math.atan2(dy,dx)*180/Math.PI,origin=toWorld(event.from),motion=createWindowDive(worker,profile);
 let disposed=false;
 return {duration:motion.duration,phases:motion.phases,climb:{skeleton:worker.skeleton,get equipmentState(){return 'carried';}},
  apply(progress){if(disposed)throw Error('Traversal already disposed');const r=motion.apply(progress,{origin,heading});return {worldRoot:r.worldRoot,phase:r.phase};},
  dispose(){if(disposed)return;motion.dispose();disposed=true;}};
}
