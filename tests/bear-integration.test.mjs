import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {BEAR_PROFILE,BEAR_RED_HAT_PAINT} from '../dist/tactics/bear-worker.js';
import {ANIMAL_MOTION_FINDINGS} from '../dist/tactics/animal-motion-findings.js';
import {SPECIES,blankMap,validateMap,parseMap} from '../dist/tactics/core/maps.js';
import {RECRUIT_SPECIES} from '../dist/tactics/core/recruits.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {WEAPON_MODELS,createWeaponModel} from '../dist/tactics/weapon-models.js';
import {supportsRoofMantle} from '../dist/tactics/roof-journey.js';
import {supportsLedgeDescent} from '../dist/tactics/ledge-descent-journey.js';
import {canAnimateLadder,ladderFrame} from '../dist/tactics/battle-traversal.js';
import {createLadderJourney} from '../dist/tactics/ladder-journey.js';
import {createLedgeDescent} from '../dist/tactics/ledge-descent.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {towerEntry,towerSlots,towerPost} from '../dist/tactics/tower-geometry.js';
import {createHorseChairMotion} from '../dist/tactics/horse-chair-motion.js';
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='bear'),data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))),V=()=>new T.Vector3();
test('bear is accepted by placement, map round trips, runtime squad/guards and recruitment',()=>{
 assert.ok(SPECIES.includes('bear')&&RECRUIT_SPECIES.includes('bear'));assert.equal(profile.create,BEAR_PROFILE.create);assert.equal(profile.outfitPaints['red-hats'],BEAR_RED_HAT_PAINT);
 for(const p of ANIMAL_MOTION_CATALOG)assert.ok(ANIMAL_MOTION_FINDINGS[p.id]?.status&&ANIMAL_MOTION_FINDINGS[p.id]?.note,'Motion review must initialize for '+p.id);
 const map=blankMap('Bear deployment');map.starts.forEach((p,i)=>Object.assign(p,{species:'bear',outfit:i%2?'red-hats':'normal',weapon:'rifle'}));map.guards=[{x:14,y:14,z:0,species:'bear',outfit:'red-hats',weapon:'hmg'}];
 assert.deepEqual(validateMap(map),[]);const copy=parseMap(JSON.stringify(map));assert.equal(copy.guards[0].species,'bear');const game=createGame(7,copy);assert.ok(game.units.every(u=>u.species==='bear'));
});
for(const id of Object.keys(WEAPON_MODELS)){
 test('bear/'+id+': live traversal gates and complete descent keep native joints and contacts',()=>{
  const u={species:'bear',weapon:id,hp:100};assert.ok(supportsRoofMantle(u)&&supportsLedgeDescent(u));assert.ok(!supportsRoofMantle({...u,casualty:'bleeding'}));assert.ok(!supportsLedgeDescent({...u,hp:0}));
  for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower'])assert.ok(canAnimateLadder({access:'ladder',tower:{kind}},u));
  const w=profile.create(data),gun=createWeaponModel(id);w.equipWeapon(gun);let motion;
  try{motion=createLedgeDescent(w,profile);const lengths=w.bones.map(b=>b.position.length());
   for(let i=0;i<=80;i++){const s=motion.apply(i/80);for(const c of s.contacts)assert.ok(c.error<1e-5,id+' '+s.time+' '+c.id);w.bones.forEach((b,j)=>assert.ok(Math.abs(b.position.length()-lengths[j])<1e-8));assert.ok(gun.root.matrixWorld.elements.every(Number.isFinite));}
   const before=JSON.stringify(motion.apply(.43));motion.apply(1);assert.equal(JSON.stringify(motion.apply(.43)),before);
  }finally{motion?.dispose();w.equipWeapon();gun.dispose();w.dispose();}
 });
}
for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower'])test('bear: every weapon climbs and descends the '+kind+' with equipment restored',()=>{
 const tower={kind,x:10,y:10,z:0},bottom=towerEntry(tower),top=towerSlots(tower)[0];top.towerPost=towerPost(tower,top);
 for(const id of Object.keys(WEAPON_MODELS)){
  const w=profile.create(data),gun=createWeaponModel(id);w.equipWeapon(gun);const posture=createBattlePosture(w,profile);
  try{for(const direction of ['up','down']){
   const e={tower,direction,from:direction==='up'?bottom:top,to:direction==='up'?top:bottom},m=createLadderJourney(w,profile,e,ladderFrame(tower));
   try{const lengths=w.bones.map(b=>b.position.length());for(const phase of m.phases)for(const f of [.1,.5,.9]){const s=m.apply((phase.start+(phase.end-phase.start)*f)/m.duration);assert.ok(s.worldRoot.every(Number.isFinite));w.bones.forEach((b,j)=>assert.ok(Math.abs(b.position.length()-lengths[j])<1e-8));assert.equal(w.weapon,gun);for(const c of s.contacts||[])assert.ok(c.error<1e-5||c.kind==='weapon'&&c.grasp<1,id+' '+direction+' '+phase.label+' '+c.id+' '+c.grasp+' error '+c.error);}
    m.apply(1);assert.equal(m.climb.equipmentState,'carried');assert.ok(gun.root.visible);
   }finally{m.dispose();}
  }}finally{posture.resetTail();w.equipWeapon();gun.dispose();w.dispose();}
 }
});
test('bear: sitting and rising retain the shared seat, planted paws and reversible skin',()=>{
 const w=profile.create(data),before=w.parts.map(p=>p.geometry.attributes.position.array.slice());let m;
 try{m=createHorseChairMotion(w,{profile});const lengths=w.bones.map(b=>b.position.length());for(let i=0;i<=92;i++){m.apply(i*.1);const d=m.diagnostics();assert.ok(d.feet.every(f=>f.minY>=-.001&&f.minY<.001));if(i>=34&&i<=54)assert.ok(d.seatSupport);w.bones.forEach((b,j)=>assert.ok(Math.abs(b.position.length()-lengths[j])<1e-8||b.name==='hips'));for(const c of d.hands)if(c.contact)assert.ok(V().fromArray(c.target).distanceTo(V().fromArray(c.palm))<1e-5);}
 }finally{m?.dispose();w.parts.forEach((p,i)=>assert.deepEqual(p.geometry.attributes.position.array,before[i]));w.dispose();}
});
