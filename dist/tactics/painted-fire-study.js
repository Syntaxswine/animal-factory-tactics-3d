import * as T from './vendor/three.module.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
import {createWeaponModel} from './weapon-models.js';
import {createPaintedFireMotion} from './painted-fire-motion.js';
import {createPaintedFireEffects} from './painted-fire-effects.js';
import {makeBurnRoute,FIRE_TIME,clamp} from './painted-fire-state.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),params=new URLSearchParams(location.search);
const host=$('viewport'),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.localClippingEnabled=true;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x303b33);const camera=new T.OrthographicCamera(-7,7,4,-4,.05,100);
scene.add(new T.HemisphereLight(0xfff3d5,0x56634b,2));const sun=new T.DirectionalLight(0xffe4bd,2);sun.position.set(3,6,4);scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(32,24),new T.MeshStandardMaterial({color:0x596448,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(5,-.005,0);scene.add(floor);
const grid=new T.GridHelper(32,32,0x6e765b,0x606a51);grid.position.x=5;scene.add(grid);
const loader=new T.TextureLoader();let time=Number(params.get('time'))||0,playing=!params.has('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches,drag=null,orbit=0,elevation=0,disposed=false;
const walls=new T.Group();scene.add(walls);
for(const id of ['focus','view','scale','scene','steps'])if(params.has(id)&&Array.from($(id).options).some(o=>o.value===params.get(id)))$(id).value=params.get(id);
if(params.get('effects')==='off')$('effects').checked=false;
try{
 const [data,atlas,contract]=await Promise.all([fetch('./horse-10k-data.json').then(r=>r.json()),loader.loadAsync(LIGHT_ATLAS),fetch('./fixtures/painted-fire-contract.json').then(r=>r.json())]);atlas.colorSpace=T.SRGBColorSpace;
 const actors=[];
 for(const weaponId of ['flamethrower','rifle']){const worker=createLightHorse(data,atlas),paint=createModelPaint(renderer,worker,await loader.loadAsync(MODEL_PAINT)),weapon=createWeaponModel(weaponId,atlas);for(const p of worker.parts)p.material=paint.material;worker.equipWeapon(weapon);scene.add(worker.root);actors.push({worker,paint,weapon,motion:createPaintedFireMotion(worker)});}
 const [shooter,target]=actors,effects=await createPaintedFireEffects(scene,loader,target.worker),dissolve={value:0};
 const compilePaint=target.paint.material.onBeforeCompile,paintKey=target.paint.material.customProgramCacheKey;
 target.paint.material.onBeforeCompile=shader=>{compilePaint(shader);shader.uniforms.fireDissolve=dissolve;shader.vertexShader='varying vec3 fireBind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfireBind=position;');shader.fragmentShader='uniform float fireDissolve;varying vec3 fireBind;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat breakup=fract(sin(dot(floor(fireBind*29.0),vec3(12.9898,78.233,31.41)))*43758.5453);if(breakup<fireDissolve)discard;');shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.07,.059,.046),smoothstep(.0,.35,fireDissolve));\n#include <tonemapping_fragment>');};target.paint.material.customProgramCacheKey=()=>paintKey()+'-fire-dissolve-v1';
 const shadowTexture=await loader.loadAsync('../assets/effects/painted-fire/ash-paint-v1.png');shadowTexture.colorSpace=T.SRGBColorSpace;
 const shadows=actors.map(()=>{const m=new T.Mesh(new T.PlaneGeometry(.75,.65),new T.MeshBasicMaterial({map:shadowTexture,color:0x090d0a,transparent:true,opacity:.30,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.002;scene.add(m);return m;});
 const routeMarks=new T.Group();scene.add(routeMarks);for(let i=0;i<4;i++){const points=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]].map(([x,z])=>V(4+i+x,.009,z));const m=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:i===3?0xd5b06a:0x999d76,transparent:true,opacity:.8}));routeMarks.add(m);}
 let route,shape,lastScene;
 function environment(){route=makeBurnRoute(Array.from({length:+$('steps').value+1},(_,i)=>({x:4+i,z:0})));for(let i=0;i<4;i++)routeMarks.children[i].visible=i<=+$('steps').value;shape=contract[$('scene').value];
  if(lastScene!==$('scene').value){while(walls.children.length){const m=walls.children[0];m.geometry.dispose();m.material.dispose();walls.remove(m);}lastScene=$('scene').value;
   if(lastScene!=='open')for(let i=-5;i<=5;i++){if(lastScene==='doorway'&&i===0)continue;const m=new T.Mesh(new T.BoxGeometry(.16,2.2,1),new T.MeshStandardMaterial({color:0x96876b,roughness:1}));m.position.set(2.5,1.1,i);walls.add(m);}
  }
 }
 function draw(){if(disposed)return;environment();const w=host.clientWidth,h=host.clientHeight;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
  const blocked=$('scene').value==='wall',a=shooter.motion.fire(time),b=target.motion.burn(blocked?0:time,route),focus=$('focus').value;
  let centre=focus==='shooter'?V(.25,.95,0):focus==='target'?V(b.state.point.x,.85,0):V(4.1,.8,0);
  const direction={three:V(5,5,8),side:V(0,2.2,10),front:V(10,2.2,0),rear:V(-10,2.2,0)}[$('view').value];direction.applyAxisAngle(V(0,1,0),orbit);direction.y+=elevation;camera.position.copy(centre).add(direction);camera.lookAt(centre);
  const scale=$('scale').value,ppu=scale==='game'?58:scale==='close'?Math.min(260,h/2.6):Math.min(h/(focus==='both'?6:2.7),w/(focus==='both'?13:4));camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.updateProjectionMatrix();
  const effectState=effects.update(time,{shape,muzzle:V(...a.muzzle),camera,route,body:!blocked,visible:$('effects').checked});
  // Bind-space breakup remains stable while the body moves. The settled pose
  // dissolves beneath the flame envelope, without a flat slice or bone scaling.
  dissolve.value=blocked?0:b.state.dissolve;shadows[0].position.x=0;shadows[1].position.x=b.state.point.x;shadows[1].material.opacity=.3*(1-b.state.dissolve);
  $('time').value=time;$('clock').textContent=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play';
  $('status').textContent=`${a.state.phase} · ${blocked?'Protected by wall':b.state.phase} · ${blocked?'No hit':b.state.distance.toFixed(2)+' / '+route.length+' tiles'} · ${Math.round(ppu)} px/tile`;
  renderer.render(scene,camera);window.fireStudyState={time,playing,shooter:a,target:b,effects:effectState,route,scene:$('scene').value,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures};
 }
 window.fireStudy={seek(t){playing=false;time=clamp(t,0,FIRE_TIME.duration);draw();return window.fireStudyState;},set(options){for(const [key,value]of Object.entries(options)){if(key==='effects')$(key).checked=value;else if($(key))$(key).value=value;}draw();},play(){playing=true;},draw,actors,effects,renderer,scene,camera};
 $('loading').remove();$('play').onclick=()=>{playing=!playing;draw();};$('restart').onclick=()=>{time=0;playing=true;draw();};$('time').oninput=()=>{playing=false;time=+$('time').value;draw();};
 for(const id of ['focus','view','scale','scene','steps','effects'])$(id).onchange=()=>{if(id==='view'){orbit=0;elevation=0;}draw();};
 for(const button of document.querySelectorAll('[data-time]'))button.onclick=()=>window.fireStudy.seek(+button.dataset.time);
 host.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,orbit,elevation};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(!drag)return;orbit=drag.orbit+(e.clientX-drag.x)*.007;elevation=clamp(drag.elevation-(e.clientY-drag.y)*.025,-1.5,6);draw();};host.onpointerup=()=>{drag=null;};host.onpointercancel=()=>{drag=null;};
 const observer=new ResizeObserver(draw);observer.observe(host);let last=performance.now();
 function frame(now){if(disposed)return;if(playing){time+=Math.min(.04,(now-last)/1000);if(time>FIRE_TIME.duration)time=0;draw();}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);draw();window.fireStudyReady=true;
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();effects.dispose();for(const a of actors){a.motion.dispose();a.paint.dispose();a.weapon.dispose();a.worker.dispose();}atlas.dispose();shadowTexture.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});renderer.dispose();}
 window.addEventListener('pagehide',dispose,{once:true});window.fireStudy.dispose=dispose;
}catch(e){$('error').textContent=e.message;$('loading').textContent='Study failed to load';console.error(e);}
