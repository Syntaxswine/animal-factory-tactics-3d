import test from 'node:test';
import assert from 'node:assert/strict';
import {withCombatQueries,withoutCombatQueries,combatQuery} from '../dist/tactics/combat-queries.js';
import {trackMapGeometry,invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {blankMap,openDoorBetween} from '../dist/tactics/core/maps.js';
import {createGame,refresh,endTurn,stepEnemy,visibleZones,setOverwatch,attackGround} from '../dist/tactics/core/engine.js';
import {illuminationAt} from '../dist/tactics/awareness.js';
import {damageStructure} from '../dist/tactics/structure-health.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';

test('query scopes cache false results, nest safely and expire on geometry mutation or action completion',()=>{
 const s=trackMapGeometry({map:[],props:[]});let calls=0;const q=()=>combatQuery(s,'test','key',()=>{calls++;return false;});
 withCombatQueries(s,()=>{q();q();withCombatQueries(s,q);assert.equal(calls,1);invalidateMapGeometry(s);q();assert.equal(calls,2);s.props=[];q();assert.equal(calls,3);withoutCombatQueries(s,q);q();assert.equal(calls,4);});q();assert.equal(calls,5);
 assert.throws(()=>withCombatQueries(s,()=>{q();throw Error('cancel');}),/cancel/);q();assert.equal(calls,7);
 const raw={map:[]};withCombatQueries(raw,()=>{for(let i=0;i<2;i++)combatQuery(raw,'x','x',()=>calls++);});assert.equal(calls,9);
 // Geometry readers prefer terrain when both aliases exist. Replacing that
 // active array with another tracked map must not reuse the old answer.
 const aliases=trackMapGeometry({map:[],terrain:[false]}),replacement=trackMapGeometry({terrain:[true]});
 withCombatQueries(aliases,()=>{const read=()=>combatQuery(aliases,'terrain','same endpoint',()=>aliases.terrain[0]);assert.equal(read(),false);aliases.terrain=replacement.terrain;assert.equal(read(),true);});
});
function fixture(seed=1947){
 const map=blankMap('Combat query parity');map.starts=[{x:14,y:12},{x:14,y:14},{x:12,y:12},{x:12,y:14}];
 map.guards=[{x:20,y:12,weapon:'pistol',heading:180},{x:20,y:14,weapon:'pistol',heading:180},{x:20,y:16,weapon:'rifle',heading:180}].map(p=>({...p,species:'horse',patrol:[]}));
 map.props.push({kind:'crate-wood',x:17,y:16,z:0});map.edges['e:16:12']='door-wood-closed';
 const s=createGame(seed,map,false,'easy',{statSystem:true,awareness:true});startEncounterClock(s);refresh(s);return s;
}
test('body rays and lighting remain fresh for posture, death, support, clock, doors and destruction inside an action',()=>{
 const s=fixture(),a=s.units[0],b=s.units[4];
 const compare=()=>{const zones=visibleZones(s,a,b),light=illuminationAt(s,b);assert.deepEqual(zones,withoutCombatQueries(s,()=>visibleZones(s,a,b)));assert.equal(light,withoutCombatQueries(s,()=>illuminationAt(s,b)));};
 withCombatQueries(s,()=>{
  compare();b.stance='prone';compare();b.stance='standing';b.hp=0;compare();b.hp=80;b.x--;compare();a.heading=180;compare();b.cliffSupport={level:0,height:1.2};compare();delete b.cliffSupport;
  s.clock.minutes=1260;compare();s.clock.minutes=480;compare();openDoorBetween(s,{x:16,y:12},{x:17,y:12});compare();
  s.edges['e:16:12']='wall-concrete';invalidateMapGeometry(s);compare();damageStructure(s,{edge:'e:16:12'},200);compare();
  s.props=[...s.props,{kind:'crate-wood',x:18,y:12,z:0}];compare();
 });
});
for(const seed of [1947,829])test('each committed action and restored complete turn matches uncached queries, seed '+seed,()=>{
 let candidate=fixture(seed),reference=restoreEncounter(captureEncounter(candidate,0));
 const same=()=>assert.deepEqual(captureEncounter(candidate,0),captureEncounter(reference,0));
 const act=fn=>{assert.deepEqual(fn(candidate),withoutCombatQueries(reference,()=>fn(reference)));same();};
 act(s=>setOverwatch(s,s.units[0],12));act(endTurn);
 let ticks=0;while(candidate.phase==='enemy'&&ticks++<150){act(stepEnemy);if(ticks===9){candidate=restoreEncounter(captureEncounter(candidate,0));reference=restoreEncounter(captureEncounter(reference,0));same();}}
 assert(ticks>10&&ticks<150);assert.equal(candidate.phase,'player');
 // Cover a second turn after real geometry invalidation and an unaimed shot.
 act(s=>damageStructure(s,{edge:'e:16:12'},200));act(refresh);act(s=>attackGround(s,s.units[0],{x:18,y:12,z:0}));act(endTurn);
 while(candidate.phase==='enemy'&&ticks++<300)act(stepEnemy);assert(ticks<300);same();
});
