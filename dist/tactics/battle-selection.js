import {alive} from './core/engine.js';
export const selectable=u=>u.team==='squad'&&alive(u)&&u.casualty!=='captured';
export function rectangleMembers(units,level,a,b,project){
 const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
 return units.filter(u=>{if(!selectable(u)||(u.z||0)!==level)return false;const p=project(u);return p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;}).map(u=>u.id);
}
export function pruneSelection(state,ids){
 const next=new Set([...ids].filter(id=>state.units.some(u=>u.id===id&&selectable(u))));
 if(!next.size){const primary=state.units.find(u=>u.id===state.selected&&selectable(u))||state.units.find(selectable);if(primary)next.add(primary.id);}
 return next;
}
export function toggleSelection(ids,id){const next=new Set(ids);if(next.has(id)&&next.size>1)next.delete(id);else next.add(id);return next;}
