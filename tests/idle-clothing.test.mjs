import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle} from '../dist/tactics/idle-motion.js';
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url))),V=(a=[0,0,0])=>new T.Vector3(...a),DEG=180/Math.PI;
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed);

// Everything against everything, written apart from the module's own fit (its own skinning, broad phase and rays) to
// the same rules. Sinking: a vertex of any part that shows in the rest pose (outside every other part, or less than
// 0.5 mm into one) may go no more than 3 mm into another part. Every part is a closed surface, so a point is inside a
// part where a ray from it (nearly along x, here) crosses the part an odd number of times, and more than r deep where,
// inside, no triangle of the part is within r of it. Crossings: a part may not pass through itself. Two of its
// triangles that share no corner cross where an edge of either passes through the other; a crossing is new unless the
// rest pose has it, or has one within two triangles of it on both sides (the same crossing slid along), or it goes 3 mm
// deep or less (a graze: a pixel at the study's close-up scale), its depth being the shallower of the two triangles'
// pokes through the other's plane. census(worker) reads the rest pose, so call it before the idle is made; it returns
// a function listing what the current pose adds.
const CELL=.04,COLUMN=.02,NEAR=.015;
function census(worker){
 worker.pose('neutral');worker.root.updateMatrixWorld(true);
 const parts=worker.parts.map(mesh=>{const g=mesh.geometry,n=g.attributes.position.count;return {mesh,n,ix:g.index?Array.from(g.index.array):Array.from({length:n},(_,i)=>i)};});
 const place=()=>{worker.root.updateMatrixWorld(true);return parts.map(({mesh,n})=>{const out=new Float64Array(3*n),v=V();for(let i=0;i<n;i++){v.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);v.applyMatrix4(mesh.matrixWorld);out[3*i]=v.x;out[3*i+1]=v.y;out[3*i+2]=v.z;}return out;});};
 const tris=[],corner=new Map();
 parts.forEach(({mesh,ix},p)=>{const a=mesh.geometry.attributes.position,key=i=>p+':'+[a.getX(i),a.getY(i),a.getZ(i)].map(x=>Math.round(x*1e4)).join(',');
  for(let t=0;t<ix.length;t+=3){const v=[ix[t],ix[t+1],ix[t+2]],n=tris.length;tris.push({p,v,keys:v.map(key)});for(const k of tris[n].keys){if(!corner.has(k))corner.set(k,[]);corner.get(k).push(n);}}});
 const touch=n=>new Set(tris[n].keys.flatMap(k=>corner.get(k))),rings=new Map(),ring=n=>{let r=rings.get(n);if(!r){r=new Set();for(const m of touch(n))for(const x of touch(m))r.add(x);rings.set(n,r);}return r;};
 const sharing=(a,b)=>tris[a].keys.some(k=>tris[b].keys.includes(k));
 const at=(P,n)=>{const {p,v}=tris[n],q=P[p];return v.map(i=>[q[3*i],q[3*i+1],q[3*i+2]]);};
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 // does the segment a-b pass through triangle T (strictly between its ends)?
 const through=(a,b,T)=>{const d=sub(b,a),e1=sub(T[1],T[0]),e2=sub(T[2],T[0]),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-14)return false;const s=sub(a,T[0]),u=dot(s,h)/det;if(u<0||u>1)return false;const q=cross(s,e1),w=dot(d,q)/det;if(w<0||u+w>1)return false;const x=dot(e2,q)/det;return x>0&&x<1;};
 const reach=(A,B)=>{const n=cross(sub(B[1],B[0]),sub(B[2],B[0])),l=Math.hypot(...n)||1;let hi=0,lo=0;for(const q of A){const d=dot(sub(q,B[0]),n)/l;hi=Math.max(hi,d);lo=Math.min(lo,d);}return Math.min(hi,-lo);};
 // each part's crossings of itself
 const crossings=P=>{const grid=new Map(),box=tris.map((_,n)=>{const c=at(P,n),lo=[0,1,2].map(k=>Math.min(c[0][k],c[1][k],c[2][k])),hi=[0,1,2].map(k=>Math.max(c[0][k],c[1][k],c[2][k]));return {c,lo,hi};}),out=new Map();
  box.forEach(({lo,hi},n)=>{for(let x=Math.floor(lo[0]/CELL);x<=Math.floor(hi[0]/CELL);x++)for(let y=Math.floor(lo[1]/CELL);y<=Math.floor(hi[1]/CELL);y++)for(let z=Math.floor(lo[2]/CELL);z<=Math.floor(hi[2]/CELL);z++){const k=tris[n].p+':'+x+','+y+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(n);}});
  for(const list of grid.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=Math.min(list[i],list[j]),b=Math.max(list[i],list[j]),key=a+':'+b;if(out.has(key))continue;
   const A=box[a],B=box[b];if(A.lo.some((x,k)=>x>B.hi[k])||B.lo.some((x,k)=>x>A.hi[k])||sharing(a,b)){out.set(key,-1);continue;}
   let hit=false;for(const [u,v] of [[0,1],[1,2],[2,0]])if(through(A.c[u],A.c[v],B.c)||through(B.c[u],B.c[v],A.c)){hit=true;break;}
   out.set(key,hit?Math.min(reach(A.c,B.c),reach(B.c,A.c)):-1);}
  for(const [k,d] of out)if(d<0)out.delete(k);return out;};
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
 const isNear=(q,S,r)=>{if(!S.cells){S.cells=new Map();S.T.forEach((c,n)=>{const lo=[0,1,2].map(k=>Math.floor((Math.min(c[0][k],c[1][k],c[2][k])-.0035)/NEAR)),hi=[0,1,2].map(k=>Math.floor((Math.max(c[0][k],c[1][k],c[2][k])+.0035)/NEAR));
   for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const k=x+','+y+','+z;if(!S.cells.has(k))S.cells.set(k,[]);S.cells.get(k).push(n);}});}
  for(const n of S.cells.get(q.map(x=>Math.floor(x/NEAR)).join(','))||[])if(closest(q,S.T[n])<r*r)return true;return false;};
 // the vertices (of those shown, or all) lying more than r inside another part, with the part each lies in
 const under=(P,r,shown)=>{const S=solids(P),out=[];
  parts.forEach(({n},p)=>{for(let i=0;i<n;i++){if(shown&&!shown[p][i])continue;const x=[P[p][3*i],P[p][3*i+1],P[p][3*i+2]];
   for(let q=0;q<parts.length;q++)if(q!==p&&within(x,S[q])&&isIn(x,S[q])&&!isNear(x,S[q],r)){out.push({p,i,q,x,S:S[q]});break;}}});return out;};
 const restP=place(),rest=crossings(restP),restBy=new Map(),shown=parts.map(({n})=>new Uint8Array(n).fill(1)),hidden=under(restP,.0005);for(const {p,i} of hidden)shown[p][i]=0;
 for(const k of rest.keys()){const [a,b]=k.split(':').map(Number);for(const [x,y] of [[a,b],[b,a]]){if(!restBy.has(x))restBy.set(x,[]);restBy.get(x).push(y);}}
 const fresh=(k,d)=>{if(d<=.003||rest.has(k))return false;const [a,b]=k.split(':').map(Number),nb=ring(b);for(const x of ring(a))for(const y of restBy.get(x)||[])if(nb.has(y))return false;return true;};
 const name=n=>parts[tris[n].p].mesh.name;
 const now=()=>{const P=place(),pairs=[];for(const [k,d] of crossings(P))if(fresh(k,d)){const [a,b]=k.split(':').map(Number);pairs.push(name(a)+' through itself '+(d*1000).toFixed(1)+' mm');}
  const sunk=under(P,.003,shown).map(({p,i,q,x,S})=>parts[p].mesh.name+' vertex '+i+' '+(Math.sqrt(Math.min(...S.T.map(c=>closest(x,c))))*1000).toFixed(1)+' mm into '+parts[q].mesh.name);
  return {pairs,sunk};};
 now.rest={pairs:rest.size,hidden:hidden.length};return now;
}

