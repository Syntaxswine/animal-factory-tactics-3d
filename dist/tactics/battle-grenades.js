import * as T from './vendor/three.module.js';
import {createGrenadeModel} from './grenade-model.js';
import {createGrenadeThrow} from './grenade-throw-motion.js';
import {createHenGrenadeThrow} from './hen-grenade-throw.js';
import {GRENADE_PREPARED} from './grenade-prepared.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {grenadeBase} from './grenade-geometry.js';
export function grenadePhase(shot,elapsed){
 const release=shot.reduced?0:shot.event.grenade.release*1000,blast=shot.reduced?0:release+shot.event.trajectories[0].fuse*1000;
 return {duration:blast+(shot.reduced?180:800),released:elapsed>=release,discharged:elapsed>=blast,flightAge:Math.max(0,(elapsed-release)/1000),blastAge:(elapsed-blast)/1000,time:elapsed/1000,aim:0,recoil:0};
}
export function grenadeAt(path,time){let i=1;while(i<path.length-1&&path[i].t<time)i++;const a=path[i-1],b=path[i],t=Math.max(0,Math.min(1,(time-a.t)/Math.max(1e-9,b.t-a.t)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h:a.h+(b.h-a.h)*t};}
export const visibleGrenade=(s,p)=>[0,1,2,3].some(z=>s.visible.has(z?`${Math.round(p.x)},${Math.round(p.y)},${z}`:`${Math.round(p.x)},${Math.round(p.y)}`));
const animatedThrow=(unit,shot)=>shot?.event.grenade&&!shot.reduced&&unit.hp>0&&unit.weapon==='grenade'&&GRENADE_PREPARED[unit.species]&&(shot.shooter.stance||'standing')==='standing'&&shot.phase.time<(shot.event.grenade.recovery??4.6)&&!(unit.burningTurns&&shot.phase.discharged);
export class BattleGrenades {
 constructor(scene){
  this.scene=scene;this.session=null;this.projectile=createGrenadeModel();scene.add(this.projectile.root);this.projectile.root.visible=false;
  // Fragmentation has a brief flash and dust, not the fuel blast's burning body
  // sequence. The authoritative event supplies its position and timing.
  this.dust=new T.Group();scene.add(this.dust);this.dust.visible=false;this.parts=[];
  for(let i=0;i<12;i++){const mesh=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial({color:i?0x998973:0xffe3a3,transparent:true,opacity:0,depthWrite:false}));this.parts.push(mesh);this.dust.add(mesh);}
 }
 finish(){const s=this.session;if(!s)return;this.session=null;s.motion?.dispose();const m=s.model;m.root.position.set(0,0,0);m.worker.root.position.set(0,0,0);m.worker.root.quaternion.identity();m.root.updateMatrixWorld(true);if(m.profile.unarmed)m.locomotion=createWorkerLocomotion(m.worker,m.profile);else m.worker.equipWeapon(m.equipment);if(s.paint)for(const [part,attribute]of s.paint)part.geometry.setAttribute('paintPosition',attribute);m.equipment.root.visible=true;for(const part of m.equipment.parts)part.visible=true;m.signature=null;m.placement=null;}
 prepareActor(model,unit,shot){if(this.session?.model===model&&(this.session.shot!==shot||!animatedThrow(unit,shot)))this.finish();}
 pose(model,unit,shot,now){
  this.prepareActor(model,unit,shot);
  if(!animatedThrow(unit,shot))return false;
  if(!this.session){
   model.draw?.dispose();model.draw=null;model.drawRequested=false;
   if(model.weapon!=='grenade'){const old=model.equipment;model.equipment=createGrenadeModel();model.worker.equipWeapon?.(model.equipment);old?.dispose();model.weapon='grenade';}
   model.root.position.set(0,0,0);model.root.quaternion.identity();model.root.updateMatrixWorld(true);
   if(model.profile.unarmed)model.locomotion.dispose();
   const paint=[];if(unit.species==='pig-director')for(const part of model.worker.parts.filter(p=>p.name.includes('trousers'))){const a=part.geometry.attributes.paintPosition;paint.push([part,a.clone()]);for(let i=0;i<a.count;i++)if(a.getY(i)>.66)a.setY(i,.66+(a.getY(i)-.66)*.22);a.needsUpdate=true;}
   this.session={model,shot,paint};
   try{const preparedBalance=GRENADE_PREPARED[unit.species].balance;this.session.motion=model.profile.unarmed?createHenGrenadeThrow(model.worker,model.equipment,{preparedBalance}):createGrenadeThrow(model.worker,model.equipment,{animal:unit.species,preparedBalance});}catch(error){this.finish();throw error;}
  }
  model.root.position.set(0,0,0);model.root.quaternion.identity();model.root.updateMatrixWorld(true);
  this.session.motion.at(shot.phase.time);
  const angle=Math.atan2(shot.event.by-shot.event.ay,shot.event.bx-shot.event.ax);
  model.worker.root.rotation.y=-angle;model.root.position.set(shot.event.ax,grenadeBase(shot.shooter),shot.event.ay);
  model.equipment.root.visible=true;for(const part of model.equipment.parts)part.visible=!shot.phase.released||['pull ring','curved safety lever'].includes(part.name);
  model.root.updateMatrixWorld(true);model.worker.skeleton.update();for(const part of model.worker.parts){part.computeBoundingBox?.();part.computeBoundingSphere?.();}
  return true;
 }
 afterActor(model,unit,shot){if(unit.weapon==='grenade'&&model.equipment)model.equipment.root.visible=unit.hp>0&&(!shot?.event.grenade||!shot.phase.released)&&(unit.ammo?.grenade>0||!!shot?.event.grenade);}
 scenery(state,combat){
  const pending=[combat.active,...combat.queue].filter(s=>s?.event.grenade&&!s.phase?.discharged),key=JSON.stringify([state.revision,pending.map(s=>s.event.grenade.scenery)]);
  if(!pending.length){this.sceneryCache=null;return state;}
  if(this.sceneryCache?.key===key&&this.sceneryCache.state===state)return {...state,...this.sceneryCache.values};
  const values={map:state.map.map(row=>[...row]),upper:structuredClone(state.upper),edges:{...state.edges},props:[...state.props]};
  // Rewind in reverse order so sequential explosions can affect the same wall.
  for(const shot of [...pending].reverse()){
   const old=shot.event.grenade.scenery;if(!old)continue;Object.assign(values.edges,old.edges);values.props.push(...old.props);
   for(const p of old.tiles)if(p.z)values.upper[p.z-1][`${p.x},${p.y}`]=p.kind;else values.map[p.y][p.x]=p.kind;
   for(const site of shot.event.sites||[])values.props=values.props.map(p=>p.x===site.before.x&&p.y===site.before.y&&(p.z||0)===(site.before.z||0)?site.before:p);
  }
  this.sceneryCache={key,state,values};return {...state,...values};
 }
 update(shot,state){
  this.projectile.root.visible=this.dust.visible=false;
  if(this.session&&(this.session.shot!==shot||shot?.reduced))this.finish();
  if(!shot?.event.grenade)return;
  const trajectory=shot.event.trajectories[0],phase=shot.phase;
  if(phase.released&&!phase.discharged&&!shot.reduced){const p=grenadeAt(trajectory.path,phase.flightAge);this.projectile.root.visible=visibleGrenade(state,p);this.projectile.root.position.set(p.x,p.h,p.y);this.projectile.root.rotation.set(phase.flightAge*7,phase.flightAge*3,phase.flightAge*5);for(const part of this.projectile.parts)part.visible=!['pull ring','curved safety lever'].includes(part.name);}
  if(phase.discharged&&phase.blastAge<.8&&visibleGrenade(state,trajectory)){
   this.dust.visible=true;this.dust.position.set(trajectory.x,trajectory.h,trajectory.y);
   for(let i=0;i<this.parts.length;i++){const p=this.parts[i],a=i*2.4,t=Math.max(0,phase.blastAge),r=t*(i?3.5:0),size=i?.15+t*.7:.12+t*.9;p.position.set(Math.cos(a)*r,t*(i%3+1)*.6,Math.sin(a)*r);p.scale.setScalar(size);p.material.opacity=i?Math.max(0,.65*(1-t/.8)):Math.max(0,1-t/.12);if(shot.reduced){p.position.set(0,0,0);p.scale.setScalar(.25);p.material.opacity=i?0:.6;}}
  }
 }
 dispose(){this.finish();this.projectile.root.removeFromParent();this.projectile.dispose();this.dust.removeFromParent();for(const p of this.parts){p.geometry.dispose();p.material.dispose();}}
}
