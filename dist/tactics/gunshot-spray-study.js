import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createBattlePosture} from './battle-posture.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {gunshotSprayFrame} from './gunshot-spray-frame.js';
import {validBodyImpact} from './gunshot-impacts.js';
import {BLOOD_ATLAS} from './painted-blood-spray-data.js';
import {createPaintedBloodSpray} from './painted-blood-spray.js';
import {DIMENSIONS} from './hybrid-world.js';

const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),abort=new AbortController();
const loader=new T.TextureLoader(),models=new Map(),pendingModels=new Map(),scene=new T.Scene(),camera=new T.OrthographicCamera();
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.prepend(renderer.domElement);
scene.background=new T.Color(0x344433);scene.add(new T.HemisphereLight(0xffeed5,0x606c60,2.3));const sun=new T.DirectionalLight(0xffe8cd,2.1);sun.position.set(-3,6,7);scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(6,6),new T.MeshStandardMaterial({color:0x6d7959,roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const grid=new T.GridHelper(6,6,0xb4b99a,0x8d9e79);grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const markers=new T.Group(),incomingArrow=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(),.65,0xffd784,.08,.04),sprayArrow=new T.ArrowHelper(new T.Vector3(-1,0,0),new T.Vector3(),.52,0xf16f5a,.08,.04);
const markGeometry=new T.SphereGeometry(.015,8,6),skinDot=new T.Mesh(markGeometry,new T.MeshBasicMaterial({color:0x88ffab})),colliderDot=new T.Mesh(markGeometry,new T.MeshBasicMaterial({color:0xffffff}));
markers.add(incomingArrow,sprayArrow,skinDot,colliderDot);scene.add(markers);
let disposed=false,fixture,atlas,effect,receipt,placement,model,observer,raf=0,last=0,time=.065,playing=!params.has('paused'),selection=0;
if(params.has('time')&&Number.isFinite(Number(params.get('time'))))time=Math.max(0,Math.min(.48,Number(params.get('time'))));
if(matchMedia('(prefers-reduced-motion: reduce)').matches)$('motion').value='still';

async function createModel(id){
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id);if(!profile)throw Error('No character profile for '+id);
 const response=await fetch(new URL(profile.file,import.meta.url),{signal:abort.signal});if(!response.ok)throw Error('Character mesh could not load');
 const worker=profile.create(await response.json());let paint;
 try{
  paint=await createAnimalPaint(renderer,worker,profile,loader);
  if(disposed){paint.dispose();worker.skeleton.dispose();worker.dispose();return null;}
  for(const part of worker.parts)part.material=paint.material;
  const root=new T.Group();root.add(worker.root);root.visible=false;scene.add(root);
  const value={worker,paint,profile,root,posture:createBattlePosture(worker,profile),locomotion:createWorkerLocomotion(worker,profile)};models.set(id,value);return value;
 }catch(error){paint?.dispose();worker.skeleton.dispose();worker.dispose();throw error;}
}
async function loadModel(id){
 if(models.has(id))return models.get(id);
 if(!pendingModels.has(id))pendingModels.set(id,createModel(id).finally(()=>pendingModels.delete(id)));
 return pendingModels.get(id);
}
function selectedCase(){return fixture.cases.find(c=>c.id===$('case').value);}
function impactOptions(){
 const list=selectedCase().actions.flatMap(a=>a.bodyImpacts);$('impact').replaceChildren(...list.map((r,i)=>new Option(`${i+1} · ${r.zone} · ${r.victimId}`,String(i))));
}
async function select(){
 const generation=++selection;$('loading').hidden=false;$('error').textContent='';cancelAnimationFrame(raf);raf=0;last=0;placement=null;
 try{
  receipt=selectedCase().actions.flatMap(a=>a.bodyImpacts)[Number($('impact').value)];
  if(!validBodyImpact(receipt))throw Error('Invalid shared impact record');
  const selectedReceipt=receipt,id=$('reference').value==='actual'?receipt.victim.species:$('reference').value,value=await loadModel(id);
  if(disposed||generation!==selection)return;
  model=value;for(const m of models.values())m.root.visible=m===model;
  const r=selectedReceipt,base=r.victim.support.level*DIMENSIONS.floorSpacing+r.victim.support.offset;
  model.root.position.set(0,0,0);model.worker.root.position.set(0,0,0);model.worker.pose('neutral');
  const pose=r.victim.stance==='prone'?{prone:1}:r.victim.stance==='kneeling'?{kneel:1}:{};
  const sample={heading:r.victim.heading,distance:0,blend:0,pose};model.locomotion.apply(sample);model.posture.apply(sample,{equipment:false});if(Object.keys(pose).length)model.posture.ground();
  if(model.worker.weapon?.root)model.worker.weapon.root.visible=false;
  model.root.position.set(r.victim.x,base,r.victim.y);model.root.updateMatrixWorld(true);model.worker.skeleton.update();
  for(const part of model.worker.parts){part.computeBoundingBox?.();part.computeBoundingSphere?.();}
  placement=gunshotSprayFrame(r,$('skin').checked?{model:{victimId:r.victimId,parts:model.worker.parts}}:{});
  effect?.dispose();effect=createPaintedBloodSpray(atlas,{seed:placement.visualSeed,reduced:$('motion').value==='reduced'});effect.setFrame(placement.matrix);scene.add(effect.mesh);
  floor.position.set(r.victim.x,base-.015,r.victim.y);grid.position.set(r.victim.x,base-.01,r.victim.y);
  colliderDot.position.copy(placement.colliderContact);skinDot.position.copy(placement.contact);
  incomingArrow.position.copy(placement.colliderContact).addScaledVector(placement.incoming,-.8);incomingArrow.setDirection(placement.incoming);
  sprayArrow.position.copy(placement.contact);sprayArrow.setDirection(placement.outgoing);
  $('loading').hidden=true;frame();if(playing)raf=requestAnimationFrame(tick);
 }catch(error){if(!disposed&&generation===selection){$('loading').hidden=true;$('error').textContent=error.message;console.error(error);}}
}
function frame(){
 if(disposed||!placement)return;
 const w=host.clientWidth,h=host.clientHeight,mobile=w<650,split=mobile?.58:.66;
 const panels=mobile?[[0,h*(1-split),w,h*split],[0,0,w,h*(1-split)]]:[[0,0,w*split,h],[w*split,0,w*(1-split),h]];
 const bodyBase=model.root.position.y,target=new T.Vector3(receipt.victim.x,bodyBase+.9,receipt.victim.y),side=new T.Vector3().crossVectors(placement.incoming,new T.Vector3(0,1,0));
 if(side.lengthSq()<.001)side.set(1,0,0);side.normalize();
 const view=$('view').value,direction=view==='side'?side.clone().multiplyScalar(5):placement.incoming.clone().multiplyScalar(view==='rear'?4:-4).addScaledVector(side,1.6);direction.y=2.2;
 markers.visible=$('axes').checked;renderer.setSize(w,h,false);renderer.setScissorTest(true);
 for(let i=0;i<panels.length;i++){
  const [x,y,width,height]=panels[i],ppu=i===0?Math.min(240,(height-65)/2):55;
  camera.position.copy(target).add(direction);camera.lookAt(target);camera.left=-width/(2*ppu);camera.right=width/(2*ppu);camera.top=height/(2*ppu);camera.bottom=-height/(2*ppu);camera.near=.01;camera.far=40;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  renderer.setViewport(x,y,width,height);renderer.setScissor(x,y,width,height);effect.update(time,camera,{still:$('motion').value==='still',floor:placement.floor});renderer.render(scene,camera);
 }
 renderer.setScissorTest(false);$('time').value=String(Math.min(.48,time));$('clock').textContent=Math.min(.48,time).toFixed(3)+' s';$('play').textContent=playing?'Pause':'Play';
 const p=v=>v.toArray().map(n=>n.toFixed(3)).join(', ');
 $('details').textContent=`${selectedCase().id} · ${receipt.projectileId} → ${receipt.victimId} · ${receipt.zone} · layer ${receipt.victim.support.level+1}\n${placement.placement}${placement.surfacePart?' · '+placement.surfacePart:''} · correction ${placement.correction.toFixed(3)} tiles (limit 0.400)\nRender contact: ${p(placement.contact)} · incoming: ${p(placement.incoming)} · spray: ${p(placement.outgoing)}\nInjury ${receipt.injuryDamage} · HP ${receipt.hpBefore} → ${receipt.hpAfter} · art seed ${receipt.visualSeed}`;
}
function tick(now){raf=0;if(!playing||disposed||!placement)return;if(last)time=(time+(now-last)/1000*.5)%1.2;last=now;frame();raf=requestAnimationFrame(tick);}
function play(value){playing=value;last=0;cancelAnimationFrame(raf);raf=0;frame();if(playing&&placement)raf=requestAnimationFrame(tick);}
function dispose(){
 if(disposed)return;disposed=true;selection++;abort.abort();cancelAnimationFrame(raf);observer?.disconnect();effect?.dispose();atlas?.dispose();
  for(const m of models.values()){m.paint.dispose();m.locomotion.dispose();m.worker.skeleton.dispose();m.worker.dispose();}floor.geometry.dispose();floor.material.dispose();grid.geometry.dispose();grid.material.dispose();incomingArrow.dispose();sprayArrow.dispose();markGeometry.dispose();skinDot.material.dispose();colliderDot.material.dispose();renderer.dispose();
}
addEventListener('pagehide',dispose,{once:true});
try{
 const response=await fetch(new URL('./fixtures/gunshot-impacts.v1.json',import.meta.url),{signal:abort.signal});if(!response.ok)throw Error('Impact fixture could not load');fixture=await response.json();
 $('case').replaceChildren(...fixture.cases.map(c=>new Option(c.id,c.id)));if(fixture.cases.some(c=>c.id===params.get('case')))$('case').value=params.get('case');
 if(['actual','horse','hen'].includes(params.get('reference')))$('reference').value=params.get('reference');
 atlas=await loader.loadAsync(BLOOD_ATLAS);if(disposed){atlas.dispose();}else{
  impactOptions();$('case').onchange=()=>{impactOptions();select();};for(const id of ['impact','reference','skin','motion'])$(id).onchange=select;
  $('view').onchange=frame;$('axes').onchange=frame;$('play').onclick=()=>play(!playing);$('restart').onclick=()=>{time=0;play(true);};
  $('time').oninput=()=>{const value=Number($('time').value);play(false);time=value;frame();};observer=new ResizeObserver(frame);observer.observe(host);await select();
 }
}catch(error){if(!disposed){$('loading').hidden=true;$('error').textContent=error.message;console.error(error);}dispose();}
