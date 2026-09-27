import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,route,placeTutorial} from '../dist/tactics/overmap-model.js';
import {generateWorld} from '../dist/tactics/overmap-generator.js';
import {TRAVEL_TIMES,sectorMinutes,groupPace,travelEdges,planRoute,createTravel,setDestination,travelUntilStop,restTravel,travelPreview,validateTravel} from '../dist/tactics/overmap-travel.js';
const member=(agility=50,fatigue=0,name='Merc')=>({id:name,name,stats:{agility},social:{fatigue}});
function roadMap(){const m=blank();for(let x=0;x<10;x++)m.sectors[x].routes=[route('road','west','east')];return m;}
test('approved minute table and all agility band boundaries',()=>{
 assert.deepEqual(TRAVEL_TIMES,[[1,180,120],[10,163,109],[20,145,97],[30,127,84],[40,108,72],[50,90,60],[60,84,57],[70,78,54],[80,72,51],[90,66,48],[100,60,45]]);
 for(let i=0;i<TRAVEL_TIMES.length;i++){const [start,land,road]=TRAVEL_TIMES[i],end=(TRAVEL_TIMES[i+1]?.[0]??101)-1;for(let a=start;a<=end;a++){assert.equal(sectorMinutes(a),land);assert.equal(sectorMinutes(a,true),road);}}
 for(const a of [0,101,NaN,Infinity])assert.throws(()=>sectorMinutes(a));
});
test('slowest member sets group pace without averaging',()=>{
 assert.equal(groupPace([member(100,0,'Fast'),member(50,0,'Slow')]).name,'Slow');assert.equal(groupPace([member(100),member(1)],true).minutes,120);assert.throws(()=>groupPace([]));assert.equal(groupPace([member(58,0,'Higher'),member(50,0,'Lower')]).name,'Lower');
});
test('road bonus requires matching shared-edge connections',()=>{
 const m=roadMap();assert.equal(travelEdges(m,0).find(e=>e.to===1).road,true);assert.equal(travelEdges(m,0).find(e=>e.to===30).road,false);
 m.sectors[1].routes=[route('road','north','south')];assert.equal(travelEdges(m,0).find(e=>e.to===1).road,false);
});
test('river/cliff gates require a crossing road, tutorial needs reciprocal declarations',()=>{
 for(const [kind,gate]of [['river','bridge'],['cliff','passage']]){const m=roadMap();m.sectors[1].routes.push(route(kind,'north','south'));assert.ok(!travelEdges(m,0).some(e=>e.to===1));m.sectors[1].gate=gate;assert.ok(travelEdges(m,0).some(e=>e.to===1));assert.ok(!travelEdges(m,1).some(e=>e.to===31));}
 const m=blank();m.sectors[0].role='tutorial';m.sectors[0].travel=['east'];assert.ok(!travelEdges(m,0).some(e=>e.to===1));m.sectors[1].travel=['west'];assert.ok(travelEdges(m,0).some(e=>e.to===1));assert.throws(()=>planRoute(m,0,30,[]));
});
test('fatigue stops mid-sector at 80; rest hysteresis, resume, preview, and clock agree',()=>{
 const m=roadMap(),s=createTravel(m,[member(50,75)]);setDestination(s,m,2);const before=structuredClone(s),preview=travelPreview(s);assert.deepEqual(s,before);assert.equal(preview.travelMinutes,120);assert.equal(preview.restMinutes,120);assert.equal(preview.arrivalMinutes,720);
 assert.equal(travelUntilStop(s,m).minutes,30);assert.equal(s.position,0);assert.equal(s.progress,30);assert.equal(s.members[0].social.fatigue,80);assert.equal(s.clock.minutes,510);assert.throws(()=>setDestination(s,m,3));
 const stopped=structuredClone(s);assert.equal(travelUntilStop(s,m).minutes,0);assert.deepEqual(s,stopped);
 restTravel(s,1);assert.equal(s.restRequired,true);assert.equal(travelUntilStop(s,m).minutes,0);restTravel(s,1);assert.equal(s.restRequired,false);
 assert.equal(travelUntilStop(s,m).minutes,90);assert.equal(s.position,2);assert.equal(s.progress,0);assert.equal(s.clock.minutes,preview.arrivalMinutes);assert.equal(s.members[0].social.fatigue,75);
});
test('most fatigued member stops the whole group and arrival exactly at threshold needs no extra rest in ETA',()=>{
 const m=roadMap(),s=createTravel(m,[member(100,0,'Fresh'),member(50,70,'Tired')]);setDestination(s,m,1);assert.equal(travelPreview(s).restMinutes,0);travelUntilStop(s,m);assert.equal(s.position,1);assert.equal(s.restRequired,true);assert.equal(s.members[0].social.fatigue,10);assert.equal(s.members[1].social.fatigue,80);
});
test('multiple forced rests match preview, save roundtrip preserves partial travel',()=>{
 const m=roadMap(),s=createTravel(m,[member(1,79)]);setDestination(s,m,9);const preview=travelPreview(s);travelUntilStop(s,m);const restored=validateTravel(JSON.parse(JSON.stringify(s)),m);assert.deepEqual(restored,s);let stops=0;
 while(restored.route.length){if(restored.restRequired){restTravel(restored,2);stops++;}travelUntilStop(restored,m);}
 assert.equal(stops,preview.stops);assert.equal(restored.clock.minutes,preview.arrivalMinutes);assert.equal(restored.position,9);
 const bad=structuredClone(s);bad.route[0].to=449;assert.throws(()=>validateTravel(bad,m));assert.throws(()=>restTravel(s,Infinity));
});
test('generated map routes start at tutorial and reach every settlement through valid edges',()=>{
 const map=generateWorld(42),s=createTravel(map);assert.equal(map.sectors[s.position].tutorialStep,1);
 for(let i=0;i<map.sectors.length;i++)if(['town','village','city','fortress'].includes(map.sectors[i].role)){const path=planRoute(map,s.position,i,s.members);assert.equal(path.at(-1).to,i);for(const edge of path)assert.ok(travelEdges(map,edge.from).some(e=>e.to===edge.to&&e.road===edge.road));}
});
