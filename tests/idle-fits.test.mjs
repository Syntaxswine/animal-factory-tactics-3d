import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle,rigKey} from '../dist/tactics/idle-motion.js';
import {IDLE_FITS} from '../dist/tactics/idle-fits.js';

// The table the study and the game read their idle limits from must be what the fit gives today. Every mammal must have
// its row (a changed rig changes its key), the table may hold no other, and a refit of every one of them must match its
// row (all eleven refit in about 30 s). When this fails after a change to a rig or to the fit, run
// `node tools/fit-idle-rigs.mjs`.
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url)));
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),REFIT=MAMMALS.map(p=>p.id);
const fitsOf=({nod,up,tilt,yaw,twist,swing,ease,shrug,weightShift,rounding})=>({nod,up,tilt,yaw,twist,swing,ease,shrug,weightShift,rounding});

test('every mammal has its row in the shipped idle fits, the table holds no other, and an idle made without refit reads it',()=>{
 const keys=new Set();
 for(const profile of MAMMALS){const worker=profile.create(load(profile.file)),key=rigKey(worker);keys.add(key);
  assert.ok(IDLE_FITS[key],profile.id+' has no row in idle-fits.js (run node tools/fit-idle-rigs.mjs)');
  const idle=createIdle(worker);assert.deepEqual(fitsOf(idle.fitted),IDLE_FITS[key],profile.id+' reads its row');idle.dispose();worker.dispose();}
 assert.deepEqual(Object.keys(IDLE_FITS).filter(k=>!keys.has(k)),[],'idle-fits.js rows for no catalog rig');
 assert.equal(keys.size,MAMMALS.length,'two mammals share a rig key');
});

test(`a refit of every mammal matches its shipped row`,()=>{
 for(const id of REFIT){const profile=MAMMALS.find(p=>p.id===id),worker=profile.create(load(profile.file)),fresh=createIdle(worker,{refit:true});
  assert.deepEqual(fitsOf(fresh.fitted),IDLE_FITS[rigKey(worker)],id+' fits differently from its row in idle-fits.js (run node tools/fit-idle-rigs.mjs)');fresh.dispose();worker.dispose();}
});

test('a rig key changes when anything the fit reads does: a vertex, a skin weight, a bone\'s rest turn or scale, the triangles\' winding',()=>{
 const profile=MAMMALS[0],fresh=()=>profile.create(load(profile.file)),a=fresh(),key=rigKey(a);
 const edits={
  'a vertex 1 mm up':w=>{const p=w.parts[0].geometry.attributes.position;p.setY(0,p.getY(0)+.001);},
  'two skull weights swapped between bones':w=>{const s=w.parts.find(m=>/skull/.test(m.name)).geometry.attributes;let i=0;while(!(s.skinWeight.getX(i)>0&&s.skinWeight.getY(i)>0&&Math.abs(s.skinWeight.getX(i)-s.skinWeight.getY(i))>.01))i++;const x=s.skinWeight.getX(i);s.skinWeight.setX(i,s.skinWeight.getY(i));s.skinWeight.setY(i,x);},
  'the head bone turned 1 degree at rest':w=>{w.bones.find(b=>b.name==='head').rotateZ(Math.PI/180);},
  'a hand bone scaled 1%':w=>{w.bones.find(b=>b.name==='hand1').scale.multiplyScalar(1.01);},
  'a shirt triangle wound the other way':w=>{const ix=w.parts.find(m=>/shirt/.test(m.name)).geometry.index;const t=ix.getX(1);ix.setX(1,ix.getX(2));ix.setX(2,t);}};
 for(const [what,edit] of Object.entries(edits)){const b=fresh();assert.equal(rigKey(b),key,'a fresh rig has the same key');edit(b);assert.notEqual(rigKey(b),key,what);b.dispose();}
 // weights in other slots, the same bones and weights: the same skinning, the same key
 const c=fresh(),s=c.parts.find(m=>/skull/.test(m.name)).geometry.attributes;for(let i=0;i<s.skinIndex.count;i++){const bi=[0,1,2,3].map(k=>s.skinIndex.getComponent(i,k)),bw=[0,1,2,3].map(k=>s.skinWeight.getComponent(i,k));s.skinIndex.setXYZW(i,bi[1],bi[0],bi[2],bi[3]);s.skinWeight.setXYZW(i,bw[1],bw[0],bw[2],bw[3]);}
 assert.equal(rigKey(c),key,'the same weights in other slots');c.dispose();a.dispose();
});
