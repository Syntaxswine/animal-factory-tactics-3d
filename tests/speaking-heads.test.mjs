import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {HEADS,HEAD,speakingField,donkeyNeck} from '../tools/speaking-heads/heads.mjs';
import {MOUTHS} from '../tools/speaking-heads/mouths.mjs';
import {placement} from '../tools/speaking-heads/place.mjs';
import {mouthGeometry,spline} from '../tools/speaking-heads/sculpt.mjs';
import {speakingSourceHash} from '../tools/speaking-heads/source-hash.mjs';
import {fitLips,CURATED} from '../tools/speaking-heads/fit-lips.mjs';
import {seeThrough,holesThrough,frontCurtain,lipTips,closedVisibility,partsAgainstSkin,partsCrossSkin,mouthShading,crownExposure,tongueVisible,selfIntersections,jawLine,loadCharacter} from '../tools/speaking-heads/measure.mjs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {withSpeakingHead,rigSpeakingHead,jawAt,MOUTH_PAINT,SPEECH_OPEN,speechOpen} from '../dist/tactics/speaking-head.js';

// docs/tactics/SPEAKING-HEADS.md: each character's approved head, opened to speak.
const root=new URL('../dist/tactics/',import.meta.url),read=f=>JSON.parse(fs.readFileSync(new URL(f,root)));
const built=(id,level)=>read(`speaking-heads/${id}-${level}.json`);
const LEVELS=['author','10k'];
// A placed (rest) point back in sculpt space: the donkey's painted positions are its sculpt's.
const toSculpt=(head,place,part,i)=>{const P=part.paintPosition||part.position,p=[P[i*3],P[i*3+1],P[i*3+2]];return head.revision?p:place.unmap(p);};
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b[b.length>>1];};

test('the speaking sculpts start from the approved heads, placed as the characters were',()=>{
 // Every vertex of a shipped authoring skull lies on the copied sculpt (|field| ~ 0). Measured
 // when written: medians 7e-6 to 2e-5 and maxima 0.4 to 2.6 mm (the meshing's own error); a
 // copy 1 mm out puts the median near 4e-4.
 for(const head of HEADS){
  const place=placement(head),data=read(head.id==='horse'?'horse-light-data.json':head.file.replace('10k','author')),part=data.parts.find(p=>p.name===head.part);
  assert.ok(part,head.id+' has its skull');
  const d=[];for(let i=0;i<part.position.length/3;i++)d.push(Math.abs(head.field(...toSculpt(head,place,part,i))));
  assert.ok(median(d)<1e-4,`${head.id}: median distance ${median(d)}`);
  assert.ok(Math.max(...d)<3e-3,`${head.id}: largest distance ${Math.max(...d)}`);
 }
});

test('every speaking head was built from the current sources, for every character',()=>{
 const hash=speakingSourceHash(),names=new Set(fs.readdirSync(new URL('speaking-heads/',root)));
 assert.equal(HEADS.length,12);
 for(const head of HEADS)for(const level of LEVELS){
  assert.ok(names.has(`${head.id}-${level}.json`),`${head.id}-${level}.json is missing`);
  const data=built(head.id,level);
  assert.equal(data.sourceHash,hash,`${head.id}-${level}: rebuild with node tools/build-speaking-heads.mjs`);
  assert.equal(data.species,head.id);assert.equal(data.replaces,head.part);assert.equal(data.character,head.file);
 }
 for(const profile of ANIMAL_MOTION_CATALOG)assert.ok(HEAD[profile.id],profile.id+' has a speaking head');
});

test('every part is a closed surface',()=>{
 for(const head of HEADS)for(const level of LEVELS)for(const part of built(head.id,level).parts){
  const P=part.position,ix=part.index,edges=new Map();
  assert.ok(P.every(Number.isFinite)&&part.normal.every(Number.isFinite),`${head.id} ${part.name}: finite`);
  for(let t=0;t<ix.length;t+=3){const [a,b,c]=[ix[t],ix[t+1],ix[t+2]];assert.ok(a!==b&&b!==c&&a!==c,`${head.id} ${part.name}: degenerate triangle`);
   for(const [u,v] of [[a,b],[b,c],[c,a]]){const key=u<v?u+':'+v:v+':'+u;edges.set(key,(edges.get(key)||0)+1);}}
  const open=[...edges.values()].filter(n=>n!==2).length;
  assert.equal(open,0,`${head.id}-${level} ${part.name}: ${open} edges not shared by two triangles`);
 }
});

test('each mouth parts on its painted mouth line: the lip lines are the fit to the line traced off the approved paint',()=>{
 const traces=JSON.parse(fs.readFileSync(new URL('../tools/speaking-heads/painted-mouths.json',import.meta.url)));
 for(const id of Object.keys(CURATED)){const f=fitLips(id,traces),M=MOUTHS[id];
  assert.deepEqual(M.lip.line.map(k=>k[0]),f.line.map(k=>k[0]),id+': the knots');
  M.lip.line.forEach(([x,y],i)=>assert.ok(Math.abs(y-f.line[i][1])<2e-4,`${id}: the line at x ${x} is not the fit (node tools/speaking-heads/fit-lips.mjs)`));
  if(f.across)M.lip.across.forEach(([z,y],i)=>assert.ok(Math.abs(y-f.across[i][1])<2e-4,`${id}: across at ${z}`));
  assert.ok(Math.abs(M.corner.x-f.corner.x)<1e-3&&Math.abs(M.corner.z-f.corner.z)<1e-3,id+': the corner is at the painted line\'s back end');
  // The fitted line follows the painted one: measured when fitted, 0.5 to 1.8 mm rms along the
  // side and 0.2 to 1.8 mm across the front's middle.
  assert.ok(f.residual.side<2.5,`${id}: the cut is ${f.residual.side.toFixed(1)} mm (rms) from the painted line along the side`);
  assert.ok(f.residual.front<2.5,`${id}: the cut is ${f.residual.front.toFixed(1)} mm (rms) from the painted line across the front`);
 }
 // The residual can fail: the goat's straight line before the fit was 6 mm (rms) off its
 // painted line, and a fitted line moved 4 mm is 4 mm off.
 const goat=fitLips('goat',traces),moved=goat.samples.filter(q=>q.kind==='side'&&q.fit);
 const off=Math.sqrt(moved.reduce((s,q)=>s+((q.y-(spline(goat.line)(q.x)+.004))*1000)**2,0)/moved.length);
 assert.ok(off>2.5,`a line 4 mm off is ${off.toFixed(1)} mm (rms) off`);
});

