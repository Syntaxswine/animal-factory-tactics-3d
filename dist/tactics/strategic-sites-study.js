import * as THREE from './vendor/three.module.js';
import {STRATEGIC_SITES,STRATEGIC_SITE_ATLAS,createStrategicSiteLibrary} from './strategic-sites.js';
import {SITE_CLEARANCE_PROFILES} from './strategic-site-clearance.js';
import {SITE_SCORCH_ATLAS,createSiteScorch} from './strategic-site-scorch.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id),stage=$('stage');
async function start(){
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x39433a);stage.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),models=new THREE.Group(),horses=new THREE.Group(),grids=new THREE.Group(),fitting=new THREE.Group();
 scene.add(models,horses,grids,fitting,new THREE.HemisphereLight(0xfff4dc,0x616e5f,1.9));
 const sun=new THREE.DirectionalLight(0xffebc9,2.5);sun.position.set(-8,17,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-20,right:20,top:15,bottom:-15,near:.1,far:60});sun.shadow.bias=-.00015;sun.shadow.normalBias=.015;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xe0eeff,.7);fill.position.set(6,6,-8);scene.add(fill);
 const loader=new THREE.TextureLoader();
 const loaded=await Promise.allSettled([
  loader.loadAsync(STRATEGIC_SITE_ATLAS),loader.loadAsync(LIGHT_ATLAS),loader.loadAsync(MODEL_PAINT),
  fetch('./horse-10k-data.json').then(r=>{if(!r.ok)throw Error('Horse model failed to load');return r.json();}),
  loader.loadAsync(SITE_SCORCH_ATLAS),
 ]);
 if(loaded.some(r=>r.status==='rejected')){for(const r of loaded)if(r.status==='fulfilled'&&r.value?.isTexture)r.value.dispose();renderer.dispose();renderer.domElement.remove();throw loaded.find(r=>r.status==='rejected').reason;}
 const [atlas,horseAtlas,horsePaint,data,scorchAtlas]=loaded.map(r=>r.value);
 for(const t of [atlas,horseAtlas,horsePaint,scorchAtlas]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 const library=createStrategicSiteLibrary(atlas),horse=createLightHorse(data,horseAtlas),paint=createModelPaint(renderer,horse,horsePaint);
 // A generic Object3D clone keeps a SkinnedMesh's original skeleton. Use two
 // independently bound horses so each scale reference follows its own root.
 const workers=[horse,createLightHorse(data,horseAtlas)];
 // Identical geometry can borrow the same projection atlas, but each independent
 // mesh still needs the part IDs installed by createModelPaint on the first rig.
 workers[1].parts.forEach((part,i)=>part.geometry.setAttribute('paintPart',horse.parts[i].geometry.getAttribute('paintPart').clone()));
 for(const worker of workers){worker.pose('neutral',20);for(const p of worker.parts){p.material=paint.material;p.castShadow=p.receiveShadow=true;}}
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:0x66745b,roughness:1}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
 const gridPoints=[];for(let i=-4;i<=4;i++){gridPoints.push(new THREE.Vector3(i,.247,-4),new THREE.Vector3(i,.247,4),new THREE.Vector3(-4,.247,i),new THREE.Vector3(4,.247,i));}
 const gridGeometry=new THREE.BufferGeometry().setFromPoints(gridPoints),gridMaterial=new THREE.LineBasicMaterial({color:0xf0dfac,transparent:true,opacity:.5});
 const greyMaterial=new THREE.MeshStandardMaterial({color:0xb4b6ad,roughness:1,side:THREE.DoubleSide});
 const cellGeometry=new THREE.PlaneGeometry(.94,.94);cellGeometry.rotateX(-Math.PI/2);
 const cellMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.31,depthWrite:false,toneMapped:false});
 const cellsMesh=new THREE.InstancedMesh(cellGeometry,cellMaterial,128);cellsMesh.name='standing-clearance-cells';cellsMesh.frustumCulled=false;fitting.add(cellsMesh);
 function lineLayer(color,opacity,capacity=1024){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(capacity*3),3));geometry.setDrawRange(0,0);
  const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});
  const line=new THREE.LineSegments(geometry,material);line.frustumCulled=false;fitting.add(line);return line;
 }
 const paths=lineLayer(0xc0edc2,.9),bases=lineLayer(0xffda82,.95),rulers=lineLayer(0xffe4a0,.95);
 const bodyOutline=lineLayer(0xfff1bd,.65,2048),contacts=lineLayer(0xff7755,1);bodyOutline.name='body-clearance-probe';contacts.name='body-clearance-contacts';
 bodyOutline.material.depthTest=contacts.material.depthTest=false;bodyOutline.renderOrder=2;contacts.renderOrder=3;
 function setLines(line,points){const p=line.geometry.attributes.position;if(points.length>p.count)throw Error('Overlay capacity exceeded');points.forEach((v,i)=>p.setXYZ(i,...v));p.needsUpdate=true;line.geometry.setDrawRange(0,points.length);}
 let azimuth=.66,elevation=.50,zoom=1,selection=[],scorches=[],tags=[],disposed=false,ppu=58,clearanceMaps=[],placementCell=[1,7],inspectedCell=null;
 const focus=new THREE.Vector3(),bounds=new THREE.Box3();
 const idForCell=c=>c.join(','),reachable=(map,c)=>map.cells.some(t=>t.x===c[0]&&t.z===c[1]&&t.reachable);
 function addTag(text,point,kind=''){
  const label=document.createElement('span');label.className='tag '+kind;label.textContent=text;$('labels').append(label);tags.push({label,point,kind});
 }
 function orientation(){
  [azimuth,elevation]=({three:[.66,.50],front:[0,.12],side:[Math.PI/2,.16],rear:[Math.PI,.22],top:[0,1.55]})[$('view').value]||[.66,.50];
  zoom=1;render();
 }
 function rebuild(){
  for(const scorch of scorches)scorch.dispose();scorches=[];
  models.clear();horses.clear();grids.clear();$('labels').replaceChildren();tags=[];
  const id=$('site').value,site=STRATEGIC_SITES.find(s=>s.id===id),states=$('mode').value==='pair'?['intact','destroyed']:[$('mode').value];
  // State-independent bounds prevent the slab from sliding or changing size
  // when a tall tower becomes low wreckage. Player placement must not reframe it.
  const localBounds=library.build(id).bounds.union(library.build(id,{state:'destroyed'}).bounds);
  localBounds.expandByPoint(new THREE.Vector3(5.6,2,4.8));bounds.makeEmpty();
  if($('frame').value==='ground')localBounds.max.y=3.3;
  selection=states.map((state,i)=>{
   const asset=library.build(id,{state}),x=states.length===2?(i-.5)*10.2:0;asset.root.position.x=x;models.add(asset.root);
   const scorch=createSiteScorch(scorchAtlas,id);scorch.root.position.x=x;scorches.push(scorch);scene.add(scorch.root);
   bounds.union(localBounds.clone().translate(new THREE.Vector3(x,0,0)));
   const grid=new THREE.LineSegments(gridGeometry,gridMaterial);grid.position.x=x;grids.add(grid);
   horses.add(workers[i].root);
   addTag((state==='intact'?'Intact':'Destroyed')+' · 8 × 8',new THREE.Vector3(x,.10,4.8));
   addTag('2 tiles · wall height',new THREE.Vector3(x+4.75,2,2.7),'measure');
   addTag('1 tile',new THREE.Vector3(x+4.75,1,2.7),'measure');
   return asset;
  });
  models.updateMatrixWorld(true);
  bounds.getCenter(focus);
  $('caption').textContent=site.name;$('note').textContent=site.note;
  $('reference').href='../assets/environment/strategic-sites/reference-'+id+'.png';
  $('damage').textContent=states.length===2?'Compare in place':'Toggle damage';
  updateFitting();syncUrl();render();
 }
 function updateFitting(){
  clearanceMaps=selection.map(a=>library.clearance(a.site.id,{state:a.state,profile:$('profile').value}));
  const options=clearanceMaps[0].cells.filter(c=>clearanceMaps.every(m=>reachable(m,[c.x,c.z])));
  $('tile').replaceChildren(new Option('Beside site','outside'),...options.map(c=>new Option('Column '+(c.x+1)+' · row '+(c.z+1),idForCell([c.x,c.z]))));
  const relocated=placementCell&&!options.some(c=>idForCell([c.x,c.z])===idForCell(placementCell));
  if(relocated)placementCell=options.length?[options[0].x,options[0].z]:null;
  $('tile').value=placementCell?idForCell(placementCell):'outside';
  const lines=[],fixed=[],measures=[],transform=new THREE.Matrix4(),color=new THREE.Color();let n=0;
  selection.forEach((asset,i)=>{
   const map=clearanceMaps[i],offset=asset.root.position.x,y=map.surfaceHeight;
   for(const c of map.cells){
    transform.makeTranslation(offset+c.center[0],y+.010,c.center[1]);cellsMesh.setMatrixAt(n,transform);
    color.setHex(c.reachable?0x63c984:c.passable?0xe2c668:0xd07055);cellsMesh.setColorAt(n++,color);
   }
   for(const link of map.links)if(reachable(map,link.from)&&reachable(map,link.to))for(const c of [link.from,link.to])lines.push([offset+c[0]-3.5,y+.019,c[1]-3.5]);
   for(const f of asset.root.userData.foundations){
    f.outline.forEach((a,j)=>{const b=f.outline[(j+1)%f.outline.length];fixed.push([offset+a[0],f.max[1]+.018,a[1]],[offset+b[0],f.max[1]+.018,b[1]]);});
   }
   const x=offset+4.45,z=2.7;measures.push([x,0,z],[x,2,z]);
   for(let t=0;t<=2;t+=.5)measures.push([x-.08,t,z],[x+.10,t,z]);
  });
  cellsMesh.count=n;cellsMesh.instanceMatrix.needsUpdate=true;cellsMesh.instanceColor.needsUpdate=true;
  setLines(paths,lines);setLines(bases,fixed);setLines(rulers,measures);placeWorkers();
  $('placement').textContent=(relocated?'Previous tile unavailable; moved to a clear position. ':'')+placementDescription();
  $('clearance').textContent=clearanceMaps.map((m,i)=>(selection[i].state==='intact'?'Intact':'Destroyed')+': '+m.cells.filter(c=>c.reachable).length+'/64 tiles clear').join(' · ')+' · '+SITE_CLEARANCE_PROFILES[$('profile').value].label+' clearance';
  inspectCell(inspectedCell);
 }
 function inspectCell(cell){
  inspectedCell=cell?cell.slice():null;const outline=[],hits=[],reports=[];
  if(cell)selection.forEach((asset,i)=>{
   const map=clearanceMaps[i],tile=map.cells.find(c=>c.x===cell[0]&&c.z===cell[1]),x=asset.root.position.x+cell[0]-3.5,z=cell[1]-3.5,y=map.surfaceHeight;
   if(!tile)return;
   for(const b of map.profile.bands){
    for(const height of [b.minY,b.maxY])for(let n=0;n<16;n++)for(const angle of [n/16*Math.PI*2,(n+1)/16*Math.PI*2])outline.push([x+Math.cos(angle)*b.radius,y+height,z+Math.sin(angle)*b.radius]);
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])outline.push([x+Math.cos(angle)*b.radius,y+b.minY,z+Math.sin(angle)*b.radius],[x+Math.cos(angle)*b.radius,y+b.maxY,z+Math.sin(angle)*b.radius]);
   }
   if(tile.contact){
    const p=tile.contact.point.slice();p[0]+=asset.root.position.x;hits.push([x,p[1],z],p);
    for(let axis=0;axis<3;axis++){const a=p.slice(),b=p.slice();a[axis]-=.08;b[axis]+=.08;hits.push(a,b);}
    const names={'launcher-foundation':'launcher base / outrigger','tower-foundations':'tower footing','fixed-detail':'cable or structural fitting','scattered-fragments':'rubble'};
    const part=names[tile.reason]||tile.reason.replaceAll('-',' '),height=p[1]-y;
    reports.push(asset.state+': '+part+' at '+height.toFixed(2)+' tiles above the slab');
   }else reports.push(asset.state+': '+(tile.reachable?'clear':'clear pocket without an approach'));
  });
  setLines(bodyOutline,outline);setLines(contacts,hits);
  $('inspection').textContent=cell?'Column '+(cell[0]+1)+', row '+(cell[1]+1)+' · '+reports.join(' · ')+' · Outline includes room to turn.':'';
 }
 function placementDescription(){return placementCell?'Horse on column '+(placementCell[0]+1)+', row '+(placementCell[1]+1)+' · original 1.65-tile height.':'Horse beside the site · original 1.65-tile height.';}
 function placeWorkers(){
  selection.forEach((asset,i)=>workers[i].root.position.set(asset.root.position.x+(placementCell?placementCell[0]-3.5:4.65),placementCell?asset.root.userData.slabHeight:0,placementCell?placementCell[1]-3.5:2.7));horses.updateMatrixWorld(true);
 }
 function placeHorse(cell){
  if(cell&&(!Array.isArray(cell)||cell.length!==2||!cell.every(n=>Number.isInteger(n)&&n>=0&&n<8)))throw RangeError('Invalid site tile');
  inspectCell(cell);
  if(cell&&!clearanceMaps.every(m=>reachable(m,cell))){$('placement').textContent='Horse stays on its previous clear tile; see the contact marker.';render();return false;}
  placementCell=cell?cell.slice():null;$('tile').value=cell?idForCell(cell):'outside';placeWorkers();
  $('placement').textContent=placementDescription();render();return true;
 }
 function syncUrl(){const p=new URLSearchParams(location.search);for(const id of ['site','mode','view','frame','scale','profile'])p.set(id,$(id).value);for(const id of ['passage','foundations','ruler','scorch'])p.set(id,$(id).checked?'1':'0');history.replaceState(null,'','?'+p);}
 function render(){
  if(disposed)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);camera.position.copy(focus).add(new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(36));
  camera.lookAt(focus);camera.updateMatrixWorld(true);
  ppu=Number($('scale').value);
  if(!Number.isFinite(ppu)){
   const b=bounds.clone();b.max.z+=1.1;b.min.y-=.5;
   const points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
   const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
   ppu=Math.max(8,Math.min((w-70)/width,(h-45)/height,105));
  }
  ppu*=zoom;camera.left=-w/ppu/2;camera.right=w/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.1;camera.far=90;camera.updateProjectionMatrix();
  grids.visible=$('grid').checked||$('passage').checked;horses.visible=$('horse').checked;
  cellsMesh.visible=paths.visible=$('passage').checked;bases.visible=$('foundations').checked;rulers.visible=$('ruler').checked&&elevation<1.2&&ppu>=30;$('legend').hidden=!$('passage').checked;
  bodyOutline.visible=contacts.visible=Boolean(inspectedCell)&&$('passage').checked&&$('probe').checked;
  models.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});
  greyMaterial.wireframe=$('wire').checked;scene.overrideMaterial=$('grey').checked?greyMaterial:null;
  scorches.forEach((s,i)=>s.setAmount(selection[i].state==='destroyed'&&$('scorch').checked&&!$('grey').checked&&!$('wire').checked?1:0));
  // Keep the colored fitting overlays readable in grey sculpt mode.
  fitting.visible=false;renderer.render(scene,camera);fitting.visible=true;
  const priorOverride=scene.overrideMaterial;scene.overrideMaterial=null;renderer.autoClear=false;
  renderer.render(fitting,camera);renderer.autoClear=true;scene.overrideMaterial=priorOverride;
  for(const t of tags){const p=t.point.clone().project(camera);t.label.hidden=t.kind==='measure'&&!rulers.visible;t.label.style.left=(p.x+1)*w/2+'px';t.label.style.top=(1-p.y)*h/2+'px';}
  const triangles=selection.reduce((n,a)=>{a.root.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count/3;});return n;},0);
  $('status').textContent=Math.round(ppu)+' CSS px/tile · '+triangles.toLocaleString()+' site triangles';
 }
 const params=new URLSearchParams(location.search);
 for(const id of ['site','mode','view','frame','scale','profile'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
 for(const id of ['passage','foundations','ruler','scorch'])if(params.has(id))$(id).checked=params.get(id)==='1';
 $('site').onchange=()=>{zoom=1;placementCell=[1,7];inspectedCell=null;rebuild();};
 $('mode').onchange=rebuild;
 $('frame').onchange=rebuild;
 $('damage').onclick=()=>{$('mode').value=$('mode').value==='intact'?'destroyed':'intact';rebuild();};
 $('profile').onchange=()=>{updateFitting();syncUrl();render();};
 $('tile').onchange=()=>placeHorse($('tile').value==='outside'?null:$('tile').value.split(',').map(Number));
 $('view').onchange=()=>{orientation();syncUrl();};
 $('scale').onchange=()=>{zoom=1;render();syncUrl();};
 for(const id of ['grid','horse','grey','wire','probe'])$(id).onchange=render;
 for(const id of ['passage','foundations','ruler','scorch'])$(id).onchange=()=>{syncUrl();render();};
 $('reset').onclick=()=>{orientation();};
 let pointer=null;const canvas=renderer.domElement;
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};};
 canvas.onpointermove=e=>{if(!pointer||pointer.id!==e.pointerId)return;pointer.moved ||= Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>4;if(!pointer.moved)return;azimuth-=(e.clientX-pointer.x)*.007;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-pointer.y)*.005,.06,1.55);pointer.x=e.clientX;pointer.y=e.clientY;render();};
 canvas.onpointerup=e=>{
  if(pointer&&!pointer.moved&&$('passage').checked){
   const rect=canvas.getBoundingClientRect(),ndc=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);
   const p=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.24),new THREE.Vector3());
   if(p)for(const a of selection){const x=Math.floor(p.x-a.root.position.x+4),z=Math.floor(p.z+4);if(x>=0&&x<8&&z>=0&&z<8){placeHorse([x,z]);break;}}
  }pointer=null;
 };
 canvas.onpointercancel=()=>pointer=null;
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),.45,2.8);render();},{passive:false});
 rebuild();orientation();const resize=new ResizeObserver(render);resize.observe(stage);
 function diagnostics(){return {site:$('site').value,mode:$('mode').value,ppu,focus:focus.toArray(),zoom,azimuth,elevation,placementCell,inspectedCell,clearance:clearanceMaps,scorch:scorches.map(s=>s.diagnostics()),resources:library.stats(),gpu:{...renderer.info.memory},workers:workers.slice(0,selection.length).map(w=>({root:w.root.position.toArray(),scale:w.root.scale.toArray(),...w.diagnostics()})),assets:selection.map(a=>({id:a.site.id,state:a.state,tiles:a.site.tiles,foundations:a.root.userData.foundations,bounds:new THREE.Box3().setFromObject(a.root,true),triangles:(()=>{let n=0;a.root.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count/3;});return n;})()})),disposed};}
 function dispose(){
  if(disposed)return;disposed=true;resize.disconnect();library.dispose();paint.dispose();for(const scorch of scorches)scorch.dispose();scorchAtlas.dispose();
  for(const worker of workers){worker.dispose();worker.skeleton.dispose();}
  for(const t of [atlas,horseAtlas])t.dispose();floor.geometry.dispose();floor.material.dispose();gridGeometry.dispose();gridMaterial.dispose();greyMaterial.dispose();cellsMesh.dispose();cellGeometry.dispose();cellMaterial.dispose();for(const layer of [paths,bases,rulers,bodyOutline,contacts]){layer.geometry.dispose();layer.material.dispose();}renderer.dispose();
 }
 window.sitesStudy={ready:true,scene,camera,renderer,models,library,get scorches(){return scorches;},selection:()=>selection,diagnostics,dispose,placeHorse,select(id,mode='pair'){if(!STRATEGIC_SITES.some(s=>s.id===id)||!['pair','intact','destroyed'].includes(mode))throw RangeError('Invalid study selection');if(id!==$('site').value){zoom=1;placementCell=[1,7];inspectedCell=null;}$('site').value=id;$('mode').value=mode;rebuild();},view(name){if(![...$('view').options].some(o=>o.value===name))throw RangeError('Invalid view');$('view').value=name;orientation();syncUrl();}};
 window.addEventListener('pagehide',dispose,{once:true});
}
start().catch(error=>{$('error').textContent='Could not load strategic sites: '+error.message;console.error(error);});
