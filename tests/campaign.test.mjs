import test from 'node:test';
import assert from 'node:assert/strict';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,activeState,initializeSector,openCampaignSector,finishCampaignEncounter,orderCampaignTravel,advanceCampaign,retreatCampaign,splitCampaignGroup,syncCampaignEncounter,reconcileCampaign,resolveCharacterReference,landingPlan} from '../dist/tactics/campaign-model.js';
import {captureCampaign,restoreCampaign,checkpointTransition} from '../dist/tactics/campaign-save.js';
import {CampaignSession} from '../dist/tactics/campaign-store.js';
import {planRoute} from '../dist/tactics/overmap-travel.js';
import {canUseSectorInventory,sectorInventory} from '../dist/tactics/sector-inventory.js';
import {transferItem,inventoryAction} from '../dist/tactics/battle-inventory.js';
import {refresh,attack,stepEnemy,searchBody,pileOpen,previewAttack} from '../dist/tactics/core/engine.js';
import {settleEncounterRounds} from '../dist/tactics/encounter-clock.js';
const content=openingContent();
const fresh=()=>createCampaign(content,{id:'regression-campaign'});
const guards=(c,index=71)=>c.sectors[index].population.map(id=>c.characters[id].unit).filter(u=>u.team==='guard'&&u.hp>0);
function checkpoint(){const c=fresh();orderCampaignTravel(c,'group-1',71);advanceCampaign(c,100);openCampaignSector(c,71);return c;}
function dead(c,u,drop=true){u.hp=0;u.casualty='dead';u.ap=0;if(drop)activeState(c).loot.push({x:u.x,y:u.y,z:u.z,body:u.id,searched:false,items:[{type:'weapon',kind:'rifle',rounds:3,condition:47}]});}
function elapsed(c,m){activeState(c).clock.minutes+=m;syncCampaignEncounter(c);}

test('six residents become four after retreat and return, then seven after an actual travelling reinforcement arrival',()=>{
 let c=checkpoint(),s=activeState(c);const original=guards(c),ids=original.map(u=>u.campaignId);original[2].hp-=17;original[2].ammo.rifle=1;
 dead(c,original[0]);dead(c,original[1]);refresh(s);syncCampaignEncounter(c);assert.equal(guards(c).length,4);
 retreatCampaign(c,'group-1',70);advanceCampaign(c,100);orderCampaignTravel(c,'group-1',71);advanceCampaign(c,100);openCampaignSector(c,71);
 assert.equal(guards(c).length,4);assert.equal(c.characters[ids[2]].unit.ammo.rifle,1);const hp=c.characters[ids[2]].unit.hp;
 elapsed(c,90);assert.equal(guards(c).length,7);assert.equal(c.characters[ids[2]].unit.hp,hp);
 for(let i=0;i<3;i++){c=restoreCampaign(captureCampaign(c));assert.equal(guards(c).length,7);assert.equal(c.characters[ids[2]].unit.hp,hp);}
 assert.equal(new Set(Object.values(c.characters).map(r=>r.unit.id)).size,Object.keys(c.characters).length);
});

test('empty initialized sectors stay empty and previsit arrivals initialize original residents only once',()=>{
 let c=fresh();advanceCampaign(c,400);assert.equal(guards(c).length,9);assert.equal(c.sectors[71].owner,'red-hats');assert(c.sectors[71].initialized);initializeSector(c,71);assert.equal(guards(c).length,9);
 c=restoreCampaign(captureCampaign(c));initializeSector(c,71);assert.equal(guards(c).length,9);
 for(const u of guards(c))u.hp=0,u.casualty='dead';reconcileCampaign(c);assert.equal(c.sectors[71].population.length,0);
 c=restoreCampaign(captureCampaign(c));initializeSector(c,71);assert.equal(c.sectors[71].population.length,0);
});

