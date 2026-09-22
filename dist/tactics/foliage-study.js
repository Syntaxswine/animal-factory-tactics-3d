import * as T from './vendor/three.module.js';
import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld,GAME_CAMERA} from './hybrid-world.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id);
async function start(){
 const hybrid=new HybridRenderer(),{renderer,scene,camera}=hybrid,host=$('scene');host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x343d32);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const sun=scene.children.find(o=>o.isDirectionalLight);sun.castShadow=true;sun.position.set(-3,7,5);sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,bottom:-7,top:7,near:.1,far:25});sun.shadow.normalBias=.025;
 const map={terrain:Array.from({length:5},(_,y)=>Array.from({length:7},(_,x)=>x===6?'ground-gravel':y===0?'woodland':'ground-grass')),props:[{x:1,y:1,kind:'tree-broadleaf'},{x:4,y:0,kind:'tree-pine'},{x:0,y:3,kind:'bush'}],edges:{},upper:[],stairs:[]};
 const world=buildWorld(map);hybrid.rebuild(world,null,0,map);for(const m of hybrid.structures.children){m.castShadow=!m.userData.boxes.every(b=>b.kind==='floor');m.receiveShadow=true;}
 const loader=new T.TextureLoader(),[atlas,texture,data]=await Promise.all([loader.loadAsync(LIGHT_ATLAS),loader.loadAsync(MODEL_PAINT),fetch('./horse-10k-data.json').then(r=>r.json())]);
 const horse=createLightHorse(data,atlas),paint=createModelPaint(renderer,horse,texture);horse.pose('neutral',45);horse.root.position.set(3,0,3);for(const p of horse.parts){p.material=paint.material;p.castShadow=true;}scene.add(horse.root);
 const ring=new T.Mesh(new T.RingGeometry(.36,.395,48),new T.MeshBasicMaterial({color:0xb7dc7a,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(3,.014,3);scene.add(ring);
 let az=GAME_CAMERA.azimuth,el=GAME_CAMERA.elevation;const focus=new T.Vector3(2.6,.65,1.9);
 function render(){const w=host.clientWidth,h=host.clientHeight,ppu=+$('scale').value;renderer.setSize(w,h,false);camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.1;camera.far=40;camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(12));camera.lookAt(focus);camera.updateProjectionMatrix();horse.root.visible=ring.visible=$('horse').checked;renderer.render(scene,camera);$('status').textContent=`${ppu} CSS px/unit · ${renderer.info.render.triangles.toLocaleString()} visible triangles · ${renderer.info.render.calls} draw calls`;}
 hybrid.onReady=render;for(const id of ['scale','horse'])$(id).onchange=render;$('wire').onchange=()=>{for(const m of hybrid.materials.values())m.wireframe=$('wire').checked;render();};$('reset').onclick=()=>{az=GAME_CAMERA.azimuth;el=GAME_CAMERA.elevation;render();};
 let pointer;const canvas=renderer.domElement;canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointer=[e.pointerId,e.clientX,e.clientY];};canvas.onpointermove=e=>{if(pointer?.[0]!==e.pointerId)return;az-=(e.clientX-pointer[1])*.008;el=T.MathUtils.clamp(el+(e.clientY-pointer[2])*.006,.12,1.3);pointer=[e.pointerId,e.clientX,e.clientY];render();};canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;
 const resize=new ResizeObserver(render);resize.observe(host);render();window.foliageStudy={hybrid,map,world,horse,render,view(a,e){az=a;el=e;render();},ready:true};
 addEventListener('pagehide',()=>{resize.disconnect();paint.dispose();atlas.dispose();horse.skeleton.dispose();horse.dispose();ring.geometry.dispose();ring.material.dispose();hybrid.dispose();},{once:true});
}
start().catch(e=>{$('error').textContent=e.message;console.error(e);});
