// A speaking head is the approved head sculpt, opened for speech:
//  - the lips are parted by a thin slit that runs from the front of the mouth back to its
//    corners (where it ends round), and behind them a mouth cavity is hollowed out;
//  - the lower jaw is weighted to a jaw bone at the jaw joint (the hinge), with the weights
//    breaking across the slit, so the lower lip follows the jaw and the upper lip stays, and
//    blending everywhere else (the corners, cheeks and throat stretch);
//  - teeth and a tongue are separate parts, rigid on the head or on the jaw.
// Everything is sculpted in the head's own sculpt space (heads.mjs). The rest pose then seals
// the slit, moving its two faces together, so a closed speaking head keeps the approved
// surface (and its registered paint) everywhere but a narrow band along the lip line.
import * as THREE from '../../dist/tactics/vendor/three.module.js';
import {blend,ellipsoid as E,tapered as C,roundedBox as B,sculptSurface} from '../../dist/tactics/grey-surface.js';
const smooth=THREE.MathUtils.smoothstep,clamp=THREE.MathUtils.clamp,abs=Math.abs;
export const smax=(a,b,k)=>-blend(-a,-b,k);

// The mouth's geometry for one character (mouths.mjs), as functions of a sculpt-space point.
export function mouthGeometry(M,head=null){
 const lipY=(x,z)=>M.lip.y+M.lip.slope*(x-M.lip.x)+M.lip.smile*Math.min(1,(z/M.lip.width)**2);
 // Which side of the mouth a point is on, as a signed distance from where the lips meet: above
 // the lip line for a muzzle; a beak (M.cut) parts along the surface between its mandibles.
 const cut=M.cut||((x,y,z)=>y-lipY(x,z));
 // The slit: `slit` thick about the cut, over the mouth (in front of the corners' x and within
 // their |z|), its ends rounded, so the corners are round and the slit is never thinner than
 // the grid can sculpt. tear() is how much of its thickness is there (1 inside the mouth).
 const h=M.slit/2,cx=M.corner.x,cz=M.corner.z;
 const ends=(x,z)=>[Math.max(0,cx-x),Math.max(0,abs(z)-cz)];
 const slit=(x,y,z)=>{const [ex,ez]=ends(x,z);return Math.hypot(ex,ez,cut(x,y,z))-h;};
 const slitHalf=(x,z)=>{const [ex,ez]=ends(x,z);return Math.sqrt(Math.max(0,h*h-ex*ex-ez*ez));};
 const tear=(x,z)=>slitHalf(x,z)/h;
 // The lips' weights part gradually in front of the corners (over `open`, and in from the
 // sides over `zOpen`), so the mouth opens from rounded corners rather than a notch.
 const parting=(x,z)=>smooth(x,cx,cx+(M.corner.open??.04))*(1-smooth(abs(z),cz-(M.corner.zOpen??.02),cz));
 // Jaw membership away from the slit: below the lip line within a band (narrow inside the
 // mouth, wide across the cheeks), above the jaw's underside line, in front of its back edge.
 const band=z=>M.band.mid+(M.band.cheek-M.band.mid)*smooth(abs(z),M.band.z0,M.band.z1);
 // The jaw is what lies in front of its back edge and above a ray from the jaw joint (the
 // throat's angle): a hinge's own shape, so its edge is smooth wherever the head is.
 const [hx,hy]=M.hinge,deg=180/Math.PI;
 const region=(x,y)=>smooth(Math.atan2(y-hy,x-hx)*deg,M.throat.angle-M.throat.blend,M.throat.angle+M.throat.blend)*smooth(x,M.back.x-M.back.blend,M.back.x+M.back.blend);
 function jaw(x,y,z){
  // The lips, within `lipDepth` of the slit, belong wholly to their own side of it where the
  // mouth parts; further away the region decides.
  const b=band(z),dy=cut(x,y,z),wc=(1-smooth(dy,-b,b))*region(x,y),lip=M.lipDepth??.02;
  const t=parting(x,z)*(1-smooth(abs(dy)-slitHalf(x,z),.5*lip,lip));
  return dy>=0?wc*(1-t):wc+(1-wc)*t;
 }
 // The mouth behind the lips follows the head: everything inside it deeper than `wall` (the
 // lips', cheeks' and jaw's thickness), within a slab from `floor` below the lip line to `roof`
 // above it, within `width` of the middle (narrowing by `taper` toward the back), and in front
 // of `back`, its edges rounded over `round`. A long muzzle gets a long narrow mouth, a broad
 // one a broad mouth, and the jaw keeps its walls.
 const cavity=(x,y,z)=>{const c=M.cavity,dy=y-lipY(x,0)-(c.lift||0),t=clamp((x-c.back)/.12,0,1),w=c.width*(1-(c.taper??.2)*(1-t)),r=c.round??.004;
  let d=smax(dy>=0?dy-c.roof:-dy-c.floor,abs(z)-w,r);
  if(head)d=smax(d,head(x,y,z)+c.wall,r);
  return smax(d,c.back-x,r);};
 return {lipY,cut,tear,slit,slitHalf,parting,jaw,cavity,region};
}