test('closed, a speaking head is its approved head: its outer skin on the approved surface, its lips on their own sides',()=>{
 let lipsChecked=0;
 for(const head of HEADS){
  const M=MOUTHS[head.id],place=placement(head),field=speakingField(head),G=mouthGeometry(M,field);
  for(const level of LEVELS){const data=built(head.id,level),skin=data.parts.find(p=>p.kind==='skin');
   // Every vertex of the outer skin (not the lips' faces, the skin between them at the corners or
   // the mouth inside) lies on the approved surface (the goat's and the donkey's less their side-nostril
   // carves: heads.mjs goatSpeaking), near the mouth too, within the sculpt's own meshing
   // error: measured when written, at most 1.33 mm (the donkey's, at an ear's base, where the
   // field is no distance), and near the mouth at most 1.29 mm; the round-1 heads, sealed, were
   // 4.4 to 7.9 mm off.
   let outer=0,worst=0;
   for(let i=0;i<skin.position.length/3;i++){if(skin.fold[i]>.5||skin.inside[i]>.5)continue;outer++;worst=Math.max(worst,Math.abs(field(...toSculpt(head,place,skin,i))));}
   assert.ok(outer>skin.position.length/3*.6,`${head.id}-${level}: ${outer} outer vertices`);
   assert.ok(worst<1.5e-3,`${head.id}-${level}: the closed outer skin is ${(worst*1000).toFixed(2)} mm off the approved surface`);
   // Where the mouth parts, the lips' outer faces belong wholly to their sides: the lower lip
   // to the jaw, the upper to the head (in front of a beak's gape, the side is the mandible a
   // point is nearer: the upper's hook hangs below the cut there).
   let lower=0,upper=0;
   for(let i=0;i<skin.position.length/3;i++){if(skin.fold[i]>.5||skin.inside[i]>.01)continue;const p=toSculpt(head,place,skin,i),d=G.cut(...p);
    if(G.parting(p[0],p[2])<1||Math.abs(d)<.002||Math.abs(d)>.014||M.mandibles&&p[0]>M.corner.front)continue;
    if(d<0){lower++;assert.ok(skin.jaw[i]>.95,`${head.id}-${level}: lower lip ${skin.jaw[i]}`);}else{upper++;assert.ok(skin.jaw[i]<.05,`${head.id}-${level}: upper lip ${skin.jaw[i]}`);}}
   // (the game mesh may keep no vertex in that band on a small lip; the authoring mesh does)
   if(level==='author')assert.ok(lower>=1&&upper>=1,`${head.id}-${level}: ${lower} lower and ${upper} upper lip vertices checked`);lipsChecked+=lower+upper;
  }
 }
 assert.ok(lipsChecked>200,`${lipsChecked} lip vertices checked in all`);
});

// The round-1 review's acceptance numbers (docs/tactics/hybrid-review/speaking-heads/reviews/
// round-1.md), on both meshes, by its own instruments lifted into the tree (measure.mjs): the
// heads posed as the runtime poses them, drawn as the renderer draws them (back faces culled;
// round 2's review found the instruments drew them, and so missed the closed mouths' leaks).
const OPEN=[6,12,24];
// Known defects, each as measured when written (the architect's follow-up, 15 October 2026): the
// tests hold every other head to its bar, and these in todo tests of their own, at the same bars, so
// they show in every run. The slivers of the head's inside seen first (`backFirst`, mm², over the
// hole test's views, to the hundredth up: it counts sixteenths of a mm²) are a ratchet, held at what
// they measure so none grows unseen, not a bar; no background shows through any of them, and none
// is over 1 mm² at ordinary speech from the portraits and the game's camera (the speech test).
// (Round 5's teeth and tongue through the outer skin, on
// seven game meshes and the hen's beak, and the skunk's game mesh's striped rims are gone: every
// head meets those bars.)
const KNOWN={
 self24:{'donkey-author':2},                                                                // outer pairs crossing at 24°
 backFirst:{'horse-author':1.57,'horse-10k':1.5,'goat-10k':3.94,'bull-author':1.94,'bull-10k':2.13,'cow-author':1.88,'cow-10k':1.25,'donkey-author':1.5,'donkey-10k':1.57,'sheep-10k':1.13,'skunk-author':1.38,'pig-director-10k':1.32,'dog-10k':10.38,'hen-10k':2.94},
};
const known=(kind,head,level)=>(head.id+'-'+level) in (KNOWN[kind]||{});
// The open mouth is a wedge open at its sides and front, its roof and floor the mouth's inside (the
// user, round 4, of the lining rounds 3 and 4 stood inside the lips: "you still have opaque walls on
// the side of the mouth that should be open space", and with a sketch of the open wedge, its sides
// "should be a void space", its roof "should be red, its the inside of the mouth"). So in exact
// profile it is seen through between the lips, as a beak is: by design. What the open head must
// never show is its own inside through a hole, a crack or an inside-out triangle: holesThrough, the
// eye's first surface seen from behind. The views, every 15 degrees all round: at eye level at the
// widest the game opens a jaw in speech (SPEECH_OPEN, 4.5 to 8.6 degrees), at 12 and at 24 degrees;
// from the game's camera, 30 degrees above (hybrid-world.js GAME_CAMERA), and from 15 and 30 degrees
// below (the viewer's portraits look from 22 below) at the widest speech; and as the jaw closes
// through the closed shape's fade, at 0.5, 1 and 1.5 degrees, every 30 degrees round at eye level
// and from the game's camera. (Round 3 looked from the left only, every 30 degrees from the front to
// the rear, and its instrument drew nothing on four game meshes: round 3's review. Round 4's lining
// build counted background enclosed by the head, the mouth's front opening closed by a curtain; with
// the sides open that counts the open mouth itself, 7 to 35 mm² from the game's camera through the
// goat's game mesh and the skunk's, and misses a hole that shows the mouth's inside, not the
// background. Round 4 looked in exact profile and from the game's camera only, and the same slivers
// measured up to 17.75 mm² below eye level and in the fade: round 4's review.)
const seeViews=head=>{const widest=SPEECH_OPEN[head.id]*180/Math.PI,v=[];
 for(let az=-180;az<180;az+=15){for(const deg of [widest,12,24])v.push({deg,az,el:0});for(const el of [30,-15,-30])v.push({deg:widest,az,el});}
 for(const deg of [.5,1,1.5])for(let az=-180;az<180;az+=30)for(const el of [0,30])v.push({deg,az,el});return v;};
