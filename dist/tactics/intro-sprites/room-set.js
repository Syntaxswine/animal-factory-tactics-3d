// The overseas radio room around Codex's hen and desk (the 3D study's
// intro-radio-room.js), built for tools/bake-intro-room.mjs. The architect,
// 2026-10-14, on round 1's painted backdrop: "the flat background radios, map
// and lamp look noticeably simpler than the hen and foreground equipment.
// Bring their shading and paint treatment closer together." So the room is
// modelled and lit like the study's desk and transceiver, in the same atlas
// paint (strategic-sites material-atlas.png), and goes through the same bake:
// one render, inked and split-toned together.
//
// Everything takes three.js as `T` (no import): the bake runs it inside the
// study page. Room units are the study's: the hen at the origin facing +x,
// y up, +z her right; the desk in front of her, its top at y .915.
import {fbm,rng} from './crash-sector.js';

// The study's paint kit (intro-paint.js), with a tint: each part maps its
// whole UV range into one cell of the 4 x 2 atlas (0 red, 1 cream, 2 olive,
// 3 pale concrete; 4 grey metal, 5 black metal, 6 rust, 7 dark concrete).
export function roomKit(T,atlas){
 const mats=new Map(),geos=new Set(),own=new Set();
 const paint=tint=>{if(!mats.has(tint))mats.set(tint,new T.MeshStandardMaterial({map:atlas,color:tint,roughness:1,side:T.DoubleSide}));return mats.get(tint);};
 function add(parent,name,g,cell=2,p=[0,0,0],r=[0,0,0],tint=0xffffff,material=null){
  const uv=g.attributes.uv;
  if(uv&&!material){let u0=Infinity,v0=Infinity,u1=-Infinity,v1=-Infinity;for(let i=0;i<uv.count;i++){u0=Math.min(u0,uv.getX(i));v0=Math.min(v0,uv.getY(i));u1=Math.max(u1,uv.getX(i));v1=Math.max(v1,uv.getY(i));}
   for(let i=0;i<uv.count;i++)uv.setXY(i,(cell%4+.025+.95*(uv.getX(i)-u0)/(u1-u0||1))/4,(cell<4?.5:0)+.012+.476*(uv.getY(i)-v0)/(v1-v0||1));}
  geos.add(g);const m=new T.Mesh(g,material||paint(tint));m.name=name;m.position.fromArray(p);m.rotation.set(...r);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const box=(parent,name,size,p,cell=2,r=[0,0,0],tint)=>add(parent,name,new T.BoxGeometry(...size),cell,p,r,tint);
 const cylinder=(parent,name,top,bottom,length,p,cell=4,r=[0,0,0],tint,sides=14)=>add(parent,name,new T.CylinderGeometry(top,bottom,length,sides),cell,p,r,tint);
 function beam(parent,name,a,b,width,cell=4,tint){const A=new T.Vector3(...a),B=new T.Vector3(...b),m=cylinder(parent,name,width,width,A.distanceTo(B),A.clone().add(B).multiplyScalar(.5).toArray(),cell,[0,0,0],tint,8);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());return m;}
 const owned=x=>{own.add(x);return x;};
 return {add,box,cylinder,beam,paint,owned,dispose(){for(const g of geos)g.dispose();for(const m of mats.values())m.dispose();for(const x of own)x.dispose();}};
}

