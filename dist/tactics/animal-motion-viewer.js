import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {ANIMAL_MOTION_FINDINGS} from './animal-motion-findings.js';
import {createMammalMotion} from './animal-motion.js';
import {createHenMotion} from './hen-motion.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {DOG_MOTION_DURATION} from './dog-motion.js';
import {GAME_CAMERA} from './hybrid-world.js';
const $=id=>document.getElementById(id),host=$('scene'),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x353a32);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;host.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera();scene.add(new T.HemisphereLight(0xfff9ec,0x737775,2));const sun=new T.DirectionalLight(0xfff2dc,2.3);sun.position.set(3,5,4);scene.add(sun);const fill=new T.DirectionalLight(0xffffff,.7);fill.position.set(-2,2,-3);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(9,9),new T.MeshStandardMaterial({color:0x66694f,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.004;scene.add(floor);
const grid=new T.GridHelper(9,18,0x878773,0x747763);grid.position.y=-.002;scene.add(grid);
const loader=new T.TextureLoader(),rifle=await loader.loadAsync('../assets/characters/lowpoly-proof/horse-worker-light-atlas.png');rifle.colorSpace=T.SRGBColorSpace;
let worker,motion,modelPaint,redHat,data,profile,loading=false;
const outfitControl=document.createElement('select');outfitControl.id='outfit';outfitControl.add(new Option('Original outfit','normal'));outfitControl.add(new Option('Red Hats','red-hats'));
const outfitLabel=document.createElement('label');outfitLabel.append('Outfit ',outfitControl);$('animal').parentElement.after(outfitLabel);
outfitControl.value=new URLSearchParams(location.search).get('outfit')==='red-hats'?'red-hats':'normal';
for(const p of ANIMAL_MOTION_CATALOG)$('animal').add(new Option(p.label,p.id));
for(const p of ANIMAL_MOTION_CATALOG){const row=document.createElement('tr'),name=document.createElement('td'),state=document.createElement('td'),note=document.createElement('td'),button=document.createElement('button');button.textContent=p.label;button.onclick=()=>{if(!loading)loadAnimal(p.id);};name.append(button);state.textContent=ANIMAL_MOTION_FINDINGS[p.id].status;note.textContent=ANIMAL_MOTION_FINDINGS[p.id].note;row.append(name,state,note);$('findings').append(row);}
async function loadAnimal(id){
 loading=true;window.animalMotionReady=false;$('animal').disabled=true;outfitControl.disabled=true;
 try{const p=ANIMAL_MOTION_CATALOG.find(p=>p.id===id);if(!p)throw Error('Unknown animal '+id);if(worker){scene.remove(worker.root);redHat?.dispose();redHat=null;motion.restore();motion.dispose();modelPaint.dispose();worker.skeleton.dispose();worker.dispose();}
 profile=p;data=await fetch('./'+p.file).then(r=>{if(!r.ok)throw Error('Mesh failed to load');return r.json();});worker=p.create(data,rifle);scene.add(worker.root);modelPaint=await createAnimalPaint(renderer,worker,p,loader,outfitControl.value);if(outfitControl.value==='red-hats')redHat=await createRedHatCap(renderer,worker,p,loader);motion=p.unarmed?createHenMotion(worker):createMammalMotion(worker,p);
 $('animal').value=id;$('character').textContent=p.label;$('limitation').textContent=p.unarmed?'Unarmed study: walk → crouch → observe → rise. Wing grips are not authored, so aiming and firing remain unsupported.':'Walk → kneel → aim → fire → stand. Inspect clothing and contacts at both viewing scales.';
 $('visual-status').textContent=outfitControl.value==='red-hats'?(id==='pig-foreman'?'Existing Red Hat uniform retained.':'Red Hat outfit study — passed internal visual review; architect review and gameplay integration pending.'):(ANIMAL_MOTION_FINDINGS[id].status+' — '+ANIMAL_MOTION_FINDINGS[id].note);
 $('pitch').disabled=!!p.unarmed;$('static').href=(id==='horse'?'horse-light':id.startsWith('pig-')?id:id==='dog'?'dog-guard':id+'-worker')+'.html?mesh=10k';
 const url=new URL(location.href);url.searchParams.set('animal',id);url.searchParams.set('outfit',outfitControl.value);history.replaceState(null,'',url);loading=false;$('animal').disabled=false;outfitControl.disabled=false;last=performance.now();render();window.animalMotionReady=true;
 }catch(e){loading=false;playing=false;$('error').textContent=e.message;throw e;}
}
const flash=new T.Mesh(new T.SphereGeometry(.035,6,4),new T.MeshBasicMaterial({color:0xffdc75}));flash.scale.set(2.5,1,1);scene.add(flash);
const trace=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xffd790,transparent:true,opacity:.8}));scene.add(trace);
const guides=new T.Group();scene.add(guides);const dots=[];for(let i=0;i<4;i++){const m=new T.Mesh(new T.SphereGeometry(i<2?.025:.015,8,6),new T.MeshBasicMaterial({color:i<2?0x4ade80:0x64c5ff,depthTest:false}));guides.add(m);dots.push(m);}
let current=0,playing=!new URLSearchParams(location.search).has('paused'),last=performance.now(),lastD;
function render(){
 if(loading||!motion)return;
 const heading=+$('heading').value,pitch=+$('pitch').value,s=motion.apply(current,{heading,pitch});
 worker.setGrey($('grey').checked);if(!$('grey').checked)for(const p of worker.parts)p.material=modelPaint.material;redHat?.setGrey($('grey').checked);
 const close=$('close').checked,w=host.clientWidth,h=close?650:330,ppu=close?300:58;host.style.height=h+'px';if(renderer.domElement.clientWidth!==w||renderer.domElement.clientHeight!==h)renderer.setSize(w,h);
 const a=(heading+(profile.bodyYaw??35))*Math.PI/180,focus=new T.Vector3(.5*Math.cos(a),.77,.5*Math.sin(a)),view=$('view').value;
 const {azimuth:az,elevation:el}=view==='game'?GAME_CAMERA:{azimuth:{front:Math.PI/2-a,side:-a,back:-Math.PI/2-a,three:Math.PI/4-a}[view],elevation:view==='three'?.12:0};
 camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.1;camera.far=30;camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(7));camera.lookAt(focus);camera.updateProjectionMatrix();
 lastD=motion.diagnostics();const origin=new T.Vector3(...(lastD.shot?.origin||[0,0,0])),direction=new T.Vector3(...(lastD.shot?.direction||[1,0,0]));
 // The flash follows the recoiling barrel; the emitted trace stays at discharge.
 flash.visible=s.flash;flash.position.fromArray(lastD.muzzle?.origin||[0,0,0]);flash.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),new T.Vector3(...(lastD.muzzle?.direction||[1,0,0])));
 trace.visible=s.trace;trace.geometry.attributes.position.setXYZ(0,...origin.toArray());trace.geometry.attributes.position.setXYZ(1,...origin.clone().addScaledVector(direction,1.5).toArray());trace.geometry.attributes.position.needsUpdate=true;trace.geometry.computeBoundingSphere();
 guides.visible=$('guides').checked;for(const [i,side] of [-1,1].entries()){dots[i].position.fromArray(lastD.joints[side].ankle);dots[i].position.y=.02;dots[i].material.color.setHex(s.feet[side].planted?0x4ade80:0xfacc15);dots[i+2].visible=!!lastD.contacts[i];if(lastD.contacts[i])dots[i+2].position.fromArray(lastD.contacts[i].grip);}
 renderer.render(scene,camera);$('phase').textContent=s.phase;$('time').textContent=current.toFixed(2)+' s';$('timeline').value=current;$('play').textContent=playing?'Pause':'Play';$('heading-value').value=heading+'°';$('pitch-value').value=pitch+'°';
 $('status').textContent=`${(data.triangles+(redHat?.triangles||0)).toLocaleString()} character triangles${redHat?' (includes 700 cap)':''} · ${lastD.bones} bones · ${ppu} CSS px/unit · palm error ${Math.max(0,...lastD.contacts.map(c=>c.error)).toExponential(2)}`;
}
function seek(t){playing=false;current=T.MathUtils.clamp(t,0,DOG_MOTION_DURATION);render();}
$('play').onclick=()=>{if(current>=DOG_MOTION_DURATION)current=0;playing=!playing;last=performance.now();render();};$('replay').onclick=()=>{current=0;playing=true;last=performance.now();render();};$('timeline').oninput=()=>seek(+$('timeline').value);
for(const id of ['view','close','grey','guides','heading','pitch'])$(id).addEventListener('input',render);
new ResizeObserver(render).observe(host);
function frame(now){try{if(playing&&!loading){current=Math.min(DOG_MOTION_DURATION,current+(now-last)/1000*+$('speed').value);if(current===DOG_MOTION_DURATION)playing=false;render();}last=now;requestAnimationFrame(frame);}catch(e){playing=false;$('error').textContent=e.message;throw e;}}
$('animal').onchange=()=>loadAnimal($('animal').value);
outfitControl.onchange=()=>loadAnimal($('animal').value);
window.animalMotion={get worker(){return worker;},get motion(){return motion;},get redHat(){return redHat;},renderer,scene,camera,seek,render,loadAnimal,diagnostics:()=>({...lastD,animal:profile.id,outfit:outfitControl.value,capTriangles:redHat?.triangles||0,totalCharacterTriangles:data.triangles+(redHat?.triangles||0),pixelsPerUnit:host.clientHeight/(camera.top-camera.bottom),playing,flashPosition:flash.position.toArray(),flashVisible:flash.visible,traceOrigin:Array.from(trace.geometry.attributes.position.array).slice(0,3)})};
await loadAnimal(new URLSearchParams(location.search).get('animal')||'horse');requestAnimationFrame(frame);
