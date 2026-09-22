import * as THREE from './vendor/three.module.js';
import {softBox} from './painted-environment-scene.js';
export const CARGO_ATLAS='../assets/environment/painted-study/cargo-materials-v1.png';
export const CARGO_SKINS={
 timber:{name:'Honey timber',family:'crate',atlas:'original',cell:[.5,.5,.5,.5],tint:0xe1c49a},
 weathered:{name:'Weathered wood',family:'crate',atlas:'cargo',cell:[0,.5,1/3,.5],tint:0xdbd0bd},
 creamWood:{name:'Chipped cream',family:'crate',atlas:'cargo',cell:[1/3,.5,1/3,.5],tint:0xe1d7bd},
 oliveWood:{name:'Olive paint',family:'crate',atlas:'cargo',cell:[2/3,.5,1/3,.5],tint:0xd8d2b9},
 blue:{name:'Worn blue',family:'barrel',atlas:'original',cell:[0,0,.5,.5],tint:0xc2d7da},
 oxide:{name:'Oxide red',family:'barrel',atlas:'cargo',cell:[0,0,1/3,.5],tint:0xd3b6a8},
 ochre:{name:'Ochre steel',family:'barrel',atlas:'cargo',cell:[1/3,0,1/3,.5],tint:0xd2bf96},
 creamSteel:{name:'Cream steel',family:'barrel',atlas:'cargo',cell:[2/3,0,1/3,.5],tint:0xe0d4bb}
};
export const CARGO_FORMS=[
 {id:'crate-square',name:'Braced crate',family:'crate',tiles:[1,1]},
 {id:'crate-long',name:'Long supply crate',family:'crate',tiles:[1,2]},
 {id:'crate-tall',name:'Tall shipping crate',family:'crate',tiles:[1,2]},
 {id:'crate-strapped',name:'Banded freight crate',family:'crate',tiles:[1,2]},
 {id:'crate-stack',name:'Two-crate stack',family:'crate',tiles:[1,1]},
 {id:'crate-pallet',name:'Pallet of four crates',family:'crate',tiles:[2,2]},
 {id:'barrel-single',name:'Single drum',family:'barrel',tiles:[1,1]},
 {id:'barrel-stack',name:'Two-drum stack',family:'barrel',tiles:[1,1]},
 {id:'barrel-row',name:'Three-drum row',family:'barrel',tiles:[1,2]},
 {id:'barrel-pyramid',name:'Six-drum pyramid',family:'barrel',tiles:[2,1]},
 {id:'barrel-pile',name:'Mixed drum pile',family:'barrel',tiles:[2,2]},
 {id:'barrel-block',name:'Eighteen-drum block',family:'barrel',tiles:[2,2]}
];
export const DRUM_RADIUS=.328,DRUM_HEIGHT=.8;
// A gallery/library owns cached geometry and materials. Individual arrangements
// borrow them; removing an arrangement never disposes another one's resources.
export function createCargoLibrary(originalAtlas,cargoAtlas){
 const geometries=new Map(),materials=new Map(),textures=[],rand=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};let disposed=false;
 const geo=(key,create)=>{if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);};
 const rounded=s=>geo('box:'+s.join(','),()=>softBox(...s,.007,1));
 function solid(name,color){if(!materials.has(name))materials.set(name,new THREE.MeshStandardMaterial({color,roughness:.94}));return materials.get(name);}
 function finish(id,index=0){const key=id+':'+index;if(materials.has(key))return materials.get(key);const def=CARGO_SKINS[id],[u,v,w,h]=def.cell,t=(def.atlas==='cargo'?cargoAtlas:originalAtlas).clone(),wood=def.family==='crate';
  const sw=wood?w*.5:w*.94,sh=h*(wood?.72:.94);t.offset.set(u+w*.025+rand(index+9)*(w*.95-sw),v+h*.025+rand(index+17)*(h*.95-sh));t.repeat.set(sw,sh);t.needsUpdate=true;textures.push(t);
  const m=new THREE.MeshStandardMaterial({map:t,color:def.tint,roughness:wood?.98:.85});
  if(wood){const quiet=id==='timber'?[.22,.13,.055]:id==='weathered'?[.21,.18,.14]:id==='creamWood'?[.46,.40,.30]:[.105,.115,.065];m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3('+quiet.join(',')+'),diffuseColor.rgb,.72);');};m.customProgramCacheKey=()=> 'cargo-wood-'+id;}
  materials.set(key,m);return m;
 }
 const iron=solid('iron',0x45413b),inside=solid('inside',0x3b2d24),rub=solid('rub',0xa58c64);
 function add(parent,g,m,pos,rotation=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rotation);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const box=(parent,m,pos,size,r)=>add(parent,rounded(size),m,pos,r);
 const cylinder=(r,h,segments=12)=>geo(`cylinder:${r}:${h}:${segments}`,()=>new THREE.CylinderGeometry(r,r,h,segments));
 const ring=(r,t)=>geo(`ring:${r}:${t}`,()=>new THREE.TorusGeometry(r,t,6,32));
 function crate(skin,w,d,h,banded=false){
  const root=new THREE.Group();box(root,inside,[0,h/2,0],[w-.14,h-.07,d-.14]);
  box(root,finish(skin,3),[0,.025,0],[w-.06,.05,d-.06]);
  const faces=[[0,d/2-.063,0,w-.06],[0,-d/2+.063,Math.PI,w-.06],[w/2-.063,0,Math.PI/2,d-.06],[-w/2+.063,0,-Math.PI/2,d-.06]];
  for(const [f,[x,z,yaw,width]]of faces.entries()){
   const face=new THREE.Group();face.position.set(x,0,z);face.rotation.y=yaw;root.add(face);const n=Math.ceil(width/.22),step=width/n;
   for(let i=0;i<n;i++)box(face,finish(skin,(i+f*2)%8),[-width/2+(i+.5)*step,h/2,0],[step-.009,h-.05,.042]);
   for(const y of [.11,h-.11])box(face,finish(skin,(f+2)%8),[0,y,.033],[.095,width+.025,.045],[0,0,Math.PI/2]);
   const sections=width>1.2?2:1,section=width/sections;
   for(let j=0;j<sections;j++){const x=-width/2+(j+.5)*section,a=section-.12,b=h-.22;box(face,finish(skin,(f+5)%8),[x,h/2,.058],[.085,Math.hypot(a,b),.04],[0,0,-Math.atan2(a,b)]);}
   for(const x of [-width*.38,width*.38])for(const y of [.11,h-.11])add(face,cylinder(.014,.008,8),iron,[x,y,.06],[Math.PI/2,0,0]);
  }
  const n=Math.ceil(w/.22),step=(w-.045)/n;for(let i=0;i<n;i++)box(root,finish(skin,i%8),[-(w-.045)/2+(i+.5)*step,h-.025,0],[step-.008,d-.045,.05],[Math.PI/2,0,0]);
  if(banded)for(const z of [-d*.28,d*.28]){
   for(const x of [-w/2-.003,w/2+.003])box(root,iron,[x,h/2+.005,z],[.024,h+.005,.065]);
   for(const y of [.012,h+.006])box(root,iron,[0,y,z],[w+.022,.023,.065]);
   box(root,rub,[w/2+.018,h*.55,z],[.025,.12,.095]);
  }
  root.userData={kind:'crate',size:[w,h,d]};return root;
 }
 const drumShell=geo('drum-shell',()=>{
  const profile=[[.285,.015],[.308,.05],[.315,.16],[.316,.35],[.314,.62],[.305,.76],[.285,.79]],g=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),32),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),dent=.014*Math.exp(-Math.pow((Math.atan2(x,z)-.9)/.3,2)-Math.pow((y-.47)/.14,2));p.setXYZ(i,x*(1-dent/.316),y,z*(1-dent/.316));}g.computeVertexNormals();return g;
 });
 function drum(skin,index){const root=new THREE.Group(),m=finish(skin,index%3);add(root,drumShell,m,[0,0,0]);
  for(const [y,r]of [[.0125,.302],[.78,.292]])add(root,cylinder(r,.025,32),m,[0,y,0]);
  for(const [y,r]of [[.032,.307],[.2,.317],[.61,.317],[.789,.307]])add(root,ring(r,.011),iron,[0,y,0],[Math.PI/2,0,0]);
  add(root,cylinder(.034,.01),iron,[.12,.791,.085]);add(root,ring(.037,.005),rub,[.12,.795,.085],[Math.PI/2,0,0]);return root;
 }
 function build(id,skin){if(disposed)throw Error('Cargo library disposed');const form=CARGO_FORMS.find(f=>f.id===id);if(!form||CARGO_SKINS[skin]?.family!==form.family)throw Error('Invalid cargo form/skin');const root=new THREE.Group(),items=[];
  function placeCrate(x,y,z,w=.88,d=.88,h=.8,banded=false){const g=crate(skin,w,d,h,banded);g.position.set(x,y,z);root.add(g);items.push({kind:'crate',base:[x,y,z],size:[w,h,d]});}
  function placeDrum(x,y,z,horizontal=false){const pivot=new THREE.Group(),g=drum(skin,items.length);g.position.y=-DRUM_HEIGHT/2;g.rotation.y=items.length*2.399963;pivot.add(g);pivot.position.set(x,y,z);if(horizontal)pivot.rotation.x=Math.PI/2;root.add(pivot);items.push({kind:'drum',center:[x,y,z],horizontal,radius:DRUM_RADIUS,height:DRUM_HEIGHT});}
  if(id==='crate-square')placeCrate(0,0,0);
  if(id==='crate-long')placeCrate(0,0,0,.88,1.88,.68);
  if(id==='crate-tall')placeCrate(0,0,0,.88,1.88,1.28);
  if(id==='crate-strapped')placeCrate(0,0,0,.86,1.84,.86,true);
  if(id==='crate-stack'){placeCrate(0,0,0);placeCrate(0,.8,0);}
  if(id==='crate-pallet'){
   for(const x of [-.76,0,.76])box(root,finish(skin,2),[x,.04,0],[.13,.08,1.92]);
   for(let i=0;i<9;i++)box(root,finish(skin,i%8),[0,.11,(i-4)*.215],[1.92,.06,.18]);
   for(const x of [-.46,.46])for(const z of [-.46,.46])placeCrate(x,.14,z,.84,.84,.8);
  }
  if(id==='barrel-single')placeDrum(0,.4,0);
  if(id==='barrel-stack'){placeDrum(0,.4,0);placeDrum(0,1.2,0);}
  if(id==='barrel-row')for(const z of [-.656,0,.656])placeDrum(0,.4,z);
  if(id==='barrel-pyramid')for(let row=0;row<3;row++)for(let i=0;i<3-row;i++)placeDrum((i-(2-row)/2)*.656,.328+row*.656*Math.sqrt(3)/2,0,true);
  if(id==='barrel-pile'){for(const x of [-.328,.328])placeDrum(x,.328,-.37,true);placeDrum(0,.328+.656*Math.sqrt(3)/2,-.37,true);placeDrum(.6,.4,.54);}
  if(id==='barrel-block')for(let level=0;level<2;level++)for(const x of [-.656,0,.656])for(const z of [-.656,0,.656])placeDrum(x,.4+level*.8,z);
  root.updateMatrixWorld(true);return {root,form,skin,items,bounds:new THREE.Box3().setFromObject(root,true)};
 }
 return {build,stats:()=>({geometries:geometries.size,materials:materials.size,textures:textures.length}),dispose(){if(disposed)return;disposed=true;for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();geometries.clear();materials.clear();textures.length=0;}};
}
