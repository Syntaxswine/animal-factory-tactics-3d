import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld,DIMENSIONS as D} from './hybrid-world.js';
import {floorBreachFixture} from './floor-breach-fixture.js';
import {floorBreachMasks,FLOOR_SIDES} from './floor-breaches.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),ids=['material','size','layout','level','view','scale'];
for(const id of ids)if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
const r=new HybridRenderer(),renderer=r.renderer,scene=r.scene,camera=r.camera;scene.background=new T.Color(0x344039);host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
const undersideLight=new T.DirectionalLight(0xd4e0de,1.4);undersideLight.position.set(8,-6,12);scene.add(undersideLight);
let fixture,grid,worker,paint,observer,disposed=false,orbit=0,drag;
function options(){return Object.fromEntries(ids.map(id=>[id,['level','size'].includes(id)?Number($(id).value):$(id).value]));}
function rebuild(){
 const o=options();fixture=floorBreachFixture(o);const world=buildWorld(fixture.state);
 if(o.view==='below')world.boxes=world.boxes.filter(b=>b.kind!=='floor'||b.source.z===o.level);
 r.rebuild(world,null,o.level,fixture.state);
 if(grid){grid.removeFromParent();grid.geometry.dispose();grid.material.dispose();}
 const points=[],h=o.level*D.floorSpacing+.003,masks=floorBreachMasks(fixture.state),corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
 for(const key of Object.keys(fixture.state.upper[o.level-1])){const [x,y]=key.split(',').map(Number),mask=masks.get(key+','+o.level)||0;for(let side=0;side<4;side++)if(!(mask&(1<<side))){const a=corners[side],b=corners[(side+1)%4];points.push(x+a[0],h,y+a[1],x+b[0],h,y+b[1]);}}
 grid=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:0xc8c4a4,transparent:true,opacity:.23}));scene.add(grid);
 if(worker)worker.root.position.set(fixture.worker.x,h-.003,fixture.worker.y);
 return draw();
}
function draw(){
 if(disposed||!fixture)return;const o=options(),w=host.clientWidth,h=host.clientHeight,ppu=o.scale==='game'?65:Math.min(w/13.5,h/9.5),focus=new T.Vector3(8,o.level*D.floorSpacing-.3,8),angle=.65+orbit;
 renderer.setSize(w,h,false);camera.left=-w/(2*ppu);camera.right=w/(2*ppu);camera.top=h/(2*ppu);camera.bottom=-h/(2*ppu);camera.near=.01;camera.far=100;
 camera.position.copy(focus).add(o.view==='top'?new T.Vector3(.001,20,.001):new T.Vector3(Math.sin(angle)*18,o.view==='below'?-11:o.view==='side'?.3:13,Math.cos(angle)*18));camera.lookAt(focus);camera.updateProjectionMatrix();
 grid.visible=$('grid').checked&&o.view!=='below';worker.root.visible=o.view!=='below';undersideLight.visible=o.view==='below';renderer.render(scene,camera);
 const masks=floorBreachMasks(fixture.state),edges=[...masks.values()].reduce((n,v)=>n+FLOOR_SIDES.filter((_,i)=>v&(1<<i)).length,0);
 $('status').textContent=fixture.removed.length+' missing tiles · '+edges+' broken perimeter edges · slab thickness '+D.slab+' tile';
 window.floorBreachState={...o,removed:fixture.removed.length,edges,shapes:[...r.chunks.values()].flatMap(m=>m.userData.boxes.filter(b=>b.floorBreach).map(b=>b.shape)),memory:{...renderer.info.memory}};return window.floorBreachState;
}
function dispose(){if(disposed)return;disposed=true;observer?.disconnect();grid?.geometry.dispose();grid?.material.dispose();paint?.dispose();worker?.skeleton.dispose();worker?.dispose();r.dispose();}
addEventListener('pagehide',dispose,{once:true});
try{
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');worker=profile.create(await fetch(profile.file).then(res=>res.json()));paint=await createAnimalPaint(renderer,worker,profile,r.loader,'normal');for(const part of worker.parts)part.material=paint.material;worker.pose('carry');scene.add(worker.root);rebuild();
 for(const id of ids)$(id).onchange=()=>{orbit=0;rebuild();};$('grid').onchange=draw;$('widen').onclick=()=>{$('size').value=Math.min(5,+$('size').value+1);rebuild();};$('restore').onclick=()=>{$('size').value=0;rebuild();};
 host.onpointerdown=e=>{drag={x:e.clientX,orbit};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.007;draw();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(draw);observer.observe(host);window.floorBreachStudy={set(o){for(const [id,v]of Object.entries(o))if($(id)?.type==='checkbox')$(id).checked=!!v;else if($(id))$(id).value=v;orbit=0;return rebuild();},draw,dispose,renderer,scene,camera,get fixture(){return fixture;},get chunks(){return r.chunks;}};$('loading').hidden=true;window.floorBreachReady=true;draw();
}catch(error){$('error').textContent=error.message;console.error(error);dispose();}
