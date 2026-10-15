// A speaking head is the approved head sculpt, opened for speech.
//
// Rest space is the head's own sculpt space (heads.mjs). There the speaking head is the approved
// head with a mouth inside it: a cavity behind the lips (its walls kept: the cheeks, the lips at
// the front, the jaw below), a dental pad where a ruminant has one, and teeth and a tongue as
// parts of their own. The lips meet along the cut (the lip line's height for a muzzle; for a beak,
// the surface between its mandibles), closed.
//
// The lips are parted in an expanded space: everything above the cut is moved up by sigma,
// everything below down by sigma, over the mouth (sigma tapers to nothing behind the corners).
// The space between (the slab) is air in front of the corners (the window: the lips part all along
// the lip line, the mouth opening as a wedge from its corners, open from side to side as a beak
// is), and behind the corners it is the head's section at the cut drawn out through it. Each
// vertex of the head sculpted there is mapped back to rest space by the same shift, and the
// slab's onto the cut, so a closed speaking head is the approved head (the lips' faces meet on
// the cut, a crease along the lip line) and the mouth inside keeps the shape it was sculpted with.
// As the jaw opens the lips part from the corners forward onto the mouth inside, its teeth and
// tongue. (Round 2 closed the mouth's sides with a wall of skin stretched from lip to lip, flush
// with them, opening only at the front within a window of the middle: the user saw "a small square
// opening instead of a large wedge opening". Rounds 3 and 4 stood a lining inside the lips along
// the muzzle's sides, so that from the side the open mouth showed its inside, not the background:
// the user, round 4, "it still looks like you have those flaps on either side of the mouth,
// remember we are getting rid of all those", and of the lining run to the front of the mouth,
// "you still have opaque walls on the side of the mouth that should be open space", and with a
// sketch of the open wedge: its sides "should be a void space", its roof "should be red, its the
// inside of the mouth", its front open. So the open mouth is the wedge's roof and floor, the
// mouth's inside, open at its sides and front, and in exact profile it is seen through.)
//
// The jaw's weight: the mandible (below the lip line, above the jaw line read off the head's own
// profile, in front of the line from the jaw's angle up to its joint) is rigid; the throat behind
// and below it blends; behind the corners the cheeks blend across the lip line, and in front of
// them over `corner.open`, each lip and its face toward its own side; the slab is graded from the
// upper lip to the lower.
import * as THREE from '../../dist/tactics/vendor/three.module.js';
import {blend,ellipsoid as E} from '../../dist/tactics/grey-surface.js';
import {sculptSurface} from './surface.mjs';
const smooth=THREE.MathUtils.smoothstep,clamp=THREE.MathUtils.clamp,abs=Math.abs;
export const smax=(a,b,k)=>-blend(-a,-b,k);
// How much of the slab's depth, from each lip's face, goes wholly with that lip (toRest)
const SLAB_GRADE=.25;

// A function sampled lazily every `step` and interpolated (one variable, or two).
function lazy1(f,step){const at=new Map(),get=k=>{let v=at.get(k);if(v===undefined){v=f(k*step);at.set(k,v);}return v;};
 return u=>{const s=u/step,k=Math.floor(s),t=s-k;return get(k)*(1-t)+get(k+1)*t;};}
// Where f changes sign between a and b (f(a) and f(b) of opposite signs), to a micron.
const bisect=(f,a,b)=>{const fa=f(a)<0;for(let k=0;k<24;k++){const m=(a+b)/2;if((f(m)<0)===fa)a=m;else b=m;}return (a+b)/2;};
function lazy2(f,step){const at=new Map(),get=(i,j)=>{const key=i*100003+j;let v=at.get(key);if(v===undefined){v=f(i*step,j*step);at.set(key,v);}return v;};
 return (u,w)=>{const a=u/step,b=w/step,i=Math.floor(a),j=Math.floor(b),s=a-i,t=b-j;return (get(i,j)*(1-s)+get(i+1,j)*s)*(1-t)+(get(i,j+1)*(1-s)+get(i+1,j+1)*s)*t;};}
// A smooth curve through knots [u, v] (cubic between them, each knot's slope from its two
// neighbours; level at the first and last knots and beyond them). Linear in the knots' v.
export function spline(K){
 const n=K.length,U=K.map(k=>k[0]),V=K.map(k=>k[1]),m=V.map((_,i)=>i===0||i===n-1?0:(V[i+1]-V[i-1])/(U[i+1]-U[i-1]));
 return u=>{if(u<=U[0])return V[0];if(u>=U[n-1])return V[n-1];let i=0;while(u>U[i+1])i++;
  const h=U[i+1]-U[i],t=(u-U[i])/h,t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*V[i]+(t3-2*t2+t)*h*m[i]+(3*t2-2*t3)*V[i+1]+(t3-t2)*h*m[i+1];};
}

