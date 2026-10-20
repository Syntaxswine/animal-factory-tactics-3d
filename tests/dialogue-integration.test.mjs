import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dialogueFixture} from '../dist/tactics/dialogue-fixture.js';
import {createGame,refresh} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {dialogueReadiness,dialogueSpeaker} from '../dist/tactics/dialogue-rules.js';
import {DialogueSession} from '../dist/tactics/dialogue-session.js';
import {dialogueActorId,getDialogueRecord,choicePreview,stageDialogue} from '../dist/tactics/dialogue-state.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,activeState,initializeSector} from '../dist/tactics/campaign-model.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';
import {CampaignSession} from '../dist/tactics/campaign-store.js';
const fetcher=async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(url,'utf8'))}),map=await dialogueFixture(fetcher),bomb=map.dialogueDefinitions.yard_bomb_permission;
function fresh(){const s=createGame(1947,map,true,'easy',{social:true,awareness:true,statSystem:true});startEncounterClock(s);return s;}
function setup({persist=async()=>{}}={}){let state=fresh(),writes=0;const session=new DialogueSession({source:()=>({state,dialogue:state.dialogue,busy:false}),catalog:{definitions:{},errors:{}},commit:async(next,revision)=>{assert.equal(state.dialogue.revision,revision);const candidate={...state,dialogue:next},record=captureEncounter(candidate);await persist(record,++writes);state.dialogue=next;}});return {session,get state(){return state;},load:record=>state=restoreEncounter(record),get writes(){return writes;}};}
const selected=(s,name)=>s.units.find(u=>u.name===name),npc=s=>s.units.find(u=>u.character?.dialogueRef===bomb.id);
const option=(h,id)=>h.session.refresh().choices.find(c=>c.choice.id===id);
const select=(h,id)=>h.session.choose(id,option(h,id)?.token);