const SEE_BAR=1; // mm², the largest one hole
// (messages give the viewer's azimuth, 0 from the character's left, 90 its front: holesThrough's negated)
test('open, the head shows no inside of itself: no hole, crack or inside-out triangle seen, all round, at eye level, from above and from below, and as the jaw closes',()=>{
 // (no background through the head anywhere, from any of them; the slivers the known meshes show,
 // the mouth's inside through them, at what they measured: see KNOWN)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level),bar=Math.max(SEE_BAR,KNOWN.backFirst[head.id+'-'+level]??0);
  for(const {deg,az,el} of seeViews(head)){const s=holesThrough(data,deg,az,{el});
   assert.ok(s.largestBackground<=SEE_BAR,`${head.id}-${level} at ${deg.toFixed(1)}°, from azimuth ${-az}°, ${el}° up: ${s.largestBackground.toFixed(2)} mm² of background seen through the head`);
   assert.ok(s.largest<=bar,`${head.id}-${level} at ${deg.toFixed(1)}°, from azimuth ${-az}°, ${el}° up: ${s.largest.toFixed(2)} mm² of the head's inside seen first (${s.mm2.toFixed(2)} mm² in all)`);}}
});
// Ordinary speech, as the characters will be seen speaking (the architect's review, 15 October 2026:
// "Prioritize the ordinary 4.5–8.6 degree speech range and portrait front/three-quarter/low views"):
// the jaw open 4.5°, midway and at the widest (SPEECH_OPEN), and as every syllable passes the closed
// shape's fade (0.5°, 1° and 1.5°, where a coarse rim folded into the closed crease shows in the
// first millimetre the lips part: held to FADE_BAR, the build's), from the viewer's portraits (its front, its
// three-quarter and its view from below, either side: speaking-heads-viewer.js VIEWS) and the game's
// camera either side (hybrid-world.js GAME_CAMERA, 45° round, 30° above). holesThrough's azimuth is
// the viewer's negated: -90 is the front.
const SPEECH_VIEWS=[['front',-90,0],["three-quarter, the character's left",-54.48,5.73],["three-quarter, its right",-125.52,5.73],["below, its left",-72.81,-21.77],["below, its right",-107.19,-21.77],["the game's camera, its left",-45,30],["the game's camera, its right",-135,30]];
const speechAngles=head=>{const widest=SPEECH_OPEN[head.id]*180/Math.PI;return [4.5,(4.5+widest)/2,widest];},FADE=[.5,1,1.5],FADE_BAR=4;
test('at ordinary speech, from the portraits and the game\'s camera, no sliver of the head\'s inside over 1 mm² (through the closing fade, 4 mm²), no background through it, and no tooth or tongue through the outer skin',()=>{
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of [...FADE,...speechAngles(head)]){
   for(const [name,az,el] of SPEECH_VIEWS){const s=holesThrough(data,deg,az,{el}),bar=deg<2?FADE_BAR:SEE_BAR;
    assert.ok(s.largestBackground===0,`${head.id}-${level} at ${deg.toFixed(1)}°, ${name}: ${s.largestBackground.toFixed(2)} mm² of background seen through the head`);
    assert.ok(s.largest<=bar,`${head.id}-${level} at ${deg.toFixed(1)}°, ${name}: ${s.largest.toFixed(2)} mm² of the head's inside seen first`);}
   if(deg>=4.5)for(const r of partsCrossSkin(data,deg))assert.equal(r.outer,0,`${head.id}-${level} at ${deg.toFixed(1)}°: the ${r.part} cross ${r.outer} triangles of the outer skin`);}}
});
test('the speech test can fail: a patch of a lip\'s face turned over, and incisors moved through the lip, show',()=>{
 // (the horse's authoring mesh at 4.5°: its upper lip's face within 15 mm of its front middle turned
 // inside-out, seen from below; its lower incisors 8 mm forward, through its lower lip)
 const data=built('horse','author'),skin=data.parts[0],P=skin.position,{up}=lipTips(data),U=[P[up*3],P[up*3+1],P[up*3+2]],flipped=Array.from(skin.index);let n=0;
 for(let t=0;t<flipped.length;t+=3){const v=[flipped[t],flipped[t+1],flipped[t+2]];if(!v.every(i=>skin.fold[i]>.5&&skin.lower[i]<=.02))continue;
  if(Math.hypot(...[0,1,2].map(k=>v.reduce((a,i)=>a+P[i*3+k],0)/3-U[k]))>.015)continue;[flipped[t+1],flipped[t+2]]=[flipped[t+2],flipped[t+1]];n++;}
 const below=SPEECH_VIEWS.find(([name])=>name==='below, its left'),seen=holesThrough({...data,parts:[{...skin,index:flipped},...data.parts.slice(1)]},4.5,below[1],{el:below[2]});
 assert.ok(n>0&&seen.largest>SEE_BAR,`${n} triangles of the upper lip's face turned over: ${seen.largest.toFixed(2)} mm² seen first from below`);
 const forward=data.parts.map(p=>p.name==='lower teeth'?{...p,position:p.position.map((v,i)=>i%3===0?v+.008:v)}:p),crossed=partsCrossSkin({...data,parts:forward},4.5).reduce((s,r)=>s+r.outer,0);
 assert.ok(crossed>0,`the lower incisors 8 mm forward cross ${crossed} triangles of the outer skin`);
});
// The share of the opening between the lips that shows the background, in exact profile at 24°: the
// background through the head against the background through the outer skin alone (`extra`, a
// part drawn with the head; the outer skin is drawn without it).
const SIDES_OPEN=.7; // (round 4's .5 passed a flap over the back half of the lip line, 51 to 59%: round 4's review)
// Each mesh's own share as built (the lesser side), less SIDES_SLACK: a ratchet, not a bar. 70%
// passed a flap over the back 40% of the lip line on 9 of 22 mammal meshes, and the rabbit's mouth,
// across her face, no back flap can fail (round 5's review, SHOULD-FIX 6). Measured per column
// along the lip line, as the review proposed, the lips' faces alone cover runs of 1 to 21% of the
// opening's length at its corners, where they meet, and a back-40% wall's runs read 22 to 38%: no
// bar parts them. A back-40% wall takes 12 to 25 points off every other mesh's share and none off
// the rabbit's; a wall over her front 20% takes 22 to 68.
const SIDES_SLACK=.05,SIDES_SEEN={
 'horse-author':0.91, 'horse-10k':0.80, 'goat-author':0.83, 'goat-10k':0.87,
 'bull-author':0.91, 'bull-10k':0.89, 'cow-author':0.89, 'cow-10k':0.87,
 'donkey-author':0.89, 'donkey-10k':0.90, 'sheep-author':0.89, 'sheep-10k':0.80,
 'skunk-author':0.85, 'skunk-10k':0.85, 'pig-foreman-author':0.91, 'pig-foreman-10k':0.81,
 'pig-director-author':0.92, 'pig-director-10k':0.93, 'rabbit-author':0.76, 'rabbit-10k':0.79,
 'dog-author':0.91, 'dog-10k':0.79};
