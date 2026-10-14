// node tools/build-speaking-heads.mjs [--only=<id>]
// Builds each character's speaking head from its approved head sculpt (tools/speaking-heads):
// the sculpt is opened for speech (sculpt.mjs, mouths.mjs), placed where the character's tool
// placed its skull (place.mjs), then reduced twice, as the characters were: to an authoring
// mesh at about three times the game budget, and from that to the game mesh. Writes
// dist/tactics/speaking-heads/<id>-author.json and <id>-10k.json.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {speakingSourceHash} from './speaking-heads/source-hash.mjs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {HEADS,PAINT,donkeyNeck} from './speaking-heads/heads.mjs';
import {mouthPlan} from './speaking-heads/plan.mjs';
import {MOUTHS} from './speaking-heads/mouths.mjs';
import {placement,measurePlacement} from './speaking-heads/place.mjs';
import {sculptSpeaking,mouthGeometry,sealOffset,toothMesh} from './speaking-heads/sculpt.mjs';
const simplify=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await simplify.ready;
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const out=new URL('../dist/tactics/speaking-heads/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const sourceHash=speakingSourceHash();

// The speaking skin may spend a quarter more than the skull it replaces (its mouth: lips,
// cavity), and the teeth and tongue have their own small budgets. Author is the skull's own
// authoring count scaled alike.
// A tooth is a cube divided TOOTH times along an edge, moved onto its surface: 6*2*n*n
// triangles (48 authoring, 12 in the game mesh).
const SKIN=1.25,TOOTH={author:2,low:1},TONGUE={author:420,low:140};
// The attribute weights keep the lip edge (where the interior begins), the jaw's weight and the
// two sides of the mouth from being simplified away: a full change of one counts as this much
// distance. `side` (+1 above the lips, -1 below) keeps a collapse from pinching the slit shut.
const ATTRIBUTE_WEIGHT={jaw:.01,inside:.03,side:.03};

function cleanFaces(indices){const faces=new Map();for(let i=0;i<indices.length;i+=3){const key=Array.from(indices.subarray(i,i+3)).sort((a,b)=>a-b).join(':');if(!faces.has(key))faces.set(key,[]);faces.get(key).push(i);}
 const clean=[];for(const starts of faces.values())if(starts.length===1)clean.push(...indices.subarray(starts[0],starts[0]+3));return new Uint32Array(clean);}
// Edges not shared by exactly two triangles (a closed surface has none), as vertex pairs.
function badEdges(index){const edges=new Map();for(let t=0;t<index.length;t+=3)for(let k=0;k<3;k++){const a=index[t+k],b=index[t+(k+1)%3],key=a<b?a*4294967296+b:b*4294967296+a;edges.set(key,(edges.get(key)||0)+1);}
 const bad=[];for(const [key,v] of edges)if(v!==2)bad.push([Math.floor(key/4294967296),key%4294967296]);return bad;}
// Vertices the sculpt left a hair apart (its weld rounds to 1e-7) become one, so the simplifier
// sees the surface as connected.
function weld(mesh,eps=1e-6){
 const n=mesh.position.length/3,P=mesh.position,keyOf=i=>Math.round(P[i*3]/eps)+','+Math.round(P[i*3+1]/eps)+','+Math.round(P[i*3+2]/eps),first=new Map(),map=new Uint32Array(n);
 for(let i=0;i<n;i++){const k=keyOf(i);if(!first.has(k))first.set(k,i);map[i]=first.get(k);}
 const index=new Uint32Array(mesh.index.length);for(let i=0;i<index.length;i++)index[i]=map[mesh.index[i]];
 return {...mesh,index:cleanFaces(dropDegenerate(index))};
}
function dropDegenerate(index){const out=[];for(let t=0;t<index.length;t+=3){const a=index[t],b=index[t+1],c=index[t+2];if(a!==b&&b!==c&&a!==c)out.push(a,b,c);}return new Uint32Array(out);}
// Reduce a mesh carried as {position (where it is simplified), index, attributes...}: keeps a
// subset of its vertices, so every per-vertex array follows by the remap. The finer sculpt
// resolves thin shells (folded ears, nostrils, a lip over a flat muzzle) that a collapse can
// pinch shut, leaving edges shared by four triangles: where a reduction does that, the
// vertices around the pinch are locked against collapsing and it is done again.
function reduce(mesh,target,tolerance,attributes=[]){
 const n=mesh.position.length/3,P=mesh.position,attr=new Float32Array(n*Math.max(1,attributes.length));
 attributes.forEach((a,k)=>{for(let i=0;i<n;i++)attr[i*attributes.length+k]=mesh[a][i];});
 const source=new Uint32Array(mesh.index),closed=badEdges(source).length===0,lock=new Uint8Array(n),reach=Math.max(.004,tolerance*.8);
 let indices,error,tries=0,locked=0;
 for(;;tries++){
  const count=Math.min(target*3,source.length);
  [indices,error]=simplify.simplifyWithAttributes(source.slice(),P,3,attr,attributes.length?attributes.length:1,attributes.length?attributes.map(a=>ATTRIBUTE_WEIGHT[a]):[0],lock,count,tolerance,['ErrorAbsolute']);
  indices=cleanFaces(indices);
  const bad=closed?badEdges(indices):[];if(!bad.length)break;
  if(tries>=8)throw Error(`reduce: still ${bad.length} pinched edges near ${target} triangles after ${locked} locks`);
  const at=[...new Set(bad.flat())].map(i=>[P[i*3],P[i*3+1],P[i*3+2]]);
  for(let i=0;i<n;i++){if(lock[i])continue;const x=P[i*3],y=P[i*3+1],z=P[i*3+2];for(const q of at)if((x-q[0])**2+(y-q[1])**2+(z-q[2])**2<reach*reach){lock[i]=1;locked++;break;}}
 }
 const [remap,count]=simplify.compactMesh(indices),result={index:indices,errorWorld:error,sourceTriangles:mesh.index.length/3,tries,locked};
 // The remap covers the vertices up to the highest one still used, not all n.
 for(const [key,value] of Object.entries(mesh)){if(key==='index'||!ArrayBuffer.isView(value))continue;const k=value.length/n,array=new Float32Array(count*k);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)array.set(value.subarray(i*k,i*k+k),remap[i]*k);result[key]=array;}
 return result;
}
function meshNormals(position,index){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setIndex(new THREE.BufferAttribute(index,1));g.computeVertexNormals();const n=g.attributes.normal.array.slice();g.dispose();return n;}
const round=(a,d)=>Array.from(a,v=>+v.toFixed(d));