// The mouth's geometry for one character (mouths.mjs), as functions of a sculpt-space point.
// `head` is the approved head's field.
export function mouthGeometry(M,head){
 const C=M.cavity,h=M.gap/2,cx=M.corner.x,cz=M.corner.z,taper=M.taper??.02;
 // The lip line: its height along the head (a straight line, or a curve through `line`'s knots),
 // and how far it rises across it (`smile`, in full from |z| = width, or a curve through
 // `across`'s knots).
 const along=M.lip.line?spline(M.lip.line):x=>M.lip.y+M.lip.slope*(x-M.lip.x);
 const across=M.lip.across?spline(M.lip.across):z=>M.lip.smile*Math.min(1,(z/M.lip.width)**2);
 const lipY=(x,z)=>along(x)+across(abs(z));
 // The cut's height: the lip line (a beak's gape line at its middle).
 const refY=(x,z)=>lipY(x,abs(z)),cut=(x,y,z)=>y-refY(x,z);
 // How far the expanded space moves each side away from the cut (tapering out behind the
 // corners), and the air between: the window, along the whole lip line in front of the corners
 // (within corner.z of the middle), ending round behind the corners (and in front of where a
 // beak's gap ends): within h of an end the air's height falls off as an ellipse's.
 const fx=M.corner.front??Infinity,wz=cz;
 const sigma=(x,z)=>h*smooth(x,cx-taper,cx)*(1-smooth(x,fx,fx+taper))*(1-smooth(abs(z),cz,cz+taper));
 const rz=Math.min(h,.6*wz);
 const sigmaAir=(x,z)=>{if(abs(z)>wz)return 0;const ex=Math.max(0,cx-x,x-fx)/h,ez=Math.max(0,abs(z)-(wz-rz))/rz;return Math.min(sigma(x,z),h*Math.sqrt(Math.max(0,1-ex*ex)),sigma(x,z)*Math.sqrt(Math.max(0,1-ez*ez)));};
 // how far inside the air a point is (c its height from the cut); null where there is none
 const air=(x,c,z)=>{const sa=sigmaAir(x,z);return sa<=0?(abs(z)<wz+h?Math.min(wz-abs(z),-abs(c))-1e-4:null):sa-abs(c);};
 // The head at the cut: its half-width at x, and its front at z.
 const outerZ=lazy1(x=>{const y0=refY(x,0);if(head(x,y0,0)>0)return 0;let z=0;while(z<.45&&head(x,refY(x,z),z)<0)z+=.0005;return bisect(w=>head(x,refY(x,w),w),z-.0005,z);},.0005);
 const frontX=lazy1(z=>{let x=M.lip.x+.15;while(x>M.hinge[0]&&head(x,refY(x,z),z)>0)x-=.0005;return bisect(u=>head(u,refY(u,z),z),x,x+.0005);},.0005);
 // The mouth behind the lips: a slab from `floor` below the cut to `roof` above it, within
 // `wall` of the cheeks (and no wider than `width`, narrowing toward the back), `front` behind the
 // front of the lips (and behind x `tip`), in front of `back`, and never nearer the surface than
 // `wallMin` (a thin chin keeps its floor; a beak's two mandibles overlap at the gape, where its
 // field is no distance, so a beak has none); every edge rounded over `round`.
 const sideZ=x=>{const t=clamp((x-C.back)/.12,0,1);return Math.min(C.width*(1-(C.taper??.2)*(1-t)),outerZ(x)-C.wall);};
 const r=C.round??.004;
 const cavity=(x,y,z)=>{const c0=y-refY(x,z)-(C.lift||0);
  let d=c0>=0?c0-C.roof:-c0-C.floor;
  d=smax(d,abs(z)-sideZ(x),r);
  d=smax(d,x-Math.min(frontX(abs(z))-C.front,C.tip??Infinity),r);
  d=smax(d,C.back-x,C.backRound??r);
  return C.wallMin===null?d:smax(d,head(x,y,z)+C.wallMin,r);};
 // A ruminant's dental pad: a firm ridge across the front of the roof, where its upper incisors
 // would be, that the lower incisors close against.
 const P=M.pad,padAt=P?(()=>{const x=frontX(0)-C.front-P.depth-(P.inset??.001);return [x,refY(x,0)+P.bottom+P.height,0];})():null;
 const pad=P?(x,y,z)=>E(x,y,z,padAt,[P.depth,P.height,P.half]):null;
 const near=(x,y,z)=>x>C.back-.03&&abs(y-refY(x,z))<M.reach;
 // The closed speaking head: the approved head with its mouth inside.
 const rest=(x,y,z)=>{let d=head(x,y,z);if(!near(x,y,z))return d;d=smax(d,-cavity(x,y,z),r);if(pad)d=blend(d,pad(x,y,z),P.blend??.003);return d;};
 // The cavity's front corner: where its side (sideZ) meets its front (`front` behind the lips),
 // the last x at which the side still stands behind the front, and its half-width there. In front
 // of it is the mouth's front opening, where the lips are only `front` thick and the incisors
 // stand (measure.mjs closes it off to see what shows through the head from the game's camera).
 // (a beak opens all along its gape: its front opening is all of it)
 const frontCorner=M.rigid?[cx,outerZ(cx)]:(()=>{let c=null;for(let x=cx;x<frontX(0);x+=.00025){const s=sideZ(x);if(s<=0)break;if(x<frontX(s)-C.front)c=[x,s];}return c;})();
 // The expanded space's field (see the top of this file).
 function expanded(x,y,z){
  const s=sigma(x,z);if(s<=0)return rest(x,y,z);
  const c=cut(x,y,z),R=abs(c)>=s?rest(x,y-Math.sign(c)*s,z):rest(x,y-c,z);
  const a=air(x,c,z);return a===null?R:smax(R,a,M.edge??.001);
 }
 // A vertex of the expanded mesh, back in rest space: `lower` 0 on the upper side of the lips, 1
 // on the lower, between them in the slab (from its height in it); `fold` whether it lies in the
 // slab or on its faces (folded flat onto the cut at rest), `slab` whether strictly inside it,
 // `gap` whether it is a face of the window's air.
 // In front of where a beak's gap ends, a point's side is the mandible it is nearer (the upper's
 // hooked tip hangs below the gape's line, in front of the lower's tip).
 function toRest(x,y,z){
  const s=sigma(x,z),c=cut(x,y,z),side=p=>(M.mandibles&&p[0]>fx?M.mandibles(...p):cut(...p))>=0?0:1;
  if(s<=0)return {p:[x,y,z],lower:side([x,y,z]),fold:false,slab:false,gap:false};
  // (a vertex within half a sculpt step inside the slab's faces is taken as on them: one side's,
  // so the grid's corner cuts at the lips' edges stay with the lips)
  const eps=Math.min(.0002,s*.05),inner=Math.min(.45*(M.step||.0025),s*.4);
  if(abs(c)>s+eps){const p=[x,y-Math.sign(c)*s,z];
   // (where the air shapes the surface, it is a lip's face, though the field's blend there left
   // it a hair outside the slab: it folds onto the cut too, or the closed lips keep a crack)
   const a=air(x,c,z);
   if(a!==null&&abs(c)<s+.002&&a>rest(...p)){const q=[x,y-c,z];return {p:q,lower:M.mandibles&&x>fx?side(q):c>0?0:1,fold:true,slab:false,gap:true};}
   return {p,lower:side(p),fold:false,slab:false,gap:false};}
  // (the slab is graded from one lip to the other in its middle half only: near a lip's face the
  // grid samples the inner walls' junction with it irregularly, and graded linearly there its
  // vertices took 0 to 0.15 at random, which the open jaw drew out into a sawtooth along every lip,
  // round 3's ragged edges)
  const p=[x,y-c,z],a=air(x,c,z),edge=abs(c)>=s-inner;
  const lower=edge?(c>0?0:1):M.mandibles&&x>fx?side(p):smooth((s-inner-c)/(2*(s-inner)),SLAB_GRADE,1-SLAB_GRADE);
  return {p,lower,fold:true,slab:!edge,gap:a!==null&&a>-.0005};
 }
 // The jaw's weight on each side of the lips, and between.
 const L=jawLines(M,head,refY),[hx,hy]=M.hinge;
 const band=z=>M.band.mid+(M.band.cheek-M.band.mid)*smooth(abs(z),M.band.z0,M.band.z1);
 const parting=(x,z)=>smooth(x,cx-taper,cx+(M.corner.open??.04))*(1-smooth(abs(z),cz-(M.corner.zOpen??.02),cz));
 const ramus=(()=>{const [ax,ay]=L.a,dx=hx-ax,dy=hy-ay,l=Math.hypot(dx,dy);return (x,y)=>((x-ax)*dy-(y-ay)*dx)/l;})();
 const region=(x,y)=>smooth(y-L.lineY(x),-L.blend,0)*smooth(ramus(x,y),-L.blend,0);
 function jawSide(x,y,z,side,parted=false){
  if(M.rigid)return side>0?0:smooth(x,hx-M.rigid,hx+M.rigid);
  const d=cut(x,y,z),b=band(z),R=region(x,y),wBand=(1-smooth(d,-b,b))*R,wSide=side<0?R:0;
  return wBand+(wSide-wBand)*(parted?1:parting(x,z));
 }
 // Everything takes the parting's blend toward the cheeks over `corner.open` in front of the
 // corners: a lip's face (folded onto the cut at rest) takes its lip's edge's weight there, and the
 // slab's skin (at the corners) is graded between the two lips' (`face`, a face wholly on
 // its own side, is round 3's rule: its faces then left their lips' blended edges near the corners,
 // and the open jaw drew the skin there into combs, round 3's review).
 const jaw=([x,y,z],lower,face=false)=>{const up=jawSide(x,y,z,1,face),down=jawSide(x,y,z,-1,face);return up+(down-up)*lower;};
 return {head,lipY,refY,cut,sigma,sigmaAir,window:wz,outerZ,frontX,sideZ,frontCorner,cavity,pad,padAt,rest,expanded,toRest,jaw,jawSide,lines:L,band,parting,region,ramus};
}

