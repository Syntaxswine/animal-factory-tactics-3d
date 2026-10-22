import * as T from './vendor/three.module.js';
import {FATAL_HEAD_ATLAS} from './fatal-head-data.js';
import {BLOOD_ATLAS} from './painted-blood-spray-data.js';
import {createFatalHeadBurst} from './fatal-head-motion.js';
import {createPaintedBloodSpray} from './painted-blood-spray.js';
import {createFatalHeadMask} from './fatal-head-mask.js';
import {createCasualtyWeaponDrop} from './casualty-weapon-drop.js';
import {createCasualtyWeaponPose} from './casualty-weapon-pose.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createBattlePosture} from './battle-posture.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {createWeaponModel} from './weapon-models.js';
import {createRedHatCap} from './red-hat-model.js';
import {createPaintedGrass} from './painted-grass.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),loader=new T.TextureLoader(),textures=[],cache=new Map(),IMPACT=.3,RELEASE=.42;
for(const p of ANIMAL_MOTION_CATALOG)$('animal').add(new Option(p.label,p.id));for(const id of ['animal','outfit','weapon','stance','presentation','motion','view','background','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
if(!params.has('motion')&&matchMedia('(prefers-reduced-motion: reduce)').matches)$('motion').value='still';if(params.has('fall'))$('fall').checked=params.get('fall')!=='0';
let time=Number(params.get('time')||.35);if(!Number.isFinite(time))time=.35;time=T.MathUtils.clamp(time,0,3.2);
let disposed=false,ready=false,playing=!params.has('paused'),raf=0,last=0,version=0,loads=0,rendererDisposed=false,actor,atlas,burst,reduced,observer,state;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.info.autoReset=false;host.prepend(renderer.domElement);
const scene=new T.Scene(),cameras=[new T.OrthographicCamera(),new T.OrthographicCamera()];scene.add(new T.HemisphereLight(0xffeed5,0x606c60,2.3));const sun=new T.DirectionalLight(0xffe8cd,2.1);sun.position.set(-3,6,7);scene.add(sun);
const grass=createPaintedGrass(),plain=new T.MeshBasicMaterial(),floor=new T.Mesh(new T.PlaneGeometry(10,10),grass);floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);const grid=new T.GridHelper(8,8,0x829078,0x899278);grid.material.transparent=true;grid.material.opacity=.18;scene.add(grid);let guide;
async function texture(url){const t=await loader.loadAsync(url);if(disposed){t.dispose();throw Error('Study disposed');}t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
function baseSample(down=0){const stance=$('stance').value;return {heading:0,distance:0,blend:0,pose:{down,dead:down,kneel:stance==='kneeling'?1-down:0,prone:stance==='prone'?1-down:0}};}
function intactPose(a,down){a.heldPose.apply(baseSample(down),{proneStart:$('stance').value==='prone'});}
function pose(a,down){a.mask?.withIntactGeometry(()=>intactPose(a,down));a.mask.setDestroyed(time>=IMPACT&&$('presentation').value==='full');a.posture.ground();a.worker.root.updateMatrixWorld(true);a.worker.skeleton.update();}
function setupContact(){
 const a=actor;a.mask.setDestroyed(false);a.mask.withIntactGeometry(()=>{intactPose(a,0);a.posture.ground();});
 const primary=a.worker.parts.find(p=>p.name===a.mask.primaryName)||a.worker.parts.find(p=>/skull|head and feathered neck/.test(p.name));
 const skeleton=primary.skeleton,head=skeleton.bones.find(b=>b.name==='head'),delta=head.matrixWorld.clone().multiply(skeleton.boneInverses[skeleton.bones.indexOf(head)]),target=new T.Vector3(...(a.profile.eye||[.06,1.385,.11])).applyMatrix4(delta),outgoing=new T.Vector3(1,0,0).transformDirection(delta),ray=new T.Raycaster(target.clone().addScaledVector(outgoing,3),outgoing.clone().negate(),0,6);ray.layers.enableAll();
 const hit=primary?ray.intersectObject(primary,false)[0]:null;let contact=hit?.point;
 if(!contact){let distance=Infinity;const p=primary?.geometry.attributes.position;for(let i=0;p&&i<p.count;i++){const point=primary.getVertexPosition(i,new T.Vector3()).applyMatrix4(primary.matrixWorld),d=point.distanceToSquared(target);if(d<distance){distance=d;contact=point;}}}
 if(!contact)throw Error('No authored head surface');const up=(Math.abs(outgoing.y)>.99?new T.Vector3(0,0,1):new T.Vector3(0,1,0));up.addScaledVector(outgoing,-up.dot(outgoing)).normalize();a.contact=contact;a.frame=new T.Matrix4().makeBasis(outgoing,up,new T.Vector3().crossVectors(outgoing,up)).setPosition(contact);a.contactMode=hit?'surface-ray':'nearest-authored-vertex';
 guide?.dispose();guide?.removeFromParent();guide=new T.ArrowHelper(outgoing,contact,.65,0xf4cd87,.065,.03);scene.add(guide);
 a.drop?.capture(a.worker.weapon.root.matrixWorld,{floor:0});
}
async function select(){
 const token=++version,profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===$('animal').value);if(!profile)throw Error('Unknown animal');if($('outfit').value==='blue-hawaiian'&&profile.id!=='donkey')$('outfit').value='normal';if(profile.unarmed)$('weapon').value='hands';
 const outfit=$('outfit').value,weapon=$('weapon').value;$('loading').hidden=false;let worker,paint,cap,posture,locomotion,gun,mask,drop,heldPose,released=false;const capTextures=[];
 const cancelled=()=>disposed||token!==version,release=()=>{if(released)return;released=true;drop?.dispose();mask?.dispose();locomotion?.dispose();cap?.dispose();paint?.dispose();if(gun&&gun!==worker?.rifle)gun.dispose();worker?.root.removeFromParent();worker?.skeleton.dispose();worker?.dispose();capTextures.forEach(t=>t.dispose());},ownedLoader={loadAsync:async url=>{if(cancelled())throw Error('Cancelled');const t=await loader.loadAsync(url);if(cancelled()){t.dispose();throw Error('Cancelled');}return t;}};loads++;
 try{
  if(!cache.has(profile.file))cache.set(profile.file,fetch('./'+profile.file).then(r=>{if(!r.ok)throw Error('Missing character mesh');return r.json();}).catch(e=>{cache.delete(profile.file);throw e;}));const data=await cache.get(profile.file);if(cancelled()){release();return;}
  worker=profile.create(data);paint=await createAnimalPaint(renderer,worker,profile,ownedLoader,outfit);if(cancelled()){release();return;}for(const p of worker.parts)p.material=paint.material;
  if(outfit==='red-hats'){cap=await createRedHatCap(renderer,worker,profile,{loadAsync:async url=>{const t=await ownedLoader.loadAsync(url);capTextures.push(t);return t;}});if(cancelled()){release();return;}}
  if(!profile.unarmed){gun=createWeaponModel(weapon);worker.equipWeapon(gun);drop=createCasualtyWeaponDrop(gun);}posture=createBattlePosture(worker,profile);locomotion=createWorkerLocomotion(worker,profile);heldPose=createCasualtyWeaponPose(worker,profile,posture,locomotion);mask=createFatalHeadMask(worker,{species:profile.id,texture:atlas});
  if(cancelled()){release();return;}actor?.dispose();actor={worker,profile,outfit,weapon,paint,cap,posture,locomotion,mask,drop,heldPose,dispose:release};scene.add(worker.root);if(drop)scene.add(drop.root);setupContact();ready=true;$('loading').hidden=true;frame();return state;
 }catch(e){release();if(cancelled())return;$('loading').hidden=true;$('error').textContent=e.message;throw e;}finally{loads--;finishRendererDisposal();}
}
function frame(){
 if(!ready||disposed)return;const age=time-IMPACT,down=$('fall').checked?T.MathUtils.smoothstep(time,RELEASE,1.3):0;pose(actor,down);const releaseAge=$('fall').checked?time-RELEASE:-1,weaponDrop=actor.drop?.update(releaseAge)||{phase:'unarmed',visible:false,opacity:0};if(actor.drop&&releaseAge>=0)actor.worker.weapon.root.visible=false;
 const width=host.clientWidth,height=host.clientHeight,mobile=width<670,split=mobile?.58:.66,palette={grass:0x526449,snow:0xdce1d2,room:0x202b27},color=palette[$('background').value];renderer.setClearColor(color,1);floor.material=$('background').value==='grass'?grass:plain;plain.color.setHex(color);renderer.setSize(width,height,false);renderer.setScissorTest(true);renderer.info.reset();guide.visible=$('guides').checked;
 const target=new T.Vector3(0,.9-.45*down,0),direction={three:[4,2,6],front:[6,.8,.3],rear:[-6,.8,.3],top:[2,7,3]}[$('view').value],panels=mobile?[[0,height*(1-split),width,height*split],[0,0,width,height*(1-split)]]:[[0,0,width*split,height],[width*split,0,width*(1-split),height]];let cards=0;
 for(let i=0;i<2;i++){const [x,y,w,h]=panels[i],camera=cameras[i],ppu=i===0?Math.min(280,(h-70)/1.9):55;camera.position.set(...direction).add(target);camera.lookAt(target);camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.near=.01;camera.far=30;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);burst.mesh.visible=reduced.mesh.visible=false;cards=0;
  const effect=$('presentation').value==='full'?burst:$('presentation').value==='reduced'?reduced:null;if(effect){effect.setFrame(actor.frame);cards=effect.update(age,camera,{still:$('motion').value==='still',floor:0}).liveCards;}renderer.render(scene,camera);
 }
 renderer.setScissorTest(false);$('time').value=String(time);$('clock').textContent=time.toFixed(3)+' s';$('play').textContent=playing?'Pause':'Play';const diagnostics=actor.mask.diagnostics();$('status').textContent=`${actor.profile.label} · supplied fatal outcome · ${actor.mask.destroyed?'head mask active':'ordinary head presentation'} · ${cards} effect cards · ${diagnostics.closureTriangles} closure triangles · ${actor.contactMode}`;
 state={time,animal:actor.profile.id,outfit:actor.outfit,weapon:actor.weapon,stance:$('stance').value,presentation:$('presentation').value,headRemoved:actor.mask.destroyed,logicalOutcome:'supplied fatalHead / dead',cards,down,weaponDrop,mask:diagnostics,resources:{...renderer.info.memory}};return state;
}
function tick(now){raf=0;if(!playing||disposed)return;if(last)time=(time+(now-last)/1000*Number($('speed').value))%3.2;last=now;frame();raf=requestAnimationFrame(tick);}
function play(value){playing=value;last=0;if(!value){cancelAnimationFrame(raf);raf=0;}else if(!raf)raf=requestAnimationFrame(tick);frame();}
function finishRendererDisposal(){if(disposed&&loads===0&&!rendererDisposed){rendererDisposed=true;renderer.dispose();window.fatalHeadStudyDisposed=true;}}
function dispose(){if(disposed)return;disposed=true;ready=false;version++;cancelAnimationFrame(raf);observer?.disconnect();actor?.dispose();burst?.dispose();reduced?.dispose();guide?.dispose();guide?.removeFromParent();textures.forEach(t=>t.dispose());floor.geometry.dispose();grass.dispose();plain.dispose();grid.geometry.dispose();grid.material.dispose();finishRendererDisposal();}
addEventListener('pagehide',dispose,{once:true});
try{[atlas]=await Promise.all([texture(FATAL_HEAD_ATLAS),texture(BLOOD_ATLAS).then(t=>{reduced=createPaintedBloodSpray(t,{seed:231024,reduced:true});scene.add(reduced.mesh);return t;})]);if(!disposed){burst=createFatalHeadBurst(atlas,{seed:231025});scene.add(burst.mesh);await select();if(disposed)throw Error('Disposed during loading');observer=new ResizeObserver(frame);observer.observe(host);
 $('play').onclick=()=>play(!playing);$('restart').onclick=()=>{time=0;play(true);};$('time').oninput=()=>{const t=Number($('time').value);play(false);time=t;frame();};for(const id of ['animal','outfit','weapon'])$(id).onchange=()=>select().catch(console.error);$('stance').onchange=()=>{setupContact();frame();};for(const id of ['presentation','motion','view','background','speed','fall','guides'])$(id).onchange=frame;
 window.fatalHeadStudy={ready:true,scene,renderer,get actor(){return actor;},get state(){return state;},async set(values){play(false);const reload=['animal','outfit','weapon'].some(k=>k in values&&String(values[k])!==$(k).value);for(const [k,v]of Object.entries(values)){if(k==='time')time=Number.isFinite(Number(v))?T.MathUtils.clamp(Number(v),0,3.2):0;else if($(k)?.type==='checkbox')$(k).checked=!!v;else if($(k)?.options&&[...$(k).options].some(o=>o.value===String(v)))$(k).value=String(v);}if(reload)await select();else if('stance'in values)setupContact();return frame();},frame,dispose};frame();play(playing);
 }}catch(e){if(!disposed){$('loading').hidden=true;$('error').textContent=e.message;console.error(e);}dispose();}
