import * as T from './vendor/three.module.js';
import {CHAIR_PAINT,CHAIR_FORMS,createChairLibrary} from './painted-chairs.js';
import {createChairFitGuide} from './chair-fit-guide.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createModelPaint} from './horse-model-paint.js';

const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),loader=new T.TextureLoader(),abort=new AbortController();
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x333e38);const camera=new T.OrthographicCamera(-4,4,3,-3,.01,80);
scene.add(new T.HemisphereLight(0xfff1d7,0x617169,2.2));const sun=new T.DirectionalLight(0xffeed9,2);sun.position.set(3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});sun.shadow.bias=-.0003;sun.shadow.normalBias=.004;scene.add(sun);const fill=new T.DirectionalLight(0xdceaf4,.7);fill.position.set(-4,3,-3);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0x8d896b,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
const group=new T.Group(),outlines=new T.Group(),guides=new T.Group();scene.add(group,outlines,guides);const lineMaterial=new T.LineBasicMaterial({color:0xc5b787,transparent:true,opacity:.55});
let atlas,library,selected=[],fitting=[],lineGeometries=[],animal=null,ready=false,disposed=false,observer,drag,orbit=0,tilt=0,referenceGeneration=0,initializing=true,released=false;
for(const key of ['chair','finish','view','scale','reference'])if([...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
for(const key of ['fit','grey','footprint'])if(params.has(key))$(key).checked=params.get(key)!=='0';
function disposeAnimal(a){if(!a)return;a.worker.root.removeFromParent();a.paint.dispose();a.worker.skeleton.dispose();a.worker.dispose();}
async function loadReference(id){
 const generation=++referenceGeneration;$('reference').disabled=true;window.chairReferenceReady=false;
 if(id==='none'){disposeAnimal(animal);animal=null;$('reference').disabled=false;window.chairReferenceReady=true;frame();return;}
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id);let texture,worker,paint;
 try{
  const results=await Promise.allSettled([fetch('./'+profile.file,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Reference mesh failed');return r.json();}),loader.loadAsync(profile.paint)]);
  texture=results[1].status==='fulfilled'?results[1].value:null;
  if(disposed||generation!==referenceGeneration){texture?.dispose();return;}
  if(results.some(r=>r.status==='rejected'))throw Error('Reference could not load');
  texture.colorSpace=T.SRGBColorSpace;worker=profile.create(results[0].value);worker.pose('neutral',-35);paint=createModelPaint(renderer,worker,texture,{species:profile.id,frame:profile.frame});
  for(const p of worker.parts){p.material=paint.material;p.castShadow=p.receiveShadow=true;}
  disposeAnimal(animal);animal={worker,paint,profile};scene.add(worker.root);$('error').textContent='';window.chairReferenceReady=true;frame();
 }catch(error){if(paint)paint.dispose();else texture?.dispose();worker?.skeleton.dispose();worker?.dispose();if(!disposed&&generation===referenceGeneration){$('error').textContent=error.message;console.error(error);}}
 finally{if(!disposed&&generation===referenceGeneration)$('reference').disabled=false;}
}
function rebuild(){
 for(const c of selected)c.dispose();selected=[];group.clear();outlines.clear();for(const g of lineGeometries)g.dispose();lineGeometries=[];for(const f of fitting)f.dispose();fitting=[];guides.clear();
 const forms=$('chair').value==='all'?CHAIR_FORMS:CHAIR_FORMS.filter(f=>f.id===$('chair').value);
 forms.forEach((form,i)=>{
  const chair=library.build(form.id,{finish:form.finishes[$('finish').value==='alternate'?1:0]}),x=(i-(forms.length-1)/2)*1.24;chair.root.position.x=x;group.add(chair.root);selected.push(chair);
  const fit=createChairFitGuide();fit.root.position.x=x;guides.add(fit.root);fitting.push(fit);
  const g=new T.BufferGeometry().setFromPoints([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]].map(([a,b])=>new T.Vector3(a+x,.002,b)));lineGeometries.push(g);outlines.add(new T.Line(g,lineMaterial));
 });library.setGrey($('grey').checked);guides.visible=$('fit').checked;outlines.visible=$('footprint').checked;frame();
}
function frame(){
 if(!ready||disposed)return;
 if(animal)animal.worker.root.position.set(selected.length===4?3:1.28,0,.20);
 const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);
 const view=$('view').value,focus=new T.Vector3(animal?.worker?selected.length===4?.38:.35:0,.65,0),az=({three:.55,front:0,side:Math.PI/2,top:0,rear:Math.PI})[view]+orbit,el=Math.max(.03,Math.min(Math.PI/2-.001,({three:.43,front:.065,side:.08,top:Math.PI/2-.001,rear:.32})[view]+tilt));
 camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(14));camera.lookAt(focus);camera.updateMatrixWorld(true);let ppu=58;
 if($('scale').value==='close'){
  const bounds=new T.Box3().setFromObject(group);if(guides.visible)bounds.union(new T.Box3().setFromObject(guides));if(animal){const d=animal.worker.diagnostics(),p=animal.worker.root.position;bounds.union(new T.Box3(new T.Vector3(...d.min),new T.Vector3(...d.max)));}
  const b=new T.Box3();for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])b.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const mid=b.getCenter(new T.Vector3());camera.position.add(new T.Vector3(mid.x,mid.y,0).applyQuaternion(camera.quaternion));ppu=Math.min(500,(width-60)/(b.max.x-b.min.x+.15),(height-60)/(b.max.y-b.min.y+.15));
 }
 camera.left=-width/(2*ppu);camera.right=width/(2*ppu);camera.top=height/(2*ppu);camera.bottom=-height/(2*ppu);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.render(scene,camera);
 const forms=selected.map(c=>{let triangles=0;c.root.traverse(p=>{if(p.isMesh)triangles+=(p.geometry.index?.count||p.geometry.attributes.position.count)/3;});return {id:c.form.id,finish:c.finish,triangles};});
 $('status').textContent=forms.map(c=>CHAIR_FORMS.find(f=>f.id===c.id).name+' '+c.triangles+' tris').join(' · ')+' · seat 0.48 high × 0.84 wide · '+Math.round(ppu)+' px/tile';
 window.paintedChairState={forms,seatHeight:.48,reference:animal?.profile.id||'none',referenceReady:window.chairReferenceReady,grey:$('grey').checked,fit:$('fit').checked,view,ppu,library:library.stats(),resources:{...renderer.info.memory}};return window.paintedChairState;
}
function release(){if(released)return;released=true;selected.forEach(c=>c.dispose());fitting.forEach(f=>f.dispose());lineGeometries.forEach(g=>g.dispose());disposeAnimal(animal);animal=null;library?.dispose();atlas?.dispose();lineMaterial.dispose();floor.geometry.dispose();floor.material.dispose();sun.shadow.dispose();renderer.dispose();window.paintedChairsDisposed=true;}
function dispose(){if(disposed)return;disposed=true;referenceGeneration++;window.paintedChairsReady=false;abort.abort();observer?.disconnect();if(!initializing)release();}
addEventListener('pagehide',dispose,{once:true});
try{
 atlas=await loader.loadAsync(CHAIR_PAINT);if(disposed)throw Error('Study closed');atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());library=createChairLibrary(atlas);ready=true;rebuild();
 window.paintedChairsStudy={async set(options){for(const [key,value]of Object.entries(options)){const c=$(key);if(!c)continue;if(c.type==='checkbox')c.checked=!!value;else if([...c.options||[]].some(o=>o.value===String(value)))c.value=value;}orbit=tilt=0;rebuild();if('reference'in options)await loadReference($('reference').value);return frame();},frame,dispose,renderer,scene,camera,library,group,guides,get selected(){return selected;},get animal(){return animal;}};
 for(const id of ['chair','finish','view','scale','fit','grey','footprint'])$(id).onchange=()=>{if(id==='view')orbit=tilt=0;rebuild();};$('reference').onchange=()=>loadReference($('reference').value);
 $('reset').onclick=()=>{orbit=tilt=0;frame();};host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,orbit,tilt};};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.004;frame();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(frame);observer.observe(host);await loadReference($('reference').value);if(!disposed){$('loading').hidden=true;window.paintedChairsReady=true;frame();}
}catch(error){if(!disposed){$('error').textContent=error.message;$('loading').hidden=true;console.error(error);dispose();}}
finally{initializing=false;if(disposed)release();}
