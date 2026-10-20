import * as THREE from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {GAME_CAMERA} from './hybrid-world.js';
import {speakingHeadFile,withSpeakingHead,rigSpeakingHead,jawAt,speechOpen} from './speaking-head.js';

// The approved head (left) and its speaking head (right) at the same mesh level, under one
// camera, each with the character's registered paint (createAnimalPaint, as the game paints): flat,
// or lit by the scene as the battle paints its units (Lit; round 5's review, SHOULD-FIX 5: the
// lit evidence was photographed on another renderer, whose paint fell back to flat colours).
const $=id=>document.getElementById(id),host=$('scene'),params=new URLSearchParams(location.search);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x383838);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera();scene.add(new THREE.HemisphereLight(0xfff9ec,0x737775,2));const key=new THREE.DirectionalLight(0xfff2dc,2.3);key.position.set(3,5,4);scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(-2,2,-3);scene.add(fill);
const loader=new THREE.TextureLoader(),json=r=>{if(!r.ok)throw Error(r.url+' '+r.status);return r.json();};
for(const p of ANIMAL_MOTION_CATALOG)$('animal').append(new Option(p.label,p.id));
for(const [id,value] of [['animal',params.get('animal')],['level',params.get('level')],['view',params.get('view')],['scale',params.get('scale')],['elevation',params.get('elevation')]])if(value)$(id).value=value;
if(params.has('jaw'))$('jaw').value=params.get('jaw');
if(params.has('lit'))$('lit').checked=params.get('lit')!=='0';

// A line to say (the intro handler's): [syllable, seconds, stress].
const LINE=[['your',.2,.6],['mis',.17,1],['sion',.19,.6],['is',.15,.5],['to',.13,.45],['take',.24,1],['out',.26,.9],[null,.1,0],['the',.12,.45],['cen',.2,1],['tral',.17,.6],['re',.17,.7],['lay',.24,.8],['sta',.22,1],['tion',.3,.55]];
const lineLength=.3+LINE.reduce((t,s)=>t+s[1],0)+.8;

let current=null,saying=null,generation=0;
const authorFile=p=>p.id==='horse'?'horse-light-data.json':p.file.replace('10k','author');
// (and every skeleton the pair's meshes are bound to, with its bone texture: the workers' own
// dispose() leaves the mammals' skeletons, createLightHorse's and its kin's, to their callers, and
// each character change kept two; the hen's disposes hers, and a second dispose is harmless)
function release(c){if(!c)return;const skeletons=new Set();for(const w of [c.original,c.speaking])w.root.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
 for(const w of [c.original,c.speaking])scene.remove(w.root);c.speech.dispose();c.paints.forEach(p=>p.dispose());c.weightMaterial.dispose();c.original.dispose();c.speaking.dispose();
 for(const skeleton of skeletons)skeleton.dispose();}
async function load(){
 const id=$('animal').value,level=$('level').value,profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),mine=++generation;
 $('status').textContent='Loading '+profile.label+'…';$('error').textContent='';
 try{
  const [data,head]=await Promise.all([fetch('./'+(level==='10k'?profile.file:authorFile(profile))).then(json),fetch(speakingHeadFile(id,level)).then(json)]);
  const original=profile.create(data),speaking=profile.create(withSpeakingHead(data,head)),speech=rigSpeakingHead(speaking,head);
  const lit=$('lit').checked,paints=await Promise.all([createAnimalPaint(renderer,original,profile,loader,'normal',lit),createAnimalPaint(renderer,speaking,profile,loader,'normal',lit)]);
  speech.applyPaint(paints[1]);
  // Framing: the head (its skin's box) and the mouth (the middle of its lips' faces: the vertices
  // that fold shut at rest).
  const skin=speech.skin,P=skin.geometry.attributes.position,fold=head.parts[0].fold,box=new THREE.Box3().setFromBufferAttribute(P),center=box.getCenter(new THREE.Vector3()),mouth=new THREE.Vector3();let count=0;
  for(let i=0;i<P.count;i++)if(fold[i]>.5){mouth.x+=P.getX(i);mouth.y+=P.getY(i);mouth.z+=P.getZ(i);count++;}mouth.divideScalar(Math.max(1,count));
  // Jaw weights.
  const weightMaterial=new THREE.MeshBasicMaterial({vertexColors:true}),weightColors=new THREE.Float32BufferAttribute(Array.from(head.parts[0].jaw).flatMap(w=>[.18+.8*w,.25,.95-.8*w]),3);
  const next={id,level,profile,data,head,original,speaking,speech,paints,center,mouth,weightMaterial,weightColors,ownColors:skin.geometry.getAttribute('color')};
  if(mine!==generation){release(next);return;}
  release(current);current=next;scene.add(original.root,speaking.root);
  drawSheet(head.reference);render();
 }catch(error){$('error').textContent=error.message;throw error;}
}