test('sector instances map authored references independently; unavailable people do not resolve or respawn',()=>{
 const c=fresh();c.assignments[71].map=structuredClone(c.assignments[70].map);initializeSector(c,71);
 const a=resolveCharacterReference(c,70,'char_safehouse_guide'),b=resolveCharacterReference(c,71,'char_safehouse_guide');assert(a&&b);assert.notEqual(a.campaignId,b.campaignId);
 a.character.displayName='New name';a.character.scriptId='renamed';assert.equal(resolveCharacterReference(c,70,'char_safehouse_guide'),a);
 a.hp=0;a.casualty='dead';reconcileCampaign(c);assert.equal(resolveCharacterReference(c,70,'char_safehouse_guide'),null);assert.equal(resolveCharacterReference(c,71,'char_safehouse_guide'),b);
});

test('all peaceful floors share original item records; closed containers reveal nothing until a normal local search',()=>{
 let c=fresh(),s=openCampaignSector(c,70),u=s.units.find(u=>u.id===0),chest=s.loot.find(p=>p.container),upper=s.loot.find(p=>p.z===1);
 assert(canUseSectorInventory(s,u));assert(!sectorInventory(s,u).includes(chest));assert.equal(transferItem(s,u,{mode:'take',sector:true,target:chest,index:0}),false);
 assert(transferItem(s,u,{mode:'take',sector:true,target:upper,index:0}));assert.equal(upper.items.length,0);
 const location={x:u.x,y:u.y};u.x=230;u.y=100;assert.equal(searchBody(s,u,chest),false);u.x=231;u.y=119;assert(searchBody(s,u,chest));assert(pileOpen(chest));
 const before=structuredClone(chest.items);c=restoreCampaign(captureCampaign(c));s=activeState(c);u=s.units.find(u=>u.id===0);const restored=s.loot.find(p=>p.container);assert.deepEqual(restored.items,before);
 assert(transferItem(s,u,{mode:'take',sector:true,target:restored,index:0}));assert.equal(restored.items.length,before.length-1);assert(u.pack.some(i=>i.kind==='largeMedicalKit'));
 const packCount=u.pack.find(i=>i.kind==='largeMedicalKit').charges;assert.equal(packCount,10);
});

test('stale inventory access is revoked by hostile arrival; foreign mercs and rejected quantities mutate neither source nor pack',()=>{
 const c=fresh(),s=openCampaignSector(c,70),u=s.units[0],pile=s.loot[0];
 const before=structuredClone([u,pile]);assert.equal(transferItem(s,u,{mode:'take',sector:true,target:pile,index:0,count:999}),false);assert.deepEqual([u,pile],before);
 const foreign=structuredClone(u);assert(!canUseSectorInventory(s,foreign));assert.equal(transferItem(s,foreign,{mode:'take',sector:true,target:pile,index:0}),false);
 const enemy=c.groups.find(g=>g.faction==='red-hats');enemy.waitMinutes=0;enemy.travel.route=[{from:101,to:71,road:false,minutes:90},{from:71,to:70,road:true,minutes:60}];
 elapsed(c,300);assert(s.units.some(u=>u.team==='guard'&&!u.character&&u.hp>0));assert(!canUseSectorInventory(s,u));const after=structuredClone([u,pile]);assert.equal(transferItem(s,u,{mode:'take',sector:true,target:pile,index:0}),false);assert.deepEqual([u,pile],after);
});

test('search and container locks are separate; a searched container and local pickup share one persistent stack',()=>{
 let c=fresh(),s=openCampaignSector(c,70),u=s.units[0],p=s.loot.find(p=>p.container);u.x=231;u.y=119;
 p.container.locked=true;assert.equal(searchBody(s,u,p),false);p.container.locked=false;assert(!pileOpen(p));assert(searchBody(s,u,p));refresh(s);
 assert(inventoryAction(s,u,{mode:'take',target:p,index:1,count:3}));assert.equal(p.items[1].count,9);
 assert(transferItem(s,u,{mode:'take',sector:true,target:p,index:1,count:2}));assert.equal(p.items[1].count,7);
 c=restoreCampaign(captureCampaign(c));assert.equal(activeState(c).loot.find(p=>p.container).items[1].count,7);
});

