import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,edgeKey} from '../dist/tactics/core/maps.js';
import {createGame,attack,enterFire,endTurn,stepEnemy,refresh,settleGuards,canControl} from '../dist/tactics/core/engine.js';
import {barrelTarget} from '../dist/tactics/explosive-barrels.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock,settleEncounterRounds} from '../dist/tactics/encounter-clock.js';
import {createCampaign,openCampaignSector,syncCampaignEncounter} from '../dist/tactics/campaign-model.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';

function fixture(difficulty='easy'){
 const map=blankMap('Fatal fuel burns');map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];
 map.guards=[{x:20,y:24,species:'hen',weapon:'hands'}];map.props=[{x:20,y:20,z:0,kind:'barrel-explosive'}];
 const s=createGame(0,map,true,difficulty),a=s.units[0];Object.assign(a,{weapon:'rifle',accuracy:1000,ap:30,heading:0});s.phase='player';s.rules.awareness=false;startEncounterClock(s);
 assert(attack(s,a,barrelTarget(s.props[0])));return s;
}
function cycle(s){assert(endTurn(s));for(let i=0;i<100&&s.phase==='enemy';i++)stepEnemy(s);assert.notEqual(s.phase,'enemy');settleEncounterRounds(s);}

for(const difficulty of ['easy','standard'])test(`${difficulty}: barrel survivors run for three turns, then die and leave ash`,()=>{
 const s=fixture(difficulty),merc=s.units[2],guard=s.units[4],outside=s.units[3],outsideHp=outside.hp;
 const start={x:merc.x,y:merc.y};assert.equal(merc.burningTurns,3);assert(merc.hp>0);assert.equal(s.units[1].casualty,'dead');
 for(const remaining of [2,1]){cycle(s);assert.equal(merc.burningTurns,remaining);assert.equal(guard.burningTurns,remaining);assert(merc.hp>0);assert(!canControl(s,merc));}
 cycle(s);assert.equal(merc.burningTurns,0);assert.equal(merc.hp,0);assert.equal(merc.casualty,'dead');assert.equal(merc.recoveryTurns,0);assert(merc.burnedRemains);assert(!canControl(s,merc));
 assert.equal(guard.hp,0);assert(guard.burnedRemains);assert.notDeepEqual({x:merc.x,y:merc.y},start);assert.equal(outside.hp,outsideHp);assert.equal(outside.burnedRemains,undefined);
 for(const u of [merc,guard]){const ash=s.fireAnimations.filter(e=>e.unitId===u.id&&e.kind==='ash');assert.equal(ash.length,1);assert.deepEqual([ash[0].route[0].x,ash[0].route[0].y],[u.x,u.y]);}
 const loot=structuredClone(s.loot);refresh(s);settleGuards(s,10);assert.deepEqual(s.loot,loot);assert.equal(s.fireAnimations.filter(e=>e.unitId===guard.id&&e.kind==='ash').length,1);
});

test('a blocked panic route still expires as ash on its legal standing tile',()=>{
 const s=fixture(),u=s.units[2],spot={x:u.x,y:u.y};
 for(const [axis,x,y]of [['e',u.x-1,u.y],['e',u.x,u.y],['s',u.x,u.y-1],['s',u.x,u.y]])s.edges[edgeKey(axis,x,y)]='wall-brick';
 for(let i=0;i<3;i++)cycle(s);assert.deepEqual({x:u.x,y:u.y},spot);assert.equal(u.casualty,'dead');assert(u.burnedRemains);
});

test('mid-burn saves retain remaining turns and terminal saves cannot replay deaths or loot',()=>{
 let s=fixture();cycle(s);cycle(s);assert.equal(s.units[2].burningTurns,1);
 s=restoreEncounter(captureEncounter(s));assert.equal(s.units[2].burningTurns,1);assert.equal(s.fireAnimations,undefined);cycle(s);
 const loot=structuredClone(s.loot);assert(s.units[2].burnedRemains);assert(s.units[4].burnedRemains);
 s=restoreEncounter(captureEncounter(s));refresh(s);settleGuards(s,10);assert.deepEqual(s.loot,loot);assert.equal(s.units[2].casualty,'dead');assert.equal(s.units[2].burningTurns,0);assert.equal(s.fireAnimations,undefined);
});

test('ignition late in an enemy turn does not skip a panic turn; unloaded guard settling has the same fatal endpoint',()=>{
 const s=fixture();s.phase='enemy';s.enemyIndex=s.units.length;stepEnemy(s);assert.equal(s.units[2].burningTurns,3);
 const guard=s.units[4];settleGuards(s,2);assert.equal(guard.burningTurns,1);assert(guard.hp>0);settleGuards(s,1);assert.equal(guard.hp,0);assert(guard.burnedRemains);
});

test('campaign reconciliation removes a merc who burns to ash and preserves the casualty on reload',()=>{
 let c=createCampaign(openingContent(),{id:'burn-campaign'}),s=openCampaignSector(c,70),u=s.units[0],id=u.campaignId;
 s.fires=[{x:u.x,y:u.y,z:u.z||0,turns:3}];enterFire(s,u);refresh(s);
 cycle(s);syncCampaignEncounter(c);c=restoreCampaign(captureCampaign(c));s=c.sectors[70].state;assert.equal(c.characters[id].unit.burningTurns,2);
 for(let i=0;i<2;i++){cycle(s);syncCampaignEncounter(c);}
 assert.equal(c.characters[id].location.kind,'removed');assert(!c.sectors[70].population.includes(id));assert(!c.groups[0].memberIds.includes(id));
 c=restoreCampaign(captureCampaign(c));assert.equal(c.characters[id].unit.casualty,'dead');assert(c.characters[id].unit.burnedRemains);
});
