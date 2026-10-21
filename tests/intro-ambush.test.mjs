// The intro's first part (storyboard 01-06): the pure contracts behind
// ambush.html and the stills shown to the user.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {approachPath,approachAttitude,heliPath,cameraAt,PERSPECTIVE_LIFT,PROOF_START} from '../dist/tactics/intro-sprites/trajectory.js';
import {SHOTS,shotById,shotSpec,plateName,lensPath,lensWindow,inWindow,AMBUSH_KEYFRAMES,SAM_LAUNCH,AMBUSH_ATMOSPHERE,shotSector,
 ROOM_CAMERA,ROOM_LIGHT,ROOM_MIC,HEN_POSE,LINE_SPEECH,lineEnd,beakAt,henPoseAt} from '../dist/tactics/intro-sprites/ambush.js';
import {ROOM_SET} from '../dist/tactics/intro-sprites/room-set.js';
import {samSector,samKeepClear,samSectorKey,SAM_SITE,LAUNCH_DIR,SAM_LOOK} from '../dist/tactics/intro-sprites/sam-sector.js';
import {buildSector,HEIGHT_SCALE,ROCK_DETAIL} from '../dist/tactics/intro-sprites/crash-sector.js';
import {closeupView,closeupSpec,traceRay,sky,CLOSEUP_ATMOSPHERE} from '../dist/tactics/intro-sprites/closeup.js';
import {planFlora} from '../dist/tactics/intro-sprites/painted-trees.js';

const dir=new URL('../dist/tactics/intro-sprites/',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,dir)));
const map=read('crash-sector-map.json'),woodland=read('crash-sector-woodland.json');
let crash4;const C4=()=>crash4??=buildSector(map,woodland,{heightScale:HEIGHT_SCALE.closeup,extend:true,detail:ROCK_DETAIL.closeup});

test('the shots tile the first 20.2 s and hand over to the crash player', ()=>{
 assert.equal(SHOTS[0].from,0);
 for(let i=1;i<SHOTS.length;i++)assert.equal(SHOTS[i].from,SHOTS[i-1].to,'no gap before '+SHOTS[i].id);
 assert.equal(SHOTS.at(-1).to,PROOF_START);
 // The storyboard's beats, in the study's order: radar before the SAM wakes.
 assert.deepEqual(SHOTS.map(s=>s.id),['01','02','03','04','05','06','07']);
 assert.ok(shotById('04').to<=shotById('05').from);
});

test('the approach meets the proof\'s path at 20.2 s in place, direction and speed', ()=>{
 const e=.002,a0=approachPath(PROOF_START-e),a1=approachPath(PROOF_START),b0=heliPath(PROOF_START),b1=heliPath(PROOF_START+e);
 for(const k of ['x','y','h'])assert.ok(Math.abs(a1[k]-b0[k])<1e-6,k+' meets');
 const va=[(a1.x-a0.x)/e,(a1.y-a0.y)/e],vb=[(b1.x-b0.x)/e,(b1.y-b0.y)/e];
 assert.ok(Math.hypot(va[0]-vb[0],va[1]-vb[1])<.05,`velocity ${va} vs ${vb}`);
 // And it is smooth on the way: no 10 ms step longer than the top speed allows.
 let prev=approachPath(0);for(let t=.01;t<=PROOF_START;t+=.01){const p=approachPath(t);assert.ok(Math.hypot(p.x-prev.x,p.y-prev.y)<.12,'jump at '+t.toFixed(2));prev=p;}
});

test('the approach crosses the south rim onto the plateau and clears its trees', ()=>{
 const s=C4(),TREE=2.3*1.8;let onPlateau=null,worst=Infinity;
 for(let t=0;t<=PROOF_START;t+=.05){const p=lensPath(t),lev=s.levelAt(p.x,p.y);if(onPlateau===null&&lev===2)onPlateau=t;worst=Math.min(worst,p.h-(s.heightAt(p.x,p.y)+TREE));}
 assert.equal(s.levelAt(approachPath(0).x,approachPath(0).y),0,'starts over the lowland');
 assert.ok(onPlateau>.5&&onPlateau<4,'crosses the rim during shot 01: '+onPlateau);
 assert.ok(worst>3,'clears the tallest tree by '+worst.toFixed(2));
 assert.equal(PERSPECTIVE_LIFT,+(2*2.12*(HEIGHT_SCALE.closeup-HEIGHT_SCALE.wide)).toFixed(3));
});