test('cleared loot outlives omitted corpses and cannot be taken twice; victory is derived from shared combat state',()=>{
 let c=checkpoint(),s=activeState(c);assert.throws(()=>finishCampaignEncounter(c),/contested/);
 for(const u of guards(c))dead(c,u);s.engaged=false;refresh(s);syncCampaignEncounter(c);assert.equal(s.phase,'won');const pile=s.loot[0];assert.equal(pile.body,undefined);
 const u=s.units.find(u=>u.id===0);assert(transferItem(s,u,{mode:'take',sector:true,target:pile,index:0}));assert.equal(pile.items.length,0);assert.equal(u.pack.find(i=>i.type==='weapon'&&i.kind==='rifle').condition,47);
 finishCampaignEncounter(c);assert.equal(c.sectors[71].owner,'player');const revision=c.revision;assert.equal(finishCampaignEncounter(c),false);assert.equal(c.revision,revision);
 c=restoreCampaign(captureCampaign(c));openCampaignSector(c,71);assert.equal(activeState(c).loot[0].items.length,0);assert.equal(guards(c).length,0);
});

test('split and partial journeys preserve identities, fatigue and carried equipment, with no physical occupancy in transit',()=>{
 let c=fresh(),g=c.groups[0],ids=g.memberIds.slice(0,2),pack=structuredClone(c.characters[ids[0]].unit.pack);splitCampaignGroup(c,g.id,ids);orderCampaignTravel(c,'group-2',71);advanceCampaign(c,15);
 for(const id of ids){assert.equal(c.characters[id].location.kind,'travel');assert(!c.sectors[70].population.includes(id));assert.deepEqual(c.characters[ids[0]].unit.pack,pack);}
 const time=c.clock.minutes,progress=c.groups.find(g=>g.id==='group-2').travel.progress;c=restoreCampaign(captureCampaign(c));assert.equal(c.clock.minutes,time);assert.equal(c.groups.find(g=>g.id==='group-2').travel.progress,progress);
 advanceCampaign(c,100);for(const id of ids)assert.equal(c.characters[id].location.sector,71);assert.equal(c.sectors[70].population.filter(id=>ids.includes(id)).length,0);
});

test('blocked entry rejects an entire staged transfer and a failed storage write preserves live state',async()=>{
 const c=fresh();initializeSector(c,71);for(let x=0;x<=8;x++)for(let y=117;y<=122;y++)c.sectors[71].state.map[y][x]='water';
 const before=structuredClone(c);let wrote=false;await assert.rejects(()=>checkpointTransition(c,n=>{orderCampaignTravel(n,'group-1',71);advanceCampaign(n,100);},async()=>{wrote=true;}),/Entry/);assert.equal(wrote,false);assert.deepEqual(c,before);
 const d=fresh(),original=structuredClone(d);await assert.rejects(()=>checkpointTransition(d,n=>orderCampaignTravel(n,'group-1',71),async()=>{throw Error('disk full');}),/disk full/);assert.deepEqual(d,original);
 const session=new CampaignSession(d,async()=>{throw Error('disk full');});await assert.rejects(()=>session.transition(n=>openCampaignSector(n,70)),/disk full/);assert.deepEqual(session.campaign,original);assert.equal(session.busy,false);
});

test('a real shot and partially completed enemy turn resume deterministically without replaying effects or clock minutes',()=>{
 let a=checkpoint(),s=activeState(a),u=s.units.find(u=>u.id===0),g=guards(a)[0];u.x=10;u.y=117;u.heading=0;refresh(s);
 assert(previewAttack(s,u,g,false,'torso',null,'hip').ok);assert(attack(s,u,g,false,false,'torso',false,'hip'));syncCampaignEncounter(a);
 s.phase='enemy';s.enemyIndex=4;s.queue=[];const b=restoreCampaign(captureCampaign(a));assert.equal(activeState(b).effect,null);assert.equal(settleEncounterRounds(activeState(b)),0);
 for(let i=0;i<3;i++){assert.equal(stepEnemy(s),stepEnemy(activeState(b)));syncCampaignEncounter(a);syncCampaignEncounter(b);}
 assert.deepEqual(captureCampaign(a,1),captureCampaign(b,1));
});

