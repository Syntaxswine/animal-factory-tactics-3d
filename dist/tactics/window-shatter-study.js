import * as T from './vendor/three.module.js';
import {createWindowShatter,WINDOW_TYPES,SHATTER_DURATION} from './window-shatter.js';
import {DIMENSIONS as D} from './hybrid-world.js';
import {surfacePixels} from './hybrid-materials.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
for(const id of ['kind','view','scale','direction','speed'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x303a33);renderer.outputColorSpace=T.SRGBColorSpace;$('scene').prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(),sun=new T.DirectionalLight(0xffedd2,2.1);sun.position.set(-3,7,5);scene.add(sun,new T.HemisphereLight(0xd2e4e8,0x66644a,2));
const ground=new T.Mesh(new T.PlaneGeometry(40,30),new T.MeshStandardMaterial({color:0x8b8866,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.005;scene.add(ground);
const grid=new T.GridHelper(30,30,0x787658,0x939071);grid.position.y=-.003;grid.material.transparent=true;grid.material.opacity=.2;scene.add(grid);
const materials=new Map(),wallGeometry=new T.BoxGeometry(1,1,1),frameMaterial=new T.MeshStandardMaterial({color:0x514f3c,roughness:.85});
for(const kind of WINDOW_TYPES){const form=kind==='window-brick'?'brick':kind==='window-corrugated'?'metal':'concrete',p=surfacePixels(form,128),texture=new T.DataTexture(p.data,p.width,p.height);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.needsUpdate=true;materials.set(kind,new T.MeshStandardMaterial({map:texture,roughness:.94}));}
let display=new T.Group(),windows=[],labels=[],time=-1,playing=false,last=performance.now();scene.add(display);
const audio=new Audio('../assets/audio/glass-smash-rubberduck-cc0.ogg');audio.preload='auto';audio.volume=.65;
audio.addEventListener('error',()=>{$('audio-status').textContent='Sound could not load; visual playback remains available.';});
function stopAudio(){audio.pause();audio.currentTime=0;}
function box(parent,material,x,y,z,w,h,d){const mesh=new T.Mesh(wallGeometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}
function rebuild(){stopAudio();for(const w of windows)w.dispose();display.removeFromParent();display=new T.Group();scene.add(display);windows=[];labels=[];$('labels').replaceChildren();
 const kinds=$('kind').value==='all'?WINDOW_TYPES:[$('kind').value];
 kinds.forEach((kind,i)=>{const root=new T.Group(),x=(i-(kinds.length-1)/2)*2.6;root.position.x=x;display.add(root);const mat=materials.get(kind);
  box(root,mat,0,D.windowBottom/2,0,1,D.windowBottom,D.wallThickness);box(root,mat,0,(D.wall+D.windowTop)/2,0,1,D.wall-D.windowTop,D.wallThickness);
  for(const side of [-1,1])box(root,mat,side*.625,1,0,.25,2,D.wallThickness);
  for(const y of [D.windowBottom+.0125,D.windowTop-.0125])box(root,frameMaterial,0,y,0,1,.025,.18);
  for(const side of [-1,1])box(root,frameMaterial,side*.4875,(D.windowTop+D.windowBottom)/2,0,.025,D.windowTop-D.windowBottom,.18);
  const window=createWindowShatter({kind,seed:17+i*29,direction:Number($('direction').value)});root.add(window.group);windows.push(window);
  const label=document.createElement('span');label.className='label';label.textContent=kind.slice(7);$('labels').append(label);labels.push({label,point:new T.Vector3(x,2.3,0)});
 });time=-1;playing=false;resize();render();}
function resize(){const host=$('scene'),w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const span=$('scale').value==='gameplay'?h/85:Math.max(3.25,($('kind').value==='all'?8.5:3)*h/w);camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.01;camera.far=100;
 const pos={three:[4,3.2,6],front:[0,2,7],rear:[-4,3.2,-6],side:[7,3.5,1.8]}[$('view').value];camera.position.set(...pos);camera.lookAt(0,.9,0);camera.updateProjectionMatrix();render();}
function render(){windows.forEach(w=>w.sample(time));renderer.render(scene,camera);for(const {label,point}of labels){const p=point.clone().project(camera);label.style.left=(p.x+1)*$('scene').clientWidth/2+'px';label.style.top=(1-p.y)*$('scene').clientHeight/2+'px';}
 $('time').value=Math.max(0,time);$('status').textContent=time<0?'Intact — ready to smash':`${time.toFixed(2)} s · ${time>=SHATTER_DURATION?'Glass cleared away; opening empty':windows.every(w=>w.diagnostics().settled)?'Landed glass fading away':time<.1?'Glass breaks free':'Shards falling clear of the wall'} · ${windows.length*70} shards`;
 $('pause').textContent=playing?'Pause':'Resume';}
$('smash').onclick=()=>{time=0;playing=true;last=performance.now();stopAudio();if($('sound').checked){audio.playbackRate=Number($('speed').value);audio.play().then(()=>{$('audio-status').textContent='CC0 glass smash · rubberduck';}).catch(()=>{$('audio-status').textContent='Sound playback was blocked; press Smash to retry.';});}render();};
$('pause').onclick=()=>{if(time<0||time>=SHATTER_DURATION)return;playing=!playing;last=performance.now();stopAudio();render();};
$('reset').onclick=()=>{playing=false;time=-1;stopAudio();render();};
$('time').oninput=()=>{playing=false;time=Number($('time').value);stopAudio();render();};
$('sound').onchange=()=>{if(!$('sound').checked)stopAudio();};
for(const id of ['kind','direction'])$(id).onchange=rebuild;
for(const id of ['view','scale'])$(id).onchange=resize;
$('speed').onchange=()=>{audio.playbackRate=Number($('speed').value);};
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;stopAudio();render();}});
window.windowShatterStudy={sample(t){playing=false;time=t;stopAudio();render();return this.diagnostics();},diagnostics(){return {time,playing,windows:windows.map(w=>{const {bounds,...d}=w.diagnostics();return {...d,minY:Math.min(...bounds.filter((_,i)=>i%3===1)),maxY:Math.max(...bounds.filter((_,i)=>i%3===1))};}),render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries},audio:{ready:audio.readyState,duration:audio.duration}};}};
function tick(now){if(playing){time=Math.min(SHATTER_DURATION,time+Math.min((now-last)/1000,.05)*Number($('speed').value));if(time>=SHATTER_DURATION)playing=false;render();}last=now;requestAnimationFrame(tick);}rebuild();requestAnimationFrame(tick);
