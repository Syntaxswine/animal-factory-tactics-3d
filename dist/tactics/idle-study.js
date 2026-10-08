import * as T from './vendor/three.module.js';
import {LIGHT_ATLAS} from './horse-light-model.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createIdle,IDLE} from './idle-motion.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),host=$('stage');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x344039);const camera=new T.OrthographicCamera(-3,3,2,-2,.01,60);
scene.add(new T.HemisphereLight(0xfff1d2,0x536251,2));const sun=new T.DirectionalLight(0xffe6bf,2);sun.position.set(2.5,6,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,far:15});sun.shadow.bias=-.0003;sun.shadow.normalBias=.009;scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(24,24),new T.MeshStandardMaterial({color:0x55604a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(24,24,0x7b8266,0x646f55);grid.position.set(.5,.001,.5);scene.add(grid);
const tile=new T.Line(new T.BufferGeometry().setFromPoints([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]].map(([a,b])=>new T.Vector3(a,.006,b))),new T.LineBasicMaterial({color:0xe2d091,transparent:true,opacity:.8}));scene.add(tile);
// Gaze overlay: a dashed line from between the eyes to where they point, and a small ring there.
const gazeLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xebc778,dashSize:.06,gapSize:.04,transparent:true,opacity:.8}));scene.add(gazeLine);
const marker=new T.Mesh(new T.TorusGeometry(.07,.008,8,32),new T.MeshBasicMaterial({color:0xebc778}));scene.add(marker);
const loader=new T.TextureLoader(),ownedTextures=[];let worker,eye=null,paint,motion,atlas,disposed=false,ready=false,raf,observer,castVersion=0;
let time=Math.max(0,Number(params.get('time'))||0),playing=!params.has('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches,orbit=0,elevation=0,drag=null;
// The hen has wings, not arms and hands; like the all-animal motion study, the idle is for the eleven mammals.
const CAST=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed);for(const p of CAST)$('species').append(new Option(p.label,p.id));
for(const id of ['species','seed','view','scale','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);$('gaze').checked=params.get('gaze')==='1';
function release(){motion?.dispose();motion=null;if(worker){scene.remove(worker.root);paint?.dispose();worker.skeleton.dispose();worker.dispose();}paint=worker=null;for(const t of ownedTextures.splice(0))t.dispose();}
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();release();atlas?.dispose();for(const obj of [floor,grid,tile,gazeLine,marker]){obj.geometry.dispose();for(const m of [obj.material].flat())m.dispose();}sun.shadow.dispose();renderer.dispose();}
window.addEventListener('pagehide',dispose,{once:true});
try{
 atlas=await loader.loadAsync(LIGHT_ATLAS);if(disposed){atlas.dispose();throw Error('Study closed while loading');}atlas.colorSpace=T.SRGBColorSpace;
 // Switching character replaces the worker, its paint and its motion; the seed and the time are kept.
 async function cast(id){const version=++castVersion,profile=CAST.find(p=>p.id===id),textures=[];let nextWorker,nextPaint,nextMotion,adopted=false;
  if(!profile)throw Error('Unknown idle character: '+id);
  const current=()=>!disposed&&version===castVersion;
  try{const data=await fetch('./'+profile.file).then(r=>{if(!r.ok)throw Error(profile.label+' mesh failed to load');return r.json();});if(!current())return;
   nextWorker=profile.create(data,atlas);nextPaint=await createAnimalPaint(renderer,nextWorker,profile,{loadAsync:async(...args)=>{const t=await loader.loadAsync(...args);textures.push(t);return t;}});if(!current())return;
   nextMotion=createIdle(nextWorker,{seed:Number($('seed').value),eye:profile.eye??null});for(const p of nextWorker.parts){p.material=nextPaint.material;p.castShadow=true;}
   // Keep the previous character alive while assets load. Only a complete, still-requested character replaces it.
   release();worker=nextWorker;paint=nextPaint;motion=nextMotion;eye=profile.eye??null;ownedTextures.push(...textures);adopted=true;
   scene.add(worker.root);showSchedule();$('error').textContent='';
  }catch(e){if(current())throw e;}
  finally{if(!adopted){nextMotion?.dispose();nextPaint?.dispose();nextWorker?.skeleton.dispose();nextWorker?.dispose();for(const t of textures)t.dispose();}}
 }
 // Each seed is its own loop; switching rebuilds the motion (about 0.15 s: the character's fitted limits ship in
 // idle-fits.js) and keeps the time. The gaze line starts at the character's own eyes.
 function load(seed){motion?.dispose();motion=createIdle(worker,{seed,eye});showSchedule();}
 function showSchedule(){$('time').max=motion.length;time%=motion.length;
  $('keyframes').replaceChildren();for(const l of motion.schedule.looks){const b=document.createElement('button');b.textContent=l.label;b.dataset.time=l.time+l.dur;b.title=(l.time+l.dur).toFixed(2)+' s';b.onclick=()=>{playing=false;time=l.time+l.dur;draw();};$('keyframes').append(b);}}
 await cast($('species').value);if(disposed)throw Error('Study closed while loading');
 function aim(w,h,focus,ppu){const view=$('view').value,angle=({three:.66,side:0,front:Math.PI/2,rear:-Math.PI/2}[view])+orbit;
  camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.position.copy(focus).add(new T.Vector3(Math.sin(angle)*8,view==='three'?4+elevation:1.4+elevation,Math.cos(angle)*8));camera.lookAt(focus);camera.updateProjectionMatrix();}
 function draw(){if(!ready||disposed||!motion)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);renderer.setViewport(0,0,w,h);
  const scale=$('scale').value,state=motion.at(time),g=motion.gaze(time),show=$('gaze').checked;
  gazeLine.visible=marker.visible=show;if(show){gazeLine.geometry.dispose();gazeLine.geometry=new T.BufferGeometry().setFromPoints([g.eye,g.target]);gazeLine.computeLineDistances();marker.position.copy(g.target);marker.lookAt(g.eye);}
  const focus=scale==='wide'?new T.Vector3(.6,.8,0):new T.Vector3(.02,.86,0),ppu=scale==='game'?130:scale==='close'?Math.min(w/1.6,h/2.0):Math.min(w/9,h/4.6);aim(w,h,focus,ppu);renderer.render(scene,camera);
  $('play').textContent=playing?'Pause':'Play';$('time').value=time;$('status').textContent=time.toFixed(2)+' s · '+state.phase+' · '+state.stance.toLowerCase();
  for(const b of $('keyframes').children)b.setAttribute('aria-pressed',String(Math.abs(time-Number(b.dataset.time))<.025));
  window.idleStudyState={...state,species:$('species').value,gaze:{eye:g.eye.toArray(),target:g.target.toArray()},playing,seed:motion.seed,view:$('view').value,scale,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures};return window.idleStudyState;
 }
 window.idleStudy={timing:IDLE,get species(){return $('species').value;},get length(){return motion.length;},get schedule(){return motion.schedule;},seek(t){if(!Number.isFinite(t))throw Error('Time must be finite');playing=false;time=((t%motion.length)+motion.length)%motion.length;return draw();},
  // Any of the page's controls by name; a character or seed is loaded, and an unknown control or value is refused.
  async set(options){for(const [k,v]of Object.entries(options)){if(k==='gaze'){if(typeof v!=='boolean')throw Error('The gaze line is on or off: true or false');$('gaze').checked=v;continue;}if(!['species','seed','view','scale','speed'].includes(k))throw Error('The study has no '+k+' control');
    if(![...$(k).options].some(o=>o.value===String(v)))throw Error('No '+k+' '+v);$(k).value=String(v);if(k==='species')await cast(String(v));else if(k==='seed')load(Number(v));}orbit=elevation=0;return draw();},play(){playing=true;return draw();},draw,dispose,get worker(){return worker;},get motion(){return motion;},cast:async id=>{$('species').value=id;await cast(id);return draw();},renderer,scene,camera};
 $('play').onclick=()=>{playing=!playing;draw();};$('restart').onclick=()=>{time=0;playing=true;draw();};$('time').oninput=()=>{playing=false;time=+$('time').value;draw();};
 $('seed').onchange=()=>{load(Number($('seed').value));draw();};$('species').onchange=async()=>{try{await cast($('species').value);draw();}catch(e){$('error').textContent=e.message;console.error(e);}};for(const id of ['view','scale','gaze','speed'])$(id).onchange=()=>{orbit=elevation=0;draw();};
 host.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,orbit,elevation};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.007;elevation=Math.max(-1,Math.min(4,drag.elevation-(e.clientY-drag.y)*.014));draw();};host.onpointerup=host.onpointercancel=()=>drag=null;
 ready=true;$('loading').hidden=true;for(const id of ['play','restart','time'])$(id).disabled=false;observer=new ResizeObserver(draw);observer.observe(host);let last=performance.now();
 function tick(now){if(disposed)return;if(playing&&motion){time=(time+Math.min(.05,(now-last)/1000)*Number($('speed').value))%motion.length;draw();}last=now;raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);draw();window.idleStudyReady=true;
}catch(e){if(!disposed){$('error').textContent=e.message;$('loading').hidden=true;console.error(e);dispose();}}
