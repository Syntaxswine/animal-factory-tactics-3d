import * as T from './vendor/three.module.js';
// Shared low-poly leaf masses, instanced by chunk. The same clipped ellipsoids
// define sight obstruction; real deadfall supplies independent projectile cover.
export function createFoliageScreens(plan,{plantMaterials,decorate=m=>m}){
 const root=new T.Group(),instances=[],groups=new Map(),world=plan.obstacles;root.name='Foliage sight screens and solid deadfall';
 const data=new Uint8Array(plan.width*plan.depth);for(const s of world.screens)if(s.z===plan.level)data[s.y*plan.width+s.x]=255;
 const mask=new T.DataTexture(data,plan.width,plan.depth,T.RedFormat);mask.unpackAlignment=1;mask.needsUpdate=true;
 const base=plan.family==='wetlands'?plantMaterials.wet:plan.family==='jungle'?plantMaterials.jungle:plan.family==='snow'?plantMaterials.snow:plan.family==='dry'?plantMaterials.dry:plantMaterials.leaves;
 const decorated=decorate(base),material=decorated.clone();material.onBeforeCompile=decorated.onBeforeCompile;material.customProgramCacheKey=decorated.customProgramCacheKey;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.customProgramCacheKey=()=>key+'-foliage-footprint-v1';
 material.onBeforeCompile=(s,r)=>{compile.call(material,s,r);s.uniforms.foliageFootprint={value:mask};s.vertexShader='varying vec2 vFoliageFootprint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  vFoliageFootprint=(modelMatrix*instanceMatrix*vec4(position,1.)).xz;
 `);s.fragmentShader='varying vec2 vFoliageFootprint;uniform sampler2D foliageFootprint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
  vec2 foliageCell=floor(vFoliageFootprint+.5);if(any(lessThan(foliageCell,vec2(0.)))||any(greaterThanEqual(foliageCell,vec2(${plan.width.toFixed(1)},${plan.depth.toFixed(1)})))||texture2D(foliageFootprint,(foliageCell+.5)/vec2(${plan.width.toFixed(1)},${plan.depth.toFixed(1)})).r<.5)discard;
 `);};
 const crown=new T.SphereGeometry(1,6,4),cap=new T.CircleGeometry(1,10),cylinder=new T.CylinderGeometry(1,1,1,5),up=new T.Vector3(0,1,0),identity=new T.Quaternion();
 const exposed=s=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!plan.blockedAt(s.x+dx,s.y+dy)||plan.heightAt(s.x+dx,s.y+dy)!==s.base);
 const chunk=(x,y)=>{const key=`${Math.floor(x/24)},${Math.floor(y/24)}`;if(!groups.has(key))groups.set(key,{leaves:[],caps:[],wood:[]});return groups.get(key);};
 for(const s of world.screens)if(s.z===plan.level&&s.family===plan.family){
  const group=chunk(s.x,s.y);
  for(const l of (exposed(s)?s.lobes:s.lobes.slice(-1)))group.leaves.push(new T.Matrix4().compose(new T.Vector3(...l.center),identity,new T.Vector3(...l.radius)));
  // Clipping a closed mass opens its skin at a clearing. Close only those cut
  // faces, using the same ellipsoid cross section and painted foliage material.
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(!plan.opaqueAt(s.x+dx,s.y+dy)||plan.heightAt(s.x+dx,s.y+dy)!==s.base)for(const l of s.lobes){
   const f=Math.sqrt(1-.25/(l.radius[0]*l.radius[0])),rotation=new T.Quaternion().setFromAxisAngle(up,dx?dx*Math.PI/2:dy>0?0:Math.PI);
   group.caps.push(new T.Matrix4().compose(new T.Vector3(s.x+dx*.4999,l.center[1],s.y+dy*.4999),rotation,new T.Vector3(l.radius[0]*f,l.radius[1]*f,1)));
  }
 }
 const bark=decorate(plantMaterials.bark);
 for(const w of world.wood)if(w.source.z===plan.level&&w.family===plan.family&&exposed({x:w.source.x,y:w.source.y,base:plan.heightAt(w.source.x,w.source.y)})){const {a,b,radius}=w.beam,v=new T.Vector3(...b).sub(new T.Vector3(...a)),matrix=new T.Matrix4().compose(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(up,v.clone().normalize()),new T.Vector3(radius,v.length(),radius));chunk(w.source.x,w.source.y).wood.push(matrix);}
 for(const g of groups.values())for(const [matrices,geometry,paint]of [[g.leaves,crown,material],[g.caps,cap,material],[g.wood,cylinder,bark]])if(matrices.length){const mesh=new T.InstancedMesh(geometry,paint,matrices.length);matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(paint===material){const n=Math.sin(m.elements[12]*12.9898+m.elements[14]*78.233)*43758.5453,t=.78+.26*(n-Math.floor(n));mesh.setColorAt(i,new T.Color(t,t,t));}});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);instances.push(mesh);}
 return {root,screenCount:world.screens.filter(s=>s.z===plan.level&&s.family===plan.family).length,dispose(){root.removeFromParent();for(const m of instances)m.dispose();crown.dispose();cap.dispose();cylinder.dispose();material.dispose();mask.dispose();}};
}
