import * as THREE from './vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {GAME_CAMERA} from './hybrid-world.js';
import {speakingHeadFile,withSpeakingHead,rigSpeakingHead,jawAt,SPEECH_OPEN} from './speaking-head.js';

// The approved head (left) and its speaking head (right) at the same mesh level, under one
// camera, each with the character's registered paint (createAnimalPaint, as the game paints).
const $=id=>document.getElementById(id),host=$('scene'),params=new URLSearchParams(location.search);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x383838);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera();scene.add(new THREE.HemisphereLight(0xfff9ec,0x737775,2));const key=new THREE.DirectionalLight(0xfff2dc,2.3);key.position.set(3,5,4);scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(-2,2,-3);scene.add(fill);
const loader=new THREE.TextureLoader(),json=r=>{if(!r.ok)throw Error(r.url+' '+r.status);return r.json();};
for(const p of ANIMAL_MOTION_CATALOG)$('animal').append(new Option(p.label,p.id));
for(const [id,value] of [['animal',params.get('animal')],['level',params.get('level')],['view',params.get('view')],['scale',params.get('scale')]])if(value)$(id).value=value;
if(params.has('jaw'))$('jaw').value=params.get('jaw');

// A line to say (the intro handler's): [syllable, seconds, stress].
const LINE=[['your',.2,.6],['mis',.17,1],['sion',.19,.6],['is',.15,.5],['to',.13,.45],['take',.24,1],['out',.26,.9],[null,.1,0],['the',.12,.45],['cen',.2,1],['tral',.17,.6],['re',.17,.7],['lay',.24,.8],['sta',.22,1],['tion',.3,.55]];
const lineLength=.3+LINE.reduce((t,s)=>t+s[1],0)+.8;

let current=null,saying=null,generation=0;
const authorFile=p=>p.id==='horse'?'horse-light-data.json':p.file.replace('10k','author');
function release(c){if(!c)return;for(const w of [c.original,c.speaking])scene.remove(w.root);c.speech.dispose();c.paints.forEach(p=>p.dispose());c.weightMaterial.dispose();c.greyMouth.dispose();c.original.dispose();c.speaking.dispose();}
async function load(){
 const id=$('animal').value,level=$('level').value,profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),mine=++generation;
 $('status').textContent='Loading '+profile.label+'…';$('error').textContent='';
 try{
  const [data,head]=await Promise.all([fetch('./'+(level==='10k'?profile.file:authorFile(profile))).then(json),fetch(speakingHeadFile(id,level)).then(json)]);
  const original=profile.create(data),speaking=profile.create(withSpeakingHead(data,head)),speech=rigSpeakingHead(speaking,head);
  const paints=await Promise.all([createAnimalPaint(renderer,original,profile,loader),createAnimalPaint(renderer,speaking,profile,loader)]);
  speech.applyPaint(paints[1]);
  // Framing: the head (its skin's box) and the mouth (the middle of its inside).
  const skin=speech.skin,P=skin.geometry.attributes.position,inside=head.parts[0].inside,box=new THREE.Box3().setFromBufferAttribute(P),center=box.getCenter(new THREE.Vector3()),mouth=new THREE.Vector3();let count=0;
  for(let i=0;i<P.count;i++)if(inside[i]>.5){mouth.x+=P.getX(i);mouth.y+=P.getY(i);mouth.z+=P.getZ(i);count++;}mouth.divideScalar(Math.max(1,count));
  // Jaw weights, and the grey sculpt with its mouth's inside shaded so the forms read.
  const weightMaterial=new THREE.MeshBasicMaterial({vertexColors:true}),weightColors=new THREE.Float32BufferAttribute(Array.from(head.parts[0].jaw).flatMap(w=>[.18+.8*w,.25,.95-.8*w]),3);
  const greyMouth=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88}),greyColors=new THREE.Float32BufferAttribute(Array.from(inside).flatMap(m=>{const g=.32*(1-.55*m);return [g,g*(1-.12*m),g*(1-.12*m)];}),3);
  const next={id,level,profile,data,head,original,speaking,speech,paints,center,mouth,weightMaterial,weightColors,greyMouth,greyColors,ownColors:skin.geometry.getAttribute('color')};
  if(mine!==generation){release(next);return;}
  release(current);current=next;scene.add(original.root,speaking.root);
  drawSheet(head.reference);render();
 }catch(error){$('error').textContent=error.message;throw error;}
}

