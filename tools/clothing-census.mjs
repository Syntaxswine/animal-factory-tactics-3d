// The clothing census: what a posed character's surfaces do that they did not do at rest. Lifted unchanged in its rules
// from the idle study's v5 census (tests/idle-clothing.test.mjs at 4a819dc, review rounds 4 and 5 of 5), so that any
// motion on any character can be checked, not only the idle. census(worker, options) takes the rest pose and returns
// now(): {pairs, sunk, found}, the strings the idle's tests printed and the same findings as data ({kind: 'self' or
// 'sink', part, into, depth in metres, at, its rest place, and the triangles}). focus(restCentre) => bool limits it to the
// triangles whose centre at rest it accepts. The options are the rule's numbers (SINK 3 mm, SLIDE
// 6 mm, COVER 1 cm, DEEP 2 cm, SHOW 0.5 mm, H 4 mm between points); SLIDE 0 is round 4's strict rule, with no allowance
// beside what was covered at rest. The 6 mm is a zone, not a bound on travel: within it a point may sink as deep as its
// part lay covered at rest, plus 3 mm (review round 5, S2).
import * as T from '../dist/tactics/vendor/three.module.js';
const V=(a=[0,0,0])=>new T.Vector3(...a);

// Everything against everything, written apart from the module's own fit (its own skinning, sampling, broad phase, rays
// and nearest points) to the same rules.
// Sinking. The points: each triangle's corners and the points i/m and j/m of the way along two of its edges (m its
// longest edge at rest over 4 mm, rounded up), carried between its skinned corners as the GPU draws them. A point shows
// at rest if it lies outside every other part, or less than 0.5 mm into one, and one that shows may go no more than 3 mm
// deeper into another part than it lay at rest, but where an edge of that part slid over it: within 6 mm of it at rest
// (on its own triangle, or one sharing a corner with it) its own part lay hidden under the same stretch of that part,
// and then it may go as deep as that hidden point lay (to 2 cm) and 3 mm more. Hidden: half a millimetre or more inside.
// The same stretch: the point of that part's surface nearest the point now, taken back to where it rests, lies within
// 1 cm of the point of the surface nearest the hidden point at rest (within 2 cm of it). Every part is a closed surface,
// so a point is inside a part where a ray from it (nearly along x, here) crosses the part an odd number of times, and as
// deep as it is far from the part's nearest triangle. Only the triangles that cross a triangle of another part, or have
// a corner inside it, are sampled against that part: a triangle that does neither lies wholly outside it.
// Crossings: a part may not pass through itself. Two of its triangles that share no corner cross where an edge of either
// passes through the other; a crossing is new unless the rest pose has it, or has one within two triangles of it on both
// sides (the same crossing slid along), or it goes 3 mm deep or less (a graze: a pixel at the study's close-up scale),
// its depth being the shallower of the two triangles' pokes through the other's plane. census(worker) reads the rest
// pose, so call it before any motion is made on the worker; it returns a function listing what the current pose adds.
export function census(worker,options={}){
 const {CELL=.04,COLUMN=.02,NEAR=.015,H=.004,SHOW=.0005,SINK=.003,DEEP=.02,SLIDE=.006,COVER=.01,focus=null}=options;
 worker.pose('neutral');worker.root.updateMatrixWorld(true);
 const parts=worker.parts.map(mesh=>{const g=mesh.geometry,n=g.attributes.position.count;return {mesh,n,ix:g.index?Array.from(g.index.array):Array.from({length:n},(_,i)=>i)};});
 const place=()=>{worker.root.updateMatrixWorld(true);return parts.map(({mesh,n})=>{const out=new Float64Array(3*n),v=V();for(let i=0;i<n;i++){v.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);v.applyMatrix4(mesh.matrixWorld);out[3*i]=v.x;out[3*i+1]=v.y;out[3*i+2]=v.z;}return out;});};
 const tris=[],corner=new Map(),atVertex=parts.map(({n})=>Array.from({length:n},()=>[]));
 parts.forEach(({mesh,ix},p)=>{const a=mesh.geometry.attributes.position,key=i=>p+':'+[a.getX(i),a.getY(i),a.getZ(i)].map(x=>Math.round(x*1e4)).join(',');
  for(let t=0;t<ix.length;t+=3){const v=[ix[t],ix[t+1],ix[t+2]],n=tris.length;tris.push({p,v,keys:v.map(key)});for(const i of v)atVertex[p][i].push(n);for(const k of tris[n].keys){if(!corner.has(k))corner.set(k,[]);corner.get(k).push(n);}}});
 const touch=n=>new Set(tris[n].keys.flatMap(k=>corner.get(k))),rings=new Map(),ring=n=>{let r=rings.get(n);if(!r){r=new Set();for(const m of touch(n))for(const x of touch(m))r.add(x);rings.set(n,r);}return r;};
 const sharing=(a,b)=>tris[a].keys.some(k=>tris[b].keys.includes(k));
 const at=(P,n)=>{const {p,v}=tris[n],q=P[p];return v.map(i=>[q[3*i],q[3*i+1],q[3*i+2]]);};
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 // does the segment a-b pass through triangle T (strictly between its ends)?
 const through=(a,b,T)=>{const d=sub(b,a),e1=sub(T[1],T[0]),e2=sub(T[2],T[0]),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-14)return false;const s=sub(a,T[0]),u=dot(s,h)/det;if(u<0||u>1)return false;const q=cross(s,e1),w=dot(d,q)/det;if(w<0||u+w>1)return false;const x=dot(e2,q)/det;return x>0&&x<1;};
 const crossing=(A,B)=>{for(const [u,v] of [[0,1],[1,2],[2,0]])if(through(A[u],A[v],B)||through(B[u],B[v],A))return true;return false;};
 const reach=(A,B)=>{const n=cross(sub(B[1],B[0]),sub(B[2],B[0])),l=Math.hypot(...n)||1;let hi=0,lo=0;for(const q of A){const d=dot(sub(q,B[0]),n)/l;hi=Math.max(hi,d);lo=Math.min(lo,d);}return Math.min(hi,-lo);};
 // Every pair of triangles whose bounds meet in a 4 cm cell: two of one part that share no corner, whether they cross
 // and how deep (self: 'a:b' to depth); two of two parts, whether they cross (meets: each triangle with the other's part,
 // as triangle * parts + part).
 const crossings=P=>{const N=tris.length,grid=new Map(),seen=new Set(),self=new Map(),meets=new Set(),box=tris.map((_,n)=>{const c=at(P,n);return {c,lo:[0,1,2].map(k=>Math.min(c[0][k],c[1][k],c[2][k])),hi:[0,1,2].map(k=>Math.max(c[0][k],c[1][k],c[2][k]))};});
  box.forEach(({lo,hi},n)=>{for(let x=Math.floor(lo[0]/CELL);x<=Math.floor(hi[0]/CELL);x++)for(let y=Math.floor(lo[1]/CELL);y<=Math.floor(hi[1]/CELL);y++)for(let z=Math.floor(lo[2]/CELL);z<=Math.floor(hi[2]/CELL);z++){const k=((x+512)*1024+y+512)*1024+z+512;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(n);}});
  for(const list of grid.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=Math.min(list[i],list[j]),b=Math.max(list[i],list[j]),key=a*N+b;if(seen.has(key))continue;seen.add(key);
   const A=box[a],B=box[b];if(A.lo.some((x,k)=>x>B.hi[k])||B.lo.some((x,k)=>x>A.hi[k]))continue;const pa=tris[a].p,pb=tris[b].p;
   if(!inFocus(a)&&!inFocus(b))continue;if(pa===pb){if(!sharing(a,b)&&crossing(A.c,B.c))self.set(a+':'+b,Math.min(reach(A.c,B.c),reach(B.c,A.c)));}else if(crossing(A.c,B.c)){meets.add(a*parts.length+pb);meets.add(b*parts.length+pa);}}
  return {self,meets};};
 const RAY=(()=>{const r=[1,.0013,.0007],l=Math.hypot(...r);return r.map(x=>x/l);})();
 const closest=(q,T)=>{const ab=sub(T[1],T[0]),ac=sub(T[2],T[0]),ap=sub(q,T[0]),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return dot(ap,ap);const bp=sub(q,T[1]),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return dot(bp,bp);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3),e=sub(ap,ab.map(x=>x*t));return dot(e,e);}const cp=sub(q,T[2]),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return dot(cp,cp);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6),e=sub(ap,ac.map(x=>x*t));return dot(e,e);}const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){const t=(d4-d3)/((d4-d3)+(d5-d6)),e=sub(bp,sub(T[2],T[1]).map(x=>x*t));return dot(e,e);}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den,e=sub(ap,ab.map((x,k)=>x*v+ac[k]*w));return dot(e,e);};
 // each part as a solid: its triangles, its bounds, columns along the ray (in y and z), and cells for nearness (made
 // when first asked)
 const solids=P=>parts.map(({ix},p)=>{const T=[],columns=new Map(),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let t=0;t<ix.length;t+=3){const c=[ix[t],ix[t+1],ix[t+2]].map(i=>[P[p][3*i],P[p][3*i+1],P[p][3*i+2]]),n=T.push(c)-1;for(const q of c)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]);hi[k]=Math.max(hi[k],q[k]);}
   for(let y=Math.floor((Math.min(c[0][1],c[1][1],c[2][1])-.005)/COLUMN);y<=Math.floor((Math.max(c[0][1],c[1][1],c[2][1])+.005)/COLUMN);y++)for(let z=Math.floor((Math.min(c[0][2],c[1][2],c[2][2])-.005)/COLUMN);z<=Math.floor((Math.max(c[0][2],c[1][2],c[2][2])+.005)/COLUMN);z++){const k=y+','+z;if(!columns.has(k))columns.set(k,[]);columns.get(k).push(n);}}
  return {T,columns,lo,hi,cells:null};});
 const within=(x,S)=>x.every((v,k)=>v>=S.lo[k]&&v<=S.hi[k]);
 const isIn=(q,S)=>{let hits=0;for(const n of S.columns.get(Math.floor(q[1]/COLUMN)+','+Math.floor(q[2]/COLUMN))||[]){const c=S.T[n],e1=sub(c[1],c[0]),e2=sub(c[2],c[0]),h=cross(RAY,e2),det=dot(e1,h);if(Math.abs(det)<1e-14)continue;const o=sub(q,c[0]),u=dot(o,h)/det;if(u<0||u>1)continue;const r=cross(o,e1),v=dot(RAY,r)/det;if(v<0||u+v>1)continue;if(dot(e2,r)/det>0)hits++;}return hits%2===1;};
 const cellsOf=S=>{if(!S.cells){S.cells=new Map();S.T.forEach((c,n)=>{const lo=[0,1,2].map(k=>Math.floor((Math.min(c[0][k],c[1][k],c[2][k])-.0035)/NEAR)),hi=[0,1,2].map(k=>Math.floor((Math.max(c[0][k],c[1][k],c[2][k])+.0035)/NEAR));
   for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const k=x+','+y+','+z;if(!S.cells.has(k))S.cells.set(k,[]);S.cells.get(k).push(n);}});}return S.cells;};
 const isNear=(q,S,r)=>{for(const n of cellsOf(S).get(q.map(x=>Math.floor(x/NEAR)).join(','))||[])if(closest(q,S.T[n])<r*r)return true;return false;};
 // the nearest point of S's surface to q within r, as its triangle and where on it (three's own closest point), or null
 const tri3=new T.Triangle(),p3=V(),c3=V(),b3=V();
 const nearest=(q,S,r)=>{const C=cellsOf(S),seen=new Set();let best=-1,d2=r*r;
  for(let x=Math.floor((q[0]-r)/NEAR);x<=Math.floor((q[0]+r)/NEAR);x++)for(let y=Math.floor((q[1]-r)/NEAR);y<=Math.floor((q[1]+r)/NEAR);y++)for(let z=Math.floor((q[2]-r)/NEAR);z<=Math.floor((q[2]+r)/NEAR);z++)
   for(const n of C.get(x+','+y+','+z)||[]){if(seen.has(n))continue;seen.add(n);const g=closest(q,S.T[n]);if(g<=d2){d2=g;best=n;}}
  if(best<0)return null;const c=S.T[best];tri3.set(V(c[0]),V(c[1]),V(c[2]));tri3.closestPointToPoint(p3.set(...q),c3);tri3.getBarycoord(c3,b3);return {d:Math.sqrt(d2),n:best,b:[b3.x,b3.y,b3.z]};};
 const restP=place(),S0=solids(restP),restOn=(q,c)=>{const R=S0[q].T[c.n];return [0,1,2].map(k=>c.b[0]*R[0][k]+c.b[1]*R[1][k]+c.b[2]*R[2][k]);};
 // A triangle's points at rest: those that show (where they lie: weights of its first two corners, the place, and the
 // parts they lie in under 0.5 mm, with how deep), and those hidden in each part (the place, how deep, and the point of
 // that part's surface nearest; or none nearer than 2 cm). Made when first needed.
 const restCache=new Map();
 const restOf=n=>{let r=restCache.get(n);if(r)return r;const C=at(restP,n),p=tris[n].p,m=Math.max(1,Math.ceil(Math.max(...[0,1,2].map(k=>dist(C[k],C[(k+1)%3])))/H)),shows=[],hidden=new Map();
  for(let i=0;i<=m;i++)for(let j=0;i+j<=m;j++){const b0=i/m,b1=j/m,x0=[0,1,2].map(k=>b0*C[0][k]+b1*C[1][k]+(1-b0-b1)*C[2][k]),lies=new Map();let hid=false;
   for(let q=0;q<parts.length;q++){if(q===p||!within(x0,S0[q])||!isIn(x0,S0[q]))continue;const c=nearest(x0,S0[q],DEEP);
    if(c&&c.d<SHOW)lies.set(q,c.d);else{hid=true;if(!hidden.has(q))hidden.set(q,[]);hidden.get(q).push({x0,d:c?c.d:DEEP,y:c?restOn(q,c):null});}}
   if(!hid)shows.push({b0,b1,x0,lies});}
  restCache.set(n,r={shows,hidden});return r;};
 // how deep the point's own part (its triangle n, or one sharing a corner with it) lay under part q within 6 mm of its
 // rest place x0, under the stretch of q that now rests at y (0 where it did not)
 const covered=(n,q,x0,y)=>{let d=0;for(const m of touch(n)){if(tris[m].p!==tris[n].p)continue;for(const h of restOf(m).hidden.get(q)||[])if(h.d>d&&h.y&&dist(h.x0,x0)<=SLIDE&&dist(h.y,y)<=COVER)d=h.d;}return d;};
 // the triangles a focused census looks at (its rest centre inside the focus), or all
 const inFocus=focus?(()=>{const keep=tris.map((_,n)=>focus(at(restP,n).reduce((s,x)=>s.map((v,i)=>v+x[i]/3),[0,0,0])));return n=>keep[n];})():()=>true;
 const rest=crossings(restP).self,restBy=new Map();
 for(const k of rest.keys()){const [a,b]=k.split(':').map(Number);for(const [x,y] of [[a,b],[b,a]]){if(!restBy.has(x))restBy.set(x,[]);restBy.get(x).push(y);}}
 const fresh=(k,d)=>{if(d<=SINK||rest.has(k))return false;const [a,b]=k.split(':').map(Number),nb=ring(b);for(const x of ring(a))for(const y of restBy.get(x)||[])if(nb.has(y))return false;return true;};
 const name=n=>parts[tris[n].p].mesh.name;
 const now=()=>{const P=place(),S=solids(P),{self,meets}=crossings(P),pairs=[],sunk=[],found=[];
  for(const [k,d] of self)if(fresh(k,d)){const [a,b]=k.split(':').map(Number),c=[...at(P,a),...at(P,b)].reduce((s,x)=>s.map((v,i)=>v+x[i]/6),[0,0,0]);pairs.push(`${name(a)} through itself: ${(d*1000).toFixed(1)} mm at [${c.map(v=>v.toFixed(3))}] (triangles ${a}, ${b})`);found.push({kind:'self',part:name(a),into:name(a),depth:d,at:c,rest:[...at(restP,a),...at(restP,b)].reduce((s,x)=>s.map((v,i)=>v+x[i]/6),[0,0,0]),triangles:[a,b]});}
  // the triangles to sample, each against the parts it crosses or has a corner inside
  const against=new Map(),add=(n,q)=>{let s=against.get(n);if(!s)against.set(n,s=new Set());s.add(q);};
  for(const k of meets)add(Math.floor(k/parts.length),k%parts.length);
  parts.forEach(({n},p)=>{for(let i=0;i<n;i++){const x=[P[p][3*i],P[p][3*i+1],P[p][3*i+2]];for(let q=0;q<parts.length;q++)if(q!==p&&within(x,S[q])&&isIn(x,S[q]))for(const t of atVertex[p][i])add(t,q);}});
  for(const [n,qs] of against){if(!inFocus(n))continue;const {shows}=restOf(n),C=at(P,n);
   for(const {b0,b1,x0,lies} of shows){const x=[0,1,2].map(k=>b0*C[0][k]+b1*C[1][k]+(1-b0-b1)*C[2][k]);
    for(const q of qs){if(!within(x,S[q])||!isIn(x,S[q]))continue;const r=lies.get(q)||0;if(isNear(x,S[q],r+SINK))continue;
     const c=nearest(x,S[q],DEEP+SINK);if(c&&c.d<=Math.max(r,covered(n,q,x0,restOn(q,c)))+SINK)continue;
     sunk.push(`${name(n)} into ${parts[q].mesh.name}: ${c?(c.d*1000).toFixed(1):'over '+(DEEP+SINK)*1000} mm at [${x.map(v=>v.toFixed(3))}]`);found.push({kind:'sink',part:name(n),into:parts[q].mesh.name,depth:c?c.d:Infinity,at:x,rest:x0,triangle:n});}}}
  return {pairs,sunk,found};};
 now.rest={pairs:rest.size};return now;
}

// What a list of findings says, the first few of each kind.
export const brief=l=>{const by=new Map();for(const x of l){const k=x.split(': ')[0];by.set(k,[...(by.get(k)||[]),x]);}return [...by.values()].map(v=>v.slice(0,3).join('; ')+(v.length>3?` (and ${v.length-3} more)`:'')).join(' | ');};
