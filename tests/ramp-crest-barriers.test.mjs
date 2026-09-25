import test from 'node:test';
import assert from 'node:assert/strict';
import {RAMP_DIRECTIONS,rampInfo} from '../dist/tactics/cliff-ramps.js';
import {blankMap,validateMap,neighbors,edgeBetween} from '../dist/tactics/core/maps.js';
import {propCells} from '../dist/tactics/core/environment.js';
import {createGame,move,stepMovement,refresh} from '../dist/tactics/core/engine.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';

function fixture(direction,z){
 const map=blankMap('Crest barriers'),p={x:16,y:16,z,kind:'ramp-grass-'+direction},r=rampInfo(p);
 map.props=[p,{x:r.exit.x,y:r.exit.y,z,kind:'cliff-ledge'}];map.guards=[];map.edges={};
 if(z)for(const q of [...map.props.flatMap(propCells),r.entry])map.upper[z-1][q.x+','+q.y]='floor';
 if(z)map.stairs=[{x:r.entry.x,y:r.entry.y,z:0,kind:'stairs'}];
 map.upper[z][r.exit.x+','+r.exit.y]='floor';map.starts[0]=r.entry;
 const keys=[z,z+1].map(level=>edgeBetween({...r.high,z:level},{...r.exit,z:level}));
 return {map,r,keys};
}
const link=(map,a,b)=>neighbors(map,a).some(p=>p.kind==='ramp'&&p.x===b.x&&p.y===b.y&&p.z===b.z);
test('crest barriers on either logical level block ascent and descent in every orientation',()=>{
 for(const direction of Object.keys(RAMP_DIRECTIONS))for(const z of [0,1]){
  const {map,r,keys}=fixture(direction,z);assert.deepEqual(validateMap(map,{connectivity:false}),[]);
  for(const kind of ['wall-brick','fence-chainlink','door-wood-closed'])for(const levels of [[0],[1],[0,1]]){
   map.edges=Object.fromEntries(levels.map(i=>[keys[i],kind]));
   assert.equal(link(map,r.high,r.exit),false,`${direction} ${z} ${kind} ascent ${levels}`);
   assert.equal(link(map,r.exit,r.high),false,`${direction} ${z} ${kind} descent ${levels}`);
   assert.ok(validateMap(map,{connectivity:false}).some(e=>e.includes('upper connection')));
   // Opening/removing a boundary on the existing map must restore the links.
   for(const open of ['doorway-concrete-open','fence-cut',null]){
    map.edges=Object.fromEntries(levels.flatMap(i=>open?[[keys[i],open]]:[]));
    assert.ok(link(map,r.high,r.exit));assert.ok(link(map,r.exit,r.high));assert.deepEqual(validateMap(map,{connectivity:false}),[]);
   }
  }
 }
});
test('editor rejects a crest wall at either level atomically and invalid saved maps cannot reload',()=>{
 for(const direction of Object.keys(RAMP_DIRECTIONS))for(const z of [0,1]){
  const {map,r,keys}=fixture(direction,z),doc=new EditingDocument().open(JSON.stringify(map)),before=doc.export();
  for(const level of [0,1]){
   const result=doc.apply({tool:'wall',start:{...r.high,z:z+level,edge:keys[level]},options:{edgeKind:'wall-brick'}});
   assert.equal(result.ok,false);assert.match(result.error,/upper connection/);assert.equal(doc.export(),before);
   const invalid=structuredClone(map);invalid.edges[keys[level]]='wall-brick';assert.throws(()=>new EditingDocument().open(JSON.stringify(invalid)),/upper connection/);
  }
 }
});
test('a newly blocked crest stops an already queued step in both directions without consuming movement',()=>{
 for(const direction of Object.keys(RAMP_DIRECTIONS))for(const z of [0,1])for(const descending of [false,true])for(const level of [0,1]){
  const {map,r,keys}=fixture(direction,z),from=descending?r.exit:r.high,to=descending?r.high:r.exit;map.starts[0]=from;
  const s=createGame(1,map,false),u=s.units[0];refresh(s);
  for(const p of [r.high,r.exit])s.seen.add(p.z?`${p.x},${p.y},${p.z}`:`${p.x},${p.y}`);
  assert.ok(move(s,u,to.x,to.y,to.z),'clear crest should queue');const before={x:u.x,y:u.y,z:u.z,ap:u.ap,steps:u.steps};
  s.edges[keys[level]]='wall-brick';stepMovement(s);
  assert.deepEqual({x:u.x,y:u.y,z:u.z,ap:u.ap,steps:u.steps},before);assert.equal(s.queue.length,0);
  delete s.edges[keys[level]];assert.ok(move(s,u,to.x,to.y,to.z));assert.ok(stepMovement(s));assert.equal(u.z,to.z);
 }
});
