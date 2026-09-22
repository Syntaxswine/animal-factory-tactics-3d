import * as THREE from './vendor/three.module.js';
import {softBox} from './painted-environment-scene.js';

export const FURNITURE_FORMS=[
 {id:'dining-table',name:'Farmhouse table',tiles:[1,2],note:'Planked top, tapered square legs and pegged apron.'},
 {id:'coffee-table',name:'Low living-room table',tiles:[1,2],note:'Solid flat top with a lower magazine shelf.'},
 {id:'single-bed',name:'Single bed',tiles:[1,2],note:'Panelled timber frame, pillow and folded blue quilt.'},
 {id:'bedside-table',name:'Bedside table',tiles:[1,1],note:'Inset drawer and an open lower shelf.'},
 {id:'bedside-table-lamp',name:'Bedside table with lamp',tiles:[1,1],light:true,note:'A compact brass and linen lamp on the drawer table; lighting deferred.'},
 {id:'refrigerator',name:'Enamel refrigerator',tiles:[1,1],note:'Separate freezer, rounded enamel corners and rear cooling coils.'},
 {id:'cabinet',name:'Double-door cabinet',tiles:[1,2],note:'A 1×2 cabinet with recessed panels, drawers and brass pulls.'},
 {id:'floor-lamp',name:'Pleated floor lamp',tiles:[1,1],light:true,note:'Weighted base, brass stem and a warm linen shade.'},
 {id:'gooseneck-sconce',name:'Green industrial sconce',tiles:[1,1],light:true,wall:true,note:'Wall-mounted gooseneck, green enamel shade and ivory underside.'},
 {id:'streetlight',name:'Single-arm streetlight',tiles:[1,1],light:true,note:'Fluted cast-iron base and a suspended industrial lantern.'},
 {id:'streetlight-double',name:'Double-arm streetlight',tiles:[2,1],light:true,note:'Paired industrial lanterns on a shared cast-iron post.'}
];
export const FURNITURE_FINISHES={honey:'Honey timber',cream:'Aged cream',sage:'Sage paint'};

