import * as T from './vendor/three.module.js';

export const CHAIR_PAINT='../assets/environment/painted-chairs/paint-atlas-v1.png';
export const CHAIR_FORMS=Object.freeze([
 {id:'wingback',name:'Wingback',finishes:['russet','teal']},
 {id:'wood',name:'Wooden chair',finishes:['honey','walnut']},
 {id:'metal',name:'Metal chair',finishes:['sage','iron']},
 {id:'desk',name:'Desk chair',finishes:['teal','russet']}
]);
// Native scene coordinates: Y up, +Z forward. All chairs share this contact
// contract. It defines furniture targets, not species-specific bone positions.
export const CHAIR_CONTACT=Object.freeze({
 seatHeight:.48,seatWidth:.84,seatDepth:.62,seatCenter:Object.freeze([0,.48,-.01]),
 pelvis:Object.freeze([0,.62,-.03]),feet:Object.freeze([Object.freeze([-.23,0,.43]),Object.freeze([.23,0,.43])]),
 approach:Object.freeze([0,0,.80]),back:Object.freeze([0,.91,-.36]),
 armInside:.44,armTop:.72,bodyWidth:.80,bodyFront:.32,bodyRear:-.30,
 tailOpening:Object.freeze({width:.62,bottom:.48,top:.73}),
 needsSpeciesAdapter:true
});
const cells={redBack:[0,0],redSeat:[1,0],redSide:[2,0],walnut:[3,0],
 woodSeat:[0,1],woodBack:[1,1],wood:[2,1],end:[3,1],
 metalSeat:[0,2],metalBack:[1,2],metal:[2,2],iron:[3,2],
 tealBack:[0,3],tealSeat:[1,3],tealSide:[2,3],rubber:[3,3]};
// Measured painted boundaries, 1254px atlas. Insets prevent neighboring panels
// from bleeding into a surface when the chair is viewed at gameplay size.
const columns=[0,315,629,941,1254],rows=[0,312,628,924,1254],inset=5;
export function chairPaintRect(cell){const [c,r]=cells[cell]||[];if(c===undefined)throw Error('Unknown chair paint: '+cell);return [(columns[c]+inset)/1254,1-(rows[r+1]-inset)/1254,(columns[c+1]-columns[c]-2*inset)/1254,(rows[r+1]-rows[r]-2*inset)/1254];}