// The closed speaking head: the approved head, plus, where its lower lip is too thin to part
// (the bull's muzzle ends at its painted mouth line), a little lip under it (M.lowerLip:
// ellipsoids, blended in), as its painting shows.
export function closedField(field,M){
 if(!M.lowerLip)return field;
 return (x,y,z)=>{let d=field(x,y,z);for(const [c,r,k] of M.lowerLip)d=blend(d,E(x,y,z,c,r),k);return d;};
}

// The speaking skin: the head with the slit and the cavity taken out, smoothly (the lips'
// edges round over `M.round`). The cavity keeps its walls, so it opens only through the lips.
export function speakingField(field,M){
 const closed=closedField(field,M),G=mouthGeometry(M,closed),xmin=Math.min(M.cavity.back,M.corner.x)-.03;
 return (x,y,z)=>{
  const d=closed(x,y,z);
  if(y<M.lip.y-M.reach||y>M.lip.y+M.reach||x<xmin)return d;   // far from the mouth
  return smax(smax(d,-G.slit(x,y,z),M.round),-G.cavity(x,y,z),M.round);
 };
}

// Sealing the slit for the rest pose: each face moves halfway across it (along the cut's
// gradient: up or down for a muzzle), and the lips around it follow over `M.seal` (so the
// approved surface is kept away from the lip line). Returns the offset vector.
export function sealOffset(G,M,[x,y,z]){
 const half=G.slitHalf(x,z);if(half<=0)return [0,0,0];
 const d=G.cut(x,y,z),far=Math.max(0,abs(d)-half),e=1e-4;
 const g=[G.cut(x+e,y,z)-G.cut(x-e,y,z),G.cut(x,y+e,z)-G.cut(x,y-e,z),G.cut(x,y,z+e)-G.cut(x,y,z-e)],l=Math.hypot(...g)||1;
 const amount=-Math.sign(d)*half*(1-smooth(far,0,M.seal));
 return g.map(v=>v/l*amount);
}

// Teeth and tongue, sculpted in the rest pose, each kept `M.partWall` inside the approved head
// (a root never shows through a thin lip or chin). Returns [{name, bone, field, min, max}].
export function mouthParts(M,head=null){
 const G=mouthGeometry(M),parts=[];
 for(const row of M.teeth||[]){
  const up=row.jaw==='upper';
  // Teeth stand along an arch at the front of the mouth (x = x0 - arch*u^2, z = half*u), each a
  // rounded block facing out of the arch, its tip `tip` past the lip line: an upper tooth
  // hangs from the gum above, a lower one stands on the gum below.
  const teeth=[];for(let i=0;i<row.count;i++){const u=row.count===1?0:(i/(row.count-1))*2-1,z=u*row.half,x=row.x-row.arch*u*u,slope=-2*row.arch*u/row.half,l=Math.hypot(1,slope);
   const length=row.lengths?row.lengths[i]:row.length,tipY=G.lipY(x,z)+(up?-row.tip:row.tip)+(up?-1:1)*(length-row.length),rootY=tipY+(up?length:-length);
   teeth.push({x,z,n:[1/l,-slope/l],cy:(tipY+rootY)/2,h:length/2,w:row.widths?row.widths[i]:row.width,d:row.depth});}
  const field=(x,y,z)=>{let d=Infinity;for(const t of teeth){const dx=x-t.x,dz=z-t.z,across=dx*t.n[0]+dz*t.n[1],along=-dx*t.n[1]+dz*t.n[0];
    d=Math.min(d,B(across,y,along,[0,t.cy,0],[t.d,t.h,t.w],Math.min(t.w,t.d)*.8));}return d;};
  const xs=teeth.map(t=>t.x),zs=teeth.map(t=>t.z),ys=teeth.flatMap(t=>[t.cy-t.h,t.cy+t.h]);
  // Each tooth's own field and centre too: teeth are meshed one by one (toothMesh), small
  // closed props with a budget of their own rather than a sculpt reduced.
  const each=teeth.map(t=>({center:[t.x,t.cy,t.z],field:(x,y,z)=>{const dx=x-t.x,dz=z-t.z;return B(dx*t.n[0]+dz*t.n[1],y,-dx*t.n[1]+dz*t.n[0],[0,t.cy,0],[t.d,t.h,t.w],Math.min(t.w,t.d)*.8);}}));
  parts.push({name:(up?'upper':'lower')+' teeth',bone:up?'head':'jaw',count:row.count,teeth:each,field,min:[Math.min(...xs)-.02,Math.min(...ys)-.01,Math.min(...zs)-.02],max:[Math.max(...xs)+.02,Math.max(...ys)+.01,Math.max(...zs)+.02],step:M.teethStep||.0015});
 }
 if(M.tongue){const T=M.tongue,xm=(T.tip+T.back)/2,h=T.thick/2,cy=G.lipY(xm,0)-T.drop-h;
  // A long flat ellipsoid lying on the floor of the mouth (following the lip line's slope),
  // narrowing to its tip, with a shallow median groove.
  const field=(x,y,z)=>{const t=clamp((x-T.back)/(T.tip-T.back),0,1),yy=y-(G.lipY(x,0)-G.lipY(xm,0)),w=T.width*(1-.4*t*t);
   let d=E(x,yy,z,[xm,cy,0],[(T.tip-T.back)/2,h,w]);
   return d+.0016*Math.exp(-((z/.005)**2))*smooth(yy,cy,cy+h);};
  parts.push({name:'tongue',bone:'jaw',field,min:[T.back-.01,Math.min(G.lipY(T.back,0),G.lipY(T.tip,0))-T.drop-T.thick-.02,-T.width-.01],max:[T.tip+.01,Math.max(G.lipY(T.back,0),G.lipY(T.tip,0))+.01,T.width+.01],step:M.tongueStep||.002});
 }
 const wall=M.partWall??.0022,clip=own=>(x,y,z)=>smax(own(x,y,z),head(x,y,z)+wall,.001);
 if(head)for(const part of parts){part.field=clip(part.field);for(const t of part.teeth||[])t.field=clip(t.field);}
 return parts;
}

