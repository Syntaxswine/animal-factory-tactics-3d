// Metres, arbitrary world-space muzzle/aim axis. No hit/miss pre-roll.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
export function seededShots(seed){let n=seed>>>0;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
export function helicoidShot({origin,aim,accuracy=50,precision=80,adjustment=.08,twist=1,roll,rotation}){
 if(![...origin,...aim,accuracy,precision,adjustment,twist,roll,rotation].every(Number.isFinite))throw Error('Shot inputs must be finite');
 const delta=add(aim,origin,-1),distance=Math.hypot(...delta);if(distance<1e-6)throw Error('Aim point must differ from muzzle');
 const axis=norm(delta),right=norm(cross(axis,Math.abs(axis[2])>.99?[0,1,0]:[0,0,1])),up=cross(right,axis);
 const depth=1+clamp(adjustment,0,.2)*(1-2*clamp((distance-2)/58,0,1));
 // Provisional angular spread, not an empirically calibrated hit percentage.
 const sigma=Math.hypot(.001+(1-clamp(accuracy,1,100)/100)*.025,.0005+(1-clamp(precision,1,100)/100)*.008);
 // Aim-placement error does not shrink to zero at point-blank range.
 const placement=.085+(1-clamp(accuracy,1,100)/100)*.20;
 const spread=Math.hypot(placement,distance*sigma);
 const radius=spread*Math.sqrt(-2*Math.log(1-clamp(roll,0,1-1e-12)));
 const angle=rotation*2*Math.PI+twist*2*Math.PI*(depth-1);
 const point=add(add(add(origin,axis,distance*depth),right,radius*Math.cos(angle)),up,radius*Math.sin(angle));
 const direction=norm(add(point,origin,-1));
 const t=distance/dot(direction,axis),targetPlane=add(origin,direction,t);
 return {origin,aim,point,direction,targetPlane,axis,right,up,distance,depth,radius,angle,sigma,spread};
}
// Study proxies only: body-part ellipsoids. Nearest intersection wins.
export const studyBody=[{zone:'head',center:[0,20,1.65],radii:[.16,.16,.2]},{zone:'torso',center:[0,20,1.12],radii:[.29,.18,.36]},{zone:'legs',center:[-.14,20,.43],radii:[.105,.13,.42]},{zone:'legs',center:[.14,20,.43],radii:[.105,.13,.42]}];
export function traceStudy(shot,bodies,cover=false){
 let best={zone:'miss',distance:Infinity};
 for(const body of bodies){const o=shot.origin.map((v,i)=>(v-body.center[i])/body.radii[i]),d=shot.direction.map((v,i)=>v/body.radii[i]),a=dot(d,d),b=2*dot(o,d),c=dot(o,o)-1,disc=b*b-4*a*c;if(disc<0)continue;const near=(-b-Math.sqrt(disc))/(2*a),far=(-b+Math.sqrt(disc))/(2*a),t=near>=0?near:far;if(t>=0&&t<best.distance)best={zone:body.zone,distance:t};}
 if(cover&&shot.direction[1]>0){const t=(bodies[0].center[1]-1-shot.origin[1])/shot.direction[1],p=add(shot.origin,shot.direction,t);if(t>=0&&t<best.distance&&Math.abs(p[0])<.8&&p[2]>=0&&p[2]<=1.25)best={zone:'cover',distance:t};}
 // Flat ground can intercept downward shots before the target.
 if(shot.direction[2]<0){const t=-shot.origin[2]/shot.direction[2];if(t>=0&&t<best.distance)best={zone:'ground',distance:t};}
 return best;
}
