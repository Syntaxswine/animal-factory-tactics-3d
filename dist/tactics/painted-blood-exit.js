import {createPaintedBloodCards} from './painted-blood-spray.js';
import {EXIT_CELLS} from './painted-blood-followup-data.js';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const EXIT_DURATION=.6;
// +X is forward from an independently supplied exit point. Never infer an exit
// from an entrance contact; the builder supplies a confirmed penetration result.
export function createBloodExitMotion({seed=1,strength=1,reduced=false}={}){
 if(!Number.isFinite(seed)||!Number.isFinite(strength))throw Error('Finite seed and strength required');
 strength=Math.max(.7,Math.min(1.2,strength));let rng=seed>>>0;
 const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const count=reduced?8:32,particles=[];
 for(let i=0;i<count;i++){
  const fan=i<2,fine=i>=10;
  particles.push(Object.freeze({tile:fan?i:(i%4===0?2:3),birth:fan?i*.018:random()*.035,life:fan?(i===0?.15:.24):.27+random()*.21,
   vx:fan?0:(fine?2.6:2.0)+random()*1.8,vy:fan?0:(random()-.43)*(fine?1.9:1.3),vz:fan?0:(random()-.5)*1.4,
   size:fan?(i===0?.76:.9):(fine?.018+random()*.025:.04+random()*.025),spin:fan?0:(random()-.5)*.6}));
 }
 const buffer={count,launch:new Float32Array(count*3),fall:new Float32Array(count),tangent:new Float32Array(count*3),gravityVelocity:new Float32Array(count),size:new Float32Array(count*2),alpha:new Float32Array(count),tile:new Float32Array(count),spin:new Float32Array(count)};
 for(let i=0;i<count;i++)buffer.tile[i]=particles[i].tile;
 function sample(time,{still=false}={}){
  if(!Number.isFinite(time))throw Error('Finite sample time required');
  for(let i=0;i<count;i++){
   const p=particles[i],fan=i<2,age=time-p.birth,a=Math.max(0,Math.min(p.life,age)),drag=Math.exp(-3.2*a),travel=(1-drag)/3.2,live=time>=0&&time<EXIT_DURATION&&age>=0&&age<p.life,k=i*3,s=i*2;
   buffer.launch[k]=p.vx*travel*strength;buffer.launch[k+1]=p.vy*travel;buffer.launch[k+2]=p.vz*travel;
   buffer.fall[i]=fan?0:-4.905*a*a;buffer.gravityVelocity[i]=fan?0:-9.81*a;
   buffer.tangent[k]=fan?1:p.vx*drag*strength;buffer.tangent[k+1]=p.vy*drag;buffer.tangent[k+2]=p.vz*drag;
   const bloom=fan?.35+.65*ease(a/.035):1;
   buffer.size[s]=p.size*strength*bloom;buffer.size[s+1]=p.size*strength*bloom*(fan?.7:.85);buffer.spin[i]=p.spin;
   buffer.alpha[i]=live?(i===1?.36:.85)*ease(a/.009)*(1-ease((a-p.life*.35)/(p.life*.65))):0;
   if(still){buffer.launch[k]=buffer.launch[k+1]=buffer.launch[k+2]=buffer.fall[i]=0;buffer.alpha[i]=i===0&&time>=0&&time<.18?.6*(1-ease(time/.18)):0;buffer.size[s]=.36*strength;buffer.size[s+1]=.25*strength;}
  }
  return buffer;
 }
 return {particles:Object.freeze(particles),buffer,sample,duration:EXIT_DURATION};
}
export function createPaintedBloodExit(texture,options={}){return createPaintedBloodCards(texture,createBloodExitMotion(options),EXIT_CELLS);}
