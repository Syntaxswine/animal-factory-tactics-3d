import fs from 'node:fs';import{createRequire}from'node:module';import * as T from '../dist/tactics/vendor/three.module.js';import{softBox}from'../dist/tactics/painted-environment-scene.js';
const opt=createRequire(import.meta.url)('./vendor/meshoptimizer/meshopt_simplifier.cjs');await opt.ready;
for(const kind of ['lathe','mill','press']){
 const groups=new Map();
 function add(name,mat,g,p=[0,0,0],r=[0,0,0]){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...r)),new T.Vector3(1,1,1)));if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push({name,g});}
 const box=(name,mat,p,s,r=[0,0,0],bevel=.025)=>add(name,mat,softBox(...s,bevel,5),p,r);
 const cyl=(name,mat,p,r,h,rot=[0,0,0])=>add(name,mat,new T.CylinderGeometry(r,r,h,64,4),p,rot);
 function rod(name,mat,a,b,r=.022){const av=new T.Vector3(...a),bv=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,av.distanceTo(bv),24,2);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),bv.clone().sub(av).normalize()));add(name,mat,g,av.add(bv).multiplyScalar(.5).toArray());}
 function wheel(x,y,z,r=.17){add('open handwheel rim','metal',new T.TorusGeometry(r,.018,12,48),[x,y,z],[0,Math.PI/2,0]);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod('handwheel spoke','metal',[x,y,z],[x,y+Math.sin(a)*r,z+Math.cos(a)*r],.014);}cyl('wheel hub','metal',[x,y,z],.044,.06,[0,0,Math.PI/2]);rod('crank handle','metal',[x,y-r,z],[x+.11,y-r,z],.023);}
 function gauge(x,y,z,r=.075){cyl('gauge casing','brass',[x,y,z],r,.03,[0,0,Math.PI/2]);cyl('cream gauge face','lamps',[x+.019,y,z],r*.82,.008,[0,0,Math.PI/2]);rod('gauge needle','metal',[x+.025,y,z],[x+.025,y+r*.45,z+r*.28],.006);}
 function motor(x,y,z,r=.19,length=.32){cyl('ribbed motor body','metal',[x,y,z],r,length,[Math.PI/2,0,0]);for(let i=0;i<12;i++){const a=i*Math.PI/6;box('motor cooling rib','metal',[x+Math.sin(a)*r,y+Math.cos(a)*r,z],[.032,.032,length*.82],[0,0,-a],.006);}box('motor terminal box','metal',[x,y+r+.04,z],[.15,.08,.18]);}
 function bolts(xspan,zspan,y){for(const x of [-xspan,xspan])for(const z of [-zspan,zspan])cyl('mounting bolt','metal',[x,y,z],.045,.055);}
 if(kind==='lathe'){
  for(const z of [-.99,.99]){box('cast pedestal foot','body',[0,.08,z],[1.13,.16,.66]);box('pedestal cabinet','body',[0,.46,z],[.82,.78,.48]);box('recessed access panel','metal',[.419,.45,z],[.016,.48,.32]);box('painted access cover','body',[.434,.45,z],[.025,.43,.27]);}
  box('lathe cast bed','body',[0,.86,0],[.82,.18,2.76]);for(const x of [-.245,.245])box('parallel bed way','metal',[x,.987,0],[.16,.075,2.63]);
  box('headstock','body',[0,1.30,-.99],[.85,.69,.64]);box('headstock top cap','body',[0,1.67,-1.00],[.89,.10,.67]);motor(0,1.36,-1.38,.22,.19);
  cyl('chuck spindle','metal',[0,1.36,-.60],.12,.15,[Math.PI/2,0,0]);cyl('three jaw chuck','metal',[0,1.36,-.48],.26,.16,[Math.PI/2,0,0]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;box('chuck jaw','metal',[Math.sin(a)*.16,1.36+Math.cos(a)*.16,-.378],[.11,.13,.064],[0,0,-a],.009);}
  box('carriage','body',[0,1.06,.12],[1.02,.14,.48]);box('cross slide','metal',[0,1.175,.12],[.55,.12,.32]);box('tool post','metal',[0,1.30,.12],[.23,.16,.22]);rod('tool post lever','metal',[0,1.39,.12],[.31,1.53,.12],.022);
  box('carriage apron','body',[.52,.89,.12],[.15,.33,.48]);wheel(.64,.91,.12,.16);gauge(.446,1.31,-1.0,.105);gauge(.60,.83,.29,.055);
  cyl('lead screw','metal',[.48,.83,0],.026,2.40,[Math.PI/2,0,0]);for(let i=0;i<55;i++)add('lead screw thread','metal',new T.TorusGeometry(.030,.006,6,12),[.48,.83,-1.16+i*.042]);
  box('tailstock slide','body',[0,1.07,1.0],[.70,.15,.48]);box('tailstock','body',[0,1.29,1.02],[.44,.33,.39]);cyl('tailstock quill','metal',[0,1.36,.76],.072,.20,[Math.PI/2,0,0]);add('tailstock center','metal',new T.ConeGeometry(.072,.15,48),[0,1.36,.61],[-Math.PI/2,0,0]);
  cyl('tailstock handwheel','brass',[0,1.36,1.30],.15,.055,[Math.PI/2,0,0]);rod('tailstock crank','metal',[.10,1.28,1.32],[.10,1.28,1.44]);
  bolts(.45,1.12,.18);
 }else if(kind==='mill'){
  box('wide plinth','body',[0,.09,0],[1.64,.18,2.66]);box('cast rear column','body',[0,1.14,-.84],[.82,2.05,.68]);
  box('vertical slide','metal',[0,1.04,-.46],[.55,1.60,.075]);for(const x of [-.22,.22])box('slide polished rail','metal',[x,1.05,-.405],[.07,1.55,.07]);
  box('upper ram','body',[0,2.23,-.20],[.86,.33,1.60]);box('spindle head','body',[0,2.04,.48],[.68,.53,.59]);cyl('spindle collar','metal',[0,1.74,.48],.17,.15);cyl('downward spindle','metal',[0,1.60,.48],.083,.16);add('cutting bit','metal',new T.ConeGeometry(.045,.12,48),[0,1.47,.48],[Math.PI,0,0]);motor(0,2.52,-.56,.23,.59);
  box('knee pedestal','body',[0,.55,.19],[.90,.70,1.16]);box('knee carriage','body',[0,.89,.36],[1.10,.18,1.44]);box('worktable underframe','metal',[0,1.01,.40],[1.60,.12,1.46]);
  for(let i=0;i<4;i++)box('flat slotted table rail','metal',[(i-1.5)*.40,1.105,.40],[.378,.075,1.50]);wheel(.67,.69,.27,.19);wheel(.82,.94,.63,.12);gauge(.434,1.84,-.41,.095);gauge(.354,2.07,.53,.065);bolts(.70,1.17,.20);
 }else{
  box('press plinth','metal',[0,.10,0],[1.80,.20,2.62]);
  for(const x of [-.62,.62]){box('column foot','body',[x,.23,-.13],[.52,.18,1.02]);box('portal upright','body',[x,1.28,-.19],[.30,2.22,.63]);box('upright inner guide','metal',[x-Math.sign(x)*.17,1.27,-.08],[.045,1.81,.36]);box('crosshead end cap','body',[x,2.30,-.18],[.40,.39,.70]);}
  box('portal crosshead','body',[0,2.32,-.18],[1.48,.35,.63]);box('center ram','metal',[0,1.91,-.12],[.36,.61,.37]);box('upper die platen','metal',[0,1.58,-.05],[.79,.18,.67]);
  box('die table support','metal',[0,.49,-.06],[.68,.59,.59]);box('lower die table','metal',[0,.85,-.05],[1.10,.21,.91]);for(const x of [-.32,0,.32])box('table die slot','dark',[x,.958,-.05],[.027,.004,.83],[],.001);
  for(let i=0;i<5;i++)box('cream safety stripe','lamps',[(i-2)*.20,.85,.412],[.115,.12,.008],[0,0,.30],.002);
  // Flywheel lies on the rear face: a true open rim with six spokes.
  add('open flywheel rim','metal',new T.TorusGeometry(.60,.075,20,96),[0,1.78,-.72]);cyl('flywheel hub','metal',[0,1.78,-.72],.15,.20,[Math.PI/2,0,0]);for(let i=0;i<6;i++){const a=i*Math.PI/3;rod('flywheel spoke','metal',[0,1.78,-.72],[Math.sin(a)*.57,1.78+Math.cos(a)*.57,-.72],.044);}
  motor(0,.56,-1.04,.25,.45);box('control box','body',[.80,1.12,.04],[.13,.36,.27]);gauge(.81,1.69,-.15,.11);cyl('stop button','body',[.884,1.20,.04],.043,.025,[0,0,Math.PI/2]);bolts(.73,1.08,.22);
 }
 // Weld position+normal pairs, preserving hard-edge normals rather than flattening creases.
 const raw=[...groups].map(([material,entries])=>{const position=[],normal=[],index=[],map=new Map();for(const {g}of entries){const p=g.attributes.position,n=g.attributes.normal,ids=g.index?.array??Array.from({length:p.count},(_,i)=>i);for(const j of ids){const vals=[p.getX(j),p.getY(j),p.getZ(j),n.getX(j),n.getY(j),n.getZ(j)],key=vals.map(v=>v.toFixed(6)).join(',');if(!map.has(key)){map.set(key,position.length/3);position.push(...vals.slice(0,3));normal.push(...vals.slice(3));}index.push(map.get(key));}g.dispose();}return{name:material+' surfaces',material,features:[...new Set(entries.map(e=>e.name))],position,normal,index,triangles:index.length/3};});
 function reduce(p,target){const[indices,error]=opt.simplifyWithAttributes(new Uint32Array(p.index),new Float32Array(p.position),3,new Float32Array(p.normal),3,[.10,.10,.10],null,Math.floor(target)*3,.025,['ErrorAbsolute','Permissive']);const[remap,count]=opt.compactMesh(indices),position=new Float32Array(count*3),normal=new Float32Array(count*3);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){position.set(p.position.slice(i*3,i*3+3),remap[i]*3);normal.set(p.normal.slice(i*3,i*3+3),remap[i]*3);}return{...p,position:Array.from(position),normal:Array.from(normal),index:Array.from(indices),triangles:indices.length/3,sourceTriangles:p.triangles,errorWorld:error};}
 const ground=Math.min(...raw.map(p=>{let min=Infinity;for(let i=1;i<p.position.length;i+=3)min=Math.min(min,p.position[i]);return min;}));for(const p of raw)for(let i=1;i<p.position.length;i+=3)p.position[i]-=ground;
 const rawTotal=raw.reduce((n,p)=>n+p.triangles,0),author=raw.map(p=>reduce(p,p.triangles*Math.min(1,30000/rawTotal))),total=author.reduce((n,p)=>n+p.triangles,0);
 const save=(stage,parts,sourceTriangles)=>{const data={schema:1,kind,tiles:[2,3],stage,sourceTriangles,triangles:parts.reduce((n,p)=>n+p.triangles,0),parts};fs.writeFileSync(new URL('../dist/tactics/machine-'+kind+'-'+stage+'-data.json',import.meta.url),JSON.stringify(data));return data;};
 save('author',author,rawTotal);
 // Reduction reads the saved author artifact as its sole geometry input.
 const saved=JSON.parse(fs.readFileSync(new URL('../dist/tactics/machine-'+kind+'-author-data.json',import.meta.url))),low=saved.parts.map(p=>reduce(p,p.triangles*10000/total));save('10k',low,total);console.log(kind,rawTotal,total,low.reduce((n,p)=>n+p.triangles,0));
}
