import * as T from './vendor/three.module.js';
import {createGroundComposition,groundHash} from './biome-ground-composition.js';
import {paintGroundFeature} from './biome-ground-sprites.js';
import {spriteRandom} from './biome-ground-sprite-layout.js';

export const GROUND_PAGE={tiles:24,pixelsPerTile:32,gutter:1,maxResident:16};
const canvasDefault=()=>typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1,1):null;
const bases=new WeakMap();
export function releaseGroundPaint(composition){const base=bases.get(composition);if(base)base.width=base.height=1;bases.delete(composition);}
function basePaint(composition){
 if(bases.has(composition))return bases.get(composition);
 const canvas=canvasDefault();canvas.width=(composition.width+4)*4;canvas.height=(composition.depth+4)*4;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height),data=pixels.data;
 for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++){
  const wx=-2.5+(px+.5)/4,wz=-2.5+(py+.5)/4,c=composition.colorAt(wx,wz),grain=(groundHash(px,py,composition.seed+57)-.5)*7,i=(py*canvas.width+px)*4;
  data[i]=c[0]+grain;data[i+1]=c[1]+grain;data[i+2]=c[2]+grain;data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);bases.set(composition,canvas);return canvas;
}
function paintBrushBed(ctx,bed,family,coarse){
 const r=spriteRandom(bed.inkSeed),colors=family==='jungle'?['#172f1d','#354c29','#70804c','#a3a365']:family==='dry'?['#665334','#907341','#c4ab68','#d5bd80']:['#333c21','#5b6030','#8d8c50','#aea168'];
 ctx.save();ctx.translate(bed.x-bed.size/2,bed.z-bed.size/2);ctx.scale(bed.size,bed.size);ctx.beginPath();ctx.rect(0,0,1,1);ctx.clip();
 for(let i=0;i<(coarse?30:350);i++){
  const x=r(),y=r(),edge=Math.min(x,y,1-x,1-y);if(r()>.35+edge*2.6)continue;
  const angle=r()*6.28,length=family==='dry'?.014+r()*.044:.007+r()*.023,width=length*(family==='dry'?.12:family==='jungle'?.65:.48),color=colors[Math.floor(r()*4)],skew=.35+r()*.55;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=.24+r()*.26;ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(-length,0);ctx.quadraticCurveTo(-length*skew,-width,length,0);ctx.quadraticCurveTo(length*.4,width*skew,-length,0);ctx.fill();ctx.restore();
 }
 // Tangled low stems make the blocked mat read as dense brush, including between
 // the large trees. These are freshly drawn paths, not repeated shrub pictures.
 for(let i=0;i<(coarse?4:35);i++){
  const x=.08+r()*.75,y=.08+r()*.75,angle=r()*6.28,l=.055+r()*.14,dx=Math.cos(angle)*l,dy=Math.sin(angle)*l;
  ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.45-dy*.2,y+dy*.45+dx*.2,x+dx,y+dy);ctx.lineWidth=.002+r()*.004;ctx.strokeStyle=colors[i%2];ctx.globalAlpha=.32;ctx.stroke();
 }
 ctx.restore();
}

