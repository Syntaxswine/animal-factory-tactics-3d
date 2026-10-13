import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {launchSiteReview} from '../../../tools/site-review-browser.mjs';
import {tutorialFoliagePlan} from '../../../dist/tactics/biome-terrain-plan.js';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(import.meta.dirname,'final'),root=path.resolve(import.meta.dirname,'../../..');fs.mkdirSync(out,{recursive:true});
const result={date:new Date().toISOString(),errors:[],requests:[],captures:[],hashes:{}};
for(const name of ['biome-atlas-lod.js','biome-foliage-paint.js','biome-terrain.js','biome-terrain-plan.js','biome-terrain-study.js','biome-terrain-study.html','biome-obstacles.js','biome-obstacle-data.js','biome-obstacle-paint.js'])result.hashes[name]=createHash('sha256').update(fs.readFileSync(path.join(root,'dist/tactics',name))).digest('hex');
const original=fs.readFileSync(path.join(root,'dist/tactics/sector-library/tutorial-step-1/rough-plateau.json'),'utf8'),map=JSON.parse(original),plan=tutorialFoliagePlan(map);
assert.equal(JSON.stringify(map),JSON.stringify(JSON.parse(original)));result.plan={source:plan.source,cells:plan.cells.length,markers:[]};
for(const marker of plan.reservedMarkers){const h=plan.heightAt(marker.x,marker.z);assert(!plan.blockedAt(marker.x,marker.z));for(const [x,z]of marker.corridor)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){assert.equal(plan.heightAt(x+dx,z+dz),h);assert(!plan.blockedAt(x+dx,z+dz));}result.plan.markers.push({x:marker.x,z:marker.z,length:marker.corridor.length});}
assert.equal(plan.reservedMarkers.length,5);for(const [x,z]of [[118,143],[117,144],[116,145]])assert(plan.blockedAt(x,z));
const name='independent-terrain-final-'+Date.now(),owner=await launchSiteReview(chromium,name,'biome-obstacles-review');result.helper=name;
try{
 const page=await owner.browser.newPage({viewport:{width:1560,height:1080}});page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});page.on('requestfailed',r=>result.requests.push(r.url()));
 await page.goto('http://127.0.0.1:4476/tactics/biome-terrain-study.html');await page.waitForFunction(()=>window.biomeTerrainReady||window.biomeTerrainDisposed,null,{timeout:60000});assert.ok(await page.evaluate(()=>biomeTerrainReady));
 async function shot(name,options){const state=await page.evaluate(o=>biomeTerrainStudy.set(o),options);await page.screenshot({path:path.join(out,name+'.png')});result.captures.push({name,state});}
 for(const biome of ['temperate','jungle','snow','dry','wetlands'])await shot(biome+'-map',{biome,frame:'overview',view:'three',grey:false,trees:true,blocked:false});
 await shot('snow-top',{biome:'snow',view:'top'});await shot('snow-route',{frame:'corridor',view:'three'});await shot('snow-route-low',{view:'low'});
 await shot('jungle-route',{biome:'jungle',view:'three'});await shot('jungle-grey',{grey:true,view:'low'});
 await shot('bog-route',{biome:'wetlands',view:'three',grey:false});await shot('bog-cliff',{frame:'cliff'});await shot('reserved-map',{biome:'temperate',frame:'overview',view:'top',trees:false,blocked:true});
 result.geometry=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),s=biomeTerrainStudy,p=s.plan,v=new T.Vector3(),instance=new T.Matrix4(),world=new T.Matrix4();let checked=0,nonfinite=0,spills=0,wrongHeight=0;const examples=[];
  // Independently inspect every non-ground/line triangle vertex of the current
  // tree + undergrowth instances against the exact blocked-cell footprint.
  s.terrain.root.updateWorldMatrix(true,true);
  for(const mesh of s.terrain.root.children.filter(o=>o.isInstancedMesh)){
   const a=mesh.geometry.attributes.position;
   for(let n=0;n<mesh.count;n++){mesh.getMatrixAt(n,instance);world.multiplyMatrices(mesh.matrixWorld,instance);
    for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(world);checked++;if(!v.toArray().every(Number.isFinite)){nonfinite++;continue;}
     const xs=[Math.floor(v.x+.49999),Math.floor(v.x+.50001)],zs=[Math.floor(v.z+.49999),Math.floor(v.z+.50001)];if(!xs.some(x=>zs.some(z=>p.blockedAt(x,z)))){spills++;if(examples.length<8)examples.push({mesh:mesh.name,point:v.toArray()});}
    }
   }
  }return {checked,nonfinite,spills,examples};
 });assert.equal(result.geometry.nonfinite,0);assert.equal(result.geometry.spills,0);
 // Test small real orbit changes at map scale; use screenshots for visual
 // filtering inspection rather than treating different views as equal pixels.
 await shot('jungle-orbit-before',{biome:'jungle',frame:'overview',view:'three',trees:true,blocked:false});const box=await page.locator('#scene canvas').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+7,box.y+box.height*.5+3,{steps:7});await page.mouse.up();await page.screenshot({path:path.join(out,'jungle-orbit-after.png')});
 result.disposal=await page.evaluate(()=>{const s=biomeTerrainStudy,counts=new Map();function watch(o,label){if(!o||counts.has(o.uuid))return;const r={label,count:0};counts.set(o.uuid,r);o.addEventListener('dispose',()=>r.count++);}for(const [key,t]of Object.entries(s.textures))watch(t,'texture:'+key);for(const collection of [s.plantMaterials,s.obstacleMaterials,s.grounds,s.plantFactory.geometries,s.obstacleFactory.geometries])for(const [key,r]of Object.entries(collection))watch(r,key);s.scene.traverse(o=>{if(o.geometry)watch(o.geometry,o.name+':geometry');if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])watch(m,o.name+':material');if(o.isInstancedMesh)watch(o,o.name+':instance');if(o.isDirectionalLight)watch(o.shadow.map,'sun-shadow');});s.dispose();s.dispose();return {resources:[...counts.values()],live:s.obstacleFactory.liveCount,canvases:document.querySelectorAll('#scene canvas').length};});for(const r of result.disposal.resources)assert.equal(r.count,1,r.label);assert.equal(result.disposal.live,0);assert.equal(result.disposal.canvases,0);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.requests,[]);await page.close();
}finally{await owner.closeReview();fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify({captures:result.captures.length,plan:result.plan,geometry:result.geometry,disposed:result.disposal.resources.length,errors:result.errors,helper:result.helper}));
