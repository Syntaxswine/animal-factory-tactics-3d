import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {toWorld} from './hybrid-world.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWeaponModel} from './weapon-models.js';
import {personVisible} from './battle-visibility.js';

// Reuse only the environment/camera presentation. No hybrid combat mode.
export class BattleRenderer extends HybridRenderer {
 constructor(onReady=()=>{}){
  super(onReady);this.models=new Map();this.meshData=new Map();this.pending=new Set();this.generation=0;
 }
 rebuild(world,seen,level,map){super.rebuild(world,map.difficulty==='easy'?null:seen,level,map);}
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
   this.models.set(unit.id,{worker,paint,root,profile});this.actors.set(unit.id,root);this.scene.add(root);
  }catch(error){paint?.dispose();worker?.dispose();this.diagnostics.push(error.message);}
  finally{if(generation===this.generation)this.onReady();}
 }
 actor(unit){
  const model=this.models.get(unit.id);
  if(!model){if(!this.pending.has(unit.id))this.loadModel(unit);return null;}
  const {worker,root,profile}=model;
  const signature=`${unit.weapon}:${unit.heading}:${unit.hp>0}`;
  if(model.signature!==signature){
   // Authoring rigs solve carry grips in model space. Position only after posing.
   root.position.set(0,0,0);root.updateMatrixWorld(true);
   model.signature=signature;
   if(!profile.unarmed&&model.weapon!==unit.weapon){
    const old=model.equipment;model.equipment=createWeaponModel(unit.weapon);worker.equipWeapon(model.equipment);old?.dispose();model.weapon=unit.weapon;
   }
   worker.pose(profile.unarmed?'neutral':'carry',-unit.heading);
   model.paint.setGripForearm?.(!!model.equipment?.carry?.handPoses?.support?.gripMesh);
   // Temporary casualty pose, listed explicitly in the visual backlog.
   worker.root.rotation.z=unit.hp<=0?Math.PI/2:0;
  }
  root.position.fromArray(toWorld(unit));
  const placement=`${signature}:${unit.x}:${unit.y}:${unit.z||0}`;
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
  return super.draw(ctx,{...state,terrain:state.map,units:state.units.filter(u=>personVisible(state,u))},...args);
 }
 dispose(){
  this.generation++;
  for(const {worker,paint,root,equipment}of this.models.values()){this.scene.remove(root);equipment?.dispose();paint.dispose();worker.dispose();}
  this.models.clear();this.actors.clear();this.meshData.clear();this.pending.clear();super.dispose();
 }
}