// The mandible's outline in profile, read off the head at its middle: the underside below the cut
// from the jaw's joint to the lips, `margin` lower (the jaw line), and the jaw's angle (where,
// going forward, the underside rises most steeply out of the throat, in the back half of the
// mouth). M.jawLine may set the angle's x as `a`.
export function jawLines(M,head,refY){
 const J={margin:.002,...M.jawLine};
 let front=M.lip.x+.15;while(front>M.hinge[0]&&head(front,refY(front,0)-.004,0)>0)front-=.0005;
 const under=x=>{const y0=refY(x,0);let y=y0-.004;if(head(x,y,0)>0)return null;while(y>y0-.5&&head(x,y,0)<0)y-=.0005;return bisect(v=>head(x,v,0),y,y+.0005);};
 // (the angle is looked for every 5 mm; the line itself is read every millimetre, so a steep
 // stretch of the underside, as at the director's chin, is not cut across)
 const pts=[];for(let x=M.hinge[0];x<=front-.003;x+=.005){const y=under(x);if(y!==null)pts.push([x,y]);}
 let ai=0;
 if(J.a)ai=pts.reduce((best,p,i)=>abs(p[0]-J.a)<abs(pts[best][0]-J.a)?i:best,0);
 else{let steepest=-Infinity;for(let i=1;i<pts.length&&pts[i][0]<(M.hinge[0]+front)/2;i++){const u0=refY(pts[i-1][0],0)-pts[i-1][1],u1=refY(pts[i][0],0)-pts[i][1],k=(u0-u1)/(pts[i][0]-pts[i-1][0]);if(k>steepest){steepest=k;ai=i;}}}
 const line=[];for(let x=pts[ai][0];x<=front-.003;x+=.001){const y=under(x);if(y!==null)line.push([x,y]);}
 const a=[line[0][0],line[0][1]],b=line.at(-1);
 const lineY=x=>{if(x<=line[0][0])return line[0][1]-J.margin;if(x>=b[0])return b[1]-J.margin;
  let i=1;while(line[i][0]<x)i++;const [x0,y0]=line[i-1],[x1,y1]=line[i];return y0+(y1-y0)*(x-x0)/(x1-x0)-J.margin;};
 const blendWidth=J.blend??.4*Math.hypot(a[0]-M.hinge[0],a[1]-M.hinge[1]);
 return {a,b,lineY,blend:blendWidth,points:line.map(([x,y])=>[x,y-J.margin])};
}

