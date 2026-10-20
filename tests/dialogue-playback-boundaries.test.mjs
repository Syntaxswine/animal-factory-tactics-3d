import test from 'node:test';
import assert from 'node:assert/strict';
import {DialoguePerformance} from '../dist/tactics/dialogue-performance.js';
import {normalizeSettings} from '../dist/tactics/settings-3d.js';
import {VOICES} from '../dist/tactics/dialogue-presentation-manifest.js';
const drain=()=>new Promise(resolve=>setImmediate(resolve));
const clip={samples:new Float32Array(100),sampleRate:100,plan:{duration:1,words:[],units:[]}};
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function playerWith(prepare){
 let time=0,starts=0;
 const context={state:'running',get currentTime(){return time;},
  createBuffer:()=>({length:100,copyToChannel(){}}),createBufferSource:()=>({connect(){},disconnect(){},stop(){},start(){starts++;}}),
  createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};
 const client={prepare,cancel(){},reserve(){},dispose(){}};
 const player=new DialoguePerformance({client,context,request:()=>1,cancel(){}});
 return {player,time:t=>{time=t;},get starts(){return starts;}};
}
const data={key:'line',text:'A'.repeat(130)+'. '+'B'.repeat(130)+'.',profile:VOICES.guide,settings:normalizeSettings({})};
test('pausing between prepared phrases never replays the preceding phrase',async()=>{
 const next=deferred();let requests=0;
 const f=playerWith(()=>++requests===1?Promise.resolve(clip):next.promise);
 try{
  f.player.begin(data);await drain();assert.equal(f.starts,1);
  f.time(1.1);f.player.tick();assert.equal(f.player.status,'loading');assert.equal(f.player.index,1);
  f.player.pause();f.player.resume();
  assert.equal(f.player.status,'loading','Continue waits for the current phrase');
  assert.equal(f.starts,1,'no replay of the finished phrase while the next is loading');
  next.resolve(clip);await drain();assert.equal(f.player.status,'playing');assert.equal(f.starts,2);
  assert.equal(f.player.clipStart,f.player.chunks[1].c0);
 }finally{f.player.dispose();}
});
test('a stale preparation cannot discard the new line prefetch',async()=>{
 const old=deferred(),next=deferred();let requests=0;
 const f=playerWith(()=>{requests++;return requests===1?old.promise:requests===2?Promise.resolve(clip):next.promise;});
 try{
  f.player.begin({...data,key:'old',text:'Old line.'});
  f.player.begin({...data,key:'new'});await drain();assert.equal(requests,3);
  old.resolve(clip);await drain();
  f.time(1.1);f.player.tick();assert.equal(requests,3,'the next phrase already has a pending preparation');
  next.resolve(clip);await drain();assert.equal(f.player.key,'new');assert.equal(f.starts,2);
 }finally{f.player.dispose();}
});
