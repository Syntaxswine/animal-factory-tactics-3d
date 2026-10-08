import * as T from './vendor/three.module.js';
import {grenadeWorld,GRENADE_FLOOR} from './grenade-geometry.js';
import {DIMENSIONS} from './hybrid-world.js';
import {shotPoint} from './battle-shot-effects.js';
import {grenadeBlastLevel} from './grenade-blast-field.js';

// Record presentation coordinates before damage removes the struck geometry.
// Native cliffs/ramps/towers keep their local metre dimensions; legacy rooms
// use the old three-unit floor frame. This never changes the ballistic impact.
export function nativeBlastPresentation(state,impact){
 const previous=impact.path?.at(-2)||impact.origin;
 let point=shotPoint(impact,state),level=impact.z||0,normal=impact.kind==='floor'?{x:0,y:0,h:previous&&impact.h>previous.h?-1:1}:undefined;
 // Legacy collision floors are planes at their top. An upward hit touches
 // the visible slab's underside and belongs to the room below that floor.
 if(normal?.h===-1){point.y-=DIMENSIONS.slab;level=Math.max(0,level-1);}
 if(['cover','prop'].includes(impact.kind)){
  const native=new Set(['cliff','bank','ramp','tower','site']),items=grenadeWorld(state).items.filter(b=>native.has(b.source.kind)&&impact.x>=b.min[0]-.002&&impact.x<=b.max[0]+.002&&impact.y>=b.min[2]-.002&&impact.y<=b.max[2]+.002);
  let match=false;
  for(let z=0;z<4&&!match;z++)for(const b of items){
   const p=new T.Vector3(impact.x,impact.h+z*(GRENADE_FLOOR-3),impact.y);if(p.y<b.min[1]-.002||p.y>b.max[1]+.002)continue;
   let distance,n;if(b.triangle){distance=b.triangle.closestPointToPoint(p,new T.Vector3()).distanceTo(p);n=b.triangle.getNormal(new T.Vector3());}
   else{const q=p.clone().sub(b.center).applyQuaternion(b.inverse),outside=Math.max(...b.half.map((h,i)=>Math.abs(q.getComponent(i))-h)),gaps=b.half.map((h,i)=>Math.abs(h-Math.abs(q.getComponent(i)))),axis=gaps.indexOf(Math.min(...gaps));distance=outside>0?outside:Math.min(...gaps);n=new T.Vector3().setComponent(axis,Math.sign(q.getComponent(axis))||1).applyQuaternion(b.q);}
   if(distance<.002){
    if(previous&&b.triangle){const incoming=new T.Vector3(impact.x-previous.x,impact.h-previous.h,impact.y-previous.y);if(n.dot(incoming)>0)n.negate();}
    point=p;level=z;normal={x:n.x,y:n.z,h:n.y};match=true;break;
   }
  }
 }
 const victim=state.units?.find(u=>u.id===impact.unitId);if(victim&&(victim.towerPost||victim.cliffSupport))level=victim.z||0;
 return {h:point.y,level:grenadeBlastLevel(state,{x:impact.x,y:impact.y,h:point.y,z:level}),...normal&&{normal}};
}
// Every queued detonation owns its surviving cover. Later replies may breach
// more walls before the presentation reaches this event.
export function blastCover(state){return structuredClone({map:state.map||state.terrain,upper:state.upper,edges:state.edges,props:state.props,stairs:state.stairs,canopies:state.canopies});}