// The arch a row of teeth stands on: the cavity's front and sides at the cut, traced as a curve
// (by angle about a point well inside the mouth), and moved `offset` inward: the points that far
// from it (where it turns tighter than that, the arch turns a corner rather than folding back on
// itself). Returns a function of arc length (0 at the middle, negative toward -z) giving
// {x, z, out (unit, toward the lips)}.
function archAt(G,M,offset){
 const front=G.frontX(0)-M.cavity.front,o=[(front+Math.max(M.cavity.back,front-.1))/2,0];
 const inside=(x,z)=>G.cavity(x,G.refY(x,z)+(M.cavity.lift||0)+.0005,z)<0;
 if(!inside(...o))throw Error('the cavity does not reach the middle of the mouth');
 const ray=(a,test)=>{const d=[Math.cos(a),Math.sin(a)];let lo=0,hi=.2;for(let k=0;k<40;k++){const m=(lo+hi)/2;if(test(o[0]+d[0]*m,o[1]+d[1]*m))lo=m;else hi=m;}return [o[0]+d[0]*lo,o[1]+d[1]*lo];};
 const angles=[];for(let a=-1.7;a<=1.7001;a+=.02)angles.push(a);
 const pts=angles.map(a=>ray(a,inside));
 const dist=L=>(x,z)=>{let m=Infinity;for(let i=1;i<L.length;i++){const [ax,az]=L[i-1],[bx,bz]=L[i],ex=bx-ax,ez=bz-az,t=clamp(((x-ax)*ex+(z-az)*ez)/(ex*ex+ez*ez||1),0,1);m=Math.min(m,Math.hypot(x-ax-ex*t,z-az-ez*t));}return m;};
 const far=dist(pts);
 if(far(...o)<offset)throw Error('the mouth is narrower than its teeth stand inside it');
 // and no tighter than ROUND across (a narrow snout's mouth comes to a point: the arch is the
 // points within ROUND of those ROUND further in, so its point is rounded)
 const ROUND=.004,inner=far(...o)>=offset+ROUND?dist(angles.map(a=>ray(a,(x,z)=>inside(x,z)&&far(x,z)>=offset+ROUND))):null;
 const P=angles.map(a=>ray(a,(x,z)=>inside(x,z)&&far(x,z)>=offset&&(!inner||far(x,z)>=offset+ROUND||inner(x,z)<=ROUND)));
 // each point's outward normal from its neighbours, then arc length from the middle
 const off=P.map((p,i)=>{const a=P[Math.max(0,i-3)],b=P[Math.min(P.length-1,i+3)],tx=b[0]-a[0],tz=b[1]-a[1],l=Math.hypot(tx,tz)||1;
  return {x:p[0],z:p[1],out:[tz/l,-tx/l]};});
 const s=[0];for(let i=1;i<off.length;i++)s.push(s[i-1]+Math.hypot(off[i].x-off[i-1].x,off[i].z-off[i-1].z));
 const mid=off.reduce((best,p,i)=>abs(p.z)<abs(off[best].z)?i:best,0),s0=s[mid];
 return u=>{const t=u+s0;let i=1;while(i<s.length-1&&s[i]<t)i++;const f=clamp((t-s[i-1])/(s[i]-s[i-1]||1),0,1),A=off[i-1],B=off[i];
  const out=[A.out[0]+(B.out[0]-A.out[0])*f,A.out[1]+(B.out[1]-A.out[1])*f],l=Math.hypot(...out);
  return {x:A.x+(B.x-A.x)*f,z:A.z+(B.z-A.z)*f,out:[out[0]/l,out[1]/l]};};
}

