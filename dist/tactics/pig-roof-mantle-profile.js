import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};

// The pigs retain their authored short legs and deep barrel-shaped torso.
// They press higher before advancing over the lip, gather sideways with both
// palms still supporting them, and turn upright only after planting the feet.
// This is pose data only: no dimensions, vertices or source skinning are changed.
export function createPigMantleProfile(worker,profile,rest,named){
 if(!['pig-foreman','pig-director'].includes(profile.id))return null;
 const foreman=profile.id==='pig-foreman';
 return {
  edgeSpan:.34,
  tuckGun({index,w}){return index===5?.06*w:index===6?.06:index===7?T.MathUtils.lerp(.06,.10,w):index===8||index===9?.10:index===10?.10*(1-w):0;},
  keys:{
   3:{p:[-.40,.59,0]},4:{p:[-.40,.59,0]},5:{p:[-.40,1.18,0],lean:-.08},
   6:{p:[-.48,1.22,.08],lean:-1,sideLean:-.25,hipLean:-.12,hipPitch:-.28},
   7:{p:[-.44,1.36,.15],lean:-1,sideLean:-.20,hipLean:-.10,hipPitch:-.65},
   8:{p:[.55,foreman?1.66:1.61,.35],hipPitch:-1.52,hipYaw:1.15,lean:0},
   9:{p:[.55,foreman?1.66:1.61,.35],hipPitch:-1.52,hipYaw:1.15,lean:0},
   10:{p:[.58,foreman?1.57:1.53,.35],hipPitch:-1.05,hipYaw:1.15,lean:-.50}
  },
  configureContacts({keys,feet,hands,body}){
   // Free hanging feet follow the lifted root; the supporting right boot stays
   // close enough to the shorter foreman's hip to keep the knee bent naturally.
   for(const j of [3,4,5,6])for(const i of [0,1]){
    feet[j][i].x+=keys[j].p[0]-[-.34,-.33,-.30,-.29][j-3];
    feet[j][i].y+=keys[j].p[1]-[.48,.45,1.13,1.18][j-3];
   }
   feet[7][0].y+=.20;feet[7][1].x=.03;feet[7][1].z=.48;
   // Each palm lies under its own shoulder at the prone pause. Wide shoulders
   // cannot use the horse's narrower, diagonally offset palm placements.
   for(const j of [8,9]){
    worker.pose('neutral');body(keys[j]);
    for(const [i,side]of [-1,1].entries()){
     const shoulder=named['upperArm'+side].getWorldPosition(V());
     hands[j][i].set(shoulder.x+.10,2,shoulder.z);
    }
   }
   hands[10]=hands[9].map(v=>v.clone());
  },
  bodyPath({index,u,a,b,k}){
   if(index!==7)return;
   // Raise the belly clear before sliding forward; flatten the pelvis while
   // the two-stage palm replant provides continuous support.
   k.hipPitch=T.MathUtils.lerp(a.hipPitch,b.hipPitch,ease(u/.60));
   k.lean=T.MathUtils.lerp(a.lean,b.lean,ease((u-.3)/.7));
   k.p[1]=T.MathUtils.lerp(a.p[1],b.p[1],ease(u/.45));
  },
  footPath({index,u,side,target}){
   if(index!==7)return;
   const t=side===-1?ease((u-.05)/.95):ease(u),lift=side===-1?(foreman?.52:.62):.22;
   // The common controller supplies .32; this adds only the pig-specific
   // difference. Keep the long toe outside the face until it clears the lip.
   target.y+=(lift-.32)*Math.sin(Math.PI*t);
   if(side===-1)target.x-=.06*Math.sin(Math.PI*t);
  },
  handPath({index,u,side,i,target,hands}){
   if(index===7&&side===1){
    const first=ease(u/.4),second=ease((u-.65)/.35);
    target.copy(hands[7][i]).lerp(V(.63,2,.20),first).lerp(hands[8][i],second);
    target.y+=.15*Math.sin(Math.PI*first)+.06*Math.sin(Math.PI*second);
   }
   if(index===9)target.copy(hands[9][i]);
  },
  plantedHand({index}){return index===9?true:undefined;}
 };
}
