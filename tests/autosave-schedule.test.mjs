import test from 'node:test';
import assert from 'node:assert/strict';
import {AutosaveSchedule,AUTOSAVE_INTERVAL_MS} from '../dist/tactics/autosave-schedule.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,openCampaignSector,activeState} from '../dist/tactics/campaign-model.js';
import {CampaignSession} from '../dist/tactics/campaign-store.js';
import {restoreCampaign,captureCampaign} from '../dist/tactics/campaign-save.js';
import {move,stepMovement} from '../dist/tactics/core/engine.js';

test('five real movement steps coalesce; continuing changes never postpone the fixed checkpoint deadline',async()=>{
 const c=createCampaign(openingContent(),{id:'autosave-walk'}),s=openCampaignSector(c,70),u=s.units[0],schedule=new AutosaveSchedule(s,0);let writes=0,saved;
 const session=new CampaignSession(c,async(slot,record)=>{writes++;saved=record;});
 assert.ok(move(s,u,u.x+5,u.y,u.z||0));
 for(let i=1;i<=5;i++){stepMovement(s);assert.equal(schedule.due(s,i*1000),false);}
 assert.equal(writes,0);assert.ok(schedule.dirty(s));assert.ok(schedule.due(s,AUTOSAVE_INTERVAL_MS));
 const snapshot=schedule.snapshot(s);await session.save();schedule.saved(snapshot,AUTOSAVE_INTERVAL_MS);
 assert.equal(writes,1);assert.equal(activeState(session.campaign),s);assert.equal(activeState(restoreCampaign(saved)).units[0].x,u.x);
 for(let now=31000;now<60000;now+=1000){s.revision++;assert.equal(schedule.due(s,now),false);}
 assert.equal(schedule.due(s,60000),true);
});

test('round and final outcome boundaries and hiding a dirty tab checkpoint immediately; inspection alone stays clean',()=>{
 const s={revision:1,round:1,phase:'player',clock:{minutes:480}},p=new AutosaveSchedule(s,0);
 assert.equal(p.due(s,60000),false);s.revision++;assert.equal(p.due(s,1),false);assert.equal(p.due(s,1,{hidden:true}),true);
 s.round++;assert.equal(p.due(s,2),true);p.reset(s,2);s.phase='won';assert.equal(p.due(s,3),true);
 p.reset(s,3);s.clock.minutes++;assert.equal(p.due(s,30003),true);
});

test('only the captured revision becomes clean after a slow write; failure leaves the deadline due',()=>{
 const s={revision:1,round:1,phase:'explore'},p=new AutosaveSchedule(s,0);s.revision=2;const snapshot=p.snapshot(s);
 s.revision=3;p.saved(snapshot,30000);assert.equal(p.dirty(s),true);assert.equal(p.due(s,60000),true);
 assert.equal(p.due(s,60001),true);p.reset(s,60001);assert.equal(p.due(s,90001),false);
});

test('a pending save owns a detached compact record, preserves live identities, and rejects a competing transition without applying it',async()=>{
 const c=createCampaign(openingContent(),{id:'pending-checkpoint'}),s=openCampaignSector(c,70),u=s.units[0];let release,record;
 const session=new CampaignSession(c,async(slot,r)=>{record=r;await new Promise(resolve=>release=resolve);}),revision=c.revision;
 const saving=session.save();assert.equal(session.busy,true);assert.equal(c.revision,revision);assert.equal(activeState(session.campaign),s);
 let applied=false;await assert.rejects(()=>session.transition(()=>{applied=true;}),/already in progress/);assert.equal(applied,false);
 const storedHp=record.data.characters[u.campaignId].unit.hp;u.hp--;assert.equal(record.data.characters[u.campaignId].unit.hp,storedHp);
 assert.equal(record.data.sectors[70].state.units,undefined);assert.equal(record.data.sectors[70].state.definition,undefined);
 release();await saving;assert.equal(s.units[0],u);assert.equal(session.savedRevision,record.revision);assert.equal(session.busy,false);
});

test('failed and stale ordinary saves never advance committed revisions, and validation still catches edits after an earlier good checkpoint',async()=>{
 const c=createCampaign(openingContent(),{id:'checkpoint-fail'});openCampaignSector(c,70);let writes=0;
 const session=new CampaignSession(c,async()=>{writes++;throw Error('disk full');}),before=c.revision;
 await assert.rejects(()=>session.save(),/disk full/);assert.equal(c.revision,before);assert.equal(session.savedRevision,before);assert.equal(session.busy,false);
 c.assignments[70].map.terrain[0][0]='unknown';await assert.rejects(()=>session.save(),/damaged/);assert.equal(writes,1);
 c.assignments[70].map.terrain[0][0]='yard';captureCampaign(c);
 let stored=captureCampaign(c);const persist=async(slot,r,expected)=>{if(expected.revision!==stored.revision)throw Error('Stale checkpoint');stored=r;};
 const a=new CampaignSession(restoreCampaign(stored),persist),b=new CampaignSession(restoreCampaign(stored),persist);await a.save();
 const stale=b.savedRevision;await assert.rejects(()=>b.save(),/Stale/);assert.equal(b.savedRevision,stale);assert.equal(b.campaign.revision,stale);
});

test('checkpoint terrain rows are detached, retain destruction and leave authored definitions unchanged',()=>{
 const c=createCampaign(openingContent(),{id:'checkpoint-terrain'}),s=openCampaignSector(c,70),before=captureCampaign(c),authored=c.assignments[70].map.terrain[10][10];
 s.map[10][10]='void';const after=captureCampaign(c);
 assert.equal(before.data.sectors[70].state.map[10][10],authored);
 assert.equal(after.data.sectors[70].state.map[10][10],'void');assert.equal(after.data.assignments[70].map.terrain[10][10],authored);
 s.map[10][10]='floor';c.assignments[70].map.terrain[10][10]='water';
 assert.equal(after.data.sectors[70].state.map[10][10],'void');assert.equal(after.data.assignments[70].map.terrain[10][10],authored);
 assert.equal(activeState(restoreCampaign(after)).map[10][10],'void');
});