// The gum at a point of the mouth: the roof above the cut (or the floor below it), as built.
function gum(G,x,z,up){const y0=G.refY(x,z);let y=y0;const step=up?.0002:-.0002;for(let k=0;k<300;k++){y+=step;if(G.rest(x,y,z)<0)return bisect(v=>G.rest(x,v,z),y-step,y);}return null;}

// The teeth, set in the mouth as sculpted: each row on its arch (the upper incisors just inside
// the lips, the lower behind them), each tooth rooted `embed` into the gum as built and reaching
// past the cut by `tip`. A row: {jaw, kind, count, half (arc length to the outer teeth), width,
// depth (half-sizes along and across the arch), tip, embed, inset (extra, inward), lean}.
export function teethLayout(M,G){
 const rows=M.teeth||[],out=[],gap=M.teethGap??.0008;
 const upperDepth=Math.max(0,...rows.filter(r=>r.jaw==='upper'&&r.kind!=='canine').map(r=>r.depth));
 // Each tooth is taken as an elliptic cylinder about its axis (its section on the arch; an
 // incisor's narrower toward its root, toothMesh); its extent toward another is its ellipse's
 // support in that direction. Two teeth are compared at heights through the range both reach.
 const reach=(t,u,f=1)=>{const al=[-t.across[2],t.across[0]],w=t.w*(t.kind==='incisor'?incisorWidth(f):1);return Math.hypot(w*(u[0]*al[0]+u[1]*al[1]),t.d*(u[0]*t.across[0]+u[1]*t.across[2]));};
 const along=(t,y)=>clamp((y-t.root[1])/(t.tip[1]-t.root[1]),0,1);
 const axisAt=(t,y)=>{const f=along(t,y);return [t.root[0]+(t.tip[0]-t.root[0])*f,t.root[2]+(t.tip[2]-t.root[2])*f];};
 const heights=(a,b)=>{const lo=Math.max(Math.min(a.root[1],a.tip[1]),Math.min(b.root[1],b.tip[1])),hi=Math.min(Math.max(a.root[1],a.tip[1]),Math.max(b.root[1],b.tip[1]));
  return hi<lo?[]:Array.from({length:9},(_,k)=>lo+(hi-lo)*k/8);};
 const apart=(a,b,y)=>{const [ax,az]=axisAt(a,y),[bx,bz]=axisAt(b,y),dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz);return {d,u:[dx/d,dz/d],ax,az,fa:along(a,y),fb:along(b,y)};};
 rows.forEach((row,k)=>{
  const up=row.jaw==='upper',offset=(row.inset??0)+.0008+row.depth+(up?0:(upperDepth?2*upperDepth+gap:0));
  const arch=archAt(G,M,offset),at=[];for(let i=0;i<row.count;i++)at.push(arch((row.count===1?0:(i/(row.count-1))*2-1)*row.half));
  // A leaning (procumbent) tooth reaches its place on the arch at its tip, from a root further
  // back (straight back, so neighbours' roots stand as far apart as their tips).
  const lean=row.lean||0,length=row.tip+.012,inner=p=>({x:p.x-lean*length,z:p.z});
  // Side by side on a curved arch the teeth are a little nearer than their spacing along it (and
  // nearer still at a leaning tooth's root): each is at most as wide as leaves a hair between it
  // and its neighbours, at its tip and (an incisor's root being narrower) at its root.
  const rootWidth=row.kind==='canine'?1:incisorWidth(0);
  let wide=row.width;for(let i=1;i<at.length;i++){const a=inner(at[i-1]),b=inner(at[i]);
   wide=Math.min(wide,Math.hypot(at[i].x-at[i-1].x,at[i].z-at[i-1].z)/2-.00025,(Math.hypot(b.x-a.x,b.z-a.z)/2-.00025)/rootWidth);}
  const first=out.length;
  for(let i=0;i<row.count;i++){
   const {x,z,out:o}=at[i],across=[o[0],0,o[1]];
   const g=gum(G,x,z,up);if(g===null)throw Error(`${row.jaw} ${row.kind} ${i}: no gum above or below it`);
   const ref=G.refY(x,z),tip=up?ref-row.tip:ref+row.tip,r=inner(at[i]);
   // (rooted no deeper than keeps the root's side a millimetre inside the head: a thin chin)
   const rootR=Math.max(row.kind==='canine'?row.width:incisorWidth(0)*row.width,row.depth)+.001;let embed=row.embed??.003;
   while(embed>.001&&G.head(r.x,up?g+embed:g-embed,r.z)>-rootR)embed-=.0002;
   const root=up?g+embed:g-embed;
   out.push({row:k,jaw:row.jaw,kind:row.kind||'incisor',root:[r.x,root,r.z],tip:[x,tip,z],across,w:wide,d:row.depth});
  }
  // Where the gum or the cut slopes, neighbours stand at different heights and their axes draw
  // nearer between tip and root: the row is no wider than leaves a hair between them there too.
  const teeth=out.slice(first),fits=w=>teeth.every((a,i)=>i===0||heights(teeth[i-1],a).every(y=>{const {d,u,fa,fb}=apart(teeth[i-1],a,y);
   return d>=reach({...teeth[i-1],w},u,fa)+reach({...a,w},u,fb)+.0005;}));
  if(!fits(teeth[0].w)){let lo=0,hi=teeth[0].w;for(let k=0;k<20;k++){const m=(lo+hi)/2;if(fits(m))lo=m;else hi=m;}
   if(lo<.4*row.width)throw Error(`${row.jaw} ${row.kind}s: only ${(lo*2000).toFixed(1)} mm wide fit side by side (${(row.width*2000).toFixed(1)} mm asked)`);
   for(const t of teeth)t.w=lo;}
 });
 // No two teeth may touch.
 for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){const a=out[i],b=out[j];
  for(const y of heights(a,b)){const {d,u,ax,az,fa,fb}=apart(a,b,y);
   if(d<reach(a,u,fa)+reach(b,u,fb)+(a.row===b.row?.0004:gap*.4))throw Error(`teeth touch: ${a.jaw} ${a.kind} at z ${(a.tip[2]*1000).toFixed(1)} and ${b.jaw} ${b.kind} at z ${(b.tip[2]*1000).toFixed(1)} (${(d*1000).toFixed(1)} mm apart, ${((y-G.refY(ax,az))*1000).toFixed(1)} mm from the cut)`);}}
 return out;
}