test('the aircraft banks into the turn and levels for the hit line', ()=>{
 assert.ok(Math.abs(approachAttitude(5).roll)<.01,'straight leg, wings level');
 let most=0;for(let t=9;t<20;t+=.1)most=Math.max(most,approachAttitude(t).roll);
 assert.ok(most>.06&&most<.25,'right turn banks right, gently: '+most.toFixed(3));
 const end=approachAttitude(PROOF_START-.01);assert.ok(Math.abs(end.roll)<.02&&Math.abs(end.pitch)<.005,'level at the hand-over');
});

test('the nose keeps toward screen right in both approach shots', ()=>{
 for(const id of ['01','03']){const s=shotById(id),V=closeupView(s.camera),a=lensPath(s.from),b=lensPath(s.to),pa=V.project(a.x,a.y,a.h),pb=V.project(b.x,b.y,b.h);
  assert.ok(pb[0]-pa[0]>300,`${id}: crosses ${(pb[0]-pa[0]).toFixed(0)} px to the right`);}
});

// Where the aircraft is in the 1600 x 900 frame at t, through the window the
// player shows (ambush.js lensWindow), and how long it is there.
function inFrame(s,t){const V=closeupView(s.camera),p=lensPath(t),c=V.project(p.x,p.y,p.h+1.2),win=lensWindow(s,t,c);
 return {at:inWindow(s,win,c),length:8.65*V.scaleAt(p.x,p.y,p.h)*win.zoom*1600/s.camera.window[0],win};}
test('the aircraft has presence: large, and whole in the frame for all of 01 and 03', ()=>{
 // The architect, 2026-10-14: "bring the helicopter closer ... give the aircraft
 // more presence". Round 1's 01 drew it 190-220 px long; the frame is 1600.
 for(const id of ['01','03']){const s=shotById(id);
  for(let t=s.from;t<=s.to+1e-9;t+=.1){const {at,length}=inFrame(s,t);
   assert.ok(length>=400,`${id} at ${t.toFixed(1)} s: ${length.toFixed(0)} px long`);
   assert.ok(at[0]-length/2>=0&&at[0]+length/2<=1600&&at[1]>120&&at[1]<780,`${id} at ${t.toFixed(1)} s: in the frame at ${at.map(v=>v.toFixed(0))}`);}}
});

// What fills a shot's frame at t: a grid of rays through its window, traced
// through the 4x butte. Sky = a miss looking up; plateau = a hit on its top.
function frameContents(s,t,n=[48,27]){const V=closeupView(s.camera),{win}=inFrame(s,t),S=shotSector(s,{map,woodland}),k=s.camera.window[0]/1600/win.zoom;let sky=0,plateau=0,all=0;
 for(let j=0;j<n[1];j++)for(let i=0;i<n[0];i++){const fx=(i+.5)/n[0]*1600,fy=(j+.5)/n[1]*900,px=(fx-800)*k+win.cx,py=(fy-450)*k+win.cy,d=V.ray(px,py),hit=traceRay(S,V.C,d);
  all++;if(!hit){if(d[2]>0)sky++;}else if(hit.kind==='top'&&hit.lev===2)plateau++;}
 return {sky:sky/all,plateau:plateau/all};}
test('the approach shots are framed on the plateau, not the pale sky', ()=>{
 // 01 "Currently the pale sky dominates"; 03 "show more plateau". Measured the
 // same way, round 1's 01 was 0.56 sky and 0.09 plateau, its 03 0.85 sky and
 // 0.15 plateau, and neither had terrain behind the aircraft at any time.
 const a=frameContents(shotById('01'),AMBUSH_KEYFRAMES['01']),b=frameContents(shotById('03'),AMBUSH_KEYFRAMES['03']);
 assert.ok(a.sky<.25,'01 sky '+a.sky.toFixed(2));assert.ok(a.plateau>.3,'01 plateau '+a.plateau.toFixed(2));
 assert.ok(b.sky<.1,'03 sky '+b.sky.toFixed(2));assert.ok(b.plateau>.6,'03 plateau '+b.plateau.toFixed(2));
 // And the aircraft is seen against the ground, not against the sky.
 for(const id of ['01','03']){const s=shotById(id),V=closeupView(s.camera),S=shotSector(s,{map,woodland});
  for(let t=s.from+.5;t<=s.to-.5+1e-9;t+=.5){const p=lensPath(t),c=V.project(p.x,p.y,p.h+1.2);assert.ok(traceRay(S,V.C,V.ray(...c)),`${id} at ${t} s: terrain behind the aircraft`);}}
});

