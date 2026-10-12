import * as T from './vendor/three.module.js';
import {createSAMMissile} from './sam-missile.js';
import {createIntroLauncher} from './intro-launcher.js';
import {createIntroHelicopter} from './intro-helicopter.js';
import {createIntroEnvironment} from './intro-environment.js';
import {createIntroEffects} from './intro-effects.js';
import {createIntroRadioRoom} from './intro-radio-room.js';
import {createIntroRadar} from './intro-radar.js';
import {INTRO_SHOTS,shotAt,aircraftState,missileState,smooth} from './intro-timeline.js';
import {HELICOPTER_PAINT,HELICOPTER_GROUND} from './utility-helicopter.js';
import {STRATEGIC_SITE_ATLAS} from './strategic-sites.js';
import {FOLIAGE_ATLAS} from './foliage-materials.js';
import {FIRE_ASSETS} from './painted-fire-effects.js';
import {HEN_PAINT} from './hen-worker.js';

const $=id=>document.getElementById(id),host=$('viewport'),params=new URLSearchParams(location.search),abort=new AbortController();
for(const id of ['module','view','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
for(const id of ['effects','trees','grey','section'])if(params.has(id))$(id).checked=params.get(id)!=='0';
if(params.has('roll'))$('roll').value=params.get('roll');
const ranges={sequence:[0,35],missile:[0,0],launch:[14,21.8],flight:[0,4],crash:[20.5,35],handler:[4,9],radar:[12,14]};
let time=Number.isFinite(Number(params.get('time')))&&params.has('time')?Number(params.get('time')):ranges[$('module').value][0],playing=false,disposed=false,released=false,initializing=true,ready=false,frameId=null,last=null,orbit=0,tilt=0,drag,observer;
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
const camera=new T.OrthographicCamera(-10,10,7,-7,.05,240),scene=new T.Scene(),benchScene=new T.Scene(),roomScene=new T.Scene();scene.background=new T.Color(0xa6b4af);scene.fog=new T.Fog(0xa6b4af,68,145);benchScene.background=new T.Color(0x343e36);roomScene.background=new T.Color(0x252b25);
const suns=[];for(const s of [scene,benchScene,roomScene]){s.add(new T.HemisphereLight(0xffeed3,0x667461,2));const sun=new T.DirectionalLight(0xffeace,2.1);sun.position.set(12,35,20);sun.castShadow=true;sun.shadow.mapSize.set(s===scene?2048:1024,s===scene?2048:1024);Object.assign(sun.shadow.camera,{left:-42,right:42,top:40,bottom:-40,near:.1,far:100});sun.shadow.bias=-.0002;sun.shadow.normalBias=.012;s.add(sun);suns.push(sun);}
const benchFloor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x736e53,roughness:1}));benchFloor.rotation.x=-Math.PI/2;benchFloor.receiveShadow=true;benchScene.add(benchFloor);const grid=new T.GridHelper(12,12,0xb0a17a,0x8c8769);grid.position.y=.003;benchScene.add(grid);
const radar=createIntroRadar($('radar')),ownedTextures=[],modules=[];let design,launcher,helicopter,environment,effects,room,projectiles,henTextures;
function limits(){const r=ranges[$('module').value];time=T.MathUtils.clamp(time,...r);$('time').min=r[0];$('time').max=r[1]||1;$('time').disabled=$('module').value==='missile';$('play').disabled=$('module').value==='missile';$('missile-controls').hidden=$('module').value!=='missile';}
function cameraAt(focus,span,module,shot){const view=$('view').value;let offset;
 if(view!=='shot')offset=({three:[.72,.42,1],side:[0,.13,1],nose:[1,.015,0],tail:[-1,.015,0],top:[.001,1,.001]})[view];
 else if(module==='missile')offset=[.9,.46,1];else if(shot.index===1||module==='handler')offset=[1,.25,.82];else if(shot.index===4||shot.index===5||module==='launch')offset=[1,.40,.4];else offset=[.6,.34,1];
 const v=new T.Vector3(...offset).normalize();let az=Math.atan2(v.z,v.x)+orbit,el=Math.max(.006,Math.min(1.565,Math.asin(v.y)+tilt));
 camera.position.copy(focus).add(new T.Vector3(Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)).multiplyScalar(60));camera.up.set(0,1,0);camera.lookAt(focus);
 const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),aspect=width/height;renderer.setSize(width,height,false);const h=span/Math.max(1,aspect);camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function render(){if(!ready||disposed)return;limits();const mode=$('module').value,shot=shotAt(time),isMissile=mode==='missile',isHandler=mode==='handler'||mode==='sequence'&&shot.index===1,isRadar=mode==='radar'||mode==='sequence'&&shot.index===3;
 environment.foliage.visible=$('trees').checked;
 const state=helicopter.update(time);launcher.update(time);for(let i=0;i<2;i++){const s=missileState(time,i),m=projectiles[i];m.root.visible=s.flying;m.root.position.copy(s.position);m.root.quaternion.copy(s.quaternion);}
 let target=state.position.clone().add(new T.Vector3(-.4,1.8,0)),span=22;
 if(isMissile){target.set(.1,1.4,0);span=['nose','tail'].includes($('view').value)?2.4:5.7;design.root.position.set(0,1.4,0);design.root.rotation.x=Number($('roll').value)*Math.PI/180;design.setSection($('section').checked);design.setGrey($('grey').checked);}
 else if(isHandler){target.set(.25,1.16,0);span=2.7;room.update(time);}
 else if(mode==='launch'||mode==='sequence'&&[4,5].includes(shot.index)){target.set(10,20,-16);span=14;if(time>17.7){target.lerp(missileState(Math.min(time,20.45),0).position,smooth(17.7,19.3,time));span=20;}}
 else if(shot.index===7){target.set(1,12,0);span=41;}
 else if(shot.index===11&&mode==='sequence'){const pullback=smooth(30.9,34.6,time);target.lerp(new T.Vector3(9,12,-6),pullback);span=T.MathUtils.lerp(22,64,pullback);}
 else if(shot.index===0){span=36;target.y=21;}
 cameraAt(target,span,mode,shot);effects.update(time,camera,{visible:$('effects').checked&&!$('grey').checked});helicopter.setGrey($('grey').checked);launcher.setGrey($('grey').checked);projectiles.forEach(m=>m.setGrey($('grey').checked));
 $('radar').hidden=!isRadar;if(isRadar)radar.update(time);
 renderer.render(isMissile?benchScene:isHandler||isRadar?roomScene:scene,camera);
 $('shot-number').textContent=isMissile?'COMPONENT 01 · MISSILE':isHandler?'OVERSEAS RADIO ROOM':'SHOT '+String(shot.index+1).padStart(2,'0')+' / 12';
 $('shot-title').textContent=isMissile?($('section').checked?'Two plates through the cylinder':'Four fins · 90° joints'):shot.name;
 $('dialogue').textContent=isHandler?'“Your mission is to take out the central relay station.”':'';
 $('time').value=time;$('time-label').textContent=time.toFixed(2)+' s';$('roll-label').textContent=$('roll').value+'°';$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));
 for(const [i,b]of [...$('shots').children].entries())b.setAttribute('aria-current',String(!isMissile&&shot.index===i));
 $('status').textContent=isMissile?design.diagnostics().triangles+' triangles · native length 3.53 tiles · two continuous fin plates':'35-second sequence · two launches · one tail hit · survivable landing';
 window.introState={module:mode,time,playing,shot:shot.index,view:$('view').value,missile:design.diagnostics(),aircraft:{position:state.position.toArray(),damage:state.damage,settled:state.settled},loaded:launcher.missiles.map(m=>m.root.visible),activeMissiles:projectiles.map(m=>m.root.visible),resources:{...renderer.info.memory},trees:environment.trees.length};return window.introState;
}
function queue(){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;last=null;if(ready&&!disposed&&playing&&!document.hidden&&$('module').value!=='missile')frameId=requestAnimationFrame(tick);}
function tick(now){frameId=null;if(disposed||!playing||document.hidden)return;if(last!==null)time+=Math.min(.08,(now-last)/1000)*Number($('speed').value);last=now;const end=ranges[$('module').value][1];if(time>=end){time=end;playing=false;}render();if(playing)frameId=requestAnimationFrame(tick);}
function set(options={}){if(disposed)return;const oldMode=$('module').value;for(const [k,v]of Object.entries(options)){if(k==='time'&&Number.isFinite(v))time=v;else if(k==='playing')playing=!!v;else if($(k)?.type==='checkbox')$(k).checked=!!v;else if($(k)?.options&&[...$(k).options].some(o=>o.value===v))$(k).value=v;else if(k==='roll'&&Number.isFinite(v))$('roll').value=v;}
 if(oldMode!==$('module').value&&!Object.hasOwn(options,'time'))time=ranges[$('module').value][0];if($('module').value==='missile')playing=false;orbit=tilt=0;const result=render();queue();return result;}
