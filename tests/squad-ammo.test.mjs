import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,WEAPONS,equip,reload,refresh,inventoryTransfer} from '../dist/tactics/core/engine.js';
import {blankMap,addStairs,tileKey} from '../dist/tactics/core/maps.js';
import {reserve,receive,gridLayout,loadWeight} from '../dist/tactics/core/inventory.js';
import {transferItem,transferPreview} from '../dist/tactics/battle-inventory.js';
import {sharedAmmoRows,distributeSquadAmmo} from '../dist/tactics/squad-ammo.js';
import {weaponReadout} from '../dist/tactics/battle-hud-model.js';
import {characterSheet} from '../dist/tactics/character-screen.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,splitCampaignGroup,orderCampaignTravel,advanceCampaign,openCampaignSector,activeState,finishCampaignEncounter} from '../dist/tactics/campaign-model.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';
import {campaignCandidates,hireCampaignMerc} from '../dist/tactics/campaign-hiring.js';

function fixture({guard=false,far=false}={}){
 const m=blankMap('Squad ammo');m.starts=[{x:10,y:10,z:0},{x:11,y:10,z:0},{x:10,y:11,z:0},{x:11,y:11,z:0}];
 if(far){addStairs(m,200,200,0);addStairs(m,200,200,1);m.starts[1]={x:200,y:200,z:2};}
 if(guard)m.guards=[{x:100,y:100,z:0,species:'goat',weapon:'pistol'}];
 const s=createGame(42,m,false,'easy',{statSystem:true});startEncounterClock(s);const [u,v]=s.units;equip(s,u,'pistol');equip(s,v,'pistol');return {s,u,v};
}
function emptyReserves(s){for(const u of s.units.filter(u=>u.team==='squad'))u.ammoPouch={};}
const stock=(s,kind='pistol')=>sharedAmmoRows(s).find(i=>i.kind===kind)?.count||0;
function legacyUnit(u){if(u.team!=='squad')return;for(const [kind,count]of Object.entries(u.ammoPouch||{}))u.pack.push({type:'ammo',kind,count});delete u.ammoPouch;}
const allStock=c=>Object.values(c.characters).filter(r=>r.unit.team==='squad').reduce((n,r)=>n+(r.unit.ammoPouch?.pistol||0),0);
function campaign(){const content=openingContent();content.reinforcements=[];return createCampaign(content,{id:'shared-ammo-campaign'});}

test('starter reserves leave backpack slots and carry weight without changing loaded magazines',()=>{
 const {s,u}=fixture();assert.equal(stock(s),64);assert.equal(stock(s,'rifle'),20);
 assert.ok(s.units.every(p=>p.pack.every(i=>i.type!=='ammo')));const weight=loadWeight(u),loaded=structuredClone(u.ammo),cells=gridLayout(u);
 receive(u,{type:'ammo',kind:'pistol',count:1000});assert.equal(stock(s),1064);assert.equal(loadWeight(u),weight);assert.deepEqual(gridLayout(u),cells);assert.deepEqual(u.ammo,loaded);
});

test('a merc reloads from a distant squadmate on another floor, paying only the existing reload AP',()=>{
 const {s,u,v}=fixture({far:true});emptyReserves(s);v.ammoPouch.pistol=3;u.ammo.pistol=0;s.phase='player';s.engaged=true;u.ap=12;const loaded=v.ammo.pistol,seed=s.seed;
 assert.equal(weaponReadout(s,u,'pistol').reserve,3);assert.equal(weaponReadout(s,u,'pistol').canReload,true);assert.ok(reload(s,u));
 assert.equal(u.ammo.pistol,3);assert.equal(v.ammo.pistol,loaded);assert.equal(stock(s),0);assert.equal(u.ap,9);assert.equal(s.seed,seed);
 const before=structuredClone(s);assert.equal(reload(s,u),false);assert.deepEqual(s,before);
});

test('two reloads consume a finite shared supply exactly once and never spend another weapon type',()=>{
 const {s,u,v}=fixture();emptyReserves(s);u.ammoPouch={pistol:10,rifle:17};u.ammo.pistol=v.ammo.pistol=0;s.phase='player';s.engaged=true;u.ap=v.ap=12;
 assert.ok(reload(s,u));assert.ok(reload(s,v));assert.equal(u.ammo.pistol+v.ammo.pistol,10);assert.equal(stock(s),0);assert.equal(stock(s,'rifle'),17);
 assert.equal(u.ap,9);assert.equal(v.ap,9);assert.equal(reload(s,v),false);
});

