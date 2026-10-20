import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {HEN_VOICE,createIntroVoice} from '../dist/tactics/intro-sprites/voice.js';
import {HANDLER_LINE,LINE_SPEECH,SHOTS} from '../dist/tactics/intro-sprites/ambush.js';

const read=name=>readFileSync(new URL('../dist/tactics/intro-sprites/'+name,import.meta.url));
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
class Media {
 constructor(){this.paused=true;this.currentTime=0;this.plays=0;this.events=new Map();}
 play(){this.plays++;this.paused=false;return this.result??Promise.resolve();}
 pause(){this.paused=true;}
 addEventListener(name,fn){this.events.set(name,fn);}
 removeEventListener(name,fn){if(this.events.get(name)===fn)this.events.delete(name);}
}

test('the blended Bright hen export and its cues match the existing scene',()=>{
 const wav=read('audio/bright-hen-blended.wav'),cues=JSON.parse(read('audio/bright-hen-blended.cues.json'));
 assert.equal(createHash('sha256').update(wav).digest('hex'),'b1262ef9df9a9d3f4ce4b013b54405d9c213c7c4e03070d31590865aa6f0683a');
 assert.ok(new URL(HEN_VOICE.src).pathname.endsWith('/audio/bright-hen-blended.wav'));
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
 assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),1);
 assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);
 near(wav.readUInt32LE(40)/wav.readUInt32LE(28),HEN_VOICE.duration);
 assert.equal(cues.text,HANDLER_LINE);assert.equal(cues.morph.name,'morphed-bright-hen');
 assert.deepEqual(JSON.parse(read('audio/bright-hen-blended.morph.json')),cues.morph);
 assert.equal(cues.morph.settings.amount,.7);assert.equal(cues.morph.sliceLayer.level,.18);
 assert.deepEqual(cues.morph.sources.map(s=>s.id),['bright-hen','sliced-bright-hen']);
 near(cues.sceneStart,HEN_VOICE.start);near(cues.audioDuration,HEN_VOICE.duration);
 let at=0,index=0;
 for(const [syllable,duration] of LINE_SPEECH.syllables){
  if(syllable){near(cues.timing.cues[index][0],at);near(cues.timing.cues[index++][1],at+duration);}
  at+=duration;
 }
 assert.equal(index,14);assert.equal(cues.timing.cues.length,index);
});

test('voice starts only during her line and stops at the end or on pause',()=>{
 const audio=new Media(),voice=createIntroVoice(audio),play={playing:true};
 voice.sync(0,play);voice.sync(HEN_VOICE.start-.01,play);assert.equal(audio.plays,0);
 voice.sync(HEN_VOICE.start,play);assert.equal(audio.plays,1);near(audio.currentTime,0);
 voice.sync(HEN_VOICE.start+.3,play);assert.equal(audio.plays,1);
 voice.sync(HEN_VOICE.start+.3);assert.equal(audio.paused,true);
 voice.sync(HEN_VOICE.start+.3,play);assert.equal(audio.plays,2);near(audio.currentTime,.3);
 voice.sync(HEN_VOICE.start+HEN_VOICE.duration,play);assert.equal(audio.paused,true);
 voice.dispose();
});

test('seeking, playback speed and mute keep one clip on the visual timeline',()=>{
 const audio=new Media(),voice=createIntroVoice(audio),play={playing:true};
 voice.sync(6,play);near(audio.currentTime,1.05);
 voice.sync(15,play);assert.equal(audio.paused,true);
 voice.sync(6.5,{playing:true,rate:.5,muted:true});
 near(audio.currentTime,1.55);assert.equal(audio.playbackRate,.5);assert.equal(audio.muted,true);
 voice.sync(6.5,{playing:true,rate:.25,muted:false});
 assert.equal(audio.playbackRate,.25);assert.equal(audio.muted,false);assert.equal(audio.plays,2);
 audio.currentTime=.1;voice.sync(7,play);near(audio.currentTime,2.05);
 voice.sync(0,play);voice.sync(HEN_VOICE.start,play);near(audio.currentTime,0);
 voice.dispose();assert.equal(audio.paused,true);voice.sync(6,play);assert.equal(audio.paused,true);
});