// Absolute pixel centers and feature coordinates are essential: adjacent crops
// reproduce the same painting, including the parts outside their visible tile.
export function paintGroundRegion(composition,{x,z,width,depth,pixelsPerTile=32},canvas){
 canvas.width=Math.round(width*pixelsPerTile);canvas.height=Math.round(depth*pixelsPerTile);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;
 // Cache broad paint once at four pixels per tile. Detail pages only crop this
 // shared field and paint nearby features, avoiding per-frame megapixel noise.
 const base=basePaint(composition);ctx.drawImage(base,(x+2.5)*4,(z+2.5)*4,width*4,depth*4,0,0,canvas.width,canvas.height);
 ctx.save();ctx.scale(pixelsPerTile,pixelsPerTile);ctx.translate(-x,-z);for(const bed of composition.queryBeds(x,z,width,depth))paintBrushBed(ctx,bed,composition.family,pixelsPerTile<8);ctx.restore();
 for(const f of composition.query(x,z,width,depth)){
  if(pixelsPerTile<8&&f.kind==='litter')continue;
  ctx.save();ctx.translate((f.x-f.size/2-x)*pixelsPerTile,(f.z-f.size/2-z)*pixelsPerTile);ctx.scale(f.size*pixelsPerTile,f.size*pixelsPerTile);paintGroundFeature(ctx,f.recipe);ctx.restore();
 }
 return canvas;
}
function texture(canvas,name){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.flipY=false;t.name=name;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;return t;}
export function createConnectedGroundSkin(plan,family,{seed=173,canvasFactory=canvasDefault,onChange=()=>{}}={}){
 const composition=createGroundComposition(plan,family,seed),overviewCanvas=canvasFactory(),pages=new Map(),bindings=new Map(),strength={value:1},focus={value:new T.Vector2()},detail={value:0},waiters=[];
 let disposed=false,generationMs=0,generations=0,frame=0,needed=[],worker=null,workerReady=false,inFlight=null,overviewReady=!overviewCanvas,error=null,workerTerminated=false;
 // A tiny unique preview is available immediately. Full brushwork and detailed
 // pages are baked in an owned worker, never synchronously inside update().
 if(overviewCanvas){overviewCanvas.width=Math.ceil(plan.width/2);overviewCanvas.height=Math.ceil(plan.depth/2);const ctx=overviewCanvas.getContext('2d'),im=ctx.createImageData(overviewCanvas.width,overviewCanvas.height);for(let z=0;z<overviewCanvas.height;z++)for(let x=0;x<overviewCanvas.width;x++){im.data.set([...composition.colorAt(x*2+.5,z*2+.5),255],(z*overviewCanvas.width+x)*4);}ctx.putImageData(im,0,0);}
 const overview=overviewCanvas?texture(overviewCanvas,'Connected ground overview'):null;
 function attach(material,chunk){
  if(!overview)return;
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey(),uniforms={groundOverview:{value:overview},groundDetail:{value:overview},groundPageOrigin:{value:new T.Vector2()},groundPageSize:{value:26},groundHasPage:{value:0}};
  bindings.set(chunk.index,uniforms);material.customProgramCacheKey=()=>cache+'-connected-ground-v1';
  material.onBeforeCompile=s=>{
   previous.call(material,s);Object.assign(s.uniforms,uniforms,{groundStrength:strength,groundFocus:focus,groundDetailAmount:detail,groundMapSize:{value:new T.Vector2(plan.width,plan.depth)}});
   s.vertexShader='varying vec2 vConnectedGround; varying float vConnectedTop;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvConnectedGround=position.xz;vConnectedTop=abs(normal.y);');
   s.fragmentShader=`varying vec2 vConnectedGround;varying float vConnectedTop;
    uniform sampler2D groundOverview,groundDetail;uniform vec2 groundPageOrigin,groundMapSize,groundFocus;uniform float groundPageSize,groundHasPage,groundStrength,groundDetailAmount;
   `+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 groundColor=texture2D(groundOverview,(vConnectedGround+.5)/groundMapSize).rgb;
    float closePaint=groundHasPage*groundDetailAmount*(1.-smoothstep(18.,24.,distance(vConnectedGround,groundFocus)));
    groundColor=mix(groundColor,texture2D(groundDetail,(vConnectedGround-groundPageOrigin)/groundPageSize).rgb,closePaint);
    diffuseColor.rgb=mix(diffuseColor.rgb,groundColor,pow(clamp(vConnectedTop,0.,1.),4.)*groundStrength);
   `);
  };
 }
 function closeImage(image){if(image?.close)image.close();else if(image)image.width=image.height=1;}
 function release(key){const p=pages.get(key);if(!p)return;const u=bindings.get(key);if(u){u.groundHasPage.value=0;u.groundDetail.value=overview;}p.texture.dispose();closeImage(p.image);pages.delete(key);}
 const pending=()=>needed.filter(c=>!pages.has(c.index)).length;
 function settle(){if(disposed||error||overviewReady&&pending()===0){for(const waiter of waiters.splice(0))error?waiter.reject(Error(error)):waiter.resolve(!disposed);}}
 function accept(c,image,ms){
  const wanted=new Set(needed.map(n=>n.index));
  if(pages.size>=GROUND_PAGE.maxResident){const victim=[...pages].filter(([key])=>!wanted.has(key)).sort((a,b)=>a[1].lastUsed-b[1].lastUsed)[0];if(victim)release(victim[0]);else {closeImage(image);return;}}
  const x=c.x-1.5,z=c.z-1.5,t=texture(image,'Connected ground '+c.x+','+c.z);pages.set(c.index,{image,texture:t,x,z,lastUsed:frame});generations++;generationMs+=ms;
  const u=bindings.get(c.index);if(u){u.groundDetail.value=t;u.groundHasPage.value=wanted.has(c.index)?1:0;u.groundPageOrigin.value.set(x,z);}
 }
 function pump(){
  if(disposed||error||inFlight)return;const c=needed.find(n=>!pages.has(n.index));if(!c){settle();return;}
  if(worker){if(!workerReady)return;inFlight=c;worker.postMessage({type:'page',index:c.index,x:c.x-1.5,z:c.z-1.5});}
  else {const start=performance.now(),canvas=canvasFactory();paintGroundRegion(composition,{x:c.x-1.5,z:c.z-1.5,width:26,depth:26,pixelsPerTile:32},canvas);accept(c,canvas,performance.now()-start);pump();}
 }
 if(overviewCanvas&&typeof Worker!=='undefined'){
  const blocked=new Uint8Array(plan.width*plan.depth),heights=new Float64Array(blocked.length);for(let z=0;z<plan.depth;z++)for(let x=0;x<plan.width;x++){const i=z*plan.width+x;blocked[i]=plan.blockedAt(x,z)?1:0;heights[i]=plan.heightAt(x,z);}
  worker=new Worker(new URL('./biome-ground-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
   if(disposed){closeImage(data.image);return;}
   if(data.type==='overview'){closeImage(overview.image);overview.image=data.image;overview.needsUpdate=true;overviewReady=workerReady=true;}
   else if(data.type==='page'){const c=inFlight;inFlight=null;if(c)accept(c,data.image,data.ms);else closeImage(data.image);}
   else if(data.type==='error'){error=data.message;}
   settle();onChange();pump();
  };
  worker.onerror=e=>{error=e.message||'Ground paint worker failed';settle();onChange();};
  worker.postMessage({type:'init',width:plan.width,depth:plan.depth,family,seed,blocked,heights},[blocked.buffer,heights.buffer]);
 }else if(overviewCanvas){paintGroundRegion(composition,{x:-.5,z:-.5,width:plan.width,depth:plan.depth,pixelsPerTile:2},overviewCanvas);overview.needsUpdate=true;overviewReady=true;}
 function update(chunks,point,ppu){
  if(disposed||!overview)return;focus.value.set(point.x,point.z);detail.value=T.MathUtils.smoothstep(ppu,5,12);
  needed=detail.value>0&&strength.value?chunks.filter(c=>c.inView&&c.distance<24&&c.dense).sort((a,b)=>a.distance-b.distance).slice(0,GROUND_PAGE.maxResident):[];
  frame++;
  for(const u of bindings.values())u.groundHasPage.value=0;
  for(const c of needed){
   const cached=pages.get(c.index);if(cached){cached.lastUsed=frame;bindings.get(c.index).groundHasPage.value=1;}
  }
  pump();settle();
 }
 return {composition,pages,overview,attach,update,setEnabled(v){strength.value=v?1:0;},whenReady(){if(error)return Promise.reject(Error(error));if(disposed||overviewReady&&!pending())return Promise.resolve(!disposed);return new Promise((resolve,reject)=>waiters.push({resolve,reject}));},get stats(){const pixels=!disposed&&overview?overview.image.width*overview.image.height+pages.size*832*832:0,base=bases.get(composition);return {...composition.stats,seed,residentPages:pages.size,activePages:needed.length,pendingPages:pending(),overviewReady,worker:!!worker,workerTerminated,error,maxResidentPages:GROUND_PAGE.maxResident,textureBytes:Math.ceil(pixels*4*4/3),canvasBytes:(pixels+(base?base.width*base.height:0))*4,workerBaseBytes:!disposed&&worker?(plan.width+4)*(plan.depth+4)*16*4:0,generations,generationMs,mode:'connected world painting'};},dispose(){if(disposed)return;disposed=true;worker?.terminate();workerTerminated=!!worker;for(const key of [...pages.keys()])release(key);overview?.dispose();closeImage(overview?.image);releaseGroundPaint(composition);bindings.clear();needed=[];inFlight=null;settle();}};
}
