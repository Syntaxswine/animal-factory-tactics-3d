// Foliage is an overlay: each cell stores [density percent, blocks walking].
// Ground remains authoritative for the plants' habitat and survives clearing.
const natural=new Set(['yard','ground-grass','ground-dirt','ground-gravel','woodland','woodland-dense']);
export const foliageGround=terrain=>natural.has(terrain);
export const foliageKey=(x,y,z=0)=>`${x},${y},${z}`;
export const foliageTerrain=(map,x,y,z=0)=>z?map.upper?.[z-1]?.[`${x},${y}`]||'void':(map.terrain||map.map)?.[y]?.[x]||'void';
export function foliageAt(map,x,y,z=0){
 const terrain=foliageTerrain(map,x,y,z);if(!foliageGround(terrain))return null;
 return map.foliage?.[foliageKey(x,y,z)]||(terrain==='woodland-dense'?[100,true]:terrain==='woodland'?[100,false]:null);
}
export const foliageBlocks=(map,x,y,z=0)=>!(map.knowledge&&!map.knowledge.has(z?foliageKey(x,y,z):`${x},${y}`))&&foliageAt(map,x,y,z)?.[1]===true;
export const foliageDepth=(map,x,y,z=0)=>(foliageAt(map,x,y,z)?.[0]||0)/100;
export function foliageErrors(map,size=240){
 if(map.foliage===undefined)return [];
 if(!map.foliage||typeof map.foliage!=='object'||Array.isArray(map.foliage))return ['Invalid foliage overlay.'];
 for(const [key,value]of Object.entries(map.foliage)){
  const [x,y,z]=key.split(',').map(Number);
  if(key!==foliageKey(x,y,z)||![x,y,z].every(Number.isInteger)||x<0||y<0||x>=size||y>=size||z<0||z>2||!Array.isArray(value)||value.length!==2||!Number.isInteger(value[0])||value[0]<1||value[0]>100||typeof value[1]!=='boolean'||!foliageGround(foliageTerrain(map,x,y,z)))return ['Invalid foliage cell: '+key];
 }
 return [];
}
export function cleanFoliage(map){
 if(!map.foliage)return;
 for(const key of Object.keys(map.foliage)){const [x,y,z]=key.split(',').map(Number);if(!foliageGround(foliageTerrain(map,x,y,z)))delete map.foliage[key];}
 if(!Object.keys(map.foliage).length)delete map.foliage;
}
export function extractFoliage(map,x,y,size=24){
 const foliage={};for(const [key,value]of Object.entries(map.foliage||{})){const [a,b,z]=key.split(',').map(Number);if(a>=x&&b>=y&&a<x+size&&b<y+size)foliage[foliageKey(a-x,b-y,z)]=[...value];}
 return Object.keys(foliage).length?{foliage}:{};
}
export function placeFoliage(map,block,x,y,size=24){
 const foliage={...map.foliage};for(const key of Object.keys(foliage)){const [a,b]=key.split(',').map(Number);if(a>=x&&b>=y&&a<x+size&&b<y+size)delete foliage[key];}
 for(const [key,value]of Object.entries(block.foliage||{})){const [a,b,z]=key.split(',').map(Number);foliage[foliageKey(a+x,b+y,z)]=[...value];}
 if(Object.keys(foliage).length)map.foliage=foliage;else delete map.foliage;
}
