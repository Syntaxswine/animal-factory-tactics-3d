import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {HEADS,HEAD} from '../tools/speaking-heads/heads.mjs';
import {MOUTHS} from '../tools/speaking-heads/mouths.mjs';
import {placement} from '../tools/speaking-heads/place.mjs';
import {mouthGeometry,spline} from '../tools/speaking-heads/sculpt.mjs';
import {speakingSourceHash} from '../tools/speaking-heads/source-hash.mjs';
import {fitLips,CURATED} from '../tools/speaking-heads/fit-lips.mjs';
import {seeThrough,closedVisibility,partsAgainstSkin,crownExposure,tongueVisible,selfIntersections,jawLine,loadCharacter} from '../tools/speaking-heads/measure.mjs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {withSpeakingHead,rigSpeakingHead,jawAt,MOUTH_PAINT,SPEECH_OPEN} from '../dist/tactics/speaking-head.js';

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
  const M=MOUTHS[head.id],place=placement(head),G=mouthGeometry(M,head.field);
  for(const level of LEVELS){const data=built(head.id,level),skin=data.parts.find(p=>p.kind==='skin');
   // Every vertex of the outer skin (not the lips' faces, the cheeks between them or the mouth
   // inside) lies on the approved surface, near the mouth too. Measured when written: under
   // 0.2 mm (the sculpt's own meshing error); the round-1 heads, sealed, were 4.4 to 7.9 mm off.
   let outer=0,worst=0;
   for(let i=0;i<skin.position.length/3;i++){if(skin.fold[i]>.5||skin.inside[i]>.5)continue;outer++;worst=Math.max(worst,Math.abs(head.field(...toSculpt(head,place,skin,i))));}
   assert.ok(outer>skin.position.length/3*.6,`${head.id}-${level}: ${outer} outer vertices`);
   assert.ok(worst<1e-3,`${head.id}-${level}: the closed outer skin is ${(worst*1000).toFixed(2)} mm off the approved surface`);
   // Where the mouth parts, the lips' outer faces belong wholly to their sides: the lower lip
   // to the jaw, the upper to the head.
   let lower=0,upper=0;
   for(let i=0;i<skin.position.length/3;i++){if(skin.fold[i]>.5||skin.inside[i]>.01)continue;const p=toSculpt(head,place,skin,i),d=G.cut(...p);
    if(G.parting(p[0],p[2])<1||Math.abs(d)<.0065||Math.abs(d)>.014)continue;
    if(d<0){lower++;assert.ok(skin.jaw[i]>.95,`${head.id}-${level}: lower lip ${skin.jaw[i]}`);}else{upper++;assert.ok(skin.jaw[i]<.05,`${head.id}-${level}: upper lip ${skin.jaw[i]}`);}}
   // (the game mesh may keep no vertex in that band on a small lip; the authoring mesh does)
   if(level==='author')assert.ok(lower>=1&&upper>=1,`${head.id}-${level}: ${lower} lower and ${upper} upper lip vertices checked`);lipsChecked+=lower+upper;
  }
 }
 assert.ok(lipsChecked>200,`${lipsChecked} lip vertices checked in all`);
});

// The round-1 review's acceptance numbers (docs/tactics/hybrid-review/speaking-heads/reviews/
// round-1.md), on both meshes, by its own instruments lifted into the tree (measure.mjs): the
// heads posed as the runtime poses them.
const OPEN=[6,12,24];
test('open, a mouth is no hole through the head: nothing is seen through it in profile or from behind',()=>{
 // (the hen's beak has no cheeks: a beak open is open at its sides, as the review found fine)
 for(const head of HEADS.filter(h=>h.id!=='hen'))for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of OPEN)for(const az of [0,30,45]){const s=seeThrough(data,deg,az).mm2;assert.ok(s<=.5,`${head.id}-${level} at ${deg}°, ${az}° from profile: ${s.toFixed(1)} mm² seen through the head`);}}
});
test('closed, a mouth shows nothing of its inside: no tooth or tongue from any direction',()=>{
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level),occluder=head.head?loadCharacter(data,level).parts.find(p=>p.name===head.head.part):null;
  const c=closedVisibility(data,level,{occluder});
  assert.ok(c.teeth.teeth<=.5,`${head.id}-${level}: ${c.teeth.teeth.toFixed(1)} mm² of teeth or tongue seen closed (from azimuth ${c.teeth.az}°, elevation ${c.teeth.el}°)`);}
});
test('teeth and tongue stay in the skin at every opening: rooted, none through the outer skin; incisors show a crown when open',()=>{
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of [0,...OPEN])for(const g of partsAgainstSkin(data,deg)){
   assert.equal(g.poke,0,`${head.id}-${level} at ${deg}°: ${g.kind} ${g.tooth??''} stands ${(g.maxPoke*1000).toFixed(1)} mm through the outer skin`);
   if(g.kind!=='tongue')assert.ok(g.inside>0,`${head.id}-${level} at ${deg}°: ${g.kind} ${g.tooth} has no root in the skin`);}
  if(level==='author')for(const t of crownExposure(data,12).filter(t=>t.kind==='incisor'))assert.ok(t.crown>=.004,`${head.id}: an incisor shows ${(t.crown*1000).toFixed(1)} mm of crown at 12°`);}
});
test('the tongue shows from the front when the mouth opens',()=>{
 for(const head of HEADS){const v=tongueVisible(built(head.id,'author'),12,0,head.id==='hen'?30:0);assert.ok(v>=.3,`${head.id}: ${(v*100).toFixed(0)}% of the tongue seen from the front at 12°`);}
});
test('the outer skin does not pass through itself as the jaw opens',()=>{
 for(const head of HEADS)for(const level of LEVELS){const data=built(head.id,level);
  for(const deg of [6,12]){const s=selfIntersections(data,deg);assert.equal(s.outer,0,`${head.id}-${level} at ${deg}°: ${s.outer} pairs of outer skin triangles cross`);}}
});
test('the jaw carries the whole mandible: weight at least 0.9 along the jaw line seen in profile, from its angle to the chin',()=>{
 // (the hen's lower mandible is rigid by construction)
 for(const head of HEADS.filter(h=>h.id!=='hen')){const line=jawLine(built(head.id,'author')),under=line.filter(p=>p.w<.9);
  assert.ok(line.length>50,`${head.id}: ${line.length} columns`);
  assert.equal(under.length,0,`${head.id}: jaw weight ${Math.min(...under.map(p=>p.w)).toFixed(2)} on the jaw line at x ${under.map(p=>(p.x*1000).toFixed(0)).join(', ')} mm`);}
});

test('the game meshes keep to their budgets: a quarter more than the skull they replace, about a third of the authoring mesh',()=>{
 for(const head of HEADS){
  const low=built(head.id,'10k'),author=built(head.id,'author'),character=read(head.file),skull=character.parts.find(p=>p.name===head.part);
  const skin=low.parts.find(p=>p.kind==='skin');
  assert.ok(skin.triangles<=Math.round(head.low.target*1.25)+2,`${head.id}: speaking skin ${skin.triangles}`);
  const total=character.triangles-skull.triangles+low.triangles;
  assert.ok(total<=11500,`${head.id}: the speaking character has ${total} triangles`);
  const ratio=author.triangles/low.triangles;assert.ok(ratio>1.9&&ratio<3.6,`${head.id}: authoring ${author.triangles} / game ${low.triangles}`);
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
 for(const head of HEADS){assert.ok(SPEECH_OPEN[head.id]>0,head.id+' has a speaking opening');assert.ok(MOUTH_PAINT[head.id],head.id+' has mouth paint');}
});
