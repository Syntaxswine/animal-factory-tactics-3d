import test from 'node:test';
import assert from 'node:assert/strict';
import {DefeatFlow,DEFEAT_DELAY_MS,DEFEAT_NOTICE_MS} from '../dist/tactics/battle-defeat.js';
import {isDeceased,defeatSummary} from '../dist/tactics/mercenary-status.js';

const lost=()=>({phase:'lost',units:[{team:'squad',hp:0,casualty:'dead'}]});
function setup(complete=async()=>{}){const calls=[],flow=new DefeatFlow({announce:summary=>calls.push(summary.title),complete:async s=>{calls.push('save');await complete(s);},navigate:()=>calls.push('navigate'),failed:e=>calls.push(e.message)});let now=0;return {flow,calls,tick:(s,ms=0,options={})=>{if(!ms)flow.tick(s,now,options);for(let n=0;n<ms;n+=100)flow.tick(s,now+=100,options);}};}
test('a defeat waits three seconds, announces it, then returns exactly once',async()=>{
 const {flow,calls,tick}=setup(),s=lost();tick(s);tick(s,DEFEAT_DELAY_MS-100);assert.deepEqual(calls,[]);tick(s,100);assert.deepEqual(calls,['Your squad has died']);
 tick(s,DEFEAT_NOTICE_MS);await flow.pending;tick(s,10000);assert.deepEqual(calls,['Your squad has died','save','navigate']);
});
test('one death, bleeding or a victory cannot trigger defeat',()=>{
 const {flow,calls,tick}=setup();for(const phase of ['player','enemy','explore','won']){const s={...lost(),phase};tick(s);tick(s,10000);assert.equal(flow.active,false);}assert.deepEqual(calls,[]);
});
test('a loaded defeat works without resuming the tactical clock',async()=>{
 const {flow,calls,tick}=setup(),s=lost();tick(s);tick(s,6000);await flow.pending;assert.equal(calls.at(-1),'navigate');
});
test('hidden tabs and in-progress storage do not consume the notice',async()=>{
 const {flow,calls,tick}=setup(),s=lost();tick(s);tick(s,10000,{suspended:true});assert.deepEqual(calls,[]);tick(s,3000);assert.equal(calls.length,1);tick(s,10000,{busy:true});assert.equal(calls.length,1);tick(s,2500);await flow.pending;assert.equal(calls.at(-1),'navigate');
});
test('a new encounter cancels a pending delay and an obsolete async completion',async()=>{
 let release;const {flow,calls,tick}=setup(()=>new Promise(resolve=>release=resolve)),s=lost();tick(s);tick(s,2000);tick({...s,phase:'explore'},10000);assert.deepEqual(calls,[]);
 tick(s);tick(s,5500);const pending=flow.pending;await Promise.resolve();tick({...s,phase:'explore'});release();await pending;assert(!calls.includes('navigate'));
});
test('a failed checkpoint stays in the battle and explicit retry completes once',async()=>{
 let tries=0;const {flow,calls,tick}=setup(async()=>{if(!tries++)throw Error('Disk full');}),s=lost();tick(s);tick(s,5500);await flow.pending;assert.equal(flow.stage,'error');assert.deepEqual(calls,['Your squad has died','save','Disk full']);tick(s,10000);assert.equal(tries,1);await flow.finish();assert.equal(calls.at(-1),'navigate');assert.equal(tries,2);
});
test('deceased labels never include bleeding, stabilized, captured or departed mercs',()=>{
 for(const casualty of ['bleeding','stable','captured','quit'])assert.equal(isDeceased({hp:0,casualty}),false,casualty);
 assert.equal(isDeceased({hp:0,casualty:'dead'}),true);assert.equal(isDeceased({hp:0}),true);assert.equal(isDeceased({hp:1}),false);
 const s=lost();s.units.push({team:'squad',hp:0,casualty:'captured'});assert.equal(defeatSummary(s).title,'Squad defeated');assert.match(defeatSummary(s).text,/1 deceased.*1 captured/);
});