// Painted canvases, in the atlas's manner: broken colour, worn edges, no flat fills.
function canvasTexture(T,w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
// Lime plaster: warm, mottled, with damp stains low down and a few cracks.
function plaster(g,w,h){
 const img=g.createImageData(w,h),d=img.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=fbm(x*.012,y*.012,91,5),m=fbm(x*.06,y*.06,93,3),s=fbm(x*.004+3,y*.02,95,3),damp=Math.max(0,s-.55)*2.2*(y/h),o=(y*w+x)*4;
  const k=.86+.2*n+.06*m-.25*damp;d[o]=196*k;d[o+1]=182*k;d[o+2]=150*k;d[o+3]=255;}
 g.putImageData(img,0,0);
 const R=rng(97);g.lineCap='round';
 for(let i=0;i<9;i++){let x=R()*w,y=R()*h;g.strokeStyle=`rgba(92,78,58,${.25+R()*.25})`;g.lineWidth=.8+R()*.8;g.beginPath();g.moveTo(x,y);for(let k=0;k<6+R()*8;k++){x+=(R()-.5)*26;y+=6+R()*16;g.lineTo(x,y);}g.stroke();}
 for(let i=0;i<260;i++){g.fillStyle=`rgba(${R()<.5?'120,104,80':'226,214,186'},${.06+R()*.1})`;const x=R()*w,y=R()*h,r=2+R()*9;g.beginPath();g.ellipse(x,y,r,r*(.4+R()*.6),R()*3,0,Math.PI*2);g.fill();}
}
// The theatre map: parchment, a coast, rivers and contours, a grid, the
// insertion route pinned in red string. Nothing on it is a real place.
function theatreMap(g,w,h){
 const img=g.createImageData(w,h),d=img.data,land=(x,y)=>fbm(x*.0042+1.7,y*.0042+.4,101,5)+.16*(x/w)-.08;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=fbm(x*.02,y*.02,103,4),edge=Math.min(x,y,w-1-x,h-1-y),foxed=Math.max(0,fbm(x*.008,y*.008,105,3)-.58)*1.6,o=(y*w+x)*4;
  const L=land(x,y),isLand=L>.47,k=(.9+.12*n)*(1-.35*Math.max(0,1-edge/40))*(1-.22*foxed);
  let c=isLand?[176+40*(L-.47),168+26*(L-.47),110]:[132,158,160];
  if(isLand&&((L-.47)*40)%1<.06)c=c.map(v=>v*.82); // contours
  c=c.map((v,i)=>v*.7+[214,198,160][i]*.3);
  d[o]=c[0]*k;d[o+1]=c[1]*k;d[o+2]=c[2]*k;d[o+3]=255;}
 g.putImageData(img,0,0);
 // The coastline, inked: march the land threshold along each row and column.
 g.fillStyle='rgba(58,48,34,.85)';for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const a=land(x,y)>.47;if(a!==(land(x+2,y)>.47)||a!==(land(x,y+2)>.47))g.fillRect(x,y,2.2,2.2);}
 const R=rng(107);g.strokeStyle='rgba(70,96,120,.7)';g.lineWidth=2;
 for(let r=0;r<3;r++){let x=w*(.35+.4*R()),y=h*(.2+.5*R());g.beginPath();g.moveTo(x,y);for(let k=0;k<14;k++){x+=(R()-.3)*30;y+=(R()-.5)*30;g.lineTo(x,y);}g.stroke();}
 g.strokeStyle='rgba(84,66,46,.38)';g.lineWidth=1.5;for(let i=1;i<8;i++){g.beginPath();g.moveTo(i*w/8,0);g.lineTo(i*w/8,h);g.stroke();}for(let i=1;i<5;i++){g.beginPath();g.moveTo(0,i*h/5);g.lineTo(w,i*h/5);g.stroke();}
 g.fillStyle='rgba(60,46,30,.55)';for(let i=0;i<14;i++){const x=R()*w*.9+20,y=R()*h*.9+20;g.fillRect(x,y,24+R()*40,4);}
 const pins=[[.2,.68],[.44,.42],[.63,.55],[.8,.3]].map(([x,y])=>[x*w,y*h]);
 g.strokeStyle='rgba(176,34,26,.95)';g.lineWidth=3.5;g.beginPath();pins.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
 for(const [x,y] of pins){g.fillStyle='#b8302a';g.beginPath();g.arc(x,y,9,0,Math.PI*2);g.fill();g.strokeStyle='rgba(40,24,16,.9)';g.lineWidth=2.5;g.stroke();g.fillStyle='rgba(255,220,200,.7)';g.beginPath();g.arc(x-3,y-3,2.5,0,Math.PI*2);g.fill();}
 g.strokeStyle='rgba(50,38,26,.9)';g.lineWidth=6;g.strokeRect(3,3,w-6,h-6);
}

