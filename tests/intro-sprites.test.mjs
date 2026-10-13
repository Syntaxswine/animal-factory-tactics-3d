// Intro sprite proof: the pure contracts behind keyframes.html and proof.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {heliPath,artPitch,cameraAt,PROOF_START,PROOF_END,EVENTS,REST,TOUCHDOWN} from '../dist/tactics/intro-sprites/trajectory.js';
import {plateGeometry,WIDTH,HEIGHT,PLATE_TILE} from '../dist/tactics/intro-sprites/proof.js';
import {buildSector} from '../dist/tactics/intro-sprites/crash-sector.js';
import {planFlora} from '../dist/tactics/intro-sprites/painted-trees.js';
import {keepClear} from '../dist/tactics/intro-sprites/keyframes.js';

const dir=new URL('../dist/tactics/intro-sprites/',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,dir)));
const map=JSON.parse(readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/rough-plateau.json',import.meta.url))),woodland=read('crash-sector-woodland.json');
let sector;const S=()=>sector??=buildSector(map,woodland);

test('the wreck comes to rest in the centre of the user\'s circle', ()=>{
 assert.deepEqual(REST,[205.5,104]);
 assert.deepEqual([woodland.markedClearing.x,woodland.markedClearing.y],[205.5,104]);
 const end=heliPath(PROOF_END);
 assert.ok(Math.hypot(end.x-205.5,end.y-104)<.01&&end.h===0);
});

test('the flight is continuous, lands at contact and slides forward only', ()=>{
 let prev=heliPath(PROOF_START),worst=0;
 for(let t=PROOF_START+.005;t<=PROOF_END;t+=.005){const p=heliPath(t);worst=Math.max(worst,Math.hypot(p.x-prev.x,p.y-prev.y,p.h-prev.h));assert.ok(p.x>=prev.x-1e-9,'never slides backward at '+t);prev=p;}
 assert.ok(worst<.06,'largest 5 ms step '+worst);
 assert.equal(heliPath(EVENTS.contact).h,0);
 assert.ok(heliPath(EVENTS.contact-.25).h>0,'still airborne just before contact');
 assert.deepEqual([heliPath(EVENTS.contact).x,heliPath(EVENTS.contact).y],TOUCHDOWN);
});

test('the hit happens over the plateau and the drop crosses the rim', ()=>{
 const s=S(),hit=heliPath(EVENTS.hit);
 assert.equal(s.levelAt(hit.x,hit.y),2,'hit over the summit');
 assert.ok(hit.h>2*2.12+10,'well above the summit');
 assert.equal(s.levelAt(TOUCHDOWN[0],TOUCHDOWN[1]),0,'touchdown on the lower ground');
});

test('the nose is up at contact so the skid rears touch first', ()=>{
 assert.ok(artPitch(EVENTS.contact)>.1);
 assert.ok(artPitch(23)<-.3,'nose down in the drop');
 assert.ok(Math.abs(artPitch(28))<1e-9,'level once the skids carry it');
});

test('the painted plate contains every camera frame of the proof', ()=>{
 const g=plateGeometry(),P=(x,y,h)=>[g.ox+(x-y)*PLATE_TILE/2,g.oy+(x+y)*PLATE_TILE/4-h*PLATE_TILE/Math.SQRT2*Math.cos(Math.PI/6)];
 for(let t=PROOF_START;t<=PROOF_END;t+=.05){const c=cameraAt(t),s=c.w/PLATE_TILE,[fx,fy]=P(...c.F);
  for(const [dx,dy] of [[0,0],[WIDTH,0],[0,HEIGHT],[WIDTH,HEIGHT]]){const px=fx+(dx-c.S[0])/s,py=fy+(dy-c.S[1])/s;assert.ok(px>=0&&py>=0&&px<=g.width&&py<=g.height,`frame corner off the plate at ${t.toFixed(2)} s`);}}
});

test('the committed plate was painted for the current camera path', ()=>{
 const meta=read('plate/crash-plate.json');
 assert.deepEqual(meta.geometry,plateGeometry(),'re-run tools/render-intro-plate.mjs');
 assert.ok(existsSync(new URL('plate/crash-plate.webp',dir)));
});

test('the aircraft frames cover the action at the stated rate', ()=>{
 const seq=read('heli-seq/sequence.json');
 assert.equal(seq.frames.length,Math.round((seq.to-seq.from)*seq.fps)+1);
 assert.ok(seq.from<=EVENTS.hit-.2&&seq.to>=EVENTS.door+.9,'hit through the open door');
 for(const s of [...seq.sheets,...seq.shadowSheets])assert.ok(existsSync(new URL('heli-seq/'+s,dir)),s);
 for(const [i,f] of seq.frames.entries()){
  assert.ok(Math.abs(f.t-(seq.from+i/seq.fps))<1e-3,'frame '+i+' time');
  const [sheet,x,y,w,h]=f.sprite;assert.ok(sheet<seq.sheets.length&&x>=0&&y>=0&&x+w<=seq.sheetSize&&y+h<=seq.sheetSize,'frame '+i+' rect');
  assert.ok(f.anchor.every(Number.isFinite)&&f.tail.length===3&&f.engine.length===3);
  assert.equal(!!f.rotorDisc,f.disc,'disc data exactly when the blades are painted');
 }
 assert.ok(seq.frames.some(f=>f.door>.99),'ends with the door open');
});

test('no tree stands in the landing pocket, its approach or the door\'s sight lane', ()=>{
 const s=S(),flora=planFlora(s,[185,85,226,126],{keepClear:keepClear(),seed:3}).filter(t=>t.kind!=='shrub');
 assert.ok(flora.length>60,'the clearing is ringed by trees');
 for(const t of flora){
  assert.ok(Math.hypot(t.x-205.5,(t.y-104)*1.05)>=8.6,`tree in the pocket at ${t.x.toFixed(1)},${t.y.toFixed(1)}`);
  assert.ok(!(t.y>104&&t.y<120&&Math.abs(t.x-205.5+(t.y-104)*.15)<3.5),`tree in the door lane at ${t.x.toFixed(1)},${t.y.toFixed(1)}`);
 }
});

test('trees keep off the rim: a scree apron at each cliff foot, a setback at each lip', ()=>{
 const s=S(),flora=planFlora(s,[160,80,215,125],{keepClear:keepClear(),seed:3}).filter(t=>t.kind!=='shrub');
 assert.ok(flora.length>200);
 for(const t of flora){assert.ok(s.distUp(t.x,t.y)>=1.7,'apron');assert.ok(s.distDown(t.x,t.y)>=1.1,'lip');assert.ok(t.height<=4.3*1.0001,'game scale');}
});