// A tooth as a closed low-poly mesh: a cube divided n times along each edge, each vertex moved
// along its direction from the tooth's centre onto the tooth's surface (by bisection on its
// field), with normals from the field. Returns {position, normal, index}.
export function toothMesh(tooth,n){
 const verts=[],index=[],at=new Map(),c=tooth.center,f=tooth.field;
 const vertex=(q)=>{const key=q.map(v=>Math.round(v*n)).join(',');if(at.has(key))return at.get(key);
  const l=Math.hypot(...q),d=q.map(v=>v/l);let lo=0,hi=.05;while(f(c[0]+d[0]*hi,c[1]+d[1]*hi,c[2]+d[2]*hi)<0)hi*=2;
  for(let k=0;k<40;k++){const m=(lo+hi)/2;if(f(c[0]+d[0]*m,c[1]+d[1]*m,c[2]+d[2]*m)<0)lo=m;else hi=m;}
  const i=verts.length;verts.push(c.map((v,k)=>v+d[k]*hi));at.set(key,i);return i;};
 for(const [axis,sign] of [[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]){const u=(axis+1)%3,v=(axis+2)%3;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const corner=(a,b)=>{const q=[0,0,0];q[axis]=sign;q[u]=-1+2*a/n;q[v]=-1+2*b/n;return vertex(q);};
   const p00=corner(i,j),p10=corner(i+1,j),p11=corner(i+1,j+1),p01=corner(i,j+1);
   if(sign>0)index.push(p00,p10,p11,p00,p11,p01);else index.push(p00,p11,p10,p00,p01,p11);}}
 const e=1e-5,normal=verts.map(p=>{const g=[0,1,2].map(k=>{const a=p.slice(),b=p.slice();a[k]+=e;b[k]-=e;return f(...a)-f(...b);}),l=Math.hypot(...g)||1;return g.map(v=>v/l);});
 return {position:new Float32Array(verts.flat()),normal:new Float32Array(normal.flat()),index:new Uint32Array(index)};
}

// Sculpt everything: the skin (with its jaw weights, interior mask and both poses) and the
// mouth parts. Positions are sculpt space; the caller places them.
export function sculptSpeaking(head,M,{step=M.step||head.step}={}){
 const closed=closedField(head.field,M),G=mouthGeometry(M,closed),field=speakingField(head.field,M);
 const min=head.min.slice(),max=head.max.slice();
 const skin=sculptSurface(field,min,max,step),P=skin.attributes.position,n=P.count;
 const rest=new Float32Array(n*3),jaw=new Float32Array(n),inside=new Float32Array(n),depth=new Float32Array(n);
 for(let i=0;i<n;i++){const p=[P.getX(i),P.getY(i),P.getZ(i)];
  const o=sealOffset(G,M,p);rest.set([p[0]+o[0],p[1]+o[1],p[2]+o[2]],i*3);
  // weights and the interior are read where the vertex was sculpted, on its side of the slit
  jaw[i]=G.jaw(...p);
  const below=-closed(...p);inside[i]=smooth(below,.0012,.0045);depth[i]=clamp(below,0,.05);
 }
 const parts=mouthParts(M,closed).map(part=>({...part,geometry:sculptSurface(part.field,part.min,part.max,part.step)}));
 return {skin,rest,jaw,inside,depth,parts,geometry:G};
}