// plate.js GRADE's tone filter, brightness(1.2) contrast(1.4) saturate(.72),
// each step clamped like the CSS filter's; the soft light and haze over it only
// brighten a sky further.
const graded=c=>{let v=c.map(x=>Math.min(1,x/255*1.2));v=v.map(x=>Math.min(1,Math.max(0,(x-.5)*1.4+.5)));const L=.2126*v[0]+.7152*v[1]+.0722*v[2];return v.map(x=>255*Math.min(1,Math.max(0,x+(1-.72)*(L-x))));};
const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
test("the new shots' sky keeps the missile trail visible; the crash keeps its own sky", ()=>{
 // The architect, 2026-10-14: "the missile trail disappears into the white
 // background. Adjust these new shots while preserving the approved crash's
 // appearance." The trail is the smoke sprite washed 80% toward (246,244,238).
 const trail=lum(graded([246,244,238])),A=AMBUSH_ATMOSPHERE,C=CLOSEUP_ATMOSPHERE,mid=A.horizon.map((v,i)=>(v+A.top[i])/2);
 for(const [name,c] of [['horizon',A.horizon],['haze',A.haze],['mid sky',mid]])assert.ok(trail-lum(graded(c))>=40,`${name}: the trail is ${(trail-lum(graded(c))).toFixed(0)} brighter`);
 assert.ok(Math.max(...graded(A.horizon))<235,'the ambush horizon is not clipped');
 // Round 1's (the close-up's) horizon went white: the falsifier for the above.
 assert.ok(trail-lum(graded(C.horizon))<5,"the close-up's sky clips with the trail");
 for(const s of SHOTS.filter(s=>s.camera))assert.deepEqual(shotSpec(s).atmosphere,A,s.id);
 assert.equal(closeupSpec().atmosphere,undefined,"the crash close-up's spec is unchanged");
});

test('the missiles leave toward screen right, as they arrive from screen left in the crash sector', ()=>{
 const look=SAM_LOOK,dir=LAUNCH_DIR;assert.ok(Math.abs(look[0]*dir[0]+look[1]*dir[1])<1e-9,'the shots look across the launch line');
 for(const id of ['05','06']){const s=shotById(id),seq=read(s.frames+'/sequence.json'),V=closeupView(s.camera);
  for(const tr of seq.tracks){const P=tr.points,a=V.project(...P[0].slice(1,4)),b=V.project(...P[10].slice(1,4));
   assert.ok(b[0]>a[0]&&b[1]<a[1],`${id}: a missile goes right and up (${a.map(v=>v.toFixed(0))} -> ${b.map(v=>v.toFixed(0))})`);}
  assert.deepEqual(seq.tracks.map(t=>t.birth),[...SAM_LAUNCH.launches]);}
});

test('the SAM sector is its own deterministic set with an empty clearing', ()=>{
 const a=samSector(),b=samSector();assert.deepEqual(a.woodland.rows,b.woodland.rows);assert.match(samSectorKey(),/^sam-[0-9a-f]{8}$/);
 const s=buildSector(a.map,a.woodland,{heightScale:HEIGHT_SCALE.closeup,extend:true,detail:ROCK_DETAIL.closeup});
 assert.equal(s.levelAt(SAM_SITE.x,SAM_SITE.y),0,'the launcher stands on level ground');
 const near=planFlora(s,[SAM_SITE.x-40,SAM_SITE.y-40,SAM_SITE.x+40,SAM_SITE.y+40],{keepClear:samKeepClear(),seed:3}).filter(t=>Math.hypot(t.x-SAM_SITE.x,t.y-SAM_SITE.y)<20);
 assert.equal(near.length,0,'no tree within 20 tiles of the launcher');
 // Not the crash sector: the set is generated, never the user's map.
 assert.notEqual(a.map.name,map.name);
});

