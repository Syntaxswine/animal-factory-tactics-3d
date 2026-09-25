import {isRamp,rampInfo,rampHeight} from './cliff-ramps.js';
import {isRampBank,bankInfo,bankHeight,BANK_YAW} from './ramp-banks.js';

export const isRampTerrain=p=>isRamp(p)||isRampBank(p);
// Caps share the cliff kit's eight subdivisions per cell. Welding them BEFORE
// making skirts removes buried walls and painted rims at every joined edge.
export function rampCaps(props,resolution=8){
 const triangles=[];
 for(const p of props){
  const r=rampInfo(p),b=bankInfo(p);if(!r&&!b)continue;
  const point=(u,v)=>{
   let x,z,y;
   if(r){x=r.low.x+r.dx*(u*4-.5)-r.dy*(v-.5);z=r.low.y+r.dy*(u*4-.5)+r.dx*(v-.5);y=u*2;}
   else {const a=BANK_YAW[b.direction],s=b.side==='left'?-1:1,lx=u-.5,lz=s*(v-.5);x=p.x+Math.cos(a)*lx+Math.sin(a)*lz;z=p.y-Math.sin(a)*lx+Math.cos(a)*lz;y=bankHeight(b.step,u,v);}
   return {x:x+.5,z:z+.5,y,crag:0,...rampPaint(props,x,z)};
  };
  const n=resolution*(r?4:1),m=resolution;
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){
   const a=point(i/n,j/m),c=point((i+1)/n,(j+1)/m),bb=point((i+1)/n,j/m),d=point(i/n,(j+1)/m);
   for(const t of [[a,c,bb],[a,d,c]]){const [aa,ab,ac]=t;if((ab.x-aa.x)*(ac.z-aa.z)-(ab.z-aa.z)*(ac.x-aa.x)>0)t.reverse();triangles.push(t);}
  }
 }
 return triangles;
}
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function rampPaint(props,x,y){
 let sand=0,dirt=0,road=0,concrete=0;
 for(const p of props){
  const r=rampInfo(p);
  if(r){const u=(x-r.low.x)*r.dx+(y-r.low.y)*r.dy+.5,v=Math.abs(-(x-r.low.x)*r.dy+(y-r.low.y)*r.dx);
   // Continue the finish across the upper landing; fade only at its far end.
   if(u>=-1e-6&&u<=5+1e-6&&v<=.5+1e-6){const w=1-smooth(4.7,5,u);if(r.surface==='sand')sand=Math.max(sand,w);if(r.surface==='road')road=Math.max(road,w);if(r.surface==='concrete')concrete=Math.max(concrete,w);}
  }
  const b=bankInfo(p);if(!b||Math.abs(x-p.x)>.500001||Math.abs(y-p.y)>.500001)continue;
  const a=BANK_YAW[b.direction],v=(b.side==='left'?-1:1)*(Math.sin(a)*(x-p.x)+Math.cos(a)*(y-p.y))+.5;
  const fade=(1-smooth(.48,.96,v))*smooth(0,.23,v);
  if(b.surface==='sand')sand=Math.max(sand,1-smooth(.62,1,v));
  if(b.surface==='dirt')dirt=Math.max(dirt,fade*.9);
 }
 return {sand,dirt,road,concrete};
}
export function rampBoundaryHeight(props,x,y){
 for(const p of props){const r=rampInfo(p);if(r){const u=(x-r.low.x)*r.dx+(y-r.low.y)*r.dy+.5,v=Math.abs(-(x-r.low.x)*r.dy+(y-r.low.y)*r.dx);if(u>=-1e-6&&u<=4+1e-6&&v<=.500001)return rampHeight(p,{x,y});}
  const b=bankInfo(p);if(b&&Math.abs(x-p.x)<=.500001&&Math.abs(y-p.y)<=.500001){const a=BANK_YAW[b.direction],u=Math.cos(a)*(x-p.x)-Math.sin(a)*(y-p.y)+.5,v=(b.side==='left'?-1:1)*(Math.sin(a)*(x-p.x)+Math.cos(a)*(y-p.y))+.5;return bankHeight(b.step,u,v);}
 }return null;
}
