import * as T from './vendor/three.module.js';

export const HELICOPTER_PAINT='../assets/environment/utility-helicopter/paint-atlas-v1.png';
export const HELICOPTER_REFERENCE='../assets/environment/utility-helicopter/reference-v1.png';
export const HELICOPTER_DIMENSIONS=Object.freeze({bodyLength:8.65,rotorDiameter:9.6,cabinWidth:1.72,height:3.27,truckLength:4.7});
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const cells={olive:[0,0],engine:[1,0],glass:[2,0],metal:[3,0],burn:[0,1],torn:[1,1],fabric:[2,1],ash:[3,1]};
// The atlas is a regular 4×2 painting. Insets omit the cell borders. Glass and
// metal use interior paint patches, avoiding the atlas's drawn panel outlines.
export function helicopterPaintRect(cell){
 const c=cells[cell];if(!c)throw Error('Unknown helicopter paint '+cell);
 const patch=cell==='glass'?[.12,.12,.76,.76]:cell==='metal'?[.08,.03,.80,.40]:[.015,.015,.97,.97];
 return [(c[0]+patch[0])/4,1-(c[1]+patch[1]+patch[3])/2,patch[2]/4,patch[3]/2];
}

export function createUtilityHelicopter(atlas,{state='intact'}={}){
 if(!['intact','crashed'].includes(state))throw Error('Unknown helicopter state '+state);
 const crashed=state==='crashed',root=new T.Group(),parts=[],geometries=new Set(),materials=new Map();let disposed=false;
 root.name=state+' utility helicopter';
 const grey=new T.MeshStandardMaterial({color:0xaaa79a,roughness:1,side:T.DoubleSide});
 function material(cell){if(!materials.has(cell))materials.set(cell,new T.MeshStandardMaterial({map:atlas,roughness:cell==='glass'?.62:1,metalness:0,side:T.DoubleSide}));return materials.get(cell);}
 function paint(g,cell){
  if(!g.attributes.normal)g.computeVertexNormals();g.computeBoundingBox();const b=g.boundingBox,s=b.getSize(V()),p=g.attributes.position,n=g.attributes.normal,uv=[],r=helicopterPaintRect(cell);
  for(let i=0;i<p.count;i++){
   const a=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))],q=V().fromBufferAttribute(p,i).sub(b.min),u=a[0]>a[1]&&a[0]>a[2]?q.z/(s.z||1):q.x/(s.x||1),v=a[1]>a[0]&&a[1]>a[2]?q.z/(s.z||1):q.y/(s.y||1);
   uv.push(r[0]+T.MathUtils.clamp(u,0,1)*r[2],r[1]+T.MathUtils.clamp(v,0,1)*r[3]);
  }g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();geometries.add(g);return g;
 }
 function add(parent,name,g,cell,position=[0,0,0],rotation=[0,0,0],role='body'){
  const m=new T.Mesh(paint(g,cell),material(cell));m.name=name;m.userData={paint:cell,component:name,role};m.position.fromArray(position);m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;parent.add(m);parts.push(m);return m;
 }
 const box=(p,n,size,pos,cell,rot=[0,0,0],role='body')=>add(p,n,new T.BoxGeometry(...size),cell,pos,rot,role);
 function rod(p,n,a,b,r,cell='metal',segments=8,role='body'){
  const A=V(...a),B=V(...b),m=add(p,n,new T.CylinderGeometry(r,r,A.distanceTo(B),segments,1),cell,A.clone().add(B).multiplyScalar(.5).toArray(),[0,0,0],role);m.quaternion.setFromUnitVectors(V(0,1,0),B.sub(A).normalize());return m;
 }
 function path(p,n,points,r,cell='metal',role='body'){
  const curve=new T.CatmullRomCurve3(points.map(a=>V(...a)),false,'centripetal');return add(p,n,new T.TubeGeometry(curve,(points.length-1)*3,r,6,false),cell,[0,0,0],[0,0,0],role);
 }
 function face(p,n,points,cell,role='body'){
  const g=new T.BufferGeometry(),ix=[];g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));for(let i=1;i<points.length-1;i++)ix.push(0,i,i+1);g.setIndex(ix);return add(p,n,g,cell,[0,0,0],[0,0,0],role);
 }
 function frame(p,n,points,r=.032,cell='olive'){
  for(let i=0;i<points.length;i++)rod(p,n+' '+i,points[i],points[(i+1)%points.length],r,cell,6);
 }
 const ring=[[-.70,1],[.70,1],[1,.82],[1,.20],[.70,0],[-.70,0],[-1,.20],[-1,.82]];
 function loft(p,n,sections,cell,omit=()=>false,capStart=true){
  const positions=[],ix=[];for(const [x,low,high,w]of sections)for(const [z,y]of ring)positions.push(x,low+(high-low)*y,w*z);
  for(let j=0;j<sections.length-1;j++)for(let k=0;k<8;k++){if(omit(j,k))continue;const a=j*8+k,b=j*8+(k+1)%8,c=a+8,d=b+8;ix.push(a,b,c,b,d,c);}
  for(const [j,flip]of [[0,false],[sections.length-1,true]]){if(j===0&&!capStart)continue;for(let k=1;k<7;k++){const a=j*8,b=a+k,c=a+k+1;ix.push(...(flip?[a,c,b]:[a,b,c]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(ix);g.computeVertexNormals();return add(p,n,g,cell);
 }
 function fin(p,n,points,thickness,cell){
  const s=new T.Shape();s.moveTo(...points[0]);for(const q of points.slice(1))s.lineTo(...q);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,steps:1});g.translate(0,0,-thickness/2);return add(p,n,g,cell);
 }
 // Rotated tapered parts must use their actual vertices: rotated local AABB
 // corners include empty space and would leave the detached tail hovering.
 function ground(p,lift=0){root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(p,true);p.position.y+=lift-b.min.y;root.updateMatrixWorld(true);}
 const bodyPaint=crashed?'burn':'olive',cabin=new T.Group();cabin.name='Cabin assembly';root.add(cabin);
 const cabinSections=[[-1.95,.65,1.78,.55],[-1.60,.56,2.08,.83],[.30,.55,2.22,.86],[.88,.57,2.07,.82],[1.53,.64,1.68,.71],[1.94,.73,1.32,.53],[2.23,.94,1.05,.08]];
 loft(cabin,'Fuselage shell',cabinSections,bodyPaint,(j,k)=>(j>=2&&j<=3&&[0,2,6].includes(k))||(crashed&&j===1&&k===2));
 box(cabin,'Cabin deck',[3.15,.10,1.42],[-.25,.76,0],crashed?'torn':'metal');
 box(cabin,'Rear cabin bulkhead',[.08,1.05,1.40],[-1.52,1.30,0],crashed?'torn':'fabric');
 for(const s of [-1,1]){
  box(cabin,'Pilot seat '+s,[.45,.12,.42],[.57,.99,s*.40],'fabric');
  box(cabin,'Pilot seat back '+s,[.10,.54,.43],[.34,1.23,s*.40],'fabric',[0,0,-.10]);
  box(cabin,'Cabin bench '+s,[1.18,.17,.29],[-.74,.99,s*.55],'fabric');
  box(cabin,'Cabin bench back '+s,[1.18,.40,.08],[-.74,1.21,s*.67],'fabric');
 }
 box(cabin,'Instrument coaming',[.32,.18,1.18],[1.05,1.21,0],'metal',[0,0,-.10]);
 // Two distinct windscreens follow the sloped roof; no opaque body face sits
 // behind them, so missing wreck glazing reveals the actual cockpit interior.
 for(const s of [-1,1]){
  const wind=[[.32,2.245,s*.025],[.32,2.245,s*.602],[.88,2.095,s*.574],[1.555,1.707,s*.498],[1.555,1.707,s*.025],[.88,2.095,s*.025]];
  if(!crashed){face(cabin,'Windscreen upper '+s,[wind[0],wind[1],wind[2],wind[5]],'glass');face(cabin,'Windscreen lower '+s,[wind[5],wind[2],wind[3],wind[4]],'glass');}
  frame(cabin,'Windscreen frame '+s,wind,.035,bodyPaint);
  const side=[[.30,1.14,s*.887],[.30,1.945,s*.887],[.88,1.825,s*.846],[1.53,1.525,s*.736],[1.53,1.14,s*.736],[.88,1.14,s*.846]];
  // The window is a real opening in the shell. These strips retain only the
  // solid door below the glass, including when the wreck's pane is absent.
  for(const [i,a,b]of [[0,[.30,.884,.86],[.88,.87,.82]],[1,[.88,.87,.82],[1.53,.848,.71]]])face(cabin,'Pilot lower door '+s+' '+i,[[a[0],a[1],s*a[2]],[a[0],1.14,s*a[2]],[b[0],1.14,s*b[2]],[b[0],b[1],s*b[2]]],bodyPaint);
  if(!crashed||s<0){face(cabin,'Pilot side rear glass '+s,[side[0],side[1],side[2],side[5]],crashed?'torn':'glass');face(cabin,'Pilot side forward glass '+s,[side[5],side[2],side[3],side[4]],crashed?'torn':'glass');}
  frame(cabin,'Pilot door frame '+s,side,.032,bodyPaint);
  const door=[[-1.47,.84,s*.867],[-1.47,1.85,s*.867],[.02,1.93,s*.881],[.02,.84,s*.881]];
  if(!crashed||s<0){face(cabin,'Sliding cabin door '+s,door,bodyPaint);for(const [a,b]of [[-1.37,-.77],[-.68,-.09]]){const glass=[[a,1.30,s*.895],[a,1.78,s*.895],[b,1.81,s*.895],[b,1.30,s*.895]];face(cabin,'Cabin glass '+s+' '+a,glass,crashed?'glass':'glass');frame(cabin,'Cabin window frame '+s+' '+a,glass,.025,bodyPaint);}}
  frame(cabin,'Cabin door rim '+s,door,.030,bodyPaint);
  rod(cabin,'Door runner '+s,[-1.53,1.99,s*.85],[.12,2.02,s*.85],.021,'metal',6);
  rod(cabin,'Door handle '+s,[-.10,1.09,s*.92],[.05,1.09,s*.92],.025,'metal',6);
  if(!crashed)path(cabin,'Landing skid '+s,[[-1.82,.22,s*.93],[-1.64,.065,s*.93],[1.30,.065,s*.93],[1.66,.26,s*.93]],.065,'metal');
 }
 if(!crashed)for(const x of [-1.10,.95])path(cabin,'Skid cross tube '+x,[[x,.16,-.92],[x,.48,-.62],[x,.55,0],[x,.48,.62],[x,.16,.92]],.065,'metal');
 loft(cabin,'Single turbine cowling',[[-1.52,2.00,2.30,.39],[-1.23,2.02,2.69,.53],[-.18,2.04,2.73,.49],[.30,2.06,2.36,.34]],crashed?'burn':'engine');
 rod(cabin,'Exhaust outer',[-1.53,2.38,0],[-1.91,2.36,0],.235,crashed?'torn':'metal',12);
 add(cabin,'Exhaust dark throat',new T.CircleGeometry(.177,12),'ash',[-1.925,2.36,0],[0,-Math.PI/2,0]);
 rod(cabin,'Mast',[-.35,2.56,0],[-.35,crashed?2.88:3.15,0],.063,'metal');
 const mastAnchor=new T.Object3D();mastAnchor.name='Mast break anchor';mastAnchor.position.set(-.35,2.87,0);cabin.add(mastAnchor);
 if(crashed){cabin.scale.y=.90;cabin.rotation.set(.28,0,.025);ground(cabin);}
 else ground(cabin);

 const tail=new T.Group();tail.name='Tail assembly';root.add(tail);
 loft(tail,'Tapered tail boom',[[-1.84,1.02,1.84,.46],[-2.25,1.19,1.92,.36],[-4.50,1.65,2.06,.18],[-5.84,1.84,2.11,.105]],bodyPaint,()=>false,!crashed);
 if(crashed){
  face(tail,'Dark broken tail interior',ring.map(([z,y])=>[-2.25,1.19+.73*y,.34*z]),'ash');
  for(let i=0;i<8;i++){const a=ring[i],b=ring[(i+1)%8];face(tail,'Torn tail lip '+i,[[-1.84,1.02+.82*a[1],.46*a[0]],[-1.84,1.02+.82*b[1],.46*b[0]],[-1.61-(i%3)*.08,1.02+.82*(a[1]+b[1])*.5+(i%2?.06:-.035),.48*(a[0]+b[0])*.5]],'torn');}
 }
 fin(tail,'Tail fin',[[-5.90,1.87],[-5.51,2.02],[-6.18,2.98],[-6.42,2.94],[-6.21,1.93]],.105,bodyPaint);
 for(const s of [-1,1]){
  face(tail,'Tailplane upper '+s,[[-4.04,1.94,s*.12],[-4.22,1.92,s*1.12],[-4.85,1.88,s*1.08],[-4.70,1.90,s*.12]],bodyPaint);
  face(tail,'Tailplane lower '+s,[[-4.04,1.90,s*.12],[-4.70,1.86,s*.12],[-4.85,1.85,s*1.08],[-4.22,1.88,s*1.12]],bodyPaint);
 }
 rod(tail,'Tail rotor shaft',[-6.10,2.46,0],[-6.10,2.46,.29],.067,'metal');
 const tailRotor=new T.Group();tailRotor.name='Tail rotor';tailRotor.position.set(-6.10,2.46,.32);tailRotor.rotation.z=.48;tail.add(tailRotor);
 box(tailRotor,'Two blade tail rotor',[.125,1.52,.045],[0,0,0],'metal',[0,0,0],'overhead');
 for(const s of [-1,1])box(tailRotor,'Tail rotor tip '+s,[.127,.13,.048],[0,s*.675,0],'olive',[0,0,0],'overhead');
 // The broken root and one stabilizer edge both bear on the ground; the
 // detached boom cannot balance with its heavy root hanging off one fin.
 if(crashed){tail.rotation.set(.90,.19,-.275);tail.position.set(-.12,0,.60);ground(tail,.015);}

 if(!crashed){
  const rotor=new T.Group();rotor.name='Main rotor assembly';rotor.position.set(-.35,3.145,0);rotor.rotation.y=.27;root.add(rotor);
  rod(rotor,'Rotor hub',[-.26,0,0],[.26,0,0],.13,'metal',10,'overhead');
  rod(rotor,'Stabilizer bar',[0,-.09,-.86],[0,-.09,.86],.022,'metal',6,'overhead');
  for(const s of [-1,1]){
   box(rotor,'Stabilizer weight '+s,[.13,.10,.15],[0,-.09,s*.83],'metal',[0,0,0],'overhead');
   box(rotor,'Main rotor blade '+s,[4.55,.055,.23],[s*2.525,-.015,0],'metal',[0,0,-s*.004],'overhead');
   box(rotor,'Main rotor tip '+s,[.22,.056,.232],[s*4.68,-.024,0],'olive',[0,0,-s*.004],'overhead');
  }
 }else{
  root.updateMatrixWorld(true);const hub=mastAnchor.getWorldPosition(V());
  rod(root,'Broken rotor hub',hub.clone().add(V(-.19,0,0)).toArray(),hub.clone().add(V(.19,0,0)).toArray(),.13,'torn',10);
  // Both blade fragments lead from the retained hub to supported ground tips.
  for(const [s,end]of [[1,[3.72,.12,1.36]],[-1,[-3.45,.12,-1.50]]]){
   const mid=hub.clone().lerp(V(...end),.47).add(V(0,.28,s*.12)),chain=[hub,mid,V(...end)];
   for(let i=0;i<2;i++){
    const a=chain[i],b=chain[i+1],m=box(root,'Folded main rotor '+s+' '+i,[1,.09,.24],[0,0,0],'metal');
    const fit=()=>{const delta=b.clone().sub(a);m.scale.x=delta.length();m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(1,0,0),delta.normalize());root.updateMatrixWorld(true);};fit();
    // The hub and bend stay attached while the outer tip settles onto the
    // ground. Measure vertices, not the nominal centre-line endpoint.
    if(i===1)for(let pass=0;pass<5;pass++){b.y-=new T.Box3().setFromObject(m,true).min.y-.002;fit();}
   }
  }
  for(const s of [-1,1]){
   const rails=[[-1.67,.10,s*.94],[-.90,.062,s*1.05],[.25,.067,s*1.04],[1.41,.17,s*.86]];
   ground(path(root,'Buckled skid '+s,rails,.060,'metal'),.002);
   for(const x of [-.90,.90]){const attach=cabin.localToWorld(V(x,.66,s*.67));rod(root,'Bent skid strut '+s+' '+x,[x,.11,s*1.0],attach.toArray(),.055,'torn',6);}
  }
  // A torn door lies beside the open cabin rather than vanishing or hovering.
  const loose=new T.Group();loose.name='Detached cabin door';loose.position.set(-.70,.02,1.45);loose.rotation.set(-Math.PI/2,0,.18);root.add(loose);
  face(loose,'Fallen door lower',[[ -.70,0,0],[.69,0,0],[.66,.48,.06],[-.70,.53,.02]],'burn');
  frame(loose,'Fallen door window rim',[[-.70,.48,.02],[-.70,1.02,0],[.67,1.02,.05],[.66,.48,.06]],.031,'torn');ground(loose,.005);
  for(let i=0;i<9;i++){
   const x=-1.8+(i%4)*.86,z=(i%2?1:-1)*(1.05+(i%3)*.21),g=new T.DodecahedronGeometry(.09+(i%3)*.035,0),m=add(root,'Ground fragment '+i,g,i%3?'torn':'glass',[x,0,z],[i*.8,i*.43,0],'debris');m.scale.set(1.7,.28,1);ground(m,.005);
  }
  const stub=cabin.localToWorld(V(-1.96,1.36,0));for(const s of [-1,1])rod(root,'Tail break rib '+s,stub.clone().add(V(.05,.15,s*.30)).toArray(),stub.clone().add(V(-.26,-.10,s*.25)).toArray(),.025,'torn',6);
 }
 root.updateMatrixWorld(true);
 function diagnostics(){
  root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root,true),solid=new T.Box3();let triangles=0;
  for(const p of parts){triangles+=(p.geometry.index?.count||p.geometry.attributes.position.count)/3;if(p.userData.role!=='overhead')solid.union(new T.Box3().setFromObject(p,true));}
  const main=root.getObjectByName('Main rotor assembly');
  return {state,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},bodyBounds:{min:solid.min.toArray(),max:solid.max.toArray()},scale:root.scale.toArray(),painted:true,gameplayIntegrated:false,rotorClearance:main?{nominalRadius:4.8,worldBottomY:new T.Box3().setFromObject(main,true).min.y,overhead:true}:null};
 }
 root.userData.helicopter={state,front:'+X',up:'+Y',stationary:true,gameplayIntegrated:false};
 return {root,parts,diagnostics,setGrey(value){if(disposed)throw Error('Helicopter disposed');for(const p of parts)p.material=value?grey:material(p.userData.paint);},dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();grey.dispose();}};
}
