import * as T from './vendor/three.module.js';
import {collisionReport,envelopeSegments} from './body-collisions.js';
import {sampleWeightedWindow,WINDOW_DURATION,WINDOW_PHASES,WINDOW_IMPACT as DIVE_IMPACT} from './weighted-window.js';
import {sampleBracedWindow,BRACED_DURATION,BRACED_PHASES,BRACED_IMPACT} from './weighted-window-braced.js';
let sampleWeightedRoll=sampleBracedWindow,ROLL_DURATION=BRACED_DURATION,ROLL_PHASES=BRACED_PHASES,WINDOW_IMPACT=BRACED_IMPACT;
import {createWindowShatter} from './window-shatter.js';
const $=id=>document.getElementById(id),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x273633);$('scene').append(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(),sun=new T.DirectionalLight(0xfff2d5,2.3);sun.position.set(-3,5,5);scene.add(sun,new T.HemisphereLight(0xe2f4ed,0x37413c,2));
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x4c5c52,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;scene.add(floor);const grid=new T.GridHelper(20,20,0x89988b,0x617369);grid.position.z=.5;scene.add(grid);
// Window lies on tile edge X=0; the first destination tile is X=[0,1].
const destination=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:0x91bf75,transparent:true,opacity:.18,depthWrite:false}));destination.rotation.x=-Math.PI/2;destination.position.set(.5,.005,0);scene.add(destination);
const tileOutline=new T.LineLoop(new T.BufferGeometry().setFromPoints([[0,.009,-.5],[1,.009,-.5],[1,.009,.5],[0,.009,.5]].map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color:0xd6eea1}));scene.add(tileOutline);
const capsuleMaterial=new T.MeshStandardMaterial({color:0x8ac7d4,transparent:true,opacity:.17,depthWrite:false}),boneMaterial=new T.MeshStandardMaterial({color:0xd6e9ed}),weightMaterial=new T.MeshStandardMaterial({color:0x38aee0}),jointMaterial=new T.MeshStandardMaterial({color:0xe6dfbd});
const start=sampleWeightedRoll(0),bodies=start.segments.map(s=>{const group=new T.Group(),envelope=new T.Mesh(new T.CapsuleGeometry(s.radius,s.length,4,8),capsuleMaterial.clone()),bone=new T.Mesh(new T.CylinderGeometry(.012,.012,s.length,6),boneMaterial),weight=new T.Mesh(new T.SphereGeometry(.032*Math.cbrt(s.mass),12,8),weightMaterial);if(s.name==='head'){weight.material=new T.MeshStandardMaterial({color:0xf18a65});envelope.material=capsuleMaterial.clone();envelope.material.color.set(0xf1a485);const face=new T.Mesh(new T.ConeGeometry(.026,.07,5),new T.MeshBasicMaterial({color:0xffd0b6}));face.rotation.z=-Math.PI/2;face.position.x=.10;group.add(face);}group.add(envelope,bone,weight);scene.add(group);return {group,envelope};});
const joints=Object.fromEntries(Object.keys(start.points).map(id=>{const m=new T.Mesh(new T.SphereGeometry(.018,8,6),jointMaterial);scene.add(m);return [id,m];}));
const center=new T.Mesh(new T.SphereGeometry(.035,16,10),new T.MeshBasicMaterial({color:0xffce50,depthTest:false}));center.renderOrder=5;scene.add(center);
const projection=new T.Mesh(new T.RingGeometry(.035,.052,20),new T.MeshBasicMaterial({color:0xffce50,side:T.DoubleSide}));projection.rotation.x=-Math.PI/2;scene.add(projection);
const contactMaterial=new T.MeshBasicMaterial({color:0x86ed8c,side:T.DoubleSide}),contacts=Array.from({length:50},()=>{const m=new T.Mesh(new T.RingGeometry(.022,.04,16),contactMaterial);m.rotation.x=-Math.PI/2;scene.add(m);return m;});
const lineGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),line=new T.Line(lineGeometry,new T.LineDashedMaterial({color:0xffce50,dashSize:.035,gapSize:.025}));scene.add(line);
const track=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:161},(_,i)=>new T.Vector3(...sampleWeightedRoll(ROLL_DURATION*i/160).center))),new T.LineBasicMaterial({color:0xe3b755,transparent:true,opacity:.55}));scene.add(track);
const wall=new T.Group(),wallMat=new T.MeshStandardMaterial({color:0x9b9683,roughness:1,transparent:true,opacity:.8}),frameMat=new T.MeshStandardMaterial({color:0xead9a5,roughness:.9});scene.add(wall);
function box(y,z,h,w,material=wallMat,depth=.16){const m=new T.Mesh(new T.BoxGeometry(depth,h,w),material);m.position.set(0,y,z);wall.add(m);}
box(.425,0,.85,1);box(1.775,0,.45,1);for(const z of [-.8,.8])box(1,z,2,.6);
for(const y of [.8625,1.5375])box(y,0,.025,1,frameMat,.18);for(const z of [-.4875,.4875])box(1.2,z,.7,.025,frameMat,.18);
const glass=createWindowShatter({kind:'window-concrete'});glass.group.rotation.y=Math.PI/2;scene.add(glass.group);
const audio=new Audio('../assets/audio/glass-smash-rubberduck-cc0.ogg');audio.volume=.65;audio.preload='auto';
function stopAudio(){audio.pause();audio.currentTime=0;}
$('sound').onchange=()=>{if(!$('sound').checked)stopAudio();};
$('time').max=ROLL_DURATION;
let time=0,playing=false,last=performance.now(),state=start,collisions;
const profiles={};let profile=null,profileId='mannequin';
function updateProfile(){
 profileId=$('species').value;profile=profiles[profileId]||null;
 const envelopes=envelopeSegments(state,profile);
 envelopes.forEach((s,i)=>{bodies[i].envelope.geometry.dispose();bodies[i].envelope.geometry=new T.CapsuleGeometry(s.radius,s.length,6,12);});
 $('diameters').replaceChildren();for(const s of envelopes.filter(s=>s.category!==null)){
  const row=document.createElement('tr');for(const text of [s.name,s.diameter.toFixed(3)+' tiles']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}$('diameters').append(row);
 }
 $('profile-note').textContent=profile?`${profile.label}: conservative rest-mesh thickness only (${profile.source.file}). Same mannequin bones, motion and 81 kg mass; not animal fitting. Muzzle, ears, horns and source cap make these capsules especially loose. Tails, equipment and red hats excluded.`:'Mannequin dimensions: original segment radii; diameter = 2 × radius. One tile = 1 world unit.';
 render();
}
$('species').onchange=updateProfile;
const profilesReady=fetch('./body-envelope-profiles.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
 Object.assign(profiles,data.profiles);for(const [id,p] of Object.entries(profiles)){const option=document.createElement('option');option.value=id;option.textContent=p.label+(p.supported?'':' (separate bird envelope needed)');option.disabled=!p.supported;$('species').append(option);}
 const requested=new URLSearchParams(location.search).get('species');if(profiles[requested]?.supported)$('species').value=requested;updateProfile();return true;
}).catch(error=>{$('profile-note').textContent='Species measurements unavailable: '+error.message+'. Mannequin checks remain active.';return false;});
function showCollisions(){
 collisions=collisionReport(state,profile);
 const overlapNames=new Set(collisions.overlaps.flatMap(h=>[h.a,h.b])),nearNames=new Set(collisions.near.flatMap(h=>[h.a,h.b]));
 state.segments.forEach((s,i)=>{const mesh=bodies[i].envelope,warning=$('warnings').checked&&(overlapNames.has(s.name)||nearNames.has(s.name));mesh.visible=$('envelope').checked||warning;mesh.material.color.set(warning?(overlapNames.has(s.name)?0xff4c54:0xffc35c):s.name==='head'?0xf1a485:0x8ac7d4);mesh.material.opacity=warning?.38:.17;mesh.material.depthTest=!warning;mesh.renderOrder=warning?4:0;});
 const self=collisions.overlaps.filter(h=>h.kind==='self').length,world=collisions.overlaps.length-self;
 $('collision-summary').textContent=`${self} body overlap warnings · ${world} window/ground overlap warnings · ${collisions.near.length} near contacts (under 0.020 tile). Overlaps ignore the first 0.001 tile. ${profile?'Conservative species proxy, not confirmed mesh collisions.':'Capsule checks only; no motion approval.'}`;
 $('collision-summary').style.color=collisions.overlaps.length?'#ff9297':'#ffd58b';
 $('collision-list').replaceChildren();for(const h of collisions.hits){const li=document.createElement('li');li.textContent=`${h.a} ↔ ${h.b}: ${h.severity==='overlap'?h.penetration.toFixed(3)+' tile overlap':Math.max(0,h.gap).toFixed(3)+' tile clearance / contact'} (${h.kind})`;$('collision-list').append(li);}
}

