import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {blend,ellipsoid as E,tapered as C,sculptSurface} from '../dist/tactics/grey-surface.js';
const simplify=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await simplify.ready;
const base=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-light-data.json',import.meta.url)));
const geometries=[];
function add(name,g){geometries.push({name,g});}
// Reuse the approved garment construction at authoring resolution, with a leaner
// torso. Sleeve ends and hands retain their bind positions for the shared rig.
for(const part of base.parts){if(/skull|mane|hoof/.test(part.name))continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.normal,3));g.setIndex(part.index);
 if(/shirt|overalls/.test(part.name)){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),torso=THREE.MathUtils.smoothstep(y,.70,.91),center=1-THREE.MathUtils.smoothstep(Math.abs(z),.18,.33);p.setXYZ(i,x*(1-.12*torso*center),y,z*(1-.12*torso*center));const n=g.attributes.normal,f=1-.12*torso*center,v=new THREE.Vector3(n.getX(i)/f,n.getY(i),n.getZ(i)/f).normalize();n.setXYZ(i,v.x,v.y,v.z);} }add(part.name,g);}
const hornPaths=[-1,1].map(s=>new THREE.CubicBezierCurve3(new THREE.Vector3(-.040,1.55,s*.059),new THREE.Vector3(-.11,1.645,s*.073),new THREE.Vector3(-.22,1.625,s*.081),new THREE.Vector3(-.255,1.558,s*.085)).getPoints(20).map(p=>p.toArray()));
function head(x,y,z){
 const f=1.38+(y-1.38)/1.25;
 let d=E(x,y,z,[-.056,1.302,0],[.085,.129,.080]);
 d=blend(d,E(x,f,z,[-.006,1.442,0],[.090,.088,.081]),.028);
 d=blend(d,E(x,f,z,[.018,1.394,0],[.080,.065,.085]),.018);
 d=blend(d,C(x,f,z,[.038,1.458,0],[.163,1.402,0],.057,.040),.017);
 d=blend(d,E(x,f,z,[.174,1.399,0],[.038,.029,.049]),.009);
 d=blend(d,C(x,f,z,[.009,1.368,0],[.149,1.364,0],.041,.030),.009);
 for(const s of [-1,1]){
  d=blend(d,E(x,f,z,[-.065,1.480,s*.117],[.041,.029,.073]),.015);
  d=Math.max(d,-E(x,f,z,[-.048,1.495,s*.126],[.030,.019,.049]));
  d=blend(d,E(x,f,z,[.011,1.404,s*.065],[.039,.036,.026]),.012);
  // Broad upper orbital shelf and a recessed almond opening. Paint supplies pupils.
  d=blend(d,E(x,f,z,[.040,1.458,s*.065],[.040,.013,.020]),.012);
  d=-blend(-d,E(x,f,z,[.048,1.445,s*.085],[.026,.014,.015]),.004);
  d=Math.max(d,-E(x,f,z,[.191,1.410,s*.039],[.014,.009,.013]));
  const path=hornPaths[s===-1?0:1];let horn=Infinity;for(let i=0;i<20;i++)horn=Math.min(horn,C(x,y,z,path[i],path[i+1],.033*(1-i/20)+.0015,.033*(1-(i+1)/20)+.0015));
  d=blend(d,horn,.012);
 }
 // The throat, rounded and out to the painted throat line: the side paintings draw it 4 to 5 cm
 // ahead of the neck's centre, where the sculpt had a flat front 2 to 2.5 cm behind it, square to
 // the jaw. No painting covered that front: its paint, borrowed, was a pale wash with a hard
 // outline and the back painting's scarf in it (the user, "its this part here"; "modify the base
 // sculpt to go out to the dimensions where the patch are"; of two shapes, "1: rounded at the
 // painted line").
 d=blend(d,E(x,y,z,[.022,1.290,0],[.026,.040,.036]),.024);
 d+=.0035*Math.exp(-(((f-1.378)/.004)**2))*THREE.MathUtils.smoothstep(x,.105,.15);
 return d;
}
const skull=sculptSurface(head,[-.39,1.11,-.20],[.25,1.70,.20],.0055);
// Prototype standing height includes horns. Keep the clothing and rig unchanged.
skull.computeBoundingBox();const top=skull.boundingBox.max.y,p=skull.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+1.65-top);
add('unified goat skull ears and swept horns',skull);
add('goat beard',sculptSurface((x,y,z)=>{
 const t=THREE.MathUtils.clamp((1.365-y)/.105,0,1),cx=.139-.032*t*t;
 let d=E(x,y,z,[cx,1.326,0],[.032*(1-.4*t),.046,.040*(1-.20*t)]);
 // A broad flattened chin tuft, finishing in three short unequal locks.
 for(const [zz,yy,xx] of [[-.021,1.278,.112],[0,1.267,.107],[.022,1.283,.110]])d=blend(d,C(x,y,z,[.13,1.31,zz*.8],[xx,yy,zz],.018,.005),.010);
 return d;
},[.05,1.245,-.063],[.19,1.40,.063],.0055));
for(const s of [-1,1])add('exposed cloven hoof '+s,sculptSurface((x,y,z)=>{
 const zz=z-s*.232,t=THREE.MathUtils.clamp(y/.098,0,1),rx=.084-.022*t,rz=.073-.018*t,cx=.006-.023*t;
 let d=Math.max((Math.hypot((x-cx)/rx,zz/rz)-1)*Math.min(rx,rz),-y,y-.098);
 // Deep anterior cleft separates the two toes; heel and pastern remain connected.
 const cleft=Math.max(Math.abs(zz)-.006,.011-x,y-.079);d=Math.max(d,-cleft);
 return blend(d,C(x,y,zz,[-.018,.107,0],[-.034,.203,0],.051,.067),.008);
},[-.12,-.013,s*.232-.10],[.12,.29,s*.232+.10],.008));
// Stable part order is also the paint ownership order shared with the horse.
const order=['connected shirt and sleeves','connected overalls seat and legs','forearm and hand -1','exposed cloven hoof -1','forearm and hand 1','exposed cloven hoof 1','unified goat skull ears and swept horns','goat beard'];geometries.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
function reduce(name,g,target,tolerance){const positions=g.attributes.position.array;let [indices,error]=simplify.simplify(new Uint32Array(g.index.array),positions,3,Math.min(target*3,g.index.count),tolerance,['ErrorAbsolute']);const faces=new Map();for(let i=0;i<indices.length;i+=3){const key=Array.from(indices.subarray(i,i+3)).sort((a,b)=>a-b).join(':');if(!faces.has(key))faces.set(key,[]);faces.get(key).push(i);}const clean=[];for(const v of faces.values())if(v.length===1)clean.push(...indices.subarray(v[0],v[0]+3));indices=new Uint32Array(clean);
 const [remap,count]=simplify.compactMesh(indices),position=new Float32Array(count*3),normal=new Float32Array(count*3);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){position.set(positions.subarray(i*3,i*3+3),remap[i]*3);normal.set(g.attributes.normal.array.subarray(i*3,i*3+3),remap[i]*3);}return {name,position:Array.from(position,v=>+v.toFixed(7)),normal:Array.from(normal,v=>+v.toFixed(6)),index:Array.from(indices),triangles:indices.length/3,sourceTriangles:g.index.count/3,errorWorld:error};}
const author=geometries.map(({name,g})=>reduce(name,g,name.includes('skull')?7800:name.includes('beard')?550:name.includes('hoof')?800:10000,.006));
function save(file,parts,sourceTriangles){const data={schema:1,species:'goat',source:'Goat-specific head, horns, beard and cloven hooves; adapted approved worker garments',sourceTriangles,triangles:parts.reduce((n,p)=>n+p.triangles,0),parts};fs.writeFileSync(new URL('../dist/tactics/'+file,import.meta.url),JSON.stringify(data)+'\n');console.log(file,data.triangles,parts.map(p=>[p.name,p.triangles,p.errorWorld]));return data;}
const high=save('goat-author-data.json',author,geometries.reduce((n,p)=>n+p.g.index.count/3,0));
const low=author.map(p=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(p.normal,3));g.setIndex(p.index);const target=p.name.includes('shirt')?1650:p.name.includes('overalls')?2550:p.name.includes('skull')?2800:p.name.includes('beard')?200:p.name.includes('hoof')?400:1000;const result=reduce(p.name,g,target,p.name.includes('forearm')?.006:p.name.includes('hoof')?.006:.015);g.dispose();return result;});
save('goat-10k-data.json',low,high.triangles);for(const {g} of geometries)g.dispose();