// An incisor's width along its axis (0 root, 1 tip): spade-shaped, its root a little over half as
// wide as its crown.
export const incisorWidth=s=>.55+.45*smooth(s,.2,.6);
// A tooth as a closed lathe about its axis, root to tip: rings of an ellipse (half-width w along
// the arch, half-depth d across it). An incisor widens from its root to its crown and thins across
// to a chisel edge; a canine tapers to a point. Returns {position, normal, index} (flat arrays).
export function toothMesh(t,sides,rings){
 const axis=t.tip.map((v,k)=>v-t.root[k]),len=Math.hypot(...axis),up=axis.map(v=>v/len);
 const a0=t.across,dot=a0[0]*up[0]+a0[1]*up[1]+a0[2]*up[2],ac0=a0.map((v,k)=>v-up[k]*dot),al=Math.hypot(...ac0),ac=ac0.map(v=>v/al);
 const al2=[up[1]*ac[2]-up[2]*ac[1],up[2]*ac[0]-up[0]*ac[2],up[0]*ac[1]-up[1]*ac[0]];
 const incisor=t.kind==='incisor';
 const radius=s=>incisor?(s<.8?1:Math.sqrt(Math.max(0,1-((s-.8)/.2)**2))*.7+.3):Math.pow(1-s,.85)*.92+.08*(1-s);
 const wide=s=>incisor?incisorWidth(s):1;
 const thin=s=>incisor?1-.55*smooth(s,.35,1):1;
 const P=[],ix=[];
 for(let j=0;j<=rings;j++){const s=j/rings*(incisor?.97:.9),c=t.root.map((v,k)=>v+axis[k]*s),rw=radius(s);
  for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);P.push(c.map((v,k)=>v+al2[k]*ca*t.w*rw*wide(s)+ac[k]*sa*t.d*rw*thin(s)));}}
 const root=P.length;P.push(t.root.slice());const tip=P.length;P.push(t.tip.slice());
 for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=b+sides,d=a+sides;ix.push(a,b,c,a,c,d);}
 for(let i=0;i<sides;i++){ix.push(root,(i+1)%sides,i);ix.push(rings*sides+i,rings*sides+(i+1)%sides,tip);}
 return closed(P,ix);
}

