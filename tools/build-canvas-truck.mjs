import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as T from '../dist/tactics/vendor/three.module.js';
import {softBox} from '../dist/tactics/painted-environment-scene.js';
const opt=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await opt.ready;
const groups=new Map();
function add(name,mat,g,c=[0,0,0],r=[0,0,0]){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...c),new T.Quaternion().setFromEuler(new T.Euler(...r)),new T.Vector3(1,1,1)));if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push({name,g});}
function box(name,mat,c,s,bevel=.025,r=[0,0,0]){add(name,mat,softBox(...s,bevel,3),c,r);}
function rod(name,mat,a,b,r=.025,segments=10){const av=new T.Vector3(...a),bv=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,av.distanceTo(bv),segments);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),bv.clone().sub(av).normalize()));add(name,mat,g,av.add(bv).multiplyScalar(.5).toArray());}
function cylinder(name,mat,c,r,h,segments=40){add(name,mat,new T.CylinderGeometry(r,r,h,segments,1),c,[Math.PI/2,0,0]);}
// Separate authored panels create actual negative window space and readable sill lines.
box('ladder chassis','metal',[0,.53,0],[4.3,.17,1.14]);
for(const z of [-.59,.59])box('chassis rail','metal',[-.1,.42,z],[4.05,.13,.09]);
box('wood cargo bed','wood',[-.88,.91,0],[2.55,.18,1.69]);
for(const z of [-.82,.82]){box('lower cargo side','body',[-.88,1.12,z],[2.58,.35,.07]);for(const x of [-2.09,-1.28,-.47,.36])box('cargo side stake','metal',[x,1.19,z*1.03],[.055,.48,.055],.008);}
box('tailgate','body',[-2.17,1.12,0],[.08,.35,1.67]);
box('cab floor','body',[.91,.88,0],[1.12,.16,1.5]);
box('cab lower back','body',[.34,1.28,0],[.13,.9,1.51]);
box('bonnet','body',[1.57,1.2,0],[1.17,.65,1.32],.12);
box('cab rounded roof','body',[.78,2.01,0],[1.24,.16,1.57],.08);
box('dashboard scuttle','body',[1.18,1.46,0],[.18,.21,1.48]);
for(const z of [-.733,.733]){
 box('door lower panel','body',[.80,1.19,z],[.91,.54,.074],.025);
 box('door window glass','glass',[.79,1.71,z],[.73,.43,.023],.018);
 box('door rear pillar','body',[.32,1.69,z],[.105,.58,.1]);
 rod('raked front pillar','body',[1.22,1.45,z],[1.10,1.99,z],.048,12);
 box('window bottom sill','body',[.80,1.46,z],[.91,.05,.09],.01);
 box('door handle','metal',[.49,1.38,z*1.067],[.16,.035,.035],.009);
 box('running step','metal',[.77,.72,z*1.16],[.97,.09,.27]);
 rod('mirror arm','metal',[1.16,1.67,z],[1.12,1.81,z*1.29],.017);
 box('mirror shell','metal',[1.12,1.84,z*1.3],[.065,.18,.13],.023);
 box('mirror glass','glass',[1.157,1.84,z*1.3],[.009,.135,.095],.003);
}
box('windshield glass','glass',[1.185,1.723,0],[.028,.438,1.31],.009,[0,0,.215]);
rod('split windshield mullion','body',[1.247,1.49,0],[1.145,1.94,0],.027);
for(const z of [-.37,.37])rod('windshield wiper','metal',[1.251,1.53,z],[1.202,1.75,z-.13],.009,6);
box('front radiator','metal',[2.165,1.19,0],[.047,.43,.86],.025);
for(let z=-.35;z<.4;z+=.0875)box('radiator vertical slat','body',[2.199,1.19,z],[.028,.375,.024],.006);
box('front bumper','metal',[2.29,.79,0],[.17,.16,1.81],.035);
box('rear bumper','metal',[-2.29,.70,0],[.13,.12,1.75]);
for(const z of [-.62,.62]){add('headlamp shell','metal',new T.CylinderGeometry(.145,.16,.11,32),[2.16,1.41,z],[0,0,-Math.PI/2]);add('headlamp lens','lamps',new T.SphereGeometry(.137,24,12,0,Math.PI*2,0,Math.PI/2),[2.224,1.41,z],[0,0,-Math.PI/2]);box('rear red lamp','lamps',[-2.224,.92,z],[.026,.09,.075],.012);}
// Rounded sidewalls, recessed rims and individual tread bars; wheel radius .43 is grounded.
for(const x of [-1.40,1.48]){rod('axle','metal',[x,.43,-.92],[x,.43,.92],.073,16);for(const z of [-.83,.83]){
 add('tire rounded sidewall','tire',new T.TorusGeometry(.319,.111,18,64),[x,.43,z]);
 cylinder('wheel center rim','body',[x,.43,z],.244,.20,40);cylinder('hub cap','metal',[x,.43,z+Math.sign(z)*.12],.11,.06,24);
 for(let j=0;j<28;j++){const a=j/28*Math.PI*2;box('tire tread','tire',[x+Math.sin(a)*.421,.43+Math.cos(a)*.421,z],[.065,.013,.20],.004,[0,0,-a]);}
 // Fender has a real thickness and follows the upper wheel arc with free wheel clearance.
 const g=new T.TorusGeometry(.515,.055,8,48,Math.PI);g.scale(1,1,3.2);add('arched mudguard','body',g,[x,.43,z]);
 box('mudflap','tire',[x-.47,.35,z],[.055,.28,.31],.01);
 }}