const sidesOpen=(data,az,extra=null)=>{const d=extra?{...data,parts:[...data.parts,extra]}:data;return seeThrough(d,24,az).mm2/seeThrough(d,24,az,{outerOnly:true}).mm2;};
test('open, the mouth is open at its sides: in exact profile from either side at 24 degrees, at least 70% of the opening between the lips shows the background',()=>{
 // (the lips' own faces, seen obliquely, cover 8 to 22% of it, the rabbit's the most, her mouth
 // across the front of her face; teeth and tongue 0.6 to 2.1%: round 4's review. Round 4's lining
 // showed none of it, from either side, on every mammal mesh. The hen's beak is excepted: her front
 // opening, which seeThrough closes, is her whole gape)
 for(const head of HEADS.filter(h=>h.id!=='hen'))for(const level of LEVELS){const data=built(head.id,level);
  for(const az of [0,180]){const share=sidesOpen(data,az),own=SIDES_SEEN[`${head.id}-${level}`];assert.ok(own,`${head.id}-${level}: no share recorded`);
   assert.ok(share>=own-SIDES_SLACK,`${head.id}-${level} from the ${az?'right':'left'} at 24°: ${(share*100).toFixed(0)}% seen through, under its own ${(own*100).toFixed(0)}% as built, less ${SIDES_SLACK*100} points`);
   assert.ok(share>=SIDES_OPEN,`${head.id}-${level} from the ${az?'right':'left'} at 24°: ${(share*100).toFixed(0)}% of the opening between the lips seen through`);}}
});
// A wall over the curtain's triangles (the lips' whole edges, drawn on both sides, posed with the
// skin) whose vertices all lie behind `share` of the lip line from its corner (or, with front, in
// front of that much from its front).
function lipWall(data,share,front=false){const s=data.parts[0],P=s.position,c=Array.from(frontCurtain(data,{whole:true}));
 let corner=Infinity;for(let i=0;i<s.fold.length;i++)if(s.fold[i]>.5)corner=Math.min(corner,P[i*3]);const tip=P[lipTips(data).up*3],index=[];
 const keep=front?v=>v.every(i=>P[i*3]>tip-share*(tip-corner)):v=>v.every(i=>P[i*3]<corner+share*(tip-corner));
 for(let t=0;t<c.length;t+=3){const v=[c[t],c[t+1],c[t+2]];if(!keep(v))continue;index.push(...v,v[0],v[2],v[1]);}
 return {name:'wall',kind:'skin',jaw:s.jaw,inside:s.inside,fold:s.fold,lower:s.lower,position:P,index};}
