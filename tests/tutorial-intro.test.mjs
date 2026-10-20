import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {tutorialIntroFixture} from '../dist/tactics/tutorial-intro-fixture.js';
import {INTRO_DIALOGUE,DEMOLITION_CHARGE,demolitionCount,tutorialMissionValues,tutorialRoleErrors} from '../dist/tactics/tutorial-mission.js';
import {createGame,refresh,searchBody} from '../dist/tactics/core/engine.js';
import {blankMap,validateMap,passable} from '../dist/tactics/core/maps.js';
import {transferItem} from '../dist/tactics/battle-inventory.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {interactionPreview,performInteraction,nearbyInteractions} from '../dist/tactics/field-actions.js';
import {destroyStrategicSite,siteControlPoint,sitePoint,siteId} from '../dist/tactics/strategic-site-rules.js';
import {blastStrategicSites} from '../dist/tactics/strategic-site-damage.js';
import {DialogueSession} from '../dist/tactics/dialogue-session.js';
import {validateDialogue} from '../dist/tactics/dialogue-schema.js';
import {createDialogueState,getDialogueRecord,choicePreview,stageDialogue,validateDialogueState} from '../dist/tactics/dialogue-state.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,initializeSector} from '../dist/tactics/campaign-model.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';
const fetcher=async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(url,'utf8'))});
const map=await tutorialIntroFixture(fetcher),definition=map.dialogueDefinitions[INTRO_DIALOGUE];
const charge=count=>({type:'tool',kind:DEMOLITION_CHARGE,count});
const guide=s=>s.units.find(u=>u.character?.dialogueRef===INTRO_DIALOGUE);
function fresh(){const s=createGame(42,map,true,'easy',{social:true,awareness:true,statSystem:true});startEncounterClock(s);return s;}
function sessionFor(s,campaign){return new DialogueSession({source:()=>({state:s,campaign,dialogue:campaign?.dialogue||s.dialogue}),catalog:{definitions:{}},commit:()=>assert.fail('Information must not save a dialogue effect')});}
function approach(s,u,p){const q=siteControlPoint(p);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a={x:q.x+dx,y:q.y+dy,z:0};if(passable(s,a)){Object.assign(u,a);if(interactionPreview(s,u,'plant-explosives',p).ok)return;}}assert.fail('No legal approach');}

