import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {IDLE_ANIMALS} from '../dist/tactics/armed-idle-actor.js';
import {IDLE_MOODS} from '../dist/tactics/armed-idle-state.js';
import {idleFixture} from './helpers/idle-fixture.mjs';
import {posedSurface,inside} from './helpers/idle-clearance.mjs';
import {rifleArmCrossings} from './helpers/idle-rifle-clearance.mjs';

// Test real surface occlusion from the study's front and three-quarter views,
// independent of materials, draw order, and the hand-anchor diagnostics.
const views=[new T.Vector3(1,.175,0),new T.Vector3(Math.sin(.73),.475,Math.cos(.73))].map(v=>v.normalize());
function coversStock(points,arm,direction){
 const hit=new T.Vector3(),ray=new T.Ray(),toward=direction.clone().negate(),{index,points:a,box}=arm,count=index?.count??a.length,at=i=>index?index.getX(i):i;
 return points.some(p=>{
  ray.set(p.clone().addScaledVector(direction,3),toward);if(!ray.intersectBox(box,hit))return false;
  for(let i=0;i<count;i+=3)if(ray.intersectTriangle(a[at(i)],a[at(i+1)],a[at(i+2)],false,hit)&&ray.origin.distanceTo(hit)<3-.003)return true;
  return false;
 });
}

for(const profile of IDLE_ANIMALS.filter(p=>!p.unarmed&&!p.id.startsWith('pig-'))){
 test(profile.id+': relaxed trigger forearm overlaps the rifle butt without intersecting it',()=>{
  idleFixture(profile,'rifle',({worker,weapon,motion})=>{
   const stock=weapon.parts.find(p=>p.name==='wooden shoulder stock'),forearm=worker.parts.find(p=>p.name==='forearm and hand 1');
   for(const [mood,{duration}] of Object.entries(IDLE_MOODS))for(let i=0;i<32;i++){
    motion.at(duration*i/32,{mood});const label=mood+' frame '+i,arm=posedSurface(forearm),surface=posedSurface(stock),butt=surface.points.filter((p,j)=>stock.geometry.attributes.position.getX(j)<-.10);
    // The narrow stock neck is intentionally grasped. The broad wooden butt
    // must pass behind the arm, not through it; test containment both ways.
    assert.ok(butt.every(p=>!inside(p,arm)),label+' stock outside arm');
    assert.ok(arm.points.every(p=>stock.worldToLocal(p.clone()).x>=-.10||!inside(p,surface)),label+' arm outside stock');
    assert.deepEqual(rifleArmCrossings(worker,weapon),[],label+' no thin surface crossings');
    for(const direction of views)assert.ok(coversStock(butt,arm,direction),label+' forearm physically occludes butt');
    const shoulder=motion.bones.upperArm1.getWorldPosition(new T.Vector3()),elbow=motion.bones.forearm1.getWorldPosition(new T.Vector3());
    assert.ok(shoulder.y-elbow.y>.10,label+' elbow remains below shoulder');
   }
  });
 });
}
