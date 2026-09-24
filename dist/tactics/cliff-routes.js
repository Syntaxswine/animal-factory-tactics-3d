import {propAt} from './core/environment.js';

const directions=[[1,0],[-1,0],[0,1],[0,-1]];
export const flatCliff=p=>p?.kind==='cliff-ledge'&&(p.cliffMask??15)===15;
export const cliffCapAt=(m,x,y,z)=>z>0&&flatCliff(propAt(m,x,y,z-1));
export const cliffLinkSupported=(m,p)=>cliffCapAt(m,p.x+p.dx,p.y+p.dy,p.z+1);
// Candidate edges are derived, never saved. Maps applies clearance to each edge.
export function automaticCliffLinks(m){
 return (m.props||[]).filter(p=>flatCliff(p)&&(p.z||0)<2).flatMap(p=>directions.map(([dx,dy])=>({x:p.x-dx,y:p.y-dy,z:p.z||0,dx,dy,kind:'cliff'})));
}
export function cliffLinksAt(m,p){
 const z=p.z||0,out=[];
 for(const [dx,dy] of directions){
  if(z<2&&cliffCapAt(m,p.x+dx,p.y+dy,z+1))out.push({x:p.x,y:p.y,z,dx,dy,kind:'cliff'});
  if(cliffCapAt(m,p.x,p.y,z))out.push({x:p.x-dx,y:p.y-dy,z:z-1,dx,dy,kind:'cliff'});
 }
 return out;
}
