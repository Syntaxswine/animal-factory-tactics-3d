import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld,DIMENSIONS as D} from './hybrid-world.js';
import {wallBreachFixture} from './wall-breach-fixture.js';
import {wallBreachEnds} from './wall-breaches.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),ids=['material','count','layout','axis','level','view','scale'];
for(const id of ids)if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
const r=new HybridRenderer(),renderer=r.renderer,scene=r.scene,camera=r.camera;scene.background=new T.Color(0x344039);host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
let fixture,grid,worker,paint,observer,disposed=false,orbit=0,drag;
function options(){return Object.fromEntries(ids.map(id=>[id,['level','count'].includes(id)?Number($(id).value):$(id).value]));}
function rebuild(){const o=options();fixture=wallBreachFixture(o);r.rebuild(buildWorld(fixture.state),null,o.level,fixture.state);if(grid){grid.removeFromParent();grid.geometry.dispose();grid.material.dispose();}grid=new T.GridHelper(16,16,0xb8b18b,0x7e876b);grid.position.set(7.5,o.level*D.floorSpacing+.008,7.5);scene.add(grid);if(worker){worker.root.position.set(o.axis==='e'?9:7,o.level*D.floorSpacing,o.axis==='e'?7:9);worker.root.rotation.y=o.axis==='e'?Math.PI/2:0;}return draw();}
function draw(){if(disposed||!fixture)return;const o=options(),w=host.clientWidth,h=host.clientHeight,ppu=o.scale==='game'?65:Math.min(w/14.8,h/7.5),focus=new T.Vector3(o.axis==='e'?7.5:7.5,o.level*D.floorSpacing+.8,o.layout==='corner'?8:6.5);
 renderer.setSize(w,h,false);camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.near=.01;camera.far=100;const angle=(o.view==='rear'?Math.PI:o.view==='three'?.55:0)+(o.axis==='e'?Math.PI/2:0)+orbit;
 camera.position.copy(focus).add(o.view==='top'?new T.Vector3(.001,20,.001):new T.Vector3(Math.sin(angle)*18,o.view==='three'?11:1.5,Math.cos(angle)*18));camera.lookAt(focus);camera.updateProjectionMatrix();grid.visible=$('grid').checked;renderer.render(scene,camera);
 const ends=wallBreachEnds(fixture.state),count=[...ends.values()].reduce((n,v)=>n+!!(v&1)+!!(v&2),0);$('status').textContent=fixture.removed.length+' removed segments · '+count+' broken ends · wall height '+D.wall+' tiles';window.wallBreachState={...o,removed:fixture.removed.length,ends:count,shapes:[...r.chunks.values()].flatMap(m=>m.userData.boxes.filter(b=>b.breachEnds).map(b=>b.shape)),memory:{...renderer.info.memory}};return window.wallBreachState;
}
function dispose(){if(disposed)return;disposed=true;observer?.disconnect();grid?.geometry.dispose();grid?.material.dispose();paint?.dispose();worker?.skeleton.dispose();worker?.dispose();r.dispose();}
addEventListener('pagehide',dispose,{once:true});
try{const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');worker=profile.create(await fetch(profile.file).then(res=>res.json()));paint=await createAnimalPaint(renderer,worker,profile,r.loader,'normal');for(const part of worker.parts)part.material=paint.material;worker.pose('carry');scene.add(worker.root);rebuild();
 for(const id of ids)$(id).onchange=()=>{orbit=0;rebuild();};$('grid').onchange=draw;$('widen').onclick=()=>{$('count').value=Math.min(5,+$('count').value+1);rebuild();};$('restore').onclick=()=>{$('count').value=0;rebuild();};
 host.onpointerdown=e=>{drag={x:e.clientX,orbit};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.007;draw();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(draw);observer.observe(host);window.wallBreachStudy={set(o){for(const [id,v]of Object.entries(o))if($(id)?.type==='checkbox')$(id).checked=!!v;else if($(id))$(id).value=v;orbit=0;return rebuild();},draw,dispose,renderer,scene,camera,get fixture(){return fixture;},get chunks(){return r.chunks;}};$('loading').hidden=true;window.wallBreachReady=true;draw();
}catch(error){$('error').textContent=error.message;console.error(error);dispose();}
