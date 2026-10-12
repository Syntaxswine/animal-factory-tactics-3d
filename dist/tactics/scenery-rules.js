import {HELICOPTER_DATA} from './helicopter-gameplay-data.js';
import {sceneryRule,isHelicopter,sceneryLocal} from './scenery-catalog.js';
import {geometryHit} from './scenery-collision.js';
export const helicopterData=p=>isHelicopter(p)?HELICOPTER_DATA[sceneryRule(p).state]:null;
export function helicopterBlocked(p,q){const d=helicopterData(p);if(!d)return false;const a=sceneryLocal(p,q);return d.clearance.rows[Math.round(a.y)]?.[Math.round(a.x)]==='#';}
const indexCache=new WeakMap(),linkCache=new WeakMap();
function at(map,q){
 const props=map.props||[];let index=indexCache.get(props);
 if(!index){index=new Map();for(const p of props)if(isHelicopter(p)){const r=sceneryRule(p),w=p.rotated?r.h:r.w,h=p.rotated?r.w:r.h;for(let y=0;y<h;y++)for(let x=0;x<w;x++)index.set(`${p.x+x},${p.y+y},${p.z||0}`,p);}indexCache.set(props,index);}
 return index.get(`${q.x},${q.y},${q.z||0}`);
}
export function helicopterMoveAllowed(map,a,b){
 const props=new Set([at(map,a),at(map,b)].filter(Boolean));if(!props.size)return true;if((a.z||0)!==(b.z||0))return false;
 for(const p of props){const data=helicopterData(p);let links=linkCache.get(data);if(!links){links=new Set();for(const [x,y,u,v]of data.clearance.links){links.add(`${x},${y}>${u},${v}`);links.add(`${u},${v}>${x},${y}`);}linkCache.set(data,links);}const x=sceneryLocal(p,a),y=sceneryLocal(p,b);if(!links.has(`${x.x},${x.y}>${y.x},${y.y}`))return false;}
 return true;
}
export function helicopterRayHit(props,origin,direction,reach){
 let nearest=null,limit=reach;
 for(const prop of props||[]){const data=helicopterData(prop);if(!data)continue;const p=sceneryLocal(prop,origin),d=prop.rotated?[direction.y,-direction.x,direction.h]:[direction.x,direction.y,direction.h],hit=geometryHit(data,[p.x,p.y,p.h],d,limit);if(hit!==null){limit=hit;nearest={prop,distance:hit};}}
 return nearest;
}
