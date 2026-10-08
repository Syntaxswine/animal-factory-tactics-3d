import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle,rigKey} from '../dist/tactics/idle-motion.js';
import {IDLE_FITS} from '../dist/tactics/idle-fits.js';

// The table the study and the game read their idle limits from must be what the fit gives today. Every mammal must have
// its row (a changed rig changes its key), the table may hold no other, and a refit must match the row: three rigs on
// every run (the horse, nothing in the way; the rabbit, a neckerchief on its neck; the pig foreman, his forearms in his
// waistband), all eleven with IDLE_FITS_ALL=1 (a refit of all eleven takes about half an hour). When this fails after
// a change to a rig or to the fit, run `node tools/fit-idle-rigs.mjs`.
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url)));
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),REFIT=process.env.IDLE_FITS_ALL?MAMMALS.map(p=>p.id):['horse','rabbit','pig-foreman'];
const fitsOf=({nod,up,tilt,yaw,twist,swing,ease,shrug,weightShift,rounding})=>({nod,up,tilt,yaw,twist,swing,ease,shrug,weightShift,rounding});

test('every mammal has its row in the shipped idle fits, the table holds no other, and an idle made without refit reads it',()=>{
 const keys=new Set();
 for(const profile of MAMMALS){const worker=profile.create(load(profile.file)),key=rigKey(worker);keys.add(key);
  assert.ok(IDLE_FITS[key],profile.id+' has no row in idle-fits.js (run node tools/fit-idle-rigs.mjs)');
  const idle=createIdle(worker);assert.deepEqual(fitsOf(idle.fitted),IDLE_FITS[key],profile.id+' reads its row');idle.dispose();worker.dispose();}
 assert.deepEqual(Object.keys(IDLE_FITS).filter(k=>!keys.has(k)),[],'idle-fits.js rows for no catalog rig');
 assert.equal(keys.size,MAMMALS.length,'two mammals share a rig key');
});

test(`a refit matches the shipped row (${REFIT.join(', ')})`,()=>{
 for(const id of REFIT){const profile=MAMMALS.find(p=>p.id===id),worker=profile.create(load(profile.file)),fresh=createIdle(worker,{refit:true});
  assert.deepEqual(fitsOf(fresh.fitted),IDLE_FITS[rigKey(worker)],id+' fits differently from its row in idle-fits.js (run node tools/fit-idle-rigs.mjs)');fresh.dispose();worker.dispose();}
});

test('a rig key changes when the rig does',()=>{
 const profile=MAMMALS[0],a=profile.create(load(profile.file)),b=profile.create(load(profile.file));
 assert.equal(rigKey(a),rigKey(b));
 const p=b.parts[0].geometry.attributes.position;p.setY(0,p.getY(0)+.001);assert.notEqual(rigKey(a),rigKey(b));
 a.dispose();b.dispose();
});
