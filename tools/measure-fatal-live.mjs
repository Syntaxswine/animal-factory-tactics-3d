import fs from 'node:fs';
import os from 'node:os';
import {createHash} from 'node:crypto';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {prepareFatalHead,presentFatalHead} from '../dist/tactics/battle-fatal-head.js';
import {CharacterBatches} from '../dist/tactics/character-batches.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {createCasualtyWeaponAssembly} from '../dist/tactics/casualty-weapon-assembly.js';
const percentile=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};};
const measure=(fn,count=60,batch=10)=>{const times=[];for(let i=0;i<count+5;i++){const start=performance.now();for(let j=0;j<batch;j++)fn();if(i>=5)times.push((performance.now()-start)/batch);}return {operationsPerSample:batch,...percentile(times)};};
fs.mkdirSync('artifacts/fatal-live',{recursive:true});
const texture=new T.Texture(),roster=[],weapons=[];let model;
try{
 for(const p of profiles){const w=p.create(JSON.parse(fs.readFileSync('dist/tactics/'+p.file))),root=new T.Group(),paint=new T.MeshBasicMaterial();root.add(w.root);for(const part of w.parts)part.material=paint;
  const m={profile:p,worker:w,root,posture:createBattlePosture(w,p),locomotion:createWorkerLocomotion(w,p),batches:new CharacterBatches(w,root),placement:'fixed'};
  const start=performance.now();m.fatalMask=prepareFatalHead(m,texture);const prepareMs=performance.now()-start;
  w.pose('neutral');root.updateMatrixWorld(true);for(const part of w.parts){part.skeleton.update();part.computeBoundingBox();}m.batches.sync();
  const before=w.parts.reduce((n,p)=>n+(p.geometry.index?.count??p.geometry.attributes.position.count)/3,0);m.fatalMask.setDestroyed(true);for(const part of w.parts)part.computeBoundingBox();m.batches.sync();
  const after=w.parts.reduce((n,p)=>n+(p.geometry.index?.count??p.geometry.attributes.position.count)/3,0);roster.push({species:p.id,prepareMs,trianglesBefore:before,trianglesAfter:after,sealDraws:m.fatalMask.caps.length,batchDraws:m.batches.groups.size,...m.fatalMask.diagnostics()});
  if(p.id==='pig-foreman')model={...m,paint};else{m.batches.dispose();m.fatalMask.dispose();m.locomotion.dispose();w.dispose();paint.dispose();}
 }
 const unit={id:4,hp:0,casualty:'dead',fatalHead:{version:1,impactId:'shot:1/d:0/p:0/body:4'}};
 const stableMaskAndBatches=measure(()=>{presentFatalHead(model,unit,'full',()=>model.root);model.batches.sync();},100,50);
 const settingSwitch=measure(()=>{model.fatalMask.setDestroyed(!model.fatalMask.destroyed);for(const p of model.worker.parts)p.computeBoundingBox();model.batches.sync();},40,5);
 for(const id of Object.keys(WEAPON_MODELS).filter(k=>k!=='hands')){const gun=createWeaponModel(id),host=new T.Group();host.add(gun.root);if(gun.mount)host.add(gun.mount);if(gun.hose){host.add(gun.hose);gun.updateHose(host);}host.position.y=1.5;host.updateMatrixWorld(true);let sample;
  const creation=measure(()=>{const drop=createCasualtyWeaponAssembly(gun,{floor:0});sample={draws:drop.drawCalls,components:drop.sourceRoots.length,triangles:0};drop.root.traverse(p=>{if(p.isMesh)sample.triangles+=p.geometry.attributes.position.count/3;});drop.dispose();},30,5);
  weapons.push({weapon:id,...sample,creationMilliseconds:creation});gun.dispose();
 }
 const paths=['battle-blood.js','battle-fatal-head.js','battle-weapon-drops.js','casualty-weapon-assembly.js','character-batches.js','blood-stain-batches.js','fatal-head-mask.js','fatal-head-motion.js','rifle-firing.js','offhand-equipment.js','blood-spray-pool.js','battle-renderer.js','weapon-models.js','gunshot-spray-frame.js'];
 const report={measuredAt:new Date().toISOString(),runtime:process.version,cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,scope:'Warm Node CPU timings and geometry/draw accounting. No WebGL, browser/GPU, rendering passes or full-sector FPS measurement. Mask preparation belongs to asset loading; steady timing excludes rig posing. Settings switches include bounding-box skinning and batch rebuild. Background OS workloads are uncontrolled.',milliseconds:{stableMaskAndBatches,settingSwitch},roster,weapons,budgets:{liveCards:216,allocatedCards:408,sprayDraws:2,stainDraws:2,retainedStainActors:2,releasedCasualtyActors:2,releasedItemsPerActor:2,maxMaterialDrawsPerItem:9,decodedAtlasesMiB:4},sourceSha256:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync('dist/tactics/'+p,'utf8').replaceAll('\r\n','\n')).digest('hex')]))};
 fs.writeFileSync('artifacts/fatal-live/resources.json',JSON.stringify(report,null,2));console.log(JSON.stringify({milliseconds:report.milliseconds,maxSealDraws:Math.max(...roster.map(p=>p.sealDraws)),weaponDraws:weapons.map(w=>[w.weapon,w.draws])}));
}finally{if(model){model.batches.dispose();model.fatalMask.dispose();model.locomotion.dispose();model.worker.dispose();model.paint.dispose();}texture.dispose();}