const VIEWS={front:{azimuth:Math.PI/2,elevation:0},three:{azimuth:Math.PI/2-.62,elevation:.10},side:{azimuth:0,elevation:0},below:{azimuth:Math.PI/2-.30,elevation:-.38},game:GAME_CAMERA};
// (the elevation control tilts any view up or down from its own, by degrees)
const SCALES={close:1150,portrait:620,cutscene:300,native:58};
function jawAngle(){if(saying){const t=(performance.now()-saying)/1000%lineLength;return jawAt(t,{start:.3,open:speechOpen(current.head),syllables:LINE});}return +$('jaw').value*Math.PI/180;}
function applyModes(){
 const c=current,grey=$('grey').checked||!$('painted').checked,weights=$('weights').checked,wire=$('wire').checked;
 c.original.parts.forEach(p=>p.material=grey?c.original.grey:c.paints[0].material);
 c.speaking.parts.forEach(p=>p.material=grey?c.speaking.grey:c.paints[1].material);
 c.speech.setGrey(grey);
 const g=c.speech.skin.geometry;
 if(weights){g.setAttribute('color',c.weightColors);c.speech.skin.material=c.weightMaterial;}
 else if(c.ownColors)g.setAttribute('color',c.ownColors);else g.deleteAttribute('color');
 for(const m of new Set([...c.original.parts,...c.speaking.parts,...c.speech.mouthParts].map(p=>p.material)))m.wireframe=wire;
 c.paints.forEach(p=>p.setDebug($('coverage').checked));
}
// One animation loop: render() draws once (controls, loads, resizes and the tools call it), and while
// a line is said tick() draws each frame, one request pending at a time. (Before, render() asked for
// its next frame whenever a line was being said, and every control, load and resize then started a
// loop of its own: five redraws while speaking left six, each drawing both panes; the architect's
// review, 15 October 2026. tools/speaking-heads-viewer-check.mjs counts them.)
let frame=0;
function tick(){frame=0;draw();if(saying)frame=requestAnimationFrame(tick);}
function render(){draw();if(saying&&!frame)frame=requestAnimationFrame(tick);if(!saying&&frame){cancelAnimationFrame(frame);frame=0;}}
function draw(){
 const c=current;if(!c)return;applyModes();
 const heading=+$('heading').value,scale=$('scale').value,view=VIEWS[$('view').value],ppu=SCALES[scale];
 for(const w of [c.original,c.speaking])w.pose('neutral',heading);
 const angle=jawAngle();c.speech.setJaw(angle);$('jaw-value').textContent=(angle*180/Math.PI).toFixed(0)+'°';
 c.speaking.root.updateMatrixWorld(true);
 // Native frames the whole character; a portrait the head (between its middle and the mouth);
 // a close-up and the cutscene scale the mouth.
 const focus=scale==='native'?new THREE.Vector3(0,.84,0):c.speaking.root.localToWorld(scale==='portrait'?c.center.clone().lerp(c.mouth,.5):c.mouth.clone().lerp(c.center,.25));
 const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);renderer.setScissorTest(true);
 const a=view.azimuth,e=view.elevation+(+$('elevation').value)*Math.PI/180;
 for(let i=0;i<2;i++){const width=w/2;camera.left=-width/ppu/2;camera.right=width/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.05;camera.far=30;
  camera.position.copy(focus).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(5));camera.lookAt(focus);camera.updateProjectionMatrix();
  c.original.root.visible=i===0;c.speaking.root.visible=i===1;renderer.setViewport(i*width,0,width,h);renderer.setScissor(i*width,0,width,h);renderer.render(scene,camera);}
 renderer.setScissorTest(false);c.original.root.visible=c.speaking.root.visible=true;
 const total=c.data.triangles,speakingTotal=c.data.triangles-c.data.parts.find(p=>p.name===c.head.replaces).triangles+c.head.triangles;
 $('left-label').textContent=`APPROVED HEAD · ${total.toLocaleString()} CHARACTER TRIANGLES`;
 $('right-label').textContent=`SPEAKING HEAD · ${speakingTotal.toLocaleString()} (+${(speakingTotal-total).toLocaleString()})`;
 $('status').textContent=`${c.profile.label}, ${c.level==='10k'?'game mesh':'authoring mesh'}: ${c.head.parts.map(p=>`${p.name} ${p.triangles.toLocaleString()}`).join(' · ')}. Jaw joint (${c.head.jaw.hinge.map(v=>v.toFixed(3)).join(', ')}); open ${(angle*180/Math.PI).toFixed(1)}°. ${ppu} CSS px/unit.`;
}