test('the open-sides measure can fail: a wall standing in the whole opening shows none of it; one over the back 40% of the lip line, as round 3 stood its flaps, fails every mammal mesh but the rabbit, and one across her front corners fails hers',()=>{
 const horse=built('horse','author'),walled=sidesOpen(horse,0,lipWall(horse,Infinity));
 assert.ok(walled<.1,`the horse from the left at 24° with the wall: ${(walled*100).toFixed(0)}% seen through`);
 for(const head of HEADS.filter(h=>h.id!=='hen'))for(const level of LEVELS){const data=built(head.id,level),rabbit=head.id==='rabbit';
  const share=sidesOpen(data,0,rabbit?lipWall(data,.2,true):lipWall(data,.4)),own=SIDES_SEEN[`${head.id}-${level}`];
  assert.ok(share<own-SIDES_SLACK,`${head.id}-${level} from the left at 24° with a wall ${rabbit?'over her front 20%':'over the back 40%'}: ${(share*100).toFixed(0)}% seen through, its own ${(own*100).toFixed(0)}%`);}
});
test('the hole instrument can fail: a hole punched in a cheek and a patch of the mouth\'s floor turned inside-out show, and a head it cannot see throws',()=>{
 // (the hole 4 to 7 cm above the lips, where the head behind the cheek is solid: from the game's
 // camera at the side the eye sees through it into the head, the mouth's floor beyond; the patch,
 // the floor's triangles within 2 cm of 4 cm behind the lower lip's front middle, seen through the
 // open mouth from the same camera; the head without either shows none there)
 const data=built('horse','author'),skin=data.parts[0],P=skin.position,y0=P[lipTips(data).up*3+1],x0=data.mouth.frontCorner[0]-.1;let c=-1;
 for(let i=0;i<P.length/3;i++){if(skin.fold[i]>.5||skin.inside[i]>.5||P[i*3]<x0||P[i*3+1]<y0+.04||P[i*3+1]>y0+.07)continue;if(c<0||P[i*3+2]>P[c*3+2])c=i;}
 const near=i=>Math.hypot(P[i*3]-P[c*3],P[i*3+1]-P[c*3+1],P[i*3+2]-P[c*3+2])<.006,keep=[];
 for(let t=0;t<skin.index.length;t+=3){const v=[skin.index[t],skin.index[t+1],skin.index[t+2]];if(!v.some(near))keep.push(...v);}
 const view=[SPEECH_OPEN.horse*180/Math.PI,0,{el:30}],intact=holesThrough(data,...view),s=holesThrough({...data,parts:[{...skin,index:keep},...data.parts.slice(1)]},...view);
 assert.ok(intact.largest<=SEE_BAR,`the horse without the hole: ${intact.largest.toFixed(2)} mm² of its inside seen`);
 assert.ok(s.largest>50,`a hole 12 mm across punched in the horse's cheek: ${s.largest.toFixed(0)} mm² of its inside seen`);
 // (in exact profile, through it, the background: the gate on background through the head can fail)
 const side=holesThrough({...data,parts:[{...skin,index:keep},...data.parts.slice(1)]},12,0);
 assert.ok(side.largestBackground>50&&holesThrough(data,12,0).largestBackground===0,`the hole from the side: ${side.largestBackground.toFixed(0)} mm² of background through it`);
 const {lo}=lipTips(data),L=[P[lo*3],P[lo*3+1],P[lo*3+2]],flipped=Array.from(skin.index);let n=0;
 for(let t=0;t<flipped.length;t+=3){const v=[flipped[t],flipped[t+1],flipped[t+2]];if(!v.every(i=>skin.inside[i]>.5&&skin.lower[i]>.98))continue;
  if(Math.hypot(v.reduce((a,i)=>a+P[i*3],0)/3-(L[0]-.04),v.reduce((a,i)=>a+P[i*3+2],0)/3)>.02)continue;[flipped[t+1],flipped[t+2]]=[flipped[t+2],flipped[t+1]];n++;}
 const f=holesThrough({...data,parts:[{...skin,index:flipped},...data.parts.slice(1)]},...view);
 assert.ok(n>0&&f.largest>20,`${n} of the floor's triangles turned inside-out: ${f.largest.toFixed(0)} mm² of the head's inside seen`);
 // (and it refuses to read 0 for a head it cannot see: round 3's read 0 drawing nothing)
 assert.throws(()=>holesThrough({...data,parts:[{...skin,index:[]},...data.parts.slice(1)]},12,0),/not in the frame/);
});
const closedOf=(head,level)=>{const data=built(head.id,level),occluder=head.head?loadCharacter(data,level).parts.find(p=>p.name===head.head.part):null;return closedVisibility(data,level,{occluder});};
test('closed, a mouth shows nothing of its inside and nothing through it: no tooth or tongue, no background, from any direction, framed on the whole crease (10 px/mm)',()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen'))for(const level of LEVELS){const c=closedOf(head,level);
  assert.ok(c.teeth.teeth<=.5,`${head.id}-${level}: ${c.teeth.teeth.toFixed(2)} mm² of teeth or tongue seen closed (from azimuth ${c.teeth.az}°, elevation ${c.teeth.el}°)`);
  assert.ok(c.hole.hole<=.5,`${head.id}-${level}: ${c.hole.hole.toFixed(2)} mm² of background through the closed head (from azimuth ${c.hole.az}°, elevation ${c.hole.el}°)`);}
});
test("the closed instrument sees the whole crease: a tooth put through the dog's crease at its corner shows",()=>{
 // (round 3's framed 9 cm about the mouth's middle and read 0 for it: round 3's review)
 const data=built('dog','author'),skin=data.parts[0];let c=-1;for(let i=0;i<skin.fold.length;i++)if(skin.fold[i]>.5&&skin.position[i*3+2]>0&&(c<0||skin.position[i*3]<skin.position[c*3]))c=i;
 const p=[skin.position[c*3],skin.position[c*3+1],skin.position[c*3+2]],r=.002;
 // an octahedron 4 mm across about the crease's last vertex, wound outward
 const P=[[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]].map(o=>o.map((v,k)=>v+p[k])),F=[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]];
 const tooth={name:'a test tooth',kind:'teeth',bone:'head',position:P.flat(),index:F.flat(),teeth:[{kind:'incisor',first:0,count:6}]};
 const seen=closedVisibility({...data,parts:[...data.parts,tooth]},'author').teeth.teeth;
 assert.ok(seen>1,`a 4 mm tooth through the dog's crease at its corner: ${seen.toFixed(2)} mm² seen`);
});
test("closed, the hen's beak shows nothing of its inside",{todo:"closed, her beak leaves a slit along the gape from the side, as her approved beak does (33 mm² of background through its own): 1.1 and 0.02 mm² of background through it (authoring, game); her tongue no longer shows through the game mesh's gape (5.7 mm² in round 5)"},()=>{
 for(const level of LEVELS){const c=closedOf(HEAD.hen,level);assert.ok(c.teeth.teeth<=.5,`hen-${level}: ${c.teeth.teeth.toFixed(1)} mm² of tongue seen closed (from azimuth ${c.teeth.az}°, elevation ${c.teeth.el}°)`);
  assert.ok(c.hole.hole<=.5,`hen-${level}: ${c.hole.hole.toFixed(1)} mm² of background through her closed beak (from azimuth ${c.hole.az}°, elevation ${c.hole.el}°)`);}
});
test('teeth and tongue stay in the skin at every opening: rooted, none through the outer skin; incisors show a crown when open',()=>{
 // (closed, a tooth's vertex outside the skin's solid, on the outer skin's outer side, stands
 // through it, beyond 0.05 mm, half a pixel at the closed test's 10 px/mm: the skunk's game mesh
 // holds an upper incisor's tip 4 µm out, the meshes' positions being written to the micrometre,
 // round 4; open, a crown stands in the opening, outside the solid, beside the lips' outer edges,
 // so there through the outer skin is a tooth crossing its triangles, round 3)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of [0,...OPEN])for(const g of partsAgainstSkin(data,deg)){
   if(deg===0)assert.ok(g.maxPoke<=5e-5,`${head.id}-${level} closed: ${g.kind} ${g.tooth??''} stands ${(g.maxPoke*1000).toFixed(2)} mm through the outer skin`);
   if(g.kind!=='tongue')assert.ok(g.inside>0,`${head.id}-${level} at ${deg}°: ${g.kind} ${g.tooth} has no root in the skin`);}
  for(const deg of OPEN)for(const r of partsCrossSkin(data,deg))assert.equal(r.outer,0,`${head.id}-${level} at ${deg}°: the ${r.part} cross ${r.outer} triangles of the outer skin`);
  if(level==='author')for(const t of crownExposure(data,12).filter(t=>t.kind==='incisor'))assert.ok(t.crown>=.004,`${head.id}: an incisor shows ${(t.crown*1000).toFixed(1)} mm of crown at 12°`);}
});
test('the tongue shows from the front when the mouth opens',()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen')){const v=tongueVisible(built(head.id,'author'),12,0,0);assert.ok(v>=.3,`${head.id}: ${(v*100).toFixed(0)}% of the tongue seen from the front at 12°`);}
});
test("the game mesh's tongue shows from the front too",{todo:"the game mesh's mouth is coarse inside (the user: \"we really dont need a lot of detain inside the mouth\"): the skunk's shows 15% of the tongue from the front at 12°"},()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen')){const v=tongueVisible(built(head.id,'10k'),12,0,0);assert.ok(v>=.3,`${head.id}-10k: ${(v*100).toFixed(0)}% of the tongue seen from the front at 12°`);}
});
test("the hen's tongue shows when her beak opens",{todo:"her upper mandible's hook covers the gape from the front and above at 12°; raised to show, her tongue showed through the closed gape"},()=>{
 const v=tongueVisible(built('hen','author'),12,0,30);assert.ok(v>=.3,`hen: ${(v*100).toFixed(0)}% of the tongue seen from the front and above at 12°`);
});
test("the game mesh's incisors show a crown too",()=>{
 // (round 3's game meshes' gums swelled over some incisors, 3.6 to 3.9 mm on five of them; with the
 // lining gone the least is the pig foreman's, 4.1 mm, round 4)
 for(const head of HEADS)for(const t of crownExposure(built(head.id,'10k'),12).filter(t=>t.kind==='incisor'))assert.ok(t.crown>=.004,`${head.id}-10k: an incisor shows ${(t.crown*1000).toFixed(1)} mm of crown at 12°`);
});
test('the outer skin does not pass through itself as the jaw opens, to 24 degrees',()=>{
 // (the hen's to 12: a beak's mandible turns about its root inside the head part, through the
 // upper mandible's base, by construction past 12 degrees, and the build checks a beak to 12;
 // her speech opens it 8.6 degrees at most, SPEECH_OPEN)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of head.id==='hen'?[6,12]:[6,12,24]){if(deg===24&&known('self24',head,level))continue;const s=selfIntersections(data,deg);assert.equal(s.outer,0,`${head.id}-${level} at ${deg}°: ${s.outer} pairs of outer skin triangles cross`);}}
});
test("no tooth, and not the tongue, passes through a lip's face as the mouth opens",{todo:"inside the open mouth, teeth and tongue graze the lips' inner faces on all eleven mammals (up to 12 triangles on a mesh when written, the bull's game mesh), where the cavity's front slopes up into the lower lip; the mouth's inside is to stay coarse (the user: \"we really dont need a lot of detain inside the mouth\")"},()=>{
 // (round 2's review: on eight game meshes, teeth crossed 1 to 4 of the lips' inner faces, which
 // the poke check, looking only at the outer skin, could not see. Open only: closed, the lips'
 // faces lie folded in the crease inside the closed head, where an overbite's crowns reach across
 // them unseen, the horse's authoring mesh's 4 triangles; that nothing of the inside shows closed
 // is the closed test's, at 10 px/mm)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of OPEN)for(const r of partsCrossSkin(data,deg))assert.equal(r.face,0,`${head.id}-${level} at ${deg}°: the ${r.part} cross ${r.face} triangles of the lips' faces`);}
});
test('open, the mouth shades as surfaces, not stripes',()=>{
 // the share of the area of the lips' faces and the skin between the lips whose shading normal, as
 // the renderer shades it, is over 60 degrees off its triangle (round 2: 17 to 29% of the cheeks
 // on four game meshes, whose normals were the dense sculpt's; round 3 found the instrument blind
 // to the game meshes' cheek triangles that kept no folding vertex, before the cheeks went; round
 // 3's review: held as a todo for all, though most met it; the last, the skunk's game mesh's rims,
 // 10% over 60 degrees off in round 5, are 0.4%, its head sculpted at 2 mm)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of [6,12]){const c=mouthShading(data,deg);assert.ok(c.over60<=.06,`${head.id}-${level} at ${deg}°: ${(c.over60*100).toFixed(0)}% of the open mouth's lips shades over 60 degrees off`);}}
});
test('the jaw carries the whole mandible: weight at least 0.9 along the jaw line seen in profile, from its angle to the chin',()=>{
 // (the hen's lower mandible is rigid by construction)
 for(const head of HEADS.filter(h=>h.id!=='hen')){const line=jawLine(built(head.id,'author')),under=line.filter(p=>p.w<.9);
  assert.ok(line.length>50,`${head.id}: ${line.length} columns`);
  assert.equal(under.length,0,`${head.id}: jaw weight ${Math.min(...under.map(p=>p.w)).toFixed(2)} on the jaw line at x ${under.map(p=>(p.x*1000).toFixed(0)).join(', ')} mm`);}
 // It can fail: a jaw whose weight halves behind the middle of its line (a flap, as in round 1)
 // leaves most of the line's back half under 0.9.
 const dog=built('dog','author'),line=jawLine(dog),mid=(line[0].x+line.at(-1).x)/2,skin=dog.parts[0];
 skin.jaw=skin.jaw.map((w,i)=>skin.position[i*3]<mid?w*.5:w);
 const flap=jawLine(dog),back=flap.filter(p=>p.x<mid);assert.ok(back.filter(p=>p.w<.9).length>back.length*.8,`a flap: ${back.filter(p=>p.w<.9).length} of ${back.length} columns under 0.9`);
});

