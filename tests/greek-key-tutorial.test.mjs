import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {greekKeyTutorial,greekKeyPreview,ID,VARIANT,GATES,FINISH,ROUTE,ORIGIN,SCALE,REPEATS} from '../tools/generate-greek-key-tutorial.mjs';
import {parseMap,validateMap,neighbors,passable} from '../dist/tactics/core/maps.js';
import {trackMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {loadPreset,presetCatalog,filterPresets} from '../dist/tactics/sector-presets.js';
import {createGame,move,stepMovement} from '../dist/tactics/core/engine.js';

const root=new URL('../dist/tactics/',import.meta.url);
const fetcher=async url=>{try{return {ok:true,json:async()=>JSON.parse(await fs.readFile(new URL(url,root),'utf8'))};}catch{return {ok:false,status:404};}};
const map=greekKeyTutorial();
function shortestPath(map,start,finish){
 trackMapGeometry(map);
 const key=p=>p.y*240+p.x,queue=[start],previous=new Map([[key(start),null]]);
 for(let n=0;n<queue.length;n++){
  const p=queue[n];if(key(p)===key(finish)){
   const path=[];for(let q=p;q;q=previous.get(key(q)))path.push(q);return path.reverse();
  }
  for(const q of neighbors(map,p,new Map(),false))if(!previous.has(key(q))){previous.set(key(q),p);queue.push(q);}
 }
 return null;
}

test('the shipped garden is reproducible, portable and opens through the sector preset library',async()=>{
 const saved=await fs.readFile(new URL('sector-library/'+ID+'/'+VARIANT,root),'utf8');
 assert.deepEqual(parseMap(saved),map);assert.deepEqual(validateMap(map),[]);
 assert.equal((await fs.readFile(new URL('sector-library/'+ID+'/greek-key.svg',root),'utf8')).trimEnd(),greekKeyPreview(map).trimEnd());
 const entries=await presetCatalog({fetcher});assert.equal(filterPresets(entries,{role:'tutorial',query:'greek key'}).length,1);
 const opened=await loadPreset({id:ID,variant:VARIANT},{fetcher}),document=new EditingDocument().open(JSON.stringify(opened));
 const exported=parseMap(document.export());
 assert.deepEqual(exported.props,map.props);assert.deepEqual(exported.terrain,map.terrain);
 assert.deepEqual(exported.starts.map(({character,...start})=>start),map.starts);
 assert.deepEqual(parseMap(new EditingDocument().open(document.export()).export()),exported);
 assert.equal(map.guards.length,0);assert.ok(map.starts.every(p=>p.weapon==='hands'));
});

test('every squad start follows all three linked S curls to the eastern finishing court',()=>{
 for(const start of map.starts){
  const route=shortestPath(structuredClone(map),start,FINISH);assert.ok(route,'squad start connects to finish');
  assert.ok(route.length>600,'the route cannot bypass the linked curls');
  let previousGate=-1;
  for(let i=0;i<REPEATS;i++){
   const ox=ORIGIN.x+i*7*SCALE;
   // Each S crosses the inner and outer downstrokes, then its final upstroke
   // before joining the next section.
   for(const [x,y]of [[ox+3*SCALE,ORIGIN.y+2.5*SCALE],[ox+SCALE,ORIGIN.y+3*SCALE],[ox+7*SCALE,ORIGIN.y+2.5*SCALE]]){
    const gate=route.findIndex(p=>p.y===y&&Math.abs(p.x-x)<=2);assert.ok(gate>previousGate,'each S is wound and unwound before the next');previousGate=gate;
   }
  }
 }
 for(const [x,y]of ROUTE)assert.ok(passable(map,{x,y,z:0}),'guide ribbon waypoint must be walkable');
 for(let i=1;i<ROUTE.length;i++){
  const [ax,ay]=ROUTE[i-1],[bx,by]=ROUTE[i],steps=Math.abs(bx-ax)+Math.abs(by-ay);
  for(let n=0;n<=steps;n++)assert.ok(passable(map,{x:ax+Math.sign(bx-ax)*n,y:ay+Math.sign(by-ay)*n,z:0}),'every tile along the guide ribbon is open');
 }
});

test('each inner opening is five tiles wide and cannot be bypassed around the garden',()=>{
 for(const gate of GATES){
  for(let x=gate.x-2;x<=gate.x+2;x++)assert.ok(passable(map,{x,y:gate.y,z:0}),'full opening width is free');
  const closed=structuredClone(map);
  for(let x=gate.x-2;x<=gate.x+2;x++)closed.props.push({kind:'hedge-short',x,y:gate.y,z:0});
  assert.equal(shortestPath(closed,closed.starts[0],FINISH),null,'closing any S cuts the route, including movement outside the garden');
 }
});

test('the game can follow a real move order through an opening in free exploration',()=>{
 const state=createGame(7,map,true,'easy'),unit=state.units[0],target={x:ORIGIN.x+3,y:ORIGIN.y,z:0};
 assert.ok(move(state,unit,target.x,target.y,target.z));
 let steps=0;while(state.queue.length&&steps++<100)stepMovement(state);
 assert.ok(steps<100);assert.equal(unit.x,target.x);assert.equal(unit.y,target.y);
});