// The reference sheet: the paint sheet's side and front views around the mouth, with its plan.
const sheetCanvas=$('sheet'),sheetContext=sheetCanvas.getContext('2d'),sheetImages=new Map();
const COLORS={lip:'#ff4040',corner:'#00e5ff',hinge:'#ffeb3b',under:'#ffa000','jaw angle':'#e040fb',window:'#e040fb',cavity:'#ffffff',tooth:'#fff8c8',tongue:'#ff8cac'};
async function drawSheet(reference){
 if(!sheetImages.has(reference.sheet))sheetImages.set(reference.sheet,await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('sheet '+reference.sheet));im.src=reference.sheet;}));
 const im=sheetImages.get(reference.sheet),F=reference.frame,lip=reference.lines.find(l=>l.view==='side'&&l.kind==='lip').points;
 const cx=lip.reduce((s,p)=>s+p[0],0)/lip.length,cy=lip.reduce((s,p)=>s+p[1],0)/lip.length,half=sheetCanvas.width/2,scale=half/.56;
 const windows=[{view:1,across:p=>p[0],lo:cx-.40,y0:cy-.17,x0:0},{view:0,across:p=>-p[2],lo:-.28,y0:cy-.17,x0:half}];
 sheetContext.fillStyle='#808080';sheetContext.fillRect(0,0,sheetCanvas.width,sheetCanvas.height);
 for(const win of windows){const H=sheetCanvas.height/scale;
  const sx=(win.view+win.lo/F.width+.5)/4*im.width,sy=(1-((win.y0+H-F.centerY)/F.height+.5))*im.height,sw=.56/F.width/4*im.width,sh=H/F.height*im.height;
  sheetContext.drawImage(im,sx,sy,sw,sh,win.x0,0,half,sheetCanvas.height);
  const at=p=>[win.x0+(win.across(p)-win.lo)*scale,(win.y0+H-p[1])*scale];
  sheetContext.save();sheetContext.beginPath();sheetContext.rect(win.x0,0,half,sheetCanvas.height);sheetContext.clip();
  for(const line of reference.lines.filter(l=>l.view===(win.view?'side':'front'))){sheetContext.strokeStyle=COLORS[line.kind];sheetContext.lineWidth=line.kind==='lip'||line.kind==='tooth'?3:2;sheetContext.setLineDash(line.kind==='cavity'?[8,6]:[]);sheetContext.beginPath();line.points.forEach((p,k)=>{const [x,y]=at(p);k?sheetContext.lineTo(x,y):sheetContext.moveTo(x,y);});sheetContext.stroke();}
  for(const dot of reference.dots.filter(d=>d.view===(win.view?'side':'front'))){const [x,y]=at(dot.point);sheetContext.strokeStyle=COLORS[dot.kind];sheetContext.lineWidth=3;sheetContext.setLineDash([]);sheetContext.beginPath();sheetContext.arc(x,y,9,0,Math.PI*2);sheetContext.stroke();}
  sheetContext.restore();}
 sheetContext.fillStyle='#000a';sheetContext.fillRect(0,0,240,30);sheetContext.fillRect(half,0,240,30);sheetContext.fillStyle='#fff';sheetContext.font='18px system-ui';sheetContext.fillText('Side (painted sheet)',10,21);sheetContext.fillText('Front (painted sheet)',half+10,21);
}

