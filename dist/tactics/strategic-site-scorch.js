import * as T from './vendor/three.module.js';
import {SITE_SLAB_HEIGHT} from './strategic-sites.js';

export const SITE_SCORCH_ATLAS='../assets/effects/painted-fire/ground-scorch-atlas-v1.png';
// Local X/Z, width/depth, rotation, painted atlas cell and density. Broad marks
// cross tile joins; smaller marks follow the retained falling equipment.
const patterns={
 radio:[[.6,-.3,6.1,5.8,.27,0,.88],[1.5,.9,4.1,3.4,-.60,2,.67],[-1.15,-1.3,3.5,3.7,.75,1,.53],[2.3,-2.25,2.0,1.8,-.35,3,.48]],
 radar:[[.3,-.25,6.3,5.7,-.40,1,.88],[1.4,.95,4.2,3.7,.50,3,.67],[-1.25,-1.3,3.8,3.2,-.10,2,.52],[-2.3,.2,2.1,2.7,.75,0,.43]],
 sam:[[0,0,6.7,5.4,.10,2,.90],[-1.7,.85,4.1,3.6,-.45,0,.67],[1.7,-.7,3.8,3.7,.55,3,.70],[.75,2.5,2.5,2.1,-.60,1,.53]],
};
const clamp=n=>Math.max(0,Math.min(1,n));
export function siteScorchAmount(time){
 if(!Number.isFinite(time))throw TypeError('Scorch time must be finite');
 const t=clamp((time-.5)/1.5);return t*t*(3-2*t);
}

// A separate cosmetic layer, shared by the static wreck and the animation.
// It never enters geometry/clearance analysis or changes the approved model.
// Coordinates are local to the site, including clipping, so placement and
// rotation do not move the stain away from its slab. The atlas is caller-owned.
export function createSiteScorch(atlas,id){
 if(!patterns[id])throw RangeError('Unknown strategic site: '+id);
 if(!atlas?.isTexture)throw TypeError('A painted scorch atlas is required');
 const root=new T.Group();root.name=id+'-ground-scorch';root.userData={cosmetic:true,siteId:id};
 const positions=[],uvs=[],styles=[];
 for(const [x,z,w,d,angle,cell,density]of patterns[id]){
  const c=Math.cos(angle),s=Math.sin(angle);
  for(const [u,v]of [[0,0],[0,1],[1,0],[1,0],[0,1],[1,1]]){
   const px=(u-.5)*w,pz=(v-.5)*d;
   positions.push(x+c*px-s*pz,SITE_SLAB_HEIGHT+.003,z+s*px+c*pz);uvs.push(u,v);styles.push(cell,density);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('scorchStyle',new T.Float32BufferAttribute(styles,2));
 geometry.computeBoundingSphere();
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  uniforms:{atlas:{value:atlas},amount:{value:0}},
  vertexShader:`attribute vec2 scorchStyle;varying vec2 vUv,vStyle,vSite;void main(){vUv=uv;vStyle=scorchStyle;vSite=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D atlas;uniform float amount;varying vec2 vUv,vStyle,vSite;
   void main(){float rim=4.0-max(abs(vSite.x),abs(vSite.y));if(rim<=0.0)discard;
    vec2 frame=vec2(mod(vStyle.x,2.0),1.0-floor(vStyle.x/2.0));vec4 c=texture2D(atlas,(frame+clamp(vUv,.006,.994))*.5);
    c.a*=amount*vStyle.y*smoothstep(0.0,.18,rim);if(c.a<.005)discard;gl_FragColor=c;
    #include <colorspace_fragment>
   }`
 });
 const mesh=new T.Mesh(geometry,material);mesh.name='Painted burned site tiles';mesh.renderOrder=-1;root.add(mesh);root.visible=false;
 let disposed=false;
 function setAmount(value){
  if(disposed)throw Error('Site scorch has been disposed');
  if(!Number.isFinite(value))throw TypeError('Scorch amount must be finite');
  material.uniforms.amount.value=clamp(value);root.visible=material.uniforms.amount.value>0;return diagnostics();
 }
 function diagnostics(){return {site:id,amount:material.uniforms.amount.value,visible:root.visible,patches:patterns[id].length,height:SITE_SLAB_HEIGHT+.003,disposed};}
 return {root,mesh,setAmount,at:time=>setAmount(siteScorchAmount(time)),diagnostics,
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();geometry.dispose();material.dispose();},
 };
}
