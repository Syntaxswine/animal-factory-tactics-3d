import * as T from './vendor/three.module.js';
import {BIOME_PAINT,BIOME_GROUNDS,GROUND_TILE_SIZE,GROUND_VARIANTS} from './biome-foliage-data.js';

export function atlasRect([column,row,columns,rows]){const inset=.04;return {origin:[(column+inset)/columns,1-(row+1-inset)/rows],size:[(1-inset*2)/columns,(1-inset*2)/rows]};}
export function configureBiomeTexture(texture){texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;}
const coordinates=`varying vec3 vBiomePosition,vBiomeNormal;
 vec2 bmMirror(vec2 p){return 1.-abs(mod(p,2.)-1.);}
`;
function installCoordinates(shader){
 shader.vertexShader='varying vec3 vBiomePosition,vBiomeNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  mat4 bm=modelMatrix;
  #ifdef USE_INSTANCING
   bm*=instanceMatrix;
  #endif
  vBiomePosition=(bm*vec4(transformed,1.)).xyz;
  mat3 basis=mat3(bm);vec3 corrected=normal/vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]));vBiomeNormal=normalize(basis*corrected);
 `);
 shader.fragmentShader=coordinates+shader.fragmentShader;
}
// Derive ground LOD before fract() introduces a discontinuity at tile edges.
// Clamp its footprint to the atlas inset, retaining mip filtering without
// sampling neighboring panels or turning tile boundaries into bright lines.
function sampler(rect,ground=false){return `vec3 bmPaint(vec2 p){vec2 span=vec2(${rect.size.join(',')}),continuous=${ground?'vBiomePosition.xz/'+GROUND_TILE_SIZE.toFixed(1):'p'},pixels=vec2(textureSize(map,0));vec2 dx=dFdx(continuous)*span*pixels,dy=dFdy(continuous)*span*pixels;float lod=clamp(log2(max(.0001,max(length(dx),length(dy)))),0.,4.);return textureLod(map,vec2(${rect.origin.join(',')})+bmMirror(p)*span,lod).rgb;}`;}
export function createBiomeMaterials(textures){
 const result={};
 for(const [id,spec]of Object.entries(BIOME_PAINT)){
  const m=new T.MeshStandardMaterial({map:textures[spec.atlas],roughness:1,side:T.DoubleSide,color:0xffffff});m.name='biome:'+id;m.customProgramCacheKey=()=> 'biome-paint-v1-'+id;
  m.onBeforeCompile=s=>{installCoordinates(s);s.fragmentShader=s.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\n'+sampler(atlasRect(spec.panel)));
   const sample=spec.projection==='uv'?'bmPaint(vMapUv)':spec.projection==='needles'?'bmPaint(vec2(vMapUv.x*4.,clamp(vMapUv.y,0.,1.)))':spec.projection==='hanging'?'bmPaint(vec2(vMapUv.x*3.,clamp(vMapUv.y,0.,1.)))':spec.projection==='bark'?'bmPaint(vec2(vMapUv.x,vBiomePosition.y*.65))':`(bmPaint(vBiomePosition.zy*.8)*weights.x+bmPaint(vBiomePosition.xz*.8)*weights.y+bmPaint(vBiomePosition.xy*.8)*weights.z)`;
   s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec3 weights=pow(abs(normalize(vBiomeNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);diffuseColor.rgb*=${sample};`);
  };result[id]=m;
 }
 result.grey=new T.MeshStandardMaterial({color:0xb5b3a2,roughness:1,side:T.DoubleSide});return result;
}
export function createBiomeGround(texture,kind,{variant=-1,unlit=false}={}){
 if(!BIOME_GROUNDS[kind])throw Error('Unknown ground family: '+kind);if(!Number.isInteger(variant)||variant< -1||variant>=GROUND_VARIANTS)throw Error('Invalid ground variant');
 const m=unlit?new T.MeshBasicMaterial({map:texture,toneMapped:false}):new T.MeshStandardMaterial({map:texture,roughness:1});m.name='ground:'+kind+':'+variant;
 m.customProgramCacheKey=()=> 'biome-ground-v1-'+kind+'-'+variant+'-'+unlit;
 m.onBeforeCompile=s=>{installCoordinates(s);s.fragmentShader=s.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\n'+sampler(atlasRect(BIOME_GROUNDS[kind]),true)+`
  vec3 bmPeriodic(vec2 uv,vec2 offset){vec2 p=uv+offset,w=smoothstep(vec2(.65),vec2(1.),uv);return mix(mix(bmPaint(p),bmPaint(p-vec2(1,0)),w.x),mix(bmPaint(p-vec2(0,1)),bmPaint(p-vec2(1,1)),w.x),w.y);}
  vec3 bmGround(vec2 world){vec2 cell=floor(world/${GROUND_TILE_SIZE.toFixed(1)}),uv=fract(world/${GROUND_TILE_SIZE.toFixed(1)});float variant=${variant===-1?'mod(cell.x*7.+cell.y*11.,4.)':variant.toFixed(1)};float fade=pow(sin(uv.x*3.14159265)*sin(uv.y*3.14159265),2.);return mix(bmPeriodic(uv,vec2(0)),bmPeriodic(uv,vec2(.237,.371)*variant),fade*.80);}
 `);s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','diffuseColor.rgb*=bmGround(vBiomePosition.xz);');};
 m.userData={family:kind,variant,tileSize:GROUND_TILE_SIZE,note:'All four patterns share borders. Keep world coordinates when batching tiles.'};return m;
}