test('all eight inventory/objective combinations produce the intended intro and instructions',async()=>{
 for(const radio of [false,true])for(const sam of [false,true])for(const carried of [false,true]){
  const s=fresh(),u=s.units[0];if(carried)u.pack.push(charge(2));
  for(const role of [radio&&'plateau-radio',sam&&'plateau-sam'].filter(Boolean))destroyStrategicSite(s,s.props.find(p=>p.tutorialRole===role));
  const before=structuredClone(s),d=sessionFor(s);d.show(guide(s),u);const v=d.refresh();assert.equal(v.ready.ok,true,v.ready.reason);
  assert.equal(d.nodeId,radio?(sam?'town':'radio_down'):(sam?'sam_down':'greeting'));
  assert.equal(v.choices.length,radio&&sam?0:1);
  if(v.choices.length){const p=v.choices[0];assert.equal(p.choice.requires.variables.has_explosives,carried);assert.equal(await d.choose(p.choice.id,p.token),true);assert.match(d.refresh().line,carried?/Plant explosives/:/crate/);}
  if(radio&&sam)assert.match(v.line,/liberate the town/);
  d.close();d.show(guide(s),s.units[1]);assert.deepEqual(s,before,'no AP, time, RNG, inventory or objective effects from conversation');
 }
});
test('only conscious present squad inventory counts; opening a crate and dropping a charge do not count',()=>{
 const s=fresh(),u=s.units[0],crate=s.loot.find(p=>p.container?.id==='plateau-explosives');
 assert.equal(crate.items[0].count,2);crate.searched=true;assert.equal(tutorialMissionValues(s).has_explosives,false);
 u.pack.push(charge(1));assert.equal(tutorialMissionValues(s).has_explosives,true);
 for(const patch of [{away:true},{hp:0},{casualty:'bleeding'},{team:'guard'}]){const t=structuredClone(s);Object.assign(t.units[0],patch);assert.equal(tutorialMissionValues(t).has_explosives,false);}
 u.pack.pop();s.loot.push({x:u.x,y:u.y,z:0,items:[charge(1)]});assert.equal(tutorialMissionValues(s).has_explosives,false);
});
test('search and inventory transfer use real crate contents and survive save/load without replenishment',()=>{
 let s=fresh(),u=s.units[0],crate=s.loot.find(p=>p.container);Object.assign(u,{x:13,y:13});refresh(s);
 assert.equal(transferItem(s,u,{mode:'take',target:crate,index:0}),false);
 assert.equal(searchBody(s,u,crate),true);assert.equal(transferItem(s,u,{mode:'take',target:crate,index:0,count:2}),true);
 assert.equal(demolitionCount(u),2);assert.equal(crate.items.length,0);
 s=restoreEncounter(captureEncounter(s));assert.equal(s.loot.find(p=>p.container).items.length,0);assert.equal(demolitionCount(s.units[0]),2);
 const d=sessionFor(s);d.show(guide(s),s.units[1]);assert.equal(d.refresh().choices[0].choice.id,'brought_explosives');
});
test('planting requires the acting merc, proximity, AP and stamina, consumes once and leaves a persistent wreck',()=>{
 for(const role of ['plateau-radio','plateau-sam'])for(const rotated of [false,true]){
  const s=fresh(),u=s.units[0],p=s.props.find(p=>p.tutorialRole===role);p.rotated=rotated;u.pack.push(charge(2));s.phase='player';u.ap=30;
  const before=structuredClone(s);assert.equal(performInteraction(s,u,'plant-explosives',p),false);assert.deepEqual(s,before);
  approach(s,u,p);const good={ap:u.ap,stamina:u.stamina};
  for(const patch of [{ap:5},{stamina:0}]){Object.assign(u,patch);const b=structuredClone(s);assert.equal(performInteraction(s,u,'plant-explosives',p),false);assert.deepEqual(s,b);Object.assign(u,good);}
  assert.ok(nearbyInteractions(s,u).some(e=>e.kind==='plant-explosives'));p.sabotage=true;assert.equal(interactionPreview(s,u,'sabotage',p).ok,false,'no legacy free-sabotage bypass');
  assert.equal(performInteraction(s,u,'plant-explosives',p),true);assert.equal(u.ap,24);assert.equal(demolitionCount(u),1);
  const after=structuredClone(s);assert.equal(performInteraction(s,u,'plant-explosives',p),false);assert.deepEqual(s,after);
  const loaded=restoreEncounter(captureEncounter(s));assert.equal(tutorialMissionValues(loaded)[role==='plateau-radio'?'radio_destroyed':'sam_destroyed'],true);
 }
 const s=fresh(),u=s.units[0],p=s.props.find(p=>p.tutorialRole==='plateau-radio');s.units[1].pack.push(charge(2));assert.match(interactionPreview(s,u,'plant-explosives',p).reason,/This merc/);
 u.pack.push(charge(1));approach(s,u,p);const minutes=s.clock.minutes,ap=u.ap;assert.ok(performInteraction(s,u,'plant-explosives',p));assert.equal(s.clock.minutes,minutes+1);assert.equal(u.ap,ap);
});
test('other explosive weapons count; current world state invalidates a previously displayed option',async()=>{
 const s=fresh(),u=s.units[0],d=sessionFor(s);u.pack.push(charge(2));d.show(guide(s),u);const old=d.refresh().choices[0];
 u.pack.pop();assert.equal(await d.choose(old.choice.id,old.token),false);assert.equal(d.refresh().choices[0].choice.id,'need_explosives');
 const p=s.props.find(p=>p.tutorialRole==='plateau-radio');assert.equal(blastStrategicSites(s,{...sitePoint(p,[0,5,1]),propId:siteId(p)},5).length,1);
 assert.equal(d.refresh().ready.ok,true);assert.equal(d.nodeId,'radio_down');destroyStrategicSite(s,s.props.find(p=>p.tutorialRole==='plateau-sam'),{cause:'flame'});assert.match(d.refresh().line,/liberate the town/);
});
test('campaign variables follow sites across unvisited and visited sectors and preserve emptied crates',()=>{
 const content=openingContent(),indices=Object.keys(content.assignments),a=content.assignments[indices[0]].map,b=content.assignments[indices[1]].map;
 a.props.push({x:30,y:30,z:0,kind:'site-radio',tutorialRole:'plateau-radio'},{x:28,y:30,z:0,kind:'supply-chest-closed',tutorialRole:'plateau-explosives'});
 b.props.push({x:30,y:30,z:0,kind:'site-sam',tutorialRole:'plateau-sam'});
 const c=createCampaign(content,{id:'tutorial-intro-campaign'}),s=c.sectors[indices[0]].state;
 assert.deepEqual(tutorialMissionValues(s,c),{has_explosives:false,radio_destroyed:false,sam_destroyed:false});
 const remote=initializeSector(c,+indices[1]).state;destroyStrategicSite(remote,remote.props.find(p=>p.tutorialRole==='plateau-sam'));destroyStrategicSite(s,s.props.find(p=>p.tutorialRole==='plateau-radio'));
 const crate=s.loot.find(p=>p.container?.id==='plateau-explosives');crate.items=[];crate.searched=true;
 const loaded=restoreCampaign(captureCampaign(c)),current=loaded.sectors[indices[0]].state;
 assert.deepEqual(tutorialMissionValues(current,loaded),{has_explosives:false,radio_destroyed:true,sam_destroyed:true});initializeSector(loaded,+indices[0]);assert.equal(current.loot.find(p=>p.container?.id==='plateau-explosives').items.length,0);
});
test('editor guide/object roles survive undo, rotation, export/import and modular block placement',()=>{
 const d=new EditingDocument().open(JSON.stringify(map)),g=d.map.guards[0],id=g.character.id;
 d.updateCharacter(id,{character:{displayName:'Renamed guide',canTalk:false,dialogueRef:''}});d.tutorialGuide(id,definition);assert.equal(d.character(id).p.character.canTalk,true);d.undo();assert.equal(d.character(id).p.character.canTalk,false);d.redo();assert.equal(d.character(id).p.character.id,id);
 const m=blankMap('Radio role');m.props=[{x:8,y:8,z:0,kind:'site-radio'}];const e=new EditingDocument().open(JSON.stringify(m)),pick=()=>e.inspect(8,8,0,{mode:'prop'});
 e.tutorialObject(pick(),'plateau-radio');e.undo();assert.equal(e.map.props[0].tutorialRole,undefined);e.redo();e.rotate(pick());assert.equal(e.map.props[0].tutorialRole,'plateau-radio');
 const other=new EditingDocument().open(JSON.stringify(blankMap('Placed')));other.place(e.capture(0,0),1,1);assert.equal(other.map.props[0].tutorialRole,'plateau-radio');assert.throws(()=>other.place(e.capture(0,0),2,1),/Duplicate tutorial/);
 assert.equal(new EditingDocument().open(other.export()).map.props[0].tutorialRole,'plateau-radio');e.tutorialObject(pick(),'');assert.equal(e.map.props[0].tutorialRole,undefined);
});
test('missing, duplicate and mismatched roles are diagnosed; absence never means destroyed',()=>{
 const s=fresh();s.props=s.props.filter(p=>p.tutorialRole!=='plateau-sam');const d=sessionFor(s);d.show(guide(s),s.units[0]);assert.match(d.refresh().ready.reason,/assign exactly one Tutorial SAM/);d.close();assert.equal(d.open,false);
 for(const mutate of [m=>m.props.push({...m.props[1],x:50}),m=>m.props[1].tutorialRole='plateau-sam',m=>m.props[1].tutorialRole='run_code',m=>m.props[1].tutorialRole='constructor']){const m=structuredClone(map);mutate(m);assert.ok(tutorialRoleErrors(m).length);assert.ok(validateMap(m,{connectivity:false}).length);}
 const corrupt=fresh();corrupt.props[1].tutorialRole='bad';assert.throws(()=>captureEncounter(corrupt),/damaged/);
});
test('world conditions validate and checked receipts replay their historical read-only inputs',()=>{
 const d={schemaVersion:1,id:'world_check',version:1,variables:['has_explosives'],entry:[{node:'hello'}],nodes:{hello:{npc:'Permission?',choices:[{id:'try',text:'Ask.',requires:{variables:{has_explosives:true}},check:{attemptId:'ask',skill:'explosives',minimum:40,difficulty:50},outcomes:{success:{to:'yes'},failure:{to:'no'}}}]},yes:{npc:'Yes.'},no:{npc:'No.'}}};
 validateDialogue(d);const state=createDialogueState(12),u={id:'speaker',stats:{explosives:50}},record=getDialogueRecord(state,'npc',d),values={has_explosives:true},p=choicePreview(d,record,'hello','try',u,0,values),result=stageDialogue(state,d,'npc',u,'hello','try',p.token,0,values);
 assert.deepEqual(result.receipt.variables,values);validateDialogueState(result.next);const bad=structuredClone(result.next);Object.values(bad.records)[0].receipts[0].variables.has_explosives=false;assert.throws(()=>validateDialogueState(bad));
 for(const mutate of [v=>v.variables.push('execute'),v=>v.nodes.hello.choices[0].requires.variables.has_explosives=1,v=>v.nodes.hello.choices[0].requires.variables.radio_destroyed=true,v=>v.entry.unshift({when:{variables:{unknown:true}},node:'yes'})]){const v=structuredClone(d);mutate(v);assert.throws(()=>validateDialogue(v));}
});
