import {TOWERS,TOWER_HEIGHT,unitBaseHeight} from './tower-geometry.js';
import * as T from './vendor/three.module.js';
import {DIMENSIONS} from './hybrid-world.js';
function visualTower(state,p){return state?.props?.find(t=>{const f=TOWERS[t.kind];if(!f)return false;const h=p.y-(t.z||0)*DIMENSIONS.floorSpacing;return h>=TOWER_HEIGHT-.2&&h<=TOWER_HEIGHT+3&&p.x>=t.x-.5&&p.x<t.x+(t.rotated?f.h:f.w)-.5&&p.z>=t.y-.5&&p.z<t.y+(t.rotated?f.w:f.h)-.5;});}
export function shotPoint(p,state){
 const victim=state?.units?.find(u=>u.id===p.unitId);if(victim?.towerPost)return new T.Vector3(p.x,unitBaseHeight(victim,DIMENSIONS.floorSpacing)+(p.h-unitBaseHeight(victim))*DIMENSIONS.standing/1.8,p.y);
 const tower=visualTower(state,{x:p.x,y:p.h,z:p.y});if(tower)return new T.Vector3(p.x,(tower.z||0)*DIMENSIONS.floorSpacing+(p.h-(tower.z||0)*3),p.y);
const z=Math.max(0,Math.floor((p.h||0)/3));return new T.Vector3(p.x,z*DIMENSIONS.floorSpacing+((p.h||0)-z*3)*DIMENSIONS.standing/1.8,p.y);}
const visible=(state,p)=>{const tower=visualTower(state,p),z=tower?(tower.z||0):Math.max(0,Math.min(2,Math.floor(p.y/DIMENSIONS.floorSpacing))),x=Math.round(p.x),y=Math.round(p.z);return state.visible.has(z?`${x},${y},${z}`:`${x},${y}`);};
// Clip to actual current visibility, even when Easy reveals all scenery.
export function visibleShotPath(state,points){
 if(!points.length||!visible(state,points[0]))return [];
 const result=[points[0]];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(a.distanceTo(b)/.15));for(let j=1;j<=steps;j++){const p=a.clone().lerp(b,j/steps);if(!visible(state,p))return result;result.push(p);}}
 return result;
}
export class BattleShotEffects {
 constructor(scene){
  this.flash=new T.Mesh(new T.SphereGeometry(.035,8,6),new T.MeshBasicMaterial({color:0xffdf83,toneMapped:false}));this.flash.scale.set(2.8,1,1);
  this.trace=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xffd893,transparent:true,opacity:.8,toneMapped:false}));
  this.impact=new T.Mesh(new T.OctahedronGeometry(.07),new T.MeshBasicMaterial({color:0xd5b78a,transparent:true,opacity:.8,toneMapped:false}));
  scene.add(this.flash,this.trace,this.impact);this.hide();
 }
 hide(){this.flash.visible=this.trace.visible=this.impact.visible=false;}
 update(active,state,muzzle){
  const {event,phase}=active,shot=event.trajectories[0];if(!shot)return;
  const endpoint=shotPoint(shot,state);
  if(muzzle&&phase.flash&&visible(state,muzzle.origin)){this.flash.visible=true;this.flash.position.copy(muzzle.origin);this.flash.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),muzzle.direction);}
  if(muzzle&&phase.trace){
   const path=visibleShotPath(state,[active.traceOrigin||muzzle.origin,...(shot.path||[shot]).map(p=>shotPoint(p,state))]);
   if(path.length>1){const old=this.trace.geometry;this.trace.geometry=new T.BufferGeometry().setFromPoints(path);old.dispose();this.trace.visible=true;}
  }
  const knownVictim=shot.kind!=='unit'||active.knownUnitIds.includes(shot.unitId)||state.units.some(u=>u.id===shot.unitId&&u.team==='squad');
  if(phase.impact&&shot.kind!=='range'&&visible(state,endpoint)&&knownVictim){this.impact.visible=true;this.impact.position.copy(endpoint);this.impact.material.color.setHex(shot.kind==='unit'?0xd18463:0xd5b78a);}
 }
 dispose(){for(const mesh of [this.flash,this.trace,this.impact]){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}}
}
