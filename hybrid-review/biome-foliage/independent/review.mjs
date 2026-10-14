import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {launchSiteReview} from '../../../tools/site-review-browser.mjs';
import * as T from '../../../dist/tactics/vendor/three.module.js';
import {BIOME_PLANTS,BIOME_PAINT} from '../../../dist/tactics/biome-foliage-data.js';
import {createBiomePlantFactory} from '../../../dist/tactics/biome-foliage-models.js';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=import.meta.dirname,root=path.resolve(out,'../../..'),result={time:new Date().toISOString(),geometry:[],captures:[],errors:[],requests:[],hashes:{}};
for(const file of ['biome-foliage-data.js','biome-foliage-models.js','biome-foliage-paint.js','biome-foliage-study.js','biome-foliage-study.html','biome-foliage-study.css'])result.hashes[file]=createHash('sha256').update(fs.readFileSync(path.join(root,'dist/tactics',file))).digest('hex');
const borrowed=new T.MeshBasicMaterial(),factory=createBiomePlantFactory(Object.fromEntries([...Object.keys(BIOME_PAINT),'grey'].map(k=>[k,borrowed])));
function exactBounds(r){r.updateWorldMatrix(true,true);const b=new T.Box3(),v=new T.Vector3();r.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,indices=o.geometry.index;for(const i of new Set(indices?indices.array:Array.from({length:a.count},(_,i)=>i))){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(v.toArray().every(Number.isFinite));b.expandByPoint(v);}});return b;}
try{for(const id of Object.keys(BIOME_PLANTS))for(const variant of [0,1,2])for(const mature of [false,true]){
 const plant=factory.create(id,{variant,mature}),b=exactBounds(plant);assert.deepEqual(plant.position.toArray(),[0,0,0]);assert.ok(Math.abs(b.min.y)<1e-7,id+' local ground '+b.min.y);
 assert.ok(b.min.distanceTo(new T.Vector3(...plant.userData.bounds.min))<1e-7);assert.ok(b.max.distanceTo(new T.Vector3(...plant.userData.bounds.max))<1e-7);
 plant.position.set(-9,3.25,6);plant.rotation.y+=.37;const placed=exactBounds(plant);assert.ok(Math.abs(placed.min.y-3.25)<1e-7,id+' placed ground '+placed.min.y);
 result.geometry.push({id,variant,mature,minY:b.min.y,placedMinY:placed.min.y,height:b.max.y,triangles:plant.userData.triangles});
}}finally{factory.dispose();borrowed.dispose();}
const name='independent-biome-'+Date.now(),owner=await launchSiteReview(chromium,name,'biome-foliage');result.helperName=name;
try{
 const page=await owner.browser.newPage({viewport:{width:1560,height:1080}});page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});page.on('requestfailed',r=>result.requests.push(r.url()));
 await page.goto('http://127.0.0.1:4476/tactics/biome-foliage-study.html');await page.waitForFunction(()=>window.biomeReady||window.biomeDisposed,null,{timeout:60000});assert.ok(await page.evaluate(()=>biomeReady));
 async function shot(name,options){const state=await page.evaluate(o=>biomeStudy.set(o),options);await page.screenshot({path:path.join(out,name+'.png')});result.captures.push({name,state});}
 await shot('all-game',{biome:'all',view:'three',scale:'58',growth:'normal',variant:0,grey:false,grid:false,horse:true});
 for(const biome of ['jungle','temperate','snow','dry','wetlands']){
  await shot(biome+'-front',{biome,view:'front',scale:'125',growth:'normal',variant:1,grey:false,grid:true,horse:true});
  await shot(biome+'-game',{view:'three',scale:'58',variant:2,grid:false});
 }
 await shot('jungle-top',{biome:'jungle',view:'top',scale:'125',variant:0});
 await shot('wetlands-grey',{biome:'wetlands',view:'three',grey:true,scale:'125',variant:2});
 await shot('snow-mature',{biome:'snow',growth:'mature',grey:false,view:'three',scale:'125',variant:2});
 await shot('grounds-top',{biome:'all',display:'ground',growth:'normal',view:'top',scale:'125',grid:false});
 await shot('ground-jungle-close',{biome:'jungle',view:'top',scale:'125',horse:false});
 await shot('ground-wetland-close',{biome:'wetlands',view:'three',scale:'125'});
 result.warm=await page.evaluate(()=>{const a=[];for(let loop=0;loop<2;loop++){for(const growth of ['normal','mature'])for(const variant of [0,1,2])for(const grey of [false,true])biomeStudy.set({biome:'all',display:'plants',growth,variant,grey});biomeStudy.set({biome:'all',display:'plants',growth:'normal',variant:0,grey:false});a.push({...biomeState.resources});}return a;});assert.deepEqual(result.warm[0],result.warm[1]);
 result.exports=await page.evaluate(async()=>{
  const manifest=await (await fetch('../assets/environment/biome-foliage/ground-tiles/tiles.json')).json(),families={};
  for(const [name,files]of Object.entries(manifest.families)){
   const edges=[],canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d',{willReadFrequently:true});let baseline,difference=0;
   for(const file of files){const image=new Image();image.src='../assets/environment/biome-foliage/ground-tiles/'+file;await image.decode();if(image.width!==512||image.height!==512)throw Error('Tile size');ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,512,512).data,e={left:[],right:[],top:[],bottom:[]};
    for(let i=0;i<512;i++)for(let c=0;c<3;c++){e.left.push(d[(i*512)*4+c]);e.right.push(d[(i*512+511)*4+c]);e.top.push(d[i*4+c]);e.bottom.push(d[((511*512)+i)*4+c]);}edges.push(e);
    if(!baseline)baseline=new Uint8ClampedArray(d);else for(let i=0;i<d.length;i++)difference+=Math.abs(d[i]-baseline[i]);
   }
   let max=0;for(const a of edges)for(const b of edges)for(let i=0;i<1536;i++)max=Math.max(max,Math.abs(a.left[i]-b.right[i]),Math.abs(a.top[i]-b.bottom[i]));families[name]={maxBorderChannelDelta:max,variantDifference:difference};
  }return {tileWorldSize:manifest.tileWorldSize,families};
 });for(const v of Object.values(result.exports.families)){assert.ok(v.maxBorderChannelDelta<=1);assert.ok(v.variantDifference>0);}
 result.disposal=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),s=biomeStudy,tracked=new Map();
  function watch(o,label){if(!o||tracked.has(o.uuid))return;const entry={label,type:o.type||o.constructor.name,count:0};tracked.set(o.uuid,entry);o.addEventListener('dispose',()=>entry.count++);}
  for(const [name,tex]of Object.entries(s.textures))watch(tex,'input:'+name);for(const [name,g]of Object.entries(s.factory.geometries))watch(g,'factory:'+name);
  for(const [name,m]of Object.entries(s.materials))watch(m,'material:'+name);for(const [name,m]of Object.entries(s.groundMaterials))watch(m,'ground:'+name);
  s.scene.traverse(o=>{if(o.isMesh){watch(o.geometry,'sceneGeometry:'+o.name);for(const m of Array.isArray(o.material)?o.material:[o.material])watch(m,'sceneMaterial:'+m.name);}if(o.isDirectionalLight){watch(o.shadow.map,'sun:shadowTarget');watch(o.shadow.mapPass,'sun:shadowPass');}});
  const calls={},old=T.Texture.prototype.dispose;T.Texture.prototype.dispose=function(){calls[this.uuid]=(calls[this.uuid]||0)+1;return old.call(this);};
  try{s.dispose();s.dispose();s.set({biome:'jungle'});return {tracked:[...tracked.values()],textureCalls:Object.values(calls),ready:biomeReady,disposed:biomeDisposed,canvases:document.querySelectorAll('#scene canvas').length};}finally{T.Texture.prototype.dispose=old;}
 });assert.equal(result.disposal.ready,false);assert.equal(result.disposal.disposed,true);assert.equal(result.disposal.canvases,0);
 for(const r of result.disposal.tracked)assert.equal(r.count,1,r.label+' disposed '+r.count);for(const n of result.disposal.textureCalls)assert.equal(n,1,'duplicate texture disposal');
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.requests,[]);await page.close();
}finally{await owner.closeReview();fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify({geometryCases:result.geometry.length,captures:result.captures.length,warm:result.warm,exportSeams:result.exports,disposeResources:result.disposal.tracked.length,errors:result.errors,helperName:name}));
