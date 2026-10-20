// Where each character's tool placed its skull after sculpting (heads.mjs `place`), as a map
// from sculpt space to the character's rest space, and back. Some placements depend on the
// sculpt itself (a lift puts the sculpt's highest point at a set height, the director's head is
// stretched to reach 1.65, the grey horse and the hen were scaled with their whole bodies); their
// constants are frozen in heads.mjs and re-measured here by measurePlacement().
import * as THREE from '../../dist/tactics/vendor/three.module.js';
import {sculptSurface} from '../../dist/tactics/grey-surface.js';
import {HEN_EXTREMES} from './heads.mjs';
const smooth=THREE.MathUtils.smoothstep;

export function placement(head){
 const P=head.place,kind=P.kind;
 if(kind==='none')return {kind,map:p=>p.slice(),unmap:p=>p.slice(),scale:1};
 if(kind==='grey-horse'){const s=P.scale,lift=P.lift;return {kind,map:([x,y,z])=>[x*s,y*s+lift,z*s],unmap:([x,y,z])=>[x/s,(y-lift)/s,z/s],scale:s};}
 if(kind==='hen'){const s=1.65/(P.top-P.bottom),b=P.bottom;return {kind,map:([x,y,z])=>[x*s,(y-b)*s,z*s],unmap:([x,y,z])=>[x/s,y/s+b,z/s],scale:s};}
 const top=P.top,unmap={
  lift:([x,y,z])=>[x,y-P.to+top,z],
  cow:([x,y,z])=>{const yy=y-1.60+top,neck=1-smooth(yy,1.34,1.40),face=smooth(yy,1.32,1.39),s=1+.10*face-.10*neck;return [-.04+(x+.04)/s,yy,z/s];},
  director:([x,y,z])=>[x,1.28+(y-1.28)*(top-1.28)/(1.65-1.28),z]
 }[kind];
 return {kind,map:P.map,unmap,scale:1,meshNormals:Boolean(P.meshNormals)};
}

// The placement constants measured again, as the characters' tools measured them: by sculpting
// (seconds to half a minute a head). Returns {top} / {scale, lift} / {top, bottom}.
const highest=g=>{g.computeBoundingBox();return g.boundingBox.max.y;};
export async function measurePlacement(head){
 const kind=head.place.kind;
 if(kind==='none')return {};
 if(kind==='grey-horse'){const {createGreyHorse}=await import('../../dist/tactics/horse-grey-model.js');const horse=createGreyHorse(),r={scale:horse.root.scale.x,lift:horse.root.position.y};horse.dispose();return r;}
 if(kind==='hen'){
  const comb=sculptSurface(HEN_EXTREMES.comb.field,HEN_EXTREMES.comb.min,HEN_EXTREMES.comb.max,HEN_EXTREMES.comb.step);
  const foot=sculptSurface(HEN_EXTREMES.foot.field,HEN_EXTREMES.foot.min,HEN_EXTREMES.foot.max,HEN_EXTREMES.foot.step);
  const top=highest(comb);foot.computeBoundingBox();const bottom=foot.boundingBox.min.y;comb.dispose();foot.dispose();return {top,bottom};
 }
 const g=sculptSurface(head.field,head.min,head.max,head.step),top=highest(g);g.dispose();return {top};
}