// The approved surface where a head is written, computed here without the build's own carrying of
// normals: the approved field at the sculpt point written there (the placement undone; the donkey's
// neck revision undone by Newton's method), and its gradient in written space. On the cow, the
// donkey and the pig director, whose approved heads shade with their meshes' own normals (their
// tools'; round 5's review, SHOULD-FIX 4), the normal is the approved skull's at the nearest point.
function approvedSurface(head,level){
 const place=placement(head),field=head.speaking??head.field,e=1e-4;
 const unrevise=y=>{let x=[y[0],y[1]-.11,y[2]];for(let it=0;it<30;it++){const f=donkeyNeck(x),r=f.map((v,k)=>v-y[k]);if(Math.hypot(...r)<1e-12)break;
  const h=1e-6,c=[0,1,2].map(k=>{const a=x.slice();a[k]+=h;return donkeyNeck(a).map((v,j)=>(v-f[j])/h);}),A=[0,1,2].map(j=>[c[0][j],c[1][j],c[2][j]]);
  const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]),D=det(A);
  x=x.map((v,k)=>v-det(A.map((row,j)=>row.map((u,col)=>col===k?r[j]:u)))/D);}return x;};
 const phi=y=>field(...place.unmap(head.revision?unrevise(y):y));
 if(place.meshNormals||head.revision){const s=read(level==='author'?head.file.replace('10k','author'):head.file).parts.find(p=>p.name===head.part),P=s.position,N=s.normal,I=s.index,v=i=>[P[i*3],P[i*3+1],P[i*3+2]];
  // (its vertices' normals across the nearest point's triangle, as it is drawn: weights of the
  // nearest point by Voronoi region, after Ericson)
  const weights=(q,a,b,c)=>{const sub=(x,y)=>[x[0]-y[0],x[1]-y[1],x[2]-y[2]],dot=(x,y)=>x[0]*y[0]+x[1]*y[1]+x[2]*y[2];
   const ab=sub(b,a),ac=sub(c,a),ap=sub(q,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return [1,0,0];
   const bp=sub(q,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return [0,1,0];
   const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);return [1-t,t,0];}
   const cp=sub(q,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return [0,0,1];
   const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);return [1-t,0,t];}
   const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const t=(d4-d3)/((d4-d3)+(d5-d6));return [0,1-t,t];}
   const den=1/(va+vb+vc);return [1-(vb+vc)*den,vb*den,vc*den];};
  return {phi,normal:y=>{let best=Infinity,hit=null;for(let t=0;t<I.length;t+=3){const a=v(I[t]),b=v(I[t+1]),c=v(I[t+2]),w=weights(y,a,b,c),d=[0,1,2].reduce((s,k)=>s+(a[k]*w[0]+b[k]*w[1]+c[k]*w[2]-y[k])**2,0);if(d<best){best=d;hit=[t,w];}}
   const [t,w]=hit,n=[0,1,2].map(k=>N[I[t]*3+k]*w[0]+N[I[t+1]*3+k]*w[1]+N[I[t+2]*3+k]*w[2]),l=Math.hypot(...n);return n.map(x=>x/l);}};}
 return {phi,normal:y=>{const g=[0,1,2].map(k=>{const a=y.slice(),b=y.slice();a[k]+=e;b[k]-=e;return phi(a)-phi(b);}),l=Math.hypot(...g);return l<1e-12?null:g.map(v=>v/l);}};
}
// The outer skin within 15 mm of the lips' faces (fold < .5, inside < .5), and closed the lips' faces
// the closed shape lays at the surface (within 1 mm of it where they lie closed) and the outer
// vertices it moves (where they lie closed), against it: the most degrees off. (Round 5's selected
// the faces by their depth at rest, the build's own weighting, and checked no moved outer vertex:
// it missed the game meshes' rims the closed shape snaps onto the crease from deeper, and outer
// vertices up to 57 degrees off where they lie closed; round 5's review, SHOULD-FIX 1.)
function normalsOff(head,data){
 const s=data.parts[0],P=s.position,N=s.normal,n=s.fold.length,{phi,normal:at}=approvedSurface(head,data.level),folds=[];
 for(let i=0;i<n;i++)if(s.fold[i]>.5)folds.push([P[i*3],P[i*3+1],P[i*3+2]]);
 const near=p=>folds.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])<.015);
 const off=(v,g)=>Math.acos(Math.max(-1,Math.min(1,(v[0]*g[0]+v[1]*g[1]+v[2]*g[2])/Math.hypot(...v))))*180/Math.PI;
 const out={outer:{n:0,worst:0},closed:{n:0,worst:0},moved:{n:0,worst:0}};
 for(let i=0;i<n;i++){if(s.fold[i]>.5||s.inside[i]>=.5)continue;const p=[P[i*3],P[i*3+1],P[i*3+2]];if(!near(p))continue;const g=at(p);if(!g)continue;
  out.outer.n++;out.outer.worst=Math.max(out.outer.worst,off([N[i*3],N[i*3+1],N[i*3+2]],g));}
 const moved=new Map();(s.closed?.vertices||[]).forEach((i,k)=>moved.set(i,s.closed.offset.slice(k*3,k*3+3)));
 const cn=new Map();(s.closedNormal?.vertices||[]).forEach((i,k)=>cn.set(i,s.closedNormal.offset.slice(k*3,k*3+3)));
 for(let i=0;i<n;i++){const face=s.fold[i]>.5;if(!face&&(s.inside[i]>=.5||!moved.has(i)))continue;
  const d=moved.get(i)||[0,0,0],p=[0,1,2].map(k=>P[i*3+k]+d[k]);if(face&&Math.abs(phi(p))>.001)continue;const g=at(p);if(!g)continue;
  const dn=cn.get(i)||[0,0,0],o=face?out.closed:out.moved;o.n++;o.worst=Math.max(o.worst,off([0,1,2].map(k=>N[i*3+k]+dn[k]),g));}
 return out;
}
const NORMALS_BAR=20; // degrees
test('the outer skin about the mouth, and closed the lips\' faces at the crease and the outer skin the closed shape moves, shade as the approved head: their normals within 20 degrees of its own',()=>{
 // (round 4's review: within 15 mm of the crease 10 to 105 outer vertices a mesh were over 45
 // degrees off the approved surface, the expanded field's normals at the lips' sharp edges, and
 // shaded the closed crease and the open lips' edges as whiskers, glints and the donkey's white
 // fangs; the lips' faces at the closed crease, with their open facings, glinted along the cow's)
 for(const head of HEADS)for(const level of LEVELS){const o=normalsOff(head,built(head.id,level));
  assert.ok(o.outer.n>20&&o.outer.worst<=NORMALS_BAR,`${head.id}-${level}: outer skin about the mouth up to ${o.outer.worst.toFixed(1)}° off the approved surface (${o.outer.n} vertices)`);
  assert.ok(o.closed.worst<=NORMALS_BAR,`${head.id}-${level}: closed, the lips' faces at the crease up to ${o.closed.worst.toFixed(1)}° off (${o.closed.n} vertices)`);
  assert.ok(o.moved.worst<=NORMALS_BAR,`${head.id}-${level}: closed, the outer skin the closed shape moves up to ${o.moved.worst.toFixed(1)}° off (${o.moved.n} vertices)`);}
});
test('the normals check can fail: the outer skin about the mouth turned 30 degrees, the closed faces given back their open facings, and the outer skin the closed shape moves its rest normals, show',()=>{
 const head=HEAD['pig-director'],data=built('pig-director','author'),s=data.parts[0],N=Float32Array.from(s.normal),c=Math.cos(Math.PI/6),sn=Math.sin(Math.PI/6);
 for(let i=0;i<s.fold.length;i++){if(s.fold[i]>.5||s.inside[i]>=.5)continue;const [x,y,z]=[N[i*3],N[i*3+1],N[i*3+2]];N.set([x,y*c-z*sn,y*sn+z*c],i*3);}
 const turned=normalsOff(head,{...data,parts:[{...s,normal:N},...data.parts.slice(1)]}),open=normalsOff(head,{...data,parts:[{...s,closedNormal:null},...data.parts.slice(1)]});
 assert.ok(turned.outer.worst>25,`the outer skin turned 30°: ${turned.outer.worst.toFixed(1)}° off`);
 assert.ok(open.closed.n>0&&open.closed.worst>NORMALS_BAR,`the closed faces with their open facings: ${open.closed.worst.toFixed(1)}° off (${open.closed.n} vertices)`);
 // (the goat's game mesh, its closed normals kept for its lips' faces only: round 5's had its moved
 // outer vertices up to 57 degrees off where they lie closed)
 const goat=built('goat','10k'),gs=goat.parts[0],faces={vertices:[],offset:[]};
 gs.closedNormal.vertices.forEach((i,k)=>{if(gs.fold[i]>.5){faces.vertices.push(i);faces.offset.push(...gs.closedNormal.offset.slice(k*3,k*3+3));}});
 const rest=normalsOff(HEAD.goat,{...goat,parts:[{...gs,closedNormal:faces},...goat.parts.slice(1)]});
 assert.ok(rest.moved.n>0&&rest.moved.worst>NORMALS_BAR,`the goat's moved outer skin with its rest normals: ${rest.moved.worst.toFixed(1)}° off (${rest.moved.n} vertices)`);
});

