import * as T from './vendor/three.module.js';
import {NATURAL_ARCH_PAINT,ARCH_ELEVATION_PLAN} from './natural-arch-data.js';
import {createNaturalArchLibrary} from './natural-rock-arches.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createBattlePosture} from './battle-posture.js';
import {createModelPaint} from './horse-model-paint.js';
import {createPaintedGrass} from './painted-grass.js';

const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),loader=new T.TextureLoader(),abort=new AbortController();
for(const p of ANIMAL_MOTION_CATALOG)$('animal').add(new Option(p.label,p.id));$('animal').value='donkey';
for(const id of ['arch','view','scale','animal','detail'])if(params.has(id)&&[...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
for(const id of ['grid','guides','road','banks','grey','wire'])if(params.has(id))$(id).checked=params.get(id)==='1';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x303b32);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(),ground=new T.Mesh(new T.PlaneGeometry(90,90),createPaintedGrass());ground.rotation.x=-Math.PI/2;ground.position.y=-.015;ground.receiveShadow=true;scene.add(ground);
scene.add(new T.HemisphereLight(0xfff0d8,0x586957,2.1));const sun=new T.DirectionalLight(0xffe8c8,2);sun.position.set(-10,17,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:17,bottom:-17,near:.1,far:70});sun.shadow.normalBias=.035;scene.add(sun);
const grid=new T.GridHelper(60,60,0xa0a181,0x858a6d);grid.position.set(0,.005,0);grid.material.transparent=true;grid.material.opacity=.45;scene.add(grid);
const objects=new T.Group(),guides=new T.Group(),roads=new T.Group(),banks=new T.Group();scene.add(objects,guides,roads,banks);
let library,arches=[],actors=[],atlas,paintTexture,profileData,observer,ready=false,disposed=false,orbit=0,tilt=0,drag,loadVersion=0,labels=[],lastFrame;
const temporary=[];
const remember=o=>{temporary.push(o);return o;};
function line(points,color=0xe2c883){const l=new T.Line(remember(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)))),remember(new T.LineBasicMaterial({color})));guides.add(l);return l;}
function label(text,p,views){const e=document.createElement('span');e.className='arch-label';e.textContent=text;$('labels').append(e);labels.push({element:e,point:new T.Vector3(...p),views});}
function clear(){for(const a of arches)a.remove();arches=[];for(const a of actors){a.worker.root.removeFromParent();a.paint.dispose();a.worker.skeleton.dispose();a.worker.dispose();}actors=[];for(const g of [guides,roads,banks])g.clear();temporary.splice(0).forEach(r=>r.dispose());labels.forEach(x=>x.element.remove());labels=[];}
function makeActor(x,y,z,heading){
 const p=ANIMAL_MOTION_CATALOG.find(p=>p.id===$('animal').value),worker=p.create(profileData),paint=createModelPaint(renderer,worker,paintTexture,{species:p.id,frame:p.frame}),posture=createBattlePosture(worker,p);
 worker.pose('neutral');posture.apply({heading,distance:0,blend:0,pose:{}},{equipment:false});posture.ground();worker.root.position.add(new T.Vector3(x,y,z));worker.root.updateMatrixWorld(true);worker.skeleton.update();
 if(worker.weapon?.root)worker.weapon.root.visible=false;
 for(const part of worker.parts){part.material=paint.material;part.castShadow=part.receiveShadow=true;}objects.add(worker.root);actors.push({worker,paint});return worker;
}
function road(x,opening){
 const width=opening===8?6:2,length=15,mat=remember(new T.MeshStandardMaterial({color:0x6b6c5e,roughness:1})),mesh=new T.Mesh(remember(new T.PlaneGeometry(width,length)),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.008,0);mesh.receiveShadow=true;roads.add(mesh);
 const stripe=remember(new T.MeshStandardMaterial({color:0xc9c7a1,roughness:1}));
 for(const side of [-1,1]){const m=new T.Mesh(remember(new T.PlaneGeometry(.035,length)),stripe);m.rotation.x=-Math.PI/2;m.position.set(x+side*(width/2-.08),.012,0);roads.add(m);}
 for(let z=-7;z<=7;z+=2){const m=new T.Mesh(remember(new T.PlaneGeometry(.035,.7)),stripe);m.rotation.x=-Math.PI/2;m.position.set(x,.013,z);roads.add(m);}
}
function connection(x,H,w,side){const m=new T.Mesh(remember(new T.BoxGeometry(2,.14,2)),remember(new T.MeshStandardMaterial({color:0x8d9471,roughness:1})));m.position.set(x+side*(w/2+1),H-.07,0);m.receiveShadow=true;banks.add(m);}
function rebuild(){
 if(!ready||disposed)return;clear();const kinds=$('arch').value==='pair'?['large','small']:[$('arch').value];
 kinds.forEach((kind,i)=>{
  const x=kinds.length===2?(i===0?-4.8:7.7):0,a=library.build(kind,{detail:$('detail').value}),s=a.layout;a.root.position.x=x;objects.add(a.root);arches.push(a);
  const {width:w,opening:c,height:H}=s;
  makeActor(x+(kind==='large'?-2.4:-.65),0,0,90);makeActor(x+(kind==='large'?1.1:.5),H,0,0);
  road(x,c);for(const side of [-1,1])connection(x,H,w,side);
  const y=H+.025;
  for(let j=0;j<=w;j++)line([[x-w/2+j,y,-1],[x-w/2+j,y,1]],0xe1d39d);
  for(const z of [-1,0,1])line([[x-w/2,y,z],[x+w/2,y,z]],0xe1d39d);
  // Ground opening and the separate six-tile roadway are measured at the front.
  const front=2.35;line([[x-c/2,.025,front],[x+c/2,.025,front]],0xecd598);
  for(let j=0;j<=c;j++)line([[x-c/2+j,.025,front-.13],[x-c/2+j,.025,front+.13]],0xecd598);
  label(c+'-tile clear opening',[x,.07,front+.45],['game','front','top','rear']);label('2-tile upper route',[x-w*.13,H+.16,-.4]);
  for(const side of [-1,1]){
   const ruler=x+side*(w/2+.35);line([[ruler,0,front],[ruler,H,front]],0xb8c2a0);
   for(let j=0;j<=s.rise;j++){
    const h=j*ARCH_ELEVATION_PLAN.spacing;line([[ruler-.12,h,front],[ruler+.12,h,front]],0xb8c2a0);
    if(side===1)label('Layer '+(j+1)+(j===0?' · road':j===s.rise?' · top':''),[ruler+.8,h,front],['front','game','side']);
   }
  }
  if(kind==='large'){
   label('6-tile road',[x,.05,5.9],['game','top']);
   for(const side of [-1,1]){line([[x+side*3,.035,4.0],[x+side*4,.035,4.0]],0xb4d5a5);label('1 tile clear',[x+side*3.5,.10,4.65],['game','top']);}
  }
  label(s.label+' · layer '+(s.topLevel+1),[x-w*.12,H+1.5,0],['game','front','rear','top']);
 });frame();
}
async function loadActor(){
 const mine=++loadVersion,p=ANIMAL_MOTION_CATALOG.find(p=>p.id===$('animal').value);$('loading').hidden=false;
 const results=await Promise.allSettled([fetch(p.file,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Character mesh unavailable');return r.json();}),loader.loadAsync(p.paint)]);
 if(mine!==loadVersion||disposed){if(results[1].status==='fulfilled')results[1].value.dispose();return;}
 if(results.some(r=>r.status==='rejected')){if(results[1].status==='fulfilled')results[1].value.dispose();throw Error('Character could not load');}
 clear();paintTexture?.dispose();profileData=results[0].value;paintTexture=results[1].value;paintTexture.colorSpace=T.SRGBColorSpace;$('loading').hidden=true;rebuild();
}
function frame(){
 if(!ready||disposed)return;const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);library.setStyle({grey:$('grey').checked,wire:$('wire').checked});grid.visible=$('grid').checked;guides.visible=$('guides').checked;roads.visible=$('road').checked;banks.visible=$('banks').checked;
 const under=$('view').value==='under';ground.visible=!under;roads.visible&&=!under;grid.visible&&=!under;
 const box=new T.Box3();for(const a of arches)box.expandByObject(a.root);if(banks.visible)box.expandByObject(banks);if(roads.visible)box.expandByObject(roads);
 box.max.y+=1.85;box.min.y=Math.min(0,box.min.y);const focus=box.getCenter(new T.Vector3()),view=$('view').value,az=({game:.61,front:0,side:Math.PI/2,top:0,rear:Math.PI,under:.42})[view]+orbit,el=T.MathUtils.clamp(({game:.52,front:0,side:.02,top:Math.PI/2-.0001,rear:.04,under:-.42})[view]+tilt,-.7,Math.PI/2-.0001);
 camera.up.set(0,1,0);camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(45));camera.lookAt(focus);camera.updateMatrixWorld(true);
 const screen=new T.Box3();for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])screen.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 let ppu=$('scale').value==='game'?55:$('scale').value==='close'?95:Math.min(110,(width-150)/(screen.max.x-screen.min.x+.1),(height-80)/(screen.max.y-screen.min.y+.1));
 camera.left=-width/ppu/2;camera.right=width/ppu/2;camera.top=height/ppu/2;camera.bottom=-height/ppu/2;camera.near=.1;camera.far=120;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.render(scene,camera);
 for(const l of labels){const p=l.point.clone().project(camera);l.element.style.left=((p.x+1)*width/2)+'px';l.element.style.top=((1-p.y)*height/2)+'px';l.element.hidden=!$('guides').checked||p.z< -1||p.z>1||view==='under'||(l.views&&!l.views.includes(view));}
 const triangles=arches.reduce((n,a)=>n+a.mesh.geometry.userData.triangles,0),minClearance=Math.min(...arches.map(a=>a.mesh.geometry.userData.minPassageCeiling));
 const layers=arches.map(a=>a.layout.topLevel+1).join(' and ');
 $('status').textContent='Top on layer'+(arches.length>1?'s ':' ')+layers+' · ground is layer 1 · '+triangles.toLocaleString()+' arch triangles · '+Math.round(ppu)+' px/tile · passage-centre ceiling ≥ '+minClearance.toFixed(2)+' · native '+$('animal').selectedOptions[0].textContent+' scale · top routes exactly 2 tiles wide';
 const query=new URLSearchParams();for(const id of ['arch','view','scale','animal','detail'])query.set(id,$(id).value);for(const id of ['grid','guides','road','banks','grey','wire'])query.set(id,$(id).checked?'1':'0');history.replaceState(null,'','?'+query);
 lastFrame={arch:$('arch').value,view,detail:$('detail').value,ppu,triangles,minClearance,drawCalls:renderer.info.render.calls,submittedTriangles:renderer.info.render.triangles,layouts:arches.map(a=>a.layout),resources:{...renderer.info.memory}};return lastFrame;
}
function dispose(){if(disposed)return;disposed=true;ready=false;abort.abort();observer?.disconnect();clear();library?.dispose();atlas?.dispose();paintTexture?.dispose();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();sun.shadow.dispose();renderer.dispose();window.naturalArchStudyDisposed=true;}
addEventListener('pagehide',dispose,{once:true});
try{
 atlas=await loader.loadAsync(NATURAL_ARCH_PAINT);
 if(disposed){atlas.dispose();atlas=null;}
 else{library=createNaturalArchLibrary(atlas);ready=true;await loadActor();}
 if(!disposed){
  for(const id of ['arch','detail'])$(id).onchange=rebuild;
  for(const id of ['view','scale','grid','guides','road','banks','grey','wire'])$(id).onchange=()=>{orbit=tilt=0;frame();};
  $('animal').onchange=()=>loadActor().catch(error=>{$('error').textContent=error.message;console.error(error);});$('reset').onclick=()=>{orbit=tilt=0;frame();};
  host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,orbit,tilt};};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.004;frame();};host.onpointerup=host.onpointercancel=()=>drag=null;
  observer=new ResizeObserver(frame);observer.observe(host);
  window.naturalArchStudy={ready:true,scene,camera,renderer,get arches(){return arches;},get actors(){return actors;},get state(){return lastFrame;},set(values){for(const [id,v]of Object.entries(values)){const e=$(id);if(e?.type==='checkbox')e.checked=!!v;else if(e)e.value=v;}orbit=tilt=0;rebuild();return lastFrame;},frame,dispose};frame();
 }
}catch(error){if(!disposed){$('loading').hidden=true;$('error').textContent=error.message;console.error(error);}dispose();}