export function createChairLibrary(atlas){
 const geometries=new Map(),roots=new Set();let disposed=false,greyMode=false;
 const material=new T.MeshStandardMaterial({map:atlas,roughness:1,metalness:0}),grey=new T.MeshStandardMaterial({color:0xa4a79b,roughness:1});
 material.name='Painted chair skin';
 const cache=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 function painted(g,faces){
  g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);g.computeBoundingBox();const b=g.boundingBox,s=b.getSize(new T.Vector3());
  for(let i=0;i<p.count;i++){
   const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));let u,v,cell;
   if(ay>=ax&&ay>=az){u=(p.getX(i)-b.min.x)/s.x;v=(p.getZ(i)-b.min.z)/s.z;cell=n.getY(i)>0?faces.top:faces.side;}
   else if(az>=ax){u=(p.getX(i)-b.min.x)/s.x;v=(p.getY(i)-b.min.y)/s.y;cell=n.getZ(i)>0?faces.front:faces.side;}
   else {u=(p.getZ(i)-b.min.z)/s.z;v=(p.getY(i)-b.min.y)/s.y;cell=faces.side;}
   const [x,y,w,h]=chairPaintRect(cell);uv[i*2]=x+u*w;uv[i*2+1]=y+v*h;
  }g.setAttribute('uv',new T.BufferAttribute(uv,2));return g;
 }
 function add(root,name,g,position,rotation=[0,0,0]){const m=new T.Mesh(g,greyMode?grey:material);m.name=name;m.position.set(...position);m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 function box(root,name,size,position,cell,rotation){const faces=typeof cell==='string'?{front:cell,top:cell,side:cell}:cell;return add(root,name,cache('box:'+size+JSON.stringify(faces),()=>painted(new T.BoxGeometry(...size),faces)),position,rotation);}
 function panel(root,name,size,position,faces,rotation){
  // An eight-sided extrusion: softened silhouette, 28 triangles, no modeled
  // buttons, seams, leather channels or stamped metal ribs.
  const [w,h,d]=size,r=Math.min(w,h)*.08,key='panel:'+size+JSON.stringify(faces);
  const g=cache(key,()=>{const s=new T.Shape();const pts=[[-w/2+r,-h/2],[w/2-r,-h/2],[w/2,-h/2+r],[w/2,h/2-r],[w/2-r,h/2],[-w/2+r,h/2],[-w/2,h/2-r],[-w/2,-h/2+r]];s.moveTo(...pts[0]);for(const p of pts.slice(1))s.lineTo(...p);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d,steps:1,bevelEnabled:false,curveSegments:1});g.translate(0,0,-d/2);return painted(g,faces);});
  return add(root,name,g,position,rotation);
 }
 function bar(root,name,a,b,width,cell,tube=false){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),length=start.distanceTo(end),faces={front:cell,top:cell,side:cell};
  const g=cache('bar:'+length.toFixed(8)+':'+width+':'+cell+':'+tube,()=>painted(tube?new T.CylinderGeometry(width/2,width/2,length,6,1):new T.BoxGeometry(width,length,width),faces));
  const mesh=add(root,name,g,start.clone().add(end).multiplyScalar(.5).toArray());mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return mesh;
 }
 function build(id,{finish}={}){
  if(disposed)throw Error('Chair library disposed');const form=CHAIR_FORMS.find(f=>f.id===id);if(!form)throw Error('Unknown chair '+id);finish??=form.finishes[0];if(!form.finishes.includes(finish))throw Error('Unknown chair finish '+finish);
  const root=new T.Group();root.name=form.name;roots.add(root);
  const upholstered=id==='wingback'||id==='desk',red=finish==='russet',base=finish==='walnut'?'walnut':id==='wood'?'wood':id==='wingback'?'walnut':id==='metal'&&finish==='sage'?'metal':'iron';
  const side=upholstered?(red?'redSide':'tealSide'):base,seat=upholstered?(red?'redSeat':'tealSeat'):id==='metal'&&finish==='sage'?'metalSeat':id==='wood'&&finish==='honey'?'woodSeat':base,back=upholstered?(red?'redBack':'tealBack'):id==='metal'&&finish==='sage'?'metalBack':id==='wood'&&finish==='honey'?'woodBack':base;
  panel(root,'Shared seat',[.84,.62,.08],[0,.44,-.01],{front:seat,top:side,side},[-Math.PI/2,0,0]);
  if(id==='desk'){
   bar(root,'Swivel column',[0,.12,-.01],[0,.40,-.01],.085,'iron',true);
   // Five spokes avoid the forward heel channel. Wheels are deliberately
   // simple hexagonal cylinders; rubber, axles and wear are painted.
   for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2,x=Math.sin(a)*.34,z=-.01+Math.cos(a)*.34;
    bar(root,'Caster spoke',[0,.105,-.01],[x,.065,z],.035,'iron');
    const g=cache('caster',()=>painted(new T.CylinderGeometry(.055,.055,.055,6,1).rotateY(Math.PI/6),{front:'rubber',top:'rubber',side:'rubber'}));add(root,'Caster',g,[x,.055,z],[0,0,Math.PI/2]);
   }
  }else{
   for(const s of [-1,1])for(const z of [-.275,.235])bar(root,'Leg',[s*.355,0,z],[s*.355,.405,z],id==='metal'?.044:.054,base,id==='metal');
   // Side stretchers remain outside the shared foot/heel space. No front rail.
   for(const s of [-1,1])bar(root,'Side stretcher',[s*.35,.18,-.275],[s*.35,.18,.235],.035,base,id==='metal');
  }
  for(const s of [-1,1])bar(root,'Back support',[s*.355,.40,-.343],[s*.355,id==='wingback'?1.35:1.16,-.45],id==='metal'?.04:.05,base,id==='metal');
  if(id==='wood'){
   for(const y of [.85,1.065])panel(root,'Wooden back slat',[.79,.155,.045],[0,y,-.405-(y-.85)*.08],{front:back,top:base,side:base},[-.08,0,0]);
  }else{
   const height=id==='wingback'?.61:.39,y=.75+height/2;
   panel(root,'Back cushion',[id==='wingback'?.90:.85,height,id==='metal'?.034:.075],[0,y,-.424],{front:back,top:side,side},[-.10,0,0]);
  }
  if(id==='wingback')for(const s of [-1,1]){
   // Narrow outer shell leaves the same .88 arm gap and forward torso sweep.
   const wing=cache('wing:'+side,()=>{
    const shape=new T.Shape(),outline=[[-.20,.695],[-.19,.82],[-.115,1.28],[-.19,1.36],[-.465,1.34],[-.425,.695]];
    shape.moveTo(-outline[0][0],outline[0][1]);for(const [z,y]of outline.slice(1))shape.lineTo(-z,y);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.06,steps:1,bevelEnabled:false,curveSegments:1});g.translate(0,0,-.03);g.rotateY(Math.PI/2);return painted(g,{front:side,top:side,side});
   });add(root,'Wing',wing,[s*.47,0,0]);
   box(root,'Lower back surround',[.10,.30,.10],[s*.395,.60,-.36],side);
   panel(root,'Padded arm',[.06,.40,.075],[s*.47,.6825,-.05],{front:side,top:side,side},[-Math.PI/2,0,0]);
   box(root,'Arm support',[.055,.24,.28],[s*.47,.5525,-.08],side);
  }
  const anchors={};for(const [name,point]of Object.entries({seat:CHAIR_CONTACT.seatCenter,pelvis:CHAIR_CONTACT.pelvis,back:CHAIR_CONTACT.back,approach:CHAIR_CONTACT.approach,leftFoot:CHAIR_CONTACT.feet[0],rightFoot:CHAIR_CONTACT.feet[1]})){const a=new T.Object3D();a.name='chair-'+name;a.position.fromArray(point);root.add(a);anchors[name]=a;}
  root.userData.chair={id,finish,footprint:[1,1],contact:CHAIR_CONTACT,gameplayIntegrated:false};
  return {root,anchors,form,finish,dispose(){root.removeFromParent();roots.delete(root);}};
 }
 function setGrey(value){greyMode=!!value;for(const root of roots)root.traverse(p=>{if(p.isMesh)p.material=greyMode?grey:material;});}
 return {build,setGrey,material,stats:()=>({geometries:geometries.size,materials:2,models:roots.size}),dispose(){if(disposed)return;disposed=true;for(const r of roots)r.removeFromParent();roots.clear();for(const g of geometries.values())g.dispose();geometries.clear();material.dispose();grey.dispose();}};
}
