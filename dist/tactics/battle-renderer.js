import {BattleTraversal} from './battle-traversal.js';
import {LightingScene} from './lighting-scene.js';
import {DaylightRig} from './daylight-rig.js';
import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {toWorld} from './hybrid-world.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createRedHatCap} from './red-hat-model.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWeaponModel} from './weapon-models.js';
import {personVisible} from './battle-visibility.js';
import {BattleEnvironment,PAINTED_PROP_FORMS} from './battle-environment.js';
import {createBattlePosture} from './battle-posture.js';
import {BattleMotion} from './battle-motion.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {BattleCombat} from './battle-combat.js';
import {createRifleFiring} from './rifle-firing.js';
import {BattleShotEffects,shotPoint} from './battle-shot-effects.js';
import {motionPreference} from './settings-3d.js';

// Reuse only the environment/camera presentation. No hybrid combat mode.
export class BattleRenderer extends HybridRenderer {
 constructor(onReady=()=>{}){
  super(onReady);this.daylight=new DaylightRig(this.scene,this.renderer);this.models=new Map();this.meshData=new Map();this.pending=new Set();this.generation=0;
  this.lights=new LightingScene(this.scene,this.loader,onReady,e=>this.diagnostics.push('Lighting: '+e.message));
  this.motion=new BattleMotion();this.reducedMotion=motionPreference();
  this.traversal=new BattleTraversal();this.combat=new BattleCombat();this.shotEffects=new BattleShotEffects(this.scene);
  this.paintedEnvironment=new BattleEnvironment(this.scene,this.loader,()=>{this.world=null;onReady();},error=>{this.diagnostics.push('Painted environment failed: '+error.message);onReady();});
 }
 rebuild(world,seen,level,map){
  const scenery={...world,boxes:world.boxes.filter(b=>!(b.kind==='cover'&&b.material==='crate-wood'))};
  super.rebuild(scenery,map.difficulty==='easy'?null:seen,level,{...map,coverOccupiedProps:map.props,props:map.props.filter(p=>!PAINTED_PROP_FORMS[p.kind])});
  this.paintedEnvironment.rebuild(map,level);
 }
 async loadModel(unit){
  this.pending.add(unit.id);const generation=this.generation;
  const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===unit.species);
  let worker,paint,cap;
  try{
   if(!profile)throw Error('Missing character model: '+unit.species);
   if(!this.meshData.has(profile.file))this.meshData.set(profile.file,fetch(new URL(profile.file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Cannot load '+profile.file);return r.json();}));
   worker=profile.create(await this.meshData.get(profile.file));
   paint=await createAnimalPaint(this.renderer,worker,profile,this.loader,unit.outfit,true);
   if(unit.outfit==='red-hats')cap=await createRedHatCap(this.renderer,worker,profile,this.loader,true);
   if(generation!==this.generation){cap?.dispose();paint.dispose();worker.dispose();return;}
   for(const part of worker.parts)part.material=paint.material;
   const root=new T.Group();root.add(worker.root);
   const posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile);
   this.models.set(unit.id,{worker,paint,root,profile,locomotion,posture,cap});this.actors.set(unit.id,root);this.scene.add(root);
  }catch(error){cap?.dispose();paint?.dispose();worker?.dispose();this.diagnostics.push(error.message);if(this.traversal?.active?.event.unitId===unit.id)this.traversal.finish();}
  finally{if(generation===this.generation)this.onReady();}
 }
 actor(unit){
  const model=this.models.get(unit.id);
  if(!model){if(!this.pending.has(unit.id))this.loadModel(unit);return null;}
  if(this.traversal?.active?.event.unitId===unit.id){
   if(model.weapon!==unit.weapon){const old=model.equipment;model.equipment=createWeaponModel(unit.weapon);model.worker.equipWeapon(model.equipment);old?.dispose();model.weapon=unit.weapon;}
   try{if(this.traversal.pose(model,unit,this.presentationNow??performance.now()))return model.root;}catch(error){this.diagnostics.push('Ladder animation: '+error.message);this.traversal.finish();}
  }
  const {worker,root,profile}=model,shot=this.combat.active?.event.shooter===unit.id?this.combat.active:null;
  const sample=shot?{...this.motion.sample(unit),x:shot.event.ax,y:shot.event.ay,z:shot.event.az||0,blend:0}:this.motion.sample(unit);
  const signature=`${JSON.stringify(sample.pose)}:${unit.casualty}:${unit.weapon}:${sample.heading}:${unit.hp>0}:${sample.blend}:${sample.blend?sample.distance:0}:${shot?.start}:${shot?.phase.aim}:${shot?.phase.recoil}`;
  if(model.signature!==signature){
   // Authoring rigs solve carry grips in model space. Position only after posing.
   root.position.set(0,0,0);root.updateMatrixWorld(true);
   model.signature=signature;
   if(!profile.unarmed&&model.weapon!==unit.weapon){
    const old=model.equipment;model.equipment=createWeaponModel(unit.weapon);worker.equipWeapon(model.equipment);old?.dispose();model.weapon=unit.weapon;
   }
   worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);
   if(unit.hp>0&&shot?.rifle&&!profile.unarmed){
    model.firing??=createRifleFiring(worker,profile,model.posture);
    const target=shotPoint(shot.event.trajectories[0],this.state).sub(new T.Vector3(...toWorld(sample)));
    if(shot.phase.discharged&&!shot.dischargeChecked){
     const launch=model.firing.apply({...shot.phase,recoil:0,target,sample});shot.dischargeChecked=true;shot.presentationUnsupported=!launch.supported;shot.presentationReason=launch.reason;
     shot.traceOrigin=launch.supported?launch.origin.clone().add(new T.Vector3(...toWorld(sample))):null;
    }
    const result=model.firing.apply({...shot.phase,target,sample});
    if(!result.supported){shot.traceOrigin=null;if(shot.phase.discharged){shot.presentationUnsupported=true;shot.presentationReason=result.reason;}}
    this.firingDiagnostic(model,shot.presentationUnsupported?{supported:false,reason:shot.presentationReason}:result,unit);
   }
   else if(unit.hp>0&&sample.pose?.prone>0&&!profile.unarmed&&['rifle','assault','smg','shotgun','sniper'].includes(unit.weapon)){
    model.firing??=createRifleFiring(worker,profile,model.posture);const h=sample.heading*Math.PI/180;const result=model.firing.apply({aim:0,target:new T.Vector3(12*Math.cos(h),.48,12*Math.sin(h)),sample});this.firingDiagnostic(model,result,unit);
   }
   else {this.firingDiagnostic(model,null,unit);model.locomotion.apply({...sample,blend:sample.pose?.prone||sample.pose?.down?0:sample.blend});model.posture.apply(sample);if(Object.values(sample.pose||{}).some(v=>v>0))model.posture.ground();}
   model.paint.setGripForearm?.(!!model.equipment?.carry?.handPoses?.support?.gripMesh);

  }
  root.position.fromArray(toWorld(sample));
  const placement=`${signature}:${sample.x}:${sample.y}:${sample.z||0}`;
  if(model.placement!==placement){
   model.placement=placement;root.updateMatrixWorld(true);worker.skeleton.update();
   for(const part of worker.parts){part.computeBoundingBox?.();part.computeBoundingSphere?.();}
  }
  if(shot)this.shotEffects.update(shot,this.state,shot.rifle&&!shot.presentationUnsupported&&model.firing?model.firing.muzzle():null);
  return root;
 }
 firingDiagnostic(model,result,unit){
  if(model.aimWarning){const i=this.diagnostics.indexOf(model.aimWarning);if(i>=0)this.diagnostics.splice(i,1);model.aimWarning=null;}
  if(result&&!result.supported){model.aimWarning=`${unit.name||unit.species}: firing animation unavailable (${result.reason}); shot outcome unchanged.`;this.diagnostics.push(model.aimWarning);}
 }
 prune(){} // Reuse each actor's model across visibility changes.
 pick(x,y,width,height){
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/width*2-1,1-y/height*2),this.camera);
  const roots=[...this.actors.entries()].filter(([,root])=>root.visible);
  for(const hit of ray.intersectObjects(roots.map(([,root])=>root),true)){
   let object=hit.object,visible=true;
   while(object){if(!object.visible)visible=false;const entry=roots.find(([,root])=>root===object);if(entry&&visible)return entry[0];object=object.parent;}
  }
  return null;
 }
 draw(ctx,state,...args){
  this.state=state;this.captureCombat(state);this.shotEffects.hide();
  const units=state.units.filter(u=>personVisible(state,u)).map(u=>this.combat.display(u));
  this.motion.update(units,(this.presentationNow??performance.now()),!!this.reducedMotion?.matches);
  return super.draw(ctx,{...state,terrain:state.map,units},...args);
 }
 captureCombat(state){this.combat.observe(state,(this.presentationNow??performance.now()),!!this.reducedMotion?.matches);this.traversal.observe(state,(this.presentationNow??performance.now()),!!this.reducedMotion?.matches);}
 get busy(){return this.combat.busy||this.traversal.busy;}
 displayUnit(unit){if(this.traversal?.active?.event.unitId===unit.id)return this.traversal.display(unit);const shot=this.combat.active;if(shot?.event.shooter===unit.id)return {...unit,x:shot.event.ax,y:shot.event.ay,z:shot.event.az||0};return this.motion.sample(unit);}
 dispose(){
  this.generation++;
  this.lights.dispose();this.daylight.dispose();this.paintedEnvironment.dispose();
  this.motion.clear();
  this.traversal.clear();this.combat.clear();this.shotEffects.dispose();
  for(const {worker,paint,root,equipment,locomotion,cap}of this.models.values()){this.scene.remove(root);root.position.set(0,0,0);root.updateMatrixWorld(true);locomotion.dispose();cap?.dispose();equipment?.dispose();paint.dispose();worker.dispose();}
  this.models.clear();this.actors.clear();this.meshData.clear();this.pending.clear();super.dispose();
 }
}