// The known defects, at the same bars (see KNOWN).
const knownCases=kind=>Object.keys(KNOWN[kind]).map(k=>{const level=k.endsWith('-10k')?'10k':'author';return {head:HEAD[k.slice(0,k.length-level.length-1)],level};});
test("known: the donkey's outer skin crosses itself at 24°",{todo:"2 pairs of triangles on its authoring mesh at 24°, past any speech opening (8.6° at most)"},()=>{
 for(const {head,level} of knownCases('self24'))assert.equal(selfIntersections(built(head.id,level),24).outer,0,`${head.id}-${level}`);
});
test("known: open, the head's inside seen first through slivers of the lips' faces near the corners",{todo:"slivers of 1.1 to 10.4 mm² on 14 of the 24 meshes over the 216 views, each showing the mouth's inside through it and never the background, and none over 1 mm² at ordinary speech from the portraits and the game's camera: the largest the dog's game mesh's at its corners' cheeks at 24 degrees (10.4), the goat's game mesh's from its right at 24 degrees (3.9), the hen's game beak's in the closing fade (2.9), the rest 1.1 to 2.1; a ratchet, each held at what it measures"},()=>{
 for(const {head,level} of knownCases('backFirst')){const data=built(head.id,level);for(const {deg,az,el} of seeViews(head))assert.ok(holesThrough(data,deg,az,{el}).largest<=SEE_BAR,`${head.id}-${level} at ${deg.toFixed(1)}°, from azimuth ${-az}°, ${el}° up`);}
});
test('the game meshes keep to their budgets: the speaking character at most 12,000 triangles, the game mesh 2 to 3.6 times lighter than the authoring mesh',()=>{
 // (11,500 until round 3, when the dog's and the bull's speaking characters came to 11,996 and
 // 11,978; the user: "i'm ok with raising the cap, but we really dont need a lot of detain inside
 // the mouth". With round 4's mesher every one is under 11,750, the dog's 11,728.)
 // (measured when written: 2.63 to 3.09 times lighter, the hen's beak 2.49; round 3's beak was 1.82,
 // when its reductions locked their way round inside-out triangles, and the floor 1.8)
 for(const head of HEADS){
  const low=built(head.id,'10k'),author=built(head.id,'author'),character=read(head.file),skull=character.parts.find(p=>p.name===head.part);
  const total=character.triangles-skull.triangles+low.triangles;
  assert.ok(total<=12000,`${head.id}: the speaking character has ${total} triangles`);
  const ratio=author.triangles/low.triangles;assert.ok(ratio>2&&ratio<3.6,`${head.id}: authoring ${author.triangles} / game ${low.triangles}`);
 }
});

