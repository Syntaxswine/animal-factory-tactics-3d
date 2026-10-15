import * as T from './vendor/three.module.js';
import {screenSurface,SCREEN_CHUNK_SIZE} from './foliage-screen-surface.js';

// Larger overlapping leaf fans are still clipped to the unchanged per-cell
// finite sight envelope. The float map carries base, height and lobe radius.
function clippedFringe(source,plan){
 const data=new Float32Array(plan.width*plan.depth*4);
 for(const s of plan.obstacles.screens)if(s.z===plan.level){const i=(s.y*plan.width+s.x)*4;data.set([s.base,s.height,s.lobes[2].radius[0],1],i);}
 const mask=new T.DataTexture(data,plan.width,plan.depth,T.RGBAFormat,T.FloatType);mask.unpackAlignment=1;mask.needsUpdate=true;
 const material=source.clone();material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;const compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.customProgramCacheKey=()=>key+'-finite-fringe-v1';
 material.onBeforeCompile=(s,r)=>{compile.call(material,s,r);s.uniforms.fringeEnvelope={value:mask};s.vertexShader='varying vec3 vFringeWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vFringeWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);s.fragmentShader='varying vec3 vFringeWorld;uniform sampler2D fringeEnvelope;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 vec2 cell=floor(vFringeWorld.xz+.5),dim=vec2(${plan.width.toFixed(1)},${plan.depth.toFixed(1)});
 if(any(lessThan(cell,vec2(0.)))||any(greaterThanEqual(cell,dim)))discard;
 vec4 envelope=texture2D(fringeEnvelope,(cell+.5)/dim);if(envelope.a<.5)discard;
 vec2 offset=vFringeWorld.xz-cell;float radius=envelope.b,top=envelope.r+envelope.g-.75+.75*sqrt(max(0.,1.-dot(offset,offset)/(radius*radius)));
 if(vFringeWorld.y>top+.04)discard;
 `);};return {material,mask};
}

export function createFoliageScreens(plan,{plantMaterials,screenMaterials,decorate=m=>m}){
 const root=new T.Group(),instances=[],geometries=[],nearMeshes=[],farMeshes=[],distantMeshes=[],world=plan.obstacles,surface=screenSurface(plan);root.name='Painted foliage sight screens and solid deadfall';
 if(!surface.cells.length)return {root,screenCount:0,update(){},dispose(){root.removeFromParent();}};
 const fallback=plan.family==='wetlands'?plantMaterials.wet:plan.family==='jungle'?plantMaterials.jungle:plan.family==='snow'?plantMaterials.snow:plan.family==='dry'?plantMaterials.dry:plantMaterials.leaves;
 const material=decorate(screenMaterials?.[plan.family]||fallback),fringeClip=screenMaterials?.[plan.family+'Fringe']&&clippedFringe(decorate(screenMaterials[plan.family+'Fringe']),plan),fringe=fringeClip?.material,bark=decorate(plantMaterials.bark),cylinder=new T.CylinderGeometry(1,1,1,5),up=new T.Vector3(0,1,0);geometries.push(cylinder);
 // Surface geometry is already inside the exact occupied tile footprint.
 // Fog is still chained through decorate, and each 24x24 chunk can be culled.
 for(const g of surface.chunks){
  const geometry=new T.BufferGeometry();for(const [name,array,size]of [['position',g.position,3],['normal',g.normal,3],['uv',g.uv,2],['color',g.color,3]])geometry.setAttribute(name,new T.Float32BufferAttribute(array,size));geometry.setIndex(g.index);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.push(geometry);
  const mesh=new T.Mesh(geometry,material);mesh.name='Continuous thicket '+g.key;mesh.receiveShadow=true;root.add(mesh);
  for(const [data,paint,list]of [[g.fringe,fringe,nearMeshes],[g.far,fringe,farMeshes],[g.distant,fringe,distantMeshes]])if(paint&&data.index.length){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.position,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));geometry.setIndex(data.index);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.push(geometry);const mesh=new T.Mesh(geometry,paint);mesh.receiveShadow=true;mesh.visible=list===nearMeshes;list.push(mesh);root.add(mesh);}
 }
 const wood=new Map();
 for(const w of world.wood)if(w.source.z===plan.level&&w.family===plan.family){
  const s={x:w.source.x,y:w.source.y,base:plan.heightAt(w.source.x,w.source.y)};if(![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>surface.exposed(s,dx,dy)))continue;
  const key=`${Math.floor(s.x/SCREEN_CHUNK_SIZE)},${Math.floor(s.y/SCREEN_CHUNK_SIZE)}`;if(!wood.has(key))wood.set(key,[]);
  const {a,b,radius}=w.beam,v=new T.Vector3(...b).sub(new T.Vector3(...a));wood.get(key).push(new T.Matrix4().compose(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(up,v.clone().normalize()),new T.Vector3(radius,v.length(),radius)));
 }
 for(const matrices of wood.values()){const mesh=new T.InstancedMesh(cylinder,bark,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);instances.push(mesh);}
 root.userData.ownedTextureBytes=fringeClip?plan.width*plan.depth*16:0;
 return {root,screenCount:surface.cells.length,update(ppu){const close=ppu>=18;for(const m of nearMeshes)m.visible=close;for(const m of farMeshes)m.visible=!close&&ppu>=9;for(const m of distantMeshes)m.visible=ppu<9;},dispose(){root.removeFromParent();for(const m of instances)m.dispose();for(const g of geometries)g.dispose();fringeClip?.material.dispose();fringeClip?.mask.dispose();}};
}