const VIEWS={front:{azimuth:Math.PI/2,elevation:0},three:{azimuth:Math.PI/2-.62,elevation:.10},side:{azimuth:0,elevation:0},below:{azimuth:Math.PI/2-.30,elevation:-.38},game:GAME_CAMERA};
const SCALES={close:1150,portrait:620,cutscene:300,native:58};
function jawAngle(){if(saying){const t=(performance.now()-saying)/1000%lineLength;return jawAt(t,{start:.3,open:SPEECH_OPEN[current.id]??.2,syllables:LINE});}return +$('jaw').value*Math.PI/180;}
function applyModes(){
 const c=current,grey=$('grey').checked||!$('painted').checked,weights=$('weights').checked,wire=$('wire').checked;
 c.original.parts.forEach(p=>p.material=grey?c.original.grey:c.paints[0].material);
 c.speaking.parts.forEach(p=>p.material=grey?c.speaking.grey:c.paints[1].material);
 c.speech.setGrey(grey);
 const g=c.speech.skin.geometry;
 if(weights){g.setAttribute('color',c.weightColors);c.speech.skin.material=c.weightMaterial;}
 else if(grey){g.setAttribute('color',c.greyColors);c.speech.skin.material=c.greyMouth;}
 else if(c.ownColors)g.setAttribute('color',c.ownColors);else g.deleteAttribute('color');
 for(const m of new Set([...c.original.parts,...c.speaking.parts,...c.speech.mouthParts].map(p=>p.material)))m.wireframe=wire;
 c.paints.forEach(p=>p.setDebug($('coverage').checked));
}
function render(){
 const c=current;if(!c)return;applyModes();
 const heading=+$('heading').value,scale=$('scale').value,view=VIEWS[$('view').value],ppu=SCALES[scale];
 for(const w of [c.original,c.speaking])w.pose('neutral',heading);
 const angle=jawAngle();c.speech.setJaw(angle);$('jaw-value').textContent=(angle*180/Math.PI).toFixed(0)+'°';
 c.speaking.root.updateMatrixWorld(true);
 // Native frames the whole character; a portrait the head (between its middle and the mouth);
 // a close-up and the cutscene scale the mouth.
 const focus=scale==='native'?new THREE.Vector3(0,.84,0):c.speaking.root.localToWorld(scale==='portrait'?c.center.clone().lerp(c.mouth,.5):c.mouth.clone().lerp(c.center,.25));
 const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);renderer.setScissorTest(true);
 const {azimuth:a,elevation:e}=view;
 for(let i=0;i<2;i++){const width=w/2;camera.left=-width/ppu/2;camera.right=width/ppu/2;camera.top=h/ppu/2;camera.bottom=-h/ppu/2;camera.near=.05;camera.far=30;
  camera.position.copy(focus).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(5));camera.lookAt(focus);camera.updateProjectionMatrix();
  c.original.root.visible=i===0;c.speaking.root.visible=i===1;renderer.setViewport(i*width,0,width,h);renderer.setScissor(i*width,0,width,h);renderer.render(scene,camera);}
 renderer.setScissorTest(false);c.original.root.visible=c.speaking.root.visible=true;
 const total=c.data.triangles,speakingTotal=c.data.triangles-c.data.parts.find(p=>p.name===c.head.replaces).triangles+c.head.triangles;
 $('left-label').textContent=`APPROVED HEAD · ${total.toLocaleString()} CHARACTER TRIANGLES`;
 $('right-label').textContent=`SPEAKING HEAD · ${speakingTotal.toLocaleString()} (+${(speakingTotal-total).toLocaleString()})`;
 $('status').textContent=`${c.profile.label}, ${c.level==='10k'?'game mesh':'authoring mesh'}: ${c.head.parts.map(p=>`${p.name} ${p.triangles.toLocaleString()}`).join(' · ')}. Jaw joint (${c.head.jaw.hinge.map(v=>v.toFixed(3)).join(', ')}); open ${(angle*180/Math.PI).toFixed(1)}°. ${ppu} CSS px/unit.`;
 if(saying)requestAnimationFrame(render);
}

// The reference sheet: the paint sheet's side and front views around the mouth, with its plan.
const sheetCanvas=$('sheet'),sheetContext=sheetCanvas.getContext('2d'),sheetImages=new Map();
const COLORS={lip:'#ff4040',corner:'#00e5ff',hinge:'#ffeb3b',under:'#ffa000',back:'#e040fb',cavity:'#ffffff',tooth:'#fff8c8',tongue:'#ff8cac'};
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

for(const id of ['animal','level'])$(id).addEventListener('input',load);
for(const id of ['view','scale','heading','jaw','painted','grey','wire','coverage','weights'])$(id).addEventListener('input',render);
$('say').addEventListener('click',()=>{saying=saying?null:performance.now();$('say').textContent=saying?'Stop':'Say a line';render();});
new ResizeObserver(()=>render()).observe(host);

// Screen-space paint coverage of the speaking head (right pane), by the coverage colours.
function coverage(){const previous=$('coverage').checked;$('coverage').checked=true;render();const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
 let mapped=0,borrowed=0,fallback=0,mouth=0;for(let y=0;y<h;y++)for(let x=Math.floor(w/2);x<w;x++){const k=(y*w+x)*4,r=px[k],g=px[k+1],b=px[k+2];if(g>r*1.2&&g>b*1.2&&b<g*.6)mapped++;else if(b>r*1.5&&b>g*1.5)borrowed++;else if(r>g*1.2&&b>g*1.2)fallback++;else if(g>r*2&&b>r*2)mouth++;}
 $('coverage').checked=previous;render();return {mappedPixels:mapped,borrowedPixels:borrowed,fallbackPixels:fallback,mouthPixels:mouth,fallbackPercent:100*fallback/Math.max(1,mapped+borrowed+fallback+mouth)};}
window.speakingHeads={get current(){return current;},load:async(id,level='10k')=>{$('animal').value=id;$('level').value=level;await load();},render,coverage,
 set(options){for(const [k,v] of Object.entries(options)){const el=$(k);if(el.type==='checkbox')el.checked=v;else el.value=v;}render();},
 diagnostics(){const c=current;return {id:c.id,level:c.level,triangles:c.head.triangles,characterTriangles:c.data.triangles,parts:c.head.parts.map(p=>({name:p.name,triangles:p.triangles})),bones:c.speech.skin.skeleton.bones.length,jawParent:c.speech.jaw.parent?.name};}};
await load();window.speakingHeadsReady=true;
