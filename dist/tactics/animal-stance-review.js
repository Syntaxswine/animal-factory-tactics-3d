import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {createBattlePosture} from './battle-posture.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {createWeaponModel} from './weapon-models.js';
import {createRifleFiring} from './rifle-firing.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
for(const p of profiles)$('animal').add(new Option(p.label,p.id));
for(const key of ['animal','outfit','target','scale'])if(params.has(key))$(key).value=params.get(key);
const renderer=new T.WebGLRenderer({canvas:$('study'),antialias:true});renderer.setPixelRatio(1);renderer.setSize(1600,900);renderer.setClearColor('#26372f');renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene(),camera=new T.OrthographicCamera(),loader=new T.TextureLoader();scene.add(new T.HemisphereLight(0xfff0d5,0x667367,2));const light=new T.DirectionalLight(0xffead1,2.5);light.position.set(-3,8,6);scene.add(light);
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#526046',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
const grid=new T.GridHelper(30,30,0xdce1bc,0x96a585);grid.position.y=.001;scene.add(grid);
let item=null,loading=false;const views=[['Front',1,0,0],['Side',0,0,1],['Rear',-1,0,0],['Three-quarter',1,.6,1]];
function dispose(){if(!item)return;scene.remove(item.worker.root);item.cap?.dispose();item.paint.dispose();item.locomotion.dispose();item.gun?.dispose();item.worker.dispose();item=null;}
async function load(){
 if(loading)return;loading=true;window.stanceStudy.ready=false;const id=$('animal').value,outfit=$('outfit').value;
 try{dispose();const profile=profiles.find(p=>p.id===id)||profiles[0],data=await fetch(profile.file).then(r=>{if(!r.ok)throw Error('Mesh load failed');return r.json();}),worker=profile.create(data),paint=await createAnimalPaint(renderer,worker,profile,loader,outfit);
  for(const part of worker.parts)part.material=paint.material;const cap=outfit==='red-hats'?await createRedHatCap(renderer,worker,profile,loader):null,posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile),gun=profile.unarmed?null:createWeaponModel('rifle');if(gun)worker.equipWeapon(gun);
  item={profile,worker,paint,cap,posture,locomotion,gun,firing:gun?createRifleFiring(worker,profile,posture):null};scene.add(worker.root);render();window.stanceStudy.ready=true;
 }catch(e){$('status').textContent=e.message;console.error(e);}finally{loading=false;if(id!==$('animal').value||outfit!==$('outfit').value)load();}
}
function render(){
 if(!item)return;const {worker,posture,locomotion,firing,profile}=item,scale=+$('scale').value,target=new T.Vector3(...({level:[6,.48,0],near:[1,1.4,0],high:[2,3,0]}[$('target').value]||[6,.48,0])),rows=[],labels=[];
 renderer.setScissorTest(true);
 for(const [row,pose] of [{},{kneel:.5,prone:.5},{prone:1}].entries()){
  const sample={pose,heading:0,blend:0,distance:0};let result;
  if(firing)result=firing.apply({aim:1,target,sample});else{locomotion.apply(sample);posture.apply(sample);posture.ground();}
  rows.push({pose,supported:result?.supported??null,reason:result?.reason??null,contacts:worker.diagnostics().contacts||[]});
  for(let col=0;col<4;col++){
   const [name,x,y,z]=views[col],cy=row===0?.88:.42,view=new T.Vector3(x,y,z).applyQuaternion(worker.root.quaternion);camera.left=-200/scale;camera.right=200/scale;camera.top=150/scale;camera.bottom=-150/scale;camera.near=.01;camera.far=100;camera.position.copy(view.multiplyScalar(6)).add(new T.Vector3(.1,cy,0));camera.lookAt(.1,cy,0);camera.updateProjectionMatrix();
   renderer.setViewport(col*400,(2-row)*300,400,300);renderer.setScissor(col*400,(2-row)*300,400,300);renderer.render(scene,camera);labels.push(`${['Standing','Transition','Prone'][row]} · ${name}${result&&!result.supported?' · holding fallback':''}`);
  }
 }
 renderer.setScissorTest(false);$('labels').replaceChildren(...labels.map(t=>{const d=document.createElement('div');d.textContent=t;return d;}));
 $('status').textContent=profile.unarmed?'Hen: unarmed posture only. Weapon handling remains open.':rows.map((r,i)=>`${['Standing','Transition','Prone'][i]}: ${r.supported?'aligned':`holding fallback (${r.reason})`}`).join(' · ');
 window.stanceStudy.rows=rows;window.stanceStudy.item=item;
 const query=new URLSearchParams();for(const key of ['animal','outfit','target','scale'])query.set(key,$(key).value);history.replaceState(null,'','?'+query);
}
function sequence(){
 if(!item)return;$('target').value='level';const {worker,posture,locomotion,firing}=item,scale=+$('scale').value,labels=[];renderer.setScissorTest(true);
 for(let i=0;i<12;i++){
  const t=i/11,sample={pose:{kneel:1-t,prone:t},heading:0,blend:0,distance:0};if(firing)firing.apply({aim:1,target:new T.Vector3(6,.48,0),sample});else{locomotion.apply(sample);posture.apply(sample);posture.ground();}
  camera.left=-200/scale;camera.right=200/scale;camera.top=150/scale;camera.bottom=-150/scale;camera.near=.01;camera.far=100;camera.position.copy(new T.Vector3(0,0,6).applyQuaternion(worker.root.quaternion)).add(new T.Vector3(.1,.7,0));camera.lookAt(.1,.7,0);camera.updateProjectionMatrix();renderer.setViewport((i%4)*400,(2-Math.floor(i/4))*300,400,300);renderer.setScissor((i%4)*400,(2-Math.floor(i/4))*300,400,300);renderer.render(scene,camera);labels.push(`Kneel → prone ${(t*100).toFixed(0)}% · fixed floor`);
 }renderer.setScissorTest(false);$('labels').replaceChildren(...labels.map(t=>{const d=document.createElement('div');d.textContent=t;return d;}));$('status').textContent='Full production transition, including grounding. Fixed camera height and ground grid in every frame.';
}
window.stanceStudy={ready:false,rows:[],render,sequence};for(const key of ['animal','outfit'])$(key).onchange=load;for(const key of ['target','scale'])$(key).onchange=render;$('reload').onclick=load;const strip=document.createElement('button');strip.textContent='Transition strip';strip.onclick=sequence;document.querySelector('header').append(strip);load();
