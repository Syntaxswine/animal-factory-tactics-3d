import {PLAY_MINUTES_PER_SECOND} from './game-clock.js';
import {LightRenderer} from './light-renderer.js';
import {DIMENSIONS} from './hybrid-world.js';
import * as T from './vendor/three.module.js';
import {createFurnitureLibrary,animateFurnitureFire} from './painted-furniture.js';
import {PAINTED_ATLAS} from './painted-environment-scene.js';
import {CARGO_ATLAS} from './painted-cargo.js';
import {LIGHT_FORMS,fixturePlacement,sampledEmitters,lightEnabled,LIGHT_RANGE,SPOT_ANGLE,SPOT_PENUMBRA} from './light-sources.js';
import {terrainKnown} from './battle-visibility.js';
export class LightingScene {
 constructor(scene,loader,changed,error){
  this.scene=scene;this.passes=new LightRenderer();this.models=[];this.disposed=false;
  this.ready=Promise.all([loader.loadAsync(PAINTED_ATLAS),loader.loadAsync(CARGO_ATLAS)]).then(textures=>{
   if(this.disposed){textures.forEach(t=>t.dispose());return;}this.textures=textures;for(const t of textures)t.colorSpace=T.SRGBColorSpace;
   this.library=createFurnitureLibrary(...textures);changed();
  }).catch(e=>{if(!this.disposed)error(e);});
 }
 update(map,level,minutes,seconds=0,editor=false){
  if(!this.library)return;
  const props=(map?.props||[]).filter(p=>LIGHT_FORMS[p.kind]&&(p.z||0)<=level&&(editor||terrainKnown(map,p.z?`${p.x},${p.y},${p.z}`:`${p.x},${p.y}`)));
  const signature=JSON.stringify(props);if(signature!==this.signature){
   this.clear();this.signature=signature;
   for(const prop of props){
    const built=this.library.build(prop.kind),root=built.root,center=fixturePlacement(prop),glows=[],owned=[];
    root.position.set(center.x,center.z*DIMENSIONS.floorSpacing,center.y);root.rotation.y=prop.rotated?-Math.PI/2:0;this.scene.add(root);
    root.traverse(mesh=>{if(!mesh.isMesh)return;const name=mesh.material.name;
     if(name.includes('flame')){const source=mesh.material;mesh.material=new T.MeshBasicMaterial({map:source.map,color:source.color.clone(),vertexColors:source.vertexColors});mesh.material.userData={...source.userData};mesh.userData.noShadow=true;mesh.castShadow=false;owned.push(mesh.material);}
     else if(name==='unlit-glass'||name==='pleated-linen'){
      mesh.material=mesh.material.clone();mesh.userData.noShadow=true;mesh.castShadow=false;glows.push(mesh.material);owned.push(mesh.material);
     }
    });
    const lamps=sampledEmitters(prop,minutes,DIMENSIONS.floorSpacing).map(source=>{
     const lamp=LIGHT_FORMS[prop.kind].spot?new T.SpotLight(source.color,2.8,LIGHT_RANGE,source.angle??SPOT_ANGLE,SPOT_PENUMBRA,0):new T.PointLight(source.color,2.8,LIGHT_RANGE,0);if(lamp.isSpotLight)this.scene.add(lamp.target);lamp.position.set(source.x,source.h,source.y);lamp.castShadow=true;
     lamp.shadow.mapSize.set(512,512);lamp.shadow.camera.near=.08;lamp.shadow.camera.far=LIGHT_RANGE;lamp.shadow.bias=-.0005;lamp.shadow.normalBias=.035;this.scene.add(lamp);return lamp;
    });this.models.push({prop,root,lamps,glows,owned});
   }
  }
  this.animated=false;
  for(const model of this.models){const enabled=lightEnabled(model.prop,minutes),fire=LIGHT_FORMS[model.prop.kind].fire;
   const sources=sampledEmitters(model.prop,minutes+(editor&&seconds!==null?seconds*PLAY_MINUTES_PER_SECOND:0),DIMENSIONS.floorSpacing);
   for(const [index,lamp]of model.lamps.entries()){lamp.visible=enabled;if(lamp.isSpotLight){
    const source=sources[index],aim=source.aim;lamp.position.set(source.x,source.h,source.y);
    lamp.target.position.set(aim.x,aim.h,aim.y);lamp.target.updateMatrixWorld();
    (model.root.getObjectByName('spot-head')||model.root.getObjectByName('spotlight-head'))?.lookAt(lamp.target.position);
    if(enabled&&editor&&seconds!==null&&(model.prop.lightTargets?.length||0)>1)this.animated=true;
   }}
   for(const material of model.glows){material.emissive.setHex(fire?0xff8c28:0xffd895);material.emissiveIntensity=enabled?(fire?.7:.35):0;}
   const flames=model.root.getObjectByName('flames');if(flames)flames.visible=enabled;
   if(fire&&enabled){this.animated=seconds!==null;animateFurnitureFire(model.root,seconds);}
  }
 }
 render(renderer,camera){const lamps=this.models.flatMap(m=>m.lamps),frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));for(const lamp of lamps)lamp.visible=lamp.visible&&frustum.intersectsSphere(new T.Sphere(lamp.position,LIGHT_RANGE));this.passes.render(renderer,this.scene,camera,lamps);}
 clear(){for(const m of this.models){m.root.removeFromParent();for(const lamp of m.lamps){lamp.shadow.dispose();lamp.target?.removeFromParent();lamp.removeFromParent();}m.owned.forEach(m=>m.dispose());}this.models=[];}
 dispose(){this.passes.dispose();this.disposed=true;this.clear();this.library?.dispose();this.textures?.forEach(t=>t.dispose());}
}
