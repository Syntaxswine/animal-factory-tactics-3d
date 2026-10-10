import {landBrushCells} from './land-paint.js';
import {foliageAt,foliageKey,foliageGround,cleanFoliage} from './foliage-data.js';
import {terrainAt,setTerrain,roofEndpoint} from './core/maps.js';
import {propCells,isWoodland} from './core/environment.js';
import {isRamp,rampInfo} from './cliff-ramps.js';

export function paintFoliage(map,command,size=240){
 const {start,end=start,options={},path,tool}=command,z=start.z||0,mode=options.foliageShape||'rectangle';
 if(!['round','square','rectangle'].includes(mode))throw Error('Choose a round brush, square brush or rectangle.');
 if(z<0||z>2)throw Error('Foliage needs outdoor ground on levels 1, 2 or 3.');
 const density=options.foliageDensity??100,blocked=options.foliageBlocked??options.foliageKind==='dense';
 if(!Number.isInteger(density)||density<1||density>100||typeof blocked!=='boolean')throw Error('Choose foliage density from 1–100% and whether it blocks walking.');
 let points;
 if(mode==='rectangle'){
  if([start,end].some(p=>![p.x,p.y].every(Number.isInteger)||p.x<0||p.y<0||p.x>=size||p.y>=size))throw Error('Keep the foliage brush inside the map.');
  points=[];for(let y=Math.min(start.y,end.y);y<=Math.max(start.y,end.y);y++)for(let x=Math.min(start.x,end.x);x<=Math.max(start.x,end.x);x++)points.push({x,y,z});
 }else points=landBrushCells(start,end,{landSize:options.foliageSize??9,landShape:mode,landHeight:z},size,path);
 const occupied=new Set(map.props.flatMap(p=>propCells(p).map(c=>foliageKey(c.x,c.y,c.z||0))));
 const access=new Set([...map.starts,...map.guards,...map.exits,...map.props.filter(isRamp).flatMap(p=>{const r=rampInfo(p);return [r.entry,r.exit];})].map(p=>foliageKey(p.x,p.y,p.z||0)));
 const cells=[],clearing=tool==='clear-foliage';
 for(const p of points){
  const key=foliageKey(p.x,p.y,z),terrain=terrainAt(map,p.x,p.y,z),previous=foliageAt(map,p.x,p.y,z);
  if(clearing){
   if(!previous)continue;
   if(map.foliage)delete map.foliage[key];
   // Old foliage terrain did not retain the original ground. New overlays do.
   if(isWoodland(terrain))setTerrain(map,p.x,p.y,z,'ground-grass');
  }else{
   if(!foliageGround(terrain)||occupied.has(key)||map.stairs.some(q=>q.x===p.x&&q.y===p.y&&(q.z===z||q.z+1===z))||roofEndpoint(map,p)||blocked&&access.has(key))continue;
   if(previous?.[0]===density&&previous?.[1]===blocked&&!isWoodland(terrain))continue;
   if(isWoodland(terrain))setTerrain(map,p.x,p.y,z,'ground-grass');
   map.foliage||={};map.foliage[key]=[density,blocked];
  }
  cells.push(p);
 }
 cleanFoliage(map);
 if(!cells.length)throw Error(clearing?'No foliage to clear here.':'No changes here. Paint outdoor ground; water, structures, objects and access points are protected.');
 return {cells,edges:[]};
}
