import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createSimpleTraversal,simpleTraversalPoint} from '../dist/tactics/simple-traversal.js';
import {BattleTraversal} from '../dist/tactics/battle-traversal.js';
import {toWorld} from '../dist/tactics/hybrid-world.js';
const event=kind=>({id:1,unitId:0,kind,from:{x:10,y:10,z:kind==='fall'?2:0},to:{x:kind==='ladder'?10:11,y:10,z:kind==='ladder'?1:0},height:2});

test('simple paths join exact endpoints and stay finite in both traversal directions',()=>{
 for(const kind of ['ladder','window','wall','fall']){const e=event(kind);for(const reverse of [false,true]){if(reverse)[e.from,e.to]=[e.to,e.from];assert.deepEqual(simpleTraversalPoint(e,0),toWorld(e.from));const last=simpleTraversalPoint(e,1);last.forEach((v,i)=>assert.ok(Math.abs(v-toWorld(e.to)[i])<1e-8));for(let i=0;i<=20;i++)assert.ok(simpleTraversalPoint(e,i/20).every(Number.isFinite));}}
});
for(const profile of ANIMAL_MOTION_CATALOG)test(profile.id+': simple climbs restore bones, equipment and temporary helpers on cancellation',()=>{
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group();root.add(worker.root);const posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile),model={worker,root,profile,posture,locomotion};
 try{for(const kind of ['ladder','window','wall','fall']){const saved=[];worker.root.traverse(o=>saved.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),v:o.visible}));const motion=createSimpleTraversal(model,event(kind),{heading:90});try{for(const t of [0,.2,.5,.8,1]){const p=motion.apply(t);assert.ok(p.worldRoot.every(Number.isFinite));assert.ok(worker.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));}}finally{motion.dispose();}for(const {o,p,q,s,v}of saved){assert.ok(o.position.equals(p),o.name);assert.ok(o.quaternion.equals(q),o.name);assert.ok(o.scale.equals(s),o.name);assert.equal(o.visible,v);}assert.equal(worker.root.getObjectByName('Equipment shoulder sling'),undefined);}}
 finally{locomotion.dispose();worker.dispose();}
});
test('group presentation queues each committed event once, supports cancellation, and never changes simulation',()=>{
 const a=event('ladder'),b={...event('window'),id:2,unitId:1},s={units:[{id:0,team:'squad',hp:100,weapon:'rifle'},{id:1,team:'squad',hp:100,weapon:'hands'}],simpleTraversal:b,simpleTraversals:[a,b]},before=structuredClone(s),v=new BattleTraversal(()=>{throw Error('Tile climbs must not prepare tower routes');});
 v.observe(s,0);assert.equal(v.active.event.unitId,0);assert.equal(v.queue.length,1);v.finish();v.observe(s,100);assert.equal(v.active.event.unitId,1);assert.equal(v.queue.length,0);v.observe(s,200,true);assert.equal(v.busy,false);v.observe(s,300);assert.equal(v.busy,false);assert.deepEqual(s,before);
});
