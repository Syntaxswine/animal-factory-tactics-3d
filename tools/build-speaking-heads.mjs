// node tools/build-speaking-heads.mjs [--only=<id>,<id>]
// (SPEAKING_DEBUG=1 logs the reductions; SPEAKING_DUMP=<dir> writes their meshes there;
// SPEAKING_OUT=<dir> writes the heads there instead of dist)
// Builds each character's speaking head from its approved head sculpt (tools/speaking-heads):
// the sculpt is opened for speech (sculpt.mjs, mouths.mjs), placed where the character's tool
// placed its skull (place.mjs), then reduced twice, as the characters were: to an authoring
// mesh, and from that to the game mesh. Writes dist/tactics/speaking-heads/<id>-author.json and
// <id>-10k.json.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {speakingSourceHash} from './speaking-heads/source-hash.mjs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {HEADS,PAINT,donkeyNeck} from './speaking-heads/heads.mjs';
import {mouthPlan} from './speaking-heads/plan.mjs';
import {MOUTHS} from './speaking-heads/mouths.mjs';
import {placement,measurePlacement} from './speaking-heads/place.mjs';
import {sculptSpeaking,toothMesh,tongueMesh} from './speaking-heads/sculpt.mjs';
import {closedVisibility} from './speaking-heads/view.mjs';
const simplify=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await simplify.ready;
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const out=process.env.SPEAKING_OUT?new URL('file:///'+process.env.SPEAKING_OUT.split('\\').join('/')+'/'):new URL('../dist/tactics/speaking-heads/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const sourceHash=speakingSourceHash();

// The speaking skin spends what the skull it replaces spent on the approved surface, and a
// quarter more on the mouth inside it (the lips' faces, the cavity), at a tolerance of its own.
// Teeth and tongue are small closed lathes with budgets of their own (sides x rings).
const MOUTH_SHARE=.25,MOUTH_TOLERANCE={author:.0015,low:.004};
// (the game mesh's teeth and tongue are seen at portrait size at most: 30 and 72 triangles)
const TOOTH={author:[10,6],low:[5,2]},TONGUE={author:[12,14],low:[6,6]};
// The attribute weights keep the jaw's weight, the mouth's paint and the lips' two sides from
// being simplified away: a full change of one counts as this much distance (less in the game mesh,
// whose mouth is seen at portrait size at most). The skin is simplified where it was sculpted (the
// open, expanded space), and its shape closed (`rest`) and with the jaw open 12 degrees (`posed`)
// count too, as attributes: a reduction good for one pose and folded in another is refused.
const ATTRIBUTE_WEIGHT={author:{jaw:.02,inside:.03,lower:.03,fold:.02,rest:1,posed:1},low:{jaw:.02,inside:.01,lower:.01,fold:.02,rest:1,posed:1}};
const POSED=12*Math.PI/180;
// Closed, no tooth or tongue shows: the tests' bar is 0.5 mm² from 120 directions framed on the crease
// (measure.mjs closedVisibility). Where a reduction leaves one showing through a coarse lip, the
// level is reduced again with its source's vertices kept round every tooth and tongue triangle seen,
// within a reach that grows each time (round 4: with the lining gone the game meshes' lips over the
// incisors came out coarser on four heads, 0.9 to 8.4 mm² of incisor showing closed). Checked at
// 5 px/mm, to half the bar.
const SHOWN_CLOSED={ppu:5000,bar:.25,reach:[.004,.007,.01]};
// A beak's game mesh keeps its authoring vertices within BEAK_ROOT of the line through the hinge
// across the beak: reduced freely there, a lower mandible's triangles stood up through the upper's
// base as a fin a centimetre tall, and 9.2 mm² of her tongue showed through her closed beak (round
// 4's review; round 3's beak, its reduction locked round inside-out triangles, had neither).
const BEAK_ROOT=.01;

function cleanFaces(indices){const faces=new Map();for(let i=0;i<indices.length;i+=3){const key=Array.from(indices.subarray(i,i+3)).sort((a,b)=>a-b).join(':');if(!faces.has(key))faces.set(key,[]);faces.get(key).push(i);}
 const clean=[];for(const starts of faces.values())if(starts.length===1)clean.push(...indices.subarray(starts[0],starts[0]+3));return new Uint32Array(clean);}
// Edges not shared by exactly two triangles (a closed surface has none), as vertex pairs.
function badEdges(index){const edges=new Map();for(let t=0;t<index.length;t+=3)for(let k=0;k<3;k++){const a=index[t+k],b=index[t+(k+1)%3],key=a<b?a*4294967296+b:b*4294967296+a;edges.set(key,(edges.get(key)||0)+1);}
 const bad=[];for(const [key,v] of edges)if(v!==2)bad.push([Math.floor(key/4294967296),key%4294967296]);return bad;}
// Vertices a hair apart in every pose (where the sculpt's grid cut a sharp corner into slivers:
// the window's corners) become one, where that keeps the surface closed. A merge is undone if it
// would pinch: every cluster at an edge the merge left open or pinched is split again, until
// none is (each round one pass over the mesh).
function mergeTiny(mesh,eps=.0003){
 const n=mesh.position.length/3,poses=['position','rest','posed','posed24'].map(k=>mesh[k]),parent=new Int32Array(n);for(let i=0;i<n;i++)parent[i]=i;
 const find=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 const near=(a,b)=>poses.every(P=>(P[a*3]-P[b*3])**2+(P[a*3+1]-P[b*3+1])**2+(P[a*3+2]-P[b*3+2])**2<eps*eps);
 const I=mesh.index;for(let t=0;t<I.length;t+=3)for(let k=0;k<3;k++){const a=I[t+k],b=I[t+(k+1)%3];if(near(a,b)){const ra=find(a),rb=find(b);if(ra!==rb)parent[rb]=ra;}}
 const map=new Uint32Array(n);for(let i=0;i<n;i++)map[i]=find(i);
 let index=cleanFaces(dropDegenerate(I.map(i=>map[i])));
 const members=new Map();for(let i=0;i<n;i++)if(map[i]!==i){if(!members.has(map[i]))members.set(map[i],[]);members.get(map[i]).push(i);}
 for(let bad=badEdges(index);bad.length;bad=badEdges(index)){
  let undone=0;for(const edge of bad)for(const v of edge){const m=members.get(v);if(!m)continue;for(const i of m)map[i]=i;members.delete(v);undone++;}
  if(!undone)break;// open where nothing was merged: not the merge's doing
  index=cleanFaces(dropDegenerate(I.map(i=>map[i])));}
 return {...mesh,index};
}
function dropDegenerate(index){const o=[];for(let t=0;t<index.length;t+=3){const a=index[t],b=index[t+1],c=index[t+2];if(a!==b&&b!==c&&a!==c)o.push(a,b,c);}return new Uint32Array(o);}
// Vertices the sculpt left a hair apart become one, so the simplifier sees the surface as connected.
function weld(mesh,eps=1e-6){
 const n=mesh.position.length/3,P=mesh.position,keyOf=i=>Math.round(P[i*3]/eps)+','+Math.round(P[i*3+1]/eps)+','+Math.round(P[i*3+2]/eps),first=new Map(),map=new Uint32Array(n);
 for(let i=0;i<n;i++){const k=keyOf(i);if(!first.has(k))first.set(k,i);map[i]=first.get(k);}
 const index=new Uint32Array(mesh.index.length);for(let i=0;i<index.length;i++)index[i]=map[mesh.index[i]];
 return {...mesh,index:cleanFaces(dropDegenerate(index))};
}
// The outer skin's triangles that cross another near the mouth (not sharing a vertex), closed and
// with the jaw open 6, 12 and 24 degrees: their vertices, a list per crossing pair, marked `crossed`.
// The outer skin: no vertex the mouth's or a lip's face. Posed as the head is written and the
// runtime turns it (rest to the micrometre, jaw weights to 1e-4, about the hinge), so a crossing
// the rounding makes is found here too.
const sub3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function segTri(p,q,a,b,c){const e1=sub3(b,a),e2=sub3(c,a),dir=sub3(q,p),pv=cross3(dir,e2),det=dot3(e1,pv);if(Math.abs(det)<1e-14)return false;const inv=1/det,tv=sub3(p,a),u=dot3(tv,pv)*inv;if(u<0||u>1)return false;const qv=cross3(tv,e1),v=dot3(dir,qv)*inv;if(v<0||u+v>1)return false;const t=dot3(e2,qv)*inv;return t>1e-7&&t<1-1e-7;}
const triTri=(A,B)=>{for(let k=0;k<3;k++)if(segTri(A[k],A[(k+1)%3],B[0],B[1],B[2])||segTri(B[k],B[(k+1)%3],A[0],A[1],A[2]))return true;return false;};
function crossings(mesh,index,{hinge,degrees=[0,6,12,24],reach=.12,cell=.005}={}){
 const outer=i=>mesh.fold[i]<.5&&Math.round(mesh.inside[i]*1000)/1000<.5,found=[],n=mesh.jaw.length;
 let c=[0,0],k=0;for(let i=0;i<mesh.fold.length;i++)if(mesh.fold[i]>.5){c[0]+=mesh.rest[i*3];c[1]+=mesh.rest[i*3+1];k++;}c=c.map(v=>v/Math.max(1,k));
 const R=mesh.rest.map(v=>Math.round(v*1e6)/1e6),W=mesh.jaw.map(v=>Math.round(v*1e4)/1e4),[hx,hy]=hinge.map(v=>Math.round(v*1e6)/1e6);
 const turned=deg=>{const a=-deg*Math.PI/180,co=Math.cos(a),si=Math.sin(a),P=new Float64Array(n*3);
  for(let i=0;i<n;i++){const x=R[i*3],y=R[i*3+1],w=W[i],dx=x-hx,dy=y-hy;P[i*3]=x+w*(hx+dx*co-dy*si-x);P[i*3+1]=y+w*(hy+dx*si+dy*co-y);P[i*3+2]=R[i*3+2];}return P;};
 for(const P of degrees.map(turned)){
  const T=[],grid=new Map(),at=i=>[P[i*3],P[i*3+1],P[i*3+2]];
  for(let t=0;t<index.length;t+=3){const ids=[index[t],index[t+1],index[t+2]];if(!ids.every(outer))continue;if(Math.hypot(P[ids[0]*3]-c[0],P[ids[0]*3+1]-c[1])>reach)continue;
   const v=ids.map(at),min=[0,1,2].map(a=>Math.min(v[0][a],v[1][a],v[2][a])),max=[0,1,2].map(a=>Math.max(v[0][a],v[1][a],v[2][a])),j=T.length;T.push({ids,v,min,max});
   for(let x=Math.floor(min[0]/cell);x<=Math.floor(max[0]/cell);x++)for(let y=Math.floor(min[1]/cell);y<=Math.floor(max[1]/cell);y++)for(let z=Math.floor(min[2]/cell);z<=Math.floor(max[2]/cell);z++){const key=x+','+y+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(j);}}
  const seen=new Set();
  for(const list of grid.values())for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++){const A=T[list[a]],B=T[list[b]],key=list[a]*1e6+list[b];if(seen.has(key))continue;seen.add(key);
   if(B.ids.some(v=>A.ids.includes(v)))continue;if([0,1,2].some(d=>B.min[d]>A.max[d]||B.max[d]<A.min[d]))continue;
   if(triTri(A.v,B.v))found.push([...A.ids,...B.ids]);}}
 found.crossed=true;return found;
}
// Reduce a mesh carried as {position (where it is simplified: the open, expanded space), index,
// per-vertex arrays...} in parts that meet along locked borders: the approved outer surface
// (triangles all of whose vertices have outer = 1) at the skull's own target and tolerance, and
// the mouth at its own. A collapse can pinch a thin wall (a cheek, a lip over the cavity) into
// edges shared by four triangles: where one does, the vertices around the pinch are locked and
// the reduction is done again. Every per-vertex array follows the kept vertices. `lockNear`: points
// (rest) round which the source's vertices within `nearReach` are kept too (see SHOWN_CLOSED).
function reduce(mesh,parts,attributes,weights,{lockBy=null,hinge,degrees,lockNear=[],nearReach=0}={}){
 // each attribute one value per vertex, or three (a position)
 const n=mesh.position.length/3,columns=attributes.flatMap(a=>mesh[a].length===n*3?[[a,0],[a,1],[a,2]]:[[a,null]]),attr=new Float32Array(n*columns.length);
 columns.forEach(([a,c],k)=>{const v=mesh[a];for(let i=0;i<n;i++)attr[i*columns.length+k]=c===null?v[i]:v[i*3+c];});
 const P=mesh.position;
 const outerTri=t=>mesh.outer[mesh.index[t*3]]>.5&&mesh.outer[mesh.index[t*3+1]]>.5&&mesh.outer[mesh.index[t*3+2]]>.5;
 const split=[[],[]];for(let t=0;t<mesh.index.length/3;t++)split[outerTri(t)?0:1].push(mesh.index[t*3],mesh.index[t*3+1],mesh.index[t*3+2]);
 const sources=split.map(s=>new Uint32Array(s)),lock=new Uint8Array(n);let locked=0,tries=0,indices,errors,crossed=0;
 if(lockBy)for(let i=0;i<n;i++)if(mesh[lockBy][i]>0){lock[i]=1;locked++;}
 for(let i=0;i<n&&lockNear.length;i++){if(lock[i])continue;const R=mesh.rest;for(const q of lockNear)if((R[i*3]-q[0])**2+(R[i*3+1]-q[1])**2+(R[i*3+2]-q[2])**2<nearReach*nearReach){lock[i]=1;locked++;break;}}
 const reduceOne=(k,target)=>{const source=sources[k],count=Math.min(Math.round(target)*3,source.length);
  const [ix,error]=simplify.simplifyWithAttributes(source.slice(),P,3,attr,columns.length,columns.map(([a])=>weights[a]),lock,count-count%3,parts[k].tolerance,['ErrorAbsolute','LockBorder','Sparse']);return {ix,error};};
 for(;;tries++){
  const done=[0,1].map(k=>reduceOne(k,parts[k].target));
  indices=cleanFaces(new Uint32Array([...done[0].ix,...done[1].ix]));errors=done.map(d=>d.error);
  if(process.env.SPEAKING_DEBUG)console.log('  reduce',sources.map((s,k)=>`${['outer','mouth'][k]} ${s.length/3} -> ${done[k].ix.length/3} (target ${Math.round(parts[k].target)}, error ${(done[k].error*1000).toFixed(2)} mm of ${(parts[k].tolerance*1000).toFixed(1)})`).join(', '));
  let bad=badEdges(indices);
  // (a reduction can also fold the outer skin through itself, closed or with the jaw open, where
  // the two lips' surfaces meet at the crease: the vertices of the crossing triangles are locked
  // the same way, if a few retries can; what the sculpt itself leaves is reported, not refused)
  if(!bad.length){bad=crossings(mesh,indices,{hinge,degrees});crossed=bad.length;if(tries>=3)break;}
  if(!bad.length)break;
  if(tries>=8){const left=badEdges(indices).length;if(left)throw Error(`reduce: still ${left} pinched edges after ${locked} locks`);break;}
  // lock the source's vertices within `tries + 2` rings of the pinch (and within the reach), so
  // the collapses that made it cannot happen (a crossing: its triangles' vertices and one ring)
  const isCrossing=bad.crossed,reach=.0025,at=[...new Set(bad.flat())].map(i=>[P[i*3],P[i*3+1],P[i*3+2]]);
  if(!isCrossing)for(let i=0;i<n;i++){if(lock[i])continue;const x=P[i*3],y=P[i*3+1],z=P[i*3+2];for(const q of at)if((x-q[0])**2+(y-q[1])**2+(z-q[2])**2<reach*reach){lock[i]=1;locked++;break;}}
  let ring=new Set(bad.flat());for(let r=0;r<(isCrossing?1:tries+2);r++){const next=new Set(ring);for(let t=0;t<mesh.index.length;t+=3){const tri=[mesh.index[t],mesh.index[t+1],mesh.index[t+2]];if(tri.some(v=>ring.has(v)))tri.forEach(v=>next.add(v));}ring=next;}
  for(const i of ring)if(!lock[i]){lock[i]=1;locked++;}
 }
 if(process.env.SPEAKING_DEBUG&&crossed)console.log(`  reduce: ${crossed} crossing pairs left after ${tries} retries`);
 const [remap,count]=simplify.compactMesh(indices),result={index:indices,errorWorld:Math.max(...errors),errors,sourceTriangles:mesh.index.length/3,tries,locked,crossings:crossed};
 // The remap covers the vertices up to the highest one still used, not all n.
 for(const [key,value] of Object.entries(mesh)){if(key==='index'||!ArrayBuffer.isView(value))continue;const k=value.length/n,array=new Float32Array(count*k);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)array.set(value.subarray(i*k,i*k+k),remap[i]*k);result[key]=array;}
 return result;
}
// The closed shape (a corrective shape: the runtime blends it in as the jaw closes, over its last
// 2 degrees). Closed, a lip's outer skin must reach the approved surface's section at the cut (C),
// where it meets the other lip's. Where the cut meets the surface at a shallow angle (a pig's snout
// at the window's ends, the cow's overhang) the lip's tip is a wedge thinner than the sculpt's
// grid, and the sculpt loses its last millimetres: the band between the outer skin and the lip's
// face is the lip's top edge, right way out when open, but folded inside-out when closed, and the
// renderer culls it, so the teeth showed through (round 2: up to 24 mm2). In the closed shape the
// rims (the folding vertices next to the outer skin) go onto C and then, round by round, the outer
// vertices of any triangle at the crease that is inside-out against the approved surface (at most
// CREASE_REACH from C: the cow's lower lip, under her overhang, needs 6 mm), so the band closes to
// nothing and the outer skin reaches C, every moved vertex staying on the approved surface. Moving
// them in the rest pose itself folded the open lips through themselves; as a closed shape they
// lie flat in the crease only while it is closed. Within `zone` of the middle (|z|): the whole
// lip line, since the lips part all along it. Writes into `closed` (positions, a copy of the
// rest's); returns counts.
const CREASE_REACH=.008;
function closeCrease(m,closed,G,head,place,zone){
 const surface=head.speaking??head.field,n=m.lower.length,R=closed,I=m.index,field=p=>surface(...place.unmap(p)),inZone=i=>Math.abs(place.unmap([R[i*3],R[i*3+1],R[i*3+2]])[2])<zone;
 const g=(u,w)=>surface(u,G.refY(u,w),w);
 const snap=p=>{const q=place.unmap(p);let u=[q[0],q[2]];for(let k=0;k<8;k++){const f=g(u[0],u[1]),e=1e-5,gx=(g(u[0]+e,u[1])-g(u[0]-e,u[1]))/(2*e),gz=(g(u[0],u[1]+e)-g(u[0],u[1]-e))/(2*e),l=gx*gx+gz*gz;if(l<.04)return null;u=[u[0]-f*gx/l,u[1]-f*gz/l];}
  if(Math.abs(g(u[0],u[1]))>1e-5||Math.hypot(u[0]-q[0],u[1]-q[2])>.01)return null;return place.map([u[0],G.refY(u[0],u[1]),u[1]]);};
 // a triangle's orientation against the approved field: >0 outward, <0 inside-out, 0 degenerate
 const facing=t=>{const P=[I[t],I[t+1],I[t+2]].map(i=>[R[i*3],R[i*3+1],R[i*3+2]]),e1=P[1].map((x,k)=>x-P[0][k]),e2=P[2].map((x,k)=>x-P[0][k]),nn=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];if(Math.hypot(...nn)<1e-12)return 0;
  const c=[0,1,2].map(k=>(P[0][k]+P[1][k]+P[2][k])/3),h=1e-4,gr=[0,1,2].map(k=>{const a=c.slice(),b=c.slice();a[k]+=h;b[k]-=h;return field(a)-field(b);});return Math.sign(nn[0]*gr[0]+nn[1]*gr[1]+nn[2]*gr[2]);};
 const on=new Uint8Array(n);let rims=0,inverted=0,moved=0,left=0,rounds=0;
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(!v.some(i=>m.outer[i]>.5))continue;
  for(const i of v)if(m.fold[i]>.5&&(m.lower[i]===0||m.lower[i]===1)&&!on[i]&&inZone(i)){const q=snap([R[i*3],R[i*3+1],R[i*3+2]]);if(q){R.set(q,i*3);on[i]=1;rims++;}else on[i]=2;}}
 // A lip's edge as reduced: the outer skin's boundary, its vertices in triangles that are not all
 // outer skin (next to a lip's face, or, where the reduction took a face away, straight into the
 // cavity), onto C too (round 3: along the sides, the game meshes' upper lips kept their edges
 // 0.2 to 1.9 mm above the crease, and the teeth showed between).
 let edges=0;
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(v.every(i=>m.outer[i]>.5))continue;
  for(const i of v)if(m.outer[i]>.5&&!on[i]&&inZone(i)){const p=[R[i*3],R[i*3+1],R[i*3+2]],q=snap(p);if(q&&Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])<=CREASE_REACH){R.set(q,i*3);on[i]=1;edges++;}}}
 for(;rounds<8;rounds++){const add=new Set();
  for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(!v.some(i=>on[i]===1)||!v.some(i=>m.outer[i]>.5&&!on[i]))continue;if(facing(t)<0){inverted++;for(const i of v)if(m.outer[i]>.5&&!on[i]&&inZone(i))add.add(i);}}
  if(!add.size)break;
  for(const i of add){const p=[R[i*3],R[i*3+1],R[i*3+2]],q=snap(p);if(q&&Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])<=CREASE_REACH){R.set(q,i*3);on[i]=1;moved++;}else{on[i]=2;left++;}}}
 // The two lips onto one line. Each lip's crease is the chords between its own vertices on C, and
 // where C curves the two lips' chords part in thin lenses: a ray along the closed crease passed
 // through them to the teeth (round 3: with the crease along the whole lip line, up to 20 mm² at
 // eye level on the game meshes, whose rims are coarse). Each lip's vertices on C go onto the
 // other lip's chords (the nearest point within 1 mm), lip by lip, a few rounds: both lips' creases
 // become one line.
 const sides=[0,1].map(s=>{const segs=[];for(let t=0;t<I.length;t+=3)for(let k=0;k<3;k++){const a=I[t+k],b=I[t+(k+1)%3];if(a<b&&on[a]===1&&on[b]===1&&(m.lower[a]>=.5)===!!s&&(m.lower[b]>=.5)===!!s)segs.push([a,b]);}return segs;});
 const nearest=(p,segs)=>{let best=null,d=Infinity;for(const [a,b] of segs){const A=[R[a*3],R[a*3+1],R[a*3+2]],B=[R[b*3],R[b*3+1],R[b*3+2]],e=B.map((x,k)=>x-A[k]),l=e[0]*e[0]+e[1]*e[1]+e[2]*e[2];if(l<1e-14)continue;
  const t=Math.max(0,Math.min(1,((p[0]-A[0])*e[0]+(p[1]-A[1])*e[1]+(p[2]-A[2])*e[2])/l)),q=A.map((x,k)=>x+e[k]*t),dd=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);if(dd<d){d=dd;best=q;}}return d<=.001?best:null;};
 let zipped=0;
 for(let round=0;round<4;round++)for(const s of [0,1])for(let i=0;i<n;i++){if(on[i]!==1||(m.lower[i]>=.5)!==!!s)continue;const p=[R[i*3],R[i*3+1],R[i*3+2]],q=nearest(p,sides[1-s]);if(q&&Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])>1e-7){R.set(q,i*3);zipped++;}}
 return {rims,edges,inverted,moved,left,rounds,zipped};
}
// The mouth's normals from a mesh's own triangles with the jaw open OPEN_NORMALS (each vertex turned
// by its weight about the hinge, as the runtime turns it), turned back to rest by the same weight;
// the outer skin keeps `normal` (the approved surface's). For the folding faces, which lie flat
// closed, the open shape is the one their shading is seen in; each mouth vertex averages the
// mouth's triangles only.
const OPEN_NORMALS=6*Math.PI/180;
const turnAbout=(v,a,[x0,y0])=>[x0+(v[0]-x0)*Math.cos(a)-(v[1]-y0)*Math.sin(a),y0+(v[0]-x0)*Math.sin(a)+(v[1]-y0)*Math.cos(a),v[2]];
function openFacings(position,m,hinge,keep){
 const n=position.length/3,P=new Float64Array(n*3),acc=new Float64Array(n*3),I=m.index;
 for(let i=0;i<n;i++)P.set(turnAbout([position[i*3],position[i*3+1],position[i*3+2]],-OPEN_NORMALS*m.jaw[i],hinge),i*3);
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(!keep(v))continue;const p=v.map(i=>[P[i*3],P[i*3+1],P[i*3+2]]),e1=p[1].map((x,k)=>x-p[0][k]),e2=p[2].map((x,k)=>x-p[0][k]),f=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
  for(const i of v)for(let k=0;k<3;k++)acc[i*3+k]+=f[k];}
 // vertex i's facing, turned back to rest by its weight (null where it has none)
 return i=>{const v=[acc[i*3],acc[i*3+1],acc[i*3+2]],l=Math.hypot(...v);return l<1e-14?null:turnAbout(v.map(x=>x/l),OPEN_NORMALS*m.jaw[i],[0,0]);};
}
function openNormals(position,m,normal,hinge){
 const mouth=i=>m.fold[i]>.5||m.inside[i]>=.5,at=openFacings(position,m,hinge,v=>v.every(mouth)),out=normal.slice();
 for(let i=0;i<position.length/3;i++){if(!mouth(i))continue;const r=at(i);if(r)out.set(r,i*3);}
 return out;
}
// The outer skin's normals about the mouth are the approved surface's: the approved field's gradient
// at the vertex's rest position in sculpt space, carried to where it is written (the placement, and
// the donkey's neck revision) as a normal is carried, by the inverse transpose of the map's Jacobian.
// The sculpt's own there are the expanded field's at the lips' sharp edges, and a mesh's normals (the
// cow's, the director's, the donkey's after its revision) fold into the crease: within 15 mm of it 10
// to 105 outer vertices a mesh were over 45 degrees off the approved surface, and shaded the closed
// crease and the open lips' edges as whiskers, glints and the donkey's white fangs at its corners
// (round 4's review). Within `near` of the lips' faces at rest, blending back to the sculpt's own by
// `far` (beyond, the sculpt's own are the approved surface's but on the cow, the director and the
// donkey, whose tools' mesh normals they keep).
const MOUTH_NORMALS={near:.02,far:.035};
function outerNormals(m,normal,field,toWritten){
 const R=m.rest,n=R.length/3,out=normal.slice(),{near,far}=MOUTH_NORMALS,cell=far,grid=new Map();
 for(let i=0;i<n;i++)if(m.fold[i]>.5){const k=[0,1,2].map(j=>Math.floor(R[i*3+j]/cell)).join();if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}
 const toLips=p=>{let d=Infinity;const c=p.map(v=>Math.floor(v/cell));for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let e=-1;e<=1;e++){const l=grid.get([c[0]+a,c[1]+b,c[2]+e].join());if(l)for(const i of l)d=Math.min(d,Math.hypot(R[i*3]-p[0],R[i*3+1]-p[1],R[i*3+2]-p[2]));}return d;};
 for(let i=0;i<n;i++){if(m.fold[i]>.5||m.inside[i]>=.5)continue;const p=[R[i*3],R[i*3+1],R[i*3+2]],w=1-THREE.MathUtils.smoothstep(toLips(p),near,far);if(w<=0)continue;
  const at=written(field,toWritten,p);if(!at)continue;
  const v=[0,1,2].map(k=>normal[i*3+k]*(1-w)+at[k]*w),l=Math.hypot(...v);if(l>1e-9)out.set(v.map(x=>x/l),i*3);}
 return out;
}
// Closed, the lips' faces at the crease are the approved surface: where the closed shape lays them
// at the surface (within CLOSED_NORMALS.none of it), they take its normal as the jaw closes, as a
// morph of the normals with the closed shape (`closedNormal`, offsets from the written normals, as
// `closed` is from the rest pose). Open they keep their open facings (openNormals): closed, those
// glinted white along the cow's crease where a face's triangle reaches the surface (round 4's review).
const CLOSED_NORMALS={full:.001,none:.003};
function closedNormals(m,normal,field,toWritten){
 const C=m.closed,vertices=[],offset=[];
 for(let i=0;i<C.length/3;i++){if(m.fold[i]<=.5)continue;const w=1-THREE.MathUtils.smoothstep(m.depth[i],CLOSED_NORMALS.full,CLOSED_NORMALS.none);if(w<=0)continue;
  const at=written(field,toWritten,[C[i*3],C[i*3+1],C[i*3+2]]);if(!at)continue;
  const base=[0,1,2].map(k=>+normal[i*3+k].toFixed(5)),v=base.map((x,k)=>x*(1-w)+at[k]*w),l=Math.hypot(...v);if(l<1e-9)continue;
  vertices.push(i);offset.push(...v.map((x,k)=>+(x/l-base[k]).toFixed(5)));}
 return {vertices,offset};
}
// The approved surface's normal where it is written: `toWritten` maps a placed rest position to the
// sculpt space (`at`) and a sculpt-space point to where it is written (`map`).
function written(field,toWritten,p){
 const x=toWritten.at(p),e=1e-4,g=[0,1,2].map(k=>{const a=x.slice(),b=x.slice();a[k]+=e;b[k]-=e;return field(...a)-field(...b);});if(Math.hypot(...g)<1e-12)return null;
 const h=1e-5,J=[0,1,2].map(k=>{const a=x.slice(),b=x.slice();a[k]+=h;b[k]-=h;const fa=toWritten.map(a),fb=toWritten.map(b);return [0,1,2].map(j=>(fa[j]-fb[j])/(2*h));});// J[k][j] = d written_j / d x_k: the rows of J^T
 // solve J^T n = g (J^T's rows are J[k]): Cramer's rule
 const d3=(a,b,c)=>a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]),D=d3(J[0],J[1],J[2]);if(Math.abs(D)<1e-12)return null;
 const col=(j,v)=>J.map((row,k)=>row.map((x,c)=>c===j?v[k]:x)),nn=[0,1,2].map(j=>d3(...col(j,g))/D),l=Math.hypot(...nn);
 return nn.map(x=>x/l);
}
// The band between the parted lips: every triangle graded from one lip to the other (its vertices'
// lower not all at one lip: the skin stretched between them where they meet at the mouth's
// corners) shades with the band's own normals, its triangles' facings with the jaw open
// OPEN_NORMALS averaged over the band alone, turned back to rest by each vertex's weight. A vertex
// on a lip's edge keeps its own normal for the lip and has the band's for the band: speaking-head.js
// blends to the band's where a fragment is graded between the lips. (A game mesh's band is a few
// long triangles from one lip's edge to the other's: the lips' normals across them, and a wall
// normal on its folding part, shaded as stripes, rounds 2 and 3.) Sparse: {vertices, normal}.
const bandTriangle=(lower,v)=>!(v.every(i=>lower[i]<=.02)||v.every(i=>lower[i]>=.98));
function bandNormals(position,m,hinge){
 const at=openFacings(position,m,hinge,v=>bandTriangle(m.lower,v)),vertices=[],normal=[];
 for(let i=0;i<position.length/3;i++){const r=at(i);if(r){vertices.push(i);normal.push(...r);}}
 return {vertices,normal:round(normal,5)};
}
function meshNormals(position,index){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setIndex(new THREE.BufferAttribute(index,1));g.computeVertexNormals();const n=g.attributes.normal.array.slice();g.dispose();return n;}
const round=(a,d)=>Array.from(a,v=>+v.toFixed(d));
const placeAll=(place,P)=>{const o=new Float32Array(P.length);for(let i=0;i<P.length;i+=3)o.set(place.map([P[i],P[i+1],P[i+2]]),i);return o;};

