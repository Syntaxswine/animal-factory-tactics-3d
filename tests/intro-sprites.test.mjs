// Intro sprite proof: the pure contracts behind keyframes.html and proof.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {heliPath,artPitch,cameraAt,PROOF_START,PROOF_END,EVENTS,REST,TOUCHDOWN,CLOSEUP,KEYFRAME_TIMES} from '../dist/tactics/intro-sprites/trajectory.js';
import {plateGeometry,plateSpec,WIDTH,HEIGHT,PLATE_TILE} from '../dist/tactics/intro-sprites/proof.js';
import {buildSector,HEIGHT_SCALE,ROCK_DETAIL} from '../dist/tactics/intro-sprites/crash-sector.js';
import {closeupView,closeupSpec,traceRay,CLOSEUP_CAMERA} from '../dist/tactics/intro-sprites/closeup.js';
import {planFlora,planLedges} from '../dist/tactics/intro-sprites/painted-trees.js';
import {keepClear} from '../dist/tactics/intro-sprites/plate.js';
import {splitTone,SPLIT} from '../dist/tactics/intro-sprites/grade.js';

const dir=new URL('../dist/tactics/intro-sprites/',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,dir)));
const map=JSON.parse(readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/rough-plateau.json',import.meta.url))),woodland=read('crash-sector-woodland.json');
// The sectors the plates are painted from: the wide shots' and the close-up's.
let sector,closeSector;const S=()=>sector??=buildSector(map,woodland,{heightScale:HEIGHT_SCALE.wide,detail:ROCK_DETAIL.wide});
const SC=()=>closeSector??=buildSector(map,woodland,{heightScale:HEIGHT_SCALE.closeup,extend:true,detail:ROCK_DETAIL.closeup});

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
 // In open air over the (stretched) summit: the skids clear the tallest tree
 // the plateau can grow (4.3, the game-scale bound below) by 2 units or more,
 // the whole way to the rim.
 let over=0;for(let t=PROOF_START;t<CLOSEUP.end;t+=.01){const p=heliPath(t);if(s.levelAt(p.x,p.y)!==2)continue;over++;assert.ok(p.h>2*s.LH+4.3+2,`skids among the plateau's crowns at ${t.toFixed(2)} s`);}
 assert.ok(over>50);
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

test('the committed plates were painted for the current cameras, heights, rock detail and haze', ()=>{
 const wide=read('plate/crash-plate.json'),close=read('plate/cliff-plate.json');
 assert.deepEqual(wide.spec,JSON.parse(JSON.stringify(plateSpec())),'re-run tools/render-intro-plate.mjs');
 assert.deepEqual(close.spec,JSON.parse(JSON.stringify(closeupSpec())),'re-run tools/render-intro-closeup.mjs');
 assert.ok(existsSync(new URL('plate/crash-plate.webp',dir))&&existsSync(new URL('plate/cliff-plate.webp',dir)));
});

test('the close-up cuts in after the hit and back out before the push-in to the crash', ()=>{
 assert.ok(CLOSEUP.start>EVENTS.hit+.5,'the hit plays in the wide shot first');
 assert.ok(CLOSEUP.end<=23.6&&CLOSEUP.end>CLOSEUP.start+2,'at least two seconds of close-up');
 assert.ok(KEYFRAME_TIMES[0]>CLOSEUP.start&&KEYFRAME_TIMES[0]<CLOSEUP.end,'still 0 is a frame of the close-up');
 assert.ok(KEYFRAME_TIMES.A>=CLOSEUP.end,'still A is a frame of the wide shot after it');
});

test('the close-up aircraft frames cover the cut and sit on the plate', ()=>{
 const seq=read('heli-closeup/sequence.json'),[W,H]=CLOSEUP_CAMERA.plate;
 assert.ok(seq.from<=CLOSEUP.start&&seq.to>=CLOSEUP.end);
 assert.deepEqual(seq.camera,JSON.parse(JSON.stringify(CLOSEUP_CAMERA)),'re-run tools/bake-intro-heli-closeup.mjs');
 for(const [i,f] of seq.frames.entries()){
  assert.ok(Math.abs(f.t-(seq.from+i/seq.fps))<1e-3,'frame '+i+' time');
  const [,x,y,w,h]=f.sprite;assert.ok(x>=0&&y>=0&&x+w<=2048&&y+h<=2048);
  assert.ok(f.pos[0]+w>0&&f.pos[1]+h>0&&f.pos[0]<W&&f.pos[1]<H,'frame '+i+' on the plate');}
});

test('in the close-up the aircraft is in front of the rock, never inside or behind it', ()=>{
 const s=SC(),V=closeupView();let checked=0;
 for(let t=CLOSEUP.start;t<=CLOSEUP.end;t+=.1){
  const p=heliPath(t),c=[p.x,p.y,p.h+1.2],d=[c[0]-V.C[0],c[1]-V.C[1],c[2]-V.C[2]],L=Math.hypot(...d),dir=d.map(v=>v/L);
  assert.ok(!s.solidAt(...c),`cabin inside rock at ${t.toFixed(1)} s`);
  const hit=traceRay(s,V.C,dir);
  assert.ok(!hit||hit.t>L,`rock between the lens and the aircraft at ${t.toFixed(1)} s (hit at ${hit&&hit.t.toFixed(1)}, aircraft at ${L.toFixed(1)})`);
  // Once the cabin is below the summit, the wall stands right behind it.
  if(c[2]<2*s.LH)assert.ok(hit&&hit.kind==='face'&&hit.t<L+40,`no cliff behind the aircraft at ${t.toFixed(1)} s`);
  checked++;}
 assert.ok(checked>=20);
});

test('the close-up tracer stops at the first rock a fine march finds', ()=>{
 // A ray running alongside the cliff just beyond the safe distance once took
 // ever shorter steps and ran out of iterations short of the rock: 3.8% of the
 // close-up's rock pixels came back empty. Every ray over the wall here must
 // stop within half a tile of the first solid a 0.02-tile march meets.
 const s=SC(),V=closeupView(undefined,.25);let n=0,bad=0;
 for(let py=Math.round(V.H*.3);py<V.H*.92;py+=5)for(let px=0;px<V.W*.86;px+=7){
  const d=V.ray(px+.5,py+.5),hit=traceRay(s,V.C,d);let first=null;
  for(let t=.5;t<260;t+=.02){const x=V.C[0]+d[0]*t,y=V.C[1]+d[1]*t,h=V.C[2]+d[2]*t;if(h<0||s.solidAt(x,y,h)){first=t;break;}}
  if(first===null)continue;n++;if(!hit||Math.abs(hit.t-first)>.5)bad++;}
 assert.ok(n>800,`rays over the wall (${n})`);assert.ok(bad<=n*.002,`${bad} of ${n} rays stop away from the first rock`);
});

test('across the cut out of the close-up, the cliff behind the aircraft is the same tier, height and size', ()=>{
 // The architect, 2026-10-13: "The towering close-up becomes a considerably
 // smaller cliff in the wide view. ... the helicopter's position against
 // recognizable ledges should help those shots feel like the same place."
 // Behind the cabin on screen: which tier, how far up it, and how many
 // aircraft heights (3.3 units, skids to rotor head) the cliff stands there.
 const AIR=3.3,cu=SC(),wi=S(),V=closeupView(),t=CLOSEUP.end-.05,p=heliPath(t),c=[p.x,p.y,p.h+1.2];
 const d0=c.map((v,k)=>v-V.C[k]),L=Math.hypot(...d0),dir=d0.map(v=>v/L),hit=traceRay(cu,c.map((v,k)=>v+dir[k]*.01),dir);
 assert.ok(hit&&hit.kind==='face','the close-up shows a cliff face behind the cabin');
 const tierC=hit.h<=cu.LH?1:2,fracC=(hit.h-(tierC-1)*cu.LH)/cu.LH,sizeC=(2*cu.LH/(L+hit.t))/(AIR/L);
 // The wide shot: the game camera's eye ray through the cabin, marched away
 // from the camera (one unit down the screen point moves x and y each back by
 // sqrt2 cos 30 deg, crash-sector.js makeView).
 const q=heliPath(CLOSEUP.end),cw=[q.x,q.y,q.h+1.2],back=Math.SQRT2*Math.cos(Math.PI/6);let tierW=0,fracW=0;
 for(let h=cw[2];h>0;h-=.01){const x=cw[0]-(cw[2]-h)*back,y=cw[1]-(cw[2]-h)*back;
  if(wi.solidAt(x,y,h)){tierW=h<=wi.LH?1:2;fracW=(h-(tierW-1)*wi.LH)/wi.LH;break;}}
 const sizeW=2*wi.LH/AIR;
 assert.equal(tierW,tierC,'same tier behind the cabin');
 assert.ok(Math.abs(fracW-fracC)<.15,`height up the tier: close-up ${fracC.toFixed(2)}, wide ${fracW.toFixed(2)}`);
 assert.ok(Math.abs(sizeC/sizeW-1)<.2,`cliff in aircraft heights: close-up ${sizeC.toFixed(2)}, wide ${sizeW.toFixed(2)}`);
});

test('the relief never reaches past its bounds (the tracer\'s safe steps and the cutoff rely on them)', ()=>{
 // ROUT and RIN are sums of their terms' maxima; a term left out, or a term
 // made stronger, must show here (the cutoff test below only sees gross misses).
 for(const s of [S(),SC()]){let out=0,inn=0;
  for(let i=0;i<120000;i++){const x=120+((i*7919)%10000)/100,y=40+((i*104729)%10000)/100,lev=1+(i%2),h=(lev-1)*s.LH+((i*31)%997)/997*s.LH,d=s.rock(x,y,h).disp;if(d>out)out=d;if(-d>inn)inn=-d;}
  assert.ok(out>1&&inn>2,'the sample reaches well into the relief');
  assert.ok(out<=s.ROUT,`out ${out.toFixed(2)} past ROUT ${s.ROUT.toFixed(2)}`);assert.ok(inn<=s.RIN,`in ${inn.toFixed(2)} past RIN ${s.RIN.toFixed(2)}`);}
});

test('the rock function\'s cutoff never changes the answer (the tracer\'s safe steps rely on it)', ()=>{
 // Past ROUT outside and RIN inside the outline, rockG answers from the outline
 // alone. That is only right if no relief term can reach that far: sample just
 // beyond both cutoffs and compare with the full outline-plus-relief answer.
 for(const s of [S(),SC()]){let n=0,wrong=0;
  for(let i=0;i<40000;i++){const x=110+((i*7919)%12000)/100,y=30+((i*104729)%11000)/100,lev=1+(i%2),h=(lev-1)*s.LH+((i*31)%997)/997*s.LH;
   const sd=s.sdAt(lev,x,y),beyond=(sd>s.RIN+.2&&sd<s.RIN+3)||(sd<-s.ROUT-.2&&sd>-s.ROUT-3);if(!beyond)continue;n++;
   if(Math.sign(sd+s.rock(x,y,h).disp)!==Math.sign(sd))wrong++;}
  assert.ok(n>300,`enough samples just beyond the cutoffs (${n})`);assert.equal(wrong,0,`${wrong} of ${n} points where the cutoff overrides the relief`);}
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

test('the cliff plants stand on ledges, never stuck to a bare face', ()=>{
 // Round 3 put 62% of them on vertical rock with nothing under their roots.
 for(const s of [S(),SC()]){const L=planLedges(s,[150,70,200,130],{seed:13,density:.7});
  assert.ok(L.length>30,`cliff plants (${L.length})`);
  for(const t of L){assert.ok(!s.solidAt(t.x,t.y,t.base+.05),`plant inside rock at ${t.x.toFixed(1)},${t.y.toFixed(1)}`);
   let under=false;for(let d=.02;d<=.12;d+=.02)if(s.solidAt(t.x,t.y,t.base-d)){under=true;break;}
   assert.ok(under,`plant on a bare face at ${t.x.toFixed(1)},${t.y.toFixed(1)},${t.base.toFixed(2)}`);}}
});

test('the split tone cools and greys the shade, warms the light, and leaves rock alone', ()=>{
 const hsv=([r,g,b])=>{r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),c=M-m;const h=c===0?0:M===r?60*(((g-b)/c+6)%6):M===g?60*((b-r)/c+2):60*((r-g)/c+4);return [h,M?c/M:0,M];};
 const px=[70,64,30,255, 210,190,110,255, 100,100,95,255, 90,130,190,255, 100,96,85,255];
 const at=[0,4,8,12,16],before=at.map(i=>hsv(px.slice(i,i+3))),out=splitTone(Uint8ClampedArray.from(px)),after=at.map(i=>hsv(Array.from(out.slice(i,i+3))));
 assert.ok(after[0][0]>before[0][0]+15,'dark olive shade turns toward green');
 assert.ok(after[0][1]<before[0][1]*.6,'and loses saturation');
 assert.ok(Math.abs(after[1][0]-SPLIT.warmHue)<Math.abs(before[1][0]-SPLIT.warmHue),'sunlit grass warms toward the key hue');
 assert.deepEqual(Array.from(out.slice(8,11)),[100,100,95],'shaded grey rock (saturation .05) is untouched');
 assert.deepEqual(Array.from(out.slice(12,15)),[90,130,190],'sky blue is outside the vegetation band');
 assert.ok(Math.abs(after[4][0]-before[4][0])<8,'ochre-grey rock in shade (saturation .15) keeps its hue, not foliage green');
});
