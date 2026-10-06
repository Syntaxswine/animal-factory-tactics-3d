import * as THREE from './vendor/three.module.js';
import {STRATEGIC_SITES,STRATEGIC_SITE_ATLAS,createStrategicSiteLibrary} from './strategic-sites.js';
import {createLightHorse,LIGHT_ATLAS} from './horse-light-model.js';
import {createModelPaint,MODEL_PAINT} from './horse-model-paint.js';
const $=id=>document.getElementById(id),stage=$('stage');
async function start(){
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x39433a);stage.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),models=new THREE.Group(),horses=new THREE.Group(),grids=new THREE.Group();
 scene.add(models,horses,grids,new THREE.HemisphereLight(0xfff4dc,0x616e5f,1.9));
 const sun=new THREE.DirectionalLight(0xffebc9,2.5);sun.position.set(-8,17,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-20,right:20,top:15,bottom:-15,near:.1,far:60});sun.shadow.bias=-.00015;sun.shadow.normalBias=.015;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xe0eeff,.7);fill.position.set(6,6,-8);scene.add(fill);
 const loader=new THREE.TextureLoader();
 const [atlas,horseAtlas,horsePaint,data]=await Promise.all([
  loader.loadAsync(STRATEGIC_SITE_ATLAS),loader.loadAsync(LIGHT_ATLAS),loader.loadAsync(MODEL_PAINT),
  fetch('./horse-10k-data.json').then(r=>{if(!r.ok)throw Error('Horse model failed to load');return r.json();}),
 ]);
 for(const t of [atlas,horseAtlas,horsePaint]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
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
 let azimuth=.66,elevation=.50,zoom=1,selection=[],tags=[],disposed=false,ppu=58;
 const focus=new THREE.Vector3(),bounds=new THREE.Box3();
 function orientation(){
  [azimuth,elevation]=({three:[.66,.50],front:[0,.12],side:[Math.PI/2,.16],rear:[Math.PI,.22],top:[0,1.55]})[$('view').value]||[.66,.50];
  zoom=1;render();
 }
 function rebuild(){
  models.clear();horses.clear();grids.clear();$('labels').replaceChildren();tags=[];
  const id=$('site').value,site=STRATEGIC_SITES.find(s=>s.id===id),states=$('mode').value==='pair'?['intact','destroyed']:[$('mode').value];
  selection=states.map((state,i)=>{
   const asset=library.build(id,{state}),x=states.length===2?(i-.5)*10.2:0;asset.root.position.x=x;models.add(asset.root);
   const grid=new THREE.LineSegments(gridGeometry,gridMaterial);grid.position.x=x;grids.add(grid);
   const worker=workers[i].root;worker.position.set(x+4.65,0,2.7);horses.add(worker);
   const label=document.createElement('span');label.className='tag';label.innerHTML=(state==='intact'?'Intact':'Destroyed')+'<small>8 × 8 tiles</small>';$('labels').append(label);
   tags.push({label,point:new THREE.Vector3(x,.10,4.8)});
   return asset;
  });
  models.updateMatrixWorld(true);horses.updateMatrixWorld(true);bounds.setFromObject(models,true);
  for(let i=0;i<states.length;i++){const d=workers[i].diagnostics();bounds.union(new THREE.Box3(new THREE.Vector3(...d.min),new THREE.Vector3(...d.max)));}
  bounds.getCenter(focus);
  $('caption').textContent=site.name;$('note').textContent=site.note;
  $('reference').href='../assets/environment/strategic-sites/reference-'+id+'.png';
  syncUrl();render();
 }
 function syncUrl(){const p=new URLSearchParams();for(const id of ['site','mode','view','scale'])p.set(id,$(id).value);history.replaceState(null,'','?'+p);}
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
  grids.visible=$('grid').checked;horses.visible=$('horse').checked;
  models.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});
  greyMaterial.wireframe=$('wire').checked;scene.overrideMaterial=$('grey').checked?greyMaterial:null;
  renderer.render(scene,camera);
  for(const t of tags){const p=t.point.clone().project(camera);t.label.style.left=(p.x+1)*w/2+'px';t.label.style.top=(1-p.y)*h/2+'px';}
  const triangles=selection.reduce((n,a)=>{a.root.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count/3;});return n;},0);
  $('status').textContent=Math.round(ppu)+' CSS px/tile · '+triangles.toLocaleString()+' site triangles';
 }
 const params=new URLSearchParams(location.search);
 for(const id of ['site','mode','view','scale'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
 for(const id of ['site','mode'])$(id).onchange=()=>{zoom=1;rebuild();};
 $('view').onchange=()=>{orientation();syncUrl();};
 $('scale').onchange=()=>{zoom=1;render();syncUrl();};
 for(const id of ['grid','horse','grey','wire'])$(id).onchange=render;
 $('reset').onclick=()=>{orientation();};
 let pointer=null;const canvas=renderer.domElement;
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointer=[e.pointerId,e.clientX,e.clientY];};
 canvas.onpointermove=e=>{if(!pointer||pointer[0]!==e.pointerId)return;azimuth-=(e.clientX-pointer[1])*.007;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-pointer[2])*.005,.06,1.55);pointer=[e.pointerId,e.clientX,e.clientY];render();};
 canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),.45,2.8);render();},{passive:false});
 rebuild();orientation();const resize=new ResizeObserver(render);resize.observe(stage);
 function diagnostics(){return {site:$('site').value,mode:$('mode').value,ppu,resources:library.stats(),gpu:{...renderer.info.memory},workers:workers.slice(0,selection.length).map(w=>({root:w.root.position.toArray(),...w.diagnostics()})),assets:selection.map(a=>({id:a.site.id,state:a.state,tiles:a.site.tiles,bounds:new THREE.Box3().setFromObject(a.root,true),triangles:(()=>{let n=0;a.root.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count/3;});return n;})()})),disposed};}
 function dispose(){
  if(disposed)return;disposed=true;resize.disconnect();library.dispose();paint.dispose();
  for(const worker of workers){worker.dispose();worker.skeleton.dispose();}
  for(const t of [atlas,horseAtlas])t.dispose();floor.geometry.dispose();floor.material.dispose();gridGeometry.dispose();gridMaterial.dispose();greyMaterial.dispose();renderer.dispose();
 }
 window.sitesStudy={ready:true,scene,camera,renderer,models,library,selection:()=>selection,diagnostics,dispose,select(id,mode='pair'){if(!STRATEGIC_SITES.some(s=>s.id===id)||!['pair','intact','destroyed'].includes(mode))throw RangeError('Invalid study selection');$('site').value=id;$('mode').value=mode;zoom=1;rebuild();},view(name){if(![...$('view').options].some(o=>o.value===name))throw RangeError('Invalid view');$('view').value=name;orientation();syncUrl();}};
 window.addEventListener('pagehide',dispose,{once:true});
}
start().catch(error=>{$('error').textContent='Could not load strategic sites: '+error.message;console.error(error);});