// A radio set like the study's transceiver: an olive case, a dark face, a
// cream meter, dials and a speaker grille, built facing +n (a unit vector in x/z).
function radioSet(kit,parent,name,[x,y,z],[w,h,d],face,{dials=3,meter=true,grille=false,cell=2,tint}={}){
 const g=new parent.constructor();g.name=name;g.position.set(x,y,z);g.rotation.y=Math.atan2(face[0],face[1]);parent.add(g);
 kit.box(g,name+' case',[w,h,d],[0,h/2,0],cell,[0,0,0],tint);
 kit.box(g,name+' face',[w*.94,h*.86,.02],[0,h/2,d/2+.008],4);
 if(meter)kit.box(g,name+' meter',[w*.32,h*.2,.02],[-w*.2,h*.7,d/2+.02],1);
 for(let i=0;i<dials;i++)kit.cylinder(g,name+' dial '+i,.028,.032,.03,[-w*.38+i*(w*.76)/Math.max(1,dials-1),h*.3,d/2+.025],5,[Math.PI/2,0,0]);
 if(grille)kit.box(g,name+' grille',[w*.3,h*.42,.02],[w*.27,h*.6,d/2+.02],5);
 kit.box(g,name+' handle',[w*.5,.025,.03],[0,h+.012,d/2-.03],4);
 return g;
}

// The set: the plaster corner behind her (back wall x = -.85, side wall to her
// left), the map behind her head, an equipment rack in the corner, a swing-arm
// lamp over the desk, a mug and a signal pad on it.
export const ROOM_SET=Object.freeze({map:[1.6,.05,.8,.55],lamp:{pivot:[1.2,2.2,-2.25],elbow:[1,2.3,-1.4],head:[.9,1.74,-.75]},mug:[.95,.97,-.25],pad:[.55,.92,.1,.35]});
export function buildRoomSet(T,atlas,opt=ROOM_SET){
 const kit=roomKit(T,atlas),root=new T.Group();root.name='Radio room set';
 const plasterTex=kit.owned(canvasTexture(T,512,512,plaster));plasterTex.wrapS=plasterTex.wrapT=T.RepeatWrapping;plasterTex.repeat.set(2.4,1.6);
 const wallMat=kit.owned(new T.MeshStandardMaterial({map:plasterTex,roughness:1}));
 kit.add(root,'Back wall',new T.PlaneGeometry(6,3.6),0,[-.85,1.7,-.4],[0,Math.PI/2,0],0,wallMat);
 const sideTex=plasterTex.clone();sideTex.needsUpdate=true;kit.owned(sideTex);const sideMat=kit.owned(new T.MeshStandardMaterial({map:sideTex,roughness:1,color:0xd8d2c4}));
 kit.add(root,'Side wall',new T.PlaneGeometry(4.5,3.6),0,[1.4,1.7,-2.3],[0,0,0],0,sideMat);
 kit.box(root,'Skirting',[.03,.14,6],[-.83,.07,-.4],5);kit.box(root,'Side skirting',[4.5,.14,.03],[1.4,.07,-2.28],5);
 kit.box(root,'Floor',[5,.04,5],[1.2,-.02,-.4],7);
 // Conduit along the back wall, down into the rack.
 kit.beam(root,'Conduit',[-.82,2.55,1.6],[-.82,2.55,-1.2],.022,4);kit.beam(root,'Conduit drop',[-.82,2.55,-1.2],[-.82,1.95,-1.2],.022,4);
 // The map on its board, behind her head and to her right.
 const [my0,mz0,mw,mh]=opt.map,mapTex=kit.owned(canvasTexture(T,1024,Math.round(1024*mh/mw),theatreMap)),mapMat=kit.owned(new T.MeshStandardMaterial({map:mapTex,roughness:1}));
 kit.box(root,'Map board',[.03,mh+.06,mw+.06],[-.82,my0,mz0],6);
 kit.add(root,'Map',new T.PlaneGeometry(mw,mh),0,[-.8,my0,mz0],[0,Math.PI/2,0],0,mapMat);
 // The rack in the corner to her left: three shelves of sets.
 for(const z of [-.62,-1.98])for(const x of [-.78,-.3])kit.box(root,'Rack post',[.04,2.2,.04],[x,1.1,z],5);
 for(const y of [.6,1.24,1.86])kit.box(root,'Rack shelf '+y,[.56,.035,1.42],[-.54,y,-1.3],4);
 // (they face into the room, +x)
 const out=[1,0];
 radioSet(kit,root,'Receiver',[-.52,.62,-.98],[.62,.34,.44],out,{dials:3});
 radioSet(kit,root,'Power unit',[-.52,.62,-1.62],[.5,.3,.42],out,{dials:2,meter:false,grille:true,cell:5});
 radioSet(kit,root,'Exciter',[-.52,1.26,-1.02],[.66,.4,.44],out,{dials:4});
 radioSet(kit,root,'Speaker',[-.52,1.26,-1.66],[.4,.36,.4],out,{dials:1,meter:false,grille:true});
 radioSet(kit,root,'Code set',[-.52,1.88,-1.2],[.7,.3,.4],out,{dials:3});
 // The swing-arm lamp: a wall bracket, two arms, a green enamel shade.
 const {pivot,elbow,head}=opt.lamp;
 kit.box(root,'Lamp bracket',[.05,.16,.1],[pivot[0]-.02,pivot[1],pivot[2]],5);
 kit.beam(root,'Lamp arm',pivot,elbow,.016,5);kit.beam(root,'Lamp forearm',elbow,head,.014,5);
 // (an enamel shade: green outside, cream inside, open at the bottom)
 const shadeGeo=new T.CylinderGeometry(.035,.12,.13,24,1,true),outside=kit.add(root,'Lamp shade',shadeGeo,5,[head[0],head[1]-.065,head[2]],[0,0,-.3],0x7d9a6c);
 const inside=new T.Mesh(shadeGeo,kit.owned(new T.MeshBasicMaterial({color:0xf3dfae,side:T.BackSide})));inside.name='Lamp shade lining';inside.position.copy(outside.position);inside.rotation.copy(outside.rotation);inside.scale.setScalar(.985);root.add(inside);
 kit.cylinder(root,'Lamp cap',.03,.04,.04,[head[0],head[1]+.01,head[2]],5,[0,0,-.3]);
 const bulb=new T.Mesh(kit.owned(new T.SphereGeometry(.032,16,10)),kit.owned(new T.MeshBasicMaterial({color:0xfff4d6})));bulb.name='Lamp bulb';bulb.position.set(head[0]+.02,head[1]-.1,head[2]);root.add(bulb);
 // On the desk: a tin mug and a signal pad.
 const [mx,my,mz]=opt.mug,[px,py,pz,pr]=opt.pad;
 kit.cylinder(root,'Mug',.045,.04,.11,[mx,my,mz],1,[0,0,0],0xf2ead8);
 const handle=new T.Mesh(kit.owned(new T.TorusGeometry(.03,.008,8,16)),kit.paint(0xf2ead8));handle.name='Mug handle';handle.position.set(mx,my,mz+.055);root.add(handle);
 kit.box(root,'Signal pad',[.3,.012,.22],[px,py,pz],1,[0,pr,0],0xf6efdc);
 return {root,kit,lamp:{position:[head[0]+.02,head[1]-.1,head[2]],target:[.75,.92,-.15]},dispose(){root.removeFromParent();kit.dispose();}};
}

