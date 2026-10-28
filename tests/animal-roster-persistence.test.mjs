import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,parseMap} from '../dist/tactics/core/maps.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {slate} from '../dist/tactics/core/recruits.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {hostileToPlayer} from '../dist/tactics/character-properties.js';
import {hudPortrait} from '../dist/tactics/battle-hud-model.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,openCampaignSector} from '../dist/tactics/campaign-model.js';
import {campaignCandidates,hireCampaignMerc} from '../dist/tactics/campaign-hiring.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';

for(const species of ['bear','bull','rabbit','dog']){
 for(const outfit of ['normal','red-hats'])test(`${species}/${outfit}: editor properties, NPC allegiance and encounter persistence agree`,()=>{
  const document=new EditingDocument().open(JSON.stringify(blankMap('Animal save journey')));
  const playerId=document.map.starts[0].character.id;
  document.updateCharacter(playerId,{species,outfit,weapon:'pistol'});
  assert.ok(document.apply({tool:'npc',start:{x:10,y:10,z:0},options:{species,outfit,weapon:'hands'}}).ok);
  const npcId=document.map.guards[0].character.id;
  document.updateCharacter(npcId,{character:{displayName:'Local resident',faction:'civilians',attitude:'neutral',combatBehavior:'cower'}});
  const portable=parseMap(document.export());
  assert.equal(document.units[0].species,species);
  assert.equal(document.units[0].outfit,outfit);
  const state=createGame(42,portable,true,'easy',{statSystem:true,awareness:true,social:true});startEncounterClock(state);
  const player=state.units[0],npc=state.units.find(u=>u.characterId===npcId);
  player.hp-=7;player.ap-=2;
  const before=structuredClone(state),record=captureEncounter(state,1234),loaded=restoreEncounter(record);
  assert.deepEqual(state,before,'saving must not replace or mutate live actors');
  for(const id of [player.id,npc.id]){
   const original=state.units.find(u=>u.id===id),restored=loaded.units.find(u=>u.id===id);
   for(const key of ['species','outfit','weapon','characterId','hp','ap'])assert.equal(restored[key],original[key],key);
   assert.equal(hudPortrait(restored),'../assets/characters/'+(outfit==='red-hats'?'red-hats/':'')+species+'-idle.png');
  }
  assert.equal(hostileToPlayer(loaded,loaded.units.find(u=>u.id===npc.id)),false);
 });
 test(`${species}: a real campaign hire survives checkpoint and sector deployment`,()=>{
  const seed=Array.from({length:64},(_,n)=>n).find(n=>slate(n,0).some(c=>c.species===species));assert.notEqual(seed,undefined);
  const content=openingContent(),campaign=createCampaign({...content,seed,reinforcements:[],reinforcement:null},{id:'animal-hire-'+species});
  const candidate=campaignCandidates(campaign).find(c=>c.species===species);assert.ok(candidate);
  campaign.money=100000;const oldIds=Object.keys(campaign.characters),money=campaign.money;
  const hired=hireCampaignMerc(campaign,candidate.key,'day',70),id=hired.campaignId;
  assert.equal(campaign.money,money-candidate.prices.day.price);
  const restored=restoreCampaign(captureCampaign(campaign));
  assert.equal(restored.characters[id].unit.species,species);
  for(const oldId of oldIds)assert.equal(restored.characters[oldId].unit.species,campaign.characters[oldId].unit.species);
  const state=openCampaignSector(restored,70),deployed=state.units.find(u=>u.campaignId===id);
  assert.equal(deployed.species,species);assert.equal(deployed.contract.paid,candidate.prices.day.price);
  assert.equal(hudPortrait(deployed),'../assets/characters/'+species+'-idle.png');
 });
}
