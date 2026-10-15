import * as T from './vendor/three.module.js';
import {biomeFixture,biomeTreeMixFixture} from './biome-fixture.js';
import {foliageContextFixture,FOLIAGE_CONTEXT_VIEWS} from './foliage-context-fixture.js';
import {foliageDensityFixture,FOLIAGE_DENSITY_FRAMES,FOLIAGE_DENSITIES} from './foliage-density-fixture.js';
import {BiomeScene} from './biome-scene.js';
import {BIOME_FAMILIES,BIOME_PLANTS} from './biome-foliage-data.js';
const q=new URLSearchParams(location.search),mode=q.get('view')||'trees',angle=q.get('angle')||'normal',family=BIOME_FAMILIES[q.get('family')]?q.get('family'):'temperate';
const densityStudy=mode==='density',density=FOLIAGE_DENSITIES.includes(Number(q.get('density')))?Number(q.get('density')):65,growth=q.get('growth')==='thicket'?'thicket':'woodland',frame=Object.hasOwn(FOLIAGE_DENSITY_FRAMES,q.get('frame'))?q.get('frame'):'clearing',context=densityStudy?FOLIAGE_DENSITY_FRAMES[frame]:FOLIAGE_CONTEXT_VIEWS[mode];
for(const id of ['density-control','growth-control','frame-control'])document.getElementById(id).hidden=!densityStudy;
for(const [id,value] of Object.entries({density,growth,frame})){const input=document.getElementById(id);input.value=value;input.onchange=()=>{q.set(id,input.value);location.search=q;};}
document.getElementById('family-control').hidden=mode!=='trees'&&!context;
document.getElementById('scale-control').hidden=mode!=='trees';
for(const id of ['view','angle','grid','family','scale']){const input=document.getElementById(id);if(id==='grid')input.checked=q.get('grid')==='1';else input.value=id==='view'?mode:id==='family'?family:id==='scale'?(q.get('scale')==='close'?'close':'grove'):angle;input.onchange=()=>{q.set(id,id==='grid'?Number(input.checked):input.value);location.search=q;};}
const map=densityStudy?foliageDensityFixture(family,density,growth):context?foliageContextFixture(family,mode):mode==='trees'?biomeTreeMixFixture(family):biomeFixture(),renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(960,640);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.info.autoReset=false;document.getElementById('scene').append(renderer.domElement);
if(densityStudy){
 document.querySelector('h1').textContent='Woodland density';
 document.querySelector('header p').textContent='96 × 96 tile fill · one seed · the map maker’s area brush';
 document.getElementById('editor-link').href='editor-3d.html?'+new URLSearchParams({editing:'1',study:'foliage-density',family,density,growth});
 document.getElementById('editor-link').textContent='Open this fill in the editor →';
}
const scene=new T.Scene();scene.background=new T.Color('#72794a');scene.add(new T.HemisphereLight(0xfff8e6,0x54634b,1.7));const sun=new T.DirectionalLight(0xfff1d2,2.4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.03;scene.add(sun,sun.target);
// Mixed and dense retain the coder's exact seed, fixture, lights and cameras.
const views={trees:q.get('scale')==='close'?[120,1.1,125,30]:[120,1.5,119,15],mixed:[123,0,117,14],dense:[153,1.8,102,32],temperate:[107,1.8,104,32],jungle:[91,1.8,104,32],snow:[123,1.8,104,32],dry:[139,1.8,104,32],open:[123,0,125,24],path:[107,1.2,104,52]},v=context?[...context.focus,context.ppu]:views[mode]||views.dense,focus=new T.Vector3(...v.slice(0,3)),ppu=v[3],el=angle==='high'?1.2:.61,az=angle==='reverse'?3.9:.75,camera=new T.OrthographicCamera(-480/ppu,480/ppu,320/ppu,-320/ppu,1,1100);
camera.position.copy(focus).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(550));camera.lookAt(focus);camera.updateMatrixWorld();sun.position.copy(focus).add(new T.Vector3(-100,180,90));sun.target.position.copy(focus);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:500});sun.shadow.camera.updateProjectionMatrix();
let grid,horse,horsePaint,horseAtlas;
if(q.get('grid')==='1'){grid=new T.GridHelper(240,240,0xddd5b7,0xa5ac83);grid.position.set(119.5,.04,119.5);grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);}
const biomes=new BiomeScene(scene,new T.TextureLoader(),()=>{},e=>document.getElementById('status').textContent=e.message);biomes.rebuild(map,null,2,{editor:true});await biomes.loading;biomes.rebuild(map,null,2,{editor:true});
if(context){
 const [{createLightHorse,LIGHT_ATLAS},{createModelPaint,MODEL_PAINT}]=await Promise.all([import('./horse-light-model.js'),import('./horse-model-paint.js')]),loader=new T.TextureLoader();
 const [data,atlas,paint]=await Promise.all([fetch('./horse-10k-data.json').then(r=>{if(!r.ok)throw Error('Horse reference failed');return r.json();}),loader.loadAsync(LIGHT_ATLAS),loader.loadAsync(MODEL_PAINT)]);
 horseAtlas=atlas;horse=createLightHorse(data,atlas);horsePaint=createModelPaint(renderer,horse,paint);horse.pose('neutral',45);horse.root.position.fromArray(context.horse);
 for(const p of horse.parts){p.material=horsePaint.material;p.castShadow=p.receiveShadow=true;}scene.add(horse.root);
 document.getElementById('context-note').textContent=(densityStudy?`${density}% ${growth==='woodland'?'open woodland':'impassable thicket'} · three-tile cross paths, a one-tile side path and a clearing. `:mode==='strip'?'A single tile of dense growth; the horse stands in the adjacent clear tile. ':'An irregular copse around a clear route; mixed trees use the ordinary shared placement rules. ')+'Horse at native size · '+ppu+' px/tile · level ground.';
 if(densityStudy)document.getElementById('context-note').append(document.createElement('br'),growth==='woodland'?'Density increases tree and grass sampling; it is not the percentage of land covered by crowns. Tree positions stay stable as density rises.':'Thickets retain their sight screen and tree spacing at every density. This percentage changes decorative ground growth, not the number of thicket trees.');
}
const gl=renderer.getContext(),cpu=[],frames=[];
// Request the visible ground pages before waiting. A fixed delay followed by
// synchronous renders cannot receive worker paint replies during those renders.
biomes.update(camera,focus,ppu);
let paintTimeout;
try{await Promise.race([Promise.all(biomes.terrains.map(t=>t.groundSkin.whenReady())),new Promise((_,reject)=>{paintTimeout=setTimeout(()=>reject(Error('Ground paint did not finish within 90 seconds.')),90000);})]);}
catch(error){document.getElementById('status').textContent=error.message;throw error;}
finally{clearTimeout(paintTimeout);}
for(let i=0;i<100;i++){const at=performance.now();biomes.update(camera,focus,ppu);renderer.info.reset();const t=performance.now();renderer.render(scene,camera);if(i>30)cpu.push(performance.now()-t);gl.finish();if(i>30)frames.push(performance.now()-at);}
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)],tex=new Set(Object.values(biomes.textures));for(const l of biomes.layers.values())tex.add(l.texture);scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])for(const t of Object.values(m))if(t?.isTexture)tex.add(t);});let bytes=0;for(const t of tex)bytes+=(t.image?.width||0)*(t.image?.height||0)*(t.format===T.RedFormat?1:4)*(t.generateMipmaps?4/3:1);let finiteMaskBytes=0;scene.traverse(o=>finiteMaskBytes+=o.userData.ownedTextureBytes||0);bytes+=finiteMaskBytes;
const treeModels={};for(const tree of [...biomes.openTrees,...biomes.terrains.flatMap(t=>t.trees)])treeModels[tree.id]=(treeModels[tree.id]||0)+1;
if(mode==='trees'||mode==='copse'||densityStudy)document.getElementById('tree-models').textContent='Trees in this grove: '+Object.entries(treeModels).map(([id,count])=>BIOME_PLANTS[id].label+' × '+count).join(' · ');
window.foliageReview={map,biomes,renderer,scene,camera,focus,ppu,horse,result:{mode,angle,grid:q.get('grid')==='1',...(mode==='trees'||context?{family,treeModels}:{}),...(context?{horse:{nativeSize:true,position:horse.root.position.toArray(),scale:horse.root.scale.toArray()},context:'Ordinary saved map fields; no renderer-only placement or collision overrides.'}:{}),camera:{focus:focus.toArray(),ppu},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,estimatedTextureBytes:Math.round(bytes),finiteMaskBytes,renderSubmissionMedianMs:median(cpu),synchronizedFrameMedianMs:median(frames),frameNote:'CPU submission and gl.finish; not display FPS. Texture estimate includes owned finite masks; excludes driver/shadow targets.'}};
if(densityStudy)Object.assign(foliageReview.result,{density,growth,frame,fillSize:[96,96],paintedCells:Object.keys(map.foliage).length,trees:Object.values(treeModels).reduce((a,b)=>a+b,0),stats:biomes.stats()});
document.getElementById('metrics').textContent=JSON.stringify(foliageReview.result,null,2);document.getElementById('status').textContent='Ready';
addEventListener('pagehide',()=>{biomes.dispose();horsePaint?.dispose();horse?.skeleton.dispose();horse?.dispose();horseAtlas?.dispose();grid?.geometry.dispose();grid?.material.dispose();sun.shadow.dispose();renderer.dispose();},{once:true});