test('the sky has no seam across the wide plates', ()=>{
 // Its hills and clouds are noise keyed on the bearing, and atan2's bearing
 // jumps a full turn at due west, which 01's wide plate looks across. Walk
 // each plate's bearings, left edge to right, at 8.6 degrees up (above every
 // hill: only sky and clouds there), two pixels a step: no seam.
 const walk=(s,ahead)=>{const V=closeupView(s.camera),aim=Math.atan2(V.f[1],V.f[0]),at=px=>{const d=V.ray(px,V.cy);let th=Math.atan2(d[1],d[0]);if(th-aim>Math.PI)th-=2*Math.PI;if(th-aim<-Math.PI)th+=2*Math.PI;return th;};
  const a=at(0),b=at(V.W),phi=.15,step=2/V.focal;let prev=null,worst=0;
  for(let th=a;th<=b;th+=step){const c=sky([Math.cos(phi)*Math.cos(th),Math.cos(phi)*Math.sin(th),Math.sin(phi)],AMBUSH_ATMOSPHERE,ahead===null?undefined:aim);if(prev)worst=Math.max(worst,...c.map((v,k)=>Math.abs(v-prev[k])));prev=c;}
  return worst;};
 for(const s of SHOTS.filter(s=>s.camera))assert.ok(walk(s)<4,`${s.id}: a jump of ${walk(s).toFixed(1)}`);
 // The falsifier: without the camera's bearing, 01's sky has its seam.
 assert.ok(walk(shotById('01'),null)>8,'01 without the unwrap: '+walk(shotById('01'),null).toFixed(1));
});

test('the hen speaks her line: one beak movement a syllable, shut outside it', ()=>{
 const sy=LINE_SPEECH.syllables.filter(s=>s[0]).length;let cycles=0,open=false,most=0;
 for(let t=3;t<=10;t+=.005){const b=beakAt(t);most=Math.max(most,b);if(!open&&b>.08){open=true;cycles++;}else if(open&&b<.02)open=false;
  if(t<LINE_SPEECH.start||t>lineEnd())assert.equal(b,0,'shut at '+t.toFixed(3));}
 assert.equal(cycles,sy,'opens once per syllable');assert.ok(most<=LINE_SPEECH.maxBeak&&most>.2,'opens up to '+most.toFixed(2));
 // Her line sits inside her shot.
 assert.ok(LINE_SPEECH.start>=shotById('02').from+.5&&lineEnd()<=shotById('02').to-.5);
 // The pose: turned and leaning toward the microphone, the near wing forward
 // onto the desk (the architect's note), the body still while only the head moves.
 assert.ok(HEN_POSE.turn>.3&&HEN_POSE.lean>.1&&HEN_POSE.wing[2]>1.2);
 const a=henPoseAt(5.3),b=henPoseAt(7.1);for(const k of ['turn','lean','wing','wingTip'])assert.deepEqual(a[k],b[k],k+' holds');
});

test('every perspective shot has its plate and frames, painted for the shot as it is now', ()=>{
 for(const s of SHOTS.filter(s=>s.camera)){
  const meta=read(`plate/${plateName(s)}.json`);assert.deepEqual(meta.spec,shotSpec(s),s.id+': stored plate spec');
  assert.ok(existsSync(new URL(`plate/${plateName(s)}.webp`,dir)));
  const seq=read(s.frames+'/sequence.json');assert.deepEqual(seq.camera??seq.size,s.camera??seq.size);
  const k=AMBUSH_KEYFRAMES[s.id],near=Math.min(...seq.frames.map(f=>Math.abs(f.t-k)));
  assert.ok(near<=(seq.fps?.5/seq.fps:1e-6)+1e-9,`${s.id}: a frame at its keyframe (${near})`);
  // (the launcher's frames are layered: a static base, then a turret and the
  // missiles in flight per frame)
  if(seq.base)assert.ok(seq.base.sprite&&seq.base.pos,s.id+' base');
  for(const f of seq.frames){const g=seq.base?f.turret:f;assert.ok(g?.sprite&&g.pos,s.id+' frame at '+f.t+' is drawn');}}
 // The room: baked for the room, light, microphone, pose and line as they are
 // now, every 20th of a second through the shot, each frame drawn.
 const room=read(shotById('02').frames+'/sequence.json');
 assert.deepEqual(room.spec,JSON.parse(JSON.stringify({camera:ROOM_CAMERA,light:ROOM_LIGHT,mic:ROOM_MIC,pose:HEN_POSE,speech:LINE_SPEECH,set:ROOM_SET})),'room spec');
 assert.equal(room.fps,20);assert.ok(room.from<=shotById('02').from&&room.to>=shotById('02').to);
 assert.ok(room.frames.some(f=>Math.abs(f.t-AMBUSH_KEYFRAMES['02'])<1e-6));for(const f of room.frames)assert.ok(f.sprite,'room frame at '+f.t);
 assert.ok(existsSync(new URL(shotById('02').frames+'/'+room.plate,dir)));
});

