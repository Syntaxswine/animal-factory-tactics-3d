import * as T from './vendor/three.module.js';
import {makePeriodic,LOOP_SECONDS} from './water-animation.js';

export const CLIFF_WATER_LEVEL=0;
export const CLIFF_WATER_SOURCE='../assets/environment/foliage/river-water.png';

// Extract the actual closed solid's foot, including old pieces and transformed
// roots. Interior bottom-triangle edges cancel; no foam along internal tiles.
export function cliffWaterBoundary(mesh){
 mesh.updateWorldMatrix(true,false);const p=mesh.geometry.attributes.position,index=mesh.geometry.index,edges=new Map(),count=index?index.count:p.count;
 const key=v=>v.toArray().map(n=>n.toFixed(6)).join(',');
 for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));if(v.some(p=>Math.abs(p.y-CLIFF_WATER_LEVEL)>1e-6))continue;
  for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,{a:[a.x,a.z],b:[b.x,b.z]});}
 }
 return [...edges.values()];
}

// Rasterize only a small neighbourhood of each segment. This avoids a costly
// per-fragment loop over hundreds of edges and follows both banks of a gorge.
export function cliffWaterDistance(segments,{size=40,resolution=1024,reach=.45}={}){
 if(!Number.isFinite(size)||size<=0||!Number.isInteger(resolution)||resolution<2||resolution>4096||!Number.isFinite(reach)||reach<=0)throw Error('Invalid water distance field');
 const data=new Uint8Array(resolution*resolution).fill(255),step=size/resolution,half=size/2;
 for(const {a,b}of segments){if(!a||!b||a.length!==2||b.length!==2||![...a,...b].every(Number.isFinite))throw Error('Invalid water boundary');
  const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;if(length<1e-14)continue;
  const lo=(n)=>Math.max(0,Math.floor((n-reach+half)/step)),hi=(n)=>Math.min(resolution-1,Math.ceil((n+reach+half)/step));
  for(let z=lo(Math.min(a[1],b[1]));z<=hi(Math.max(a[1],b[1]));z++)for(let x=lo(Math.min(a[0],b[0]));x<=hi(Math.max(a[0],b[0]));x++){
   const px=(x+.5)*step-half,pz=(z+.5)*step-half,t=Math.max(0,Math.min(1,((px-a[0])*dx+(pz-a[1])*dz)/length)),distance=Math.hypot(px-a[0]-t*dx,pz-a[1]-t*dz),i=z*resolution+x;
   data[i]=Math.min(data[i],Math.round(Math.min(1,distance/reach)*255));
  }
 }
 return {data,size,resolution,reach};
}

export async function loadCliffWaterTexture(){
 const image=new Image();image.src=CLIFF_WATER_SOURCE;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,128,128);const pixels=ctx.getImageData(0,0,128,128);pixels.data.set(makePeriodic(pixels.data,128,128,128));ctx.putImageData(pixels,0,0);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
}

export function createCliffWater(texture,{size=40,resolution=1024}={}){
 const field=cliffWaterDistance([],{size,resolution}),distance=new T.DataTexture(field.data,resolution,resolution,T.RedFormat);distance.minFilter=distance.magFilter=T.LinearFilter;distance.generateMipmaps=false;distance.needsUpdate=true;
 const uniforms={waterPaint:{value:texture},waterDistance:{value:distance},waterSize:{value:size},waterReach:{value:field.reach},waterPhase:{value:0}},material=new T.MeshStandardMaterial({roughness:.72,metalness:0});
 material.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader='varying vec2 vWaterWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(position,1.)).xz;');s.fragmentShader=`varying vec2 vWaterWorld;uniform sampler2D waterPaint;uniform sampler2D waterDistance;uniform float waterSize;uniform float waterReach;uniform float waterPhase;\n`+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 uv=vWaterWorld/3.;float tau=6.28318530718;
  vec2 drift=vec2(.012*sin(tau*uv.y+waterPhase)+.005*sin(tau*(uv.x+uv.y)-2.*waterPhase),.009*cos(tau*uv.x-waterPhase)+.004*sin(tau*(uv.x-uv.y)+waterPhase));
  vec3 paint=texture2D(waterPaint,uv+drift).rgb;paint=vec3(.32,.72,.79)*dot(paint,vec3(.2126,.7152,.0722));
  float shore=texture2D(waterDistance,vWaterWorld/waterSize+.5).r*waterReach;
  float broken=.5+.5*sin(vWaterWorld.x*19.+sin(vWaterWorld.y*17.)+waterPhase);
  float contact=1.-smoothstep(.015,.09+broken*.035,shore);
  float ripple=(1.-smoothstep(.12,.27,shore))*smoothstep(.035,.085,shore)*(.5+.5*sin(shore*62.-waterPhase*2.+broken*2.));
  diffuseColor.rgb=mix(paint*.93,vec3(.40,.52,.43),contact*(.35+broken*.2)+ripple*.10);
 `);};material.customProgramCacheKey=()=> 'cliff-water-v1';
 const geometry=new T.PlaneGeometry(size,size);geometry.rotateX(-Math.PI/2);const mesh=new T.Mesh(geometry,material);mesh.position.y=CLIFF_WATER_LEVEL;mesh.receiveShadow=true;mesh.name='cliff-water';let disposed=false;
 return {mesh,uniforms,setCliffs(meshes){const next=cliffWaterDistance(meshes.flatMap(cliffWaterBoundary),{size,resolution});distance.image.data.set(next.data);distance.needsUpdate=true;},update(seconds){if(!Number.isFinite(seconds))throw Error('Invalid water time');uniforms.waterPhase.value=((seconds%LOOP_SECONDS+LOOP_SECONDS)%LOOP_SECONDS)/LOOP_SECONDS*Math.PI*2;},dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();distance.dispose();}};
}
