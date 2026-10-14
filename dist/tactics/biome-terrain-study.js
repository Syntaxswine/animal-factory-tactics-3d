import * as T from './vendor/three.module.js';
import {BIOME_FAMILIES,BIOME_TEXTURES} from './biome-foliage-data.js';
import {configureBiomeTexture,createBiomeMaterials,createBiomeGround} from './biome-foliage-paint.js';
import {createBiomePlantFactory} from './biome-foliage-models.js';
import {OBSTACLE_ATLAS,BIOME_OBSTACLES} from './biome-obstacle-data.js';
import {createBiomeObstacleMaterials} from './biome-obstacle-paint.js';
import {tutorialFoliagePlan} from './biome-terrain-plan.js';
import {createBiomeTerrain} from './biome-terrain.js';
import {cliffMaterials} from './cliff-models.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';

const $=id=>document.getElementById(id),host=$('scene'),query=new URLSearchParams(location.search),abort=new AbortController();
const renderer=new T.WebGLRenderer({antialias:true}),scene=new T.Scene(),camera=new T.OrthographicCamera(),focus=new T.Vector3();
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x1e342e);renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xfff8e6,0x54634b,1.7));const sun=new T.DirectionalLight(0xfff1d2,2.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.03;scene.add(sun,sun.target);
const [cliffMaterial,unusedTurf]=cliffMaterials();unusedTurf.dispose();cliffMaterial.side=T.DoubleSide;
const overlayMaterial=new T.MeshBasicMaterial({color:0xdb6c43,transparent:true,opacity:.31,depthTest:false,depthWrite:false,side:T.DoubleSide});
const tileGrid=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xe7debf,transparent:true,opacity:.48,depthTest:false,depthWrite:false}));tileGrid.renderOrder=6;scene.add(tileGrid);
const textures={},grounds={};let plantMaterials,obstacleMaterials,plantFactory,plan,terrain,overlay,overlayGeometries=[],horse,horsePaint,horseAtlas,resize,disposed=false,az=.75,el=.61,ppu=1;
for(const id of ['biome','frame','view','seed','scale']){const v=query.get(id);if(v&&[...$(id).options].some(o=>o.value===v))$(id).value=v;}
for(const id of ['trees','blocked','grey','paint','grid','edges'])if(query.has(id))$(id).checked=query.get(id)!=='0';

