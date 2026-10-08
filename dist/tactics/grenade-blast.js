import {grenadeWorld,sweepGrenade,grenadeBase,GRENADE_FLOOR} from './grenade-geometry.js';
import {grenadeDamage,GRENADE} from './grenade-ballistics.js';
import {propCells} from './environment.js';
import {isExplosiveBarrel,barrelId} from './explosive-barrels.js';
import {isStrategicSite,intactSite,siteSamples,siteId,destroyStrategicSite} from './strategic-site-rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.h-b.h);
export function detonateGrenade(s,impact){
 const radius=GRENADE.blast,world=grenadeWorld(s),clear=(end,id=null)=>{const h=sweepGrenade(world,impact,end,0);return !h||h.t>=.995||id!==null&&h.propId===id;},hits=[],barrels=[],sites=[],removeEdges=new Set(),removeProps=new Set(),removeTiles=[];
 // Resolve cover against the intact scene for the entire blast. Destroying one
 // side of a wall must not expose a second character halfway through this loop.
 for(const u of s.units||[]){if(u.away||u.casualty==='quit'||!(u.hp>0||['bleeding','stable'].includes(u.casualty)))continue;const p={x:u.x,y:u.y,h:grenadeBase(u)+(u.stance==='prone'?.25:.8)},dist=distance(impact,p);if(dist<=radius&&clear(p))hits.push({unit:u,damage:grenadeDamage(dist)});}
 const closest=b=>({x:Math.max(b.min[0],Math.min(impact.x,b.max[0])),h:Math.max(b.min[1],Math.min(impact.h,b.max[1])),y:Math.max(b.min[2],Math.min(impact.y,b.max[2]))});
 for(const b of world.items){const key=b.source.edge;if(!key||removeEdges.has(key))continue;const p=closest(b),dist=distance(impact,p),kind=s.edges[key],resistance=/concrete|steel|^wall$/.test(kind)?50:/brick/.test(kind)?40:20;
  if(dist<=radius&&grenadeDamage(dist)>=resistance&&clear(p))removeEdges.add(key);
 }
 for(const p of s.props||[]){
  if(isStrategicSite(p)){if(intactSite(p)&&siteSamples(p).some(q=>distance(impact,q)<=radius&&clear(q,siteId(p))))sites.push(p);continue;}
  const base=grenadeBase(p),samples=isExplosiveBarrel(p)?[{x:p.x,y:p.y,h:base+.4}]:propCells(p).map(q=>({x:Math.max(q.x-.49,Math.min(impact.x,q.x+.49)),y:Math.max(q.y-.49,Math.min(impact.y,q.y+.49)),h:Math.max(base+.04,Math.min(impact.h,base+1.8))}));
  const affected=samples.some(q=>distance(impact,q)<=radius&&grenadeDamage(distance(impact,q))>=(isExplosiveBarrel(p)?1:20)&&clear(q,isExplosiveBarrel(p)?barrelId(p):null));
  if(affected){if(isExplosiveBarrel(p))barrels.push(p);else if(!/^(cliff-|ramp|roof-)/.test(p.kind))removeProps.add(p);}
 }
 const map=s.map||s.terrain;
 for(let z=0;z<4;z++)for(let y=Math.max(0,Math.floor(impact.y-radius));y<Math.min(map.length,Math.ceil(impact.y+radius+1));y++)for(let x=Math.max(0,Math.floor(impact.x-radius));x<Math.min(map[0].length,Math.ceil(impact.x+radius+1));x++){
  const kind=z?s.upper?.[z-1]?.[`${x},${y}`]:map[y][x];if(!['wall','crate'].includes(kind))continue;
  const p={x:Math.max(x-.5,Math.min(impact.x,x+.5)),y:Math.max(y-.5,Math.min(impact.y,y+.5)),h:Math.max(z*GRENADE_FLOOR+.04,Math.min(impact.h,z*GRENADE_FLOOR+(kind==='wall'?2:.8)))},dist=distance(impact,p);
  if(dist<=radius&&grenadeDamage(dist)>=(kind==='wall'?50:20)&&clear(p))removeTiles.push({x,y,z});
 }
 const before={edges:Object.fromEntries([...removeEdges].map(key=>[key,s.edges[key]])),props:structuredClone([...removeProps]),tiles:removeTiles.map(p=>({...p,kind:p.z?s.upper[p.z-1][`${p.x},${p.y}`]:map[p.y][p.x]}))};
 for(const key of removeEdges)delete s.edges[key];
 s.props=s.props.filter(p=>!removeProps.has(p));
 for(const {x,y,z}of removeTiles)if(z)s.upper[z-1][`${x},${y}`]='floor';else map[y][x]='ground-gravel';
 const receipts=sites.map(p=>destroyStrategicSite(s,p,{cause:'explosive'})).filter(Boolean);
 return {hits,barrels,sites:receipts,before,blast:{kind:'grenade',grenade:true,x:impact.x,y:impact.y,z:impact.z,h:impact.h,radius,destroyed:removeEdges.size+removeProps.size+removeTiles.length+receipts.length}};
}
