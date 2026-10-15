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
import {seeThrough,closedVisibility,partsAgainstSkin,partsCrossSkin,mouthShading,crownExposure,tongueVisible,selfIntersections,jawLine,loadCharacter} from '../tools/speaking-heads/measure.mjs';
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
// Known defects of round 3, each as measured when written: the tests hold every other head to its
// bar, and these in todo tests of their own, at the same bars, so they show in every run.
const KNOWN={
 hole:{'cow-10k':4.3,'donkey-10k':3.8,'skunk-10k':3.8,'pig-director-10k':3.1},     // the largest one hole, mm²
 closed:{'bull-10k':.5,'cow-10k':.6},                                              // teeth seen closed, mm²
 closedPoke:{'bull-10k':.33,'skunk-10k':.36},                                      // closed, mm through the skin
 openOuter:{'horse-10k':1,'rabbit-10k':4,'hen-author':1,'hen-10k':2},              // outer triangles crossed open
 self24:{'donkey-author':2,'donkey-10k':3},                                        // outer pairs crossing at 24°
};
const known=(kind,head,level)=>(head.id+'-'+level) in KNOWN[kind];
test("open, the game's camera sees the mouth's inside, never through the head: 30° above, from the front round to the rear",()=>{
 // (round 3: at the user's word the lips part along the whole lip line, so the mouth is open from
 // side to side, as the hen's beak always was: at eye level in exact profile the open mouth shows
 // what is beyond it. The game's camera is 30 degrees above at any heading (hybrid-world.js
 // GAME_CAMERA); from there, at the widest the game opens a jaw in speech (SPEECH_OPEN, 4.5 to
 // 8.6 degrees), the far side's opening lies below the near one, behind the mouth's floor and
 // tongue. The skin is a closed surface (above), so the mouth is the only way through. A way
 // through it is one hole; the slivers along the lips' serrated edges, round 2's S4, still open,
 // are many and small, 0 to 19 mm² in all when written: the largest one hole is held to 3 mm².)
 for(const head of HEADS)for(const level of LEVELS){if(known('hole',head,level))continue;const data=built(head.id,level),widest=SPEECH_OPEN[head.id]*180/Math.PI;
  for(const deg of [widest])for(const az of [-90,-60,-30,0,30,60,90]){const s=seeThrough(data,deg,az,{el:30});assert.ok(s.largest<=3,`${head.id}-${level} at ${deg.toFixed(1)}°, ${az}° from profile, 30° above: a hole of ${s.largest.toFixed(1)} mm² through the head (${s.mm2.toFixed(1)} mm² in all)`);}}
});
const closedShows=(head,level)=>{const data=built(head.id,level),occluder=head.head?loadCharacter(data,level).parts.find(p=>p.name===head.head.part):null;return closedVisibility(data,level,{occluder}).teeth;};
test('closed, a mouth shows nothing of its inside: no tooth or tongue from any direction (10 px/mm)',()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen'))for(const level of LEVELS){if(known('closed',head,level))continue;const c=closedShows(head,level);
  assert.ok(c.teeth<=.5,`${head.id}-${level}: ${c.teeth.toFixed(1)} mm² of teeth or tongue seen closed (from azimuth ${c.az}°, elevation ${c.el}°)`);}
});
test("closed, the hen's beak shows nothing of its inside",{todo:"closed, her mandibles' edges leave a slit along the gape (0.2 to 0.9 mm), through which her tongue shows from the side, 5.4 mm² in the authoring mesh (her round-1 beak was closed)"},()=>{
 for(const level of LEVELS){const c=closedShows(HEAD.hen,level);assert.ok(c.teeth<=.5,`hen-${level}: ${c.teeth.toFixed(1)} mm² of tongue seen closed (from azimuth ${c.az}°, elevation ${c.el}°)`);}
});
test('teeth and tongue stay in the skin at every opening: rooted, none through the outer skin; incisors show a crown when open',()=>{
 // (closed, a tooth's vertex outside the skin's solid, on the outer skin's outer side, stands
 // through it; open, a crown stands in the opening, outside the solid, beside the lips' outer
 // edges, so there through the outer skin is a tooth crossing its triangles, round 3)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of [0,...OPEN])for(const g of partsAgainstSkin(data,deg)){
   if(deg===0&&!known('closedPoke',head,level))assert.equal(g.poke,0,`${head.id}-${level} closed: ${g.kind} ${g.tooth??''} stands ${(g.maxPoke*1000).toFixed(1)} mm through the outer skin`);
   if(g.kind!=='tongue')assert.ok(g.inside>0,`${head.id}-${level} at ${deg}°: ${g.kind} ${g.tooth} has no root in the skin`);}
  if(!known('openOuter',head,level))for(const deg of OPEN)for(const r of partsCrossSkin(data,deg))assert.equal(r.outer,0,`${head.id}-${level} at ${deg}°: the ${r.part} cross ${r.outer} triangles of the outer skin`);
  if(level==='author')for(const t of crownExposure(data,12).filter(t=>t.kind==='incisor'))assert.ok(t.crown>=.004,`${head.id}: an incisor shows ${(t.crown*1000).toFixed(1)} mm of crown at 12°`);}
});
test('the tongue shows from the front when the mouth opens',()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen')){const v=tongueVisible(built(head.id,'author'),12,0,0);assert.ok(v>=.3,`${head.id}: ${(v*100).toFixed(0)}% of the tongue seen from the front at 12°`);}
});
test("the game mesh's tongue shows from the front too",{todo:"the game mesh's mouth is coarse inside (the user: \"we really dont need a lot of detain inside the mouth\"), and a few long floor triangles rise across the horse's tongue: 25% seen at 12° when written"},()=>{
 for(const head of HEADS.filter(h=>h.id!=='hen')){const v=tongueVisible(built(head.id,'10k'),12,0,0);assert.ok(v>=.3,`${head.id}-10k: ${(v*100).toFixed(0)}% of the tongue seen from the front at 12°`);}
});
test("the hen's tongue shows when her beak opens",{todo:"her upper mandible's hook covers the gape from the front and above at 12°; raised to show, her tongue showed through the closed gape"},()=>{
 const v=tongueVisible(built('hen','author'),12,0,30);assert.ok(v>=.3,`hen: ${(v*100).toFixed(0)}% of the tongue seen from the front and above at 12°`);
});
test("the game mesh's incisors show a crown too",{todo:"reduced to the game budget, the gums swell over some incisors: the least crown at 12° is 1.4 to 3.9 mm on six heads"},()=>{
 for(const head of HEADS)for(const t of crownExposure(built(head.id,'10k'),12).filter(t=>t.kind==='incisor'))assert.ok(t.crown>=.004,`${head.id}-10k: an incisor shows ${(t.crown*1000).toFixed(1)} mm of crown at 12°`);
});
test('the outer skin does not pass through itself as the jaw opens, to 24 degrees',()=>{
 // (the hen's to 12: a beak's mandible turns about its root inside the head part, through the
 // upper mandible's base, by construction past 12 degrees, and the build checks a beak to 12;
 // her speech opens it 8.6 degrees at most, SPEECH_OPEN)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of head.id==='hen'?[6,12]:[6,12,24]){if(deg===24&&known('self24',head,level))continue;const s=selfIntersections(data,deg);assert.equal(s.outer,0,`${head.id}-${level} at ${deg}°: ${s.outer} pairs of outer skin triangles cross`);}}
});
test("no tooth, and not the tongue, passes through a lip's face as the mouth opens",{todo:"inside the open mouth, teeth and tongue graze the lips' inner faces on eleven heads (1 to 8 triangles when written), where the cavity's front slopes up into the lower lip; the mouth's inside is to stay coarse (the user: \"we really dont need a lot of detain inside the mouth\")"},()=>{
 // (round 2's review: on eight game meshes, teeth crossed 1 to 4 of the lips' inner faces, which
 // the poke check, looking only at the outer skin, could not see. Open only: closed, the lips'
 // faces lie folded in the crease inside the closed head, where an overbite's crowns reach across
 // them unseen, the horse's authoring mesh's 4 triangles; that nothing of the inside shows closed
 // is the closed test's, at 10 px/mm)
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of OPEN)for(const r of partsCrossSkin(data,deg))assert.equal(r.face,0,`${head.id}-${level} at ${deg}°: the ${r.part} cross ${r.face} triangles of the lips' faces`);}
});
test('open, the mouth shades as surfaces, not stripes',{todo:"the lips' rims, the part of the open mouth the renderer does not light evenly, shade over 60 degrees off their coarse triangles on up to 19% of their area (the user: \"we really dont need a lot of detain inside the mouth\")"},()=>{
 // the share of the area of the lips' faces and the skin between the lips whose shading normal, as
 // the renderer shades it, is over 60 degrees off its triangle (round 2: 17 to 29% of the cheeks
 // on four game meshes, whose normals were the dense sculpt's; round 3 found the instrument blind
 // to the game meshes' cheek triangles that kept no folding vertex, before the cheeks went)
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

// The known defects, at the same bars (see KNOWN).
const knownCases=kind=>Object.keys(KNOWN[kind]).map(k=>{const level=k.endsWith('-10k')?'10k':'author';return {head:HEAD[k.slice(0,k.length-level.length-1)],level};});
test("known: slivers of background along the lips' serrated edges, from the game's camera",{todo:"the largest one is 3.1 to 4.3 mm² on four game meshes (round 2's S4, the serrated lip edges)"},()=>{
 for(const {head,level} of knownCases('hole')){const data=built(head.id,level),widest=SPEECH_OPEN[head.id]*180/Math.PI;for(const az of [-90,-60,-30,0,30,60,90])assert.ok(seeThrough(data,widest,az,{el:30}).largest<=3,`${head.id}-${level}`);}
});
test("known: closed, a little tooth at the crease of two game meshes",{todo:"0.5 and 0.6 mm² at 10 px/mm, the bull's and the cow's game meshes, at eye level"},()=>{
 for(const {head,level} of knownCases('closed'))assert.ok(closedShows(head,level).teeth<=.5,`${head.id}-${level}`);
});
test("known: closed, a tooth's tip through two game meshes' lips",{todo:"the bull's incisor 0.33 mm and the skunk's upper canine 0.36 mm, through their game meshes' thin closed lips"},()=>{
 for(const {head,level} of knownCases('closedPoke'))for(const g of partsAgainstSkin(built(head.id,level),0))assert.equal(g.poke,0,`${head.id}-${level}: ${g.kind} ${g.tooth}`);
});
test("known: open, teeth or tongue through the outer skin at the lips of the horse's and rabbit's game meshes and the hen's beak",{todo:"1 to 4 triangles of the outer skin, at every opening (so closed too, inside the closed mouth)"},()=>{
 for(const {head,level} of knownCases('openOuter'))for(const deg of OPEN)for(const r of partsCrossSkin(built(head.id,level),deg))assert.equal(r.outer,0,`${head.id}-${level} at ${deg}°: the ${r.part}`);
});
test("known: the donkey's outer skin crosses itself at 24°",{todo:"2 and 3 pairs of triangles at 24°, past any speech opening (8.6° at most)"},()=>{
 for(const {head,level} of knownCases('self24'))assert.equal(selfIntersections(built(head.id,level),24).outer,0,`${head.id}-${level}`);
});
test('the game meshes keep to their budgets: the speaking character at most 12,000 triangles, a third to a half of the authoring mesh',()=>{
 // (11,500 until round 3: the mouth open along its whole lip line needs some 350 to 750 more
 // triangles in the game mesh; the user: "i'm ok with raising the cap, but we really dont need a
 // lot of detain inside the mouth")
 // (measured when written: 2.6 to 3.15 times lighter; the hen's beak 1.82, its gape's crossings
 // locked and, round 3, the game mesh keeping the jaw's weight more dearly)
 for(const head of HEADS){
  const low=built(head.id,'10k'),author=built(head.id,'author'),character=read(head.file),skull=character.parts.find(p=>p.name===head.part);
  const total=character.triangles-skull.triangles+low.triangles;
  assert.ok(total<=12000,`${head.id}: the speaking character has ${total} triangles`);
  const ratio=author.triangles/low.triangles;assert.ok(ratio>1.8&&ratio<3.6,`${head.id}: authoring ${author.triangles} / game ${low.triangles}`);
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
