import {terrainAt} from './core/maps.js';
import {floorTerrain} from './core/environment.js';
import {cliffSupportAt} from './cliff-support.js';
import {terrainKnown} from './battle-visibility.js';

// Intersect authored walkable surfaces, not an arbitrary active-floor plane.
// Pick the nearest visible surface; route legality remains the simulation's job.
export function pickFloorSurface(state,ray,maxLevel=2){
 if(Math.abs(ray.direction.y)<1e-8)return null;
 let nearest=null;
 for(let z=0;z<=maxLevel;z++)for(const h of z?[z*2.12,(z-1)*2.12+2]:[0]){
  const distance=(h-ray.origin.y)/ray.direction.y;if(distance<0)continue;
  const x=Math.floor(ray.origin.x+ray.direction.x*distance+.5),y=Math.floor(ray.origin.z+ray.direction.z*distance+.5),p={x,y,z};
  if(!floorTerrain(terrainAt(state,x,y,z))||!terrainKnown(state,z?`${x},${y},${z}`:`${x},${y}`))continue;
  const support=cliffSupportAt(state,p),height=support?support.level*2.12+support.height:z*2.12;
  if(Math.abs(height-h)>1e-7)continue;
  if(!nearest||distance<nearest.distance)nearest={...p,distance};
 }
 return nearest;
}