for(const head of HEADS){
 if(only&&!only.includes(head.id))continue;const M=MOUTHS[head.id];if(!M)continue;
 // The frozen placement must still be what the approved sculpt gives (heads.mjs).
 for(const [key,value] of Object.entries(await measurePlacement(head)))if(Math.abs(value-head.place[key])>1e-12)throw Error(`${head.id}: placement ${key} is ${value}, heads.mjs has ${head.place[key]}`);
 const t0=Date.now(),place=placement(head),S=sculptSpeaking(head,M),G=S.geometry;
 // The skin, in sculpt space (where its slit is open) for simplifying, and placed at rest.
 const P=S.skin.attributes.position.array,N=S.skin.attributes.normal.array,n=P.length/3;
 const rest=new Float32Array(n*3),restNormal=new Float32Array(n*3),near=new Float32Array(n);
 for(let i=0;i<n;i++){const p=[S.rest[i*3],S.rest[i*3+1],S.rest[i*3+2]];rest.set(place.map(p),i*3);near[i]=sealOffset(G,M,[P[i*3],P[i*3+1],P[i*3+2]]).some(v=>v!==0)||S.inside[i]>0?1:0;}
 // Normals: the field's where the head is the approved surface (as its tool had them), the
 // rest surface's own where the mouth changed it; the cow's and director's tools recomputed
 // theirs from the placed mesh, so theirs are the placed rest mesh's throughout.
 const fromMesh=meshNormals(rest,S.skin.index.array);
 for(let i=0;i<n;i++){const v=place.meshNormals||near[i]?[fromMesh[i*3],fromMesh[i*3+1],fromMesh[i*3+2]]:[N[i*3],N[i*3+1],N[i*3+2]],l=Math.hypot(...v)||1;restNormal.set(v.map(x=>x/l),i*3);}
 const side=new Float32Array(n);for(let i=0;i<n;i++)side[i]=G.cut(P[i*3],P[i*3+1],P[i*3+2])>=0?1:-1;
 const skin=weld({position:P,index:S.skin.index.array,rest,normal:restNormal,jaw:S.jaw,inside:S.inside,depth:S.depth,side});
 if(badEdges(skin.index).length)throw Error(head.id+': the sculpted skin is not a closed surface');
 const skull={author:Math.round(head.author.target*SKIN),low:Math.round(head.low.target*SKIN)};
 const authorSkin=reduce(skin,skull.author,head.author.tolerance,['jaw','inside','side']);
 const {tries:_,errorWorld:__,sourceTriangles:___,locked:____,...authorMesh}=authorSkin;
 const lowSkin=reduce(authorMesh,skull.low,head.low.tolerance,['jaw','inside','side']);
 const parts=S.parts.map(part=>{const g=part.geometry,PP=g.attributes.position.array,count=PP.length/3,placed=new Float32Array(PP.length);for(let i=0;i<count;i++)placed.set(place.map([PP[i*3],PP[i*3+1],PP[i*3+2]]),i*3);
  const normal=place.meshNormals?meshNormals(placed,g.index.array):g.attributes.normal.array;
  if(part.teeth){const level=k=>{const meshes=part.teeth.map(t=>toothMesh(t,TOOTH[k])),position=[],normal=[],index=[];
    for(const m of meshes){const base=position.length/3;for(let i=0;i<m.position.length;i+=3){position.push(...place.map([m.position[i],m.position[i+1],m.position[i+2]]));normal.push(m.normal[i],m.normal[i+1],m.normal[i+2]);}for(const i of m.index)index.push(base+i);}
    const rest=new Float32Array(position),idx=new Uint32Array(index);return {rest,normal:place.meshNormals?meshNormals(rest,idx):new Float32Array(normal),index:idx,errorWorld:0,sourceTriangles:idx.length/3,tries:0,locked:0};};
   return {part,author:level('author'),low:level('low')};}
  const budget=TONGUE,mesh={position:PP,index:g.index.array,rest:placed,normal};
  const author=reduce(weld(mesh),budget.author,.0008),{tries:_,errorWorld:__,sourceTriangles:___,locked:____,...authorMesh}=author,low=reduce(authorMesh,budget.low,.0025);return {part,author,low};});
 function record(level,skinMesh){
  const partOut=[];
  const write=(name,m,extra)=>{const position=head.revision?(()=>{const a=new Float32Array(m.rest.length);for(let i=0;i<a.length;i+=3)a.set(donkeyNeck([m.rest[i],m.rest[i+1],m.rest[i+2]]),i);return a;})():m.rest;
   let normal=m.normal;if(head.revision)normal=meshNormals(position,m.index);
   if(head.earNormals&&/skull/.test(name)){const averaged=meshNormals(position,m.index);normal=normal.slice();for(let i=0;i<position.length;i+=3){const [x,y,z]=[position[i],position[i+1],position[i+2]];if(Math.abs(z)>.135&&y>1.38&&x<.04)normal.set(averaged.subarray(i,i+3),i);}}
   const o={name,position:round(position,6),normal:round(normal,5),index:Array.from(m.index),triangles:m.index.length/3,sourceTriangles:m.sourceTriangles,errorWorld:+m.errorWorld.toFixed(6),retries:m.tries,locked:m.locked,...extra};
   if(head.revision){o.paintPosition=round(m.rest,6);o.paintNormal=round(m.normal,5);}
   partOut.push(o);};
  write(head.part+' (speaking)',skinMesh,{kind:'skin',jaw:round(skinMesh.jaw,4),inside:round(skinMesh.inside,3),depth:round(skinMesh.depth,4)});
  for(const p of parts)write(p.part.name,p[level],{kind:p.part.name==='tongue'?'tongue':'teeth',bone:p.part.bone});
  const placedHinge=place.map([M.hinge[0],M.hinge[1],0]),hinge=head.revision?donkeyNeck(placedHinge):placedHinge,plan=mouthPlan(head,M,place),r=v=>v.map(x=>+x.toFixed(5));
  // The mouth plan on the character's registered paint sheet (sheet units), for the reference sheet.
  const reference={sheet:PAINT[head.id].sheet.replace(/^dist\//,'../'),frame:PAINT[head.id].frame,lines:plan.lines.map(l=>({...l,points:l.points.map(r)})),dots:plan.dots.map(d=>({...d,point:r(d.point)}))};
  const data={schema:1,species:head.id,kind:'speaking head',replaces:head.part,character:head.file,level,sourceHash,
   source:'The approved head sculpt opened for speech: lips parted along the painted mouth line, a mouth cavity, teeth and tongue; reduced as the characters were (tools/build-speaking-heads.mjs)',
   jaw:{hinge:hinge.map(v=>+v.toFixed(6)),axis:[0,0,1],sculpt:'closed'},
   budget:{skull:head[level==='author'?'author':'low'].target,skin:skull[level==='author'?'author':'low']},
   triangles:partOut.reduce((t,p)=>t+p.triangles,0),reference,parts:partOut};
  fs.writeFileSync(new URL(`${head.id}-${level==='author'?'author':'10k'}.json`,out),JSON.stringify(data)+'\n');return data;
 }
 const a=record('author',authorSkin),l=record('low',lowSkin);
 console.log(head.id.padEnd(13),'raw',S.skin.index.count/3,'author',a.triangles,a.parts.map(p=>p.name.split(' ')[0]+' '+p.triangles+(p.retries?'('+p.retries+' retries, '+p.locked+' locked)':'')).join(', '),'| 10k',l.triangles,l.parts.map(p=>p.triangles+(p.retries?'('+p.retries+'/'+p.locked+')':'')).join(', '),'|',((Date.now()-t0)/1000).toFixed(1)+'s');
 S.skin.dispose();for(const p of S.parts)p.geometry.dispose();
}
