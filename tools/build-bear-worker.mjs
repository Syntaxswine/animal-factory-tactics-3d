import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blend,ellipsoid as E,tapered as C,sculptSurface} from '../dist/tactics/grey-surface.js';
const simplify=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await simplify.ready;
const base=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-light-data.json',import.meta.url)));
const smooth=T.MathUtils.smoothstep,geometries=[],add=(name,g)=>geometries.push({name,g});
// Preserve the shared worker's glove contacts. Broader upper arms and clothes
// are authored in rest space; the skeleton is widened by the same fixed offset.
for(const part of base.parts){
 if(!/shirt|overalls|forearm/.test(part.name))continue;
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(part.position,3));g.setIndex(part.index);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),side=z<0?-1:1;
  if(part.name.includes('forearm')){
   const bulk=.16*smooth(y,.79,.91),axis=.061-(y-.742)*.157;
   p.setXYZ(i,axis+(x-axis)*(1+bulk),y,z+side*.055);
  }else if(part.name.includes('shirt')){
   const sleeve=smooth(Math.abs(z),.19,.30);
   p.setXYZ(i,x*(1.27-.15*sleeve),y,z+side*.055*smooth(Math.abs(z),.07,.29));
  }else{
   const upper=smooth(y,.50,.85);
   p.setXYZ(i,x*(1+.20*upper),y,z*(1+.12*upper));
  }
 }
 g.computeVertexNormals();add(part.name,g);
}
function head(x,y,z){
 let d=E(x,y,z,[-.069,1.306,0],[.128,.155,.131]);
 d=blend(d,E(x,y,z,[-.038,1.479,0],[.145,.145,.147]),.035);
 d=blend(d,E(x,y,z,[.023,1.415,0],[.137,.092,.142]),.027);
 // A wide, short muzzle, broad nose and squared jaw distinguish the bear.
 d=blend(d,E(x,y,z,[.113,1.453,0],[.108,.065,.095]),.026);
 d=blend(d,E(x,y,z,[.199,1.477,0],[.034,.030,.064]),.012);
 d=blend(d,E(x,y,z,[.111,1.414,0],[.099,.034,.094]),.018);
 for(const s of [-1,1]){
  d=blend(d,E(x,y,z,[-.061,1.610,s*.127],[.054,.061,.055]),.020);
  // Shallow ear cups and restrained orbital shelves; fine fur is painted.
  d=-blend(-d,E(x,y,z,[-.020,1.618,s*.128],[.023,.038,.035]),.005);
  d=blend(d,E(x,y,z,[.051,1.535,s*.099],[.053,.022,.038]),.017);
  d=-blend(-d,E(x,y,z,[.097,1.507,s*.115],[.028,.022,.025]),.006);
  d=blend(d,E(x,y,z,[.079,1.515,s*.107],[.022,.016,.021]),.005);
  d=blend(d,E(x,y,z,[-.022,1.423,s*.125],[.091,.071,.043]),.022);
 }
 d+=.002*Math.exp(-1*((y-1.425)/.004)**2)*smooth(x,.15,.20);
 return d;
}
add('unified bear skull rounded ears and muzzle',sculptSurface(head,[-.23,1.12,-.22],[.26,1.70,.22],.0048));
add('short bear tail',sculptSurface((x,y,z)=>blend(E(x,y,z,[-.208,.844,0],[.056,.046,.047]),E(x,y,z,[-.242,.827,0],[.041,.039,.041]),.015),[-.30,.77,-.07],[-.14,.91,.07],.006));
for(const s of [-1,1]){
 add('plantigrade bear foot '+s,sculptSurface((x,y,z)=>{
  const zz=z-s*.232;
  let d=E(x,y,zz,[.012,.058,0],[.124,.059,.104]);
  d=blend(d,C(x,y,zz,[-.035,.076,0],[-.034,.202,0],.066,.073),.018);
  for(const t of [-2,-1,0,1,2])d=blend(d,E(x,y,zz,[.105+.016*(1-Math.abs(t)/2),.037,t*.038],[.043,.033,.027]),.009);
  return Math.max(d,-y);
 },[-.15,-.015,s*.232-.14],[.19,.30,s*.232+.14],.006));
}
for(const {name,g}of geometries)if(name.includes('foot')){const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<.003)p.setY(i,0);g.computeVertexNormals();}
const order=['connected shirt and sleeves','connected overalls seat and legs','forearm and hand -1','plantigrade bear foot -1','forearm and hand 1','plantigrade bear foot 1','unified bear skull rounded ears and muzzle','short bear tail'];
geometries.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
function reduce(name,g,target,tolerance){
 const positions=g.attributes.position.array;
 let [indices,error]=simplify.simplify(new Uint32Array(g.index.array),positions,3,Math.min(target*3,g.index.count),tolerance,['ErrorAbsolute']);
 const faces=new Map();for(let i=0;i<indices.length;i+=3){const key=Array.from(indices.subarray(i,i+3)).sort((a,b)=>a-b).join(':');if(!faces.has(key))faces.set(key,[]);faces.get(key).push(i);}
 indices=new Uint32Array([...faces.values()].filter(a=>a.length===1).flatMap(a=>Array.from(indices.subarray(a[0],a[0]+3))));
 const [remap,count]=simplify.compactMesh(indices),position=new Float32Array(count*3),normal=new Float32Array(count*3);
 for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){position.set(positions.subarray(i*3,i*3+3),remap[i]*3);normal.set(g.attributes.normal.array.subarray(i*3,i*3+3),remap[i]*3);}
 return {name,position:Array.from(position,v=>+v.toFixed(7)),normal:Array.from(normal,v=>+v.toFixed(6)),index:Array.from(indices),triangles:indices.length/3,sourceTriangles:g.index.count/3,errorWorld:error};
}
const bonePositions={};for(const s of [-1,1])for(const [name,p]of Object.entries({upperArm:[-.045,1.191,.260],forearm:[.022,.991,.399],hand:[.061,.742,.410],fingers:[.072,.712,.410]}))bonePositions[name+s]=[p[0],p[1],s*p[2]];
function save(file,parts,sourceTriangles){
 const data={schema:1,species:'bear',source:'Brown bear worker: broad adapted work garments, new short-muzzled head, rounded ears, plantigrade paws and short tail; widened shared worker skeleton',bonePositions,sourceTriangles,triangles:parts.reduce((n,p)=>n+p.triangles,0),parts};
 fs.writeFileSync(new URL('../dist/tactics/'+file,import.meta.url),JSON.stringify(data)+'\n');console.log(file,data.triangles,parts.map(p=>[p.name,p.triangles,p.errorWorld]));return data;
}
const author=geometries.map(({name,g})=>reduce(name,g,name.includes('skull')?7500:name.includes('tail')?600:name.includes('foot')?1100:name.includes('shirt')?6700:name.includes('overalls')?8500:3000,.005));
const high=save('bear-author-data.json',author,geometries.reduce((n,p)=>n+p.g.index.count/3,0));
const low=author.map(p=>{
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(p.normal,3));g.setIndex(p.index);
 const target=p.name.includes('shirt')?1700:p.name.includes('overalls')?2600:p.name.includes('skull')?2850:p.name.includes('tail')?220:p.name.includes('foot')?440:900;
 const result=reduce(p.name,g,target,p.name.includes('forearm')?.006:.012);g.dispose();return result;
});
save('bear-10k-data.json',low,high.triangles);for(const {g}of geometries)g.dispose();
