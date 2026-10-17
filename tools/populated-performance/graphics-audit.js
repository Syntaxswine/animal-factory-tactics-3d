import * as T from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {createWeaponModel} from './weapon-models.js';
import {DaylightRig} from './daylight-rig.js';
import {LightRenderer} from './light-renderer.js';
import {createConnectedGroundSkin,paintGroundRegion,releaseGroundPaint} from './biome-connected-ground.js';
import {createGroundComposition} from './biome-ground-composition.js';
import {tutorialFoliagePlan} from './biome-terrain-plan.js';
const params=new URLSearchParams(location.search);
if(location.pathname.startsWith('/diagnose-'))await import('./gfx-diagnostics.js');
const status=document.querySelector('#status'),renderer=new T.WebGLRenderer({antialias:false,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1200,700);renderer.info.autoReset=false;document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-9,9,5.25,-5.25,.1,100);camera.position.set(10,12,16);camera.lookAt(0,.6,0);camera.updateMatrixWorld();scene.background=new T.Color(0x3c4736);
const daylight=new DaylightRig(scene,renderer),passes=new LightRenderer(),loader=new T.TextureLoader(),owned=[],lights=[],results=[],errors=[];
addEventListener('error',e=>errors.push(e.message));
const consoleError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));consoleError(...args);};
const floor=new T.Mesh(new T.PlaneGeometry(32,32),new T.MeshStandardMaterial({color:0x7e8658,roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
for(let i=0;i<8;i++){const light=i%2?new T.SpotLight(0xffdca8,7,30,Math.PI/3,.2,0):new T.PointLight(0xffecc4,2.8,30,0);light.castShadow=true;light.shadow.mapSize.set(256,256);light.position.set((i%4-1.5)*3,5,Math.floor(i/4)*4-2);if(light.target){light.target.position.set(0,0,0);scene.add(light.target);}scene.add(light);lights.push(light);}
const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function render(time,count,turn=0){renderer.info.reset();lights.forEach((l,i)=>l.visible=i<count);camera.position.set(16*Math.sin(.55+turn),12,16*Math.cos(.55+turn));camera.lookAt(0,.6,0);camera.updateMatrixWorld();daylight.update(time,camera,0,true);scene.updateMatrixWorld(true);for(const o of owned)o.worker.skeleton.update();passes.render(renderer,scene,camera,lights);}
try{
 // The game's WebGL canvas is composited over a 2D backdrop. A fullscreen
 // opaque blit must not turn empty pixels or cutaway coverage into solid color.
 const alphaScene=new T.Scene(),alphaCamera=new T.OrthographicCamera(-2,2,2,-2,.1,10),alphaMesh=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({color:0x56789a,transparent:true,opacity:.37}));alphaCamera.position.z=2;alphaScene.add(alphaMesh);renderer.setClearColor(0,0);
 const pixelAlpha=()=>{const gl=renderer.getContext(),center=new Uint8Array(4),corner=new Uint8Array(4);gl.readPixels(600,350,1,1,gl.RGBA,gl.UNSIGNED_BYTE,center);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,corner);return {center:center[3],corner:corner[3],centerRGBA:[...center],cornerRGBA:[...corner]};};
 const alphaSamples=[];for(const [color,opacity]of [[0x56789a,.37],[0x102030,.05],[0xffffff,.8],[0xff2010,.37]]){
  alphaMesh.material.color.set(color);alphaMesh.material.opacity=opacity;renderer.render(alphaScene,alphaCamera);const reference=pixelAlpha();passes.render(renderer,alphaScene,alphaCamera,[]);const composite=pixelAlpha();alphaSamples.push({color,opacity,reference,composite});
  if(composite.cornerRGBA.some(v=>v!==0)||composite.centerRGBA.some((v,i)=>Math.abs(v-reference.centerRGBA[i])>1))throw Error('Fullscreen compositor changed fractional-alpha RGBA: '+JSON.stringify(alphaSamples.at(-1)));
 }
 const alphaParity={reference:alphaSamples[0].reference,composite:alphaSamples[0].composite,samples:alphaSamples};alphaMesh.geometry.dispose();alphaMesh.material.dispose();
 if(params.has('alpha-only')){
  const response=await fetch('/results/'+(params.get('run')||'alpha-colors'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alphaParity})});if(!response.ok)throw Error('Cannot save alpha audit');status.textContent='Complete · '+JSON.stringify(alphaParity);
 }else{
 const closeupsOnly=params.has('closeups');
 for(const [index,profile]of ANIMAL_MOTION_CATALOG.entries()){
  if(closeupsOnly&&!['horse','hen'].includes(profile.id))continue;
  for(const [column,outfit]of ['normal','red-hats'].entries()){
   if(profile.id==='pig-foreman'&&column)continue;
   const data=await(await fetch('./'+profile.file)).json(),worker=profile.create(data),paint=await createAnimalPaint(renderer,worker,profile,loader,outfit,true),cap=column?await createRedHatCap(renderer,worker,profile,loader,true):null;
   worker.parts.forEach(p=>p.material=paint.material);paint.material.name=profile.id+' '+outfit;
   const equipment=profile.unarmed?null:createWeaponModel(index%2?'rifle':'pistol');if(equipment)worker.equipWeapon(equipment);
   if(closeupsOnly&&equipment)worker.pose('carry');
   const root=new T.Group();root.name=paint.material.name;root.add(worker.root);root.position.set((index%6-2.5)*2.1,0,(Math.floor(index/6)*2+column-1.5)*2.1);scene.add(root);owned.push({worker,paint,cap,equipment,root});status.textContent='Loaded '+owned.length+' painted models';await yieldFrame();
  }
 }
 if(closeupsOnly){
  owned.forEach(o=>o.root.visible=false);camera.zoom=3.4;camera.updateProjectionMatrix();const closeups=[];
  for(const o of owned){o.root.visible=true;o.root.position.set(0,0,0);render(480,3);closeups.push({name:o.root.name,image:renderer.domElement.toDataURL(),glError:renderer.getContext().getError(),passes:passes.lastPassSizes});o.root.visible=false;await yieldFrame();}
  const response=await fetch('/results/'+(params.get('run')||'graphics-closeups'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({closeups,alphaParity,errors,contextLost:renderer.getContext().isContextLost()})});if(!response.ok)throw Error('Cannot save close-ups');status.textContent='Complete · '+closeups.length+' painted close-ups';
 }else{
 // Unlit transparent coverage must attenuate extra lighting behind it, while
 // opaque masks remain opaque. Include a custom shader as well as BasicMaterial.
 const masks=[new T.Mesh(new T.PlaneGeometry(1.5,3),new T.MeshBasicMaterial({color:0xc8688d,transparent:true,opacity:.55,depthWrite:false})),new T.Mesh(new T.PlaneGeometry(1.2,2.5),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'void main(){gl_FragColor=vec4(0.1,0.2,0.3,0.7);}'}))];
 masks.forEach((m,i)=>{m.position.set(i?2:-1,1.3,3);m.lookAt(camera.position);scene.add(m);});
 const readPixels=()=>{const gl=renderer.getContext(),data=new Uint8Array(1200*700*4);gl.readPixels(0,0,1200,700,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
 render(480,3);const direct=readPixels(),directImage=renderer.domElement.toDataURL(),savedLimit=renderer.capabilities.maxTextures;renderer.capabilities.maxTextures=14;render(480,3);const split=readPixels(),splitImage=renderer.domElement.toDataURL(),splitPasses=passes.lastPassSizes;renderer.capabilities.maxTextures=savedLimit;let maxDifference=0,totalDifference=0,changedChannels=0;for(let i=0;i<direct.length;i++){const delta=Math.abs(direct[i]-split[i]);maxDifference=Math.max(maxDifference,delta);totalDifference+=delta;if(delta)changedChannels++;}const passParity={splitPasses,maxDifference,meanDifference:totalDifference/direct.length,changedChannels,directImage,splitImage};
 masks.forEach(m=>{m.removeFromParent();m.geometry.dispose();m.material.dispose();});
 for(const time of (params.has('quick')?[480]:[480,1080,0]))for(const count of [0,2,3,4,5,8]){render(time,count,count===5?.3:0);const gl=renderer.getContext();results.push({time,count,passes:passes.lastPassSizes,glError:gl.getError(),textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries});await yieldFrame();}
 render(480,3);const image=renderer.domElement.toDataURL();
 // A genuinely moving caster and searchlight; then switch off and remove a light.
 owned[0].root.position.x+=.3;lights[1].target.position.x=4;render(1080,5,.7);lights[7].removeFromParent();lights[7].visible=false;render(0,3);
 const restoreCounts=[],baseFloor=floor.material;
 for(let cycle=0;cycle<3;cycle++){
  const plan={width:24,depth:24,blockedAt:()=>true,heightAt:()=>0},skin=createConnectedGroundSkin(plan,'temperate'),mat=floor.material.clone();skin.attach(mat,{index:0});floor.material=mat;
  render(480,3);await skin.whenReady();render(480,3);restoreCounts.push({cycle,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,error:renderer.getContext().getError()});
  skin.dispose();mat.dispose();floor.material=baseFloor;render(480,3);
 }
 // Repaint the exported sheets independently before refreshing their provenance.
 const manifest=await(await fetch('../assets/environment/connected-ground/manifest.json')).json(),map=await(await fetch('./sector-library/tutorial-step-1/rough-plateau.json')).json(),exports=[];
 for(const asset of manifest.assets){const composition=createGroundComposition(tutorialFoliagePlan(map),asset.family,manifest.seed),canvas=document.createElement('canvas');try{paintGroundRegion(composition,{x:asset.origin[0],z:asset.origin[1],width:8,depth:8,pixelsPerTile:64},canvas);exports.push({family:asset.family,file:asset.file,image:canvas.toDataURL()});}finally{releaseGroundPaint(composition);}}
 const lightTimings=[];if(params.has('perf'))for(const count of [3,4,8]){for(let i=0;i<12;i++){render(480,count);await yieldFrame();}const cpu=[];for(let i=0;i<30;i++){const at=performance.now();render(480,count);cpu.push(performance.now()-at);await yieldFrame();}lightTimings.push({count,passes:passes.lastPassSizes,cpu,calls:renderer.info.render.calls,memory:{...renderer.info.memory},glError:renderer.getContext().getError()});}
 const report={alphaParity,passParity,results,restoreCounts,image,exports,lightTimings,graphics:globalThis.gfxDiagnostic?.report(),errors,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),contextLost:renderer.getContext().isContextLost()};
 const response=await fetch('/results/'+(params.get('run')||'graphics-audit'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error('Cannot save audit');status.textContent='Complete · '+owned.length+' models · '+results.length+' lighting cases · three ground reload cycles';
 }
 }
}catch(error){status.textContent='Failed: '+error.stack;throw error;}
finally{for(const o of owned){o.root.removeFromParent();o.cap?.dispose();o.equipment?.dispose();o.paint.dispose();o.worker.dispose();}for(const l of lights){l.shadow.dispose();l.removeFromParent();l.target?.removeFromParent();}floor.geometry.dispose();floor.material.dispose();daylight.dispose();passes.dispose();renderer.dispose();}
