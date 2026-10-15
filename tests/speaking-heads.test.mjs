import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {HEADS,HEAD,speakingField} from '../tools/speaking-heads/heads.mjs';
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
// Known defects of round 4, each as measured when written: the tests hold every other head to its
// bar, and these in todo tests of their own, at the same bars, so they show in every run. (Round
// 3's holes from the game's camera, its two game meshes' closed teeth and its two closed pokes are
// gone with round 4's mesher, and the four game meshes' incisors that showed closed when the lining
// went with the build's closed-teeth guard: every head meets those bars.) The slivers of the head's
// inside seen first (`backFirst`, mm²) are held at what they measure, so none grows unseen.
const KNOWN={
 openOuter:{'horse-10k':1,'bull-10k':1,'cow-10k':1,'donkey-10k':2,'pig-foreman-10k':2,'pig-director-10k':1,'dog-10k':1,'hen-author':1,'hen-10k':1}, // outer triangles crossed open
 self24:{'donkey-author':2},                                                                // outer pairs crossing at 24°
 stripes:{'skunk-10k':.096},                                                                // rims over 60° off
 backFirst:{'horse-author':2.38,'horse-10k':5,'goat-10k':3.75,'bull-author':2.69,'bull-10k':1.63,'cow-author':2.94,'cow-10k':8.63,'donkey-author':1.07,'donkey-10k':1.25,'sheep-author':2.63,'skunk-author':1.13,'skunk-10k':3.38,'pig-foreman-author':2.69,'pig-director-author':2.38,'pig-director-10k':2.82,'dog-author':1.38,'dog-10k':9.38},
};
const known=(kind,head,level)=>(head.id+'-'+level) in (KNOWN[kind]||{});
// The open mouth is a wedge open at its sides and front, its roof and floor the mouth's inside (the
// user, round 4, of the lining rounds 3 and 4 stood inside the lips: "you still have opaque walls on
// the side of the mouth that should be open space", and with a sketch of the open wedge, its sides
// "should be a void space", its roof "should be red, its the inside of the mouth"). So in exact
// profile it is seen through between the lips, as a beak is: by design. What the open head must
// never show is its own inside through a hole, a crack or an inside-out triangle: holesThrough, the
// eye's first surface seen from behind. The views: exact profile from either side at the widest the
// game opens a jaw in speech (SPEECH_OPEN, 4.5 to 8.6 degrees), at 12 and at 24 degrees, and the
// game's camera, 30 degrees above (hybrid-world.js GAME_CAMERA), every 15 degrees round at the widest
// speech. (Round 3 looked from the left only, every 30 degrees from the front to the rear, and its
// instrument drew nothing on four game meshes: round 3's review. Round 4's lining build counted
// background enclosed by the head, the mouth's front opening closed by a curtain; with the sides
// open that counts the open mouth itself, 7 to 35 mm² from the game's camera through the goat's game
// mesh and the skunk's, and misses a hole that shows the mouth's inside, not the background.)
const seeViews=head=>{const widest=SPEECH_OPEN[head.id]*180/Math.PI,v=[];
 for(const deg of [widest,12,24])for(const az of [0,180])v.push({deg,az,el:0});
 for(let az=-180;az<180;az+=15)v.push({deg:widest,az,el:30});return v;};
