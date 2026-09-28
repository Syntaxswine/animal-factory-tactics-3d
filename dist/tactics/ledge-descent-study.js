import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {LIGHT_ATLAS} from './horse-light-model.js';
import {createLedgeDescent} from './ledge-descent.js';
import {createHenLedgeDescent} from './hen-ledge-descent.js';
import {createWeaponModel} from './weapon-models.js';
import {createCliffMantleSurface} from './cliff-mantle.js';
import {createPaintedGrass} from './painted-grass.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
for(const p of ANIMAL_MOTION_CATALOG){
 const option=document.createElement('option');option.value=p.id;option.textContent=p.label;$('animal').append(option);
}
let profile=ANIMAL_MOTION_CATALOG[0];
const selections=['animal','outfit','weapon','surface','view','scale'];
for(const id of selections)if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);

const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(1400,850,false);renderer.setClearColor('#303b33');
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(),camera=new T.OrthographicCamera(),loader=new T.TextureLoader();
scene.add(new T.HemisphereLight(0xfff1d3,0x778878,2));
const sun=new T.DirectionalLight(0xffecd5,2.4);sun.position.set(-4,8,-5);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.012;
Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6});scene.add(sun);
const ground=new T.Mesh(new T.PlaneGeometry(24,24),createPaintedGrass());
ground.rotation.x=-Math.PI/2;ground.position.y=-.01;ground.receiveShadow=true;scene.add(ground);
// Both surfaces share the mantle study's lip at x=0, y=2 and landing at y=0.
const roof=new T.Mesh(new T.BoxGeometry(3,2,4),new T.MeshStandardMaterial({color:0x969387,roughness:1}));
roof.position.set(1.5,1,0);roof.receiveShadow=roof.castShadow=true;scene.add(roof);
const cliffTerrain=createCliffMantleSurface();scene.add(cliffTerrain.root);
const cliff={root:roof,dispose(){roof.geometry.dispose();roof.material.dispose();cliffTerrain.dispose();}};
function showSurface(){
 const natural=$('surface').value==='cliff';roof.visible=!natural;cliffTerrain.root.visible=natural;
 cliff.root=natural?cliffTerrain.root:roof;$('heading').textContent=natural?'Cliff descent':'Roof descent';
 document.title=(natural?'Cliff':'Roof')+' descent · Animal Factory';
}
showSurface();
const dots=new T.Group();scene.add(dots);
const markers=Array.from({length:4},()=>{
 const m=new T.Mesh(new T.SphereGeometry(.025,10,8),new T.MeshBasicMaterial({color:0xf5e987,depthTest:false}));
 m.renderOrder=4;dots.add(m);return m;
});
let worker,paint,cap,motion,texture,selectedWeapon,loading=false,reloadPending=false,playing=false,last=0,progress=0,closed=false;
function stop(){playing=false;$('play').textContent='Play';}
function disposeActor(){
 if(!worker)return;
 scene.remove(worker.root);motion?.dispose();cap?.dispose();paint?.dispose();selectedWeapon?.dispose();worker.skeleton.dispose();worker.dispose();
 worker=paint=cap=motion=selectedWeapon=null;
}
async function load(){
 if(closed)return;
 if(loading){reloadPending=true;return;}
 loading=true;reloadPending=false;stop();window.ledgeDescentStudy.ready=false;$('play').disabled=$('progress').disabled=true;
 $('status').textContent='Loading character…';
 const animal=$('animal').value;profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===animal);
 const guideOption=$('outfit').querySelector('[value="blue-hawaiian"]');
 guideOption.disabled=animal!=='donkey';
 if(guideOption.disabled&&$('outfit').value==='blue-hawaiian')$('outfit').value='normal';
 const outfit=$('outfit').value,unarmed=profile.unarmed||outfit==='blue-hawaiian';
 $('weapon').value=unarmed?'hands':'rifle';$('weapon').disabled=true;
 const weapon=$('weapon').value;
 try{
  disposeActor();
  const response=await fetch(profile.file);if(!response.ok)throw Error(profile.label+' mesh failed to load');
  const data=await response.json();if(closed)return;
  worker=profile.create(data,texture);
  if(!profile.unarmed&&weapon==='hands'){selectedWeapon=createWeaponModel('hands',texture);worker.equipWeapon(selectedWeapon);}
  paint=await createAnimalPaint(renderer,worker,profile,loader,outfit);
  for(const p of worker.parts){p.material=paint.material;p.castShadow=p.receiveShadow=true;}
  cap=outfit==='red-hats'?await createRedHatCap(renderer,worker,profile,loader):null;
  if(closed){disposeActor();return;}
  motion=profile.unarmed?createHenLedgeDescent(worker,profile):createLedgeDescent(worker,profile);$('phases').replaceChildren();
  for(const p of motion.phases){
   const b=document.createElement('button');b.textContent=p.label;
   b.onclick=()=>window.ledgeDescentStudy.seek((p.start+p.end)/(2*motion.duration));$('phases').append(b);
  }
  scene.add(worker.root);Object.assign(window.ledgeDescentStudy,{outfit,weapon});window.ledgeDescentStudy.ready=true;$('play').disabled=$('progress').disabled=false;render();
 }catch(e){$('status').textContent=e.message;console.error(e);}
 finally{loading=false;if(!closed&&(reloadPending||animal!==$('animal').value||outfit!==$('outfit').value||weapon!==$('weapon').value))load();}
}
function render(){
 showSurface();if(!motion)return;
 const url=new URL(location.href);for(const id of selections)url.searchParams.set(id,$(id).value);
 if(url.href!==location.href)history.replaceState(null,'',url);
 const d=motion.apply(progress),scale={full:180,close:310,game:58}[$('scale').value];
 const center=$('scale').value==='close'?new T.Vector3(d.root[0]+.15,d.root[1]+1,0):new T.Vector3(.4,1.85,0);
 const view={three:[-1,.38,1.4],side:[0,.12,1],front:[1,.3,0],rear:[-1,.22,0]}[$('view').value];
 for(const p of worker.parts)p.material=$('grey').checked?worker.grey:paint.material;
 camera.left=-700/scale;camera.right=700/scale;camera.top=425/scale;camera.bottom=-425/scale;camera.near=.01;camera.far=80;
 camera.position.copy(center).add(new T.Vector3(...view).multiplyScalar(8));camera.lookAt(center);camera.updateProjectionMatrix();
 dots.visible=$('contacts').checked;
 const contacts=d.contacts.filter(c=>c.point||c.worldPoint);
 markers.forEach((m,i)=>{
  m.visible=!!contacts[i];if(!contacts[i])return;
  m.position.fromArray(contacts[i].worldPoint||contacts[i].point);m.material.color.set(contacts[i].planted?0x9beb83:0xffb265);
 });
 renderer.render(scene,camera);$('progress').value=progress;
 $('time').textContent=`${(progress*motion.duration).toFixed(2)} / ${motion.duration.toFixed(2)} s`;$('status').textContent=d.phase;
 Object.assign(window.ledgeDescentStudy,{worker,motion,result:d,profile,surface:$('surface').value});
}
window.ledgeDescentStudy={ready:false,renderer,scene,camera,cliff,seek(p){stop();progress=T.MathUtils.clamp(p,0,1);render();},render};
$('surface').onchange=render;$('outfit').onchange=load;
$('animal').onchange=()=>{progress=0;load();};
for(const id of ['view','scale','grey','contacts'])$(id).oninput=render;
$('progress').oninput=()=>window.ledgeDescentStudy.seek(+$('progress').value);
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';if(progress===1)progress=0;last=performance.now();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
let frame;
function animate(now){
 if(playing&&motion){progress=Math.min(1,progress+Math.min(.1,(now-last)/1000)/motion.duration);render();if(progress===1)stop();}
 last=now;frame=requestAnimationFrame(animate);
}
frame=requestAnimationFrame(animate);
addEventListener('pagehide',()=>{
 closed=true;cancelAnimationFrame(frame);disposeActor();cliff.dispose();texture?.dispose();
 ground.geometry.dispose();ground.material.dispose();markers.forEach(m=>{m.geometry.dispose();m.material.dispose();});renderer.dispose();
},{once:true});
try{texture=await loader.loadAsync(LIGHT_ATLAS);texture.colorSpace=T.SRGBColorSpace;await load();}
catch(e){$('status').textContent=e.message;console.error(e);}
