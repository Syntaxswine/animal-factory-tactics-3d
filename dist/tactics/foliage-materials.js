import {GRASS_GLSL} from './painted-grass.js';
import {SAND_GLSL} from './painted-sand.js';
import {DIAGONAL_ROADS,diagonalRoad} from './diagonal-roads.js';
import * as T from './vendor/three.module.js';
export const FOLIAGE_ATLAS='../assets/environment/painted/foliage-atlas-v1.png';
export const FOLIAGE_MATERIALS=new Set([...DIAGONAL_ROADS,'cover-grass','grass','grass-blade','foliage','leaf-light','pine','bark']);
// Mirrored repetition makes both sides of every texture boundary meet, even
// where hand-painted source edges differ. Insets keep mip filtering in a panel.
export function mirroredPaintUV(u,v,panel){
 const mirror=n=>1-Math.abs(((n%2)+2)%2-1),o=[[0,.5],[.5,.5],[0,0],[.5,0]][panel];
 return [o[0]+.004+mirror(u)*.492,o[1]+.004+mirror(v)*.492];
}
export function paintFoliageMaterial(material,kind,texture){
 const road=diagonalRoad(kind),cacheKind=kind;if(road)kind=road.grass==='cover-grass'?'cover-grass':'grass';
 const panel=kind==='pine'?2:kind==='bark'?3:kind==='cover-grass'||kind==='grass'||kind==='grass-blade'?0:1;
 const offset=[[0,.5],[.5,.5],[0,0],[.5,0]][panel];
 material.map.dispose();material.map=texture;material.roughness=1;
 material.color.setHex(kind==='cover-grass'?0x77956e:kind==='leaf-light'?0xe5edb8:kind==='grass-blade'?0xbcca83:0xd4ddbf);
 material.customProgramCacheKey=()=> 'painted-foliage-v2-'+cacheKind;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vNaturePosition,vNatureNormal,vNatureLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vNaturePosition=(instanceMatrix*vec4(position,1.)).xyz;vNatureLocal=position;
   mat3 basis=mat3(instanceMatrix);vec3 scaled=normal/vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]));vNatureNormal=normalize(basis*scaled);
  `);
  shader.fragmentShader='varying vec3 vNaturePosition,vNatureNormal,vNatureLocal;\n'+shader.fragmentShader;
  const sample=(uv)=>`texture2D(map,vec2(${offset[0].toFixed(1)},${offset[1].toFixed(1)})+.004+(1.-abs(mod(${uv},2.)-1.))*.492).rgb`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 weights=pow(abs(normalize(vNatureNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
   vec3 q=vNaturePosition*${['grass','cover-grass'].includes(kind)?'.45':kind==='bark'?'1.8':kind==='pine'?'.65':'.80'};
   ${kind==='pine'?`// Cone UVs run from hem to tip. Repeat around the tier only: vertical mirroring would invert the hanging branches.
    vec2 pineUV=vec2(1.-abs(mod(vMapUv.x*4.,2.)-1.),clamp(vMapUv.y,0.,1.));
    vec3 paint=texture2D(map,vec2(.004,.004)+pineUV*.492).rgb;
   `:kind==='bark'?`vec2 barkUV=vec2(atan(vNatureLocal.z,vNatureLocal.x)/6.2831853+0.5,(vNatureLocal.y+.5)*1.5);vec3 paint=${sample('barkUV')};`:`vec3 paint=${sample('q.zy')}*weights.x+${sample('q.xz')}*weights.y+${sample('q.xy')}*weights.z;`}
   ${kind==='grass'?`paint=mix(vec3(.20,.27,.105),paint,.40);`:''}
   ${kind==='grass-blade'?`paint=mix(vec3(.12,.23,.055),vec3(.35,.46,.15),clamp(vNatureLocal.y+.5,0.,1.));`:''}
   diffuseColor.rgb*=paint;
  `);
  if(road&&road.grass!=='grass'&&road.grass!=='cover-grass'){
   shader.fragmentShader=GRASS_GLSL+SAND_GLSL+shader.fragmentShader;
   const base=road.grass==='concrete'?'pow((vec3(127.,128.,113.)+mod(floor(vNaturePosition.x*128.)*73.+floor(vNaturePosition.z*128.)*97.,17.)-8.)/255.,vec3(2.2))':road.grass==='sand'?'sandPaint(vNaturePosition.xz)':road.grass==='meadow-sand'?'mix(meadowPaint(vNaturePosition.xz,-1.),sandPaint(vNaturePosition.xz),sandCoverage(vNaturePosition.xz,.5))':'meadowPaint(vNaturePosition.xz,'+Number(road.grass.slice(-1)).toFixed(1)+')';
   shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb*=paint;','diffuseColor.rgb*=paint; diffuseColor.rgb='+base+';');
  }
  if(road){const expression={nw:'1.-uv.x-uv.y',ne:'uv.x-uv.y',se:'uv.x+uv.y-1.',sw:'uv.y-uv.x'}[road.corner];
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',    '#include <alphamap_fragment>\n vec2 uv=fract(vNaturePosition.xz+.5); float rd=('+expression+')/1.41421356; float grain=mod(floor(vNaturePosition.x*128.)*73.+floor(vNaturePosition.z*128.)*97.,17.)-8.; vec3 paving=pow((vec3(61.,66.,63.)+grain)/255.,vec3(2.2)); if(rd>=0.)diffuseColor.rgb=paving; '+(road.border?'if(abs(rd)<.045)diffuseColor.rgb=pow((vec3(127.,128.,113.)+grain)/255.,vec3(2.2));':''));
  }
  if(kind==='grass-blade')shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=max(outgoingLight,diffuseColor.rgb*.75);\n#include <opaque_fragment>');
 };
 material.needsUpdate=true;
}