function render(){state=sampleWeightedRoll(time);glass.sample(state.glassTime);wall.visible=!$('cutaway').checked;state.segments.forEach((s,i)=>{const a=new T.Vector3(...state.points[s.a]),b=new T.Vector3(...state.points[s.b]),body=bodies[i];body.group.position.copy(a).lerp(b,.5);body.group.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());});showCollisions();for(const [id,p]of Object.entries(state.points))joints[id].position.fromArray(p);center.position.fromArray(state.center);projection.position.set(state.center[0],.004,state.center[2]);projection.material.color.set(state.mode==='static kneel'?(state.balanced?0x86ed8c:0xff6644):0xffce50);
 contacts.forEach((m,i)=>{m.visible=i<state.contacts.length;if(m.visible)m.position.set(state.contacts[i].point[0],state.contacts[i].point[1]+.006,state.contacts[i].point[2]);});lineGeometry.attributes.position.setXYZ(0,...state.center);lineGeometry.attributes.position.setXYZ(1,state.center[0],.008,state.center[2]);lineGeometry.attributes.position.needsUpdate=true;line.computeLineDistances();track.visible=$('path').checked;
 $('time').value=time;$('play').textContent=playing?'Pause':'Play';$('status').textContent=`${time.toFixed(2)} / ${ROLL_DURATION.toFixed(2)} s  |  ${state.phase}  |  ${state.totalMass} kg  |  ${state.mode==='static kneel'?(state.balanced?'Kneel supported':'Outside support'):'Authored motion — physical validity unverified'}`;$('contacts').textContent='Support contact: '+[...new Set(state.contacts.map(c=>c.segment))].join(', ');renderer.render(scene,camera);}
