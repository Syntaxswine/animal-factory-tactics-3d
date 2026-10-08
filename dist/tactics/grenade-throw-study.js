import * as T from './vendor/three.module.js';
import {LIGHT_ATLAS} from './horse-light-model.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createGrenadeModel} from './grenade-model.js';
import {createGrenadeThrow,GRENADE_THROW,GRENADE_KEYS} from './grenade-throw-motion.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),host=$('stage');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x344039);const camera=new T.OrthographicCamera(-3,3,2,-2,.01,60);
scene.add(new T.HemisphereLight(0xfff1d2,0x536251,2));const sun=new T.DirectionalLight(0xffe6bf,2);sun.position.set(2.5,6,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4,right:7,top:5,bottom:-5,far:15});sun.shadow.bias=-.0003;sun.shadow.normalBias=.009;scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(28,24),new T.MeshStandardMaterial({color:0x55604a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(3,-.003,0);floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(26,26,0x7b8266,0x646f55);grid.position.set(.5,.001,.5);scene.add(grid);
function outline(x,color){const points=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]].map(([a,b])=>new T.Vector3(x+a,.006,b));const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.8}));scene.add(line);return line;}
const originTile=outline(0,0xe2d091),targetTile=outline(GRENADE_THROW.target,0xe2d091),trajectory=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xebc778,dashSize:.065,gapSize:.045,transparent:true,opacity:.7}));scene.add(trajectory);
const loader=new T.TextureLoader(),ownedTextures=[];let worker,paint,grenade,asset,motion,atlas,disposed=false,ready=false,raf,observer;
let time=Math.max(0,Math.min(GRENADE_THROW.duration,Number(params.get('time'))||0)),playing=!params.has('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches,orbit=0,elevation=0,drag=null;
for(const id of ['mode','view','scale','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);$('arc').checked=params.get('arc')==='1';
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();motion?.dispose();paint?.dispose();worker?.skeleton.dispose();worker?.dispose();grenade?.dispose();asset?.dispose();for(const t of ownedTextures)t.dispose();atlas?.dispose();for(const obj of [floor,grid,originTile,targetTile,trajectory]){obj.geometry.dispose();for(const m of [obj.material].flat())m.dispose();}sun.shadow.dispose();renderer.dispose();}
window.addEventListener('pagehide',dispose,{once:true});
try{
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse'),data=await fetch('./'+profile.file).then(r=>{if(!r.ok)throw Error('Horse mesh failed to load');return r.json();});
 atlas=await loader.loadAsync(LIGHT_ATLAS);atlas.colorSpace=T.SRGBColorSpace;worker=profile.create(data,atlas);
 paint=await createAnimalPaint(renderer,worker,profile,{loadAsync:async(...args)=>{const t=await loader.loadAsync(...args);ownedTextures.push(t);return t;}});for(const p of worker.parts){p.material=paint.material;p.castShadow=true;}
 const surface=await loader.loadAsync('../assets/equipment/painted-ui/grenade-surface.png');ownedTextures.push(surface);
 grenade=createGrenadeModel(surface);worker.equipWeapon(grenade);scene.add(worker.root);for(const p of grenade.parts)p.castShadow=true;motion=createGrenadeThrow(worker,grenade);
 asset=createGrenadeModel(surface);asset.root.position.set(0,.07,0);asset.root.rotation.y=-.5;for(const p of asset.parts)p.castShadow=true;scene.add(asset.root);
 trajectory.geometry.dispose();trajectory.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:80},(_,i)=>motion.projectile(GRENADE_THROW.release+(motion.impacts[0]-GRENADE_THROW.release)*i/79).position));trajectory.computeLineDistances();
 for(const k of GRENADE_KEYS){const b=document.createElement('button');b.textContent=k.label;b.dataset.time=k.time;b.onclick=()=>{playing=false;time=k.time;$('mode').value='motion';draw();};$('keyframes').append(b);}
 function aim(w,h,focus,ppu){const view=$('view').value,angle=({three:.66,side:0,front:Math.PI/2,rear:-Math.PI/2}[view])+orbit;
  camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.position.copy(focus).add(new T.Vector3(Math.sin(angle)*8,view==='three'?4+elevation:1.8+elevation,Math.cos(angle)*8));camera.lookAt(focus);camera.updateProjectionMatrix();}
 function draw(){if(!ready||disposed)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();
  const mode=$('mode').value,scale=$('scale').value,keys=mode==='keys',closeAsset=mode==='asset';worker.root.visible=!closeAsset;asset.root.visible=closeAsset;
  for(const id of ['play','time','scale','speed','arc'])$(id).disabled=mode!=='motion';
  grid.visible=originTile.visible=targetTile.visible=!closeAsset;floor.visible=true;trajectory.visible=$('arc').checked&&!keys&&!closeAsset;$('drawing').hidden=!closeAsset;
  $('labels').replaceChildren();
  if(keys){renderer.setScissorTest(true);for(let i=0;i<GRENADE_KEYS.length;i++){const col=i%3,row=Math.floor(i/3),cw=w/3,ch=h/2;motion.at(GRENADE_KEYS[i].time);const focus=new T.Vector3(.08,.88,0);aim(cw,ch,focus,Math.min(cw/1.65,ch/1.98));renderer.setViewport(col*cw,h-(row+1)*ch,cw,ch);renderer.setScissor(col*cw,h-(row+1)*ch,cw,ch);renderer.render(scene,camera);const span=document.createElement('span');span.textContent=(i+1)+' · '+GRENADE_KEYS[i].label;$('labels').append(span);}renderer.setScissorTest(false);}
  const state=motion.at(time);
  if(!keys){const focus=closeAsset?new T.Vector3(.030,.075,0):new T.Vector3(scale==='full'?2.4:.09,scale==='full'?.85:.89,0),ppu=closeAsset?Math.min(w*.46/.16,h*.78/.15):scale==='game'?130:scale==='close'?Math.min(w/2.3,h/2.05):Math.min(w/7.6,h/3.3);aim(w,h,focus,ppu);if(closeAsset){camera.left+=w*.10/ppu;camera.right+=w*.10/ppu;camera.updateProjectionMatrix();}renderer.render(scene,camera);}
  $('play').textContent=playing?'Pause':'Play';$('time').value=time;$('status').textContent=time.toFixed(2)+' s · '+state.phase;for(const b of $('keyframes').children)b.setAttribute('aria-pressed',String(Math.abs(time-Number(b.dataset.time))<.025));
  window.grenadeStudyState={...state,playing,mode,view:$('view').value,scale,triangles:grenade.triangles,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures};return window.grenadeStudyState;
 }
 window.grenadeStudy={timing:GRENADE_THROW,keys:GRENADE_KEYS,seek(t){if(!Number.isFinite(t))throw Error('Time must be finite');playing=false;time=Math.max(0,Math.min(GRENADE_THROW.duration,t));return draw();},set(options){for(const [k,v]of Object.entries(options)){if(k==='arc')$('arc').checked=!!v;else if($(k)&&[...$(k).options||[]].some(o=>o.value===v))$(k).value=v;}orbit=elevation=0;return draw();},play(){playing=true;return draw();},draw,dispose,worker,motion,renderer,scene,camera};
 $('play').onclick=()=>{playing=!playing;draw();};$('restart').onclick=()=>{time=0;playing=true;$('mode').value='motion';draw();};$('time').oninput=()=>{playing=false;time=+$('time').value;draw();};for(const id of ['mode','view','scale','arc','speed'])$(id).onchange=()=>{orbit=elevation=0;draw();};
 host.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,orbit,elevation};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.007;elevation=Math.max(-1,Math.min(4,drag.elevation-(e.clientY-drag.y)*.014));draw();};host.onpointerup=host.onpointercancel=()=>drag=null;
 ready=true;$('loading').hidden=true;for(const id of ['play','restart','time'])$(id).disabled=false;observer=new ResizeObserver(draw);observer.observe(host);let last=performance.now();
 function tick(now){if(disposed)return;if(playing&&$('mode').value==='motion'){time+=Math.min(.05,(now-last)/1000)*Number($('speed').value);if(time>GRENADE_THROW.duration)time=0;draw();}last=now;raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);draw();window.grenadeStudyReady=true;
}catch(e){$('error').textContent=e.message;$('loading').hidden=true;console.error(e);dispose();}
