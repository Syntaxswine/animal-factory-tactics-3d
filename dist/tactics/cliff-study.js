import * as T from './vendor/three.module.js';
import {createCliff,CLIFF_HEIGHT} from './cliff-models.js';
import {GAME_CAMERA} from './hybrid-world.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id);
async function start(){
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),scene=new T.Scene(),camera=new T.OrthographicCamera(),host=$('scene');host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x303b32);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene.add(new T.HemisphereLight(0xfff0d9,0x576452,2));const sun=new T.DirectionalLight(0xffe3bc,2.2);sun.position.set(-4,9,-5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10});sun.shadow.normalBias=.018;scene.add(sun);
 const ground=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:0x525c38,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;ground.receiveShadow=true;scene.add(ground);
 const grid=new T.GridHelper(24,24,0x72795a,0x626c4c);grid.position.y=.002;scene.add(grid);
 const wall=new T.Mesh(new T.BoxGeometry(1,CLIFF_HEIGHT,.16),new T.MeshStandardMaterial({color:0xc6bca3}));wall.position.set(0,CLIFF_HEIGHT/2,.4);wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);
 const loader=new T.TextureLoader(),[atlas,texture,data]=await Promise.all([loader.loadAsync(LIGHT_ATLAS),loader.loadAsync(MODEL_PAINT),fetch('./horse-10k-data.json').then(r=>{if(!r.ok)throw Error('Horse data failed');return r.json();})]);
 const horse=createLightHorse(data,atlas),paint=createModelPaint(renderer,horse,texture);horse.pose('neutral',135);horse.root.position.set(0,0,2.1);for(const p of horse.parts){p.material=paint.material;p.castShadow=true;}scene.add(horse.root);
 const guides=new T.Group();scene.add(guides);let cliffs=[],seed=1,az=GAME_CAMERA.azimuth,el=GAME_CAMERA.elevation,focus=new T.Vector3(0,.75,0),grey=new T.MeshStandardMaterial({color:0xaaa99d,roughness:1,flatShading:true});
 function clearGuides(){for(const o of [...guides.children]){o.geometry?.dispose();o.material?.dispose();guides.remove(o);}}
 function line(points,color){const m=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,depthTest:false}));m.renderOrder=3;guides.add(m);}
 function rebuild(){cliffs.forEach(c=>{scene.remove(c.root);c.dispose();});clearGuides();cliffs=[];const set=$('set').value,sets=set==='both'?['ledge','crag']:[set];
  $('ledge-legend').hidden=set==='crag';$('crag-legend').hidden=set==='ledge';
  sets.forEach((kind,i)=>{const c=createCliff(kind,$('shape').value,seed);c.original=c.mesh.material;c.root.position.x=sets.length===2?(i===0?-3.1:3.1):0;scene.add(c.root);cliffs.push(c);const x=c.root.position.x,{width:w,depth:d,climb}=c.layout;
   line([[x-w/2-.2,0,d/2+.2],[x-w/2-.2,CLIFF_HEIGHT,d/2+.2],[x+w/2+.2,CLIFF_HEIGHT,d/2+.2]],0xe8d79c);
   if(climb){line([climb.approach,climb.lip,climb.landing].map(([a,b,c])=>[a+x,b+.025,c]),0xb3e684);const ring=new T.Mesh(new T.RingGeometry(.27,.30,32),new T.MeshBasicMaterial({color:0xb3e684,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x+climb.landing[0],CLIFF_HEIGHT+.014,climb.landing[2]);guides.add(ring);}
  });wall.position.x=set==='both'?0:3.5;horse.root.position.x=set==='both'?0:2.8;render();
 }
 function render(){const w=host.clientWidth,h=host.clientHeight,ppu=$('scale').value==='auto'?Math.min(w/13,h/7):+$('scale').value;renderer.setSize(w,h,false);camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.1;camera.far=60;camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(18));camera.lookAt(focus);camera.updateProjectionMatrix();guides.visible=grid.visible=$('guides').checked;
  for(const c of cliffs){c.mesh.material=$('grey').checked?grey:c.mesh.material===grey?c.original:c.mesh.material;c.original??=c.mesh.material;for(const m of [].concat(c.mesh.material))m.wireframe=$('wire').checked;}renderer.render(scene,camera);
  $('status').textContent=`Wall / ledge / highest crest: ${CLIFF_HEIGHT.toFixed(2)} units · ${cliffs.reduce((n,c)=>n+c.mesh.geometry.attributes.position.count/3,0)} cliff triangles · variation ${seed} · ${Math.round(ppu)} px/unit`;
 }
 for(const id of ['shape','set'])$(id).onchange=rebuild;for(const id of ['scale','grey','guides','wire'])$(id).onchange=render;$('variant').onclick=()=>{seed++;rebuild();};$('reset').onclick=()=>{az=GAME_CAMERA.azimuth;el=GAME_CAMERA.elevation;render();};
 let pointer;renderer.domElement.onpointerdown=e=>{renderer.domElement.setPointerCapture(e.pointerId);pointer=[e.pointerId,e.clientX,e.clientY];};renderer.domElement.onpointermove=e=>{if(pointer?.[0]!==e.pointerId)return;az-=(e.clientX-pointer[1])*.008;el=T.MathUtils.clamp(el+(e.clientY-pointer[2])*.006,.12,1.3);pointer=[e.pointerId,e.clientX,e.clientY];render();};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>pointer=null;
 const resize=new ResizeObserver(render);resize.observe(host);rebuild();window.cliffStudy={ready:true,scene,camera,renderer,horse,get cliffs(){return cliffs;},view(a,e){az=a;el=e;render();},render};
 addEventListener('pagehide',()=>{resize.disconnect();clearGuides();cliffs.forEach(c=>c.dispose());grey.dispose();ground.geometry.dispose();ground.material.dispose();wall.geometry.dispose();wall.material.dispose();grid.geometry.dispose();grid.material.dispose();paint.dispose();atlas.dispose();horse.skeleton.dispose();horse.dispose();renderer.dispose();},{once:true});
}
start().catch(e=>{$('error').textContent=e.message;console.error(e);});
