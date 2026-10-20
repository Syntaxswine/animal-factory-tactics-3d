import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {plan,render,mouthAt} from '../dist/tactics/vendor/babble/index.mjs';
import {normalizeSettings,readSettings,saveSettings} from '../dist/tactics/settings-3d.js';
import {VOICES,resolvePresentation,resolveMercPresentation,portraitSpecies} from '../dist/tactics/dialogue-presentation-manifest.js';
import {phrases,wordState,ByteCache} from '../dist/tactics/dialogue-timeline.js';
import {SpeechClient} from '../dist/tactics/dialogue-speech-client.js';
import {DialoguePerformance} from '../dist/tactics/dialogue-performance.js';
import {dialogueFixture} from '../dist/tactics/dialogue-fixture.js';
import {DialogueSession} from '../dist/tactics/dialogue-session.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {dialogueActorId} from '../dist/tactics/dialogue-state.js';
test('presentation settings migrate, bound invalid values and survive the Options write path',()=>{
 const old=normalizeSettings({difficulty:'standard',motion:'reduced'});assert.equal(old.dialogueSpeed,1);assert.equal(old.dialogueVolume,.7);assert.equal(old.dialogueTextAnimation,true);
 assert.equal(normalizeSettings({dialogueSpeed:9}).dialogueSpeed,2);assert.equal(normalizeSettings({dialogueSpeed:NaN}).dialogueSpeed,1);assert.equal(normalizeSettings({dialogueVolume:-1}).dialogueVolume,0);
 let stored;globalThis.localStorage={getItem:()=>stored,setItem:(k,v)=>stored=v};const prefs={...old,dialogueSpeed:.5,dialogueVolume:0,dialogueTextAnimation:false,dialoguePortraits:'static'};assert.ok(saveSettings(prefs));assert.deepEqual(readSettings(),prefs);saveSettings({...readSettings(),difficulty:'easy',motion:'full'});assert.equal(readSettings().dialogueSpeed,.5);assert.equal(readSettings().dialogueVolume,0);delete globalThis.localStorage;
});
test('voice follows stable identity across rename, clothes and save/load; guide donor stays donkey',()=>{
 const npc={characterId:'char_plateau_intro_guide',species:'donkey',outfit:'blue-hawaiian',name:'Guide'},d={id:'plateau_intro'},a=resolvePresentation(npc,d,'greeting','Hello');assert.deepEqual(a,resolvePresentation({...JSON.parse(JSON.stringify(npc)),name:'Renamed',outfit:'red-hats'},d,'greeting','Hello'));assert.deepEqual(a,resolvePresentation({...npc,campaignId:'campaign-instance'},d,'greeting','Hello'));assert.equal(a.voice.tongue,0);assert.equal(portraitSpecies({species:'donkey-guide'}),'donkey');assert.notEqual(VOICES.guide.voice.oq,VOICES.nadia.voice.oq);assert.notEqual(VOICES.guide.voice.rough,VOICES.nadia.voice.rough);
});
test('merc replies use their own stable voice, never the conversation NPC’s voice',()=>{
 const merc={characterId:'char_dialogue_merc_0',species:'horse',name:'Yakov',outfit:'olive'};
 const voice=resolveMercPresentation(merc);
 assert.deepEqual(resolveMercPresentation({...structuredClone(merc),name:'Renamed',outfit:'red-hats',campaignId:'new-campaign-record'}),voice);
 assert.notEqual(voice.id,resolvePresentation(merc,{id:'yard_bomb_permission'},'greeting','Hello').id);
 assert.notDeepEqual(voice,resolveMercPresentation({...merc,characterId:'char_dialogue_merc_1'}));
 const clip=render('I can help you with that.',voice.voice,{sampleRate:8000});
 assert.ok(clip.samples.some(value=>Math.abs(value)>.001));assert.equal(clip.plan.words.length,6);
});
test('every word retains source spans and scales at .5, 1 and 2 without pitch shifting; tongue changes only phonemes',()=>{
 const text="Don't stop, stop! Bring 42 charges and 100 HP. Ready?",voice={...VOICES.hen.voice,...VOICES.hen.language},base=plan(text,voice);
 for(const rate of [.5,1,2]){const clip=render(text,voice,{sampleRate:8000,timing:{duration:base.duration/rate}});assert.equal(clip.plan.voice.pitch,base.voice.pitch);assert.equal(clip.plan.words.length,base.words.length);
  clip.plan.words.forEach((w,i)=>{const b=base.words[i];assert.equal(w.c0,b.c0);assert.equal(w.c1,b.c1);assert.ok(Math.abs(w.t0-b.t0/rate)<1e-8);assert.ok(Math.abs(w.t1-b.t1/rate)<1e-8);const at=wordState(clip.plan,(w.t0+w.t1)/2);assert.equal(at.active,i);assert.equal(text.slice(w.c0,w.c1),text.slice(b.c0,b.c1));});assert.equal(mouthAt(clip.plan,clip.plan.duration),0);assert.equal(wordState(clip.plan,clip.plan.duration).active,-1);
 }
 const invented=plan(text,{...voice,tongue:7});assert.deepEqual(invented.words.map(({c0,c1})=>[c0,c1]),base.words.map(({c0,c1})=>[c0,c1]));
});
test('phrase splitting preserves all source characters and bounds ordinary long instructions',()=>{
 const text=('Bring the explosives to the control cabinet, then move safely away.\n').repeat(35),chunks=phrases(text);assert.ok(chunks.length>10);for(const c of chunks){assert.equal(c.text,text.slice(c.c0,c.c1));assert.ok(c.text.length<=140);}assert.equal(chunks.map(c=>c.text).join('').replace(/\s/g,''),text.replace(/\s/g,''));
});
test('byte cache evicts by actual PCM size and recent use',()=>{const c=new ByteCache(10);c.set('a',1,4);c.set('b',2,4);c.get('a');c.set('c',3,4);assert.equal(c.get('b'),null);assert.equal(c.bytes,8);c.budget(3);assert.equal(c.bytes,0);});
const drain=()=>new Promise(resolve=>setImmediate(resolve));
function fakePlayer({deferred=false,failed=false,audio=false}={}){
 let now=0,release,reject,requests=0,scheduled=0,stops=0,disconnects=0,starts=[],frames=[];
 const clip={samples:new Float32Array(100),sampleRate:100,plan:{duration:1,words:[{c0:0,c1:5,t0:0,t1:.45},{c0:6,c1:11,t0:.6,t1:1}],units:[{kind:'syllable',c0:0,c1:5,t0:0,t1:.45,stress:1},{kind:'syllable',c0:6,c1:11,t0:.6,t1:1,stress:1}]}};
 const client={prepare(){requests++;return failed?Promise.reject(Error('unavailable')):deferred?new Promise((a,b)=>{release=a;reject=b;}):Promise.resolve(clip);},cancel(){},reserve(){},dispose(){},resources:{workers:0}};
 const context=audio?{state:'running',get currentTime(){return now;},createBuffer:()=>({length:100,copyToChannel(){}}),createBufferSource:()=>({connect(){},disconnect(){disconnects++;},stop(){stops++;},start(at,offset){starts.push(offset);}}),createGain:()=>({gain:{value:0},connect(){},disconnect(){disconnects++;}})}:null;
 const player=new DialoguePerformance({client,context,now:()=>now,request:()=>++scheduled,cancel:()=>{},onFrame:f=>frames.push(f)}),settings=normalizeSettings({dialogueVolume:audio?.7:0}),data={key:'npc/node/1',text:'Hello world',profile:VOICES.guide,settings};
 return {player,data,clip,client,frames,get requests(){return requests;},get stops(){return stops;},get disconnects(){return disconnects;},starts,time:n=>now=n,release:()=>release(clip),reject:()=>reject(Error('late failure'))};
}
test('muted speech retains cue timing; pauses, skip, text off and Replay are presentation only',async()=>{
 const f=fakePlayer();f.player.begin(f.data);await drain();f.time(.2);f.player.tick();assert.equal(f.frames.at(-1).active.c0,0);assert.ok(f.frames.at(-1).opening>0);f.player.pause();f.time(20);assert.equal(f.player.position(),.2);assert.equal(f.frames.at(-1).opening,0);f.player.resume();f.time(20.5);f.player.tick();assert.equal(f.frames.at(-1).active.c0,6);
 f.player.settingsChanged({...f.data.settings,dialogueSpeed:2,dialogueTextAnimation:false});assert.equal(f.player.rate,1);assert.equal(f.frames.at(-1).active,null);assert.equal(f.frames.at(-1).revealed,11);f.player.skip();assert.equal(f.player.status,'done');f.player.replay({...f.data.settings,dialogueSpeed:2});await drain();assert.equal(f.player.rate,2);f.player.dispose();assert.equal(f.player.frame,0);
});
test('audio uses its clock and reschedules from the retained offset without changing playbackRate',async()=>{const f=fakePlayer({audio:true});f.player.begin(f.data);await drain();f.time(.4);f.player.pause();assert.equal(f.player.offset,.4);assert.ok(f.stops>0&&f.disconnects>0);f.time(8);f.player.resume();assert.deepEqual(f.starts,[0,.4]);f.player.dispose();});
test('refresh does not restart; stale preparation, closing, failure and pending-pause never leak playback',async()=>{
 const f=fakePlayer({deferred:true});assert.equal(f.player.begin(f.data),true);assert.equal(f.player.begin(f.data),false);assert.equal(f.requests,1);f.player.pause();f.release();await drain();assert.equal(f.player.status,'paused');f.player.dispose();assert.equal(f.player.status,'closed');
 const g=fakePlayer({deferred:true});g.player.begin(g.data);g.player.skip();g.release();await drain();assert.equal(g.player.status,'done');assert.equal(g.player.source,null);
 const h=fakePlayer({failed:true});h.player.begin(h.data);await drain();assert.equal(h.player.status,'fallback');assert.equal(h.frames.at(-1).revealed,11);h.player.dispose();
});
test('worker failure/cancellation rejects jobs, terminates the owned worker and clears cache',async()=>{
 class Worker {static all=[];constructor(){Worker.all.push(this);}postMessage(job){this.job=job;}terminate(){this.stopped=true;}}
 const c=new SpeechClient({WorkerClass:Worker,timeout:50}),job=c.prepare('a',VOICES.hen,1);c.cancel();await assert.rejects(job,/changed/);assert.ok(Worker.all[0].stopped);const bad=c.prepare('b',VOICES.hen,1);Worker.all.at(-1).onerror();await assert.rejects(bad,/failed/);c.dispose();assert.deepEqual(c.resources,{workers:0,pending:0,cacheBytes:0});
});
test('slow preparation reveals readable text once, and delayed audio permission cannot restart a closed line',async()=>{
 const f=fakePlayer({deferred:true});f.player.readableDelay=1;f.player.begin(f.data);await new Promise(resolve=>setTimeout(resolve,5));assert.equal(f.frames.at(-1).revealed,11);f.release();await drain();f.time(.2);f.player.tick();assert.equal(f.frames.at(-1).revealed,11);f.player.dispose();
 const g=fakePlayer({audio:true});g.player.begin(g.data);await drain();g.player.pause();g.player.context.state='suspended';let resolve;g.player.context.resume=()=>new Promise(done=>{resolve=done;});g.player.resume();g.player.dispose();resolve();await drain();assert.equal(g.player.status,'closed');assert.equal(g.player.source,null);
});
test('voice and text both off are instant and prepare no audio; unmuting retains the timed-text offset',async()=>{
 const f=fakePlayer();f.player.begin({...f.data,settings:{...f.data.settings,dialogueTextAnimation:false}});assert.equal(f.requests,0);assert.equal(f.player.status,'done');assert.equal(f.frames.at(-1).revealed,11);f.player.dispose();
 const g=fakePlayer({audio:true});g.player.begin({...g.data,settings:{...g.data.settings,dialogueVolume:0}});await drain();g.time(.3);g.player.settingsChanged(g.data.settings);assert.deepEqual(g.starts,[.3]);g.player.dispose();
});
test('presentation keys change only at committed navigation; checked result is not exposed before checkpoint',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(url,'utf8'))}),map=await dialogueFixture(fetcher),state=createGame(1947,map,true,'easy',{social:true,awareness:true,statSystem:true});startEncounterClock(state);let commit;
 const s=new DialogueSession({source:()=>({state,dialogue:state.dialogue}),catalog:{definitions:{},errors:{}},commit:next=>new Promise(resolve=>{commit=()=>{state.dialogue=next;resolve();};})}),n=state.units.find(u=>u.character?.dialogueRef==='yard_bomb_permission'),who=name=>state.units.find(u=>u.name===name);s.show(n,who('Misha'));const key=s.refresh().presentationKey;s.show(n,who('Anya'));assert.equal(s.refresh().presentationKey,key);s.show(n,who('Misha'));assert.equal(s.actors().speaker,who('Misha'));const option=s.refresh().choices.find(p=>p.choice.id==='offer'),promise=s.choose('offer',option.token);assert.equal(s.refresh().presentationKey,key);assert.equal(s.refresh().receipt,null);commit();await promise;assert.notEqual(s.refresh().presentationKey,key);const result=s.refresh();s.show(n,who('Anya'));assert.equal(s.refresh().line,result.line);assert.equal(s.refresh().presentationKey,result.presentationKey);
});

test('worker rejects oversized preparation before producing transferable PCM',async()=>{
 const replies=[];globalThis.self={postMessage:reply=>replies.push(reply)};
 try{await import('../dist/tactics/dialogue-speech-worker.js');self.onmessage({data:{id:1,text:'Hello '.repeat(500),profile:VOICES.guide,rate:.5}});assert.match(replies[0].error,/budget/);assert.equal(replies[0].clip,undefined);
 self.onmessage({data:{id:2,text:'Hello.',profile:VOICES.guide,rate:1}});assert.ok(replies[1].clip.samples.byteLength<2*1024*1024);assert.equal(replies[1].clip.plan.words[0].c0,0);
 }finally{delete globalThis.self;}
});
