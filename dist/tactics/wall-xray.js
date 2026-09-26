import * as T from './vendor/three.module.js';

export const XRAY_DIAMETER_TILES=5;
export const xrayWall=box=>box.kind==='wall';
// Screen-space circle, measured in projected world units, so it follows the
// pointer even when it is over a tall wall rather than the ground plane.
export const xrayRadius=zoom=>XRAY_DIAMETER_TILES*.5*28*Math.sqrt(2)*zoom;
const declarations='uniform vec2 xrayCenter;\nuniform float xrayRadius;\nuniform bool xrayActive;\n';
const inside='distance(gl_FragCoord.xy,xrayCenter)<xrayRadius';

export class WallXray {
 constructor(){
  this.uniforms={xrayCenter:{value:new T.Vector2()},xrayRadius:{value:0},xrayActive:{value:false}};
  this.materials=new Map();this.overlays=new Map();this.pointer=null;
  this.wireMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
   uniforms:this.uniforms,
   vertexShader:'attribute mat4 wallMatrix; attribute vec3 wallColor; varying vec3 wireColor; void main(){wireColor=wallColor;gl_Position=projectionMatrix*modelViewMatrix*wallMatrix*vec4(position,1.);}',
   fragmentShader:declarations+`varying vec3 wireColor; void main(){if(!xrayActive||!(${inside}))discard;gl_FragColor=vec4(wireColor,.34);}`});
 }
 setPointer(x,y){this.pointer=Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;}
 update(width,height,zoom,pixelRatio=1){
  const p=this.pointer;this.uniforms.xrayActive.value=!!p&&p.x>=0&&p.y>=0&&p.x<width&&p.y<height;
  this.uniforms.xrayCenter.value.set((p?.x||0)*pixelRatio,(height-(p?.y||0))*pixelRatio);
  this.uniforms.xrayRadius.value=xrayRadius(zoom)*pixelRatio;
  for(const wire of this.overlays.values())wire.visible=this.uniforms.xrayActive.value;
 }
 material(source){
  if(this.materials.has(source))return this.materials.get(source);
  const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);shader.fragmentShader=declarations+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(xrayActive&&${inside})discard;`);};
  material.customProgramCacheKey=()=>key+'-cursor-wall-xray-v1';this.materials.set(source,material);return material;
 }
 sync(chunks){
  const keep=new Set(chunks.values());
  for(const [mesh,wire]of this.overlays)if(!keep.has(mesh)){wire.removeFromParent();wire.geometry.dispose();this.overlays.delete(mesh);}
  for(const mesh of keep){
   if(!mesh.userData.boxes?.every(xrayWall)||this.overlays.has(mesh))continue;
   const edges=new T.EdgesGeometry(mesh.geometry),geometry=new T.InstancedBufferGeometry();geometry.setAttribute('position',edges.getAttribute('position').clone());edges.dispose();
   geometry.setAttribute('wallMatrix',new T.InstancedBufferAttribute(mesh.instanceMatrix.array.slice(),16));geometry.instanceCount=mesh.count;
   geometry.setAttribute('wallColor',new T.InstancedBufferAttribute(new Float32Array(mesh.userData.boxes.flatMap(b=>b.id.includes(':door')?[1,.76,.36]:[.79,.86,.76])),3));
   geometry.boundingSphere=mesh.boundingSphere.clone();
   const wire=new T.LineSegments(geometry,this.wireMaterial);wire.name='cursor-wall-wire';wire.userData.noShadow=true;wire.raycast=()=>{};
   mesh.add(wire);this.overlays.set(mesh,wire);
  }
 }
 dispose(){for(const wire of this.overlays.values()){wire.removeFromParent();wire.geometry.dispose();}this.overlays.clear();for(const m of this.materials.values())m.dispose();this.materials.clear();this.wireMaterial.dispose();}
}

// Rendering discards only pixels; original instance geometry remains pickable.
export function pickWallDoor(ray,chunks,level){
 const doors=[...chunks.values()].filter(mesh=>mesh.userData.boxes?.[0]?.kind==='wall'&&mesh.userData.boxes.some(b=>b.id.includes(':door')));
 for(const hit of ray.intersectObjects(doors,false)){
  const box=hit.object.userData.boxes?.[hit.instanceId],edge=box?.source.edge;
  if(edge&&box.id.includes(':door')&&Number(edge.split(':')[3]||0)===level)return edge;
 }
 return null;
}