function dispose(){
 if(disposed)return;disposed=true;abort.abort();resize?.disconnect();terrain?.dispose();plantFactory?.dispose();overlayGeometries.forEach(g=>g.dispose());overlayMaterial.dispose();cliffMaterial.dispose();tileGrid.geometry.dispose();tileGrid.material.dispose();
 for(const collection of [grounds,plantMaterials,obstacleMaterials])for(const m of Object.values(collection||{}))m.dispose();
 for(const [key,t]of Object.entries(textures))if(key!=='horse'||!horsePaint)t.dispose();horsePaint?.dispose();horse?.skeleton.dispose();horse?.dispose();horseAtlas?.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();window.biomeTerrainReady=false;window.biomeTerrainDisposed=true;
}
addEventListener('pagehide',dispose,{once:true});
function setView(){[az,el]=$('view').value==='top'?[0,Math.PI/2-.001]:$('view').value==='low'?[.70,.27]:[.75,.61];}
function setFrame(){
 const frame=$('frame').value,isOverview=frame==='overview',isGround=frame==='ground';focus.fromArray(isOverview?[119.5,2.12,119.5]:plan.focus[isGround||frame==='boundary'?'corridor':frame]);
 const reference=focus.clone();
 if(frame==='boundary'){
  let best=null,cost=Infinity;
  for(let z=0;z<plan.depth;z++)for(let x=0;x<plan.width;x++)if(!plan.blockedAt(x,z))for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])if(plan.blockedAt(x+dx,z+dz)&&plan.heightAt(x+dx,z+dz)===plan.heightAt(x,z)){
   const d=Math.hypot(x-focus.x,z-focus.z);if(d<cost){cost=d;best=[x,z,dx,dz];}
  }
  if(best){const [x,z,dx,dz]=best;focus.set(x+dx*.5,plan.heightAt(x,z),z+dz*.5);reference.set(x,plan.heightAt(x,z),z);}
 }
 if(isGround){const patches=terrain.groundSkin?.composition.features.filter(f=>f.kind==='deadfall')??[],nearest=patches.reduce((a,b)=>!a||Math.hypot(b.x-focus.x,b.z-focus.z)<Math.hypot(a.x-focus.x,a.z-focus.z)?b:a,null);if(nearest)focus.set(nearest.x,nearest.height,nearest.z);}
 const positions=[],cx=Math.floor(focus.x),cz=Math.floor(focus.z),radius=isGround?4:12,vertex=(x,z)=>{const ix=Math.floor(x+.5),iz=Math.floor(z+.5);return [x,(plan.heightAt(ix,iz)??0)+(plan.blockedAt(ix,iz)?terrain.fill.height(x,z):0)+.015,z];};
 for(let a=-radius;a<=radius;a++)for(let b=-radius;b<radius;b+=.25){positions.push(...vertex(cx+a-.5,cz+b-.5),...vertex(cx+a-.5,cz+b-.25),...vertex(cx+b-.5,cz+a-.5),...vertex(cx+b-.25,cz+a-.5));}
 tileGrid.geometry.dispose();tileGrid.geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));tileGrid.geometry.computeBoundingSphere();
 terrain.root.traverse(o=>{if(o.name==='Grouped ground cover')o.visible=!isGround;});
 $('trees').disabled=isGround;
 if(horse){horse.root.visible=!isOverview&&!isGround;horse.root.position.copy(reference);}
 const extent=isOverview?185:24;sun.position.copy(focus).add(new T.Vector3(-100,180,90));sun.target.position.copy(focus);Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:500});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
 render();
}
function rebuild(){
 if(disposed)return;terrain?.dispose();const family=$('biome').value;
 terrain=createBiomeTerrain(plan,family,{ground:$('grey').checked?plantMaterials.grey:grounds[family],cliff:cliffMaterial,plantMaterials,obstacleMaterials,plantFactory,grey:$('grey').checked,paintSeed:Number($('seed').value),groundSprites:$('paint').checked,edgeBlend:$('edges').checked,onPaintReady:render});scene.add(terrain.root);
 $('description').textContent=BIOME_FAMILIES[family].label+' · '+BIOME_OBSTACLES[family].reason;setFrame();
}
function render(){
 if(disposed||!terrain)return;const w=host.clientWidth,h=host.clientHeight,isOverview=$('frame').value==='overview';renderer.setSize(w,h,false);
 camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(550));camera.lookAt(focus);camera.near=1;camera.far=1100;camera.updateMatrixWorld();
 if(isOverview){const projected=new T.Box3();for(const x of [-1,240])for(const z of [-1,240])for(const y of [0,12])projected.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));const size=projected.getSize(new T.Vector3());ppu=Math.min(w/(size.x+14),h/(size.y+14));}else ppu=$('scale').value==='game'?32:$('frame').value==='ground'?Math.min(w/15,h/9):Math.min(w/23,h/13.8);
 camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.updateProjectionMatrix();overlay.visible=$('blocked').checked;tileGrid.visible=$('grid').checked&&!isOverview;terrain.groundSkin?.setEnabled($('paint').checked);terrain.update(camera,{focus,ppu,trees:$('trees').checked&&$('frame').value!=='ground'});renderer.info.reset();const started=performance.now();renderer.render(scene,camera);const cpuMs=performance.now()-started;
 const stats=terrain.stats;window.biomeTerrainState={biome:$('biome').value,frame:$('frame').value,view:$('view').value,scale:$('scale').value,edges:$('edges').checked,grey:$('grey').checked,blocked:$('blocked').checked,trees:$('trees').checked,paint:$('paint').checked,grid:$('grid').checked,seed:Number($('seed').value),ppu,stats,focus:focus.toArray(),render:{...renderer.info.render,cpuMs,includesShadows:true},resources:{...renderer.info.memory},source:plan.source};
 $('status').textContent=`240 × 240 tiles · ${stats.blockedCells.toLocaleString()} blocked cells · ${stats.trees.toLocaleString()} trees · ${isOverview?'whole map':Math.round(ppu)+' px/tile'+($('frame').value==='ground'?' · painted details · no added geometry':' · horse at native scale')} · ${stats.visibleChunks}/${stats.chunks} visible blocks · ${renderer.info.render.triangles.toLocaleString()} submitted triangles (including shadows)`;
}
async function start(){
 const loader=new T.TextureLoader(),jobs=[...Object.entries({...BIOME_TEXTURES,obstacles:OBSTACLE_ATLAS,horse:MODEL_PAINT}).map(([key,url])=>loader.loadAsync(url).then(t=>{if(disposed){t.dispose();throw Error('Study closed');}textures[key]=configureBiomeTexture(t);})),loader.loadAsync(LIGHT_ATLAS).then(t=>{if(disposed){t.dispose();throw Error('Study closed');}horseAtlas=t;}),fetch('./horse-10k-data.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Horse reference failed');return r.json();}),fetch('./sector-library/tutorial-step-1/rough-plateau.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Tutorial terrain failed');return r.json();})];
 const loaded=await Promise.allSettled(jobs),failure=loaded.find(r=>r.status==='rejected');if(failure)throw failure.reason;if(disposed)return;
 plan=tutorialFoliagePlan(loaded.at(-1).value);plantMaterials=createBiomeMaterials(textures);obstacleMaterials=createBiomeObstacleMaterials(textures.obstacles);plantFactory=createBiomePlantFactory(plantMaterials);for(const key of Object.keys(BIOME_FAMILIES))grounds[key]=createBiomeGround(textures.ground,BIOME_FAMILIES[key].ground);
 overlay=new T.Group();const blocks=new Map();for(const [x,z]of plan.cells){const key=Math.floor(x/24)+','+Math.floor(z/24);if(!blocks.has(key))blocks.set(key,[]);const positions=blocks.get(key),y=plan.heightAt(x,z)+.03;positions.push(x-.5,y,z-.5,x-.5,y,z+.5,x+.5,y,z-.5,x+.5,y,z-.5,x-.5,y,z+.5,x+.5,y,z+.5);}for(const positions of blocks.values()){const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeBoundingSphere();overlayGeometries.push(g);const m=new T.Mesh(g,overlayMaterial);m.renderOrder=5;overlay.add(m);}scene.add(overlay);
 horse=createLightHorse(loaded.at(-2).value,horseAtlas);horsePaint=createModelPaint(renderer,horse,textures.horse);horse.pose('neutral',45);for(const p of horse.parts){p.material=horsePaint.material;p.castShadow=true;}scene.add(horse.root);
 for(const id of ['biome','grey','seed','edges'])$(id).addEventListener('change',rebuild,{signal:abort.signal});$('scale').addEventListener('change',render,{signal:abort.signal});$('grid').addEventListener('change',render,{signal:abort.signal});$('paint').addEventListener('change',render,{signal:abort.signal});$('frame').addEventListener('change',setFrame,{signal:abort.signal});$('view').addEventListener('change',()=>{setView();render();},{signal:abort.signal});$('blocked').addEventListener('change',render,{signal:abort.signal});$('trees').addEventListener('change',()=>{render();},{signal:abort.signal});$('reset').addEventListener('click',()=>{$('view').value='three';setView();render();},{signal:abort.signal});
 let pointer;const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointer=[e.pointerId,e.clientX,e.clientY];},{signal:abort.signal});canvas.addEventListener('pointermove',e=>{if(pointer?.[0]!==e.pointerId)return;az-=(e.clientX-pointer[1])*.006;el=T.MathUtils.clamp(el+(e.clientY-pointer[2])*.006,.12,Math.PI/2-.001);pointer=[e.pointerId,e.clientX,e.clientY];render();},{signal:abort.signal});for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>pointer=null,{signal:abort.signal});
 resize=new ResizeObserver(render);resize.observe(host);setView();rebuild();window.biomeTerrainStudy={renderer,scene,camera,textures,plantMaterials,obstacleMaterials,grounds,plantFactory,plan,get terrain(){return terrain;},render,dispose,set(options){for(const [key,value]of Object.entries(options)){const node=$(key);if(!node)throw Error('Unknown study option: '+key);if(node.type==='checkbox')node.checked=!!value;else{if(![...node.options].some(o=>o.value===String(value)))throw Error('Invalid study option');node.value=String(value);}}setView();if('biome'in options||'grey'in options||'seed'in options||'edges'in options)rebuild();else{setFrame();}return window.biomeTerrainState;}};window.biomeTerrainReady=true;
}
start().catch(e=>{$('error').textContent=e?.message||'Could not load the landscape.';console.error(e);dispose();});
