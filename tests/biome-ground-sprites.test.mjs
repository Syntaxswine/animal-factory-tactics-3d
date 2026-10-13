import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createGroundSpriteLayout,groundSpriteRecipes,GROUND_SPRITE_FAMILIES} from '../dist/tactics/biome-ground-sprite-layout.js';
import {tutorialFoliagePlan} from '../dist/tactics/biome-terrain-plan.js';
const map=JSON.parse(fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/rough-plateau.json',import.meta.url))),plan=tutorialFoliagePlan(map);

test('exported transparent sheets and source fingerprints match the reproducible handoff',()=>{
 const root=new URL('../',import.meta.url),assets=new URL('dist/assets/environment/biome-ground-sprites/',root),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',assets))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const [file,hash]of Object.entries(manifest.sourceHashes))assert.equal(sha(fs.readFileSync(new URL(file,root),'utf8').replaceAll('\r\n','\n')),hash,'Re-export ground sprites after changing the generator');
 assert.equal(manifest.assets.length,5);for(const asset of manifest.assets){const png=fs.readFileSync(new URL(asset.file,assets));assert.equal(sha(png),asset.sha256);assert.equal(png.readUInt32BE(16),2048);assert.equal(png.readUInt32BE(20),1024);assert.equal(png[25],6,'PNG must keep its alpha channel');assert.deepEqual(asset.panels,groundSpriteRecipes(asset.family,manifest.seed));}
});

test('saved seed reproduces both placements and sprite recipe; new seed changes paint without changing the map',()=>{
 const before=JSON.stringify(map),a=createGroundSpriteLayout(plan,'temperate',173),b=createGroundSpriteLayout(plan,'temperate',173),c=createGroundSpriteLayout(plan,'temperate',829);
 assert.deepEqual(a,b);assert.notDeepEqual(a.recipes,c.recipes);assert.notDeepEqual(a.layers[0].data,c.layers[0].data);assert.equal(JSON.stringify(map),before);
 assert.equal(a.stats.addedTriangles,0);assert(a.stats.large>150);assert(a.stats.litter>2000);assert.equal(new Set(a.layers.flatMap(l=>l.placements.map(p=>p.index))).size,32);
});
for(const family of GROUND_SPRITE_FAMILIES)test(family+' sprite footprints respect paths, map limits, concave edges and elevation changes',()=>{
 for(const seed of [173,829,1409]){
  const skin=createGroundSpriteLayout(plan,family,seed);for(const l of skin.layers)for(const p of l.placements){
   for(let z=Math.floor(p.min[1]+.5);z<=Math.floor(p.max[1]+.5);z++)for(let x=Math.floor(p.min[0]+.5);x<=Math.floor(p.max[0]+.5);x++){assert(plan.blockedAt(x,z),'Paint would cross a route');assert.equal(plan.heightAt(x,z),p.height,'Paint would bridge a cliff');}
  }
 }
});
test('large sprites cross real tile and render-block boundaries rather than restarting per chunk',()=>{
 const a=createGroundSpriteLayout(plan,'temperate').layers[0];
 assert(a.placements.filter(p=>p.length>4).length>60);
 const crossing=a.placements.filter(p=>[0,1].some(axis=>Math.floor((p.min[axis]+.5)/24)!==Math.floor((p.max[axis]+.5)/24)));assert(crossing.length>70);
 // A single stored descriptor supplies both sides of an actual chunk boundary.
 for(const p of crossing){const axis=[0,1].find(axis=>Math.floor((p.min[axis]+.5)/24)!==Math.floor((p.max[axis]+.5)/24)),edge=(Math.floor((p.min[axis]+.5)/24)+1)*24-.5;
  const points=[-.00001,.00001].map(d=>{const xy=[p.x,p.z];xy[axis]=edge+d;const cell=xy.map((v,i)=>Math.floor((v+a.offset[i])/a.size));return (cell[1]*a.width+cell[0])*4;});assert.equal(points[0],points[1]);assert.equal(a.data[points[0]],p.index+1);
 }
});
test('one-tile corridors and one-tile height steps exclude the complete painted footprint',()=>{
 const width=64,depth=64,p={width,depth,blockedAt:(x,z)=>x>=0&&z>=0&&x<width&&z<depth&&x!==29&&z!==35,heightAt:(x,z)=>x<0||z<0||x>=width||z>=depth?null:z>=48?2.12:0};
 const s=createGroundSpriteLayout(p,'snow');assert(s.layers[0].placements.length>5);
 for(const layer of s.layers)for(const stamp of layer.placements){assert(stamp.max[0]<28.5||stamp.min[0]>29.5);assert(stamp.max[1]<34.5||stamp.min[1]>35.5);assert(stamp.max[1]<47.5||stamp.min[1]>47.5);}
});
test('wetland deadfall is shorter than upland logs and palettes have independent seeded drawings',()=>{
 const mean=r=>r.filter(p=>p.kind==='deadfall').reduce((n,p)=>n+p.length,0)/12;
 assert(mean(groundSpriteRecipes('wetlands'))<mean(groundSpriteRecipes('temperate'))*.85);
 assert.notDeepEqual(groundSpriteRecipes('jungle'),groundSpriteRecipes('temperate'));
 for(const seed of [NaN,-1,1.5,Infinity,2147483648])assert.throws(()=>groundSpriteRecipes('snow',seed));assert.throws(()=>groundSpriteRecipes('unknown'));
});