// The tongue's layout, from the mouth as built: lying on the floor (its underside `embed` into
// it), from `backInset` in front of the cavity's back to just behind the lower teeth (or the
// cavity's front), its top `below` the cut at the tip rising toward the back (`rise` above the
// cut, at most `clear` under the roof), and narrower than the mouth and the teeth around it.
export function tongueLayout(M,G,teeth){
 const T=M.tongue,embed=T.embed??.0015,clear=T.clear??.0015,rise=T.rise??.002,below=T.below??.002;
 // a tooth's extent along x and z about its axis (its section is an ellipse on the arch)
 const extent=t=>{const [ax,,az]=t.across;return {x:abs(ax)*t.d+abs(az)*t.w,z:abs(az)*t.d+abs(ax)*t.w};};
 const lower=teeth.filter(t=>t.jaw==='lower'),middle=lower.filter(t=>abs(t.root[2])<.012);
 const tipX=lower.length?Math.min(...(middle.length?middle:lower).map(t=>t.root[0]-extent(t).x))-(T.gap??.003):Math.min(G.frontX(0)-M.cavity.front,M.cavity.tip??Infinity)-(T.gap??.004);
 const backX=M.cavity.back+(T.backInset??.015),n=24,rings=[];
 for(let j=0;j<=n;j++){const s=j/n,x=backX+(tipX-backX)*s,floor=gum(G,x,0,false),roof=gum(G,x,0,true);if(floor===null||roof===null)throw Error('tongue: no floor or roof at x '+x.toFixed(3));
  const ref=G.refY(x,0),bottom=floor-embed,top=Math.min(roof-clear,ref+rise-(rise+below)*smooth(s,.35,1));
  let half=Math.min(T.width,G.sideZ(x)-.002);
  // narrower than the teeth beside it (those reaching down to its top, for the upper teeth)
  for(const t of teeth){const e=extent(t);if(abs(t.root[0]-x)>e.x+.002)continue;if(t.jaw==='upper'&&Math.min(t.root[1],t.tip[1])>top)continue;half=Math.min(half,abs(t.root[2])-e.z-.002);}
  rings.push({x,bottom,top,half:Math.max(.002,half)});}
 return {rings,tip:tipX,back:backX};
}

// The tongue as a closed surface: an elliptic section at each ring (domed, round 2: a flatter top
// read as a slab), the tip rounded off in plan over as much of its length as it is wide there (at
// least the last 18%, at most half: round 3, a wide tongue's blunt front read as a box seen from
// the front) and the back closed. Returns {position, normal, index}.
export function tongueMesh(layout,sides,count){
 const R=layout.rings,P=[],ix=[],pick=[];for(let j=0;j<count;j++)pick.push(R[Math.round(j/(count-1)*(R.length-1))]);
 const s0=1-Math.min(.5,Math.max(.18,R.at(-1).half/Math.max(1e-6,R.at(-1).x-R[0].x)));
 const tipRound=s=>s<s0?1:Math.sqrt(Math.max(0,1-((s-s0)/(1-s0))**2))*.9+.1;
 pick.forEach((r,j)=>{const s=j/(count-1),k=tipRound(s),cy=(r.bottom+r.top)/2,hh=(r.top-r.bottom)/2*Math.max(.35,k),w=r.half*k;
  for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,u=Math.cos(a),v=Math.sin(a),yy=v;P.push([r.x,cy+hh*yy,w*u]);}});
 const back=P.length,rb=pick[0];P.push([rb.x-.002,(rb.bottom+rb.top)/2,0]);const tip=P.length,rt=pick.at(-1);P.push([rt.x+.003,(rt.bottom+rt.top)/2,0]);
 for(let j=0;j<count-1;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=b+sides,d=a+sides;ix.push(a,b,c,a,c,d);}
 for(let i=0;i<sides;i++){ix.push(back,(i+1)%sides,i);ix.push((count-1)*sides+i,(count-1)*sides+(i+1)%sides,tip);}
 return closed(P,ix);
}

// A closed mesh from points and triangles, wound outward (by its signed volume), with smooth normals.
function closed(P,ix){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P.flat(),3));
 let vol=0;for(let t=0;t<ix.length;t+=3){const [a,b,c]=[P[ix[t]],P[ix[t+1]],P[ix[t+2]]];vol+=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);}
 if(vol<0)for(let t=0;t<ix.length;t+=3)[ix[t+1],ix[t+2]]=[ix[t+2],ix[t+1]];
 g.setIndex(ix);g.computeVertexNormals();
 const out={position:new Float32Array(g.attributes.position.array),normal:new Float32Array(g.attributes.normal.array),index:new Uint32Array(ix)};g.dispose();return out;
}

