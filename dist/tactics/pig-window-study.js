import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWeaponModel} from './weapon-models.js';
import {createPigWindowMotion} from './pig-window-motion.js';
import {sampleSneakWindow,SNEAK_DURATION,SNEAK_PHASES} from './weighted-window-supported.js';
import {createWindowShatter} from './window-shatter.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
if(['side','three','front'].includes(params.get('view')))$('view').value=params.get('view');
$('reference-link').href='weighted-window-study.html?entry=sneak&view='+$('view').value;
const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x2c3b32);
const camera=new T.OrthographicCamera(),up=new T.Vector3(0,1,0),ownedGeometries=new Set(),ownedMaterials=new Set();
const ownGeometry=g=>(ownedGeometries.add(g),g),ownMaterial=m=>(ownedMaterials.add(m),m);
function mesh(g,m){return new T.Mesh(ownGeometry(g),m);}
function createStage(){
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xe7f1dd,0x546754,2));
 const sun=new T.DirectionalLight(0xffefcf,2.1);sun.position.set(-3,6,5);scene.add(sun);
 const floor=mesh(new T.PlaneGeometry(14,14),ownMaterial(new T.MeshStandardMaterial({color:0x4d5c4d,roughness:1})));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.003;scene.add(floor);
 const grid=new T.GridHelper(14,14,0x80937c,0x65745d);grid.position.z=.5;scene.add(grid);ownGeometry(grid.geometry);ownMaterial(grid.material);
 const tile=mesh(new T.PlaneGeometry(1,1),ownMaterial(new T.MeshBasicMaterial({color:0xa5c47d,transparent:true,opacity:.18,depthWrite:false})));
 tile.rotation.x=-Math.PI/2;tile.position.set(.5,.004,0);scene.add(tile);
 const outline=new T.LineLoop(ownGeometry(new T.BufferGeometry().setFromPoints([[0,.008,-.5],[1,.008,-.5],[1,.008,.5],[0,.008,.5]].map(p=>new T.Vector3(...p)))),ownMaterial(new T.LineBasicMaterial({color:0xc8d79e})));scene.add(outline);
 const wall=new T.Group(),frame=new T.Group();scene.add(wall,frame);
 const wallMaterial=ownMaterial(new T.MeshStandardMaterial({color:0x979381,roughness:1,transparent:true,opacity:.70}));
 const frameMaterial=ownMaterial(new T.MeshStandardMaterial({color:0xe4d3a4,roughness:1}));
 function box(group,y,z,h,w,depth,material){const b=mesh(new T.BoxGeometry(depth,h,w),material);b.position.set(0,y,z);group.add(b);}
 box(wall,.425,0,.85,1,.16,wallMaterial);box(wall,1.775,0,.45,1,.16,wallMaterial);
 for(const z of [-.8,.8])box(wall,1,z,2,.6,.16,wallMaterial);
 for(const y of [.8625,1.5375])box(frame,y,0,.025,1,.18,frameMaterial);
 for(const z of [-.4875,.4875])box(frame,1.2,z,.7,.025,.18,frameMaterial);
 const glass=createWindowShatter({kind:'window-concrete'});glass.group.rotation.y=Math.PI/2;scene.add(glass.group);
 return {scene,wall,frame,glass};
}
const pigStage=createStage(),referenceStage=createStage(),start=sampleSneakWindow(0);
const boneMaterial=ownMaterial(new T.MeshStandardMaterial({color:0xd5e2d8,roughness:.8}));
const weightMaterial=ownMaterial(new T.MeshStandardMaterial({color:0x48a8c6,roughness:.7}));
const envelopes=[],segments=start.segments.map(segment=>{
 const group=new T.Group(),envelope=mesh(new T.CapsuleGeometry(segment.radius,segment.length,5,10),ownMaterial(new T.MeshStandardMaterial({color:segment.name==='head'?0xeda16f:0x88bfcc,transparent:true,opacity:.18,depthWrite:false})));
 group.add(envelope,mesh(new T.CylinderGeometry(.012,.012,segment.length,6),boneMaterial),mesh(new T.SphereGeometry(.024*Math.cbrt(segment.mass),10,8),weightMaterial));referenceStage.scene.add(group);envelopes.push(envelope);return group;
});
const center=mesh(new T.SphereGeometry(.032,12,10),ownMaterial(new T.MeshBasicMaterial({color:0xf4d372,depthTest:false})));center.renderOrder=3;referenceStage.scene.add(center);
let worker,paint,hands,motion,latest=null,time=0,playing=false,last=performance.now(),frame=0,closed=false,loading=true,disposed=false,width=1,height=1,stacked=false;
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='pig-director');
function stop(){playing=false;$('play').textContent='Play';}
function diagnostics(){return latest?{...latest,duration:SNEAK_DURATION,view:$('view').value,scale:worker.root.scale.toArray(),reference:{time,phase:sampleSneakWindow(time).phase,totalMass:81},physicsApproved:false}:null;}
function seek(t){if(!Number.isFinite(t))throw Error('Pig study time must be finite');stop();time=T.MathUtils.clamp(t,0,SNEAK_DURATION);render();return diagnostics();}
window.pigWindowStudy={ready:false,seek,diagnostics,renderer,scenes:[pigStage.scene,referenceStage.scene],camera};
function showDiagnostics(){
 const errors=latest.errors||[],targets=errors.filter(e=>e.constraint!=='free'&&e.constraint!=='reference'),max=targets.reduce((v,e)=>Math.max(v,Number.isFinite(e.error)?e.error:Infinity),0),bad=targets.filter(e=>!Number.isFinite(e.error)||e.error>.001);
 $('error-summary').textContent=targets.length?`Maximum authored marker error: ${Number.isFinite(max)?max.toFixed(4)+' tiles':'unavailable'}. ${bad.length} of ${targets.length} targets exceed 0.001 tile.`:'No authored support targets at this sample; contact support is unverified.';
 if(latest.fitting)$('error-summary').textContent+=' '+latest.supportNote;
 $('error-summary').classList.toggle('warn',bad.length>0||!targets.length||latest.authoredSupport===false);$('errors').replaceChildren();
 for(const e of errors){const li=document.createElement('li');li.textContent=e.constraint==='free'?`${e.name}: free pose, no support target`:e.constraint==='reference'?`${e.name}: ${e.error.toFixed(4)} tiles from reference (not a support target)`:`${e.name}: ${Number.isFinite(e.error)?e.error.toFixed(4)+' tiles':'unavailable'}`;$('errors').append(li);}
 const m=latest.mesh;
 $('mesh-summary').textContent=m?`${m.floorVertices} floor vertices · ${m.wallVertices} wall vertices · deepest floor penetration ${m.maxFloorDepth.toFixed(4)} tiles${Number.isFinite(m.accessoryMeshes)?' · '+m.accessoryMeshes+' accessory meshes checked':''}.`:'Mesh diagnostics unavailable.';
 $('mesh-summary').classList.toggle('warn',!!m&&(m.floorVertices>0||m.wallVertices>0));
}
function render(){
 if(!motion||closed)return;
 latest=motion.sample(time);const reference=sampleSneakWindow(time);
 for(const p of worker.parts)p.material=$('grey').checked?worker.grey:paint.material;
 reference.segments.forEach((s,i)=>{const a=new T.Vector3(...reference.points[s.a]),b=new T.Vector3(...reference.points[s.b]);segments[i].position.copy(a).lerp(b,.5);segments[i].quaternion.setFromUnitVectors(up,b.sub(a).normalize());});
 center.position.fromArray(reference.center);envelopes.forEach(m=>{m.visible=$('envelope').checked;});
 for(const stage of [pigStage,referenceStage]){stage.wall.visible=!$('cutaway').checked;stage.glass.sample(reference.glassTime);}
 const viewportWidth=stacked?width:width/2,viewportHeight=stacked?height/2:height,span=3.5,focus=new T.Vector3(.15,1.02,0);
 camera.left=-span*viewportWidth/viewportHeight/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.near=.01;camera.far=50;
 const direction={side:[0,.04,1],three:[-.7,.36,1],front:[1,.16,0]}[$('view').value];camera.position.copy(focus).add(new T.Vector3(...direction).multiplyScalar(9));camera.lookAt(focus);camera.updateProjectionMatrix();
 renderer.setScissorTest(true);
 [pigStage,referenceStage].forEach((stage,i)=>{const x=stacked?0:i*viewportWidth,y=stacked?(1-i)*viewportHeight:0;renderer.setViewport(x,y,viewportWidth,viewportHeight);renderer.setScissor(x,y,viewportWidth,viewportHeight);renderer.render(stage.scene,camera);});
 renderer.setScissorTest(false);$('time').value=time;$('time-label').textContent=`${time.toFixed(2)} / ${SNEAK_DURATION.toFixed(2)} s`;
 $('status').textContent=`${latest.phase||reference.phase} · experimental pig fitting; physics hold remains.`;showDiagnostics();
}
function resize(){const bounds=$('stage').getBoundingClientRect();width=Math.round(bounds.width);height=Math.round(bounds.height);stacked=matchMedia('(max-width:760px)').matches;renderer.setSize(width,height,false);render();}
$('view').onchange=()=>{const url=new URL(location.href);url.searchParams.set('view',$('view').value);history.replaceState(null,'',url);$('reference-link').href='weighted-window-study.html?entry=sneak&view='+$('view').value;render();};
for(const id of ['grey','cutaway','envelope'])$(id).onchange=render;
$('time').oninput=()=>seek(Number($('time').value));$('reset').onclick=()=>seek(0);
$('play').onclick=()=>{if(time>=SNEAK_DURATION)time=0;playing=!playing;$('play').textContent=playing?'Pause':'Play';last=performance.now();render();};
function phaseButtons(phases){$('phases').replaceChildren();for(const phase of phases){const button=document.createElement('button');button.textContent=phase.label;button.onclick=()=>seek((phase.start+phase.end)/2);$('phases').append(button);}}
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
function animate(now){if(playing&&motion){time=Math.min(SNEAK_DURATION,time+Math.min((now-last)/1000,.05)*Number($('speed').value));if(time>=SNEAK_DURATION)stop();render();}last=now;frame=requestAnimationFrame(animate);}
resize();frame=requestAnimationFrame(animate);
function cleanup(){
 if(disposed||loading)return;disposed=true;
 motion?.dispose?.();paint?.dispose();hands?.dispose();worker?.skeleton.dispose();worker?.dispose();
 for(const stage of [pigStage,referenceStage])stage.glass.dispose();ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());renderer.dispose();
}
// Awaited paint creation can allocate textures after pagehide. Keep the renderer
// and rig alive until that work settles, then dispose the returned paint too.
addEventListener('pagehide',()=>{closed=true;window.pigWindowStudy.ready=false;stop();cancelAnimationFrame(frame);cleanup();},{once:true});
try{
 const response=await fetch(profile.file);if(!response.ok)throw Error('Pig director mesh failed to load');
 const data=await response.json();
 if(!closed){
  worker=profile.create(data);hands=createWeaponModel('hands');worker.equipWeapon(hands);
  paint=await createAnimalPaint(renderer,worker,profile,new T.TextureLoader(),'normal');
  if(!closed){for(const p of worker.parts)p.material=paint.material;motion=createPigWindowMotion(worker);phaseButtons(motion.phases);pigStage.scene.add(worker.root);Object.assign(window.pigWindowStudy,{ready:true,worker,motion});$('play').disabled=$('reset').disabled=$('time').disabled=false;render();}
 }
}catch(error){$('status').textContent='Study could not load: '+error.message;console.error(error);}
finally{loading=false;if(closed)cleanup();}