test('living wounded and captured records remain in the sector; defeat does not clear defenders',()=>{
 let c=checkpoint(),s=activeState(c),mercs=s.units.filter(u=>u.team==='squad');c.sectors[71].owner='player';c.overmap.sectors[71].owner='player';mercs.forEach((u,i)=>{u.hp=0;u.casualty=i===0?'stable':'dead';});refresh(s);syncCampaignEncounter(c);
 assert.equal(mercs[0].casualty,'captured');assert(c.sectors[71].population.includes(mercs[0].campaignId));assert.equal(guards(c).length,6);finishCampaignEncounter(c);
 c=restoreCampaign(captureCampaign(c));assert.equal(c.characters[mercs[0].campaignId].unit.casualty,'captured');assert.equal(guards(c).length,6);assert.equal(c.sectors[71].owner,'red-hats');assert.equal(c.overmap.sectors[71].owner,'red-hats');
});

test('corrupt whole-campaign records are rejected; template edits cannot overwrite an initialized population or chest',()=>{
 const c=checkpoint(),record=captureCampaign(c,1),guard=guards(c)[0].campaignId,merc=c.groups[0].memberIds[0];
 const cases=[r=>r.data.sectors[71].population.push(merc),r=>r.data.characters[guard].location.sector=70,r=>r.data.groups[0].memberIds.push(guard),r=>r.data.characters[merc].unit.pack[0].rounds=-2,r=>r.data.characters[merc].unit.ammo.assault=NaN,r=>r.data.clock.minutes=-1,r=>r.data.incidents[0].sector=449,r=>r.data.sectors[71].initialized=false,r=>r.data.sectors[71].unitIds.push('missing'),r=>r.data.groups[0].travel.progress=900,r=>r.data.sectors[70].state.loot[1].items[1].count=0];
 for(const mutate of cases){const bad=structuredClone(record);mutate(bad);assert.throws(()=>restoreCampaign(bad));}
 const restored=restoreCampaign(record);restored.assignments[71].map.guards=[];initializeSector(restored,71);assert.equal(guards(restored).length,6);assert.deepEqual(captureCampaign(c,1),record);
});

test('a second conflict is queued behind an active fight and survives save/load in chronological order',()=>{
 const fixture=structuredClone(content);fixture.assignments[70].entries.push({side:'south',offset:.5,width:6,z:0,depth:8});fixture.reinforcements=[{source:101,destination:71,delay:0,count:3},{source:100,destination:70,delay:40,count:1}];
 let c=createCampaign(fixture,{id:'queue'});splitCampaignGroup(c,'group-1',c.groups[0].memberIds.slice(0,2));orderCampaignTravel(c,'group-2',71);advanceCampaign(c,100);openCampaignSector(c,71);elapsed(c,200);
 assert.equal(c.incidents.length,2);assert.deepEqual(c.incidents.map(i=>i.status),['active','pending']);assert.equal(c.incidents[1].sector,70);assert(c.incidents[1].time>=c.incidents[0].time);
 const incidents=structuredClone(c.incidents);c=restoreCampaign(captureCampaign(c));assert.deepEqual(c.incidents,incidents);assert.throws(()=>openCampaignSector(c,70),/current encounter/);
});

test('opposing travel groups meet on the edge rather than passing through each other',()=>{
 let c=fresh();advanceCampaign(c,400);const enemy=c.groups.find(g=>g.faction==='red-hats');enemy.travel.route=planRoute(c.overmap,71,70,enemy.memberIds.map(id=>c.characters[id].unit));
 orderCampaignTravel(c,'group-1',71);const minutes=advanceCampaign(c,100);assert(minutes<72);assert.equal(c.incidents.at(-1).sector,70);
 assert.equal(c.groups[0].travel.position,70);assert.equal(enemy.travel.position,70);assert.equal(enemy.travel.route.length,0);assert.equal(c.groups[0].travel.route.length,0);
 c=restoreCampaign(captureCampaign(c));assert.equal(guards(c,70).filter(u=>!u.character).length,3);
});