// Restage the study's desk microphone (its foot, stand and grille): the grille
// a little lower and farther out than the study's, so her open beak shows
// above it, tipped up toward her.
export function restageMic(T,root,{foot,grille,tilt}){
 const F=root.getObjectByName('Microphone foot'),S=root.getObjectByName('Microphone stand'),G=root.getObjectByName('Microphone grille');
 if(!F||!S||!G)throw Error('The study has no desk microphone');
 F.position.set(...foot);const top=new T.Vector3(foot[0],foot[1]+.02,foot[2]),end=new T.Vector3(...grille);
 S.position.copy(top).add(end).multiplyScalar(.5);S.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(top).normalize());S.scale.set(1,top.distanceTo(end)/S.geometry.parameters.height,1);
 G.position.copy(end);G.rotation.set(0,0,tilt);
}

// --- the hen ----------------------------------------------------------------
// Split her beak at the mouth line the model carries (a seam of fanned
// vertices from the gape to just short of the hook) and hang the lower
// mandible on a jaw bone at the gape, so the beak can move with her line.
// Triangles are split whole; a vertex both halves use is duplicated, so the
// halves part cleanly. A dark mouth fills the gap between them.
export const MOUTH={line:x=>1.381-.07*(x-.1),hook:.218,gape:[.105,1.383,0]};
export function rigBeak(T,hen){
 const beak=hen.parts.find(m=>m.name==='short hooked beak'),head=hen.bones.find(b=>b.name==='head');
 if(!beak||!head)throw Error('The hen has no beak or head bone');
 // Bind pose: every bone at rest, as createHen bound them.
 for(const b of hen.bones)b.quaternion.identity();hen.root.updateMatrixWorld(true);
 const jaw=new T.Bone();jaw.name='jaw';head.add(jaw);jaw.position.copy(head.worldToLocal(new T.Vector3(...MOUTH.gape)));jaw.updateMatrixWorld(true);
 const bones=[...hen.skeleton.bones,jaw],inverses=[...hen.skeleton.boneInverses,jaw.matrixWorld.clone().invert()],skeleton=new T.Skeleton(bones,inverses),J=bones.length-1;
 for(const m of hen.parts)m.bind(skeleton,m.bindMatrix);
 const g=beak.geometry,P=g.attributes.position,I=g.index.array,out=[],map=[new Map(),new Map()],newIndex=[];
 for(let t=0;t<I.length;t+=3){let cx=0,cy=0;for(let k=0;k<3;k++){cx+=P.getX(I[t+k])/3;cy+=P.getY(I[t+k])/3;}
  const low=cy<MOUTH.line(cx)&&cx<MOUTH.hook?1:0;
  for(let k=0;k<3;k++){const v=I[t+k];if(!map[low].has(v)){map[low].set(v,out.length);out.push([v,low]);}newIndex.push(map[low].get(v));}}
 const geo=new T.BufferGeometry();
 for(const [name,a] of Object.entries(g.attributes)){const src=a.array,n=a.itemSize,dst=new src.constructor(out.length*n);
  out.forEach(([v,low],i)=>{for(let c=0;c<n;c++)dst[i*n+c]=src[v*n+c];
   if(low&&name==='skinIndex'){dst[i*n]=J;for(let c=1;c<n;c++)dst[i*n+c]=0;}
   if(low&&name==='skinWeight'){dst[i*n]=1;for(let c=1;c<n;c++)dst[i*n+c]=0;}});
  geo.setAttribute(name,new T.BufferAttribute(dst,n,a.normalized));}
 geo.setIndex(newIndex);beak.geometry=geo;g.dispose();
 // The mouth: dark wedges inside each mandible, seen only while the beak is open.
 const dark=new T.MeshBasicMaterial({color:0x3a1712}),own=[dark];
 const wedge=(parent,name,y,len)=>{const geo2=new T.BoxGeometry(len,.012,.05);own.push(geo2);const m=new T.Mesh(geo2,dark);m.name=name;m.position.set(len/2,y,0);parent.add(m);return m;};
 const upper=new T.Group();upper.name='Upper mouth';head.add(upper);upper.position.copy(jaw.position);wedge(upper,'Palate',.004,.1);
 wedge(jaw,'Tongue',-.004,.09);
 return {jaw,skeleton,split:{lower:out.filter(o=>o[1]).length,upper:out.filter(o=>!o[1]).length},dispose(){own.forEach(o=>o.dispose());}};
}