// Sculpt everything. The skin is sculpted in the expanded space (`skin`, where it is open) and
// carried back to rest (`rest`), with each vertex's jaw weight, which side of the lips it is on
// (`lower`), whether it folds flat at rest (`fold`), how far the lips part where it is (`part`:
// 0 behind the corners, 1 in front of them), how deep it lies under the approved surface
// (`depth`, and `inside` 0..1 from 3 to 6 mm: the lips' faces keep the outer paint at their
// edges) and whether it is the approved outer surface (`outer`). The skin stretched between the
// parted lips (at the corners) is painted as the mouth by part and lower: see speaking-head.js.
// Teeth and tongue are made in rest space. Everything is in sculpt space; the caller places it.
// `shift` moves the sculpt's grid by that many steps (a grid can catch two sheets of a surface
// touching at one of its edges; another grid does not).
export function sculptSpeaking(head,M,{shift=0}={}){
 const field=head.speaking??head.field,G=mouthGeometry(M,field),step=M.step||head.step,grow=M.gap+2*step,o=shift*step;
 const min=[head.min[0]-o,head.min[1]-grow-o,head.min[2]-o],max=[head.max[0]+step,head.max[1]+grow+step,head.max[2]+step];
 const skin=sculptSurface(G.expanded,min,max,step),P=skin.attributes.position.array,n=P.length/3;
 const rest=new Float32Array(n*3),jaw=new Float32Array(n),lower=new Float32Array(n),fold=new Float32Array(n),part=new Float32Array(n),inside=new Float32Array(n),depth=new Float32Array(n),outer=new Float32Array(n);
 for(let i=0;i<n;i++){const r=G.toRest(P[i*3],P[i*3+1],P[i*3+2]);
  rest.set(r.p,i*3);lower[i]=r.lower;fold[i]=r.fold?1:0;
  const below=-field(...r.p);depth[i]=clamp(below,0,.05);outer[i]=!r.fold&&below<.001?1:0;}
 // The lips' edges, folded shut, lie on the approved surface's section at the cut: each lip face's
 // vertex next to the outer surface (the edge's own row, which the grid left a little inside the
 // lip) is moved out onto it, so the two lips' edges meet along one line, with no crack between
 // them for a ray to pass, and an open lip's edge is the surface's own.
 const g=(u,w)=>field(u,G.refY(u,w),w);
 // (where the surface lies nearly flat in the cut, its section there is no line to move onto: the
 // vertex stays, as it does if the move would be more than 2 mm)
 const crease=([x,y,z])=>{let p=[x,z];for(let k=0;k<4;k++){const f=g(p[0],p[1]),e=1e-5,gx=(g(p[0]+e,p[1])-g(p[0]-e,p[1]))/(2*e),gz=(g(p[0],p[1]+e)-g(p[0],p[1]-e))/(2*e),l=gx*gx+gz*gz;if(l<.09)return [x,y,z];p=[p[0]-f*gx/l,p[1]-f*gz/l];}
  return Math.hypot(p[0]-x,p[1]-z)>.002?[x,y,z]:[p[0],G.refY(p[0],p[1]),p[1]];};
 const I=skin.index.array,edgeRow=new Uint8Array(n);
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(!v.some(i=>outer[i]))continue;for(const i of v)if(fold[i]&&(lower[i]===0||lower[i]===1)&&depth[i]<(M.crease??.0025))edgeRow[i]=1;}
 // (each only as far as turns none of its triangles inside-out: a lip is its sculpted shape shifted
 // by sigma, so a triangle of one lip faces at rest as it faced where sculpted, open; snapped in
 // full, round 3's edge rows turned 1 to 2% of the lips' edge triangles inside-out, 30 to 60 mm2 a
 // head, culled open, and the game's camera saw the background through them along the lips)
 const tris=Array.from({length:n},()=>[]);for(let t=0;t<I.length;t+=3)for(let k=0;k<3;k++)tris[I[t+k]].push(t);
 const facing=(Q,t)=>{const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3,e1=[Q[b]-Q[a],Q[b+1]-Q[a+1],Q[b+2]-Q[a+2]],e2=[Q[c]-Q[a],Q[c+1]-Q[a+1],Q[c+2]-Q[a+2]];return [e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];};
 const P0=P.slice(),keeps=t=>{const lo=[lower[I[t]],lower[I[t+1]],lower[I[t+2]]];if(!(lo.every(v=>v===0)||lo.every(v=>v===1)))return true;const a=facing(P0,t),b=facing(rest,t);return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]>0;};
 // (the sculpt, open, moves with it: the reductions simplify it there, with the rest pose an
 // attribute, and a rest pose that is no shift of the open one folded their collapses)
 const snap=(i,q)=>{const p=[rest[i*3],rest[i*3+1],rest[i*3+2]],up=P[i*3+1]-p[1];
  for(const f of [1,.75,.5,.25,0]){rest.set(p.map((v,k)=>v+(q[k]-v)*f),i*3);if(f===0||tris[i].every(keeps))break;}
  P[i*3]=rest[i*3];P[i*3+1]=rest[i*3+1]+up;P[i*3+2]=rest[i*3+2];
  depth[i]=clamp(-field(rest[i*3],rest[i*3+1],rest[i*3+2]),0,.05);};
 for(let i=0;i<n;i++)if(edgeRow[i])snap(i,crease([rest[i*3],rest[i*3+1],rest[i*3+2]]));
 for(let i=0;i<n;i++){const p=[rest[i*3],rest[i*3+1],rest[i*3+2]];jaw[i]=G.jaw(p,lower[i]);part[i]=G.parting(p[0],p[2]);
  // the lips' faces are the mouth's beyond their first millimetre and a bit; any other surface
  // deeper than the approved surface's own (the cavity, a pad) is the mouth's
  inside[i]=fold[i]?smooth(depth[i],.0012,.003):smooth(depth[i],.001,.002);}
 // (a beak's rigid mandibles: what the gap leaves between them at its ends is the beak's own, no mouth)
 if(M.rigid)part.fill(0);
 const teeth=teethLayout(M,G),tongue=M.tongue?tongueLayout(M,G,teeth):null;
 return {skin,rest,jaw,lower,fold,part,inside,depth,outer,teeth,tongue,geometry:G};
}