for(const id of ['animal','level','lit'])$(id).addEventListener('input',load);
for(const id of ['view','scale','heading','elevation','jaw','painted','grey','wire','coverage','weights'])$(id).addEventListener('input',render);
$('say').addEventListener('click',()=>{saying=saying?null:performance.now();$('say').textContent=saying?'Stop':'Say a line';render();});
const resized=new ResizeObserver(()=>render());resized.observe(host);
// Leaving the page releases the viewer: the loop, the pair on show and the renderer.
addEventListener('pagehide',()=>{saying=null;if(frame)cancelAnimationFrame(frame);frame=0;resized.disconnect();release(current);current=null;renderer.dispose();},{once:true});

// Screen-space paint coverage of the speaking head (right pane), by the coverage colours.
function coverage(){const previous=$('coverage').checked;$('coverage').checked=true;render();const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
 let mapped=0,borrowed=0,fallback=0,mouth=0;for(let y=0;y<h;y++)for(let x=Math.floor(w/2);x<w;x++){const k=(y*w+x)*4,r=px[k],g=px[k+1],b=px[k+2];if(g>r*1.2&&g>b*1.2&&b<g*.6)mapped++;else if(b>r*1.5&&b>g*1.5)borrowed++;else if(r>g*1.2&&b>g*1.2)fallback++;else if(g>r*2&&b>r*2)mouth++;}
 $('coverage').checked=previous;render();return {mappedPixels:mapped,borrowedPixels:borrowed,fallbackPixels:fallback,mouthPixels:mouth,fallbackPercent:100*fallback/Math.max(1,mapped+borrowed+fallback+mouth)};}
