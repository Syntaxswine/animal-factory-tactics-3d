import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BattleAudio,SOUND_VOICES,SOUND_DECODED_BYTES} from '../dist/tactics/battle-audio.js';
import {BATTLE_SOUNDS} from '../dist/tactics/battle-sound-data.js';
import {normalizeSettings,saveSettings,readSettings} from '../dist/tactics/settings-3d.js';
import {BattleCombat,dischargeDelay} from '../dist/tactics/battle-combat.js';
import {attack} from '../dist/tactics/core/engine.js';
import {impactScene,resolveImpactCase} from '../tools/gunshot-impact-cases.mjs';

function fixture(options={}){
 const nodes=[],listeners=new Map(),context={currentTime:0,state:'suspended',decodes:0,createGain(){return node({gain:{value:1}});},createStereoPanner(){return node({pan:{value:0}});},createBufferSource(){return node({start(time){this.started=time;},stop(){this.stopped=true;}});},destination:{},async decodeAudioData(){this.decodes++;return {length:4410,numberOfChannels:1};},async resume(){this.state='running';},async suspend(){this.state='suspended';},async close(){this.state='closed';}};
 function node(value){const n={...value,connect(next){this.connected=next;},disconnect(){this.connected=null;}};nodes.push(n);return n;}
 let created=0;const errors=[],audio=new BattleAudio({target:{addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);}},fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(44)}),makeContext:()=>{created++;return context;},onError:e=>errors.push(e),...options});
 return {audio,context,nodes,listeners,errors,get created(){return created;},async ready(){await audio.ready;await audio.unlock();},dispose(){audio.dispose();}};
}
const quietState=()=>({selected:0,units:[{id:0,team:'squad',hp:100,x:10,y:10,z:0}],detected:new Set(),effect:null,fireAnimations:[]});
const emptyCombat=()=>({active:null,queue:[]});

test('clips preload without an AudioContext; a gesture decodes once and disposal owns the context and listeners',async()=>{
 const f=fixture();try{await f.audio.ready;assert.equal(f.created,0);assert.equal(f.audio.encoded.size,11);await f.audio.unlock();await f.audio.unlock();assert.equal(f.created,1);assert.equal(f.context.decodes,11);assert.equal(f.audio.buffers.size,11);assert.deepEqual(f.errors,[]);}finally{f.dispose();}assert.equal(f.context.state,'closed');assert.equal(f.listeners.size,0);assert.equal(f.audio.buffers.size,0);
});

test('a real rifle discharge plays at its presented impact exactly once without changing any game state',async()=>{
 const f=fixture(),c=impactScene({weapon:'rifle'}),combat=new BattleCombat();await f.ready();try{
  combat.observe(c.state,0);f.audio.observe(c.state,combat,0);assert.ok(attack(c.state,c.shooter,c.target,false,false,'torso',false,'full'));const before=structuredClone(c.state);
  combat.observe(c.state,0);f.audio.observe(c.state,combat,0);assert.equal(f.audio.played,0);combat.advance(380);f.audio.observe(c.state,combat,380);assert.equal(f.audio.played,1);assert.equal(f.audio.lastCue.id,'mosin-m38');f.audio.observe(c.state,combat,381);assert.equal(f.audio.played,1);assert.deepEqual(c.state,before);
 }finally{f.dispose();}
});

test('actual grenade and RPG receipts without firearm IDs still produce one explosion, at the fuse for a queued grenade',async()=>{
 for(const weapon of ['grenade','rpg']){const f=fixture(),c=impactScene({weapon}),combat=new BattleCombat();await f.ready();try{
  combat.observe(c.state,0);f.audio.observe(c.state,combat,0);assert.ok(attack(c.state,c.shooter,c.target,false,false,'torso',false,'hip'));const before=structuredClone(c.state);combat.observe(c.state,0);f.audio.observe(c.state,combat,0);
  if(weapon==='grenade'){assert.equal(f.audio.played,0);combat.advance(dischargeDelay(combat.active));f.audio.observe(c.state,combat,dischargeDelay(combat.active));}
  assert.equal(f.audio.played,1,weapon);assert.equal(f.audio.lastCue.id,weapon==='grenade'?'explosion-large':'explosion-deep');f.audio.observe(c.state,combat,9000);assert.equal(f.audio.played,1);assert.deepEqual(c.state,before);
 }finally{f.dispose();}}
});

test('three actual automatic discharges play three single reports; shotgun pellets share one report and pump',async()=>{
 for(const weapon of ['assault','shotgun']){const f=fixture(),c=impactScene({weapon,hp:500,range:2}),combat=new BattleCombat();await f.ready();try{
  combat.observe(c.state,0);f.audio.observe(c.state,combat,0);assert.ok(attack(c.state,c.shooter,c.target,weapon==='assault',false,'torso',false,'hip'));combat.observe(c.state,0);f.audio.observe(c.state,combat,0);
  if(weapon==='assault'){combat.advance(260);f.audio.observe(c.state,combat,260);combat.advance(520);f.audio.observe(c.state,combat,520);assert.equal(f.audio.played,3);assert.equal(f.audio.lastCue.id,'ak47-shot');}
  else{assert.equal(f.audio.played,2);assert.equal(f.audio.lastCue.id,'shotgun-pump');assert.equal(f.audio.voices[1].source.started,.35);}
 }finally{f.dispose();}}
});