test('every shot is animated: frames every 20th of a second from its first moment to its last', ()=>{
 for(const s of SHOTS.filter(s=>s.frames)){const seq=read(s.frames+'/sequence.json');
  assert.equal(seq.fps,20,s.id+' at 20 fps');assert.ok(seq.from<=s.from+1e-9&&seq.to>=s.to-1/20-1e-9,`${s.id}: ${seq.from}-${seq.to} covers ${s.from}-${s.to}`);
  for(let i=1;i<seq.frames.length;i++)assert.ok(Math.abs(seq.frames[i].t-seq.frames[i-1].t-.05)<1e-6,`${s.id}: a gap after ${seq.frames[i-1].t}`);}
});

test('the launcher is baked in layers: a base once, the turret every frame, each missile while it flies', ()=>{
 for(const id of ['05','06']){const s=shotById(id),seq=read(s.frames+'/sequence.json');assert.ok(seq.base?.sprite,id+' base');
  for(const f of seq.frames){assert.ok(f.turret?.sprite,id+' turret at '+f.t);
   const flying=SAM_LAUNCH.launches.map((b,i)=>f.t>=b&&f.t<=b+SAM_LAUNCH.flight?i:-1).filter(i=>i>=0);
   // (a missile may have flown out of the frame: never listed when not flying)
   for(const m of f.missiles)assert.ok(flying.includes(m.i),`${id} at ${f.t}: missile ${m.i} drawn while not in flight`);
   if(id==='06'&&f.t>=SAM_LAUNCH.launches[0]+.05&&f.t<=SAM_LAUNCH.launches[0]+.5)assert.ok(f.missiles.some(m=>m.i===0),`06 at ${f.t}: the first missile is drawn`);}
  // The turret moves; nothing in the base does.
  const a=seq.frames[0].state,b=seq.frames.at(-1).state;assert.ok(id!=='05'||b.pitch-a.pitch>.3,'05: the cradle rises');}
});

test('the cut into the crash: 07 holds the crash camera and meets its first frame', ()=>{
 // The crash player's camera holds its first framing before 20.2 s, so its
 // painted plate (built to contain every camera frame from 20.2 s) contains 07.
 const c0=cameraAt(PROOF_START);for(let t=19.4;t<PROOF_START;t+=.05){const c=cameraAt(t);assert.equal(c.w,c0.w);assert.deepEqual(c.F,c0.F);assert.deepEqual(c.S,c0.S);}
 // The pre-roll's last frame meets the proof's first: the same attitude and
 // rotor hub, from the same place on the path.
 const pre=read('heli-07/sequence.json'),seq=read('heli-seq/sequence.json'),a=pre.frames.at(-1),b=seq.frames[0];
 assert.ok(Math.abs(PROOF_START-a.t-1/20)<1e-6,'the pre-roll ends one frame before the proof');
 for(const k of ['pitch','roll','yaw'])assert.ok(Math.abs(a[k]-b[k])<.004,`${k}: ${a[k]} vs ${b[k]}`);
 for(let i=0;i<2;i++)assert.ok(Math.abs(a.rotorDisc.hub[i]-b.rotorDisc.hub[i])<.5,'rotor hub');
 const p=approachPath(PROOF_START-1e-9),q=heliPath(PROOF_START);assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.h-q.h)<1e-6);
 // And every pre-roll frame has its aircraft and its shadow.
 for(const f of pre.frames)assert.ok(f.sprite&&f.anchor&&f.shadow&&f.rotorDisc,'07 frame at '+f.t);
});