test('real map units evaluate the primary speaker, free facing, faction independence and readiness',()=>{
 const s=fresh(),n=npc(s),u=selected(s,'Misha');assert.equal(dialogueReadiness(s,n,u).ok,true);u.heading=270;assert.equal(dialogueReadiness(s,n,u).ok,true);
 const before=structuredClone(s);for(let i=0;i<100;i++)dialogueReadiness(s,n,u);assert.deepEqual(s,before);
 for(const change of [t=>npc(t).hp=0,t=>npc(t).npcFrightened=true,t=>npc(t).character.canTalk=false,t=>npc(t).character.attitude='hostile',t=>t.engaged=true,t=>t.phase='player',t=>t.phase='enemy',t=>t.detected.delete(n.id),t=>selected(t,'Misha').x=0,t=>selected(t,'Misha').z=1,t=>selected(t,'Misha').casualty='captured',t=>selected(t,'Misha').away=true,t=>t.queue.push({}),t=>selected(t,'Misha').hp=0]){const altered=structuredClone(s);change(altered);assert.equal(dialogueReadiness(altered,npc(altered),selected(altered,'Misha')).ok,false);}
 assert.equal(dialogueReadiness(s,n,u,{busy:true}).ok,false);assert.equal(dialogueReadiness(s,n,u,{sight:()=>false}).ok,false);
 n.character.faction='player';n.character.attitude='hostile';assert.equal(dialogueReadiness(s,n,u).ok,true);n.hostileToPlayer=true;assert.equal(dialogueReadiness(s,n,u).ok,false);
 const worker=s.units.find(u=>u.name==='Yard worker');worker.x=13;worker.y=13;s.detected.add(worker.id);assert.equal(dialogueReadiness(s,worker,selected(s,'Yakov')).ok,true);
});
test('speaker changes and information navigation are transient; effects are written once',async()=>{
 const h=setup(),s=h.state,before=structuredClone(s);h.session.show(npc(s),selected(s,'Yakov'));assert.equal(option(h,'offer'),undefined);
 h.session.switchSpeaker(dialogueActorId(selected(s,'Anya')));assert.equal(option(h,'offer').check.chance,20);
 h.session.switchSpeaker(dialogueActorId(selected(s,'Misha')));assert.equal(option(h,'offer').check.chance,40);assert.equal(s.selected,before.selected);
 await select(h,'ask');await select(h,'facts_back');assert.deepEqual(s,before);assert.equal(h.writes,0);
 const choice=option(h,'creator');await Promise.all([h.session.choose('creator',choice.token),h.session.choose('creator',choice.token)]);assert.equal(h.writes,1);assert.equal(s.dialogue.checkSeed,before.dialogue.checkSeed);
 await select(h,'plan_back');assert.equal(option(h,'offer').check.chance,50);await select(h,'offer');assert.equal(h.writes,2);
 assert.deepEqual({...s,dialogue:before.dialogue},before,'conversation never touches time, AP, inventory, position, allegiance or bomb actions');
 const result=h.session.response;h.session.close();h.session.show(npc(s),selected(s,'Anya'));assert.equal(option(h,'offer'),undefined);assert.equal(h.session.refresh().lastResponse.response,result.response);
});
test('checkpoint failures reveal no result, preserve seed/facts, and retry the identical candidate',async()=>{
 let reject=true,candidate;const h=setup({persist:async record=>{candidate??=record.state.dialogue;assert.deepEqual(record.state.dialogue,candidate);if(reject)throw Error('Disk full');}}),before=structuredClone(h.state);
 h.session.show(npc(h.state),selected(h.state,'Misha'));assert.equal(await select(h,'offer'),false);assert.equal(h.session.response,null);assert.match(h.session.error,/Disk full/);assert.deepEqual(h.state,before);
 reject=false;assert.equal(await h.session.retry(),true);assert.deepEqual(h.state.dialogue,candidate);assert.ok(h.session.response.roll);assert.equal(h.writes,2);
});
test('closing during a write remains safe; failed candidate can be abandoned without a roll',async()=>{
 let release;const waiting=new Promise(resolve=>release=resolve),h=setup({persist:()=>waiting});h.session.show(npc(h.state),selected(h.state,'Misha'));const pending=select(h,'offer');assert.equal(h.session.busy,true);h.session.close();release();await pending;assert.equal(h.session.open,false);assert.equal(h.state.dialogue.revision,1);
 const fail=setup({persist:async()=>{throw Error('Quota');}});fail.session.show(npc(fail.state),selected(fail.state,'Misha'));const before=structuredClone(fail.state);await select(fail,'offer');fail.session.close();assert.deepEqual(fail.state,before);assert.equal(fail.session.pending,null);
});
test('save/load preserves attempts and pinned response, migrates legacy saves, and rejects corrupt data atomically',async()=>{
 const h=setup();h.session.show(npc(h.state),selected(h.state,'Misha'));const before=captureEncounter(h.state);await select(h,'offer');const after=captureEncounter(h.state),response=h.session.response;
 h.session.close();h.load(after);h.session.show(npc(h.state),selected(h.state,'Anya'));assert.equal(h.session.refresh().lastResponse.response,response.response);assert.equal(option(h,'offer'),undefined);
 h.session.close();h.load(before);h.session.show(npc(h.state),selected(h.state,'Misha'));await select(h,'offer');assert.equal(h.session.response.roll,response.roll,'older manual save deliberately rewinds, deterministically');
 const bad=structuredClone(after);bad.state.dialogue.revision++;assert.throws(()=>restoreEncounter(bad),/Dialogue/);
 const old=structuredClone(before);delete old.state.dialogue;for(const u of old.state.units)delete u.characterId;const migrated=restoreEncounter(old);assert.equal(migrated.dialogue.initialSeed,(old.state.seed^0x4449414c)>>>0);assert.ok(migrated.units.every(dialogueActorId));assert.deepEqual(migrated.dialogue,restoreEncounter(captureEncounter(migrated)).dialogue);
});
test('missing content, hidden choices and changed conditions leave a safe closable session',async()=>{
 const h=setup(),u=selected(h.state,'Misha');npc(h.state).character.dialogueRef='absent';h.session.show(npc(h.state)||h.state.units[4],u);assert.match(h.session.refresh().ready.reason,/Missing dialogue/);h.session.close();
 npc(h.state);h.state.units[4].character.dialogueRef=bomb.id;h.session.show(npc(h.state),selected(h.state,'Yakov'));assert.equal(await h.session.choose('offer','invented'),false);assert.equal(h.writes,0);h.session.close();
 h.session.show(npc(h.state),u);const p=option(h,'offer');u.stats.explosives++;assert.equal(await h.session.choose('offer',p.token),false);assert.equal(h.writes,0);h.state.engaged=true;assert.match(h.session.refresh().ready.reason,/fighting/);h.session.close();
});
test('editor resources support undo, export, duplication, block remapping and explicit conflict handling',()=>{
 const d=new EditingDocument().open(JSON.stringify(map)),id=d.map.guards[0].character.id;const before=d.export(),updated=structuredClone(bomb);updated.version++;updated.nodes.greeting.npc='Updated draft.';assert.throws(()=>d.dialogueDefinition(updated),/Conflicting/);assert.equal(d.export(),before);
 d.dialogueDefinition(updated,{replace:true});d.undo();assert.equal(d.export(),before);d.redo();assert.equal(JSON.parse(d.export()).dialogueDefinitions[bomb.id].version,2);
 const copy=d.duplicateCharacter(id,{x:16,y:13,z:0});assert.notEqual(id,copy);d.updateCharacter(id,{character:{displayName:'Nadia renamed',scriptId:'renamed_warden'}});assert.equal(d.character(copy).p.character.dialogueRef,bomb.id);
 const block=d.capture(0,0),target=new EditingDocument().open(JSON.stringify(blankMap('Copies')));target.place(block,1,1);target.place(block,2,1);assert.equal(new Set(target.map.guards.map(p=>p.character.id)).size,target.map.guards.length);assert.deepEqual(target.map.dialogueDefinitions,block.dialogueDefinitions);assert.deepEqual(JSON.parse(new EditingDocument().open(target.export()).export()),JSON.parse(target.export()));
 const bad=structuredClone(block);bad.dialogueDefinitions[bomb.id].version=3;const prior=target.export();assert.throws(()=>target.place(bad,3,1),/Conflicting/);assert.equal(target.export(),prior);
});
test('campaign owns one dialogue state and checkpoints atomically across sector changes and saves',async()=>{
 const content=openingContent(),index=Object.keys(content.assignments)[0];content.assignments[index].map.dialogueDefinitions=map.dialogueDefinitions;
 const c=createCampaign(content,{id:'dialogue-campaign'});assert.ok(c.dialogue);assert.ok(Object.values(c.sectors).every(sector=>!sector.state?.dialogue));
 let refuse=true,stored,expected;const store=new CampaignSession(c,async(slot,record,revision)=>{expected=revision;if(refuse)throw Error('disk full');stored=record;});
 const n=Object.values(c.characters).find(r=>r.unit.character?.category==='npc').id,who={id:Object.keys(c.characters)[0],archetype:'Creator',stats:{explosives:65}},rec=getDialogueRecord(c.dialogue,n,bomb),p=choicePreview(bomb,rec,'greeting','offer',who,0),result=stageDialogue(c.dialogue,bomb,n,who,'greeting','offer',p.token,c.clock.minutes),before=structuredClone(c.dialogue);
 await assert.rejects(store.transition(next=>next.dialogue=result.next),/disk full/);assert.deepEqual(c.dialogue,before);
 refuse=false;await store.transition(next=>next.dialogue=result.next);assert.deepEqual(expected,{id:c.id,revision:c.revision});assert.equal(store.campaign.dialogue.revision,1);const restored=restoreCampaign(stored);assert.deepEqual(restored.dialogue,result.next);
 const nextIndex=Object.keys(restored.assignments).find(i=>!restored.sectors[i]?.initialized);if(nextIndex)initializeSector(restored,+nextIndex);assert.deepEqual(restored.dialogue,result.next);assert.ok(Object.values(restored.sectors).every(sector=>!sector.state?.dialogue));
 const legacy=captureCampaign(c);delete legacy.data.dialogue;assert.equal(restoreCampaign(legacy).dialogue.initialSeed,(c.seed^0x4449414c)>>>0);
});
