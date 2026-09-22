import {FOLIAGE_ATLAS,FOLIAGE_MATERIALS,paintFoliageMaterial} from './foliage-materials.js';
import * as T from './vendor/three.module.js';
import {buildWorld,DIMENSIONS as D} from './hybrid-world.js';
import {environmentVisuals} from './environment-visuals.js';
import {environmentGeometries} from './environment-geometry.js';
import {surfacePixels,materialKind} from './hybrid-materials.js';
import {BattleEnvironment,PAINTED_PROP_FORMS,cargoPlacements} from './battle-environment.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createRedHatCap} from './red-hat-model.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createWeaponModel} from './weapon-models.js';
import {setInspectionCamera,floorPoint} from './editor-3d-camera.js';

// Blueprint scene only: no createGame, engine step or battle renderer.
export class InspectionScene {
 constructor(canvas,changed=()=>{}){
  this.changed=changed;this.renderer=new T.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.scene=new T.Scene();this.scene.background=new T.Color('#172c29');this.camera=new T.OrthographicCamera();
  this.scene.add(new T.HemisphereLight(0xfff3d8,0x52634d,2));const sun=new T.DirectionalLight(0xffe2ac,2);sun.position.set(-4,9,5);this.scene.add(sun);
  this.geometry=environmentGeometries();this.materials=new Map();this.dimMaterials=new Map();this.loader=new T.TextureLoader();this.models=[];this.data=new Map();this.generation=0;this.diagnostics=[];
  this.scenery=new T.Group();this.markers=new T.Group();this.scene.add(this.scenery,this.markers);
  this.highlight=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xffe5a5,depthTest:false}));this.highlight.renderOrder=20;this.scene.add(this.highlight);
  this.markerGeo=new T.RingGeometry(.27,.39,20);this.guardMat=new T.MeshBasicMaterial({color:0xef9e75,side:T.DoubleSide});this.startMat=new T.MeshBasicMaterial({color:0x96dbce,side:T.DoubleSide});this.accessMat=new T.MeshBasicMaterial({color:0xf7d17d,side:T.DoubleSide});
  this.cargo=new BattleEnvironment(this.scene,this.loader,()=>{if(this.document)this.rebuild();},error=>{this.diagnostics.push(error.message);changed();});
  this.options={level:0,roofs:true,walls:true};
 }
 material(kind){
  if(!this.materials.has(kind)){
   const p=surfacePixels(kind),map=new T.DataTexture(p.data,p.width,p.height);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.needsUpdate=true;
   const material=new T.MeshStandardMaterial({map,roughness:1});
   material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n vec3 surfaceWorld=(instanceMatrix*vec4(position,1.0)).xyz; vMapUv=abs(normal.y)>.5?surfaceWorld.xz:abs(normal.x)>.5?surfaceWorld.zy:surfaceWorld.xy;\n#endif');};
   if(FOLIAGE_MATERIALS.has(kind)){
    if(!this.foliageTexture){this.foliageTexture=this.loader.load(FOLIAGE_ATLAS,texture=>{if(this.disposed){texture.dispose();return;}this.foliageReady=true;this.changed();},undefined,()=>{this.diagnostics.push('Failed asset: '+FOLIAGE_ATLAS);this.changed();});this.foliageTexture.colorSpace=T.SRGBColorSpace;this.foliageTexture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());}
    paintFoliageMaterial(material,kind,this.foliageTexture);
   }
   this.materials.set(kind,material);
  }return this.materials.get(kind);
 }
 dim(material,z){if(z===this.options.level)return material;if(!this.dimMaterials.has(material)){const m=material.clone();m.onBeforeCompile=(shader,renderer)=>{material.onBeforeCompile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= .38;\n#include <opaque_fragment>');};m.customProgramCacheKey=()=>material.customProgramCacheKey()+'-inspection-dim';this.dimMaterials.set(material,m);}return this.dimMaterials.get(material);}
 clearScenery(){for(const mesh of this.scenery.children)mesh.dispose();this.scenery.clear();}
 async open(document){
  const generation=++this.generation,start=performance.now();this.clearModels();this.document=document;this.diagnostics=[];
  this.world=buildWorld(document.map);this.diagnostics.push(...this.world.diagnostics.map(d=>d.message+': '+d.kind));this.rebuild();
  // Limit simultaneous model/texture preparation on large maps.
  const pending=[...document.units];
  await Promise.all(Array.from({length:4},async()=>{while(pending.length&&generation===this.generation)await this.loadUnit(pending.shift(),generation);}));
  if(generation===this.generation){this.loadMs=performance.now()-start;this.changed();}
 }
 async loadUnit(unit,generation){
  const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===unit.species);if(!profile){this.diagnostics.push('Missing character: '+unit.species);return;}
  let worker,paint,equipment,cap;
  try{
   if(!this.data.has(profile.file))this.data.set(profile.file,fetch(new URL(profile.file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Missing '+profile.file);return r.json();}));
   worker=profile.create(await this.data.get(profile.file));paint=await createAnimalPaint(this.renderer,worker,profile,this.loader,unit.outfit);
   if(unit.outfit==='red-hats')cap=await createRedHatCap(this.renderer,worker,profile,this.loader);
   if(generation!==this.generation){cap?.dispose();paint.dispose();worker.skeleton.dispose();worker.dispose();return;}
   for(const part of worker.parts)part.material=paint.material;
   if(!profile.unarmed){equipment=createWeaponModel(unit.weapon);worker.equipWeapon(equipment);}
   worker.pose(profile.unarmed?'neutral':'carry',-(unit.heading||0));paint.setGripForearm?.(!!equipment?.carry?.handPoses?.support?.gripMesh);
   const root=new T.Group();root.add(worker.root);root.position.set(unit.x,(unit.z||0)*D.floorSpacing,unit.y);root.updateMatrixWorld(true);worker.skeleton.update();for(const part of worker.parts){part.computeBoundingBox?.();part.computeBoundingSphere?.();}
   this.scene.add(root);const model={root,worker,paint,equipment,cap,capMaterial:cap?.mesh.material,unit};this.models.push(model);this.showModel(model);this.changed();
  }catch(error){cap?.dispose();equipment?.dispose();paint?.dispose();worker?.skeleton.dispose();worker?.dispose();if(generation===this.generation){this.diagnostics.push(unit.role+': '+error.message);this.changed();}}
 }
 showModel(model){const z=model.unit.z||0;model.root.visible=z<=this.options.level;for(const part of model.worker.parts)part.material=this.dim(model.paint.material,z);if(model.cap)model.cap.mesh.material=this.dim(model.capMaterial,z);}
 async update(document){
  this.document=document;this.world=buildWorld(document.map);
  const wanted=new Map(document.units.map(u=>[u.id,u]));
  this.models=this.models.filter(m=>{const next=wanted.get(m.unit.id);if(next&&JSON.stringify(next)===JSON.stringify(m.unit)){wanted.delete(m.unit.id);return true;}m.root.removeFromParent();this.dimMaterials.get(m.capMaterial)?.dispose();this.dimMaterials.delete(m.capMaterial);m.cap?.dispose();m.equipment?.dispose();const dim=this.dimMaterials.get(m.paint.material);dim?.dispose();this.dimMaterials.delete(m.paint.material);m.paint.dispose();m.worker.skeleton.dispose();m.worker.dispose();return false;});
  this.rebuild();for(const unit of wanted.values())await this.loadUnit(unit,this.generation);this.changed();
 }
 rebuild(){
  if(!this.document)return;const started=performance.now(),{level,roofs,walls}=this.options,source=this.document.map;
  const map={...source,coverOccupiedProps:source.props,props:source.props.filter(p=>!PAINTED_PROP_FORMS[p.kind]&&(roofs||!p.kind.startsWith('roof-')))};
  const world={...this.world,boxes:this.world.boxes.filter(b=>!(b.kind==='cover'&&b.material==='crate-wood')&&(walls||!b.source.edge)&&(roofs||b.kind!=='roof'))};
  const groups=new Map(),matrix=new T.Matrix4(),q=new T.Quaternion(),yaw=new T.Quaternion(),euler=new T.Euler(),position=new T.Vector3(),scale=new T.Vector3();
  const add=(geometry,material,m,z,x,y)=>{const mat=this.dim(material,z),key=`${Math.floor(x/16)},${Math.floor(y/16)}:${geometry.uuid}:${mat.uuid}`;if(!groups.has(key))groups.set(key,{geometry,material:mat,matrices:[]});groups.get(key).matrices.push(m.clone());};
  for(const b of environmentVisuals(world,map)){
   const z=b.source.z??Number(b.source.edge?.split(':')[3]||0);if(z>level)continue;
   q.setFromEuler(euler.set(...(b.rotation||[0,0,0])));yaw.setFromAxisAngle(new T.Vector3(0,1,0),b.yaw||0);q.premultiply(yaw);matrix.compose(position.fromArray(b.center),q,scale.fromArray(b.size));
   add(this.geometry[b.shape||'box'],this.material(materialKind(b)),matrix,z,b.center[0],b.center[2]);
  }
  if(this.cargo.library)for(const p of cargoPlacements(source)){
   const z=p.z||0;if(z>level)continue;const skins=p.form.startsWith('barrel')?['blue','oxide','ochre','creamSteel']:['timber','weathered','creamWood','oliveWood'],skin=skins[((p.x*17+p.y*31+z*7)>>>0)%4],key=p.form+':'+skin;
   if(!this.cargo.prototypes.has(key))this.cargo.prototypes.set(key,this.cargo.library.build(p.form,skin));
   matrix.compose(position.set(p.x,z*D.floorSpacing,p.y),q.setFromAxisAngle(new T.Vector3(0,1,0),p.rotated?-Math.PI/2:0),scale.set(1,1,1));
   this.cargo.prototypes.get(key).root.traverse(part=>{if(part.isMesh)add(part.geometry,part.material,new T.Matrix4().multiplyMatrices(matrix,part.matrixWorld),z,p.x,p.y);});
  }
  const prior=new Map(this.scenery.children.map(m=>[m.userData.chunk,m]));
  for(const [key,{geometry,material,matrices}]of groups){const old=prior.get(key);prior.delete(key);if(old&&old.count===matrices.length&&matrices.every((m,i)=>m.elements.every((n,j)=>Math.abs(n-old.instanceMatrix.array[i*16+j])<1e-5)))continue;
   if(old){old.removeFromParent();old.dispose();}const mesh=new T.InstancedMesh(geometry,material,matrices.length);mesh.userData.chunk=key;matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();this.scenery.add(mesh);}
  for(const mesh of prior.values()){mesh.removeFromParent();mesh.dispose();}
  this.clearMarkers();
  const addMarker=(p,material,heading)=>{if((p.z||0)>level)return;const ring=new T.Mesh(this.markerGeo,material);ring.rotation.x=-Math.PI/2;ring.position.set(p.x,(p.z||0)*D.floorSpacing+.035,p.y);this.markers.add(ring);if(heading!==undefined){const angle=heading*Math.PI/180,arrow=new T.ArrowHelper(new T.Vector3(Math.cos(angle),0,Math.sin(angle)),ring.position,.85,material.color.getHex(),.2,.12);this.markers.add(arrow);}};
  for(const u of this.document.units)addMarker(u,u.id.startsWith('guard')?this.guardMat:this.startMat,u.heading||0);
  for(const p of [...source.exits,...(source.climbs||[])])addMarker(p,this.accessMat);
  for(const model of this.models)this.showModel(model);this.rebuildMs=performance.now()-started;this.changed();
 }
 setOptions(options){Object.assign(this.options,options);this.rebuild();}
 select(selection){
  const points=[],h=this.options.level*D.floorSpacing+.045;
  if(selection?.type==='edge'){for(const edge of selection.edges||[selection.edge]){const [axis,x,y]=edge.split(':'),a=+x,b=+y;points.push(...(axis==='e'?[new T.Vector3(a+.5,h,b-.5),new T.Vector3(a+.5,h,b+.5)]:[new T.Vector3(a-.5,h,b+.5),new T.Vector3(a+.5,h,b+.5)]));}}
  else for(const p of selection?.cells||[]){const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];points.push(new T.Vector3(p.x+a[0],h,p.y+a[1]),new T.Vector3(p.x+b[0],h,p.y+b[1]));}}
  this.highlight.geometry.dispose();this.highlight.geometry=new T.BufferGeometry().setFromPoints(points);this.changed();
 }
 draw(view,width,height){this.renderer.setSize(width,height,false);setInspectionCamera(this.camera,{...view,level:this.options.level},width,height);this.renderer.render(this.scene,this.camera);}
 pick(x,y,width,height){return floorPoint(this.camera,x,y,width,height,this.options.level);}
 preview(result){
  if(this.previewMesh){this.previewMesh.removeFromParent();this.previewMesh.geometry.dispose();this.previewMesh.material.dispose();this.previewMesh.dispose();this.previewMesh=null;}
  if(!result){this.select(null);return;}
  const cells=result.cells||[],z=this.options.level;
  const geometry=new T.PlaneGeometry(.98,.98),material=new T.MeshBasicMaterial({color:result.ok?0x91ddba:0xff6655,transparent:true,opacity:.4,depthTest:false,side:T.DoubleSide});
  const mesh=new T.InstancedMesh(geometry,material,cells.length),matrix=new T.Matrix4();cells.forEach((p,i)=>{matrix.makeRotationX(-Math.PI/2);matrix.setPosition(p.x,z*D.floorSpacing+.06,p.y);mesh.setMatrixAt(i,matrix);});mesh.renderOrder=19;mesh.frustumCulled=false;this.scene.add(mesh);this.previewMesh=mesh;
  this.highlight.material.color.setHex(result.ok?0xffe5a5:0xff6655);this.select(result.edges?.length?{type:'edge',edges:result.edges}:{cells});
 }
 clearMarkers(){for(const object of this.markers.children)if(object.isArrowHelper||object.type==='ArrowHelper'){object.line.material.dispose();object.cone.material.dispose();}this.markers.clear();}
 clearModels(){for(const m of this.models){m.root.removeFromParent();m.root.position.set(0,0,0);m.root.updateMatrixWorld(true);m.cap?.dispose();m.equipment?.dispose();m.paint.dispose();m.worker.skeleton.dispose();m.worker.dispose();}this.models=[];for(const m of this.dimMaterials.values())m.dispose();this.dimMaterials.clear();}
 dispose(){this.disposed=true;this.preview(null);this.generation++;this.clearModels();this.clearScenery();this.clearMarkers();this.cargo.dispose();for(const g of Object.values(this.geometry))g.dispose();for(const m of this.materials.values()){if(m.map!==this.foliageTexture)m.map.dispose();m.dispose();}this.foliageTexture?.dispose();this.highlight.geometry.dispose();this.highlight.material.dispose();this.markerGeo.dispose();this.guardMat.dispose();this.startMat.dispose();this.accessMat.dispose();this.renderer.dispose();}
}
