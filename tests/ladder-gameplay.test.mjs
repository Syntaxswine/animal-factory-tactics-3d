import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';import {BattleTraversal,ladderFrame,canAnimateLadder} from '../dist/tactics/battle-traversal.js';import {createLadderJourney} from '../dist/tactics/ladder-journey.js';import {exportLadderRoutes,importLadderRoutes,clearLadderRoutes} from '../dist/tactics/ladder-motion.js';import {createBattlePosture} from '../dist/tactics/battle-posture.js';import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';import {towerEntry,towerSlots,towerPost} from '../dist/tactics/tower-geometry.js';import {toWorld} from '../dist/tactics/hybrid-world.js';
const fixture=(kind,rotated=false,slot=0,direction='up')=>{const tower={kind,x:10,y:10,z:1,rotated},bottom=towerEntry(tower),top=towerSlots(tower)[slot];top.towerPost=towerPost(tower,top);return {id:1,unitId:0,access:'ladder',tower,direction,from:direction==='up'?bottom:top,to:direction==='up'?top:bottom};};
function model(profile){const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group();root.add(worker.root);const posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile);return {worker,root,profile,posture,locomotion};}
for(const species of ['horse','pig-foreman','pig-director','hen'])for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower'])test(species+' '+kind+': live controller selects approved route and restores after every interruption',async()=>{
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===species),m=model(profile),weapon=species==='hen'?'hands':'rifle';let v;
 try{
  if(species!=='hen'){
   clearLadderRoutes();const e=fixture(kind),warm=createLadderJourney(m.worker,profile,e,ladderFrame(e.tower));warm.dispose();const data=structuredClone(exportLadderRoutes());clearLadderRoutes();importLadderRoutes(data);
  }
  for(const direction of ['up','down'])for(const rotated of [false,true])for(const stop of ['complete','cancel','casualty','removed','weapon']){
   const e=fixture(kind,rotated,3,direction),unit={id:0,species,weapon,hp:100,team:'squad',ap:6,heading:37,...e.to},state={units:[unit],towerTraversal:e,clock:{minutes:100}},before=structuredClone(state);
   v=new BattleTraversal(()=>Promise.resolve());v.observe(state,0);assert.equal(v.pose(m,unit,0),false);assert.equal(v.preparing,true);await Promise.resolve();assert.equal(v.pose(m,unit,1),true);
   const journey=v.active.motion;assert.equal(!!journey.apply(0).unarmed,species==='hen');assert.ok(m.worker.root.position.distanceTo(new T.Vector3(...toWorld(e.from)))<1e-7);
   const phase=journey.phases.find(p=>p.label==='Climb'),time=(phase.start+phase.end)*500+1;v.pose(m,unit,time);assert.equal(v.busy,true);
   if(stop==='complete'){v.pose(m,unit,journey.duration*1000+1);assert.ok(m.worker.root.position.distanceTo(new T.Vector3(...toWorld(e.to)))<1e-7);v.observe(state,journey.duration*1000+1);}
   if(stop==='cancel')v.observe(state,time,true);
   if(stop==='casualty'){unit.hp=0;unit.casualty='bleeding';v.observe(state,time);}
   if(stop==='removed'){unit.away=true;v.observe(state,time);}
   if(stop==='weapon'){unit.weapon='pistol';v.observe(state,time);}
   assert.equal(v.busy,false);assert.equal(m.drawRequested,false);assert.equal(m.signature,null);assert.equal(m.worker.root.getObjectByName('wing brace -1'),undefined);assert.equal(m.worker.root.getObjectByName('Equipment shoulder sling'),undefined);
   const expected=structuredClone(before);Object.assign(expected.units[0],stop==='casualty'?{hp:0,casualty:'bleeding'}:stop==='removed'?{away:true}:stop==='weapon'?{weapon:'pistol'}:{});assert.deepEqual(state,expected);
   m.locomotion.apply({...unit,distance:0,blend:0,pose:{}});m.posture.apply({...unit,pose:{down:stop==='casualty'?1:0}});assert.ok(m.worker.parts.every(p=>p.matrixWorld.elements.every(Number.isFinite)));v.observe(state,time+20000);assert.equal(v.busy,false);
  }
 }finally{v?.clear();m.locomotion.dispose();m.worker.dispose();}
});
test('equipment gates preserve reviewed clearance limits',()=>{for(const species of ['horse','pig-foreman','pig-director','hen'])for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower'])for(const weapon of ['hands','rifle','pistol','flamethrower']){const expected=species==='hen'?weapon==='hands':species.startsWith('pig')||kind==='wooden-spotlight-tower'?weapon==='rifle':true;assert.equal(canAnimateLadder(fixture(kind),{species,weapon,hp:100}),expected);}});
test('preparation can be cancelled or interrupted without late playback or resource changes',async()=>{let ready;const v=new BattleTraversal(()=>new Promise(resolve=>{ready=resolve;})),e=fixture('wooden-spotlight-tower'),unit={id:0,species:'horse',weapon:'rifle',team:'squad',hp:100,...e.to},s={units:[unit],towerTraversal:e},m={profile:{id:'horse'}};v.observe(s,0);v.pose(m,unit,0);v.observe(s,1,true);ready();await Promise.resolve();assert.equal(v.busy,false);v.observe(s,100);assert.equal(v.busy,false);});

test('failed background preparation surfaces an error without changing encounter state',async()=>{const e=fixture('wooden-spotlight-tower'),unit={id:0,species:'horse',weapon:'rifle',team:'squad',hp:100,...e.to},s={units:[unit],towerTraversal:e},before=structuredClone(s),m={profile:{id:'horse'}},v=new BattleTraversal(()=>Promise.reject(Error('offline worker')));v.observe(s,0);v.pose(m,unit,0);await Promise.resolve();assert.throws(()=>v.pose(m,unit,1),/offline worker/);v.finish();assert.equal(v.busy,false);assert.deepEqual(s,before);});
