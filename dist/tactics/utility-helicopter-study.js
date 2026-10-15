import * as T from './vendor/three.module.js';
import {createUtilityHelicopter,HELICOPTER_PAINT,HELICOPTER_GROUND} from './utility-helicopter.js';
import {createHelicopterSmoke,HELICOPTER_SMOKE} from './utility-helicopter-smoke.js';
import {createCanvasTruck} from './canvas-truck.js';
import {createTruckPaint,TRUCK_PAINT} from './canvas-truck-paint.js';
import {createLightHorse} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),abort=new AbortController();
for(const id of ['mode','view','scale'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
for(const id of ['truck','horse','grey','grid','smoke'])if(params.has(id))$(id).checked=params.get(id)!=='0';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x333e38);const camera=new T.OrthographicCamera(-8,8,6,-6,.01,120);
scene.add(new T.HemisphereLight(0xfff1d7,0x627060,2.0));const sun=new T.DirectionalLight(0xffeed9,2.0);sun.position.set(5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.1,far:40});sun.shadow.bias=-.0003;sun.shadow.normalBias=.006;scene.add(sun);const fill=new T.DirectionalLight(0xdceaf4,.65);fill.position.set(-5,5,-6);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:0x8a8668,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.014;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(40,40,0xb1aa89,0xa29b7d);grid.position.y=-.008;scene.add(grid);
let atlas,groundTexture,smokeTexture,smoke,truckTexture,horseTexture,aircraft,truck,truckPaint,horse,horsePaint,ready=false,disposed=false,released=false,initializing=true,observer,orbit=0,tilt=0,drag;
let smokeTime=params.has('time')&&Number.isFinite(Number(params.get('time')))?Math.max(0,Number(params.get('time'))):3,paused=params.has('paused')?params.get('paused')!=='0':matchMedia('(prefers-reduced-motion: reduce)').matches,smokeActive=false,animation=null,lastTick=null;
function canDrift(){return ready&&!disposed&&smokeActive&&!paused&&!document.hidden;}
function tick(now){
 animation=null;if(!canDrift())return;
 if(lastTick!==null)smokeTime+=Math.min(.10,(now-lastTick)/1000);lastTick=now;
 smoke.update(smokeTime,camera,true);renderer.render(scene,camera);window.helicopterState.smoke.time=smokeTime;animation=requestAnimationFrame(tick);
}
function queueSmoke(){if(animation!==null)cancelAnimationFrame(animation);animation=null;lastTick=null;if(canDrift())animation=requestAnimationFrame(tick);}
function frame(){
 if(!ready||disposed)return;const mode=$('mode').value,pair=['pair','crashes'].includes(mode),grey=$('grey').checked,shown=mode==='pair'?['intact','crashed']:mode==='crashes'?['survivable','crashed']:[mode];
 for(const a of aircraft){const i=shown.indexOf(a.root.userData.helicopter.state);a.root.visible=i>=0;a.root.position.set(0,0,pair?(i===0?-3.2:3.2):0);a.setGrey(grey);}
 truck.root.visible=$('truck').checked;truck.root.position.set(3.4,0,pair?-6.2:-3.5);truck.setGrey(grey);if(!grey)truck.parts.forEach((p,i)=>p.material=truckPaint.materials[i]);
 horse.root.visible=$('horse').checked;if(shown.includes('survivable'))horse.root.position.set(.70,0,2.55+(pair?-3.2:0));else horse.root.position.set(5.9,0,pair?-4.6:-2.35);for(const p of horse.parts)p.material=grey?horse.grey:horsePaint.material;grid.visible=$('grid').checked;
 const objects=[...aircraft.map(a=>a.root),truck.root,horse.root].filter(o=>o.visible),bounds=new T.Box3();for(const o of objects){o.updateMatrixWorld(true);bounds.union(new T.Box3().setFromObject(o));}
 smokeActive=shown.includes('survivable')&&$('smoke').checked&&!grey;if(smokeActive)bounds.union(smoke.bounds());
 const focus=bounds.getCenter(new T.Vector3()),view=$('view').value,az=({three:.82,side:Math.PI/2,front:0,rear:Math.PI,top:0})[view]+orbit,el=Math.max(.015,Math.min(Math.PI/2-.001,({three:.50,side:.07,front:.12,rear:.13,top:Math.PI/2-.001})[view]+tilt));
 camera.position.copy(focus).add(new T.Vector3(Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)).multiplyScalar(35));camera.up.set(0,1,0);camera.lookAt(focus);camera.updateMatrixWorld(true);
 const projected=new T.Box3();for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);const mid=projected.getCenter(new T.Vector3());camera.position.add(new T.Vector3(mid.x,mid.y,0).applyQuaternion(camera.quaternion));
 const ppu=$('scale').value==='game'?58:Math.min(180,(width-56)/(projected.max.x-projected.min.x),(height-56)/(projected.max.y-projected.min.y));camera.left=-width/(2*ppu);camera.right=width/(2*ppu);camera.top=height/(2*ppu);camera.bottom=-height/(2*ppu);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);smoke.update(smokeTime,camera,smokeActive);renderer.render(scene,camera);
 const models=aircraft.map(a=>a.diagnostics());$('status').textContent=models.filter((_,i)=>aircraft[i].root.visible).map(a=>({intact:'Intact',crashed:'Destroyed',survivable:'Survivable crash'})[a.state]+' '+a.triangles.toLocaleString()+' triangles').join(' · ')+' · '+Math.round(ppu)+' px/tile · references at native scale';
 $('pause-smoke').disabled=!smokeActive;$('pause-smoke').textContent=paused?'Play smoke':'Pause smoke';$('pause-smoke').setAttribute('aria-pressed',String(paused));
 window.helicopterState={mode,view,grey,ppu,models,smoke:{visible:smokeActive,paused,time:smokeTime,triangles:14},references:{truck:truck.root.visible,horse:horse.root.visible,truckScale:truck.root.scale.toArray(),horseScale:horse.root.scale.toArray()},resources:{...renderer.info.memory}};queueSmoke();return window.helicopterState;
}
function release(){if(released)return;released=true;smoke?.dispose();smokeTexture?.dispose();aircraft?.forEach(a=>a.dispose());truckPaint?.dispose();truck?.dispose();truckTexture?.dispose();horsePaint?.dispose();if(!horsePaint)horseTexture?.dispose();horse?.skeleton.dispose();horse?.dispose();atlas?.dispose();groundTexture?.dispose();floor.geometry.dispose();floor.material.dispose();grid.geometry.dispose();grid.material.dispose();sun.shadow.dispose();renderer.dispose();window.helicopterDisposed=true;}
function dispose(){if(disposed)return;disposed=true;window.helicopterReady=false;abort.abort();observer?.disconnect();if(animation!==null)cancelAnimationFrame(animation);animation=null;if(!initializing)release();}
addEventListener('pagehide',dispose,{once:true});
try{
 const loader=new T.TextureLoader(),load=async p=>{const r=await fetch(p,{signal:abort.signal});if(!r.ok)throw Error('Missing aircraft reference '+p);return r.json();},results=await Promise.allSettled([loader.loadAsync(HELICOPTER_PAINT),load('canvas-truck-10k-data.json'),loader.loadAsync(TRUCK_PAINT),load('horse-10k-data.json'),loader.loadAsync(MODEL_PAINT),loader.loadAsync(HELICOPTER_GROUND),loader.loadAsync(HELICOPTER_SMOKE)]);
 atlas=results[0].status==='fulfilled'?results[0].value:null;truckTexture=results[2].status==='fulfilled'?results[2].value:null;horseTexture=results[4].status==='fulfilled'?results[4].value:null;groundTexture=results[5].status==='fulfilled'?results[5].value:null;smokeTexture=results[6].status==='fulfilled'?results[6].value:null;
 if(disposed)throw Error('Study closed');if(results.some(r=>r.status==='rejected'))throw Error('Aircraft or scale reference failed to load');
 atlas.colorSpace=truckTexture.colorSpace=horseTexture.colorSpace=groundTexture.colorSpace=smokeTexture.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 aircraft=['intact','crashed','survivable'].map(state=>createUtilityHelicopter(atlas,{state,groundTexture}));aircraft.forEach(a=>scene.add(a.root));truck=createCanvasTruck(results[1].value);truckPaint=createTruckPaint(renderer,truck,truckTexture);scene.add(truck.root);
 smoke=createHelicopterSmoke(smokeTexture,aircraft[2]);scene.add(smoke.group);
 horse=createLightHorse(results[3].value);horse.pose('neutral',45);horsePaint=createModelPaint(renderer,horse,horseTexture);for(const p of horse.parts){p.material=horsePaint.material;p.castShadow=p.receiveShadow=true;}scene.add(horse.root);
 ready=true;window.helicopterStudy={renderer,scene,camera,aircraft,truck,horse,smoke,frame,dispose,set(options){for(const [k,v]of Object.entries(options)){if(k==='paused'){paused=!!v;continue;}if(k==='time'){if(Number.isFinite(v))smokeTime=Math.max(0,v);continue;}const e=$(k);if(e?.type==='checkbox')e.checked=!!v;else if(e?.options&&[...e.options].some(o=>o.value===v))e.value=v;}orbit=tilt=0;return frame();}};
 for(const id of ['mode','view','scale','truck','horse','grey','grid','smoke'])$(id).onchange=()=>{orbit=tilt=0;frame();};$('reset').onclick=()=>{orbit=tilt=0;frame();};$('pause-smoke').onclick=()=>{paused=!paused;frame();};
 document.addEventListener('visibilitychange',()=>{if(ready&&!disposed)frame();},{signal:abort.signal});
 host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,orbit,tilt};};host.onpointermove=e=>{if(drag){orbit=drag.orbit-(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.005;frame();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(frame);observer.observe(host);$('loading').hidden=true;window.helicopterReady=true;frame();
}catch(e){if(!disposed){$('loading').hidden=true;$('error').textContent=e.message;console.error(e);dispose();}}finally{initializing=false;if(disposed)release();}