test('blocked reloads and jam clearing do not consume shared stock',()=>{
 const {s,u,v}=fixture();emptyReserves(s);v.ammoPouch.pistol=20;u.ammo.pistol=0;s.phase='player';s.engaged=true;u.ap=2;
 let before=structuredClone(s);assert.equal(reload(s,u),false);assert.deepEqual(s,before);
 u.ap=12;s.queue=[{id:u.id,x:12,y:10}];before=structuredClone(s);assert.equal(reload(s,u),false);assert.deepEqual(s,before);s.queue=[];
 u.pack.find(i=>i.type==='weapon'&&i.kind==='pistol').jammed=true;assert.ok(reload(s,u));assert.equal(stock(s),20);assert.equal(u.ammo.pistol,0);assert.equal(u.ap,9);
});

test('guards use only their own reserves, and absent or captured mercs cannot lend ammunition',()=>{
 const {s,u,v}=fixture({guard:true}),g=s.units.find(p=>p.team==='guard');emptyReserves(s);u.ammoPouch.pistol=100;
 g.pack=g.pack.filter(i=>i.type!=='ammo');g.pack.push({type:'ammo',kind:'pistol',count:3});g.ammo.pistol=0;s.phase='enemy';g.ap=12;
 assert.ok(reload(s,g,true));assert.equal(g.ammo.pistol,3);assert.equal(stock(s),100);assert.equal(reserve(g,'pistol',s),0);
 u.ammoPouch={};v.ammoPouch.pistol=25;v.away={};s.phase='player';s.engaged=true;u.ap=12;u.ammo.pistol=0;assert.equal(reload(s,u),false);
 delete v.away;v.casualty='captured';assert.equal(reload(s,u),false);delete v.casualty;assert.ok(reload(s,u));assert.equal(stock(s),25-WEAPONS.pistol.mag);
});

test('ammo pickup ignores a full backpack; partial pickup, preview and rejected actions remain atomic',()=>{
 const {s,u}=fixture();emptyReserves(s);u.pack=Array.from({length:18},()=>({type:'tool',kind:'lockpicks',count:1}));u.slots=[];u.medkits=0;u.wireCutters=false;assert.ok(gridLayout(u).ok);
 s.phase='player';s.engaged=true;u.ap=2;s.visible.add(tileKey(u.x,u.y));const pile=s.loot[0],action={mode:'take',target:pile,index:0,count:3},before=structuredClone(s);
 assert.equal(transferPreview(s,u,action).ok,true);assert.deepEqual(s,before);assert.ok(transferItem(s,u,action));assert.equal(pile.items[0].count,5);assert.equal(stock(s),3);assert.equal(u.pack.length,18);assert.equal(u.ap,0);
 const after=structuredClone(s);assert.equal(transferItem(s,u,action),false);assert.deepEqual(s,after);
});

test('the core pickup path also credits squad supplies without requiring a handover',()=>{
 const {s,u,v}=fixture();emptyReserves(s);const pile=s.loot[0];assert.ok(inventoryTransfer(s,u,0,'take',pile));assert.equal(stock(s),8);assert.equal(reserve(v,'pistol',s),8);assert.ok(!u.pack.some(i=>i.type==='ammo'));
});

test('shared ammo readouts are inspection only; unfound loot is never counted',()=>{
 const {s,u}=fixture(),before=structuredClone(s),rows=sharedAmmoRows(s),sheet=characterSheet(u,{state:s});
 assert.deepEqual(sheet.sharedAmmo,rows);assert.equal(rows.find(i=>i.kind==='pistol').count,64);assert.ok(sheet.backpack.every(e=>e.item.type!=='ammo'));
 assert.equal(weaponReadout(s,u,'pistol').reserve,64);assert.deepEqual(s,before);
});

test('old encounter saves migrate every reserve stack once without refilling a magazine or changing RNG',()=>{
 const {s,u}=fixture();u.ammo.pistol=2;const old=captureEncounter(s,1);old.state.units.forEach(legacyUnit);const before=structuredClone(old);
 let restored=restoreEncounter(old);assert.equal(stock(restored),64);assert.equal(restored.units[0].ammo.pistol,2);assert.equal(restored.seed,s.seed);assert.deepEqual(old,before);
 for(let i=0;i<3;i++){restored=restoreEncounter(captureEncounter(restored,1));assert.equal(stock(restored),64);assert.ok(restored.units.every(p=>p.pack.every(i=>i.type!=='ammo')));}
});

