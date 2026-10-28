import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {SPECIES,validateMap,parseMap} from '../dist/tactics/core/maps.js';
import {RECRUIT_SPECIES,slate,previewRecruit} from '../dist/tactics/core/recruits.js';
import {createGame,WEAPONS} from '../dist/tactics/core/engine.js';
import {WEAPON_MODELS,createWeaponModel} from '../dist/tactics/weapon-models.js';
import {supportsRoofMantle} from '../dist/tactics/roof-journey.js';
import {supportsLedgeDescent} from '../dist/tactics/ledge-descent-journey.js';
import {canAnimateLadder,ladderFrame} from '../dist/tactics/battle-traversal.js';
import {createLadderJourney} from '../dist/tactics/ladder-journey.js';
import {createLedgeDescent} from '../dist/tactics/ledge-descent.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {towerEntry,towerSlots,towerPost} from '../dist/tactics/tower-geometry.js';
import {createHorseChairMotion} from '../dist/tactics/horse-chair-motion.js';
import {hudPortrait} from '../dist/tactics/battle-hud-model.js';
import {characterRosterFixture} from '../dist/tactics/character-roster-fixture.js';
import {adaptCoreCompletedRoster} from '../tools/core-completed-roster-adapter.mjs';
const V=()=>new T.Vector3();
for(const species of ['bull','rabbit','dog']){
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===species),data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)));
test(species+': map round trips, runtime appearance, recruitment and native portraits',()=>{
 assert.ok(SPECIES.includes(species)&&RECRUIT_SPECIES.includes(species));
 const candidate=Array.from({length:64},(_,seed)=>slate(seed,0)).flat().find(c=>c.species===species);assert.ok(candidate);const recruit=previewRecruit(candidate,WEAPONS);assert.equal(recruit.species,species);assert.ok(Number.isFinite(recruit.hp)&&recruit.hp>0);
 const map=characterRosterFixture(species);assert.deepEqual(validateMap(map),[]);
 const copy=parseMap(JSON.stringify(map)),game=createGame(7,copy);
 assert.ok(game.units.length>=17&&game.units.every(u=>u.species===species));
 for(const outfit of ['normal','red-hats'])assert.equal(hudPortrait({species,outfit}),'../assets/characters/'+(outfit==='red-hats'?'red-hats/':'')+species+'-idle.png');
 for(const file of ['maps.js','recruits.js']){
  const label=file==='maps.js'?'SPECIES':'RECRUIT_SPECIES',input=Buffer.from('export const '+label+"=['horse','bear'];");
  const adapted=adaptCoreCompletedRoster(file,input);assert.ok(adapted.includes(Buffer.from("'"+species+"'")));assert.deepEqual(adaptCoreCompletedRoster(file,adapted),adapted);
 }
});

for(const id of Object.keys(WEAPON_MODELS)){
 test(species+'/'+id+': live traversal gates and complete descent keep native joints and contacts',()=>{
  const u={species,weapon:id,hp:100};assert.ok(supportsRoofMantle(u)&&supportsLedgeDescent(u));assert.ok(!supportsRoofMantle({...u,casualty:'bleeding'}));assert.ok(!supportsLedgeDescent({...u,hp:0}));
  for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower'])assert.ok(canAnimateLadder({access:'ladder',tower:{kind}},u));
  const w=profile.create(data),gun=createWeaponModel(id);w.equipWeapon(gun);let motion;
  try{motion=createLedgeDescent(w,profile);const lengths=w.bones.map(b=>b.position.length());
   for(let i=0;i<=80;i++){const s=motion.apply(i/80);for(const c of s.contacts)assert.ok(c.error<1e-5,id+' '+s.time+' '+c.id);w.bones.forEach((b,j)=>assert.ok(Math.abs(b.position.length()-lengths[j])<1e-8));assert.ok(gun.root.matrixWorld.elements.every(Number.isFinite));}
   const before=JSON.stringify(motion.apply(.43));motion.apply(1);assert.equal(JSON.stringify(motion.apply(.43)),before);
  }finally{motion?.dispose();w.equipWeapon();gun.dispose();w.dispose();}
 });
}
for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower'])test(species+': every weapon climbs and descends the '+kind+' with equipment restored',()=>{
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
test(species+': sitting and rising retain the shared seat, planted paws and reversible skin',()=>{
 const w=profile.create(data),before=w.parts.map(p=>p.geometry.attributes.position.array.slice());let m;
 try{m=createHorseChairMotion(w,{profile});const lengths=w.bones.map(b=>b.position.length());for(let i=0;i<=92;i++){m.apply(i*.1);const d=m.diagnostics();assert.ok(d.feet.every(f=>f.minY>=-.001&&f.minY<.001));if(i>=34&&i<=54)assert.ok(d.seatSupport);w.bones.forEach((b,j)=>assert.ok(Math.abs(b.position.length()-lengths[j])<1e-8||b.name==='hips'));for(const c of d.hands)if(c.contact)assert.ok(V().fromArray(c.target).distanceTo(V().fromArray(c.palm))<1e-5);}
 }finally{m?.dispose();w.parts.forEach((p,i)=>assert.deepEqual(p.geometry.attributes.position.array,before[i]));w.dispose();}
});

}
