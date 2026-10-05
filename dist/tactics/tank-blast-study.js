import * as T from './vendor/three.module.js';
import {LIGHT_ATLAS} from './horse-light-model.js';
import {FIRE_CHARACTERS,fireSelection,createFireActor} from './painted-fire-actor.js';
import {createPaintedFireEffects} from './painted-fire-effects.js';
import {createTankBlastMotion,TANK_TIME} from './tank-blast-motion.js';
import {createTankBlastEffects} from './tank-blast-effects.js';
import {clamp,smooth} from './painted-fire-state.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),params=new URLSearchParams(location.search),host=$('viewport');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x303b33);const camera=new T.OrthographicCamera(-7,7,4,-4,.05,100);scene.add(new T.HemisphereLight(0xfff3d5,0x56634b,2));const sun=new T.DirectionalLight(0xffe4bd,2);sun.position.set(3,6,4);scene.add(sun);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:20});sun.shadow.bias=-.0004;
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x596448,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);const grid=new T.GridHelper(30,30,0x6e765b,0x606a51);scene.add(grid);
floor.receiveShadow=true;
for(const p of FIRE_CHARACTERS.filter(p=>!p.unarmed))$('animal').add(new Option(p.label,p.id));
for(const id of ['animal','outfit','focus','view','scale','scene','terrain'])if(params.has(id)&&Array.from($(id).options).some(o=>o.value===params.get(id)))$(id).value=params.get(id);
if(params.get('effects')==='off')$('effects').checked=false;
if(params.get('scorch')==='off')$('scorch').checked=false;
let time=Number(params.get('time'))||0,playing=!params.has('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches,loading=false,disposed=false,orbit=0,elevation=0,drag=null;
const loader=new T.TextureLoader(),water=new T.Group();scene.add(water);
let atlas,actor,motion,bodyFx,blastFx,observer,queue=Promise.resolve(),lastTerrain;const floorMaps=new Map();
function dispose(){if(disposed)return;disposed=true;observer?.disconnect();actor?.dispose();bodyFx?.dispose();blastFx?.dispose();atlas?.dispose();for(const texture of floorMaps.values())texture.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});sun.shadow.dispose();renderer.dispose();}
window.addEventListener('pagehide',dispose,{once:true});
try{
 const readContract=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Could not load '+url);return r.json();};
 const [contracts,flameContract]=await Promise.all([readContract('./fixtures/tank-blast-contract.json'),readContract('./fixtures/painted-fire-contract.json')]);
 if(disposed)throw Error('Study closed during load');atlas=await loader.loadAsync(LIGHT_ATLAS);if(disposed){atlas.dispose();throw Error('Study closed during load');}atlas.colorSpace=T.SRGBColorSpace;
 for(const [id,file]of [['grass','grass-cliff-meadow/grass-0.png'],['sand','sand-cliff/sand.png'],['concrete','ground-concrete.png']]){const texture=await loader.loadAsync('../assets/environment/'+file);if(disposed){texture.dispose();throw Error('Study closed during load');}texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(15,15);floorMaps.set(id,texture);}
 for(const p of contracts.water.excluded){const m=new T.Mesh(new T.PlaneGeometry(.98,.98),new T.MeshStandardMaterial({color:0x436578,roughness:.75}));m.rotation.x=-Math.PI/2;m.position.set(p.x-contracts.water.origin.x,.001,p.y-contracts.water.origin.y);water.add(m);}
 async function load(selection){loading=true;window.tankStudyReady=false;$('loading').hidden=false;let a,b,f;
  try{a=await createFireActor(renderer,loader,atlas,selection);const m=createTankBlastMotion(a);b=await createPaintedFireEffects(scene,loader,a.worker);f=await createTankBlastEffects(scene,loader,m.origin);
   if(disposed){a.dispose();b.dispose();f.dispose();return;}actor?.dispose();bodyFx?.dispose();blastFx?.dispose();actor=a;motion=m;bodyFx=b;blastFx=f;actor.worker.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(actor.worker.root);$('error').textContent='';
  }catch(e){a?.dispose();b?.dispose();f?.dispose();$('error').textContent=e.message;throw e;}
  finally{loading=false;$('loading').hidden=true;window.tankStudyReady=!!actor;}
 }
 function reload(){const selection=fireSelection($('animal').value,$('outfit').value,'flamethrower',true);queue=queue.catch(()=>{}).then(()=>load(selection)).then(()=>{draw();return window.tankStudyState;});return queue;}
 await reload();
 function draw(){if(disposed||loading||!actor)return;const d=motion.apply(time),w=host.clientWidth,h=host.clientHeight;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
  const focus=$('focus').value,center=focus==='wearer'?V(0,.80,0):V(0,.30,0),direction={three:V(5,5,8),rear:V(-10,2.5,0),front:V(10,2.5,0),side:V(0,2.5,10)}[$('view').value];direction.applyAxisAngle(V(0,1,0),orbit);direction.y+=elevation;camera.position.copy(center).add(direction);camera.lookAt(center);
  const scale=$('scale').value,ppu=scale==='game'?58:scale==='close'?Math.min(260,h/2.6):Math.min(h/(focus==='wearer'?2.7:12.5),w/(focus==='wearer'?4:13));camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.updateProjectionMatrix();
  const effects=$('effects').checked;water.visible=$('scene').value==='water';const terrain=$('terrain').value;if(lastTerrain!==terrain){floor.material.map=floorMaps.get(terrain)||null;floor.material.color.set(terrain==='plain'?0x596448:0xffffff);floor.material.needsUpdate=true;grid.visible=terrain==='plain';lastTerrain=terrain;}
  bodyFx.update(d.blast.burnTime,{shape:flameContract.open,muzzle:V(),camera,route:motion.route,body:d.blast.active,flame:false,visible:effects,suppressSmoke:d.blast.age<.45});
  const surroundings=blastFx.update(d.blast.age,{camera,contract:contracts[$('scene').value],visible:effects,groundOpacity:1-smooth((d.blast.age-2.50)/1.0)});
  blastFx.scorch.group.visible=$('scorch').checked&&surroundings.scorchedCells>0;
  $('time').value=time;$('clock').textContent=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play';$('status').textContent=`${d.blast.phase} · ${surroundings.fireCells} recorded fire cells · ${Math.round(ppu)} px/tile`;
  renderer.render(scene,camera);window.tankStudyState={time,playing,...d,surroundings,animal:actor.selection.animal,outfit:actor.selection.outfit,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures};
 }
 window.tankStudy={seek(t){playing=false;time=clamp(t,0,TANK_TIME.duration);draw();return window.tankStudyState;},set(options){for(const [k,v]of Object.entries(options))if(['effects','scorch'].includes(k))$(k).checked=v;else if($(k))$(k).value=v;if('animal'in options||'outfit'in options)return reload();draw();return Promise.resolve(window.tankStudyState);},play(){playing=true;},draw,renderer,scene,camera,get actor(){return actor;},get effects(){return blastFx;}};
 $('play').onclick=()=>{playing=!playing;draw();};$('restart').onclick=()=>{time=0;playing=true;draw();};$('time').oninput=()=>window.tankStudy.seek(+$('time').value);
 for(const id of ['focus','view','scale','scene','terrain','effects','scorch'])$(id).onchange=()=>{if(id==='view'){orbit=0;elevation=0;}draw();};for(const id of ['animal','outfit'])$(id).onchange=()=>reload().catch(console.error);
 for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>window.tankStudy.seek(+b.dataset.time);
 host.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,orbit,elevation};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.007;elevation=clamp(drag.elevation-(e.clientY-drag.y)*.025,-1.5,6);draw();};host.onpointerup=host.onpointercancel=()=>{drag=null;};
 observer=new ResizeObserver(draw);observer.observe(host);let last=performance.now();function frame(now){if(disposed)return;if(playing&&!loading){time+=Math.min(.04,(now-last)/1000);if(time>TANK_TIME.duration)time=0;draw();}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);draw();window.tankStudyReady=true;
 window.tankStudy.dispose=dispose;
}catch(e){const closed=disposed;dispose();if(!closed){$('error').textContent=e.message;$('loading').textContent='Study failed to load';console.error(e);}}
