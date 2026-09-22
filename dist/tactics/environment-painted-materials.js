import * as THREE from './vendor/three.module.js';
export const CATALOG_ATLAS='../assets/environment/painted-study/catalog-materials-v1.png';
export const WOOD_ATLAS='../assets/environment/painted-study/material-atlas-v2.png';
// Quiet large surfaces leave the character and silhouettes in charge. Contrast
// is retained in the authored brushwork, not amplified into uniform distress.
const QUIET={steel:[.17,.22,.23,.48],enamel:[.48,.45,.37,.36],linen:[.55,.50,.39,.42],sand:[.40,.33,.22,.45],concrete:[.23,.22,.19,.35],grass:[.12,.16,.065,.38],dirt:[.20,.12,.065,.40],gravel:[.22,.20,.16,.35],asphalt:[.065,.067,.063,.42],bark:[.19,.095,.045,.58],foliage:[.065,.12,.028,.48],pine:[.035,.085,.045,.46],'leaf-light':[.11,.15,.045,.45],brick:[.24,.095,.047,.53],metal:[.17,.22,.23,.46],wood:[.23,.13,.055,.62],tiles:[.48,.45,.37,.30],rust:[.24,.095,.045,.55]};
// index, world repeat in units, color modulation. All 16 cells are authored paint.
export const PAINTED_SURFACES=Object.freeze({
 steel:[0,1.5,0xd4d9d1],enamel:[1,1.6,0xe1dcc9],linen:[2,.8,0xeee1c9],sand:[2,1.4,0xb7a37f],
 concrete:[4,2,0xcec9bb],grass:[5,1.8,0xcbcbad],dirt:[6,1.7,0xbfb2a0],gravel:[7,1.3,0xc6bdac],
 asphalt:[8,2,0xb7b3aa],bark:[9,.9,0xbfab8b],foliage:[10,.9,0xbacb97],pine:[11,1,0xbbcdb2],
 water:[12,2.3,0x91b5bd],rust:[13,1.4,0xd4b396],'dark-metal':[14,1.4,0xbbb9ae],brick:[15,1.4,0xd5bba4],
 'leaf-light':[10,.8,0xd3d2a0],olive:[0,1.5,0xa9ae79],red:[13,1.5,0xe68a70],screen:[0,1.5,0x397e81],
 metal:[0,1.8,0xbac7c5],wood:[0,1.2,0xc7ab85],tiles:[1,2,0xd2d0bd]
});
export function createEnvironmentPaint(renderer,onReady=()=>{},onError=()=>{}){
 const loader=new THREE.TextureLoader(),textures=new Map(),materials=new Map();let disposed=false;
 const promises=[];
 function texture(path){if(textures.has(path))return textures.get(path);let resolve;promises.push(new Promise(r=>resolve=r));const t=loader.load(path,()=>{if(disposed){t.dispose();resolve();return;}resolve();onReady();},undefined,()=>{onError('Failed painted environment atlas: '+path);resolve();});t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(path,t);return t;}
 // Load eagerly; ready is stable even as catalog materials are introduced later.
 texture(CATALOG_ATLAS);texture(WOOD_ATLAS);
 function material(kind){if(materials.has(kind))return materials.get(kind);const [cell,period,color]=PAINTED_SURFACES[kind]||PAINTED_SURFACES.concrete,wood=kind==='wood',map=textures.get(wood?WOOD_ATLAS:CATALOG_ATLAS),m=new THREE.MeshStandardMaterial({map,color,roughness:.94,metalness:0});
  const quiet=QUIET[kind],edgeWear=['steel','enamel','metal'].includes(kind);
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 paintWorld,paintFacing,paintLocal;');
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    paintLocal=position;
    #ifdef USE_INSTANCING
     paintWorld=(instanceMatrix*vec4(position,1.)).xyz;
     mat3 paintInstanceBasis=mat3(instanceMatrix);vec3 unscaled=normal/vec3(dot(paintInstanceBasis[0],paintInstanceBasis[0]),dot(paintInstanceBasis[1],paintInstanceBasis[1]),dot(paintInstanceBasis[2],paintInstanceBasis[2]));paintFacing=normalize(paintInstanceBasis*unscaled);
    #else
     paintWorld=position;paintFacing=normal;
    #endif`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 paintWorld,paintFacing,paintLocal;
    vec2 paintCell(vec2 p){vec2 f=fract(p/${period.toFixed(3)});return ${wood?'vec2(.512,.512)+f*.476':`vec2(${((cell%4)/4+.003).toFixed(4)},${((3-Math.floor(cell/4))/4+.003).toFixed(4)})+f*.244`};}`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 w=pow(abs(normalize(paintFacing)),vec3(8.));w/=max(w.x+w.y+w.z,.001);
    vec3 localAbs=abs(paintLocal);float secondAxis=localAbs.x+localAbs.y+localAbs.z-min(localAbs.x,min(localAbs.y,localAbs.z))-max(localAbs.x,max(localAbs.y,localAbs.z));float edgeEmphasis=.32+.68*smoothstep(.26,.48,secondAxis);
    vec4 painted=texture2D(map,paintCell(paintWorld.zy))*w.x+texture2D(map,paintCell(paintWorld.xz))*w.y+texture2D(map,paintCell(paintWorld.xy))*w.z;
    ${quiet?`painted.rgb=mix(vec3(${quiet.slice(0,3).join(',')}),painted.rgb,${quiet[3]}${edgeWear?'*edgeEmphasis':''});`:''}
    diffuseColor*=painted;${kind==='tiles'?'vec2 joint=abs(fract(paintWorld.xz*2.)-.5);float grout=step(.478,max(joint.x,joint.y));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.65,grout);':''}`);
   if(kind==='water'){shader.uniforms.environmentTime={value:0};m.userData.waterTime=shader.uniforms.environmentTime;shader.fragmentShader='uniform float environmentTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat ripple=sin(paintWorld.x*8.+paintWorld.z*5.+environmentTime)*.035;normal=normalize(normal+vec3(ripple,0.,ripple*.6));');}
  };m.customProgramCacheKey=()=>`painted-catalog-${kind}`;materials.set(kind,m);return m;
 }
 return {material,ready:Promise.all(promises),dispose(){disposed=true;materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());materials.clear();textures.clear();}};
}
