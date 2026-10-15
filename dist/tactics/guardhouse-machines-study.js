import * as T from './vendor/three.module.js';
import {createGuardhouseMachineLibrary,GUARDHOUSE_MACHINE_PAINT} from './guardhouse-machines.js';
import {createFurnitureLibrary} from './painted-furniture.js';
import {PAINTED_ATLAS} from './painted-environment-scene.js';
import {CARGO_ATLAS} from './painted-cargo.js';
import {createLightHorse} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),abort=new AbortController();
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x343c35);const camera=new T.OrthographicCamera(-4,4,3,-3,.01,80),loader=new T.TextureLoader();
scene.add(new T.HemisphereLight(0xfff1d2,0x68726b,2.1));const sun=new T.DirectionalLight(0xffedcd,2.1);sun.position.set(3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});sun.shadow.bias=-.0003;sun.shadow.normalBias=.006;scene.add(sun);
const fill=new T.DirectionalLight(0xdfebef,.6);fill.position.set(-5,3,0);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshStandardMaterial({color:0x85836a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
const models=new T.Group(),house=new T.Group(),footprints=new T.Group();scene.add(models,house,footprints);
const lineMaterial=new T.LineBasicMaterial({color:0xd7c287,transparent:true,opacity:.65});
let library,furniture,horse,paint,textures=[],selected=[],footGeometries=[],ready=false,disposed=false,initializing=true,released=false,observer,drag,orbit=0,tilt=0,floorY=0,sillY=.825,backZ=-1.4;
for(const key of ['asset','screen','context','view','scale'])if([...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
for(const key of ['horse','grey','footprint'])if(params.has(key))$(key).checked=params.get(key)!=='0';
function setupHouse(){
 const shell=furniture.build('iron-ladder-tower').root,{deckHeight:H,coreOffsetX}=shell.userData.stairTower;shell.updateMatrixWorld(true);
 const toRoom=new T.Matrix4().makeTranslation(-coreOffsetX,-H,0),wallParts=[];
 shell.traverse(part=>{
  if(!part.isMesh||!['house-wall','house-lintel','window-post','window-sill','guardhouse-floor','door-wall'].includes(part.name))return;
  const copy=new T.Mesh(part.geometry,part.material);copy.name=part.name;copy.applyMatrix4(toRoom.clone().multiply(part.matrixWorld));copy.castShadow=copy.receiveShadow=true;house.add(copy);
  const bounds=new T.Box3().setFromObject(copy);
  copy.userData.backWall=bounds.max.z< -1.30;copy.userData.frontWall=bounds.min.z>1.30;copy.userData.floor=part.name==='guardhouse-floor';
  if(copy.userData.floor)floorY=Math.max(floorY,bounds.max.y);
  if(copy.name==='window-sill'&&copy.userData.backWall)sillY=bounds.min.y;
  if(copy.name==='house-wall'&&copy.userData.backWall)wallParts.push(bounds);
 });
 backZ=Math.max(...wallParts.map(b=>b.max.z));
}
function rebuild(){
 for(const m of selected)m.dispose();selected=[];models.clear();footprints.clear();for(const g of footGeometries)g.dispose();footGeometries=[];
 const ids=$('asset').value==='pair'?['computer','telephone']:[$('asset').value];
 ids.forEach((id,i)=>{
  const model=library.build(id,{screen:$('screen').value}),x=ids.length===2?i-.5:0;
  model.root.position.set(x,floorY,backZ+.40+.003);models.add(model.root);selected.push(model);
  const z=model.root.position.z,p=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]].map(([a,b])=>new T.Vector3(a+x,floorY+.005,b+z)),g=new T.BufferGeometry().setFromPoints(p);footGeometries.push(g);footprints.add(new T.Line(g,lineMaterial));
 });
 library.setGrey($('grey').checked);
 for(const p of house.children)p.visible=$('context').value==='room'?!p.userData.frontWall:$('context').value==='wall'?p.userData.backWall||p.userData.floor:false;
 horse.root.position.set($('context').value==='room'?1.0:1.65,floorY,$('context').value==='room'?.35:.2);horse.root.visible=$('horse').checked;
 footprints.visible=$('footprint').checked;frame();
}
function frame(){
 if(!ready||disposed)return;
 const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);
 const context=$('context').value,view=$('view').value,focus=new T.Vector3(0,.75,-.60);
 let azimuth=({three:.48,front:0,side:Math.PI/2,top:0,rear:Math.PI})[view]+orbit,elevation=Math.max(.03,Math.min(Math.PI/2-.001,({three:.53,front:.06,side:.055,top:Math.PI/2-.001,rear:.25})[view]+tilt));
 camera.position.copy(focus).add(new T.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(14));camera.lookAt(focus);camera.updateMatrixWorld(true);
 let ppu=58;
 if($('scale').value==='close'){
  const bounds=new T.Box3();for(const m of selected)bounds.union(new T.Box3().setFromObject(m.root));
  if(context!=='isolated')for(const p of house.children)if(p.visible)bounds.union(new T.Box3().setFromObject(p));
  if(horse.root.visible){const p=horse.root.position;bounds.union(new T.Box3(new T.Vector3(p.x-.45,floorY,p.z-.45),new T.Vector3(p.x+.45,floorY+1.75,p.z+.45)));}
  const projected=new T.Box3();for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const middle=projected.getCenter(new T.Vector3());camera.position.add(new T.Vector3(middle.x,middle.y,0).applyQuaternion(camera.quaternion));ppu=Math.min(500,(w-60)/(projected.max.x-projected.min.x+.25),(h-60)/(projected.max.y-projected.min.y+.25));
 }
 camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.render(scene,camera);
 let triangles=0,maxHeight=0;for(const m of selected){m.root.traverse(p=>{if(p.isMesh)triangles+=(p.geometry.index?.count||p.geometry.attributes.position.count)/3;});maxHeight=Math.max(maxHeight,new T.Box3().setFromObject(m.root).max.y-floorY);}
 const gap=sillY-floorY-maxHeight;$('status').textContent=selected.length+' module'+(selected.length===1?'':'s')+' · '+triangles+' triangles · '+maxHeight.toFixed(2)+' high · '+gap.toFixed(3)+' below the actual sill · '+Math.round(ppu)+' px/tile';
 window.guardhouseMachineState={asset:$('asset').value,screen:$('screen').value,context,view,grey:$('grey').checked,scale:$('scale').value,triangles,height:maxHeight,sill:sillY,floor:floorY,clearance:gap,backGap:.003,ppu,resources:{...renderer.info.memory},library:library.stats()};
 return window.guardhouseMachineState;
}
function releaseResources(){if(released)return;released=true;for(const m of selected)m.dispose();library?.dispose();furniture?.dispose();paint?.dispose();horse?.skeleton.dispose();horse?.dispose();for(const t of textures)if(!paint||t!==textures[3])t.dispose();for(const g of footGeometries)g.dispose();lineMaterial.dispose();floor.geometry.dispose();floor.material.dispose();sun.shadow.dispose();renderer.dispose();window.guardhouseMachinesDisposed=true;}
function dispose(){if(disposed)return;disposed=true;window.guardhouseMachinesReady=false;abort.abort();observer?.disconnect();if(!initializing)releaseResources();}
addEventListener('pagehide',dispose,{once:true});
try{
 const loaded=await Promise.allSettled([GUARDHOUSE_MACHINE_PAINT,PAINTED_ATLAS,CARGO_ATLAS,MODEL_PAINT].map(url=>loader.loadAsync(url)));
 textures=loaded.filter(r=>r.status==='fulfilled').map(r=>r.value);if(disposed)throw Error('Study closed');if(loaded.some(r=>r.status==='rejected'))throw Error('Console paint failed to load');
 for(const t of textures){t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 const response=await fetch('./horse-10k-data.json',{signal:abort.signal});if(!response.ok)throw Error('Horse model failed to load');const data=await response.json();if(disposed)throw Error('Study closed');
 library=createGuardhouseMachineLibrary(textures[0]);furniture=createFurnitureLibrary(textures[1],textures[2]);setupHouse();
 horse=createLightHorse(data);horse.pose('neutral',-35);paint=createModelPaint(renderer,horse,textures[3]);for(const part of horse.parts){part.material=paint.material;part.castShadow=part.receiveShadow=true;}scene.add(horse.root);
 ready=true;window.guardhouseMachinesStudy={set(options){for(const [key,value]of Object.entries(options)){const control=$(key);if(!control)continue;if(control.type==='checkbox')control.checked=!!value;else if([...control.options||[]].some(o=>o.value===String(value)))control.value=value;}orbit=tilt=0;rebuild();return frame();},frame,dispose,renderer,scene,camera,house,library,get selected(){return selected;}};
 for(const id of ['asset','screen','context','view','scale','horse','grey','footprint'])$(id).onchange=()=>{if(id==='view')orbit=tilt=0;rebuild();};
 $('reset').onclick=()=>{orbit=tilt=0;frame();};host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,orbit,tilt};};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.004;frame();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(frame);observer.observe(host);rebuild();$('loading').hidden=true;window.guardhouseMachinesReady=true;
}catch(error){if(!disposed){$('error').textContent=error?.message||'Unable to load consoles';$('loading').hidden=true;console.error(error);dispose();}}
finally{initializing=false;if(disposed)releaseResources();}
