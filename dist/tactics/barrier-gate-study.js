import * as T from './vendor/three.module.js';
import {createFurnitureLibrary} from './painted-furniture.js';
import {setBarrierGateOpen} from './barrier-gate.js';
import {PAINTED_ATLAS} from './painted-environment-scene.js';
import {CARGO_ATLAS} from './painted-cargo.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id),stage=$('stage');
async function start(){
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0x353c35);const camera=new T.OrthographicCamera();scene.add(new T.HemisphereLight(0xfff3da,0x687569,2));const sun=new T.DirectionalLight(0xffefcf,2.4);sun.position.set(5,8,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});sun.shadow.bias=-.0002;sun.shadow.normalBias=.012;scene.add(sun);
 const loader=new T.TextureLoader(),[atlas,cargo,horseAtlas,horsePaint,data]=await Promise.all([loader.loadAsync(PAINTED_ATLAS),loader.loadAsync(CARGO_ATLAS),loader.loadAsync(LIGHT_ATLAS),loader.loadAsync(MODEL_PAINT),fetch('./horse-10k-data.json').then(r=>{if(!r.ok)throw Error('Horse model missing');return r.json();})]);for(const t of [atlas,cargo,horseAtlas])t.colorSpace=T.SRGBColorSpace;
 const library=createFurnitureLibrary(atlas,cargo),gate=library.build('barrier-gate'),horse=createLightHorse(data,horseAtlas),paint=createModelPaint(renderer,horse,horsePaint);horse.pose('neutral',0);horse.root.position.set(-1.1,0,.3);for(const p of horse.parts){p.material=paint.material;p.castShadow=p.receiveShadow=true;}scene.add(gate.root,horse.root);
 const ground=new T.Mesh(new T.PlaneGeometry(16,16),new T.MeshStandardMaterial({color:0x767363,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;ground.receiveShadow=true;scene.add(ground);
 const pts=[];for(const x of [-.5,.5])pts.push(x,.006,-1.5,x,.006,1.5);for(const z of [-1.5,-.5,.5,1.5])pts.push(-.5,.006,z,.5,.006,z);
 const grid=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(pts,3)),new T.LineBasicMaterial({color:0xe9c887}));scene.add(grid);
 let azimuth=.90,elevation=.42,raf=0,disposed=false;const focus=new T.Vector3(-.25,1.38,0),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function render(){if(disposed)return;const w=stage.clientWidth,h=stage.clientHeight,ppu=$('scale').value==='58'?58:Math.min(h/4.8,w/6.8,190);renderer.setSize(w,h,false);camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.1;camera.far=40;camera.position.copy(focus).add(new T.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(12));camera.lookAt(focus);camera.updateProjectionMatrix();renderer.render(scene,camera);$('status').textContent=`${Math.round(+$('position').value*100)}% open · 1×3 footprint · ${Math.round(ppu)} px/tile`;}
 function stop(){cancelAnimationFrame(raf);raf=0;$('play').textContent='Play opening';}
 function pose(value){setBarrierGateOpen(gate.root,value);$('position').value=value;render();}
 $('closed').onclick=()=>{stop();pose(0);};$('open').onclick=()=>{stop();pose(1);};$('position').oninput=()=>{stop();pose(+$('position').value);};
 $('play').onclick=()=>{if(raf){stop();return;}const from=+$('position').value,to=from<.5?1:0;if(reduced.matches){pose(to);return;}const began=performance.now();$('play').textContent='Pause';const frame=now=>{const t=Math.min(1,(now-began)/1600),e=t*t*(3-2*t);pose(from+(to-from)*e);if(t<1)raf=requestAnimationFrame(frame);else stop();};raf=requestAnimationFrame(frame);};
 $('view').onchange=()=>{azimuth={angle:.9,front:Math.PI/2,back:-Math.PI/2,end:Math.PI}[$('view').value];render();};$('scale').onchange=render;$('horse').onchange=()=>{horse.root.visible=$('horse').checked;render();};
 const pause=()=>{if(document.hidden||reduced.matches)stop();};document.addEventListener('visibilitychange',pause);reduced.addEventListener('change',pause);
 let pointer=null;renderer.domElement.onpointerdown=e=>{pointer=[e.pointerId,e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);};renderer.domElement.onpointermove=e=>{if(!pointer)return;azimuth-=(e.clientX-pointer[1])*.008;elevation=T.MathUtils.clamp(elevation+(e.clientY-pointer[2])*.006,.12,1.3);pointer=[e.pointerId,e.clientX,e.clientY];render();};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>pointer=null;
 const resize=new ResizeObserver(render);resize.observe(stage);render();window.barrierStudy={gate,horse,library,renderer,scene,camera,pose,render};
 window.addEventListener('pagehide',()=>{disposed=true;stop();resize.disconnect();document.removeEventListener('visibilitychange',pause);reduced.removeEventListener('change',pause);library.dispose();paint.dispose();for(const t of [atlas,cargo,horseAtlas])t.dispose();const geometries=new Set(),materials=new Set();horse.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&o.material!==paint.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();sun.shadow.map?.dispose();renderer.dispose();},{once:true});
}
start().catch(e=>{$('error').textContent=e.message;console.error(e);});
