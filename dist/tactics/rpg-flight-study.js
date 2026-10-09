import * as T from './vendor/three.module.js';
import {createRPGFlight} from './rpg-flight.js';
import {createRPGFlightEffects} from './rpg-flight-effects.js';
import {createGrenadeBlastEffects,loadGrenadeBlastTextures} from './grenade-blast-effects.js';
import {grenadeBlastField} from './grenade-blast-field.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWeaponModel} from './weapon-models.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x344039);scene.add(new T.HemisphereLight(0xffefcf,0x536251,2));const sun=new T.DirectionalLight(0xffe7c0,2.3);sun.position.set(3,12,5);scene.add(sun);
const camera=new T.OrthographicCamera(-10,10,6,-6,.01,110),loader=new T.TextureLoader(),effect=createRPGFlightEffects(scene),blast=createGrenadeBlastEffects(scene);
const ground=new T.Mesh(new T.PlaneGeometry(70,50),new T.MeshStandardMaterial({color:0x596448,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(17,-.015,6);scene.add(ground);
const grid=new T.GridHelper(48,48,0x899073,0x6a7457);grid.position.set(16.5,.003,6.5);grid.material.transparent=true;grid.material.opacity=.45;scene.add(grid);
const target=new T.Group(),targetMaterial=new T.MeshStandardMaterial({color:0x938067,roughness:1});scene.add(target);
const panel=new T.Mesh(new T.BoxGeometry(.16,1.9,1.2),targetMaterial);panel.position.y=.95;target.add(panel);
for(const z of [-.50,.50]){const foot=new T.Mesh(new T.BoxGeometry(.75,.10,.18),targetMaterial);foot.position.set(.1,.05,z);target.add(foot);}
const markMaterial=new T.MeshBasicMaterial({color:0xb63f2a}),mark=new T.Mesh(new T.RingGeometry(.22,.28,20),markMaterial);mark.rotation.y=-Math.PI/2;mark.position.set(-.082,1.20,0);target.add(mark);
let worker,paint,weapon,textures,flight,field,state,payload=[],ready=false,disposed=false,initializing=true,released=false,raf,observer,drag,orbit=0,time=-.15,last=performance.now();
const loadingAbort=new AbortController();
const reducedPreference=matchMedia('(prefers-reduced-motion: reduce)'),startsReduced=params.has('reduced')||reducedPreference.matches;
let playing=!params.has('paused')&&!startsReduced;
for(const key of ['range','view','speed','scale'])if([...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
$('smoke').checked=params.get('smoke')!=='0';$('reduced').checked=startsReduced;
function setup(){
 const direction=new T.Vector3(1,0,0).transformDirection(weapon.root.matrixWorld);
 // The loaded warhead is already forward of the tube's muzzle. Its tip is
 // the flight origin, so the first moving frame never jumps backwards.
 const tip=weapon.root.localToWorld(new T.Vector3(.705,.025,0)),impact=tip.clone().addScaledVector(direction,+$('range').value);
 flight=createRPGFlight(tip,impact);target.position.copy(impact).addScaledVector(direction,.082);target.position.y=0;target.rotation.y=-Math.atan2(direction.z,direction.x);mark.position.y=impact.y;
 state={map:Array.from({length:20},()=>Array(44).fill('yard')),upper:[{},{},{}],edges:{},props:[],stairs:[],units:[],visible:new Set()};
 for(let z=0;z<4;z++)for(let y=0;y<20;y++)for(let x=0;x<44;x++)state.visible.add(z?`${x},${y},${z}`:`${x},${y}`);
 const receipt={kind:'rocket',x:impact.x,y:impact.z,h:impact.y,z:0,radius:4};field=grenadeBlastField(state,{event:{trajectories:[receipt],explosions:[receipt]}},receipt);
 $('time').max=(flight.duration+.95).toFixed(3);if(ready)time=$('reduced').checked?flight.duration+.04:-.15;
}
function frame(){
 if(!ready||disposed)return;
 const width=host.clientWidth,height=host.clientHeight,view=$('view').value;
 renderer.setSize(width,height,false);const focus=flight.origin.clone().lerp(flight.impact,.50);focus.y=.6;
 const angle=(view==='side'?0:.40)+orbit;
 camera.position.copy(focus).add(view==='top'?new T.Vector3(.01,24,.01):new T.Vector3(18*Math.sin(angle),view==='side'?4:12,18*Math.cos(angle)));camera.lookAt(focus);camera.updateMatrixWorld(true);
 let ppu=85;
 if($('scale').value==='fit'){
  // Fit the complete impact envelope as well as the worker and moving round.
  // Recompute after orbiting so "Whole flight" cannot crop the blast.
  const bounds=new T.Box3(),at=new T.Vector3();
  for(const [center,radius,low,high]of [[worker.root.position,1,0,2.2],[flight.impact,field.radius,0,flight.impact.y+field.radius]])for(const x of [-radius,radius])for(const z of [-radius,radius])for(const y of [low,high])bounds.expandByPoint(at.set(center.x+x,y,center.z+z).applyMatrix4(camera.matrixWorldInverse));
  const middle=bounds.getCenter(new T.Vector3()),shift=new T.Vector3(middle.x,middle.y,0).applyQuaternion(camera.quaternion);camera.position.add(shift);
  ppu=Math.min(85,width/(bounds.max.x-bounds.min.x+1.4),height/(bounds.max.y-bounds.min.y+1.4));
 }
 camera.left=-width/(2*ppu);camera.right=width/(2*ppu);camera.top=height/(2*ppu);camera.bottom=-height/(2*ppu);
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const reduced=$('reduced').checked,sample=effect.update(time,{flight,camera,smokeEnabled:$('smoke').checked,reduced});
 const blastAge=sample.blastAge;blast.update(reduced&&blastAge>=0&&blastAge<.8?.04:blastAge,{field,state,camera,reduced});
 const released=time>=0;for(const part of payload)part.visible=!released;
 renderer.render(scene,camera);$('time').value=time;$('clock').textContent=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play';$('play').disabled=reduced;
 $('status').textContent=reduced?'Reduced motion · static impact preview':`${effect.projectile.triangles}-triangle round · ${flight.duration.toFixed(2)} s flight · ${time<0?'Loaded':sample.flying?'In flight':sample.blastAge<.12?'Impact':sample.blastAge<.8?'Outward dust':'Clear'}`;
 window.rpgFlightState={time,range:+$('range').value,view,scale:$('scale').value,reduced,flightDuration:flight.duration,triangles:effect.projectile.triangles,projectile:effect.projectile.root.visible,smoke:effect.smoke.filter(p=>p.visible).length,blast:blast.group.visible,blastAge,position:sample.position.toArray(),origin:flight.origin.toArray(),impact:flight.impact.toArray(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
 return window.rpgFlightState;
}
function releaseResources(){if(released)return;released=true;effect.dispose();blast.dispose();textures?.forEach(t=>t.dispose());paint?.dispose();worker?.skeleton.dispose();worker?.dispose();weapon?.dispose();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();for(const mesh of target.children)mesh.geometry.dispose();targetMaterial.dispose();markMaterial.dispose();renderer.dispose();window.rpgFlightDisposed=true;}
// A paint projection already in flight may still need the renderer. Release
// it after that pending load settles, and never install late resources.
function dispose(){if(disposed)return;disposed=true;window.rpgFlightReady=false;loadingAbort.abort();cancelAnimationFrame(raf);observer?.disconnect();if(!initializing)releaseResources();}
addEventListener('pagehide',dispose,{once:true});
try{
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse'),response=await fetch(profile.file,{signal:loadingAbort.signal});if(!response.ok)throw Error('Horse model failed to load');
 const data=await response.json();if(disposed)throw Error('Study closed');
 worker=profile.create(data);weapon=createWeaponModel('rpg');worker.equipWeapon(weapon);worker.pose('carry');worker.root.position.set(1.2,0,7);scene.add(worker.root);worker.root.updateMatrixWorld(true);
 paint=await createAnimalPaint(renderer,worker,profile,loader,'normal');for(const mesh of worker.parts)mesh.material=paint.material;
 if(disposed)throw Error('Study closed');
 textures=await loadGrenadeBlastTextures(loader);if(!disposed){effect.setTextures({flame:textures[0],smoke:textures[1]});blast.setTextures(textures);}
 payload=weapon.parts.filter(p=>p.name==='shaped RPG warhead'||p.name==='warhead shoulder seam'||p.name==='nose fuse');
 if(!disposed){setup();ready=true;time=params.has('time')?Number(params.get('time')):startsReduced?flight.duration+.04:-.15;if(!Number.isFinite(time))time=-.15;time=Math.max(-.15,Math.min(flight.duration+.95,time));
  window.rpgFlightStudy={seek(t){if(!Number.isFinite(t))throw Error('Invalid study time');time=Math.max(-.15,Math.min(flight.duration+.95,t));playing=false;return frame();},set(options){for(const [key,value]of Object.entries(options)){const control=$(key);if(!control)continue;if(control.type==='checkbox')control.checked=!!value;else if([...control.options||[]].some(o=>o.value===String(value)))control.value=value;}if(options.range)setup();if(options.reduced){time=flight.duration+.04;playing=false;}return frame();},frame,dispose,renderer,scene,camera,effect,blast,get flight(){return flight;},get state(){return state;}};
  $('play').onclick=()=>{if(!$('reduced').checked)playing=!playing;frame();};$('restart').onclick=()=>{time=$('reduced').checked?flight.duration+.04:-.15;playing=!$('reduced').checked;frame();};$('time').oninput=()=>{time=+$('time').value;playing=false;frame();};
  for(const key of ['range','view','speed','scale','smoke','reduced'])$(key).onchange=()=>{if(key==='range')setup();if(key==='reduced'&&$('reduced').checked){time=flight.duration+.04;playing=false;}frame();};
  for(const button of document.querySelectorAll('[data-beat]'))button.onclick=()=>{time=({before:-.1,launch:.025,flight:flight.duration*.5,impact:flight.duration+.05,dust:flight.duration+.28,clear:flight.duration+.85})[button.dataset.beat];playing=false;frame();};
  host.onpointerdown=e=>{drag={x:e.clientX,orbit};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.006;frame();}};host.onpointerup=host.onpointercancel=()=>drag=null;
  observer=new ResizeObserver(frame);observer.observe(host);function tick(now){if(disposed)return;if(playing){time+=Math.max(0,(now-last)/1000)*+$('speed').value;const loop=flight.duration+1.1;if(time>flight.duration+.95)time=(time+.15)%loop-.15;frame();}last=now;raf=requestAnimationFrame(tick);}last=performance.now();raf=requestAnimationFrame(tick);$('loading').hidden=true;frame();window.rpgFlightReady=true;
 }
}catch(error){if(!disposed){$('error').textContent=error?.message||'RPG study assets could not be loaded.';$('loading').hidden=true;console.error(error);dispose();}}
finally{initializing=false;if(disposed)releaseResources();}
