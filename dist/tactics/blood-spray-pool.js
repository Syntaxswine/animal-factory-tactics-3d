import * as T from './vendor/three.module.js';
import {BLOOD_CELLS,BLOOD_CARD_COUNT,BLOOD_DURATION} from './painted-blood-spray-data.js';
import {createBloodSprayMotion} from './painted-blood-spray-motion.js';
import {createPaintedBloodCards} from './painted-blood-spray.js';

export const BLOOD_EMITTER_LIMIT=12,BLOOD_PARTICLE_LIMIT=BLOOD_EMITTER_LIMIT*BLOOD_CARD_COUNT;
// One instanced draw, fixed buffers and twelve reusable motion slots. No mesh,
// material, particle object or texture is created when a projectile hits.
export class BloodSprayPool {
 constructor(scene,texture){
  this.slots=Array.from({length:BLOOD_EMITTER_LIMIT},()=>({active:false,motion:createBloodSprayMotion({pooled:true}),matrix:new T.Matrix4(),basis:new T.Matrix3(),floor:0,start:0,still:false,level:0,planes:[]}));
  const count=BLOOD_PARTICLE_LIMIT;this.buffer={count,launch:new Float32Array(count*3),fall:new Float32Array(count),tangent:new Float32Array(count*3),gravityVelocity:new Float32Array(count),size:new Float32Array(count*2),alpha:new Float32Array(count),tile:new Float32Array(count),spin:new Float32Array(count)};
  const point=new T.Vector3(),velocity=new T.Vector3(),buffer=this.buffer;
  for(let i=0;i<count;i++)buffer.tile[i]=this.slots[Math.floor(i/BLOOD_CARD_COUNT)].motion.buffer.tile[i%BLOOD_CARD_COUNT];
  const sample=time=>{
   buffer.alpha.fill(0);
   for(const [slotIndex,slot]of this.slots.entries()){
    if(!slot.active)continue;const age=time-slot.start;if(age>=BLOOD_DURATION){slot.active=false;continue;}
    const b=slot.motion.sample(age,{still:slot.still});
    for(let i=0;i<BLOOD_CARD_COUNT;i++){
     const n=slotIndex*BLOOD_CARD_COUNT+i,k=n*3,s=n*2,local=i*3,size=i*2;
     point.fromArray(b.launch,local).applyMatrix4(slot.matrix);velocity.fromArray(b.tangent,local).applyMatrix3(slot.basis);
     point.toArray(buffer.launch,k);velocity.toArray(buffer.tangent,k);buffer.fall[n]=b.fall[i];buffer.gravityVelocity[n]=b.gravityVelocity[i];buffer.size[s]=b.size[size];buffer.size[s+1]=b.size[size+1];buffer.spin[n]=b.spin[i];buffer.alpha[n]=b.alpha[i];
    }
   }
   return buffer;
  };
  this.effect=createPaintedBloodCards(texture,{buffer,sample},BLOOD_CELLS);scene.add(this.effect.mesh);this.effect.mesh.visible=false;this.dropped=0;
 }
 spawn(placement,now,{seed=placement.visualSeed,strength=1,reduced=false,still=false,planes=[]}={}){
  const slot=this.slots.find(s=>!s.active||now/1000-s.start>=BLOOD_DURATION);if(!slot){this.dropped++;return false;}
  slot.motion.reset({seed,strength,reduced});slot.active=true;slot.start=now/1000;slot.still=still;slot.matrix.copy(placement.matrix);slot.basis.setFromMatrix4(slot.matrix);slot.floor=placement.floor;slot.level=placement.contact.shotLevel;slot.planes=planes;return true;
 }
 update(now,camera,visibleAt=()=>true){
  if(!this.slots.some(s=>s.active)){this.effect.mesh.visible=false;return {liveCards:0,capacity:BLOOD_PARTICLE_LIMIT,drawCalls:0};}
  return this.effect.update(now/1000,camera,{floorAt:i=>this.slots[Math.floor(i/BLOOD_CARD_COUNT)].floor,
   visibleAt:(p,i)=>{const slot=this.slots[Math.floor(i/BLOOD_CARD_COUNT)];p.shotLevel=slot.level;return slot.active&&visibleAt(p,slot)&&slot.planes.every(plane=>plane.normal.dot(p)-plane.constant>=-.015);}});
 }
 get active(){return this.slots.filter(s=>s.active).length;}
 clear(){for(const s of this.slots){s.active=false;s.planes=[];}this.buffer.alpha.fill(0);this.effect.mesh.visible=false;}
 dispose(){this.clear();this.effect.dispose();}
}