const profileOf=id=>ANIMAL_MOTION_CATALOG.find(p=>p.id===id);
function speakingWorker(id,level='10k'){const profile=profileOf(id),head=built(id,level),data=read(level==='10k'?profile.file:(id==='horse'?'horse-light-data.json':profile.file.replace('10k','author')));
 const worker=profile.create(withSpeakingHead(data,head));worker.pose?.('neutral');const speech=rigSpeakingHead(worker,head);return {profile,head,data,worker,speech};}
const skinned=(mesh,i)=>{mesh.skeleton.update();return mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).applyMatrix4(mesh.matrixWorld);};

test('the speaking head takes the skull\'s place in the character, and nothing else changes',()=>{
 for(const id of ['cow','hen','dog']){
  const profile=profileOf(id),data=read(profile.file),head=built(id,'10k'),swapped=withSpeakingHead(data,head);
  assert.equal(swapped.parts.length,data.parts.length);
  swapped.parts.forEach((p,i)=>{if(p.name===head.replaces+' (speaking)')assert.equal(data.parts[i].name,head.replaces);else assert.equal(p,data.parts[i]);});
  assert.equal(swapped.triangles,data.triangles-data.parts.find(p=>p.name===head.replaces).triangles+head.parts[0].triangles);
 }
 assert.throws(()=>withSpeakingHead(read('cow-10k-data.json'),built('dog','10k')),/no part/);
});

// The user, on the donkey's closed mouth: "this is a skins not lining up issue, no changes to the
// model need to be made". The paintings were registered on the closed head; the skin is built open.
test('the speaking skin takes its paint where it lies closed, and keeps its own shape',()=>{
 for(const id of ['donkey','pig-foreman','hen']){
  const data=read(profileOf(id).file),head=built(id,'10k'),skin=head.parts.find(p=>p.kind==='skin');
  const part=withSpeakingHead(data,head).parts.find(p=>p.name===skin.name);
  assert.equal(part.position,skin.position,id+': the shape is the skin\'s own');
  for(const [key,from,closed] of [['paintPosition',skin.paintPosition||skin.position,skin.closed],['paintNormal',skin.paintNormal||skin.normal,skin.closedNormal]]){
   assert.ok(closed.vertices.length>30,id+': the closed shape moves the skin');
   const at=new Map(closed.vertices.map((v,k)=>[v,k]));let worst=0;
   for(let i=0;i<from.length/3;i++)for(let j=0;j<3;j++){const k=at.get(i);worst=Math.max(worst,Math.abs(part[key][i*3+j]-from[i*3+j]-(k===undefined?0:closed.offset[k*3+j])));}
   assert.ok(worst<1e-6,`${id}: ${key} is the closed shape's (off by ${worst})`);
  }
 }
});

test('the jaw turns about its joint: lower lip, teeth and tongue follow, the crown and upper teeth stay',()=>{
 for(const id of ['cow','hen','pig-director','goat']){
  const {head,worker,speech}=speakingWorker(id);
  worker.root.updateMatrixWorld(true);
  assert.equal(speech.jaw.parent.name,'head');
  assert.ok(new THREE.Vector3().setFromMatrixPosition(speech.jaw.matrixWorld).distanceTo(new THREE.Vector3(...head.jaw.hinge))<1e-6,id+': the jaw bone sits at the joint');
  const skin=speech.skin,data=head.parts[0],n=data.position.length/3;
  const rest=[...Array(n).keys()].map(i=>skinned(skin,i));
  const angle=.2;speech.setJaw(angle);worker.root.updateMatrixWorld(true);
  const turn=p=>{const c=Math.cos(-angle),s=Math.sin(-angle),[hx,hy]=head.jaw.hinge,dx=p.x-hx,dy=p.y-hy;return new THREE.Vector3(hx+dx*c-dy*s,hy+dx*s+dy*c,p.z);};
  let lips=0,still=0;
  for(let i=0;i<n;i++){const now=skinned(skin,i);
   if(data.jaw[i]>=1){lips++;assert.ok(now.distanceTo(turn(rest[i]))<1e-5,`${id}: a jaw vertex follows the jaw`);}
   if(data.jaw[i]===0){still++;assert.ok(now.distanceTo(rest[i])<1e-6,`${id}: a head vertex stays`);}}
  assert.ok(lips>20&&still>100,`${id}: ${lips} jaw and ${still} head vertices checked`);
  for(const mesh of speech.mouthParts){const p=mesh.geometry.attributes.position;const bone=head.parts.find(q=>q.name===mesh.name).bone;
   for(let i=0;i<p.count;i+=7){const r=new THREE.Vector3().fromBufferAttribute(p,i),now=skinned(mesh,i);
    if(bone==='jaw')assert.ok(now.distanceTo(turn(r))<1e-5,`${id} ${mesh.name} follows the jaw`);else assert.ok(now.distanceTo(r)<1e-6,`${id} ${mesh.name} stays`);}}
  speech.setJaw(0);worker.root.updateMatrixWorld(true);
  for(let i=0;i<n;i+=11)assert.ok(skinned(skin,i).distanceTo(rest[i])<1e-6,id+': closed again');
  speech.dispose();worker.dispose();
 }
});

test('hair on the jaw goes with it: the goat\'s beard',()=>{
 const {worker,speech,head}=speakingWorker('goat'),beard=worker.parts.find(p=>/beard/.test(p.name));
 worker.root.updateMatrixWorld(true);const p=beard.geometry.attributes.position,rest=[...Array(p.count).keys()].map(i=>skinned(beard,i));
 speech.setJaw(.2);worker.root.updateMatrixWorld(true);
 let moved=0;for(let i=0;i<p.count;i++)if(skinned(beard,i).distanceTo(rest[i])>.01)moved++;
 assert.ok(moved>p.count*.8,`${moved} of ${p.count} beard vertices moved`);
 speech.dispose();worker.dispose();
});

test('a line of speech opens the jaw once a syllable, by its stress, and closes it between lines',()=>{
 const line={start:1,open:.2,syllables:[['hel',.2,1],['lo',.3,.5],[null,.2,0],['there',.4,.8]]};
 assert.equal(jawAt(.5,line),0);assert.equal(jawAt(1.65,line),0);assert.equal(jawAt(3,line),0);
 assert.ok(Math.abs(jawAt(1.1,line)-.2)<1e-9,'the stressed syllable opens fully at its middle');
 assert.ok(Math.abs(jawAt(1.35,line)-.2*(.35+.65*.5))<1e-9,'a weak one less');
 assert.ok(jawAt(1.01,line)>0&&jawAt(1.01,line)<jawAt(1.05,line));
 for(const head of HEADS){assert.ok(Math.abs(SPEECH_OPEN[head.id]-speechOpen(built(head.id,'10k')))<6e-4,head.id+": SPEECH_OPEN is the built head's speechOpen");assert.ok(MOUTH_PAINT[head.id],head.id+' has mouth paint');}
});