// A mammal's idle on its own seed, with the census taken first.
function withIdle(profile,seed,fn){const worker=profile.create(load(profile.file)),count=census(worker),motion=createIdle(worker,{seed,eye:profile.eye});
 try{fn({worker,motion,count});}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}}
const yawOf=q=>{const f=V([1,0,0]).applyQuaternion(q);return Math.atan2(-f.z,f.x)*DEG;},pitchOf=q=>Math.asin(Math.max(-1,Math.min(1,V([1,0,0]).applyQuaternion(q).y)))*DEG;

test('nothing on a worker sinks into another part or passes through itself anew: every mammal on its own seed, every 2 s and at its widest look, deepest nod, highest look, its chest\'s three widest turns on the hips, its fullest lean each way and its chest\'s deepest rounding',()=>{
 MAMMALS.forEach((profile,n)=>withIdle(profile,3+n,({worker,motion,count})=>{
  const bone=name=>worker.bones.find(b=>b.name===name),wq=name=>bone(name).getWorldQuaternion(new T.Quaternion()),series=[];
  for(let t=0;t<motion.length;t+=.1){const st=motion.at(t),onChest=wq('spine').invert().multiply(wq('head')),turn=bone('spine').quaternion;
   series.push({t,yaw:Math.abs(yawOf(onChest)),pitch:pitchOf(onChest),twist:2*Math.acos(Math.min(1,Math.abs(turn.w))),weight:st.weight,flex:-new T.Euler().setFromQuaternion(turn,'YXZ').z});}
  const top=(key,sign=1,k=1)=>{const picked=[];for(const x of [...series].sort((a,b)=>sign*(b[key]-a[key])))if(picked.length<k&&picked.every(t=>Math.abs(t-x.t)>2))picked.push(x.t);return picked;};
  const times=[...top('yaw'),...top('pitch',-1),...top('pitch'),...top('twist',1,3),...top('weight'),...top('weight',-1),...top('flex')];for(let t=0;t<motion.length;t+=2)times.push(t);
  for(const t of times){motion.at(t);const {pairs,sunk}=count();assert.deepEqual([...pairs,...sunk],[],`${profile.id} seed ${3+n} at ${t.toFixed(1)} s`);}
 }));
});