function resize(){const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h,false);const compact=$('entry').value==='braced',span=compact?3.5:4.8,focus=compact?.35:1.3;camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.01;camera.far=100;camera.position.set(...({side:[focus,1.6,9],three:[-4,3.3,8],front:[9,2.3,0]}[$('view').value]));camera.lookAt(focus,.8,0);camera.updateProjectionMatrix();render();}
function seek(t){if(!Number.isFinite(t))throw Error('Invalid seek');playing=false;stopAudio();time=T.MathUtils.clamp(t,0,ROLL_DURATION);render();return state;}
$('play').onclick=()=>{if(time>=ROLL_DURATION)time=0;playing=!playing;if(!playing)stopAudio();last=performance.now();render();};$('reset').onclick=()=>seek(0);$('time').oninput=()=>seek(Number($('time').value));$('view').onchange=resize;for(const id of ['envelope','path','cutaway','warnings'])$(id).onchange=render;function setEntry(){stopAudio();playing=false;time=0;const braced=$('entry').value==='braced';sampleWeightedRoll=braced?sampleBracedWindow:sampleWeightedWindow;ROLL_DURATION=braced?BRACED_DURATION:WINDOW_DURATION;ROLL_PHASES=braced?BRACED_PHASES:WINDOW_PHASES;WINDOW_IMPACT=braced?BRACED_IMPACT:DIVE_IMPACT;$('time').max=ROLL_DURATION;$('phases').replaceChildren();for(const phase of ROLL_PHASES){const b=document.createElement('button');b.textContent=phase.label;b.onclick=()=>seek((phase.start+phase.end)/2);$('phases').append(b);}track.geometry.dispose();track.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:201},(_,i)=>new T.Vector3(...sampleWeightedRoll(ROLL_DURATION*i/200).center)));resize();}
$('entry').onchange=setEntry;window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;stopAudio();render();}});
const params=new URLSearchParams(location.search);if(['side','three','front'].includes(params.get('view'))) $('view').value=params.get('view');
if(params.get('entry')==='dive')$('entry').value='dive';setEntry();updateProfile();
window.weightedWindowStudy={seek,profilesReady,diagnostics:()=>({...state,duration:ROLL_DURATION,entry:$('entry').value,profile:profileId,collisions,renderedEnvelopes:bodies.map(b=>({radius:b.envelope.geometry.parameters.radius,visible:b.envelope.visible,color:b.envelope.material.color.getHex()})),glass:glass.diagnostics()})};function tick(now){if(playing){const previous=time;time=Math.min(ROLL_DURATION,time+Math.min((now-last)/1000,.05)*Number($('speed').value));if(previous<WINDOW_IMPACT&&time>=WINDOW_IMPACT&&$('sound').checked){audio.playbackRate=Number($('speed').value);audio.play().catch(()=>{});}if(time>=ROLL_DURATION)playing=false;render();}last=now;requestAnimationFrame(tick);}resize();requestAnimationFrame(tick);
