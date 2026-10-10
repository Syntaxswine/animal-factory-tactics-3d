import * as T from './vendor/three.module.js';
import {CHAIR_PAINT,CHAIR_FORMS,createChairLibrary} from './painted-chairs.js';
import {createLightHorse} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT,PAINT_FRAME} from './horse-model-paint.js';
import {animalMotionRepairPaint} from './animal-motion-repair-paint.js';
import {createHorseChairMotion,HORSE_CHAIR_DURATION,HORSE_CHAIR_KEYS} from './horse-chair-motion.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),abort=new AbortController();
for(const key of ['chair','finish','view','scale'])if([...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
$('grey').checked=params.has('grey');let time=Math.max(0,Math.min(HORSE_CHAIR_DURATION,Number(params.get('time'))||0)),playing=!params.has('paused'),ready=false,disposed=false,released=false,initializing=true,request,last,orbit=0,tilt=0,drag,observer;
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x333e38);const camera=new T.OrthographicCamera(-2,2,2,-2,.01,60);
scene.add(new T.HemisphereLight(0xfff1d7,0x617169,2.2));const sun=new T.DirectionalLight(0xffeed9,2);sun.position.set(3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});sun.shadow.bias=-.0003;sun.shadow.normalBias=.004;scene.add(sun);const fill=new T.DirectionalLight(0xdceaf4,.7);fill.position.set(-4,3,-3);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(16,16),new T.MeshStandardMaterial({color:0x8d896b,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
let atlas,skin,worker,paint,motion,library,chair;
function rebuild(){chair?.dispose();const f=CHAIR_FORMS.find(f=>f.id===$('chair').value);chair=library.build(f.id,{finish:f.finishes[$('finish').value==='alternate'?1:0]});scene.add(chair.root);library.setGrey($('grey').checked);for(const p of worker.parts)p.material=$('grey').checked?worker.grey:paint.material;render();}
function render(){if(!ready||disposed)return;motion.apply(time);const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);
 const view=$('view').value,az=({three:.65,side:Math.PI/2,front:0,rear:Math.PI,top:0})[view]+orbit,el=Math.max(.03,Math.min(Math.PI/2-.001,({three:.24,side:.04,front:.08,rear:.22,top:Math.PI/2-.001})[view]+tilt));
 const focus=new T.Vector3(0,.84,.17);camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(9));camera.lookAt(focus);
 const ppu=$('scale').value==='game'?58:Math.min(440,(height-65)/1.95,(width-50)/1.7);camera.left=-width/(2*ppu);camera.right=width/(2*ppu);camera.top=height/(2*ppu);camera.bottom=-height/(2*ppu);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.render(scene,camera);
 const state=motion.diagnostics();$('time').value=time;$('clock').textContent=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play';$('status').textContent=state.phase+' · '+chair.form.name+' · '+Math.round(ppu)+' px/tile';
 window.horseChairState={...state,chair:chair.form.id,playing,view,ppu,resources:{...renderer.info.memory}};return window.horseChairState;
}
function tick(now){if(disposed)return;if(last!==undefined&&playing&&ready&&!document.hidden)time=(time+Math.min((now-last)/1000,.08))%HORSE_CHAIR_DURATION;last=now;if(playing&&ready)render();request=requestAnimationFrame(tick);}
function release(){if(released)return;released=true;motion?.dispose();paint?.dispose();if(!paint)skin?.dispose();worker?.skeleton.dispose();worker?.dispose();chair?.dispose();library?.dispose();atlas?.dispose();floor.geometry.dispose();floor.material.dispose();sun.shadow.dispose();renderer.dispose();window.horseChairDisposed=true;}
function dispose(){if(disposed)return;disposed=true;window.horseChairReady=false;cancelAnimationFrame(request);abort.abort();observer?.disconnect();if(!initializing)release();}
addEventListener('pagehide',dispose,{once:true});
try{
 const loader=new T.TextureLoader(),results=await Promise.allSettled([fetch('horse-10k-data.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Horse mesh did not load');return r.json();}),loader.loadAsync(MODEL_PAINT),loader.loadAsync(CHAIR_PAINT)]);
 skin=results[1].status==='fulfilled'?results[1].value:null;atlas=results[2].status==='fulfilled'?results[2].value:null;if(disposed)throw Error('Study closed');if(results.some(r=>r.status==='rejected'))throw Error('Horse or chair assets did not load');
 atlas.colorSpace=skin.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());worker=createLightHorse(results[0].value);paint=createModelPaint(renderer,worker,skin,{paintLayers:animalMotionRepairPaint({id:'horse',frame:PAINT_FRAME})});for(const p of worker.parts){p.material=paint.material;p.castShadow=p.receiveShadow=true;}motion=createHorseChairMotion(worker);library=createChairLibrary(atlas);scene.add(worker.root);ready=true;rebuild();
 window.horseChairStudy={renderer,scene,camera,worker,motion,library,get chair(){return chair;},set(options){for(const [k,v]of Object.entries(options)){if(k==='time'){time=Math.max(0,Math.min(HORSE_CHAIR_DURATION,Number(v)));continue;}if(k==='playing'){playing=!!v;last=undefined;continue;}const e=$(k);if(e?.type==='checkbox')e.checked=!!v;else if(e?.options&&[...e.options].some(o=>o.value===v))e.value=v;}orbit=tilt=0;rebuild();return window.horseChairState;},render,dispose};
 for(const key of HORSE_CHAIR_KEYS){const b=document.createElement('button');b.textContent=key.label;b.onclick=()=>{playing=false;time=key.time;render();};$('keys').append(b);}
 for(const id of ['chair','finish','grey'])$(id).onchange=rebuild;for(const id of ['view','scale'])$(id).onchange=()=>{orbit=tilt=0;render();};$('play').onclick=()=>{playing=!playing;last=undefined;render();};$('restart').onclick=()=>{time=0;playing=true;last=undefined;render();};$('time').oninput=()=>{time=Number($('time').value);playing=false;render();};$('reset').onclick=()=>{orbit=tilt=0;render();};
 host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,orbit,tilt};};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.004;render();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(render);observer.observe(host);$('loading').hidden=true;window.horseChairReady=true;render();request=requestAnimationFrame(tick);
}catch(e){if(!disposed){$('loading').hidden=true;$('error').textContent=e.message;console.error(e);dispose();}}finally{initializing=false;if(disposed)release();}
