import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld,GAME_CAMERA} from './hybrid-world.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWindowDive} from './window-dive.js';
import {createWallVault,LOW_WALL} from './wall-vault.js';
import {createWallClimb} from './wall-climb.js';
import {createHenCrossing} from './hen-crossing.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search);
for(const p of ANIMAL_MOTION_CATALOG){const o=document.createElement('option');o.value=p.id;o.textContent=p.label;$('animal').append(o);}
for(const id of ['obstacle','animal','outfit','view','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
// A brick wall on the edge between columns 7 and 8, the window on row 7: the motion starts on tile (7, 7) facing +X.
const ORIGIN=[7,0,7];
const OBSTACLES={window:{title:'Through the window',sub:'Head first over the sill · onto the hands · roll along the wall · up on the next tile',make:createWindowDive},
 wall:{title:'Over a 2 m wall',sub:'Jump and catch the top · walk up and pull · straddle · lower down the far face · drop and turn onto the tile',make:createWallClimb},
 'low-wall':{title:'Over a waist-high wall',sub:'Hands on the top · legs over beside them · land and step onto the next tile (the wall type is a proposal: no game asset yet)',make:createWallVault}};
const obstacle=()=>OBSTACLES[$('obstacle').value]?$('obstacle').value:'window';
function fixture(kind){const state={map:Array.from({length:15},()=>Array(15).fill('yard')),upper:[{},{}],edges:{},props:[],stairs:[],units:[],visible:new Set(),seen:new Set()};
 if(kind==='window'||kind==='low-wall'||kind==='wall')for(let y=3;y<=11;y++)state.edges[`e:7:${y}`]=kind==='window'&&y===7?'window-brick':'wall-brick';
 for(let y=0;y<15;y++)for(let x=0;x<15;x++)for(let l=0;l<3;l++){const k=`${x},${y}`+(l?','+l:'');state.visible.add(k);state.seen.add(k);}
 state.definition={edges:{...state.edges}};return state;}
const r=new HybridRenderer(),renderer=r.renderer,scene=r.scene,camera=r.camera;scene.background=new T.Color(0x344039);host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
// The waist-high wall has no edge kind yet: the game's own brick wall on that line, its boxes cut to LOW_WALL.top
// (same instanced geometry, material and world-space bricks as a real wall).
function showObstacle(){const kind=obstacle(),st=fixture(kind);r.rebuild(buildWorld(st),null,0,st);
 if(kind==='low-wall'){const m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3();for(const mesh of r.chunks.values()){let hit=false;mesh.userData.boxes?.forEach((b,i)=>{if(b.kind!=='wall'||Math.abs(b.center[0]-(ORIGIN[0]+LOW_WALL.edge))>.1)return;mesh.getMatrixAt(i,m);m.decompose(p,q,sc);p.y=LOW_WALL.top/2;sc.y=LOW_WALL.top;m.compose(p,q,sc);mesh.setMatrixAt(i,m);hit=true;});if(hit){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}}}
 $('heading').textContent=OBSTACLES[kind].title;$('sub').textContent=OBSTACLES[kind].sub;}
showObstacle();
const grid=new T.GridHelper(15,15,0xb8b18b,0x7e876b);grid.position.set(7,.008,7);scene.add(grid);
let worker,paint,motion,profile,loading=false,playing=false,progress=+(params.get('t')||0),last=0,disposed=false;
function disposeActor(){if(!worker)return;scene.remove(worker.root);motion?.dispose();paint?.dispose();worker.skeleton.dispose();worker.dispose();worker=paint=motion=null;}
const VIEWS={game:{dir:[Math.sin(GAME_CAMERA.azimuth)*Math.cos(GAME_CAMERA.elevation),Math.sin(GAME_CAMERA.elevation),Math.cos(GAME_CAMERA.azimuth)*Math.cos(GAME_CAMERA.elevation)],ppu:65},
 'game-back':{dir:[-Math.sin(GAME_CAMERA.azimuth)*Math.cos(GAME_CAMERA.elevation),Math.sin(GAME_CAMERA.elevation),-Math.cos(GAME_CAMERA.azimuth)*Math.cos(GAME_CAMERA.elevation)],ppu:65},
 side:{dir:[0,.12,1],ppu:0},along:{dir:[1,.18,-.05],ppu:0},close:{dir:[.75,.45,.9],ppu:0,close:true}};
function draw(){if(disposed)return;const w=host.clientWidth||960,h=host.clientHeight||600,v=VIEWS[$('view').value];renderer.setSize(w,h,false);
 const focus=new T.Vector3(ORIGIN[0]+.5,.7,ORIGIN[2]+.15),ppu=v.ppu||Math.min(w/3.2,h/2.2)*(v.close?1.4:1);
 if(v.close&&motion){const d=motion.diagnostics(),c=d?.com||d?.points?.pelvis;if(c)focus.set(ORIGIN[0]+c[0],Math.max(.5,c[1]),ORIGIN[2]+c[2]);}
 camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.near=.01;camera.far=100;camera.position.copy(focus).add(new T.Vector3(...v.dir).normalize().multiplyScalar(20));camera.up.set(0,1,0);camera.lookAt(focus);camera.updateProjectionMatrix();
 grid.visible=$('grid').checked;renderer.render(scene,camera);}
function render(){if(!motion)return;const d=motion.apply(progress,{origin:ORIGIN,heading:0});for(const p of worker.parts)p.material=$('grey').checked?worker.grey:paint.material;draw();
 $('progress').value=progress;$('time').textContent=`${(progress*motion.duration).toFixed(2)} / ${motion.duration.toFixed(2)} s`;$('status').textContent=d.phase;
 const url=new URL(location.href);for(const id of ['obstacle','animal','outfit','view','speed'])url.searchParams.set(id,$(id).value);url.searchParams.set('t',progress.toFixed(3));if(url.href!==location.href)history.replaceState(null,'',url);return d;}
async function load(){if(loading)return;loading=true;playing=false;$('play').textContent='Play';window.traversalStudy.ready=false;const animal=$('animal').value,outfit=$('outfit').value,kind=obstacle();
 try{disposeActor();profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===animal);const res=await fetch(profile.file);if(!res.ok)throw Error(profile.label+' mesh failed to load');
  worker=profile.create(await res.json());paint=await createAnimalPaint(renderer,worker,profile,r.loader,outfit);for(const p of worker.parts){p.material=paint.material;p.castShadow=p.receiveShadow=true;}
  // The hen has wings and no hands: her own crossings (hen-crossing.js).
  motion=profile.id==='hen'?createHenCrossing(worker,profile,obstacle()):OBSTACLES[obstacle()].make(worker,profile);$('phases').replaceChildren();for(const p of motion.phases){const b=document.createElement('button');b.textContent=p.label;b.onclick=()=>window.traversalStudy.seek((p.start+p.end)/(2*motion.duration));$('phases').append(b);}
  scene.add(worker.root);window.traversalStudy.ready=true;$('loading').hidden=true;render();}
 catch(e){$('error').textContent=e.message;console.error(e);}finally{loading=false;if(animal!==$('animal').value||outfit!==$('outfit').value||kind!==obstacle())load();}}
window.traversalStudy={ready:false,renderer,scene,camera,get motion(){return motion;},get worker(){return worker;},seek(p){playing=false;$('play').textContent='Play';progress=T.MathUtils.clamp(p,0,1);return render();},render,draw,
 set(o){for(const [id,v]of Object.entries(o))if($(id)?.type==='checkbox')$(id).checked=!!v;else if($(id))$(id).value=v;return o.animal||o.outfit?load():render();}};
$('animal').onchange=()=>{progress=0;load();};$('obstacle').onchange=()=>{progress=0;showObstacle();load();};$('outfit').onchange=load;for(const id of ['view','grey','grid'])$(id).oninput=render;
$('progress').oninput=()=>window.traversalStudy.seek(+$('progress').value);$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';if(progress>=1)progress=0;last=performance.now();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;$('play').textContent='Play';}});
let frame;function animate(now){if(playing&&motion){progress=Math.min(1,progress+Math.min(.1,(now-last)/1000)*+$('speed').value/motion.duration);render();if(progress>=1){playing=false;$('play').textContent='Play';}}last=now;frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);
new ResizeObserver(()=>render()).observe(host);
addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);disposeActor();grid.geometry.dispose();grid.material.dispose();r.dispose();},{once:true});
load();