test('loading historical effects and changing mute settings cannot replay them',async()=>{
 const f=fixture(),c=resolveImpactCase({weapon:'rifle'}),combat=new BattleCombat();await f.ready();try{
  combat.observe(c.state,0);f.audio.observe(c.state,combat,0);combat.advance(380);f.audio.observe(c.state,combat,380);assert.equal(f.audio.played,0);
  const e=structuredClone(c.state.effect.sequence[0]);e.dischargeId='shot:2/d:0';c.state.effect={...e,sequence:[e]};f.audio.setVolume(0);combat.observe(c.state,1100);f.audio.observe(c.state,combat,1100);combat.advance(1480);f.audio.observe(c.state,combat,1480);assert.equal(f.audio.played,0);f.audio.setVolume(.7);f.audio.observe(c.state,combat,1481);assert.equal(f.audio.played,0);
 }finally{f.dispose();}
});

test('hearing uses nearby living squad members and stereo direction without revealing an unseen shooter',async()=>{
 const f=fixture(),state=quietState();await f.ready();try{const before=structuredClone(state);assert.ok(f.audio.play('tt33',{x:20,y:10,z:5},state));assert.ok(f.audio.lastCue.pan>0);assert.ok(f.audio.lastCue.gain<1);assert.equal(f.audio.play('tt33',{x:200,y:10},state),false);state.units.push({id:1,team:'squad',hp:100,x:180,y:10,z:0});assert.ok(f.audio.play('tt33',{x:200,y:10},state));state.units.pop();assert.deepEqual(state,before);}finally{f.dispose();}
});

test('tank/barrel sounds wait for the matching discharge and deduplicate the two event streams',async()=>{
 const f=fixture(),state=quietState(),combat=emptyCombat();await f.ready();try{
  f.audio.observe(state,combat,0);const e={dischargeId:'shot:1/d:0',weapon:'rifle',shooter:0,ax:10,ay:10,bx:12,by:10,explosions:[{kind:'barrel',fireSequence:1}]};state.effect={...e,sequence:[e]};state.fireAnimations.push({sequence:1,kind:'barrel',route:[{x:12,y:10,z:0}]});combat.active={event:structuredClone(e),start:0,rifle:true,phase:{discharged:false}};f.audio.observe(state,combat,0);assert.equal(f.audio.played,0);assert.equal(f.audio.pending.size,1);combat.active.phase.discharged=true;f.audio.observe(state,combat,380);assert.equal(f.audio.played,2);assert.equal(f.audio.lastCue.id,'explosion-large');f.audio.observe(state,combat,381);assert.equal(f.audio.played,2);
 }finally{f.dispose();}
});

test('material receipts deduplicate pellets while keeping glass, metal, tin and damaged masonry distinct',async()=>{
 const f=fixture(),state=quietState(),combat=emptyCombat();await f.ready();try{
  f.audio.observe(state,combat,0);const trajectories=['glass','glass','steel','tin'].map(material=>({kind:'wall',material,x:12,y:10,z:0})),e={dischargeId:'shot:2/d:0',weapon:'hands',ax:10,ay:10,bx:99,by:99,trajectories,structures:[{damage:20}]};state.effect={sequence:[e]};f.audio.observe(state,combat,0);assert.equal(f.audio.played,4);assert.equal(f.audio.lastCue.id,'rock-debris');assert.equal(f.audio.lastCue.point.x,12,'Debris belongs to the intercepted wall, not the intended target behind it');assert.equal(f.audio.voices.at(-1).source.started,.12);
 }finally{f.dispose();}
});

test('voice admission, priority, pause, mute and restart retire audio resources',async()=>{
 const f=fixture(),state=quietState();await f.ready();try{
  for(let i=0;i<30;i++)f.audio.play('explosion-deep',{x:12,y:10},state,{priority:2});assert.equal(f.audio.voices.length,SOUND_VOICES);assert.equal(f.audio.play('metal',{x:12,y:10},state,{priority:.5}),false);assert.ok(f.nodes.some(n=>n.stopped));f.audio.setPaused(true);assert.equal(f.context.state,'suspended');assert.equal(f.audio.play('tt33',{x:12,y:10},state),false);f.audio.setPaused(false);assert.equal(f.context.state,'running');f.audio.setVolume(0);assert.equal(f.audio.voices.length,0);f.audio.setVolume(.7);f.audio.play('tt33',{x:12,y:10},state);f.audio.reset();assert.equal(f.audio.voices.length,0);
 }finally{f.dispose();}
});

