import * as T from './vendor/three.module.js';
import {BattleGrenades,grenadePhase} from './battle-grenades.js';
import {grenadeBlastFixture} from './grenade-blast-fixture.js';
import {grenadeWorld} from './grenade-geometry.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),host=$('viewport');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x344039);scene.add(new T.HemisphereLight(0xfff1d2,0x536251,2));const sun=new T.DirectionalLight(0xffe6bf,2);sun.position.set(4,12,5);scene.add(sun);
const camera=new T.OrthographicCamera(-8,8,5,-5,.01,90),loader=new T.TextureLoader(),fx=new BattleGrenades(scene,{loader,onError:m=>$('error').textContent=m}),scenery=new T.Group();scene.add(scenery);
const ground=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x596448,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(8,-.005,8);scene.add(ground);
let fixture,worker,paint,grid,guide,observer,raf,disposed=false,time=params.has('time')?Number(params.get('time')):-.1,playing=!params.has('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches,orbit=0,drag;
for(const id of ['scene','view','scale'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);$('guide').checked=params.get('guide')!=='0';$('reduced').checked=params.has('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
function clearScenery(){for(const p of [...scenery.children]){p.removeFromParent();p.geometry?.dispose();p.material?.dispose();}}
function select(){clearScenery();fixture=grenadeBlastFixture($('scene').value);const world=grenadeWorld(fixture.state);
 for(const item of world.items){let geometry,mesh;const material=new T.MeshStandardMaterial({color:item.source.kind==='floor'?0x8b9072:0x847760,roughness:1,side:T.DoubleSide});
  if(item.triangle){geometry=new T.BufferGeometry().setFromPoints([item.triangle.a,item.triangle.b,item.triangle.c]);geometry.computeVertexNormals();mesh=new T.Mesh(geometry,material);}
  else{geometry=new T.BoxGeometry(...item.half.map(v=>2*v));mesh=new T.Mesh(geometry,material);mesh.position.copy(item.center);mesh.quaternion.copy(item.q);}scenery.add(mesh);
 }
 grid=new T.GridHelper(24,24,0x9a9877,0x777d5d);grid.position.set(8.5,fixture.floor+.009,8.5);scenery.add(grid);
 const blast=fixture.shot.event.explosions[0],points=Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2;return new T.Vector3(blast.x+blast.radius*Math.cos(a),fixture.floor+.018,blast.y+blast.radius*Math.sin(a));});guide=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:0xe8d796,dashSize:.15,gapSize:.11,transparent:true,opacity:.6}));guide.computeLineDistances();scenery.add(guide);
 if(worker){worker.root.position.set(1.9,0,8);worker.root.rotation.y=-.25;}
}
function draw(){if(disposed||!worker)return;const w=host.clientWidth,h=host.clientHeight,ppu=$('scale').value==='game'?100:Math.min(w/14,h/8.5),view=$('view').value,focus=new T.Vector3(7.2,fixture.floor+.4,8),a=(view==='side'?0:.65)+orbit;
 renderer.setSize(w,h,false);camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.position.copy(focus).add(view==='top'?new T.Vector3(.01,18,.01):new T.Vector3(10*Math.sin(a),view==='side'?1.8:9,10*Math.cos(a)));camera.lookAt(focus);camera.updateProjectionMatrix();
 fixture.shot.reduced=$('reduced').checked;fixture.shot.phase=grenadePhase(fixture.shot,fixture.shot.reduced?time*1000:5920+time*1000);fx.update(fixture.shot,fixture.state,camera);guide.visible=$('guide').checked;renderer.render(scene,camera);
 $('time').value=time;$('clock').textContent=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play';$('status').textContent='5-tile radius / 10 tiles across · '+(time<0?'Intact grenade':time<.12?'Detonation':time<.4?'Outward dust':time<.8?'Dissipation':'Clear');
 window.grenadeBlastState={time,scene:$('scene').value,visible:fx.dust.visible,radius:fx.field?.radius,level:fx.field?.level,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};return window.grenadeBlastState;
}
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();fx.dispose();clearScenery();paint?.dispose();worker?.skeleton.dispose();worker?.dispose();ground.geometry.dispose();ground.material.dispose();renderer.dispose();}
addEventListener('pagehide',dispose,{once:true});
try{const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse'),data=await fetch(profile.file).then(r=>r.json());worker=profile.create(data);paint=await createAnimalPaint(renderer,worker,profile,loader,'normal');for(const p of worker.parts)p.material=paint.material;worker.pose('carry');scene.add(worker.root);await fx.ready;select();
 window.grenadeBlastStudy={seek(t){time=t;playing=false;return draw();},set(o){for(const [k,v]of Object.entries(o))if($(k)?.type==='checkbox')$(k).checked=!!v;else if($(k))$(k).value=v;if(o.scene)select();return draw();},draw,dispose,renderer,scene,camera,fx,get fixture(){return fixture;}};
 $('play').onclick=()=>{playing=!playing;draw();};$('restart').onclick=()=>{time=-.1;playing=true;draw();};$('time').oninput=()=>{time=+$('time').value;playing=false;draw();};for(const id of ['scene','view','scale','guide','reduced'])$(id).onchange=()=>{if(id==='scene')select();draw();};for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>{time=+b.dataset.time;playing=false;draw();};
 host.onpointerdown=e=>{drag={x:e.clientX,orbit};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.007;draw();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(draw);observer.observe(host);let last=performance.now();function tick(now){if(disposed)return;if(playing){time+=Math.min(.05,(now-last)/1000);if(time>1.4)time=-.25;draw();}last=now;raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);$('loading').hidden=true;draw();window.grenadeBlastReady=true;
}catch(e){$('error').textContent=e.message;console.error(e);dispose();}
