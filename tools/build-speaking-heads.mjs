// node tools/build-speaking-heads.mjs [--only=<id>,<id>]
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
const simplify=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await simplify.ready;
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const out=new URL('../dist/tactics/speaking-heads/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const sourceHash=speakingSourceHash();

// The speaking skin spends what the skull it replaces spent on the approved surface, and a
// quarter more on the mouth inside it (the lips' faces, cheeks, cavity), at a tolerance of its own.
// Teeth and tongue are small closed lathes with budgets of their own (sides x rings).
const MOUTH_SHARE=.25,MOUTH_TOLERANCE={author:.0015,low:.008};
const TOOTH={author:[10,6],low:[6,2]},TONGUE={author:[12,14],low:[8,7]};
// The attribute weights keep the jaw's weight, the mouth's paint and the lips' two sides from
// being simplified away: a full change of one counts as this much distance (less in the game mesh,
// whose mouth is seen at portrait size at most). The skin is simplified where it was sculpted (the
// open, expanded space), and its shape closed (`rest`) and with the jaw open 12 degrees (`posed`)
// count too, as attributes: a reduction good for one pose and folded in another is refused.
const ATTRIBUTE_WEIGHT={author:{jaw:.02,inside:.03,lower:.03,fold:.02,rest:1,posed:1},low:{jaw:.006,inside:.01,lower:.01,fold:.02,rest:1,posed:1}};
const POSED=12*Math.PI/180;

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
// Reduce a mesh carried as {position (where it is simplified: the open, expanded space), index,
// per-vertex arrays...} in parts that meet along locked borders: the approved outer surface
// (triangles all of whose vertices have outer = 1) at the skull's own target and tolerance, and
// the mouth at its own. A collapse can pinch a thin wall (a cheek, a lip over the cavity) into
// edges shared by four triangles: where one does, the vertices around the pinch are locked and
// the reduction is done again. Every per-vertex array follows the kept vertices.
function reduce(mesh,parts,attributes,weights){
 // each attribute one value per vertex, or three (a position)
 const n=mesh.position.length/3,columns=attributes.flatMap(a=>mesh[a].length===n*3?[[a,0],[a,1],[a,2]]:[[a,null]]),attr=new Float32Array(n*columns.length);
 columns.forEach(([a,c],k)=>{const v=mesh[a];for(let i=0;i<n;i++)attr[i*columns.length+k]=c===null?v[i]:v[i*3+c];});
 const P=mesh.position;
 const outerTri=t=>mesh.outer[mesh.index[t*3]]>.5&&mesh.outer[mesh.index[t*3+1]]>.5&&mesh.outer[mesh.index[t*3+2]]>.5;
 const split=[[],[]];for(let t=0;t<mesh.index.length/3;t++)split[outerTri(t)?0:1].push(mesh.index[t*3],mesh.index[t*3+1],mesh.index[t*3+2]);
 const sources=split.map(s=>new Uint32Array(s)),lock=new Uint8Array(n);let locked=0,tries=0,indices,errors;
 for(;;tries++){
  const done=sources.map((source,k)=>{const {target,tolerance}=parts[k],count=Math.min(Math.round(target)*3,source.length);
   const [ix,error]=simplify.simplifyWithAttributes(source.slice(),P,3,attr,columns.length,columns.map(([a])=>weights[a]),lock,count-count%3,tolerance,['ErrorAbsolute','LockBorder','Sparse']);return {ix,error};});
  indices=cleanFaces(new Uint32Array([...done[0].ix,...done[1].ix]));errors=done.map(d=>d.error);
  if(process.env.SPEAKING_DEBUG)console.log('  reduce',sources.map((s,k)=>`${['outer','mouth'][k]} ${s.length/3} -> ${done[k].ix.length/3} (target ${Math.round(parts[k].target)}, error ${(done[k].error*1000).toFixed(2)} mm of ${(parts[k].tolerance*1000).toFixed(1)})`).join(', '));
  const bad=badEdges(indices);if(!bad.length)break;
  if(tries>=8)throw Error(`reduce: still ${bad.length} pinched edges after ${locked} locks`);
  // lock the source's vertices within `tries + 2` rings of the pinch (and within the reach), so
  // the collapses that made it cannot happen
  const reach=.0025,at=[...new Set(bad.flat())].map(i=>[P[i*3],P[i*3+1],P[i*3+2]]);
  for(let i=0;i<n;i++){if(lock[i])continue;const x=P[i*3],y=P[i*3+1],z=P[i*3+2];for(const q of at)if((x-q[0])**2+(y-q[1])**2+(z-q[2])**2<reach*reach){lock[i]=1;locked++;break;}}
  let ring=new Set(bad.flat());for(let r=0;r<tries+2;r++){const next=new Set(ring);for(let t=0;t<mesh.index.length;t+=3){const tri=[mesh.index[t],mesh.index[t+1],mesh.index[t+2]];if(tri.some(v=>ring.has(v)))tri.forEach(v=>next.add(v));}ring=next;}
  for(const i of ring)if(!lock[i]){lock[i]=1;locked++;}
 }
 const [remap,count]=simplify.compactMesh(indices),result={index:indices,errorWorld:Math.max(...errors),errors,sourceTriangles:mesh.index.length/3,tries,locked};
 // The remap covers the vertices up to the highest one still used, not all n.
 for(const [key,value] of Object.entries(mesh)){if(key==='index'||!ArrayBuffer.isView(value))continue;const k=value.length/n,array=new Float32Array(count*k);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)array.set(value.subarray(i*k,i*k+k),remap[i]*k);result[key]=array;}
 return result;
}
function meshNormals(position,index){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setIndex(new THREE.BufferAttribute(index,1));g.computeVertexNormals();const n=g.attributes.normal.array.slice();g.dispose();return n;}
const round=(a,d)=>Array.from(a,v=>+v.toFixed(d));
const placeAll=(place,P)=>{const o=new Float32Array(P.length);for(let i=0;i<P.length;i+=3)o.set(place.map([P[i],P[i+1],P[i+2]]),i);return o;};

