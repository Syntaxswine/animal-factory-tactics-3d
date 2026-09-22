import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {toWorld} from './hybrid-world.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWeaponModel} from './weapon-models.js';
import {personVisible} from './battle-visibility.js';
import {BattleEnvironment,PAINTED_PROP_FORMS} from './battle-environment.js';
import {BattleMotion} from './battle-motion.js';
import {createWorkerLocomotion} from './worker-locomotion.js';

// Reuse only the environment/camera presentation. No hybrid combat mode.
export class BattleRenderer extends HybridRenderer {
 constructor(onReady=()=>{}){
  super(onReady);this.models=new Map();this.meshData=new Map();this.pending=new Set();this.generation=0;
  this.motion=new BattleMotion();this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  this.paintedEnvironment=new BattleEnvironment(this.scene,this.loader,()=>{this.world=null;onReady();},error=>{this.diagnostics.push('Painted environment failed: '+error.message);onReady();});
 }
 rebuild(world,seen,level,map){
  const scenery={...world,boxes:world.boxes.filter(b=>!(b.kind==='cover'&&b.material==='crate-wood'))};
  super.rebuild(scenery,map.difficulty==='easy'?null:seen,level,{...map,props:map.props.filter(p=>!PAINTED_PROP_FORMS[p.kind])});
  this.paintedEnvironment.rebuild(map,level);
 }
 async loadModel(unit){
  this.pending.add(unit.id);const generation=this.generation;
  const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===unit.species);
  let worker,paint;
  try{
   if(!profile)throw Error('Missing character model: '+unit.species);
   if(!this.meshData.has(profile.file))this.meshData.set(profile.file,fetch(new URL(profile.file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Cannot load '+profile.file);return r.json();}));
   worker=profile.create(await this.meshData.get(profile.file));
   paint=await createAnimalPaint(this.renderer,worker,profile,this.loader);
   if(generation!==this.generation){paint.dispose();worker.dispose();return;}
   for(const part of worker.parts)part.material=paint.material;
   const root=new T.Group();root.add(worker.root);
   const locomotion=createWorkerLocomotion(worker,profile);
   this.models.set(unit.id,{worker,paint,root,profile,locomotion});this.actors.set(unit.id,root);this.scene.add(root);
  }catch(error){paint?.dispose();worker?.dispose();this.diagnostics.push(error.message);}
  finally{if(generation===this.generation)this.onReady();}
 }
 actor(unit){
  const model=this.models.get(unit.id);
  if(!model){if(!this.pending.has(unit.id))this.loadModel(unit);return null;}
  const {worker,root,profile}=model,sample=this.motion.sample(unit);
  const signature=`${unit.weapon}:${sample.heading}:${unit.hp>0}:${sample.blend}:${sample.blend?sample.distance:0}`;
  if(model.signature!==signature){
   // Authoring rigs solve carry grips in model space. Position only after posing.
   root.position.set(0,0,0);root.updateMatrixWorld(true);
   model.signature=signature;
   if(!profile.unarmed&&model.weapon!==unit.weapon){
    const old=model.equipment;model.equipment=createWeaponModel(unit.weapon);worker.equipWeapon(model.equipment);old?.dispose();model.weapon=unit.weapon;
   }
   worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);
   if(unit.hp>0)model.locomotion.apply(sample);
   else worker.pose(profile.unarmed?'neutral':'carry',-sample.heading);
   model.paint.setGripForearm?.(!!model.equipment?.carry?.handPoses?.support?.gripMesh);
   // Temporary casualty pose, listed explicitly in the visual backlog.
   worker.root.rotation.z=unit.hp<=0?Math.PI/2:0;
  }
  root.position.fromArray(toWorld(sample));
  const placement=`${signature}:${sample.x}:${sample.y}:${sample.z||0}`;
  if(model.placement!==placement){
   model.placement=placement;root.updateMatrixWorld(true);worker.skeleton.update();
   for(const part of worker.parts){part.computeBoundingBox?.();part.computeBoundingSphere?.();}
  }
  return root;
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
  const units=state.units.filter(u=>personVisible(state,u));
  this.motion.update(units,performance.now(),!!this.reducedMotion?.matches);
  return super.draw(ctx,{...state,terrain:state.map,units},...args);
 }
 displayUnit(unit){return this.motion.sample(unit);}
 dispose(){
  this.generation++;
  this.paintedEnvironment.dispose();
  this.motion.clear();
  for(const {worker,paint,root,equipment,locomotion}of this.models.values()){this.scene.remove(root);root.position.set(0,0,0);root.updateMatrixWorld(true);locomotion.dispose();equipment?.dispose();paint.dispose();worker.dispose();}
  this.models.clear();this.actors.clear();this.meshData.clear();this.pending.clear();super.dispose();
 }
}
