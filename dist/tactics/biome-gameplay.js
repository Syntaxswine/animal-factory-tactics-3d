import {foliageAt,foliageTerrain,foliageGround} from './foliage-data.js';
import {localEnvironmentFamily} from './environment-regions.js';
import {isCliff} from './cliff-map.js';
import {propCells} from './environment.js';
import {SITE_PROPS} from './strategic-site-rules.js';
import {SCENERY_PROPS} from './scenery-catalog.js';
import {DIMENSIONS} from './hybrid-world.js';
import {BIOME_TERRAIN,biomeTree} from './biome-gameplay-data.js';
export {BIOME_TERRAIN,BIOME_TERRAIN_NAMES,biomeTree} from './biome-gameplay-data.js';
export function biomeOverride(map,x,y,z=0){
 const terrain=foliageTerrain(map,x,y,z);if(BIOME_TERRAIN[terrain])return BIOME_TERRAIN[terrain];
 if(['ground-dirt','ground-gravel'].includes(terrain))return 'dry';
 if(z&&foliageGround(terrain)&&(map.props||[]).some(p=>isCliff(p)&&p.x===x&&p.y===y&&(p.z||0)===z-1&&(p.cliffSand??0)>=.5))return 'dry';
 return null;
}
export function biomeFamilyAt(map,x,y,z=0){
 const explicit=biomeOverride(map,x,y,z);if(explicit)return explicit;
 if(map.environment){const family=localEnvironmentFamily(map.environment,x+.5,y+.5);return family==='dry-grassland'?'dry':family;}
 return 'temperate';
}
export function biomeSeed(map){return (map.environment?.field.seed??173)&0x7fffffff;}
export function biomeEnabled(map){return !!(map.environment||map.foliage||map.props?.some(p=>biomeTree(p.kind))||(map.terrain||map.map||[]).some(row=>row.some(t=>BIOME_TERRAIN[t]||t==='woodland'||t==='woodland-dense'))||(map.upper||[]).some(layer=>Object.values(layer).some(t=>BIOME_TERRAIN[t]||t==='woodland'||t==='woodland-dense')));}
// The map's overlay remains the sole authority for movement. Art never writes a
// generated study mask back into the map or turns decorative plants into walls.
export function biomePlans(map){
 if(!biomeEnabled(map))return [];
 const terrain=map.terrain||map.map,width=terrain[0].length,depth=terrain.length,plans=[];
 const footprint=p=>{const r=SITE_PROPS[p.kind]||SCENERY_PROPS[p.kind];if(!r)return isCliff(p)?[p]:propCells(p);const w=p.rotated?r.h:r.w,h=p.rotated?r.w:r.h;return Array.from({length:w*h},(_,i)=>({x:p.x+i%w,y:p.y+Math.floor(i/w)}));};
 const occupied=new Set((map.coverOccupiedProps||map.props||[]).flatMap(p=>footprint(p).map(c=>`${c.x},${c.y},${p.z||0}`)));
 const ledges=new Set((map.props||[]).filter(p=>p.kind==='cliff-ledge'&&(p.cliffMask??15)===15).map(p=>`${p.x},${p.y},${(p.z||0)+1}`));
 const origin=map.environment?.origin?.map(n=>n*240)||[0,0];
 for(let level=0;level<=Math.min(2,map.upper?.length||0);level++){
  const families=new Map(),heights=new Float64Array(width*depth).fill(NaN),density=new Uint8Array(width*depth),blocked=new Uint8Array(width*depth),natural=new Uint8Array(width*depth),familyAt=new Array(width*depth);
  for(let y=0;y<depth;y++)for(let x=0;x<width;x++){
   const t=foliageTerrain(map,x,y,level),i=y*width+x;if(!foliageGround(t)||occupied.has(`${x},${y},${level}`))continue;
   heights[i]=ledges.has(`${x},${y},${level}`)?(level-1)*DIMENSIONS.floorSpacing+2:level*DIMENSIONS.floorSpacing;
   natural[i]=1;const family=biomeFamilyAt(map,x,y,level);familyAt[i]=family;if(!families.has(family))families.set(family,[]);
   const cover=foliageAt(map,x,y,level);if(cover){density[i]=cover[0];blocked[i]=cover[1]?1:0;if(blocked[i])families.get(family).push([x,y]);}
  }
  const index=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<width&&y<depth?y*width+x:-1;
  const heightAt=(x,y)=>{const h=heights[index(x,y)];return Number.isFinite(h)?h:null;};
  const blockedAt=(x,y)=>blocked[index(x,y)]===1,densityAt=(x,y)=>(density[index(x,y)]||0)/100;
  for(const [family,cells]of families)plans.push({width,depth,level,family,cells,origin,seed:biomeSeed(map),heightAt,blockedAt,densityAt,
   includeAt:(x,y)=>familyAt[index(x,y)]===family,
   naturalAt:(x,y)=>natural[index(x,y)]===1,
   familyAt:(x,y)=>familyAt[index(x,y)],
   passableCells:()=>{const result=[];for(let y=0;y<depth;y++)for(let x=0;x<width;x++){const i=y*width+x;if(familyAt[i]===family&&density[i]&&!blocked[i])result.push({x,y,height:heights[i],density:density[i]});}return result;}
  });
 }
 return plans;
}