function release(){if(released)return;released=true;modules.reverse().forEach(m=>m.dispose());for(const t of ownedTextures)if(!room||t!==henTextures[0])t.dispose();benchFloor.geometry.dispose();benchFloor.material.dispose();grid.geometry.dispose();grid.material.dispose();radar.dispose();suns.forEach(s=>s.shadow.dispose());renderer.dispose();window.introDisposed=true;}
function dispose(){if(disposed)return;disposed=true;window.introReady=false;abort.abort();observer?.disconnect();if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;if(!initializing)release();}
addEventListener('pagehide',dispose,{once:true});
try{
 const paths=[STRATEGIC_SITE_ATLAS,HELICOPTER_PAINT,HELICOPTER_GROUND,FOLIAGE_ATLAS,FIRE_ASSETS.smoke,FIRE_ASSETS.flame,HEN_PAINT,'../assets/characters/lowpoly-proof/hen-underlay-paint-v1.png','../assets/characters/lowpoly-proof/hen-tail-paint-v1.png'],loader=new T.TextureLoader();
 const results=await Promise.allSettled(paths.map(p=>loader.loadAsync(p)));for(const r of results)if(r.status==='fulfilled'){r.value.colorSpace=T.SRGBColorSpace;ownedTextures.push(r.value);}if(results.some(r=>r.status==='rejected'))throw Error('An intro paint sheet failed to load');if(disposed)throw Error('Study closed');
 const textures=results.map(r=>r.value),response=await fetch('./hen-10k-data.json',{signal:abort.signal});if(!response.ok)throw Error('Hen model failed to load');const data=await response.json();if(disposed)throw Error('Study closed');
 design=createSAMMissile(textures[0]);modules.push(design);benchScene.add(design.root);
 launcher=createIntroLauncher(textures[0]);modules.push(launcher);scene.add(launcher.root);
 helicopter=createIntroHelicopter(textures[1],textures[2]);modules.push(helicopter);scene.add(helicopter.root);
 environment=createIntroEnvironment(textures[0],textures[3]);modules.push(environment);scene.add(environment.root);
 projectiles=[0,1].map(()=>{const m=createSAMMissile(textures[0]);modules.push(m);scene.add(m.root);return m;});
 effects=createIntroEffects(textures[4],textures[5]);modules.push(effects);scene.add(effects.root);
 henTextures=textures.slice(6);room=createIntroRadioRoom(renderer,data,henTextures,textures[0]);modules.push(room);roomScene.add(room.root);
 for(const [i,s]of INTRO_SHOTS.entries()){const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0')+' '+s[2];b.onclick=()=>set({module:'sequence',time:s[0],playing:false});$('shots').append(b);}
 for(const id of ['module','view','effects','trees','grey','section','roll','speed'])$(id).addEventListener('input',()=>{if(id==='module'){time=ranges[$('module').value][0];playing=false;}orbit=tilt=0;render();queue();},{signal:abort.signal});
 $('play').onclick=()=>{if(time>=ranges[$('module').value][1])time=ranges[$('module').value][0];playing=!playing;render();queue();};$('restart').onclick=()=>set({time:ranges[$('module').value][0],playing:$('module').value!=='missile'});$('time').oninput=()=>set({time:Number($('time').value),playing:false});
 host.onpointerdown=e=>{if(e.target===renderer.domElement){host.setPointerCapture(e.pointerId);playing=false;queue();drag={x:e.clientX,y:e.clientY,orbit,tilt};render();}};host.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.006;tilt=drag.tilt+(e.clientY-drag.y)*.004;render();}};host.onpointerup=host.onpointercancel=()=>drag=null;
 document.addEventListener('visibilitychange',queue,{signal:abort.signal});observer=new ResizeObserver(render);observer.observe(host);ready=true;$('loading').hidden=true;window.introStudy={renderer,scene,camera,design,launcher,helicopter,environment,effects,room,projectiles,set,dispose};window.introReady=true;render();
 if(params.has('play')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)set({playing:true});
}catch(e){if(!disposed){$('loading').hidden=true;$('error').textContent=e.message;console.error(e);dispose();}}finally{initializing=false;if(disposed)release();}