test('malformed shared stock is rejected without touching the current game',()=>{
 const {s}=fixture(),record=captureEncounter(s),before=structuredClone(s);
 for(const invalid of [null,[],{pistol:-1},{pistol:1.5},{pistol:Infinity},{pistol:Number.MAX_SAFE_INTEGER+1},{unknown:3}]){const bad=structuredClone(record);bad.state.units[0].ammoPouch=invalid;assert.throws(()=>restoreEncounter(bad),/damaged/);}
 assert.deepEqual(s,before);
});

test('shared supplies survive a merc death, and a squad wipe leaves each remaining round in the sector once',()=>{
 const {s,u,v}=fixture();emptyReserves(s);v.ammoPouch.pistol=19;v.hp=0;v.casualty='dead';refresh(s);assert.equal(stock(s),19);assert.equal(u.ammoPouch.pistol,19);assert.deepEqual(v.ammoPouch,{});
 const looseBefore=s.loot.flatMap(p=>p.items).filter(i=>i.type==='ammo'&&i.kind==='pistol').reduce((n,i)=>n+i.count,0);
 for(const p of s.units){p.hp=0;p.ap=0;p.casualty='dead';}refresh(s);refresh(s);
 const looseAfter=s.loot.flatMap(p=>p.items).filter(i=>i.type==='ammo'&&i.kind==='pistol').reduce((n,i)=>n+i.count,0);assert.equal(looseAfter-looseBefore,19);assert.equal(stock(s),0);
});

test('automatic shares prefer compatible weapons and conserve remainder rounds',()=>{
 const {s,u,v}=fixture();emptyReserves(s);u.ammoPouch={pistol:11,launcher:3};distributeSquadAmmo(s.units);assert.equal(stock(s),11);assert.equal(stock(s,'launcher'),3);
 assert.equal(u.ammoPouch.pistol,3);assert.equal(v.ammoPouch.pistol,3);assert.deepEqual(s.units.filter(p=>p.ammoPouch.launcher).map(p=>p.ammoPouch.launcher),[1,1,1]);
});

test('campaign group splits and travel carry fair supplies without sharing with a remote sector',()=>{
 let c=campaign();const g=c.groups[0],total=allStock(c),ids=g.memberIds.slice(0,2);splitCampaignGroup(c,g.id,ids);orderCampaignTravel(c,'group-2',71);
 assert.equal(stock(c.sectors[70].state),total/2);assert.equal(allStock(c),total);advanceCampaign(c,15);c=restoreCampaign(captureCampaign(c,1));assert.equal(allStock(c),total);
 advanceCampaign(c,100);const at70=c.sectors[70].state,at71=c.sectors[71].state;assert.equal(stock(at70),total/2);assert.equal(stock(at71),total/2);
 const u=at71.units.find(p=>p.team==='squad');u.weapon='pistol';u.ammo.pistol=0;u.ap=20;at71.phase='player';at71.engaged=true;assert.ok(reload(at71,u));assert.equal(stock(at70),total/2);assert.equal(allStock(c),total-WEAPONS.pistol.mag);
 for(const p of at71.units.filter(p=>p.team==='guard')){p.hp=0;p.casualty='dead';}openCampaignSector(c,71);at71.engaged=false;refresh(at71);finishCampaignEncounter(c);
 orderCampaignTravel(c,'group-1',71);advanceCampaign(c,100);assert.equal(stock(c.sectors[71].state),allStock(c));assert.equal(stock(c.sectors[70].state),0);
});

test('old campaign saves and new hires join the same supply without duplication on repeated loading',()=>{
 const c=campaign(),record=captureCampaign(c,1),total=allStock(c);Object.values(record.data.characters).forEach(r=>legacyUnit(r.unit));const before=structuredClone(record);
 let restored=restoreCampaign(record);assert.equal(allStock(restored),total);assert.deepEqual(record,before);
 for(let i=0;i<3;i++){restored=restoreCampaign(captureCampaign(restored,1));assert.equal(allStock(restored),total);}
 const candidate=campaignCandidates(restored)[0],hire=hireCampaignMerc(restored,candidate.key,'day',70);assert.ok(hire.ammoPouch);assert.ok(hire.pack.every(i=>i.type!=='ammo'));assert.equal(allStock(restored),total+16);
 const loaded=restoreCampaign(captureCampaign(restored,1));assert.equal(stock(loaded.sectors[70].state),total+16);
 const bad=captureCampaign(loaded,1);bad.data.characters[hire.campaignId].unit.ammoPouch={pistol:-1};assert.throws(()=>restoreCampaign(bad),/damaged/);
});