test('a delayed play cannot revive audio after pause or disposal',async()=>{
 for(const dispose of [false,true]){
  const audio=new Media();let finish;
  audio.result=new Promise(resolve=>{finish=resolve;});
  const voice=createIntroVoice(audio);voice.sync(6,{playing:true});
  if(dispose)voice.dispose();else voice.sync(6);
  audio.paused=false;finish();await Promise.resolve();
  assert.equal(audio.paused,true);
 }
});

test('autoplay failure reports once, retries after pause, and ignores stale failures',async()=>{
 const audio=new Media(),errors=[];let reject,available=0;
 audio.result=new Promise((_,fail)=>{reject=fail;});
 const voice=createIntroVoice(audio,{onUnavailable:m=>errors.push(m),onAvailable:()=>available++});
 voice.sync(6,{playing:true});reject(Object.assign(new Error('Blocked'),{name:'NotAllowedError'}));
 await Promise.resolve();voice.sync(6.1,{playing:true});assert.equal(errors.length,1);assert.equal(audio.plays,1);
 voice.sync(6.1);audio.result=Promise.resolve();voice.sync(6.1,{playing:true});assert.equal(audio.plays,2);
 await Promise.resolve();assert.equal(available,1,'a successful retry clears the unavailable notice');
 voice.sync(0);audio.result=new Promise((_,fail)=>{reject=fail;});voice.sync(6,{playing:true});voice.sync(6);
 reject(Object.assign(new Error('Interrupted'),{name:'AbortError'}));await Promise.resolve();assert.equal(errors.length,1);
 voice.dispose();
});

test('a missing audio asset leaves the visual player usable and releases its listener',()=>{
 const audio=new Media(),errors=[],voice=createIntroVoice(audio,{onUnavailable:m=>errors.push(m)});
 audio.events.get('error')();assert.equal(errors.length,1);
 assert.doesNotThrow(()=>voice.sync(30,{playing:true}));voice.dispose();assert.equal(audio.events.size,0);
});

test('the real page wires pause, seek, speed, mute and repeated restarts without extra frame loops',async()=>{
 const html=read('intro.html').toString(),script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/gm,'');
 const audio=new Media(),nodes=new Map(),frames=new Map(),events=new Map(),documentEvents=new Map();let next=0;
 const element=()=>({value:'1',textContent:'',children:[],setAttribute(){},append(child){this.children.push(child);}});
 for(const id of ['status','voice-status','view','time','clock','caption','speed','play','restart','mute','shots'])nodes.set(id,element());
 nodes.set('voice',audio);
 const document={getElementById:id=>nodes.get(id),createElement:element,addEventListener:(key,fn)=>documentEvents.set(key,fn),hidden:false};
 const context={document,window:{},location:{search:''},URLSearchParams,performance:{now:()=>1000},
  requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),
  addEventListener:(key,fn)=>events.set(key,fn),SHOTS,PROOF_START:20.2,PROOF_END:35,KEYFRAME_TIMES:{0:22.4},
  loadAmbushAssets:async()=>({}),createAmbush:()=>({render:t=>({t})}),createIntroVoice,HEN_VOICE};
 await new vm.Script(`(async()=>{${script}})()`).runInNewContext(context);
 assert.equal(context.window.intro.ready,true);
 nodes.get('play').onclick();assert.equal(frames.size,1);
 for(let i=0;i<10;i++)nodes.get('restart').onclick();assert.equal(frames.size,1,'restart replaces the queued frame');
 nodes.get('time').value='6';nodes.get('time').oninput();assert.equal(frames.size,0);assert.equal(audio.paused,true);
 nodes.get('play').onclick();near(audio.currentTime,1.05);assert.equal(nodes.get('caption').textContent,HANDLER_LINE);
 nodes.get('speed').value='.5';nodes.get('speed').onchange();assert.equal(audio.playbackRate,.5);
 nodes.get('mute').onclick();assert.equal(audio.muted,true);
 nodes.get('shots').children.find(b=>b.textContent.startsWith('03 ')).onclick();assert.equal(audio.paused,true);assert.equal(frames.size,0);
 nodes.get('time').value='6';nodes.get('time').oninput();nodes.get('play').onclick();events.get('pagehide')();assert.equal(audio.paused,true);assert.equal(frames.size,0);
 nodes.get('play').onclick();document.hidden=true;documentEvents.get('visibilitychange')();assert.equal(audio.paused,true);assert.equal(frames.size,0);
});
