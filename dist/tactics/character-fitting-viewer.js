import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {hasFittedEquipment} from './fitted-character-roster.js';
import {createRedHatCap} from './red-hat-model.js';
import {createWeaponModel,WEAPON_MODELS} from './weapon-models.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {createBattlePosture} from './battle-posture.js';
import {createCrawlMotion} from './crawl-motion.js';
import {GAME_CAMERA} from './hybrid-world.js';
const $=id=>document.getElementById(id),query=new URLSearchParams(location.search),greyStage=query.get('stage')==='grey',loader=new T.TextureLoader(),host=$('viewport');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setClearColor(0x495a43);host.prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera();scene.add(new T.HemisphereLight(0xfff8e8,0x737775,2));const sun=new T.DirectionalLight(0xfff2dd,2.3);sun.position.set(3,5,4);scene.add(sun);
const grid=new T.GridHelper(12,12,0xa8ac84,0x6f805b);grid.position.y=-.006;scene.add(grid);
let actors=[],serial=0,disposed=false,playing=false,time=0,last=0,ready=false;
const species=hasFittedEquipment(query.get('animal'))?query.get('animal'):'bull',profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===species),horseProfile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');$('animal').value=species;
const data={author:await json(profile.file.replace('10k','author')),'10k':await json(profile.file),horse:await json(horseProfile.file)};
for(const [id,w]of Object.entries(WEAPON_MODELS))$('weapon').add(new Option(w.label,id));$('weapon').value='rifle';
for(const id of ['outfit','mesh','pose','weapon','view','scale'])if(query.has(id)&&[...$(id).options].some(o=>o.value===query.get(id)))$(id).value=query.get(id);
if(greyStage)$('grey').checked=true;
async function json(file){const r=await fetch('./'+file);if(!r.ok)throw Error(file+': '+r.status);return r.json();}
function release(actor){if(!actor)return;actor.motion?.dispose?.();actor.cap?.dispose();actor.paint?.dispose();actor.worker?.root.removeFromParent();actor.worker?.dispose();if(actor.profile?.id!=='bear')actor.worker?.skeleton.dispose();actor.weapon?.dispose();}
async function make(outfit,mesh){
 const selected=outfit==='horse'?horseProfile:profile;
 const actor={outfit,profile:selected};
 try{
  actor.worker=selected.create(outfit==='horse'?data.horse:data[mesh]);
  actor.weapon=createWeaponModel($('weapon').value);actor.worker.equipWeapon(actor.weapon);
  if(!greyStage)actor.paint=await createAnimalPaint(renderer,actor.worker,selected,loader,outfit==='horse'?'normal':outfit);
  if(outfit==='red-hats')actor.cap=await createRedHatCap(renderer,actor.worker,selected,loader);
  if($('pose').value==='walk')actor.motion=createWorkerLocomotion(actor.worker,selected);
  if(['kneel','prone'].includes($('pose').value))actor.motion=createBattlePosture(actor.worker,selected);
  if($('pose').value==='crawl')actor.motion=createCrawlMotion(actor.worker,selected);
  scene.add(actor.worker.root);return actor;
 }catch(e){release(actor);throw e;}
}
async function rebuild(){
 const token=++serial;ready=false;$('loading').hidden=false;$('error').textContent='';const pending=[];
 try{
  const outfits=$('outfit').value==='pair'?['normal','red-hats']:[$('outfit').value];if($('reference').checked)outfits.push('horse');
  for(const outfit of outfits){const actor=await make(outfit,$('mesh').value);pending.push(actor);if(disposed||token!==serial){pending.forEach(release);return;}}
  actors.forEach(release);actors=pending;ready=true;$('labels').replaceChildren(...actors.map(a=>{const span=document.createElement('span'),b=document.createElement('b');b.textContent=a.outfit==='horse'?'Horse · native scale':a.outfit==='normal'?profile.label+' - regular':profile.label+' - Red Hat';span.append(b);return span;}));
  $('loading').hidden=true;render();
 }catch(e){pending.forEach(release);if(token===serial){$('loading').hidden=true;$('error').textContent=String(e);}throw e;}
}
function pose(actor){
 const {worker,motion,profile}=actor,kind=$('pose').value,sample={heading:0,distance:time*.35,blend:1,pose:{kneel:kind==='kneel'?1:0,prone:kind==='prone'?1:0}};
 if(kind==='crawl')motion.at(sample.distance);
 else if(kind==='walk')motion.apply(sample);
 else if(kind==='kneel'||kind==='prone'){worker.root.position.set(0,0,0);worker.pose('carry');motion.apply({...sample,blend:0});motion.ground();}
 else {worker.root.position.set(0,0,0);worker.pose(kind==='neutral'?'neutral':'carry');}
 // Motion is sampled in place for comparison; accepted travel is not a game rule.
 worker.root.position.x=worker.root.position.z=0;worker.root.updateMatrixWorld(true);worker.skeleton.update();
 const grey=$('grey').checked||greyStage;worker.setGrey(grey);if(!grey&&actor.paint)for(const part of worker.parts)part.material=actor.paint.material;
 actor.paint?.setDebug($('coverage').checked);actor.cap?.setGrey(grey);for(const part of worker.parts)part.material.wireframe=$('wire').checked;if(actor.cap){actor.cap.mesh.material.wireframe=$('wire').checked;actor.cap.mesh.visible=!$('coverage').checked;}
}
function render(){
 if(!ready||disposed)return;
 const low=['prone','crawl'].includes($('pose').value),w=host.clientWidth,h=$('scale').value==='game'?300:620,ppu=$('scale').value==='game'?58:Math.min(300,(w/actors.length-24)/(low?2.2:1.16));host.style.height=h+'px';renderer.setSize(w,h);grid.visible=$('grid').checked&&!$('coverage').checked;renderer.setClearColor($('coverage').checked?0x303030:0x495a43);renderer.setScissorTest(true);
 actors.forEach(pose);
 const view=$('view').value,angles={front:[Math.PI/2,0],side:[0,0],back:[-Math.PI/2,0],three:[Math.PI/4,.22],top:[0,Math.PI/2-.001],game:[GAME_CAMERA.azimuth,GAME_CAMERA.elevation]},[a,e]=angles[view];
 for(let i=0;i<actors.length;i++){
  const x=Math.floor(w*i/actors.length),width=Math.floor(w*(i+1)/actors.length)-x,focus=new T.Vector3(low?-.15:0,low?.28:.84,0);camera.left=-width/ppu/2;camera.right=width/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.1;camera.far=30;
  camera.position.copy(focus).add(new T.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(6));camera.lookAt(focus);camera.updateProjectionMatrix();actors.forEach((actor,j)=>actor.worker.root.visible=j===i);renderer.setViewport(x,0,width,h);renderer.setScissor(x,0,width,h);renderer.render(scene,camera);
 }
 renderer.setScissorTest(false);actors.forEach(a=>a.worker.root.visible=true);
 $('status').textContent=`${profile.label}: ${data[$('mesh').value].triangles.toLocaleString()} body triangles${actors.some(a=>a.cap)?' + '+actors.find(a=>a.cap).cap.triangles.toLocaleString()+' cap':''} · 17 bones · ${ppu} CSS px/tile · ${data.author.triangles.toLocaleString()}-triangle author → ${data['10k'].triangles.toLocaleString()}-triangle game mesh`;
}
async function set(values){playing=false;$('play').textContent='Play';let reload=false;for(const [key,value]of Object.entries(values)){if(key==='animal'){if(value!==species)throw Error('Change animals with the selector or animal URL parameter');continue;}if(key==='time'){time=Number(value);$('timeline').value=time;continue;}const element=$(key);if(!element)throw Error('Unknown character study control '+key);const before=element.type==='checkbox'?element.checked:element.value;if(element.type==='checkbox')element.checked=!!value;else element.value=value;if(before!==value&&['mesh','pose','weapon','outfit','reference'].includes(key))reload=true;}if(reload)await rebuild();else render();return diagnostics();}
function diagnostics(){return {ready,animal:species,time,mesh:$('mesh').value,pose:$('pose').value,weapon:$('weapon').value,actors:actors.map(a=>({outfit:a.outfit,...a.worker.diagnostics(),capTriangles:a.cap?.triangles||0})),resources:{...renderer.info.memory}};}
function referenceSheet(){
 const worker=profile.create(data.author),s=new T.Scene(),r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 // Paint registration is deliberately independent of later fitted positions.
 // Grey mode in the main viewer continues to show the actual current sculpt.
 for(const part of worker.parts){const a=part.geometry.attributes;if(a.paintPosition)a.position.copy(a.paintPosition);}
 worker.setGrey(true);s.add(worker.root);s.add(new T.HemisphereLight(0xffffff,0xbbbbcc,2));const light=new T.DirectionalLight(0xffffff,1.4);light.position.set(2,4,3);s.add(light);r.setSize(2048,1024);r.setClearColor(0x808080);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;
 try{const f=profile.frame,c=new T.OrthographicCamera(-f.width/2,f.width/2,f.height/2,-f.height/2,f.near,f.far);r.setScissorTest(true);for(let i=0;i<4;i++){const a=i*Math.PI/2;c.position.set(f.distance*Math.cos(a),f.centerY,f.distance*Math.sin(a));c.lookAt(0,f.centerY,0);c.updateProjectionMatrix();r.setViewport(i*512,0,512,1024);r.setScissor(i*512,0,512,1024);r.render(s,c);}return r.domElement.toDataURL('image/png');}finally{worker.dispose();if(profile.id!=='bear')worker.skeleton.dispose();r.dispose();r.forceContextLoss();}
}
function dispose(){if(disposed)return;disposed=true;serial++;playing=false;cancelAnimationFrame(frame);observer.disconnect();actors.forEach(release);actors=[];grid.geometry.dispose();grid.material.dispose();renderer.dispose();renderer.forceContextLoss();window.characterFittingDisposed=true;}
for(const id of ['outfit','mesh','pose','weapon','reference'])$(id).addEventListener('change',()=>rebuild().catch(console.error));for(const id of ['view','scale','grey','wire','grid','coverage'])$(id).addEventListener('input',render);
$('timeline').addEventListener('input',()=>{time=+$('timeline').value;render();});$('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';});const observer=new ResizeObserver(render);observer.observe(host);
let frame;function loop(now){frame=requestAnimationFrame(loop);if(playing&&ready){time=(time+Math.min(.05,(now-last)/1000))%4;$('timeline').value=time;render();}last=now;}frame=requestAnimationFrame(loop);
window.addEventListener('pagehide',dispose,{once:true});window.characterFitting={get ready(){return ready;},get actors(){return actors;},renderer,scene,set,render,diagnostics,referenceSheet,dispose};
$('animal').addEventListener('change',()=>{const params=new URLSearchParams(location.search);params.set('animal',$('animal').value);for(const id of ['outfit','mesh','pose','weapon','view','scale'])params.set(id,$(id).value);location.search=params;});
$('animations').href='character-animation-study.html?animal='+species;
$('concept').href=({bull:'bull-worker.html',rabbit:'rabbit-worker.html',dog:'dog-guard.html',bear:'bear-worker.html'})[species];
await rebuild();