const SEE_BAR=1; // mm², the largest one hole
test('open, the head shows no inside of itself: no hole, crack or inside-out triangle seen, in exact profile from either side and from the game\'s camera all round',()=>{
 // (the known ones at what they measured: see KNOWN)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level),bar=Math.max(SEE_BAR,KNOWN.backFirst[head.id+'-'+level]??0);
  for(const {deg,az,el} of seeViews(head)){const s=holesThrough(data,deg,az,{el});assert.ok(s.largest<=bar,`${head.id}-${level} at ${deg.toFixed(1)}°, ${az}° round, ${el}° up: ${s.largest.toFixed(2)} mm² of the head's inside seen first (${s.mm2.toFixed(2)} mm² in all)`);}}
});
// The share of the opening between the lips that shows the background, in exact profile at 24°: the
// background through the head against the background through the outer skin alone (`extra`, a
// part drawn with the head; the outer skin is drawn without it).
const SIDES_OPEN=.5;
const sidesOpen=(data,az,extra=null)=>{const d=extra?{...data,parts:[...data.parts,extra]}:data;return seeThrough(d,24,az).mm2/seeThrough(d,24,az,{outerOnly:true}).mm2;};
test('open, the mouth is open at its sides: in exact profile from either side at 24 degrees, at least half the opening between the lips shows the background',()=>{
 // (teeth and tongue fill the rest: 7 to 24% of it, the rabbit's the most, her mouth across the
 // front of her face. Round 4's lining showed none of it, from either side, on every mammal mesh.
 // The hen's beak is excepted: her front opening, which seeThrough closes, is her whole gape)
 for(const head of HEADS.filter(h=>h.id!=='hen'))for(const level of LEVELS){const data=built(head.id,level);
  for(const az of [0,180]){const share=sidesOpen(data,az);assert.ok(share>=SIDES_OPEN,`${head.id}-${level} from the ${az?'right':'left'} at 24°: ${(share*100).toFixed(0)}% of the opening between the lips seen through`);}}
});
test('the open-sides measure can fail: a wall standing in the opening, as rounds 3 and 4 stood the lining, shows none of it',()=>{
 // (the curtain over the lips' whole edges, drawn on both sides, posed with the skin)
 const data=built('horse','author'),s=data.parts[0],c=Array.from(frontCurtain(data,{whole:true})),index=[...c];for(let t=0;t<c.length;t+=3)index.push(c[t],c[t+2],c[t+1]);
 const wall={name:'wall',kind:'skin',jaw:s.jaw,inside:s.inside,fold:s.fold,lower:s.lower,position:s.position,index};
 const open=sidesOpen(data,0),walled=sidesOpen(data,0,wall);
 assert.ok(open>=SIDES_OPEN&&walled<.1,`the horse from the left at 24°: ${(open*100).toFixed(0)}% seen through, ${(walled*100).toFixed(0)}% with the wall`);
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
  if(!known('closed',head,level))assert.ok(c.teeth.teeth<=.5,`${head.id}-${level}: ${c.teeth.teeth.toFixed(2)} mm² of teeth or tongue seen closed (from azimuth ${c.teeth.az}°, elevation ${c.teeth.el}°)`);
  if(!known('closedHole',head,level))assert.ok(c.hole.hole<=.5,`${head.id}-${level}: ${c.hole.hole.toFixed(2)} mm² of background through the closed head (from azimuth ${c.hole.az}°, elevation ${c.hole.el}°)`);}
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
test("closed, the hen's beak shows nothing of its inside",{todo:"closed, her beak leaves a slit along the gape from the side, as her approved beak does: 3.2 and 2.3 mm² of background through it (authoring, game), and through the game mesh's coarse gape (894 triangles) 8.3 mm² of her tongue"},()=>{
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
  if(!known('openOuter',head,level))for(const deg of OPEN)for(const r of partsCrossSkin(data,deg))assert.equal(r.outer,0,`${head.id}-${level} at ${deg}°: the ${r.part} cross ${r.outer} triangles of the outer skin`);
  if(level==='author')for(const t of crownExposure(data,12).filter(t=>t.kind==='incisor'))assert.ok(t.crown>=.004,`${head.id}: an incisor shows ${(t.crown*1000).toFixed(1)} mm of crown at 12°`);}
});
test('the tongue shows from the front when the mouth opens',()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen')){const v=tongueVisible(built(head.id,'author'),12,0,0);assert.ok(v>=.3,`${head.id}: ${(v*100).toFixed(0)}% of the tongue seen from the front at 12°`);}
});
test("the game mesh's tongue shows from the front too",{todo:"the game mesh's mouth is coarse inside (the user: \"we really dont need a lot of detain inside the mouth\"): the skunk's shows 23% of the tongue from the front at 12°"},()=>{
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
test("no tooth, and not the tongue, passes through a lip's face as the mouth opens",{todo:"inside the open mouth, teeth and tongue graze the lips' inner faces on all eleven mammals (up to 8 triangles on a mesh when written), where the cavity's front slopes up into the lower lip; the mouth's inside is to stay coarse (the user: \"we really dont need a lot of detain inside the mouth\")"},()=>{
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
 // 3's review: held as a todo for all, though most met it; those that do not are KNOWN)
 for(const head of HEADS)for(const level of LEVELS){if(known('stripes',head,level))continue;const data=built(head.id,level);
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

// The known defects, at the same bars (see KNOWN).
const knownCases=kind=>Object.keys(KNOWN[kind]).map(k=>{const level=k.endsWith('-10k')?'10k':'author';return {head:HEAD[k.slice(0,k.length-level.length-1)],level};});
test("known: open, teeth or tongue through the outer skin at the lips of seven game meshes and the hen's beak",{todo:"1 or 2 triangles of the outer skin at the lips: the horse's, the bull's, the cow's, the donkey's, the pig foreman's, the pig director's and the dog's game meshes, and the hen's beak"},()=>{
 for(const {head,level} of knownCases('openOuter'))for(const deg of OPEN)for(const r of partsCrossSkin(built(head.id,level),deg))assert.equal(r.outer,0,`${head.id}-${level} at ${deg}°: the ${r.part}`);
});
test("known: the donkey's outer skin crosses itself at 24°",{todo:"2 pairs of triangles on its authoring mesh at 24°, past any speech opening (8.6° at most)"},()=>{
 for(const {head,level} of knownCases('self24'))assert.equal(selfIntersections(built(head.id,level),24).outer,0,`${head.id}-${level}`);
});
test("known: open, the head's inside seen first through slivers of the lips' faces near the corners",{todo:"slivers of 1.1 to 9.4 mm² on 17 of the 24 meshes, the largest on the game meshes in exact profile at 24° (the dog's 9.4 at its corners' cheeks) and from the game's camera (the cow's 8.6): mostly triangles of the lips' faces near the corners, where the jaw's weight blends, turned inside-out as the jaw opens"},()=>{
 for(const {head,level} of knownCases('backFirst')){const data=built(head.id,level);for(const {deg,az,el} of seeViews(head))assert.ok(holesThrough(data,deg,az,{el}).largest<=SEE_BAR,`${head.id}-${level} at ${deg.toFixed(1)}°, ${az}° round, ${el}° up`);}
});
test("known: the lips' rims shade over 60 degrees off their triangles",{todo:"10% of the skunk's game mesh's open lips' rims, the light-only renders showing a thin fringe along the lips' edges (the user: \"we really dont need a lot of detain inside the mouth\")"},()=>{
 for(const {head,level} of knownCases('stripes'))for(const deg of [6,12])assert.ok(mouthShading(built(head.id,level),deg).over60<=.06,`${head.id}-${level} at ${deg}°`);
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