// The sculpted skin, placed and welded (its `position` stays where it was sculpted: open).
// Normals: the sculpt's own (the expanded space's: the mouth's surfaces as they are when open,
// the approved surface as its tool had it away from the mouth). The cow's and the director's tools
// recomputed theirs from the placed mesh: theirs are the placed rest mesh's on the approved surface
// and the placed open mesh's in the mouth. When written, the outer skin about the mouth takes the
// approved surface's own (outerNormals) and the mouth its open facings (openNormals).
function prepare(S,place,M){
 const P=S.skin.attributes.position.array,N=S.skin.attributes.normal.array,n=P.length/3;
 const rest=placeAll(place,S.rest);let normal=N.slice();
 if(place.meshNormals){const restN=meshNormals(rest,S.skin.index.array),openN=meshNormals(placeAll(place,P),S.skin.index.array);
  for(let i=0;i<n;i++){const v=S.outer[i]>.5?restN.subarray(i*3,i*3+3):openN.subarray(i*3,i*3+3),l=Math.hypot(...v)||1;normal.set([v[0]/l,v[1]/l,v[2]/l],i*3);}}
 // the skin with the jaw open (POSED), as the runtime's jaw bone turns it
 const [hx,hy]=place.map([M.hinge[0],M.hinge[1],0]),c=Math.cos(-POSED),s=Math.sin(-POSED),posed=new Float32Array(n*3);
 for(let i=0;i<n;i++){const w=S.jaw[i],x=rest[i*3],y=rest[i*3+1],dx=x-hx,dy=y-hy;posed.set([x+w*(hx+dx*c-dy*s-x),y+w*(hy+dx*s+dy*c-y),rest[i*3+2]],i*3);}
 const c24=Math.cos(-2*POSED),s24=Math.sin(-2*POSED),posed24=new Float32Array(n*3);
 for(let i=0;i<n;i++){const w=S.jaw[i],x=rest[i*3],y=rest[i*3+1],dx=x-hx,dy=y-hy;posed24.set([x+w*(hx+dx*c24-dy*s24-x),y+w*(hy+dx*s24+dy*c24-y),rest[i*3+2]],i*3);}
 // The crease, where the lips meet over the teeth: the lips' faces' edge rows (folding vertices
 // of one side, next to the outer skin) all along the lip line. The authoring mesh keeps them
 // (locked), so its closed lips meet along the approved surface's section (a beak has no teeth:
 // none). The game mesh cannot spend its mouth's few triangles on them (held, its gums and floor
 // gave way by up to 7 mm): after its reduction its rims go back onto the section (see closeCrease).
 const crease=new Float32Array(n),I=S.skin.index.array,wz=M.rigid?-1:Infinity;
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(!v.some(i=>S.outer[i]>.5))continue;
  for(const i of v)if(S.fold[i]&&(S.lower[i]===0||S.lower[i]===1)&&Math.abs(S.rest[i*3+2])<wz)crease[i]=1;}

 const {posed24:_,...skin}=mergeTiny(weld({position:P,index:I,rest,posed,posed24,normal,jaw:S.jaw,inside:S.inside,depth:S.depth,lower:S.lower,fold:S.fold,part:S.part,outer:S.outer,crease}));
 return {skin,rest};
}
for(const head of HEADS){
 if(only&&!only.includes(head.id))continue;const M=MOUTHS[head.id];if(!M)continue;
 // The frozen placement must still be what the approved sculpt gives (heads.mjs).
 for(const [key,value] of Object.entries(await measurePlacement(head)))if(Math.abs(value-head.place[key])>1e-12)throw Error(`${head.id}: placement ${key} is ${value}, heads.mjs has ${head.place[key]}`);
 const t0=Date.now(),place=placement(head);
 // The sculpt, closed: where its grid catches two sheets of the surface touching at an edge, the
 // grid is moved and the head sculpted again.
 let S,skin,rest,shift=0;
 for(const s of [0,.37,.71]){shift=s;S=sculptSpeaking(head,M,{shift});({skin,rest}=prepare(S,place,M));if(!badEdges(skin.index).length)break;
  console.log(`  ${head.id}: ${badEdges(skin.index).length} edges not closed at grid shift ${s}`);S.skin.dispose();S=null;}
 if(!S)throw Error(`${head.id}: the sculpted skin is not a closed surface at any grid`);
 const G=S.geometry,levels={};
 if(process.env.SPEAKING_DUMP)fs.writeFileSync(process.env.SPEAKING_DUMP+`/${head.id}-raw.json`,JSON.stringify({hinge:place.map([M.hinge[0],M.hinge[1],0]),open:Array.from(skin.position,v=>+v.toFixed(7)),rest:Array.from(skin.rest,v=>+v.toFixed(7)),jaw:Array.from(skin.jaw,v=>+v.toFixed(4)),inside:Array.from(skin.inside,v=>+v.toFixed(3)),fold:Array.from(skin.fold),lower:Array.from(skin.lower,v=>+v.toFixed(3)),index:Array.from(skin.index)}));
 // Teeth: one part per jaw; each tooth a closed lathe, listed with its first vertex and count.
 const teeth=['upper','lower'].map(jaw=>S.teeth.filter(t=>t.jaw===jaw)).filter(a=>a.length);
 const teethPart=(row,level)=>{const position=[],nor=[],index=[],list=[];
  for(const t of row){const [sides,rings]=TOOTH[level],m=toothMesh(t,M.toothSides?.[level]??sides,rings),base=position.length/3;list.push({kind:t.kind,first:base,count:m.position.length/3});
   for(let i=0;i<m.position.length;i+=3){position.push(...place.map([m.position[i],m.position[i+1],m.position[i+2]]));nor.push(m.normal[i],m.normal[i+1],m.normal[i+2]);}for(const i of m.index)index.push(base+i);}
  const p=new Float32Array(position),ix=new Uint32Array(index);return {rest:p,normal:place.meshNormals?meshNormals(p,ix):new Float32Array(nor),index:ix,teeth:list};};
 const tonguePart=level=>{const m=tongueMesh(S.tongue,...TONGUE[level]),p=placeAll(place,m.position);return {rest:p,normal:place.meshNormals?meshNormals(p,m.index):m.normal,index:m.index};};
 const hingeAt=place.map([M.hinge[0],M.hinge[1],0]);
 // the closed head as measure.mjs reads it: the skin at its closed shape (before the donkey's neck
 // revision), its teeth and tongue
 const closedHead=(sk,level)=>({species:head.id,level,jaw:{hinge:hingeAt},parts:[{kind:'skin',name:'skin',position:sk.closed,index:sk.index,jaw:sk.jaw,inside:sk.inside,fold:sk.fold,lower:sk.lower},
  ...teeth.map(row=>{const m=teethPart(row,level);return {kind:'teeth',name:row[0].jaw+' teeth',bone:row[0].jaw==='upper'?'head':'jaw',position:m.rest,index:m.index,teeth:m.teeth};}),
  ...(S.tongue?[(()=>{const m=tonguePart(level);return {kind:'tongue',name:'tongue',bone:'jaw',position:m.rest,index:m.index};})()]:[])]});
 for(const level of ['author','low']){const L=head[level],from=level==='author'?skin:(()=>{const {errorWorld,errors,sourceTriangles,tries,locked,closed,...m}=levels.author.skin;return m;})();
  if(process.env.SPEAKING_DUMP&&level==='low')fs.writeFileSync(process.env.SPEAKING_DUMP+`/${head.id}-author-source.json`,JSON.stringify({open:Array.from(from.position),outer:Array.from(from.outer),lower:Array.from(from.lower),index:Array.from(from.index)}));
  // (the hinge's line across a beak, every 5 mm: see BEAK_ROOT)
  let near=M.rigid&&level==='low'?Array.from({length:13},(_,k)=>[hingeAt[0],hingeAt[1],(k-6)*.005]):[];
  for(let attempt=0;;attempt++){
   const sk=reduce(from,[{target:L.target,tolerance:L.tolerance},{target:L.target*(M.share??MOUTH_SHARE),tolerance:MOUTH_TOLERANCE[level]}],['jaw','inside','lower','fold','rest','posed'],ATTRIBUTE_WEIGHT[level],{lockBy:level==='author'?'crease':null,hinge:hingeAt,
    // (a beak's mandible turns about its root inside the head part, through the upper mandible's
    // base, by construction past 12 degrees: locking that only kept her game mesh over budget)
    degrees:M.rigid?[0,6,12]:[0,6,12,24],lockNear:near,nearReach:M.rigid?BEAK_ROOT:SHOWN_CLOSED.reach[attempt-1]??0});
   // closed, each lip's outer skin reaches the crease: the closed shape (see closeCrease)
   sk.closed=sk.rest.slice();const c=closeCrease(sk,sk.closed,G,head,place,Infinity);if(process.env.SPEAKING_DEBUG)console.log(`  crease ${level}: ${c.rims} rims and ${c.edges} edge vertices onto it; ${c.inverted} triangles inside-out at it, ${c.moved} outer vertices onto it (${c.left} out of reach) in ${c.rounds} rounds, ${c.zipped} moves onto one line`);
   levels[level]={skin:sk};
   // (a beak has no teeth; her tongue under the gape is a known todo of its own)
   if(M.rigid)break;
   const v=closedVisibility(closedHead(sk,level),level,{ppu:SHOWN_CLOSED.ppu,collect:true});
   if(v.teeth.teeth<=SHOWN_CLOSED.bar)break;
   if(attempt>=SHOWN_CLOSED.reach.length){console.log(`  ${head.id} ${level}: ${v.teeth.teeth.toFixed(2)} mm² of tooth or tongue still shows closed after ${attempt} retries`);break;}
   console.log(`  ${head.id} ${level}: ${v.teeth.teeth.toFixed(2)} mm² of tooth or tongue shows closed (azimuth ${v.teeth.az}°, elevation ${v.teeth.el}°): reduced again, kept within ${SHOWN_CLOSED.reach[attempt]*1000} mm of ${v.shown.length+near.length} triangles`);
   near=near.concat(v.shown);}}
 function record(level){
  const toSheet=p=>{const q=place.map(p);return head.revision?donkeyNeck(q):q;};
  const partOut=[];
  const write=(name,m,extra)=>{const position=head.revision?(()=>{const a=new Float32Array(m.rest.length);for(let i=0;i<a.length;i+=3)a.set(donkeyNeck([m.rest[i],m.rest[i+1],m.rest[i+2]]),i);return a;})():m.rest;
   let nor=m.normal;if(head.revision)nor=meshNormals(position,m.index);
   // (the mouth's normals are the reduced mesh's own, opened 6 degrees: the game mesh kept the dense
   // sculpt's through the reduction and its coarse mouth shaded as stripes, round 2; at the lips' rims
   // the sculpt's are the field's gradient at a sharp edge, and the authoring mesh's rims shaded up to
   // 17% over 60 degrees off their triangles, round 4)
   if(extra.kind==='skin')nor=outerNormals(m,nor,head.speaking??head.field,{at:p=>place.unmap(p),map:x=>toSheet(x)});
   if(extra.kind==='skin')nor=openNormals(position,m,nor,toSheet([M.hinge[0],M.hinge[1],0]));
   if(head.earNormals&&extra.kind==='skin'){const averaged=meshNormals(position,m.index);nor=nor.slice();for(let i=0;i<position.length;i+=3){const [x,y,z]=[position[i],position[i+1],position[i+2]];if(Math.abs(z)>.135&&y>1.38&&x<.04)nor.set(averaged.subarray(i,i+3),i);}}
   const o={name,position:round(position,6),normal:round(nor,5),index:Array.from(m.index),triangles:m.index.length/3,...extra};
   if(extra.kind==='skin')o.band=bandNormals(position,m,toSheet([M.hinge[0],M.hinge[1],0]));
   if(extra.kind==='skin')o.closedNormal=closedNormals(m,nor,head.speaking??head.field,{at:p=>place.unmap(p),map:x=>toSheet(x)});
   if(head.revision){o.paintPosition=round(m.rest,6);o.paintNormal=round(m.normal,5);}
   partOut.push(o);};
  const sk=levels[level].skin;
  // the closed shape, as offsets from the rest pose of the vertices it moves (written where the
  // rest pose is: the donkey's after its neck revision)
  const neck=p=>head.revision?donkeyNeck(p):p,closed={vertices:[],offset:[]};
  for(let i=0;i<sk.rest.length/3;i++){const a=[sk.rest[i*3],sk.rest[i*3+1],sk.rest[i*3+2]],b=[sk.closed[i*3],sk.closed[i*3+1],sk.closed[i*3+2]];if(a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2])continue;
   const na=neck(a),nb=neck(b);closed.vertices.push(i);closed.offset.push(...nb.map((v,k)=>+(v-na[k]).toFixed(6)));}
  write(head.part+' (speaking)',sk,{kind:'skin',closed,sourceTriangles:sk.sourceTriangles,errorWorld:+sk.errorWorld.toFixed(6),retries:sk.tries,locked:sk.locked,jaw:round(sk.jaw,4),inside:round(sk.inside,3),depth:round(sk.depth,4),lower:round(sk.lower,3),fold:round(sk.fold,0),part:round(sk.part,3)});
  for(const row of teeth){const m=teethPart(row,level);write(row[0].jaw+' teeth',m,{kind:'teeth',bone:row[0].jaw==='upper'?'head':'jaw',teeth:m.teeth});}
  if(S.tongue)write('tongue',tonguePart(level),{kind:'tongue',bone:'jaw'});
  const r=v=>v.map(x=>+x.toFixed(5));
  const hinge=toSheet([M.hinge[0],M.hinge[1],0]),plan=mouthPlan(head,M,place,S);
  const lever=Math.hypot(G.frontX(0)-M.hinge[0],G.refY(G.frontX(0),0)-M.hinge[1])*place.scale;
  const reference={sheet:PAINT[head.id].sheet.replace(/^dist\//,'../'),frame:PAINT[head.id].frame,lines:plan.lines.map(l=>({...l,points:l.points.map(r)})),dots:plan.dots.map(d=>({...d,point:r(d.point)}))};
  // the cavity's front corner (its +z side; the other is its mirror): in front of it is the mouth's
  // front opening, where the lips are thin and the incisors stand (measure.mjs seeThrough walls it)
  const fc=G.frontCorner,mouth=fc?{frontCorner:r(toSheet([fc[0],G.refY(fc[0],fc[1]),fc[1]]))}:null;
  const data={schema:2,species:head.id,kind:'speaking head',replaces:head.part,character:head.file,level:level==='author'?'author':'10k',sourceHash,
   source:'The approved head sculpt opened for speech: lips parted along the painted mouth line, a mouth cavity, teeth and tongue; reduced as the characters were (tools/build-speaking-heads.mjs)',
   jaw:{hinge:hinge.map(v=>+v.toFixed(6)),axis:[0,0,1],sculpt:'closed',lever:+lever.toFixed(4),angle:r(toSheet([...G.lines.a,0])),line:G.lines.points.map(p=>r(toSheet([...p,0])))},mouth,
   budget:{skull:head[level].target,skin:Math.round(head[level].target*(1+(M.share??MOUTH_SHARE)))},
   triangles:partOut.reduce((t,p)=>t+p.triangles,0),reference,parts:partOut};
  fs.writeFileSync(new URL(`${head.id}-${data.level}.json`,out),JSON.stringify(data)+'\n');
  if(process.env.SPEAKING_DUMP)fs.writeFileSync(process.env.SPEAKING_DUMP+`/${head.id}-${data.level}-debug.json`,JSON.stringify({open:round(sk.position,6),rest:round(sk.rest,6),lower:round(sk.lower,3),outer:Array.from(sk.outer),fold:Array.from(sk.fold),crease:Array.from(sk.crease),index:Array.from(sk.index)}));
  return data;
 }
 const a=record('author'),l=record('low');
 const show=d=>d.parts.map(p=>p.name.split(' ')[0]+' '+p.triangles+(p.retries?` (${p.retries} retries, ${p.locked} locked)`:'')).join(', ');
 console.log(head.id.padEnd(13),'raw',S.skin.index.count/3,'| author',a.triangles,show(a),'| 10k',l.triangles,show(l),'|',((Date.now()-t0)/1000).toFixed(1)+'s');
 S.skin.dispose();
}
