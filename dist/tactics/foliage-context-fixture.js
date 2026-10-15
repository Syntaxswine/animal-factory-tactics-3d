import {blankMap} from './core/maps.js';
import {BIOME_FAMILIES} from './biome-foliage-data.js';

// These remain ordinary saveable maps. The renderer receives no special plant,
// collision, visibility or tree-placement overrides from the review fixture.
export function foliageContextFixture(family='temperate',mode='strip'){
 if(!BIOME_FAMILIES[family])throw Error('Unknown foliage habitat: '+family);
 if(!['strip','copse'].includes(mode))throw Error('Unknown foliage context: '+mode);
 const map=blankMap(`${mode==='strip'?'One-tile screen':'Copse and clearing'} · ${family}`);map.foliage={};
 const ground='ground-biome-'+family;
 for(let y=86;y<=150;y++)for(let x=86;x<=150;x++)map.terrain[y][x]=ground;
 if(mode==='strip'){
  for(let x=114;x<=125;x++)map.foliage[`${x},118,0`]=[85,true];
  map.starts=[{x:120,y:119,z:0},{x:119,y:119,z:0},{x:120,y:120,z:0},{x:119,y:120,z:0}];
  map.exits=[{x:120,y:122,z:0}];
 }else{
  for(let y=90;y<=146;y++)for(let x=90;x<=146;x++){
   const dx=x-118,dy=y-115,edge=1+.13*Math.sin(x*.31)+.08*Math.cos(y*.39)+.06*Math.sin((x+y)*.29);
   const grove=dx*dx/(26*26)+dy*dy/(26*26)<edge;
   if(!grove)continue;
   const clearing=((x-121)/10)**2+((y-121)/9)**2<1+.10*Math.sin(x*.7);
   const route=Math.abs(x-(120+2.2*Math.sin((y-119)*.14)))<2.4&&y>=120;
   if(clearing||route)continue;
   // A broken belt of understory, with open woods behind and between it.
   // A broad reserved open band lets the existing mixed-tree planner work.
   const bank=((x-110)/14)**2+((y-112)/9)**2<1+.15*Math.sin(y*.49)
    ||((x-132)/8)**2+((y-119)/12)**2<1+.16*Math.cos(x*.52);
   const density=bank?85:75;
   map.foliage[`${x},${y},0`]=[density,bank];
  }
  map.starts=[{x:120,y:122,z:0},{x:121,y:122,z:0},{x:120,y:123,z:0},{x:121,y:123,z:0}];
  map.exits=[{x:121,y:147,z:0}];
 }
 return map;
}

export const FOLIAGE_CONTEXT_VIEWS=Object.freeze({
 strip:Object.freeze({focus:[119.5,1,118.5],horse:[120,0,119],ppu:32}),
 copse:Object.freeze({focus:[119,1,118],horse:[120,0,122],ppu:20}),
});