// The sculpted skin, placed and welded (its `position` stays where it was sculpted: open).
// Normals: the sculpt's own (the expanded space's: the mouth's surfaces as they are when open,
// the approved surface as its tool had it). The cow's and the director's tools recomputed theirs
// from the placed mesh: theirs are the placed rest mesh's on the approved surface and the placed
// open mesh's in the mouth.
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
 const {posed24:_,...skin}=mergeTiny(weld({position:P,index:S.skin.index.array,rest,posed,posed24,normal,jaw:S.jaw,inside:S.inside,depth:S.depth,lower:S.lower,fold:S.fold,part:S.part,outer:S.outer}));
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
 if(process.env.SPEAKING_DUMP)fs.writeFileSync(process.env.SPEAKING_DUMP+`/${head.id}-raw.json`,JSON.stringify({hinge:place.map([M.hinge[0],M.hinge[1],0]),rest:Array.from(skin.rest,v=>+v.toFixed(7)),jaw:Array.from(skin.jaw,v=>+v.toFixed(4)),inside:Array.from(skin.inside,v=>+v.toFixed(3)),fold:Array.from(skin.fold),lower:Array.from(skin.lower,v=>+v.toFixed(3)),index:Array.from(skin.index)}));
 for(const level of ['author','low']){const L=head[level],from=level==='author'?skin:(()=>{const {errorWorld,errors,sourceTriangles,tries,locked,...m}=levels.author.skin;return m;})();
  if(process.env.SPEAKING_DUMP&&level==='low')fs.writeFileSync(process.env.SPEAKING_DUMP+`/${head.id}-author-source.json`,JSON.stringify({open:Array.from(from.position),outer:Array.from(from.outer),lower:Array.from(from.lower),index:Array.from(from.index)}));
  levels[level]={skin:reduce(from,[{target:L.target,tolerance:L.tolerance},{target:L.target*MOUTH_SHARE,tolerance:MOUTH_TOLERANCE[level]}],['jaw','inside','lower','fold','rest','posed'],ATTRIBUTE_WEIGHT[level])};}
 // Teeth: one part per jaw; each tooth a closed lathe, listed with its first vertex and count.
 const teeth=['upper','lower'].map(jaw=>S.teeth.filter(t=>t.jaw===jaw)).filter(a=>a.length);
 const teethPart=(row,level)=>{const position=[],nor=[],index=[],list=[];
  for(const t of row){const m=toothMesh(t,...TOOTH[level]),base=position.length/3;list.push({kind:t.kind,first:base,count:m.position.length/3});
   for(let i=0;i<m.position.length;i+=3){position.push(...place.map([m.position[i],m.position[i+1],m.position[i+2]]));nor.push(m.normal[i],m.normal[i+1],m.normal[i+2]);}for(const i of m.index)index.push(base+i);}
  const p=new Float32Array(position),ix=new Uint32Array(index);return {rest:p,normal:place.meshNormals?meshNormals(p,ix):new Float32Array(nor),index:ix,teeth:list};};
 const tonguePart=level=>{const m=tongueMesh(S.tongue,...TONGUE[level]),p=placeAll(place,m.position);return {rest:p,normal:place.meshNormals?meshNormals(p,m.index):m.normal,index:m.index};};
 function record(level){
  const partOut=[];
  const write=(name,m,extra)=>{const position=head.revision?(()=>{const a=new Float32Array(m.rest.length);for(let i=0;i<a.length;i+=3)a.set(donkeyNeck([m.rest[i],m.rest[i+1],m.rest[i+2]]),i);return a;})():m.rest;
   let nor=m.normal;if(head.revision)nor=meshNormals(position,m.index);
   if(head.earNormals&&extra.kind==='skin'){const averaged=meshNormals(position,m.index);nor=nor.slice();for(let i=0;i<position.length;i+=3){const [x,y,z]=[position[i],position[i+1],position[i+2]];if(Math.abs(z)>.135&&y>1.38&&x<.04)nor.set(averaged.subarray(i,i+3),i);}}
   const o={name,position:round(position,6),normal:round(nor,5),index:Array.from(m.index),triangles:m.index.length/3,...extra};
   if(head.revision){o.paintPosition=round(m.rest,6);o.paintNormal=round(m.normal,5);}
   partOut.push(o);};
  const sk=levels[level].skin;
  write(head.part+' (speaking)',sk,{kind:'skin',sourceTriangles:sk.sourceTriangles,errorWorld:+sk.errorWorld.toFixed(6),retries:sk.tries,locked:sk.locked,jaw:round(sk.jaw,4),inside:round(sk.inside,3),depth:round(sk.depth,4),lower:round(sk.lower,3),fold:round(sk.fold,0),part:round(sk.part,3)});
  for(const row of teeth){const m=teethPart(row,level);write(row[0].jaw+' teeth',m,{kind:'teeth',bone:row[0].jaw==='upper'?'head':'jaw',teeth:m.teeth});}
  if(S.tongue)write('tongue',tonguePart(level),{kind:'tongue',bone:'jaw'});
  const toSheet=p=>{const q=place.map(p);return head.revision?donkeyNeck(q):q;},r=v=>v.map(x=>+x.toFixed(5));
  const hinge=toSheet([M.hinge[0],M.hinge[1],0]),plan=mouthPlan(head,M,place,S);
  const lever=Math.hypot(G.frontX(0)-M.hinge[0],G.refY(G.frontX(0),0)-M.hinge[1])*place.scale;
  const reference={sheet:PAINT[head.id].sheet.replace(/^dist\//,'../'),frame:PAINT[head.id].frame,lines:plan.lines.map(l=>({...l,points:l.points.map(r)})),dots:plan.dots.map(d=>({...d,point:r(d.point)}))};
  const data={schema:2,species:head.id,kind:'speaking head',replaces:head.part,character:head.file,level:level==='author'?'author':'10k',sourceHash,
   source:'The approved head sculpt opened for speech: lips parted along the painted mouth line, cheeks closing the mouth\'s sides, a mouth cavity, teeth and tongue; reduced as the characters were (tools/build-speaking-heads.mjs)',
   jaw:{hinge:hinge.map(v=>+v.toFixed(6)),axis:[0,0,1],sculpt:'closed',lever:+lever.toFixed(4),angle:r(toSheet([...G.lines.a,0])),line:G.lines.points.map(p=>r(toSheet([...p,0])))},
   budget:{skull:head[level].target,skin:Math.round(head[level].target*(1+MOUTH_SHARE))},
   triangles:partOut.reduce((t,p)=>t+p.triangles,0),reference,parts:partOut};
  fs.writeFileSync(new URL(`${head.id}-${data.level}.json`,out),JSON.stringify(data)+'\n');
  if(process.env.SPEAKING_DUMP)fs.writeFileSync(process.env.SPEAKING_DUMP+`/${head.id}-${data.level}-debug.json`,JSON.stringify({open:round(sk.position,6),lower:round(sk.lower,3),outer:Array.from(sk.outer),index:Array.from(sk.index)}));
  return data;
 }
 const a=record('author'),l=record('low');
 const show=d=>d.parts.map(p=>p.name.split(' ')[0]+' '+p.triangles+(p.retries?` (${p.retries} retries, ${p.locked} locked)`:'')).join(', ');
 console.log(head.id.padEnd(13),'raw',S.skin.index.count/3,'| author',a.triangles,show(a),'| 10k',l.triangles,show(l),'|',((Date.now()-t0)/1000).toFixed(1)+'s');
 S.skin.dispose();
}
