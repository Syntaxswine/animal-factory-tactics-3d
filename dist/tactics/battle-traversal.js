import {supportsStow} from './equipment-stow.js';
import {createLadderJourney} from './ladder-journey.js';
import {towerCenter} from './tower-geometry.js';
import {toWorld,DIMENSIONS} from './hybrid-world.js';
export function ladderFrame(tower){const c=towerCenter(tower),x=1.84,y=-.8;return {origin:[c.x+(tower.rotated?-y:x),(tower.z||0)*DIMENSIONS.floorSpacing,c.y+(tower.rotated?x:y)],heading:tower.rotated?270:180};}
export function canAnimateLadder(event,unit){return event?.access==='ladder'&&event.tower.kind==='iron-searchlight-ladder-tower'&&supportsStow(unit?.weapon)&&unit.hp>0&&unit.species!=='hen'&&!unit.species.startsWith('pig');}
// Consumes committed events; never changes simulation state, AP or the clock.
export class BattleTraversal {
 constructor(){this.lastId=0;this.active=null;this.queue=[];}
 observe(state,now,reduced=false){const event=state.towerTraversal;if(event&&event.id>this.lastId){this.lastId=event.id;const unit=state.units.find(u=>u.id===event.unitId);if(!reduced&&unit?.team==='squad'&&canAnimateLadder(event,unit))this.queue.push(structuredClone(event));}if(!this.active&&this.queue.length)this.active={event:this.queue.shift(),start:null};
  const a=this.active;if(a){const u=state.units.find(u=>u.id===a.event.unitId);if(reduced||!u||u.hp<=0||u.away||!canAnimateLadder(a.event,u)||a.weapon&&a.weapon!==u.weapon||a.start!==null&&now-a.start>=(a.motion?.duration??6)*1000)this.finish();}
 }
 pose(model,unit,now){const a=this.active;if(!a||a.event.unitId!==unit.id)return false;
  const {worker,root,profile}=model;root.position.set(0,0,0);root.rotation.set(0,0,0);root.updateMatrixWorld(true);
  if(!a.motion){worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);root.updateMatrixWorld(true);model.posture?.resetTail();a.weapon=unit.weapon;a.motion=createLadderJourney(worker,profile,a.event,ladderFrame(a.event.tower),unit.heading||0);a.model=model;a.start=now;}
  const pose=a.motion.apply(Math.min(1,Math.max(0,(now-a.start)/(a.motion.duration*1000))));a.position=pose.worldRoot;worker.skeleton.update();for(const part of worker.parts){part.computeBoundingBox?.();part.computeBoundingSphere?.();}return true;
 }
 display(unit){const a=this.active;if(a?.event.unitId!==unit.id)return unit;const p=a.position||toWorld(a.event.from);return {...unit,x:p[0],y:p[2],z:0,h:p[1],towerPost:undefined,towerElevation:p[1]};}
 finish(){const a=this.active;if(a?.motion){a.motion.dispose();a.model.drawRequested=false;a.model.signature=null;a.model.placement=null;}this.active=null;}
 get busy(){return !!this.active||!!this.queue.length;}
 clear(){this.finish();this.queue=[];this.lastId=0;}
}
