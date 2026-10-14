// The intro's first part (storyboard 01-06): the pure contracts behind
// ambush.html and the stills shown to the user.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {approachPath,approachAttitude,heliPath,PERSPECTIVE_LIFT,PROOF_START} from '../dist/tactics/intro-sprites/trajectory.js';
import {SHOTS,shotById,shotSpec,plateName,lensPath,AMBUSH_KEYFRAMES,SAM_LAUNCH} from '../dist/tactics/intro-sprites/ambush.js';
import {samSector,samKeepClear,samSectorKey,SAM_SITE,LAUNCH_DIR,SAM_LOOK} from '../dist/tactics/intro-sprites/sam-sector.js';
import {buildSector,HEIGHT_SCALE,ROCK_DETAIL} from '../dist/tactics/intro-sprites/crash-sector.js';
import {closeupView} from '../dist/tactics/intro-sprites/closeup.js';
import {planFlora} from '../dist/tactics/intro-sprites/painted-trees.js';

const dir=new URL('../dist/tactics/intro-sprites/',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,dir)));
const map=JSON.parse(readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/rough-plateau.json',import.meta.url))),woodland=read('crash-sector-woodland.json');
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
  assert.ok(pb[0]-pa[0]>300,`${id}: crosses ${(pb[0]-pa[0]).toFixed(0)} px to the right`);
  // The keyframe catches the aircraft inside the window, clear of its edges.
  const k=lensPath(AMBUSH_KEYFRAMES[id]),pk=V.project(k.x,k.y,k.h),[W,H]=s.camera.plate;
  assert.ok(pk[0]>200&&pk[0]<W-200&&pk[1]>100&&pk[1]<H-100,`${id} keyframe at ${pk.map(v=>v.toFixed(0))}`);}
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

test('every perspective shot has its plate and frames, painted for the shot as it is now', ()=>{
 for(const s of SHOTS.filter(s=>s.camera)){
  const meta=read(`plate/${plateName(s)}.json`);assert.deepEqual(meta.spec,shotSpec(s),s.id+': stored plate spec');
  assert.ok(existsSync(new URL(`plate/${plateName(s)}.webp`,dir)));
  const seq=read(s.frames+'/sequence.json');assert.deepEqual(seq.camera??seq.size,s.camera??seq.size);
  const k=AMBUSH_KEYFRAMES[s.id],near=Math.min(...seq.frames.map(f=>Math.abs(f.t-k)));
  assert.ok(near<=(seq.fps?.5/seq.fps:1e-6)+1e-9,`${s.id}: a frame at its keyframe (${near})`);
  for(const f of seq.frames)assert.ok(f.sprite&&f.pos,s.id+' frame at '+f.t+' is drawn');}
 const room=read(shotById('02').frames+'/sequence.json');assert.ok(room.frames.some(f=>Math.abs(f.t-AMBUSH_KEYFRAMES['02'])<1e-6));
});
