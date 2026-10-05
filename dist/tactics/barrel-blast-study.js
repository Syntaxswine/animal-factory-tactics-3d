import * as T from './vendor/three.module.js';
import {createCargoLibrary,CARGO_ATLAS} from './painted-cargo.js';
import {PAINTED_ATLAS} from './painted-environment-scene.js';
import {FIRE_ASSETS} from './painted-fire-effects.js';
import {createPaintedBlastEffects} from './painted-blast-effects.js';
import {createBarrelBlastMotion,BARREL_TIME} from './barrel-blast-motion.js';
import {clamp,smooth} from './painted-fire-state.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),host=$('viewport'),params=new URLSearchParams(location.search);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x303b33);const camera=new T.OrthographicCamera(-7,7,4,-4,.05,100);
scene.add(new T.HemisphereLight(0xfff3d5,0x56634b,2));const sun=new T.DirectionalLight(0xffe4bd,2);sun.position.set(3,6,4);scene.add(sun);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:20});sun.shadow.bias=-.0004;
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x596448,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(30,30,0x6e765b,0x606a51);scene.add(grid);
const water=new T.Group();scene.add(water);
for(const id of ['skin','orientation','focus','view','scale','scene'])if(params.has(id)&&Array.from($(id).options).some(o=>o.value===params.get(id)))$(id).value=params.get(id);
if(params.get('effects')==='off')$('effects').checked=false;
let time=clamp(Number(params.get('time'))||0,0,BARREL_TIME.duration),playing=!params.has('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches,disposed=false,orbit=0,elevation=0,drag=null;
const loader=new T.TextureLoader(),origin=V();let textures=[],library,motion,blast,scorch,observer,frameId;
function dispose(){
 if(disposed)return;disposed=true;cancelAnimationFrame(frameId);observer?.disconnect();motion?.dispose();blast?.dispose();library?.dispose();textures.forEach(t=>t.dispose());
 scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});scene.clear();sun.shadow.dispose();renderer.dispose();
}
window.addEventListener('pagehide',dispose,{once:true});
try{
 const response=await fetch('./fixtures/tank-blast-contract.json');if(!response.ok)throw Error('Could not load the shared explosion footprint');const contracts=await response.json();
 const loads=await Promise.allSettled([PAINTED_ATLAS,CARGO_ATLAS,FIRE_ASSETS.ash].map(url=>loader.loadAsync(url)));
 textures=loads.filter(r=>r.status==='fulfilled').map(r=>r.value);const failure=loads.find(r=>r.status==='rejected');
 if(disposed||failure){textures.forEach(t=>t.dispose());textures=[];throw failure?.reason||Error('Study closed during loading');}textures.forEach(t=>t.colorSpace=T.SRGBColorSpace);
 library=createCargoLibrary(textures[0],textures[1]);
 function selectBarrel(){const next=createBarrelBlastMotion(library,{skin:$('skin').value,orientation:$('orientation').value});motion?.dispose();motion=next;origin.copy(motion.origin);scene.add(motion.root);}
 selectBarrel();blast=await createPaintedBlastEffects(scene,loader,origin,{fragmentCount:0,name:'Fuel barrel rupture'});
 if(disposed){blast.dispose();throw Error('Study closed during loading');}
 for(const p of contracts.water.excluded){const m=new T.Mesh(new T.PlaneGeometry(.98,.98),new T.MeshStandardMaterial({color:0x436578,roughness:.75}));m.rotation.x=-Math.PI/2;m.position.set(p.x-contracts.water.origin.x,.001,p.y-contracts.water.origin.y);water.add(m);}
 scorch=new T.Mesh(new T.PlaneGeometry(1.5,1.35),new T.MeshBasicMaterial({map:textures[2],color:0x5b5245,transparent:true,depthWrite:false,toneMapped:false}));scorch.rotation.x=-Math.PI/2;scorch.position.y=.009;scene.add(scorch);
 function draw(){
  if(disposed)return;const d=motion.apply(time),w=host.clientWidth,h=host.clientHeight;
  if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
  // Keep the overhead view tilted enough to see the upright flame cards.
  const focus=$('focus').value,center=focus==='barrel'?V(0,.45,0):V(0,.3,0),direction={three:V(5,5,8),side:V(10,2.5,0),front:V(0,2.5,10),top:V(0,10,5)}[$('view').value];
  direction.applyAxisAngle(V(0,1,0),orbit);direction.y+=elevation;camera.position.copy(center).add(direction);camera.lookAt(center);
  const scale=$('scale').value,ppu=scale==='game'?58:scale==='close'?Math.min(260,h/2.6):Math.min(h/(focus==='barrel'?3.8:12.5),w/(focus==='barrel'?5:13));
  camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.updateProjectionMatrix();
  const effects=$('effects').checked;water.visible=$('scene').value==='water';scorch.visible=effects&&d.active;scorch.material.opacity=smooth(d.age/.6);
  const surroundings=blast.update(d.age,{camera,contract:contracts[$('scene').value],visible:effects,groundOpacity:1-smooth((d.age-2.50)/1.0)});
  $('time').value=time;$('clock').textContent=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play';$('status').textContent=`${d.phase} · ${surroundings.fireCells} shared fire cells · ${Math.round(ppu)} px/tile`;
  renderer.render(scene,camera);window.barrelStudyState={...d,playing,surroundings,skin:motion.skin,orientation:motion.orientation,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures};
 }
 const seek=t=>{playing=false;time=clamp(t,0,BARREL_TIME.duration);draw();return window.barrelStudyState;};
 $('play').onclick=()=>{playing=!playing;draw();};$('restart').onclick=()=>{time=0;playing=true;draw();};$('time').oninput=()=>seek(+$('time').value);
 for(const id of ['focus','view','scale','scene','effects'])$(id).onchange=()=>{if(id==='view'){orbit=0;elevation=0;}draw();};
 for(const id of ['skin','orientation'])$(id).onchange=()=>{selectBarrel();draw();};
 for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>seek(+b.dataset.time);
 host.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,orbit,elevation};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.007;elevation=clamp(drag.elevation-(e.clientY-drag.y)*.025,-1.5,6);draw();};host.onpointerup=host.onpointercancel=()=>{drag=null;};
 observer=new ResizeObserver(draw);observer.observe(host);let last=performance.now();function frame(now){if(disposed)return;if(playing){time+=Math.min(.04,(now-last)/1000);if(time>BARREL_TIME.duration)time=0;draw();}last=now;frameId=requestAnimationFrame(frame);}frameId=requestAnimationFrame(frame);
 window.barrelStudy={seek,draw,dispose,renderer,scene,camera,get motion(){return motion;},get effects(){return blast;}};window.barrelStudyReady=true;$('loading').hidden=true;draw();
}catch(e){const closed=disposed;dispose();if(!closed){$('error').textContent=e.message;$('loading').textContent='Study failed to load';console.error(e);}}
