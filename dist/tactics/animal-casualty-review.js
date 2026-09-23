import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {createBattlePosture} from './battle-posture.js';
import {createWorkerLocomotion} from './worker-locomotion.js';
import {createWeaponModel} from './weapon-models.js';
import {BattleMotion} from './battle-motion.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const keys=['animal','outfit','scale','view','route','weapon'];
for(const p of profiles)$('animal').add(new Option(p.label,p.id));
for(const key of keys)if(params.has(key)&&[...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
const renderer=new T.WebGLRenderer({canvas:$('study'),antialias:true});renderer.setPixelRatio(1);renderer.setClearColor('#26372f');renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene(),camera=new T.OrthographicCamera(),loader=new T.TextureLoader();scene.add(new T.HemisphereLight(0xfff0d5,0x667367,2));const light=new T.DirectionalLight(0xffead1,2.5);light.position.set(-3,8,6);scene.add(light);
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#526046',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
const grid=new T.GridHelper(30,30,0xdce1bc,0x96a585);grid.position.y=.001;scene.add(grid);
const views=[['Front',1,0,0],['Side',0,0,1],['Rear',-1,0,0],['Three-quarter',1,.8,1]],states=['bleeding','stable','dead'];
let item=null,loading=false,playing=false,startTime=0;
function dispose(){if(!item)return;scene.remove(item.worker.root);item.cap?.dispose();item.paint.dispose();item.locomotion.dispose();item.gun?.dispose();item.worker.dispose();item=null;}
async function load(){
 if(loading)return;loading=true;playing=false;window.casualtyStudy.ready=false;
 const id=$('animal').value,outfit=$('outfit').value,weapon=$('weapon').value;
 try{
  dispose();const profile=profiles.find(p=>p.id===id),response=await fetch(profile.file);if(!response.ok)throw Error('Mesh load failed');
  const worker=profile.create(await response.json()),paint=await createAnimalPaint(renderer,worker,profile,loader,outfit);
  for(const part of worker.parts)part.material=paint.material;
  const cap=outfit==='red-hats'?await createRedHatCap(renderer,worker,profile,loader):null,posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile),gun=profile.unarmed?null:createWeaponModel(weapon);if(gun)worker.equipWeapon(gun);
  item={profile,worker,paint,cap,posture,locomotion,gun};window.casualtyStudy.item=item;scene.add(worker.root);render();window.casualtyStudy.ready=true;
 }catch(error){$('status').textContent=error.message;console.error(error);}finally{loading=false;if(id!==$('animal').value||outfit!==$('outfit').value||weapon!==$('weapon').value)load();}
}
function unit(state){return {id:0,x:0,y:0,z:0,heading:0,hp:states.includes(state)?0:100,casualty:states.includes(state)?state:null,stance:states.includes(state)?'standing':state};}
function transition(progress){
 const [from,to]=$('route').value.split(':'),motion=new BattleMotion(),u=unit(from);motion.update([u],0);Object.assign(u,unit(to));motion.update([u],10);
 const duration=u.hp<=0?650:450;motion.update([u],10+progress*duration,$('reduced').checked);return motion.sample(u);
}
function apply(sample){
 const {worker,posture,locomotion,paint}=item;locomotion.apply({...sample,blend:0});posture.apply(sample);if(Object.values(sample.pose||{}).some(v=>v>0))posture.ground();paint.setGripForearm?.(false);
 return {pose:sample.pose,bounds:worker.diagnostics(),weaponVisible:worker.weapon?.root.visible??false};
}
function render(){
 if(!item)return;
 const mode=$('view').value,scale=+$('scale').value,strip=mode==='strip',height=mode==='transition'?450:900,cellHeight=height===450?450:300,labels=[],rows=[];
 renderer.setSize(1600,height,false);$('labels').style.gridTemplateRows=`repeat(${height===450?1:3},1fr)`;renderer.setScissorTest(true);
 const count=strip?12:mode==='grid'?3:1;
 for(let index=0;index<count;index++){
  const sample=mode==='grid'?{pose:{down:1,stable:index===1?1:0,dead:index===2?1:0},heading:0,distance:0,blend:0}:transition(strip?index/11:+$('progress').value/1000);
  rows.push(apply(sample));
  for(let col=0;col<(strip?1:4);col++){
   const [name,x,y,z]=views[strip?3:col],row=strip?Math.floor(index/4):index,column=strip?index%4:col,cy=mode==='grid'?.42:.75;
   camera.left=-200/scale;camera.right=200/scale;camera.top=cellHeight/2/scale;camera.bottom=-cellHeight/2/scale;camera.near=.01;camera.far=100;
   camera.position.copy(new T.Vector3(x,y,z).applyQuaternion(item.worker.root.quaternion).multiplyScalar(6)).add(new T.Vector3(.1,cy,0));camera.lookAt(.1,cy,0);camera.updateProjectionMatrix();
   renderer.setViewport(column*400,height-(row+1)*cellHeight,400,cellHeight);renderer.setScissor(column*400,height-(row+1)*cellHeight,400,cellHeight);renderer.render(scene,camera);
   labels.push(mode==='grid'?`${['Downed / bleeding','Stabilized','Dead'][index]} · ${name}`:`${strip?Math.round(index/11*100):Math.round(+$('progress').value/10)}% · ${name}`);
  }
 }
 renderer.setScissorTest(false);$('labels').replaceChildren(...labels.map(text=>{const d=document.createElement('div');d.textContent=text;return d;}));window.casualtyStudy.rows=rows;
 $('status').textContent=`${item.profile.label} · ${mode==='grid'?'Three settled poses':$('route').selectedOptions[0].textContent} · ${scale===58?'Native gameplay scale':'Close inspection'}${item.profile.unarmed?' · Unarmed':''}`;
 const query=new URLSearchParams();for(const key of keys)query.set(key,$(key).value);history.replaceState(null,'','?'+query);
}
function frame(now){
 if(!playing)return;
 const target=$('route').value.split(':')[1],duration=(states.includes(target)?650:450)*($('slow').checked?4:1),progress=Math.min(1,(now-startTime)/duration);$('progress').value=progress*1000;render();
 if(progress<1)requestAnimationFrame(frame);else playing=false;
}
window.casualtyStudy={ready:false,rows:[],render,transition,apply};
for(const key of ['animal','outfit','weapon'])$(key).onchange=load;
for(const key of ['scale','view','route','reduced'])$(key).onchange=()=>{playing=false;render();};
$('progress').oninput=()=>{playing=false;$('view').value='transition';render();};
$('play').onclick=()=>{if(!item||loading)return;$('view').value='transition';playing=true;startTime=performance.now();requestAnimationFrame(frame);};
load();