test('synchronised arrivals can wait on an already-started journey without restoring departed people to the origin',()=>{
 let c=fresh();for(const id of c.groups[0].memberIds)c.characters[id].unit.stats.agility=50;
 splitCampaignGroup(c,'group-1',c.groups[0].memberIds.slice(0,2));orderCampaignTravel(c,'group-2',71);advanceCampaign(c,10);
 orderCampaignTravel(c,'group-1',71,{synchronize:true});const waiting=c.groups.find(g=>g.id==='group-2');assert.equal(waiting.waitMinutes,10);
 for(const id of waiting.memberIds)assert.equal(c.characters[id].location.kind,'travel');
 c=restoreCampaign(captureCampaign(c));advanceCampaign(c,100);
 for(const g of c.groups.filter(g=>g.faction==='player')){assert.equal(g.travel.position,71);assert.equal(g.travel.route.length,0);for(const id of g.memberIds)assert.equal(c.characters[id].location.sector,71);}
 assert.deepEqual(c.incidents[0].groupIds.sort(),['group-1','group-2']);
});

test('one group can retreat while another preserves the same active encounter and selected merc',()=>{
 let c=fresh();for(const id of c.groups[0].memberIds)c.characters[id].unit.stats.agility=50;
 splitCampaignGroup(c,'group-1',c.groups[0].memberIds.slice(0,2));orderCampaignTravel(c,'group-1',71);orderCampaignTravel(c,'group-2',71);advanceCampaign(c,100);openCampaignSector(c,71);
 const encounter=c.active.id,incident=c.active.incident;c.sectors[71].state.selected=c.characters[c.groups.find(g=>g.id==='group-2').memberIds[0]].unit.id;
 retreatCampaign(c,'group-2',70);assert.equal(c.active.id,encounter);assert.equal(c.incidents.find(i=>i.id===incident).status,'active');assert(activeState(c).units.some(u=>u.team==='squad'&&u.id===activeState(c).selected));
 c=restoreCampaign(captureCampaign(c));assert.equal(c.active.id,encounter);assert.equal(guards(c).length,6);
 retreatCampaign(c,'group-1',70);assert.equal(c.active,null);assert.equal(c.incidents.find(i=>i.id===incident).outcome,'retreat');assert.equal(c.incidents.length,1);
});

test('assigned maps must have matching, traversable entry boundaries before a campaign starts',()=>{
 const missing=structuredClone(content);missing.assignments[71].entries[0].side='north';assert.throws(()=>createCampaign(missing),/matching travel boundaries/);
 const blocked=structuredClone(content);for(let y=117;y<=122;y++)blocked.assignments[71].map.terrain[y][0]='water';assert.throws(()=>createCampaign(blocked),/Entry boundary/);
});

test('a stale campaign session cannot overwrite a later committed checkpoint',async()=>{
 const c=fresh();let stored=captureCampaign(c);const persist=async(slot,record,expected)=>{assert.equal(slot,'continue');if(expected.id!==stored.campaignId||expected.revision!==stored.revision)throw Error('Stale checkpoint');stored=record;};
 const a=new CampaignSession(restoreCampaign(stored),persist),b=new CampaignSession(restoreCampaign(stored),persist);
 await a.transition(n=>orderCampaignTravel(n,'group-1',71));const committed=structuredClone(stored),before=structuredClone(b.campaign);
 await assert.rejects(()=>b.transition(n=>openCampaignSector(n,70)),/Stale/);assert.deepEqual(stored,committed);assert.deepEqual(b.campaign,before);assert.equal(b.busy,false);
});
