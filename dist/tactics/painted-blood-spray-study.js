import * as T from './vendor/three.module.js';
import {BLOOD_ATLAS} from './painted-blood-spray-data.js';
import {createPaintedBloodSpray} from './painted-blood-spray.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createBattlePosture} from './battle-posture.js';
import {createModelPaint} from './horse-model-paint.js';
import {createPaintedGrass} from './painted-grass.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),abort=new AbortController(),loader=new T.TextureLoader(),textures=new Set(),models=[];
for(const id of ['background','reference','strength','motion','view','speed'])if(params.has(id)&&[...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
if(!params.has('motion')&&matchMedia('(prefers-reduced-motion: reduce)').matches)$('motion').value='still';
const initialTime=Number(params.get('time')||.06);
let disposed=false,ready=false,playing=!params.has('paused'),time=Number.isFinite(initialTime)?Math.max(0,Math.min(.48,initialTime)):.06,lastTick=0,raf=0,effect,atlas,observer,lastState;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.info.autoReset=false;host.prepend(renderer.domElement);
const scene=new T.Scene(),cameras=[new T.OrthographicCamera(),new T.OrthographicCamera()];scene.add(new T.HemisphereLight(0xffeed5,0x606c60,2.3));const sun=new T.DirectionalLight(0xffe8cd,2.1);sun.position.set(-3,6,7);scene.add(sun);
const grass=createPaintedGrass(),plain=new T.MeshBasicMaterial({color:0xe0e3d5}),floor=new T.Mesh(new T.PlaneGeometry(10,10),grass);floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);
const grid=new T.GridHelper(8,8,0x829078,0x899278);grid.material.transparent=true;grid.material.opacity=.18;scene.add(grid);
const axis=new T.Group(),arrow=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(0,0,0),.74,0xe9d497,.065,.035),dot=new T.Mesh(new T.SphereGeometry(.014,8,6),new T.MeshBasicMaterial({color:0xf9e7a9}));axis.add(arrow,dot);scene.add(axis);
const palette={grass:0x526449,snow:0xdce1d2,room:0x202b27,red:0x713a37};
async function texture(url){const t=await loader.loadAsync(url);if(disposed){t.dispose();throw Error('Study disposed');}textures.add(t);t.colorSpace=T.SRGBColorSpace;return t;}
async function character(id){const p=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),results=await Promise.allSettled([fetch(p.file,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Missing scale-reference mesh');return r.json();}),texture(p.paint)]);if(results.some(r=>r.status==='rejected'))throw Error('Scale reference could not load');if(disposed)return;
 const worker=p.create(results[0].value),paint=createModelPaint(renderer,worker,results[1].value,{species:id,frame:p.frame}),posture=createBattlePosture(worker,p);worker.pose('neutral');posture.apply({heading:0,distance:0,blend:0,pose:{}},{equipment:false});posture.ground();worker.root.position.x=-.08;
 if(worker.weapon?.root)worker.weapon.root.visible=false;for(const part of worker.parts)part.material=paint.material;scene.add(worker.root);models.push({id,worker,paint});
}
function resetEffect(){effect?.dispose();effect=createPaintedBloodSpray(atlas,{seed:231021,strength:Number($('strength').value),reduced:$('motion').value==='reduced'});scene.add(effect.mesh);}
function frame(){
 if(!ready||disposed)return;const width=host.clientWidth,height=host.clientHeight,mobile=width<670,split=mobile?.58:.66,reference=$('reference').value,sourceY=reference==='hen'?.92:1.03;
 for(const model of models)model.worker.root.visible=model.id===reference;
 axis.position.set(0,sourceY,.35);axis.visible=$('axis').checked;effect.setFrame(new T.Matrix4().makeTranslation(0,sourceY,.35));
 const color=palette[$('background').value];renderer.setClearColor(color);floor.material=$('background').value==='grass'?grass:plain;plain.color.setHex(color);renderer.setSize(width,height,false);renderer.setScissorTest(true);renderer.info.reset();
 let stats;const view=$('view').value,direction=view==='three'?new T.Vector3(3,1.6,6):view==='rear'?new T.Vector3(-.15,1.0,-6):new T.Vector3(0,0,6);
 const panels=mobile?[[0,height*(1-split),width,height*split],[0,0,width,height*(1-split)]]:[[0,0,width*split,height],[width*split,0,width*(1-split),height]];
 for(let i=0;i<2;i++){
  const [x,y,w,h]=panels[i],camera=cameras[i],ppu=i===0?Math.min(280,(h-70)/1.9):55;
  camera.position.copy(direction).add(new T.Vector3(.18,.9,0));camera.lookAt(.18,.9,0);camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.near=.01;camera.far=30;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);stats=effect.update(time,camera,{still:$('motion').value==='still',floor:0});renderer.render(scene,camera);
 }
 renderer.setScissorTest(false);$('time').value=String(Math.min(.48,time));$('clock').textContent=Math.min(.48,time).toFixed(3)+' s';$('play').textContent=playing?'Pause':'Play';
 $('status').textContent='0.48-second spray · '+stats.liveCards+' visible cards · one effect draw per view · one shared 512 × 512 skin · native-size reference';
 lastState={time,playing,reference,background:$('background').value,motion:$('motion').value,...stats,resources:{...renderer.info.memory},submittedDraws:renderer.info.render.calls,submittedTriangles:renderer.info.render.triangles};return lastState;
}
function tick(now){raf=0;if(!playing||disposed)return;if(lastTick)time=(time+(now-lastTick)/1000*Number($('speed').value))%1.12;lastTick=now;frame();raf=requestAnimationFrame(tick);}
function play(value){playing=value;lastTick=0;if(!playing){cancelAnimationFrame(raf);raf=0;}else if(!raf)raf=requestAnimationFrame(tick);frame();}
function dispose(){if(disposed)return;disposed=true;ready=false;cancelAnimationFrame(raf);abort.abort();observer?.disconnect();effect?.dispose();for(const m of models){m.paint.dispose();m.worker.skeleton.dispose();m.worker.dispose();}for(const t of textures)t.dispose();floor.geometry.dispose();grass.dispose();plain.dispose();grid.geometry.dispose();grid.material.dispose();arrow.dispose();dot.geometry.dispose();dot.material.dispose();renderer.dispose();window.bloodSprayStudyDisposed=true;}
addEventListener('pagehide',dispose,{once:true});
try{
 await Promise.all([texture(BLOOD_ATLAS).then(t=>atlas=t),character('horse'),character('hen')]);
 if(!disposed){ready=true;resetEffect();$('loading').hidden=true;observer=new ResizeObserver(frame);observer.observe(host);
  $('play').onclick=()=>play(!playing);$('restart').onclick=()=>{time=0;play(true);};$('time').oninput=()=>{const value=Number($('time').value);play(false);time=value;frame();};
  for(const id of ['background','reference','view','axis','speed'])$(id).onchange=frame;for(const id of ['strength','motion'])$(id).onchange=()=>{resetEffect();frame();};
  window.bloodSprayStudy={ready:true,scene,renderer,effect:()=>effect,get state(){return lastState;},set(values){play(false);for(const [id,v]of Object.entries(values)){if(id==='time')time=Number.isFinite(Number(v))?Number(v):0;else{const e=$(id);if(e?.type==='checkbox')e.checked=!!v;else if(e)e.value=String(v);}}if('motion'in values||'strength'in values)resetEffect();return frame();},frame,dispose};frame();play(playing);
 }
}catch(error){if(!disposed){$('loading').hidden=true;$('error').textContent=error.message;console.error(error);}dispose();}