test('overlapping effects share a mix compressor before the independent volume control',async()=>{
 const f=fixture(),compressor={connect(node){this.connected=node;},disconnect(){this.connected=null;}};for(const key of ['threshold','knee','ratio','attack','release'])compressor[key]={value:0};f.context.createDynamicsCompressor=()=>compressor;await f.ready();try{
  assert.equal(compressor.ratio.value,20);assert.equal(compressor.connected,f.audio.master);assert.ok(f.audio.play('tt33',{x:10,y:10},quietState()));assert.equal(f.audio.voices[0].pan.connected,compressor);f.audio.setVolume(.3);assert.equal(f.audio.master.gain.value,.3);assert.equal(compressor.threshold.value,-9);
 }finally{f.dispose();}assert.equal(compressor.connected,null);
});

test('additional gestures during a pause cannot briefly resume and advance a suspended sound',async()=>{
 const f=fixture();await f.ready();try{let resumed=0;f.context.resume=async()=>{resumed++;f.context.state='running';};f.audio.setPaused(true);await f.audio.unlock();await f.audio.unlock();assert.equal(resumed,0);assert.equal(f.context.state,'suspended');f.audio.setPaused(false);assert.equal(resumed,1);}finally{f.dispose();}
});

test('optional missing/late audio never blocks play or replays a missed cue after decoding',async()=>{
 let finish;const f=fixture({urls:{'mosin-m38':'test.wav'},fetcher:()=>new Promise(resolve=>{finish=resolve;})}),state=quietState(),combat=emptyCombat();await f.audio.unlock();try{
  f.audio.observe(state,combat,0);state.effect={sequence:[{dischargeId:'shot:1/d:0',weapon:'rifle',ax:10,ay:10}]};f.audio.observe(state,combat,0);assert.equal(f.audio.played,0);finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(44)});await f.audio.ready;f.audio.observe(state,combat,1);assert.equal(f.audio.played,0);state.effect={sequence:[{dischargeId:'shot:2/d:0',weapon:'rifle',ax:10,ay:10}]};f.audio.observe(state,combat,2);assert.equal(f.audio.played,1);
 }finally{f.dispose();}
 const bad=fixture({urls:{bad:'bad.wav'},fetcher:async()=>({ok:false,status:503})});await bad.audio.ready;assert.equal(bad.errors.length,1);bad.dispose();
});

test('late decode completion after disposal and oversized buffers cannot resurrect resources or playback',async()=>{
 let finish;const f=fixture({urls:{tt33:'test.wav'}});await f.audio.ready;f.context.decodeAudioData=()=>new Promise(resolve=>{finish=resolve;});const opening=f.audio.unlock();await Promise.resolve();await Promise.resolve();f.dispose();finish({length:4410,numberOfChannels:1});await opening;assert.equal(f.audio.buffers.size,0);assert.equal(f.audio.voices.length,0);assert.equal(f.context.state,'closed');assert.equal(f.listeners.size,0);
 const large=fixture({urls:{tt33:'test.wav'}});try{await large.audio.ready;large.context.decodeAudioData=async()=>({length:SOUND_DECODED_BYTES,numberOfChannels:1});await large.audio.unlock();assert.equal(large.audio.buffers.size,0);assert.match(large.errors[0],/budget/);}finally{large.dispose();}
});

test('sound settings are bounded, saved and independent of voice volume and blood presentation',()=>{
 const old=globalThis.localStorage,data=new Map();globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};try{
  assert.equal(normalizeSettings(null).effectsVolume,.7);assert.equal(normalizeSettings({effectsVolume:NaN}).effectsVolume,.7);assert.equal(normalizeSettings({effectsVolume:4}).effectsVolume,1);assert.equal(normalizeSettings({effectsVolume:-1}).effectsVolume,0);assert.ok(saveSettings({...readSettings(),effectsVolume:0,dialogueVolume:.3,blood:'off'}));assert.equal(readSettings().effectsVolume,0);assert.equal(readSettings().dialogueVolume,.3);assert.equal(readSettings().blood,'off');
 }finally{globalThis.localStorage=old;}
});

test('the eleven shipped clips match provenance hashes, mono PCM budgets and the single-report automatic sample',()=>{
 const directory=new URL('../dist/assets/audio/babble-sfx/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));assert.equal(manifest.effects.length,11);assert.match(manifest.bank.note,/non-commercial/);let decoded=0;
 for(const e of manifest.effects){const bytes=fs.readFileSync(new URL(e.file,directory));assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),44100);assert.equal(bytes.readUInt16LE(34),16);assert.equal(e.recipe.settings.amount,.7);assert.equal(e.recipe.sliceLayer.level,.2);assert.ok(e.recipe.license.url);assert.ok(e.frames>0&&e.frames<44100*6);decoded+=e.frames*4;assert.ok(Object.values(BATTLE_SOUNDS).some(url=>url.endsWith(e.file)));if(e.id==='ak47-shot')assert.equal(e.frames,Math.round(.135*44100));}
 assert.ok(decoded<=SOUND_DECODED_BYTES);assert.equal(Object.keys(BATTLE_SOUNDS).length,11);
});