// Pose her (radians): a turn of the whole bird toward the microphone, a lean
// into it from the hips, the head's own turn and nod, the near wing reaching
// forward onto the desk, the beak open by `beak`.
export function poseHen(hen,rig,p){
 const B=n=>hen.bones.find(b=>b.name===n);
 for(const b of hen.bones)b.quaternion.identity();
 hen.root.rotation.set(0,p.turn||0,0);hen.root.position.set(...(p.at||[0,0,0]));
 B('pelvis').rotation.set(0,0,-(p.lean||0)*.4);
 B('breast').rotation.set(p.roll||0,p.chestTurn||0,-(p.lean||0)*.6);
 B('head').rotation.set(p.headRoll||0,p.headTurn||0,p.headNod||0,'YXZ');
 const wing=B('wing 1'),tip=B('wing tip 1');if(wing&&p.wing){wing.rotation.set(...p.wing,'YXZ');if(p.wingTip)tip.rotation.set(...p.wingTip);}
 const far=B('wing -1'),farTip=B('wing tip -1');if(far&&p.farWing){far.rotation.set(...p.farWing,'YXZ');if(p.farWingTip)farTip.rotation.set(...p.farWingTip);}
 if(rig)rig.jaw.rotation.set(0,0,-(p.beak||0));
 hen.root.updateMatrixWorld(true);
}
