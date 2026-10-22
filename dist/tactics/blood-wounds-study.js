import * as T from './vendor/three.module.js';
import {BLOOD_ATLAS} from './painted-blood-spray-data.js';
import {EXIT_ATLAS,STAIN_ATLAS} from './painted-blood-followup-data.js';
import {createPaintedBloodSpray} from './painted-blood-spray.js';
import {createPaintedBloodExit} from './painted-blood-exit.js';
import {createBloodStainLayer} from './painted-blood-stain.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createBattlePosture} from './battle-posture.js';
import {createRedHatCap} from './red-hat-model.js';
import {createPaintedGrass} from './painted-grass.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),loader=new T.TextureLoader(),textures=[],cache=new Map();
for(const p of ANIMAL_MOTION_CATALOG)$('animal').add(new Option(p.label,p.id));
for(const id of ['animal','outfit','effect','site','pose','view','background','motion','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
if(!params.has('motion')&&matchMedia('(prefers-reduced-motion: reduce)').matches)$('motion').value='still';
let time=Number(params.get('time')||.09);if(!Number.isFinite(time))time=.09;time=Math.max(0,Math.min(3,time));
let disposed=false,ready=false,playing=!params.has('paused'),raf=0,last=0,version=0,actor,entry,exit,atlases,observer,state,loads=0,rendererDisposed=false;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.info.autoReset=false;host.prepend(renderer.domElement);
const scene=new T.Scene(),cameras=[new T.OrthographicCamera(),new T.OrthographicCamera()];scene.add(new T.HemisphereLight(0xffeed5,0x606c60,2.3));const sun=new T.DirectionalLight(0xffe8cd,2.1);sun.position.set(-3,6,7);scene.add(sun);
const grass=createPaintedGrass(),plain=new T.MeshBasicMaterial({color:0x526449}),floor=new T.Mesh(new T.PlaneGeometry(10,10),grass);floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);
const grid=new T.GridHelper(8,8,0x829078,0x899278);grid.material.transparent=true;grid.material.opacity=.18;scene.add(grid);
const guides=new T.Group();scene.add(guides);
const palette={grass:0x526449,snow:0xdce1d2,room:0x202b27,red:0x713a37};
async function loadTexture(url){const texture=await loader.loadAsync(url);if(disposed){texture.dispose();throw Error('Study disposed');}texture.colorSpace=T.SRGBColorSpace;textures.push(texture);return texture;}
function resetEffects(){entry?.dispose();exit?.dispose();const reduced=$('motion').value==='reduced';entry=createPaintedBloodSpray(atlases[0],{seed:231021,reduced});exit=createPaintedBloodExit(atlases[1],{seed:231022,reduced});scene.add(entry.mesh,exit.mesh);}
function neutral(a){a.worker.pose('neutral');a.posture.apply({heading:0,distance:0,blend:0,pose:{}},{equipment:false});a.posture.ground();a.worker.root.updateMatrixWorld(true);a.worker.skeleton.update();}
function clearGuides(){for(const child of [...guides.children]){child.dispose();guides.remove(child);}}
function setupContacts(){
 const a=actor;neutral(a);a.layer.clear();clearGuides();
 const hen=a.profile.id==='hen',site=$('site').value,y=site==='leg'?(hen?.25:.51):site==='arm'?(hen?1.02:1.08):(hen?1.02:1.09),z=site==='arm'?(hen?.30:.30):site==='leg'?.18:.045;
 const contacts={};
 for(const [kind,sign]of [['entry',1],['exit',-1]]){
  const ray=new T.Raycaster(new T.Vector3(sign*3,y,z),new T.Vector3(-sign,0,0),0,6);ray.layers.enableAll();
  const hit=ray.intersectObjects(a.worker.parts,false).find(h=>h.face&&h.distance<6);if(!hit)continue;
  const normal=new T.Triangle(...['a','b','c'].map(k=>hit.object.getVertexPosition(hit.face[k],new T.Vector3()).applyMatrix4(hit.object.matrixWorld))).getNormal(new T.Vector3());
  const outward=new T.Vector3(sign,0,0),up=new T.Vector3(0,1,0),across=new T.Vector3().crossVectors(outward,up),matrix=new T.Matrix4().makeBasis(outward,up,across).setPosition(hit.point);
  contacts[kind]={source:hit.object,point:hit.point,normal,matrix};
  guides.add(new T.ArrowHelper(outward,hit.point,.65,kind==='entry'?0xffd48a:0xec7871,.065,.03));
 }
 a.contacts=contacts;stamp();
}
function stamp(){
 actor.layer.clear();for(const [kind,c]of Object.entries(actor.contacts||{})){
  const small=$('site').value==='leg',width=(kind==='exit'?.25:.14)*(small?.75:1),height=(kind==='exit'?.31:.19)*(small?.8:1);
  actor.layer.stamp({...c,width,height,kind,variant:1,depth:.085});
 }
}
async function select(){
 const token=++version,profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===$('animal').value);if(!profile)throw Error('Unknown animal');
 if($('outfit').value==='blue-hawaiian'&&profile.id!=='donkey')$('outfit').value='normal';const outfit=$('outfit').value;
 $('loading').hidden=false;let worker,paint,cap,layer;const capTextures=[];let released=false;
 const release=()=>{if(released)return;released=true;layer?.dispose();cap?.dispose();paint?.dispose();worker?.root.removeFromParent();worker?.skeleton.dispose();worker?.dispose();capTextures.forEach(t=>t.dispose());};
 const cancelled=()=>disposed||token!==version;
 const actorLoader={loadAsync:async url=>{if(cancelled())throw Error('Selection cancelled');const t=await loader.loadAsync(url);if(cancelled()){t.dispose();throw Error('Selection cancelled');}return t;}};
 loads++;
 try{
  if(!cache.has(profile.file))cache.set(profile.file,fetch('./'+profile.file).then(r=>{if(!r.ok)throw Error('Missing character mesh');return r.json();}).catch(e=>{cache.delete(profile.file);throw e;}));
  const data=await cache.get(profile.file);if(cancelled()){release();return;}
  worker=profile.create(data);paint=await createAnimalPaint(renderer,worker,profile,actorLoader,outfit);if(cancelled()){release();return;}for(const part of worker.parts)part.material=paint.material;
  if(outfit==='red-hats'){cap=await createRedHatCap(renderer,worker,profile,{loadAsync:async url=>{const t=await actorLoader.loadAsync(url);capTextures.push(t);return t;}});if(cancelled()){release();return;}}
  const posture=createBattlePosture(worker,profile);if(worker.weapon?.root)worker.weapon.root.visible=false;layer=createBloodStainLayer(atlases[2],{parts:worker.parts,maxStains:8});
  if(disposed||token!==version){release();return;}
  actor?.dispose();actor={worker,paint,cap,layer,posture,profile,outfit,dispose:release};scene.add(worker.root);setupContacts();ready=true;$('loading').hidden=true;frame();return state;
 }catch(e){release();if(cancelled())return;$('loading').hidden=true;$('error').textContent=e.message;throw e;}
 finally{loads--;finishRendererDisposal();}
}
function pose(){
 const a=actor;neutral(a);const blend=T.MathUtils.smoothstep(time,.65,1.5),mode=$('pose').value;
 if(mode==='kneel'||mode==='prone'){a.posture.apply({heading:0,distance:0,blend:0,pose:{kneel:mode==='kneel'?blend:0,prone:mode==='prone'?blend:0}},{equipment:false});a.posture.ground();}
 if(mode==='flex'){
  const named=Object.fromEntries(a.worker.bones.map(b=>[b.name,b])),spine=named.spine||named.breast;spine.rotation.z+=.16*blend*Math.sin(time*3);a.worker.root.rotation.y=.7*blend*Math.sin(time*2);
  for(const side of [-1,1]){const arm=named['upperArm'+side]||named['wing '+side];if(arm)arm.rotation.z+=.25*blend*Math.sin(time*3+side);}
 }
 a.worker.root.updateMatrixWorld(true);a.worker.skeleton.update();
}
function frame(){
 if(!ready||disposed)return;pose();const width=host.clientWidth,height=host.clientHeight,mobile=width<670,split=mobile?.58:.66,mode=$('effect').value;
 for(const stain of actor.layer.stains)stain.mesh.visible=$('stains').checked&&time>=.025&&(mode==='pair'||stain.kind===mode);
 guides.visible=$('guides').checked;
 const color=palette[$('background').value];renderer.setClearColor(color,1);floor.material=$('background').value==='grass'?grass:plain;plain.color.setHex(color);renderer.setSize(width,height,false);renderer.setScissorTest(true);renderer.info.reset();
 const direction={three:[4,1.7,6],front:[6,.5,.3],rear:[-6,.5,.3],side:[0,.5,6]}[$('view').value],panels=mobile?[[0,height*(1-split),width,height*split],[0,0,width,height*(1-split)]]:[[0,0,width*split,height],[width*split,0,width*(1-split),height]];
 let cards=0;
 for(let i=0;i<2;i++){
  const [x,y,w,h]=panels[i],camera=cameras[i],ppu=i===0?Math.min(285,(h-70)/1.9):55;camera.position.set(...direction).add(new T.Vector3(0,.9,0));camera.lookAt(0,.9,0);camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.near=.01;camera.far=30;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);cards=0;
  for(const [kind,effect]of [['entry',entry],['exit',exit]]){const contact=actor.contacts[kind];effect.mesh.visible=false;if(contact&&(mode==='pair'||mode===kind)){effect.setFrame(contact.matrix);cards+=effect.update(time,camera,{still:$('motion').value==='still',floor:0}).liveCards;}}
  renderer.render(scene,camera);
 }
 renderer.setScissorTest(false);$('time').value=String(time);$('clock').textContent=time.toFixed(3)+' s';$('play').textContent=playing?'Pause':'Play';
 const stains=actor.layer.stains;$('status').textContent=`${actor.profile.label} · ${cards} spray cards · ${stains.length} persistent paint patches (${stains.reduce((s,p)=>s+p.triangles,0)} triangles) · ${actor.profile.unarmed?'Hen uses wing articulation for the flex check':''}`;
 state={time,animal:actor.profile.id,outfit:actor.outfit,site:$('site').value,pose:$('pose').value,stains:stains.length,patchTriangles:stains.reduce((s,p)=>s+p.triangles,0),cards,contacts:Object.keys(actor.contacts),resources:{...renderer.info.memory},drawCalls:renderer.info.render.calls};return state;
}
function tick(now){raf=0;if(!playing||disposed)return;if(last)time=(time+(now-last)/1000*Number($('speed').value))%3;last=now;frame();raf=requestAnimationFrame(tick);}
function play(value){playing=value;last=0;if(!value){cancelAnimationFrame(raf);raf=0;}else if(!raf)raf=requestAnimationFrame(tick);frame();}
// A shared paint helper may have an internal awaited registration fetch. Keep
// the renderer alive until cancelled actor work releases its temporary paints.
function finishRendererDisposal(){if(disposed&&loads===0&&!rendererDisposed){rendererDisposed=true;renderer.dispose();window.bloodWoundsDisposed=true;}}
function dispose(){if(disposed)return;disposed=true;ready=false;version++;cancelAnimationFrame(raf);observer?.disconnect();actor?.dispose();entry?.dispose();exit?.dispose();clearGuides();textures.forEach(t=>t.dispose());floor.geometry.dispose();grass.dispose();plain.dispose();grid.geometry.dispose();grid.material.dispose();finishRendererDisposal();}
addEventListener('pagehide',dispose,{once:true});
try{
 atlases=await Promise.all([loadTexture(BLOOD_ATLAS),loadTexture(EXIT_ATLAS),loadTexture(STAIN_ATLAS)]);if(!disposed){resetEffects();await select();if(disposed)throw Error('Study disposed during loading');observer=new ResizeObserver(frame);observer.observe(host);
 $('play').onclick=()=>play(!playing);$('restart').onclick=()=>{time=0;stamp();play(true);};$('time').oninput=()=>{const value=Number($('time').value);play(false);time=value;frame();};
 for(const id of ['animal','outfit'])$(id).onchange=()=>select().catch(console.error);$('site').onchange=()=>{setupContacts();frame();};$('motion').onchange=()=>{resetEffects();frame();};for(const id of ['effect','pose','view','background','speed','stains','guides'])$(id).onchange=frame;
 $('clear').onclick=()=>{actor.layer.clear();frame();};$('restamp').onclick=()=>{neutral(actor);setupContacts();frame();};
 window.bloodWoundsStudy={ready:true,renderer,scene,get actor(){return actor;},get state(){return state;},async set(values){play(false);const change=('animal'in values&&values.animal!==$('animal').value)||('outfit'in values&&values.outfit!==$('outfit').value);for(const [k,v]of Object.entries(values)){if(k==='time')time=Number.isFinite(Number(v))?Math.max(0,Math.min(3,Number(v))):0;else if($(k)?.type==='checkbox')$(k).checked=!!v;else if($(k)?.options&&[...$(k).options].some(o=>o.value===String(v)))$(k).value=String(v);}if('motion'in values)resetEffects();if(change)await select();else if('site'in values)setupContacts();return frame();},restamp(){neutral(actor);setupContacts();return frame();},clear(){actor.layer.clear();return frame();},frame,dispose};frame();play(playing);
 }
}catch(e){if(!disposed){$('loading').hidden=true;$('error').textContent=e.message;console.error(e);}dispose();}