// One head drawn on its own into pixels, for measuring (registration tools, reviews): pane
// 'approved' or 'speaking', an orthographic camera at `center` looking in from azimuth and
// elevation (radians; 0, 0 is from the character's left, +z), ppu pixels per unit. Returns
// {width, height, pixels (RGBA, top row first)} as displayed (sRGB).
function capture({pane='approved',center,ppu=4000,width=1200,height=800,azimuth=0,elevation=0,jaw=0}={}){
 const c=current,target=new THREE.WebGLRenderTarget(width,height,{samples:4,colorSpace:THREE.SRGBColorSpace}),cam=new THREE.OrthographicCamera(-width/2/ppu,width/2/ppu,height/2/ppu,-height/2/ppu,.05,30);
 c.speech.setJaw(jaw);for(const w of [c.original,c.speaking])w.pose('neutral',0);c.original.root.visible=pane==='approved';c.speaking.root.visible=pane==='speaking';
 const focus=new THREE.Vector3(...center);cam.position.copy(focus).add(new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(5));cam.lookAt(focus);cam.updateProjectionMatrix();
 renderer.setScissorTest(false);renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.render(scene,cam);
 const raw=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,raw);renderer.setRenderTarget(null);target.dispose();
 c.original.root.visible=c.speaking.root.visible=true;render();
 const pixels=new Uint8Array(width*height*4);for(let y=0;y<height;y++)pixels.set(raw.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
 return {width,height,pixels};
}
// The painted mouth line on the approved head, seen from the side (+z) or the front (+x): in
// columns 2 mm apart, each row within `reach` of the speaking head's cut is scored by how much
// darker it is than 1.5 mm above and below it; the line is the path through the columns as dark
// as it can be, at 2.5 contrast per mm it jumps (dynamic programming). Returns its points,
// placed units: side [x, y, contrast], front [z, y, contrast] (tools/speaking-heads/
// painted-mouths.json; fit-lips.mjs fits the lip lines to them).
function traceMouth(view='side',{ppu=5000,reach=.025,before=.07,half=.06}={}){
 const s=current.head.parts[0],P=s.position,side=view==='side',cut=[];
 for(let i=0;i<s.fold.length;i++)if(s.fold[i]>.5&&s.inside[i]<.3&&(side?P[i*3+2]>0:true))cut.push([P[i*3],P[i*3+1],P[i*3+2]]);
 // the cut where it meets the surface: by x along the side; by z (its frontmost point) across the front
 const bins=new Map();if(!side)for(const p of cut){const k=Math.round(p[2]/.002),b=bins.get(k);if(!b||p[0]>b[0])bins.set(k,p);}
 const line=side?cut.map(p=>[p[0],p[1]]).sort((a,b)=>a[0]-b[0]):[...bins.values()].map(p=>[p[2],p[1]]).sort((a,b)=>a[0]-b[0]);
 const near=a=>{let best=line[0],d=Infinity;for(const p of line){const e=Math.abs(p[0]-a);if(e<d){d=e;best=p;}}return best[1];};
 const a0=side?line[0][0]-before:-half,a1=side?line.at(-1)[0]+.004:half,mid=(a0+a1)/2;
 const center=side?[mid,near(mid),0]:[Math.max(...cut.map(p=>p[0])),near(0),0],W=1600,H=700;
 const cap=capture({pane:'approved',center,ppu,width:W,height:H,azimuth:side?0:Math.PI/2,elevation:0}),Px=cap.pixels,bg=[Px[0],Px[1],Px[2]];
 const u=a=>Math.round(W/2+(side?a-center[0]:-a)*ppu),v=y=>Math.round(H/2-(y-center[1])*ppu);
 const L=(i,j)=>{if(i<0||j<0||i>=W||j>=H)return -1;const k=(j*W+i)*4;if(Math.abs(Px[k]-bg[0])+Math.abs(Px[k+1]-bg[1])+Math.abs(Px[k+2]-bg[2])<8)return -1;return .299*Px[k]+.587*Px[k+1]+.114*Px[k+2];};
 const off=Math.round(.0015*ppu),dy=.0004,ny=Math.round(2*reach/dy)+1,cols=[];
 for(let a=a0;a<=a1+1e-9;a+=.002){const yc=near(a),sc=new Float32Array(ny);for(let j=0;j<ny;j++){const i=u(a),k=v(yc-reach+j*dy),l=L(i,k),p=L(i,k-off),q=L(i,k+off);sc[j]=l<0||p<0||q<0?-5:Math.max(0,Math.min(p,q)-l);}cols.push({a,yc,sc});}
 const n=cols.length,best=cols.map(()=>new Float32Array(ny)),from=cols.map(()=>new Int16Array(ny));best[0].set(cols[0].sc);
 for(let i=1;i<n;i++)for(let j=0;j<ny;j++){let b=-1e9,bj=0;for(let k=Math.max(0,j-8);k<=Math.min(ny-1,j+8);k++){const w=best[i-1][k]-2.5*Math.abs(cols[i].yc-reach+j*dy-(cols[i-1].yc-reach+k*dy))*1000;if(w>b){b=w;bj=k;}}best[i][j]=b+cols[i].sc[j];from[i][j]=bj;}
 let j=0;for(let k=1;k<ny;k++)if(best[n-1][k]>best[n-1][j])j=k;const points=[];
 for(let i=n-1;i>=0;i--){points.push([+cols[i].a.toFixed(4),+(cols[i].yc-reach+j*dy).toFixed(4),Math.round(cols[i].sc[j])]);j=from[i][j];}
 return points.reverse();
}
window.speakingHeads={get current(){return current;},load:async(id,level='10k')=>{$('animal').value=id;$('level').value=level;await load();},render,coverage,capture,traceMouth,
 // (a character, a mesh level or Lit loads the pair again: resolve it before capturing)
 async set(options){let again=false;for(const [k,v] of Object.entries(options)){const el=$(k),was=el.type==='checkbox'?el.checked:el.value;if(el.type==='checkbox')el.checked=v;else el.value=v;if(['animal','level','lit'].includes(k)&&was!==(el.type==='checkbox'?el.checked:el.value))again=true;}if(again)await load();render();},
 diagnostics(){const c=current;return {id:c.id,level:c.level,triangles:c.head.triangles,characterTriangles:c.data.triangles,parts:c.head.parts.map(p=>({name:p.name,triangles:p.triangles})),bones:c.speech.skin.skeleton.bones.length,jawParent:c.speech.jaw.parent?.name};},
 // (what the renderer holds, and whether a frame is pending: a character change must not grow the
 // one, and the other is one request at most)
 resources(){return {...renderer.info.memory,programs:renderer.info.programs?.length??0,framePending:Boolean(frame),saying:Boolean(saying)};}};
await load();window.speakingHeadsReady=true;
