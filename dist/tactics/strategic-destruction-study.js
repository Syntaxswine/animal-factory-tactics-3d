import * as T from './vendor/three.module.js';
import {createStrategicSiteLibrary,STRATEGIC_SITE_ATLAS,STRATEGIC_SITES} from './strategic-sites.js';
import {createSiteDestruction,SITE_DESTRUCTION_DURATION} from './strategic-site-destruction.js';
import {loadPaintedBlastTextures} from './painted-blast-effects.js';
import {createStrategicDestructionEffects} from './strategic-destruction-effects.js';
const $=id=>document.getElementById(id),stage=$('stage');
async function start(){
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0x39433a);
 const camera=new T.OrthographicCamera(-10,10,10,-10,.1,100),sceneLight=new T.HemisphereLight(0xfff4dc,0x616e5f,1.9);scene.add(sceneLight);
 const sun=new T.DirectionalLight(0xffebc9,2.5);sun.position.set(-8,17,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.1,far:60});sun.shadow.bias=-.00015;sun.shadow.normalBias=.015;scene.add(sun);
 const fill=new T.DirectionalLight(0xe0eeff,.7);fill.position.set(6,6,-8);scene.add(fill);
 const loader=new T.TextureLoader(),loaded=await Promise.allSettled([loader.loadAsync(STRATEGIC_SITE_ATLAS),loadPaintedBlastTextures(loader)]);
 if(loaded.some(r=>r.status==='rejected')){for(const r of loaded)if(r.status==='fulfilled')for(const t of [r.value].flat())t.dispose();renderer.dispose();renderer.domElement.remove();throw loaded.find(r=>r.status==='rejected').reason;}
 const [atlas,effectTextures]=loaded.map(r=>r.value);atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const library=createStrategicSiteLibrary(atlas),floor=new T.Mesh(new T.PlaneGeometry(90,90),new T.MeshStandardMaterial({color:0x66745b,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
 const points=[];for(let i=-4;i<=4;i++)points.push(new T.Vector3(i,.246,-4),new T.Vector3(i,.246,4),new T.Vector3(-4,.246,i),new T.Vector3(4,.246,i));
 const grid=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xf0dfac,transparent:true,opacity:.32}));scene.add(grid);
 const params=new URLSearchParams(location.search);for(const id of ['site','mode','view','scale'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
 $('effects').checked=params.get('effects')==='1';
 let asset,effects,bounds,playing=false,time=0,azimuth=.66,elevation=.50,zoom=1,disposed=false,frame=0,last=0;
 const focus=new T.Vector3();
 function sync(){const q=new URLSearchParams(location.search);for(const id of ['site','mode','view','scale'])q.set(id,$(id).value);q.set('effects',$('effects').checked?'1':'0');history.replaceState(null,'','?'+q);}
 function orient(){[azimuth,elevation]=({three:[.66,.50],front:[0,.16],side:[Math.PI/2,.16],rear:[Math.PI,.22],top:[0,1.55]})[$('view').value];zoom=1;}
 function rebuild(){
  asset?.dispose();effects?.dispose();asset=createSiteDestruction(library,$('site').value);effects=createStrategicDestructionEffects(effectTextures,$('site').value);scene.add(asset.root,effects.root);
  bounds=library.build($('site').value).bounds.union(library.build($('site').value,{state:'destroyed'}).bounds);bounds.expandByScalar(.55);bounds.getCenter(focus);
  $('panels').replaceChildren(...asset.keyframes.map((k,i)=>{const panel=document.createElement('div');panel.className='panel';panel.innerHTML='<strong>'+String(i+1).padStart(2,'0')+' / '+k.title+'</strong><span class="stamp">'+k.time.toFixed(2)+' s</span><p>'+k.note+'</p>';panel.onclick=()=>{time=k.time;playing=false;$('mode').value='motion';render();sync();};return panel;}));
  time=0;playing=false;sync();render();
 }
 function fit(w,h){
  const framed=bounds.clone();if($('effects').checked)framed.max.y=Math.max(framed.max.y,8.4);framed.getCenter(focus);
  camera.position.copy(focus).add(new T.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(25));camera.lookAt(focus);camera.updateMatrixWorld();
  const inv=camera.matrixWorldInverse,viewBounds=new T.Box3();for(const x of [framed.min.x,framed.max.x])for(const y of [framed.min.y,framed.max.y])for(const z of [framed.min.z,framed.max.z])viewBounds.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(inv));
  const size=viewBounds.getSize(new T.Vector3());let unit=Math.max(size.x/w,size.y/h)*1.18/zoom;
  if($('scale').value==='game')unit=Math.max(unit,1/45/zoom);
  camera.left=-w*unit/2;camera.right=w*unit/2;camera.top=h*unit/2;camera.bottom=-h*unit/2;camera.updateProjectionMatrix();
 }
 function draw(t,x,y,w,h){asset.apply(t);fit(w,h);effects.apply(t,camera,{visible:$('effects').checked});renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.render(scene,camera);}
 function render(){
  if(disposed||!asset)return;
  const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();renderer.setScissorTest(true);grid.visible=$('grid').checked;
  const board=$('mode').value==='board';stage.classList.toggle('motion',!board);
  if(board){const stageRect=stage.getBoundingClientRect();[...$('panels').children].forEach((el,i)=>{const b=el.getBoundingClientRect();draw(asset.keyframes[i].time,Math.round(b.left-stageRect.left),Math.round(h-(b.bottom-stageRect.top)),Math.floor(b.width),Math.floor(b.height));});asset.apply(time);effects.apply(time,camera,{visible:$('effects').checked});}else draw(time,0,0,w,h);
  $('time').value=String(time);$('clock').value=time.toFixed(2)+' s';$('play').textContent=playing?'Pause':'Play collapse';
  const key=asset.keyframes.filter(k=>k.time<=time).at(-1);$('caption').textContent=STRATEGIC_SITES.find(s=>s.id===$('site').value).name+' · '+(board?'Six keyframes':key.title);
  $('note').textContent=$('effects').checked?'Painted explosions → thick black smoke → revealed wreck. Turn effects off to inspect each falling piece.':'Exposed collapse · large pieces stay; smaller fragments land and fade like broken glass.';
 }
 $('site').onchange=rebuild;for(const id of ['mode','scale','grid','effects'])$(id).onchange=()=>{render();sync();};$('view').onchange=()=>{orient();render();sync();};
 $('time').oninput=()=>{playing=false;time=Number($('time').value);$('mode').value='motion';render();};
 $('play').onclick=()=>{if(time>=SITE_DESTRUCTION_DURATION)time=0;playing=!playing;$('mode').value='motion';render();sync();};$('reset').onclick=()=>{time=0;playing=false;render();};
 let drag=null;stage.addEventListener('pointerdown',e=>{if($('mode').value==='motion'){drag=[e.clientX,e.clientY,azimuth,elevation];stage.setPointerCapture(e.pointerId);}});stage.addEventListener('pointermove',e=>{if(drag){azimuth=drag[2]-(e.clientX-drag[0])*.006;elevation=Math.max(.08,Math.min(1.55,drag[3]+(e.clientY-drag[1])*.006));render();}});stage.addEventListener('pointerup',()=>drag=null);stage.addEventListener('pointercancel',()=>drag=null);stage.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom*Math.exp(-e.deltaY*.001)));render();},{passive:false});
 const resize=new ResizeObserver(render);resize.observe(stage);
 function tick(now){frame=requestAnimationFrame(tick);if(playing){time=Math.min(SITE_DESTRUCTION_DURATION,time+Math.min(.05,(now-last)/1000));if(time===SITE_DESTRUCTION_DURATION)playing=false;render();}last=now;}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();asset?.dispose();effects?.dispose();effectTextures.forEach(t=>t.dispose());library.dispose();atlas.dispose();floor.geometry.dispose();floor.material.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();}
 window.addEventListener('pagehide',dispose,{once:true});orient();rebuild();frame=requestAnimationFrame(tick);
 window.siteDestructionStudy={ready:true,scene,camera,renderer,library,select(id){$('site').value=id;rebuild();},at(t){time=Math.max(0,Math.min(SITE_DESTRUCTION_DURATION,t));playing=false;$('mode').value='motion';render();return asset.diagnostics();},view(v){$('view').value=v;orient();render();},board(){playing=false;$('mode').value='board';render();},diagnostics(){return {...asset.diagnostics(),effects:effects.diagnostics(),playing,mode:$('mode').value,drawCalls:renderer.info.render.calls};},dispose};
}
start().catch(error=>{$('error').textContent='Unable to load the destruction study: '+error.message;console.error(error);});