// Canvas is a shaped double-sided shell; hoop ridges, gravity sag and tied scallops
// are modeled at authoring resolution rather than supplied as random noise.
const nx=84,nt=48,L=2.58,x0=-2.18;
function section(t){const a=t*Math.PI;return [1.31+1.05*Math.sin(a)**.53,.858*Math.cos(a)];}
function canvas(){const pos=[],idx=[];for(let side=0;side<2;side++)for(let i=0;i<=nx;i++)for(let j=0;j<=nt;j++){const u=i/nx,t=(1-Math.cos(j/nt*Math.PI))/2,[yy,zz]=section(t),hoopPhase=u*4,between=Math.sin(hoopPhase*Math.PI)**2,height=(yy-1.31)/1.05,sag=.021*between*Math.sin(t*Math.PI),fold=.009*Math.sin(hoopPhase*Math.PI*2+2*t)*Math.sin(t*Math.PI),local=hoopPhase%1; const drape=.060*between*Math.sin(height*Math.PI)+.032*Math.sin(height*Math.PI)*Math.sin(local*Math.PI)*Math.exp(-(((local-.22-.36*height)/.17)**2));pos.push(x0+u*L,yy-sag+fold-side*.013,zz*(1-side*.014)+Math.sign(zz)*drape);}
 const n=(nx+1)*(nt+1);for(let s=0;s<2;s++)for(let i=0;i<nx;i++)for(let j=0;j<nt;j++){const a=s*n+i*(nt+1)+j,b=a+nt+1;idx.push(...(s?[a,a+1,b,a+1,b+1,b]:[a,b,a+1,a+1,b,b+1]));}for(const j of [0,nt])for(let i=0;i<nx;i++){const a=i*(nt+1)+j,b=a+nt+1;idx.push(a,b,a+n,b,b+n,a+n);}for(const i of [0,nx])for(let j=0;j<nt;j++){const a=i*(nt+1)+j;idx.push(a,a+n,a+1,a+1,a+n,a+n+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
add('taut sagging canvas canopy','canvas',canvas());
for(let i=0;i<5;i++){const x=x0+i*L/4,pts=[];for(let j=0;j<=28;j++){const [y,z]=section(j/28);pts.push(new T.Vector3(x,y-.024,z*.973));}add('internal supporting hoop','metal',new T.TubeGeometry(new T.CatmullRomCurve3(pts),40,.018,6,false));}
// Front bulkhead canvas closes the load space; rear stays open with a rolled flap.
const capPts=[];for(let j=0;j<=48;j++){const [y,z]=section(j/48);capPts.push(new T.Vector2(z,y));}const shape=new T.Shape(capPts);const cg=new T.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:false});cg.rotateY(Math.PI/2);add('front canvas bulkhead','canvas',cg,[.36,0,0]);
add('rolled rear canvas flap','canvas',new T.CylinderGeometry(.087,.087,1.58,32,5),[-2.2,2.235,0],[Math.PI/2,0,0]);
for(const z of [-.56,.56])rod('roll retaining strap','metal',[-2.297,2.15,z],[-2.297,2.30,z],.019,8);
for(const z of [-.868,.868])for(let i=0;i<9;i++){const x=-2.1+i*.29;rod('canvas tie','canvas',[x,1.34,z],[x+.05,1.17,z*1.025],.012,6);}
// Weld identical authored position/normal pairs per material before simplification.
function merge(mat,entries){const position=[],normal=[],index=[],map=new Map();for(const {g,name} of entries){const p=g.attributes.position,n=g.attributes.normal,ids=g.index?.array??Array.from({length:p.count},(_,i)=>i);for(const id of ids){const v=[p.getX(id),p.getY(id),p.getZ(id)],nn=[n.getX(id),n.getY(id),n.getZ(id)],key=(/wheel center rim|hub cap|headlamp shell/.test(name)?[...v,...nn]:v).map(v=>v.toFixed(6)).join(',');if(!map.has(key)){map.set(key,position.length/3);position.push(...v);normal.push(...nn);}index.push(map.get(key));}g.dispose();}return {name:mat+' truck surfaces',material:mat,features:[...new Set(entries.map(e=>e.name))],position,normal,index,triangles:index.length/3};}
const raw=[...groups].map(([m,e])=>merge(m,e));
function reduce(p,target){const [indices,error]=opt.simplify(new Uint32Array(p.index),new Float32Array(p.position),3,Math.floor(target)*3,.035,['ErrorAbsolute']);const [remap,count]=opt.compactMesh(indices),position=new Float32Array(count*3),normal=new Float32Array(count*3);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){position.set(p.position.slice(i*3,i*3+3),remap[i]*3);normal.set(p.normal.slice(i*3,i*3+3),remap[i]*3);}return {...p,position:Array.from(position),normal:Array.from(normal),index:Array.from(indices),triangles:indices.length/3,sourceTriangles:p.triangles,errorWorld:error};}
const rawTotal=raw.reduce((n,p)=>n+p.triangles,0),author=raw.map(p=>reduce(p,p.triangles*30000/rawTotal)); const total=author.reduce((n,p)=>n+p.triangles,0),low=author.map(p=>reduce(p,p.triangles*10000/total));
function save(name,parts){const data={schema:1,kind:'canvas cargo truck',source:'Authored softened panels, tires and supported folded canvas. Reduced mesh derives directly from saved author vertices via meshoptimizer.',sourceTriangles:parts===author?rawTotal:total,reduction:parts===author?"Parametric source to author mesh":"Saved author surface vertices to gameplay mesh",triangles:parts.reduce((n,p)=>n+p.triangles,0),parts:parts.map(p=>({...p,position:p.position.map(v=>+v.toFixed(7)),normal:p.normal.map(v=>+v.toFixed(6))}))};fs.writeFileSync(new URL('../dist/tactics/'+name,import.meta.url),JSON.stringify(data)+'\n');console.log(name,data.triangles,parts.map(p=>[p.material,p.triangles,p.errorWorld??0]));}
save('canvas-truck-author-data.json',author);save('canvas-truck-10k-data.json',low);
