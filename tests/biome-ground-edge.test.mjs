import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundEdgeField,groundEdgeWeight} from '../dist/tactics/biome-ground-edge.js';
import {createTerrainFill} from '../dist/tactics/biome-terrain-fill.js';
const plan=(blocked,level=()=>0)=>({width:72,depth:72,blockedAt:(x,z)=>x>=0&&z>=0&&x<72&&z<72&&blocked(x,z),heightAt:(x,z)=>x>=0&&z>=0&&x<72&&z<72?level(x,z):null});
test('a straight edge blends continuously but leaves the route centre untouched',()=>{
 const p=plan(x=>x>=24),f=createGroundEdgeField(p);
 for(let z=1;z<70;z+=.23){assert.equal(groundEdgeWeight(f.sample(23,z)),0);assert.equal(groundEdgeWeight(f.sample(25,z)),1);assert.equal(groundEdgeWeight(f.sample(23.15,z)),0);}
 assert(Math.abs(f.sample(23.5,20))<.009);assert(Math.abs(f.sample(23.49,20)-f.sample(23.51,20))<.022);
 assert.equal(f.fringe[20*72+23],1,'The entirely open chunk next to X=24 still needs a paint page');
 assert.equal(f.fringe[20*72+20],0);
});
test('one-cell corridors and diagonal passages preserve an untinted open centre',()=>{
 for(const p of [plan((x,z)=>x!==29&&z!==35),plan((x,z)=>x!==z),plan((x,z)=>!(x>=28&&x<=31&&z>=28&&z<=31))]){
  const before=Array.from({length:72*72},(_,i)=>p.blockedAt(i%72,Math.floor(i/72))),f=createGroundEdgeField(p);
  for(let z=0;z<72;z++)for(let x=0;x<72;x++)if(!p.blockedAt(x,z))assert.equal(groundEdgeWeight(f.sample(x,z)),0,`Route centre painted at ${x},${z}`);
  assert.deepEqual(Array.from({length:72*72},(_,i)=>p.blockedAt(i%72,Math.floor(i/72))),before);
 }
});
test('a blocked one-tile island still has a distinct interior',()=>{
 const f=createGroundEdgeField(plan((x,z)=>x===30&&z===30));assert(groundEdgeWeight(f.sample(30,30))>.6);
 for(const p of [[29,30],[31,30],[30,29],[30,31]])assert.equal(groundEdgeWeight(f.sample(...p)),0);
});
test('colour cannot bleed between different plateau levels, including subpixel margins',()=>{
 for(const alongX of [true,false]){
  const p=plan((x,z)=>(alongX?x:z)<24,(x,z)=>(alongX?x:z)<24?0:2.12),f=createGroundEdgeField(p);
  for(let s=23.01;s<24;s+=.009){const a=alongX?[s,18]:[18,s];assert.equal(groundEdgeWeight(f.sample(...a)),s<23.5?1:0,'Cross-cliff wash at '+a);}
 }
});
test('the field stays continuous at render-block boundaries and clamps outside the map',()=>{
 const f=createGroundEdgeField(plan((x,z)=>z>=20&&z<50));
 for(let z=18;z<51;z+=.07)for(const seam of [23.5,47.5])assert(Math.abs(f.sample(seam-.0001,z)-f.sample(seam+.0001,z))<.00001);
 assert.equal(f.sample(-10,0),f.sample(0,0));assert.equal(f.sample(100,70),f.sample(71,70));assert.equal(f.data.byteLength+f.barriers.byteLength,72*72*17);
});
test('changing a diagonal elevated quadrant cannot change lower-level edge paint',()=>{
 for(const dx of [-1,1])for(const dz of [-1,1]){
  const elevated=(x,z)=>(x-23.5)*dx>0&&(z-23.5)*dz>0,level=(x,z)=>elevated(x,z)?2.12:0;
  const a=createGroundEdgeField(plan((x,z)=>!elevated(x,z)&&(z-23.5)*dz<0,level));
  const b=createGroundEdgeField(plan((x,z)=>elevated(x,z)||(z-23.5)*dz<0,level));
  for(const epsilon of [.001,.01,.05,.12,.15]){
   const x=23.5-dx*epsilon,z=23.5-dz*epsilon;
   assert.equal(a.sample(x,z),b.sample(x,z),'Different-level occupancy leaked diagonally at '+[x,z]);
  }
 }
});
test('the visible foot tapers down without changing interior drift heights',()=>{
 const p=plan(x=>x>=24);
 for(const family of ['temperate','jungle','snow','dry','wetlands']){
  const before=createTerrainFill(p,family,{softEdge:false}),after=createTerrainFill(p,family);
  assert(after.height(23.6,30)<before.height(23.6,30)*.35,family+' retains a vertical lip');
  for(let x=25;x<65;x+=.37)assert.equal(after.height(x,30),before.height(x,30),family+' interior volume changed');
 }
});
test('concave bank corners settle onto the ground instead of retaining a dark vertical lip',()=>{
 const p=plan((x,z)=>!(x>=24&&z>=24));
 for(const family of ['temperate','jungle','snow','dry','wetlands']){
  const before=createTerrainFill(p,family,{softEdge:false}),after=createTerrainFill(p,family);
  assert(before.height(23.5,23.5)>.02);assert(Math.abs(after.height(23.5,23.5)-.003)<1e-8);
 }
});
