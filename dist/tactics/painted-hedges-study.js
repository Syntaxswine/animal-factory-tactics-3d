import * as T from './vendor/three.module.js';
import {createPaintedHedges,SCREEN_ATLAS,FRINGE_ATLAS} from './painted-hedges.js';
import {hedgeFixture} from './hedge-layout.js';
import {configureBiomeTexture,createBiomeGround} from './biome-foliage-paint.js';
import {BIOME_TEXTURES} from './biome-foliage-data.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createModelPaint} from './horse-model-paint.js';
import {createBattlePosture} from './battle-posture.js';

const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),loader=new T.TextureLoader(),abort=new AbortController();
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x303d33);const camera=new T.OrthographicCamera(-7,7,5,-5,.01,120);
scene.add(new T.HemisphereLight(0xfff1db,0x637662,2.1));const sun=new T.DirectionalLight(0xffefd5,2.1);sun.position.set(-7,14,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-19,right:19,top:14,bottom:-14,near:.1,far:50});sun.shadow.bias=-.0002;sun.shadow.normalBias=.008;scene.add(sun);
const fill=new T.DirectionalLight(0xdfebf8,.6);fill.position.set(8,5,-7);scene.add(fill);
const grid=new T.GridHelper(60,60,0xaab18a,0x89956e);grid.position.set(.5,.004,.5);grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
let textures={},hedges,floor,ready=false,disposed=false,initializing=true,released=false,observer,drag,orbit=0,tilt=0;const horses=[];
for(const id of ['layout','kind','view','scale','reference'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
for(const id of ['grid','grey','wood'])if(params.has(id))$(id).checked=params.get(id)!=='0';

function reference(){
 const positions=$('layout').value==='pair'?[[4.15,2],[4.15,-2]]:[[0,1.5],[2,1.5]];
 horses.forEach((a,i)=>{
  a.worker.root.visible=$('reference').value!=='none'&&($('layout').value==='pair'||i===0);
  a.worker.root.position.set(0,0,0);a.worker.pose('neutral',0);
  a.posture.apply({pose:{kneel:$('reference').value==='kneeling'?1:0},heading:0});a.posture.ground();
  a.worker.root.position.x=positions[i][0];a.worker.root.position.z=positions[i][1];
  a.worker.root.rotation.y=-Math.PI/2;
 });
}
function rebuild(){
 if(!ready||disposed)return;hedges?.dispose();hedges=createPaintedHedges(hedgeFixture($('layout').value,$('kind').value),textures);scene.add(hedges.root);reference();
 $('kind').disabled=$('layout').value==='pair'||$('layout').value==='mixed';frame();
}
function frame(){
 if(!ready||disposed)return;
 hedges.setGrey($('grey').checked);for(const mesh of hedges.root.children)if($('wood').checked)mesh.visible=mesh.userData.layer==='wood';
 if($('layout').value==='pair')horses[1].worker.root.position.x=$('view').value==='front'?-4.15:4.15;
 grid.visible=$('grid').checked;
 const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);
 const box=new T.Box3().setFromObject(hedges.root);for(const a of horses)if(a.worker.root.visible)box.union(new T.Box3().setFromObject(a.worker.root));
 const focus=box.getCenter(new T.Vector3()),view=$('view').value,az=({three:.42,front:0,side:Math.PI/2,top:0,rear:Math.PI+.45})[view]+orbit,el=Math.max(.04,Math.min(Math.PI/2-.001,({three:.47,front:.08,side:.14,top:Math.PI/2-.001,rear:.43})[view]+tilt));
 if($('scale').value==='close')focus.set($('layout').value==='pair'?2.2:0,1,$('layout').value==='pair'?-.2:0);
 camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(40));camera.lookAt(focus);camera.updateMatrixWorld(true);
 let ppu=$('scale').value==='close'?150:58;
 if($('scale').value==='fit'){
  const b=new T.Box3();for(const x of [box.min.x,box.max.x])for(const y of [0,box.max.y])for(const z of [box.min.z,box.max.z])b.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  ppu=Math.min(210,(width-90)/(b.max.x-b.min.x+.3),(height-70)/(b.max.y-b.min.y+.3));
 }
 camera.left=-width/(2*ppu);camera.right=width/(2*ppu);camera.top=height/(2*ppu);camera.bottom=-height/(2*ppu);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);renderer.render(scene,camera);
 const stats=hedges.stats();$('status').textContent=`${$('layout').value==='pair'?'Short 0.90 · Tall 2.12':$('kind').selectedOptions[0].textContent} · ${stats.cells} planted tiles · ${stats.triangles.toLocaleString()} hedge triangles · ${Math.round(ppu)} px/tile`;
 const query=new URLSearchParams();for(const id of ['layout','kind','view','scale','reference'])query.set(id,$(id).value);for(const id of ['grid','grey','wood'])query.set(id,$(id).checked?'1':'0');if(params.has('revision'))query.set('revision',params.get('revision'));history.replaceState(null,'','?'+query);
 window.hedgeStudyState={...stats,layout:$('layout').value,kind:$('kind').value,reference:$('reference').value,grey:$('grey').checked,woodOnly:$('wood').checked,ppu,drawCalls:renderer.info.render.calls,submittedTriangles:renderer.info.render.triangles,resources:{...renderer.info.memory},contract:hedges.contract};return window.hedgeStudyState;
}
function release(){
 if(released)return;released=true;hedges?.dispose();for(const a of horses){a.paint.dispose();a.worker.skeleton.dispose();a.worker.dispose();}for(const t of Object.values(textures))t.dispose();if(floor){floor.geometry.dispose();floor.material.dispose();}grid.geometry.dispose();grid.material.dispose();sun.shadow.dispose();renderer.dispose();window.hedgeStudyDisposed=true;
}
function dispose(){if(disposed)return;disposed=true;window.hedgeStudyReady=false;abort.abort();observer?.disconnect();if(!initializing)release();}
addEventListener('pagehide',dispose,{once:true});
try{
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');
 const results=await Promise.allSettled([loader.loadAsync(SCREEN_ATLAS),loader.loadAsync(FRINGE_ATLAS),loader.loadAsync(BIOME_TEXTURES.ground),fetch(profile.file,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Horse mesh load failed');return r.json();}),loader.loadAsync(profile.paint),loader.loadAsync(profile.paint)]);
 for(let i=0;i<3;i++)if(results[i].status==='fulfilled')textures[['screen','fringe','ground'][i]]=configureBiomeTexture(results[i].value);
 const paints=results.slice(4).filter(r=>r.status==='fulfilled').map(r=>r.value);
 if(disposed||results.some(r=>r.status==='rejected')){paints.forEach(t=>t.dispose());throw Error('Study assets could not load');}
 floor=new T.Mesh(new T.PlaneGeometry(90,90),createBiomeGround(textures.ground,'temperate'));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
 for(const texture of paints){texture.colorSpace=T.SRGBColorSpace;const worker=profile.create(results[3].value),paint=createModelPaint(renderer,worker,texture,{species:profile.id,frame:profile.frame}),posture=createBattlePosture(worker,profile);for(const part of worker.parts){part.material=paint.material;part.castShadow=part.receiveShadow=true;}horses.push({worker,paint,posture});scene.add(worker.root);}
 ready=true;rebuild();
 window.hedgeStudy={set(options){for(const [id,value]of Object.entries(options)){const c=$(id);if(!c)continue;if(c.type==='checkbox')c.checked=!!value;else if([...c.options||[]].some(o=>o.value===String(value)))c.value=value;}orbit=tilt=0;rebuild();return frame();},frame,dispose,scene,renderer,camera,get hedges(){return hedges;},horses};
 for(const id of ['layout','kind','reference'])$(id).onchange=rebuild;
 for(const id of ['view','scale','grid','grey','wood'])$(id).onchange=()=>{orbit=tilt=0;frame();};
 $('reset').onclick=()=>{orbit=tilt=0;frame();};
 host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,orbit,tilt};};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.004;frame();};host.onpointerup=host.onpointercancel=()=>drag=null;
 observer=new ResizeObserver(frame);observer.observe(host);$('loading').hidden=true;window.hedgeStudyReady=true;frame();
}catch(error){if(!disposed){$('loading').hidden=true;$('error').textContent=error.message;console.error(error);dispose();}}
finally{initializing=false;if(disposed)release();}
