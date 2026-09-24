import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,move,stepMovement} from '../dist/tactics/core/engine.js';
import {pickFloorSurface} from '../dist/tactics/battle-floor-picking.js';
import {HybridRenderer} from '../dist/tactics/hybrid-renderer.js';
import {rectangleMembers} from '../dist/tactics/battle-selection.js';
const ray=(x,y)=>new T.Ray(new T.Vector3(x,20,y),new T.Vector3(0,-1,0));
function fixture(){const m=blankMap();m.starts[0]={x:8,y:8,z:0};m.climbs=[{x:8,y:8,z:0,dx:1,dy:0,kind:'cliff'}];for(let x=9;x<=11;x++){setTerrain(m,x,8,1,'floor');m.props.push({x,y:8,z:0,kind:'cliff-ledge'});}return createGame(1,m,true,'easy');}
test('automatic surface picking selects upper cap, cutaway picks ground, and empty upper space falls through',()=>{
 const s=fixture(),top=pickFloorSurface(s,ray(10,8),2);assert.deepEqual([top.x,top.y,top.z,top.distance],[10,8,1,18]);
 assert.equal(pickFloorSurface(s,ray(10,8),0).z,0);assert.equal(pickFloorSurface(s,ray(8,8),2).z,0);
 s.difficulty='standard';s.seen=new Set(['10,8']);assert.equal(pickFloorSurface(s,ray(10,8),2).z,0);
 s.seen.add('10,8,1');assert.equal(pickFloorSurface(s,ray(10,8),2).z,1);
 assert.equal(pickFloorSurface(s,ray(-10,-10)),null);
});
test('one destination click paths to a remote upper tile and back through the authored cliff link',()=>{
 const s=fixture(),u=s.units[0];s.phase='won';const target=pickFloorSurface(s,ray(11,8));assert.ok(move(s,u,target.x,target.y,target.z));
 for(let i=0;i<20&&s.queue.length;i++)stepMovement(s);
 assert.deepEqual([u.x,u.y,u.z],[11,8,1]);assert.equal(s.cliffTraversals.length,1);
 assert.ok(move(s,u,8,8,0));for(let i=0;i<20&&s.queue.length;i++)stepMovement(s);
 assert.deepEqual([u.x,u.y,u.z],[8,8,0]);assert.equal(s.cliffTraversals.at(-1).direction,'down');
});
test('cross-floor clicks do not invent routes or bypass AP limits',()=>{
 const s=fixture(),u=s.units[0];s.phase='player';u.ap=7;assert.equal(move(s,u,11,8,1),false);
 u.ap=30;s.climbs=[];assert.equal(move(s,u,11,8,1),false);
});
test('ordinary upper floors use their own height and route through stairs',()=>{
 const m=blankMap();m.starts[0]={x:8,y:8,z:0};m.stairs=[{x:8,y:8,z:0}];for(let x=8;x<=10;x++)setTerrain(m,x,8,1,'floor');
 const s=createGame(1,m,true,'easy'),u=s.units[0],goal=pickFloorSurface(s,ray(10,8));
 assert.equal(goal.z,1);assert.ok(Math.abs(goal.distance-17.88)<1e-8);assert.ok(move(s,u,goal.x,goal.y,goal.z));
 for(let i=0;i<20&&s.queue.length;i++)stepMovement(s);assert.deepEqual([u.x,u.y,u.z],[10,8,1]);
});
test('renderer retains lower actors while displaying upper floors and respects cutaway and detection',()=>{
 const s=fixture();s.terrain=s.map;s.units=[{id:0,x:1,y:1,z:0,hp:100,team:'squad'},{id:1,x:2,y:1,z:1,hp:100,team:'squad'},{id:2,x:3,y:1,z:2,hp:100,team:'squad'},{id:3,x:4,y:1,z:0,hp:100,team:'guard'}];
 const r=Object.create(HybridRenderer.prototype),world={boxes:[]},geometry=new T.BoxGeometry(.4,1,.4),material=new T.MeshBasicMaterial();
 Object.assign(r,{camera:new T.OrthographicCamera(),width:800,height:600,renderer:{render(){},domElement:{}},scene:new T.Scene(),actors:new Map(),editorWorld:world,world,mapSignature:JSON.stringify([s.terrain,s.upper,s.edges,s.props,s.stairs]),rebuild(){},prune(){},animateMaterials(){},actor(u){if(!this.actors.has(u.id))this.actors.set(u.id,new T.Mesh(geometry,material));const mesh=this.actors.get(u.id);mesh.position.set(u.x,(u.z||0)*2.12+.5,u.y);mesh.updateMatrixWorld(true);return mesh;}});
 const ctx={drawImage(){}},view={x:400,y:200,zoom:1};
 assert.deepEqual(r.draw(ctx,s,view,800,600,1,{maxLevel:1}).map(p=>p.id),[0,1]);
 assert.deepEqual(r.draw(ctx,s,view,800,600,0,{maxLevel:2}).map(p=>p.id),[0,1,2]);
 assert.deepEqual(r.draw(ctx,s,view,800,600,0,{maxLevel:0}).map(p=>p.id),[0]);
 assert.deepEqual(rectangleMembers(s.units,1,{x:0,y:0},{x:5,y:5},u=>u),[0,1]);geometry.dispose();material.dispose();
});