test('posed at each fitted limit, and 5 degrees past it where the fit last cleared, nothing on each mammal sinks into another part or passes through itself anew',()=>{
 for(const profile of MAMMALS)withIdle(profile,1,({motion,count})=>{const {yaw,nod,up,tilt}=motion.fitted,L=yaw[1],R=yaw[-1],rolls=tilt?[0,tilt,-tilt]:[0],poses=[];
  // the turn each way at each tilt the fit tried, the tilt alone, and nodding and looking up (straight, turned as far as
  // 24 degrees, or tilted), each at its limit and 5 degrees past it (where the fit last cleared; a limit of 0 has no past)
  for(const roll of rolls)for(const [lim,s] of [[L,1],[R,-1]])if(lim)poses.push([s*lim,0,roll],[s*(lim+5),0,roll]);
  if(tilt)for(const s of [1,-1])poses.push([0,0,s*tilt],[0,0,s*(tilt+5)]);
  for(const [y,roll] of [[0,0],[Math.min(24,L),0],[-Math.min(24,R),0],...rolls.slice(1).map(x=>[0,x])]){if(nod)poses.push([y,nod,roll],[y,nod+5,roll]);if(up)poses.push([y,-up,roll],[y,-(up+5),roll]);}
  for(const [y,n,roll] of poses){motion.poseHead(y,n,roll);const {pairs,sunk}=count();assert.deepEqual([...pairs,...sunk],[],`${profile.id}: the head turned ${y}, nodding ${n} and tilted ${roll} degrees`);}
 });
});