// Geometry is expressed in gameplay tiles, Y up. Libraries own shared GPU
// resources; built roots only borrow them. Fixtures carry passive anchors,
// never Light objects or emissive materials. Day/night behavior is deferred.
export function createFurnitureLibrary(atlas,cargo){
 const geometries=new Map(),materials=new Map(),textures=[];let disposed=false;
 const geo=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 function material(name,color,cell,source=atlas){
  if(materials.has(name))return materials.get(name);
  const m=new THREE.MeshStandardMaterial({color,roughness:.88});
  if(cell){const t=source.clone();t.offset.set(cell[0],cell[1]);t.repeat.set(cell[2],cell[3]);t.needsUpdate=true;textures.push(t);m.map=t;}
  if(name.startsWith('wood:')){const tone=name.includes(':honey:')?[.22,.13,.065]:name.includes(':cream:')?[.48,.41,.30]:[.16,.20,.12];m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3('+tone.join(',')+'),diffuseColor.rgb,.62);');};m.customProgramCacheKey=()=>name;}
  materials.set(name,m);return m;
 }
 const iron=material('iron',0x343b37,[.69,.04,.28,.42],cargo),brass=material('brass',0xb8a071,[.35,.04,.28,.42],cargo),
  cream=material('enamel',0xe6dfbd,[.68,.03,.30,.44],cargo),green=material('green-enamel',0x386343,[.75,.12,.15,.26],cargo),
  linen=material('linen',0xd5c9a7,[.75,.12,.15,.26],cargo),cloth=material('blue-quilt',0x597f94,[.56,.07,.29,.32]),
  dark=material('recess',0x352e28),bulb=material('unlit-glass',0xded9bd),seam=material('quilt-seam',0x6b858e);
 function wood(skin,index=0){const cell=skin==='honey'?[.515+(index%3)*.055,.52,.30,.44]:[skin==='cream'?.345:.677,.53,.30,.44];return material('wood:'+skin+':'+index,skin==='honey'?0xc4ab83:skin==='cream'?0xd3c5a7:0xb1b99a,cell,skin==='honey'?atlas:cargo);}
 function mesh(root,g,m,p,r=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 const box=(root,m,p,s,r,bevel=.004)=>mesh(root,geo('box:'+s+':'+bevel,()=>softBox(...s,bevel,1)),m,p,r);
 const cyl=(root,m,p,rt,rb,h)=>mesh(root,geo(`c:${rt}:${rb}:${h}`,()=>new THREE.CylinderGeometry(rt,rb,h,20)),m,p);
 function tube(root,m,points,r=.018){return mesh(root,geo('tube:'+JSON.stringify(points)+':'+r,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,7,false)),m,[0,0,0]);}
 function anchor(root,name,p,direction){const a=new THREE.Object3D();a.name=name;a.position.set(...p);if(direction)a.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(...direction).normalize());a.userData={role:name.startsWith('emitter')?'future-light':'mount',enabled:false};root.add(a);return a;}
 function knob(root,p){cyl(root,brass,p,.023,.023,.033).rotation.x=Math.PI/2;}
 function panel(root,m,x,y,z,w,h){box(root,dark,[x,y,z],[w,h,.055]);box(root,m,[x,y,z+.036],[w-.075,h-.075,.03]);for(const xx of [x-w/2+.019,x+w/2-.019])box(root,m,[xx,y,z+.037],[.037,h,.045]);for(const yy of [y-h/2+.019,y+h/2-.019])box(root,m,[x,yy,z+.037],[w,.037,.045]);}
 function feet(root,m,w,d,h=.18){for(const x of [-w/2+.075,w/2-.075])for(const z of [-d/2+.075,d/2-.075])box(root,m,[x,h/2,z],[.09,h,.09]);}
 function shade(root,x,y,z,r=.24){
  const profile=[[.037,.14],[.063,.12],[.09,.05],[r*.7,-.035],[r,-.075],[r,-.09]];
  const g=geo('shade:'+r,()=>new THREE.LatheGeometry(profile.slice().reverse().map(v=>new THREE.Vector2(...v)),32));
  const outer=mesh(root,g,green,[x,y,z]);outer.name='green-metal-shade';
  const inside=material('shade-lining',0xd5d1b3);inside.side=THREE.BackSide;
  mesh(root,g,inside,[x,y,z]);
  mesh(root,geo('rim:'+r,()=>new THREE.TorusGeometry(r,.009,6,32)),green,[x,y-.083,z],[Math.PI/2,0,0]);
  cyl(root,iron,[x,y+.04,z],.038,.038,.08);
  mesh(root,geo('bulb',()=>new THREE.SphereGeometry(.048,12,8)),bulb,[x,y-.035,z]);
 }
 function build(id,skin='honey'){
  if(disposed)throw Error('Furniture library disposed');
  const form=FURNITURE_FORMS.find(f=>f.id===id);if(!form||!Object.hasOwn(FURNITURE_FINISHES,skin))throw Error('Invalid furniture form/finish');
  const root=new THREE.Group();root.name=id;const timber=wood(skin),warm=wood(skin,1);
  if(id==='dining-table'||id==='coffee-table'){
   const h=id==='dining-table'?.84:.46;
   for(let i=0;i<4;i++)box(root,wood(skin,i),[(i-1.5)*.224,h-.035,0],[.221,.07,1.87]);
   for(const x of [-.33,.33])for(const z of [-.77,.77]){
    const g=geo('leg:'+h,()=>{const g=new THREE.BoxGeometry(.085,h-.11,.085),p=g.attributes.position;for(let j=0;j<p.count;j++)if(p.getY(j)<0){p.setX(j,p.getX(j)*.72);p.setZ(j,p.getZ(j)*.72);}g.computeVertexNormals();return g;});mesh(root,g,timber,[x,(h-.11)/2,z]);
   }
   for(const x of [-.34,.34])box(root,warm,[x,h-.12,0],[.055,.13,1.61]);
   for(const z of [-.78,.78])box(root,warm,[0,h-.12,z],[.73,.13,.055]);
   if(id==='coffee-table')box(root,warm,[0,.13,0],[.70,.035,1.60]);
   for(const x of [-.28,.28])for(const z of [-.81,.81])cyl(root,brass,[x,h+.001,z],.009,.009,.003);
  }else if(id==='single-bed'){
   feet(root,timber,.86,1.86,.26);
   box(root,dark,[0,.26,0],[.83,.10,1.75]);
   for(const x of [-.425,.425])box(root,timber,[x,.32,0],[.06,.17,1.83]);
   for(const [z,h]of [[-.90,.94],[.90,.55]]){
    for(const x of [-.415,.415])box(root,timber,[x,h/2,z],[.075,h,.075]);
    panel(root,warm,0,h-.20,z,.79,.32);box(root,timber,[0,h,z],[.91,.045,.095]);
   }
   box(root,linen,[0,.405,0],[.78,.20,1.69],undefined,.035);
   box(root,cloth,[0,.505,.24],[.80,.055,1.17],undefined,.013);
   for(const x of [-.402,.402])box(root,cloth,[x,.405,.24],[.018,.22,1.17],undefined,.007);
   for(const z of [-.27,-.07,.13,.33,.53,.73])box(root,seam,[0,.534,z],[.76,.003,.007]);
   box(root,linen,[0,.548,-.59],[.59,.105,.31],[0,-.035,0],.042);
   box(root,cloth,[0,.559,-.22],[.80,.052,.18],undefined,.012);
  }else if(id==='bedside-table'||id==='bedside-table-lamp'){
   feet(root,timber,.63,.56,.15);box(root,warm,[0,.15,0],[.60,.04,.53]);
   for(const x of [-.285,.285])box(root,timber,[x,.34,0],[.045,.40,.51]);
   box(root,timber,[0,.37,-.24],[.55,.43,.03]);box(root,timber,[0,.58,0],[.66,.05,.59]);
   box(root,dark,[0,.465,0],[.55,.17,.48]);panel(root,warm,0,.46,.25,.55,.17);knob(root,[0,.46,.305]);
   if(id==='bedside-table-lamp'){const lamp=build('floor-lamp',skin).root;lamp.name='bedside-lamp';lamp.scale.setScalar(.48);lamp.position.set(0,.605,-.045);root.add(lamp);}
  }else if(id==='cabinet'){
   // Long axis is local Z, so the cabinet is exactly a 1×2 footprint.
   const body=new THREE.Group();body.rotation.y=Math.PI/2;root.add(body);
   feet(body,timber,1.85,.67,.15);box(body,timber,[0,.70,0],[1.82,1.12,.63]);
   box(body,warm,[0,1.285,0],[1.91,.07,.74]);box(body,warm,[0,.18,0],[1.87,.07,.70]);
   for(const x of [-.45,.45]){panel(body,warm,x,.62,.325,.85,.76);knob(body,[x+(x<0?.31:-.31),.84,.39]);panel(body,timber,x,1.135,.325,.85,.20);knob(body,[x,1.135,.39]);}
  }else if(id==='refrigerator'){
   feet(root,iron,.73,.70,.09);box(root,cream,[0,.78,0],[.76,1.43,.68],undefined,.025);
   box(root,dark,[0,.79,.348],[.72,1.34,.025]);
   for(const [y,h]of [[.59,.98],[1.28,.35]])box(root,cream,[0,y,.377],[.73,h,.082],undefined,.018);
   for(const y of [.94,1.26])tube(root,brass,[[-.25,y-.07,.424],[-.25,y-.07,.46],[-.25,y+.07,.46],[-.25,y+.07,.424]],.014);
   for(let i=0;i<7;i++)box(root,iron,[(i-3)*.077,.09,.357],[.04,.045,.012]);
   for(let i=0;i<8;i++)tube(root,iron,[[-.26,.30+i*.13,-.35],[-.29,.34+i*.13,-.37],[.29,.34+i*.13,-.37],[.26,.39+i*.13,-.35]],.01);
   box(root,brass,[.20,1.35,.424],[.12,.028,.005]);
  }else if(id==='floor-lamp'){
   cyl(root,iron,[0,.035,0],.25,.28,.07);cyl(root,brass,[0,.078,0],.11,.18,.045);cyl(root,brass,[0,.82,0],.021,.028,1.48);
   const g=geo('pleated-shade',()=>{const g=new THREE.CylinderGeometry(.17,.31,.42,64,1,true),p=g.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getX(i),p.getZ(i)),f=1+.035*Math.cos(a*32);p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f);}g.computeVertexNormals();return g;});
   const shadeMat=material('pleated-linen',0xd3be91,[.75,.12,.15,.26],cargo);shadeMat.side=THREE.DoubleSide;mesh(root,g,shadeMat,[0,1.55,0]);
   for(const [y,r]of [[1.34,.31],[1.76,.17]])mesh(root,geo('linen-rim:'+r,()=>new THREE.TorusGeometry(r,.009,6,32)),brass,[0,y,0],[Math.PI/2,0,0]);
   cyl(root,iron,[0,1.43,0],.035,.035,.10);mesh(root,geo('bulb',()=>new THREE.SphereGeometry(.048,12,8)),bulb,[0,1.52,0]);
   tube(root,brass,[[.07,1.44,0],[.085,1.28,0]],.005);anchor(root,'emitter-0',[0,1.48,0],[0,-1,0]);anchor(root,'mount',[0,0,0]);
  }else if(id==='gooseneck-sconce'){
   // Origin lies on the mounting wall at floor level; shade projects forward.
   cyl(root,iron,[0,1.72,0],.11,.11,.045).rotation.x=Math.PI/2;
   tube(root,green,[[0,1.73,.01],[0,1.79,.10],[0,1.99,.18],[0,2.04,.38],[0,1.93,.55],[0,1.80,.55]],.022);
   shade(root,0,1.67,.55,.23);for(const y of [1.65,1.79])box(root,brass,[0,y,.027],[.019,.019,.006]);
   anchor(root,'emitter-0',[0,1.62,.55],[0,-1,0]);anchor(root,'mount',[0,1.72,0],[0,0,-1]);
  }else if(id.startsWith('streetlight')){
   cyl(root,iron,[0,.055,0],.19,.22,.11);cyl(root,iron,[0,.28,0],.095,.15,.40);cyl(root,iron,[0,1.66,0],.038,.068,2.40);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(root,iron,[Math.sin(a)*.11,.27,Math.cos(a)*.11],.01,.013,.28);}
   for(const y of [.49,2.6])cyl(root,brass,[0,y,0],.065,.065,.035);
   const arms=id==='streetlight-double'?[-1,1]:[1];
   for(const [i,s]of arms.entries()){
    const reach=id==='streetlight-double'?.66:.24;
    tube(root,iron,[[0,2.65,0],[s*.05,2.84,0],[s*reach*.65,2.95,0],[s*reach,2.85,0],[s*reach,2.69,0]],.025);
    shade(root,s*reach,2.57,0,.22);anchor(root,'emitter-'+i,[s*reach,2.51,0],[0,-1,0]);
   }
   anchor(root,'mount',[0,0,0]);
  }
  root.userData={kind:id,tiles:[...form.tiles],placement:form.wall?'wall':'ground',lighting:'deferred'};root.updateMatrixWorld(true);
  return {root,form,skin,bounds:new THREE.Box3().setFromObject(root)};
 }
 return {build,stats:()=>({geometries:geometries.size,materials:materials.size,textures:textures.length}),dispose(){if(disposed)return;disposed=true;for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();geometries.clear();materials.clear();textures.length=0;}};
}
