// Speaking heads (docs/tactics/SPEAKING-HEADS.md): each character's head sculpted to speak. The
// approved head is opened along its painted mouth line, given a mouth cavity, teeth and a
// tongue, and weighted to a jaw bone at the jaw joint. tools/build-speaking-heads.mjs builds
// speaking-heads/<id>-10k.json (the game mesh) and <id>-author.json (the authoring mesh the game
// mesh was reduced from), both in the character's rest space.
//
//   const head=await fetch(speakingHeadFile(profile.id)).then(r=>r.json());
//   const worker=profile.create(withSpeakingHead(data,head));  // the skull replaced, same place
//   const speech=rigSpeakingHead(worker,head);                 // jaw bone, weights, teeth, tongue
//   const paint=await createAnimalPaint(renderer,worker,profile,loader,outfit,lit);
//   for(const p of worker.parts)p.material=paint.material;
//   speech.applyPaint(paint);                                  // the mouth's own paint
//   speech.setJaw(jawAt(t,line));                              // radians open
//
// The rig is part of the speaking character for its life (like the fitted neck layers in
// horse-light-model.js): dispose() releases the teeth and tongue, the worker the rest.
import * as THREE from './vendor/three.module.js';

export const speakingHeadFile=(id,level='10k')=>`./speaking-heads/${id}-${level}.json`;

// How far each jaw opens for speech at full stress, in radians: the lips part about 2.5 cm at
// the front (the lever is the jaw joint to the lips' front, head.jaw.lever), within 3 to 9
// degrees. speechOpen(head) is the rule; SPEECH_OPEN the built heads' values (tested equal).
export const speechOpen=head=>Math.min(.15,Math.max(.05,.025/head.jaw.lever));
export const SPEECH_OPEN={horse:.079,goat:.1092,bull:.0998,cow:.1116,donkey:.0927,sheep:.1214,skunk:.1231,'pig-foreman':.1046,'pig-director':.0902,rabbit:.1496,dog:.0994,hen:.15};

// The mouth's paint, as display (sRGB) colours: inner lip, gum and the shadowed back of the
// mouth, by depth below the approved surface, plus the teeth and tongue. The shaders work in
// linear light, so they take linear() of these. The inside is a crimson that stays red deep in
// (the user's reference, round 3: the back was near black, .17 .05 .05, and read as a hole).
const MOUTH={lip:[.44,.18,.17],gum:[.66,.20,.25],back:[.36,.07,.10],teeth:[.93,.89,.77],root:[.74,.64,.50],tongue:[.80,.42,.42]};
export const MOUTH_PAINT={
 horse:{...MOUTH,lip:[.27,.18,.16]},donkey:{...MOUTH,lip:[.30,.24,.21]},
 goat:MOUTH,bull:{...MOUTH,lip:[.55,.30,.29]},cow:{...MOUTH,lip:[.55,.30,.29]},sheep:{...MOUTH,lip:[.30,.24,.22]},
 skunk:{...MOUTH,lip:[.12,.10,.10]},dog:{...MOUTH,lip:[.10,.08,.07],gum:[.42,.20,.21]},
 'pig-foreman':{...MOUTH,lip:[.62,.31,.28],gum:[.70,.36,.35]},'pig-director':{...MOUTH,lip:[.64,.33,.30],gum:[.72,.38,.37]},
 rabbit:{...MOUTH,lip:[.66,.40,.39],gum:[.72,.42,.42]},
 // a beak's parted edges are horn; inside it the mouth is pink
 hen:{...MOUTH,lip:[.80,.58,.26],gum:[.80,.47,.44],back:[.36,.13,.13],tongue:[.84,.50,.48]}
};

// The character's data with its skull (the hen: its beak) replaced by the speaking skin, in the
// skull's place in the part order, so the registered paint owns it as it owned the skull.
export function withSpeakingHead(data,head){
 const at=data.parts.findIndex(p=>p.name===head.replaces);
 if(at<0)throw Error(`${data.species||'the character'} has no part "${head.replaces}" for its speaking head`);
 const skin=head.parts.find(p=>p.kind==='skin'),parts=data.parts.slice();parts[at]=skin;
 return {...data,parts,triangles:data.triangles-data.parts[at].triangles+skin.triangles,speakingHead:{level:head.level,triangles:head.triangles}};
}

const weightsOf=(a,i)=>{const w=new Map();for(let k=0;k<4;k++){const x=a.skinWeight.getComponent(i,k);if(x>0){const b=a.skinIndex.getComponent(i,k);w.set(b,(w.get(b)||0)+x);}}return w;};
function setWeights(a,i,w){const top=[...w].filter(([,x])=>x>1e-6).sort((p,q)=>q[1]-p[1]).slice(0,4),sum=top.reduce((s,[,x])=>s+x,0)||1;while(top.length<4)top.push([0,0]);a.skinIndex.setXYZW(i,...top.map(([b])=>b));a.skinWeight.setXYZW(i,...top.map(([,x])=>x/sum));}

// The jaw bone, the skin's jaw weights, the hair on the jaw, the teeth and the tongue. The worker
// must have been made from withSpeakingHead(data, head) and still be at rest.
export function rigSpeakingHead(worker,head){
 const skinData=head.parts.find(p=>p.kind==='skin'),skin=worker.parts.find(p=>p.name===skinData.name);
 if(!skin)throw Error('rigSpeakingHead: the worker was not made with this speaking head (withSpeakingHead)');
 const g=skin.geometry,P=g.attributes.position,n=skinData.position.length/3;
 // The skin's vertices are its data's, in order (the build orders them by first use, and the
 // skull is one paint panel, so createLightHorse neither splits nor reorders them).
 if(P.count!==n)throw Error(`rigSpeakingHead: the skin has ${P.count} vertices, its data ${n}`);
 for(let i=0;i<n;i++)if(Math.abs(P.getX(i)-skinData.position[i*3])+Math.abs(P.getY(i)-skinData.position[i*3+1])+Math.abs(P.getZ(i)-skinData.position[i*3+2])>1e-5)throw Error('rigSpeakingHead: the skin is not in its data\'s order at vertex '+i);
 const skeleton=skin.skeleton,headIndex=skeleton.bones.findIndex(b=>b.name==='head');if(headIndex<0)throw Error('rigSpeakingHead: no head bone');
 // The jaw bone hangs from the head at the jaw joint, its rest frame the head's, moved there.
 const hinge=new THREE.Vector3(...head.jaw.hinge),local=hinge.clone().applyMatrix4(skeleton.boneInverses[headIndex]);
 const jaw=new THREE.Bone();jaw.name='jaw';jaw.position.copy(local);skeleton.bones[headIndex].add(jaw);jaw.updateMatrixWorld(true);
 skeleton.bones.push(jaw);skeleton.boneInverses.push(new THREE.Matrix4().makeTranslation(-local.x,-local.y,-local.z).multiply(skeleton.boneInverses[headIndex]));
 skeleton.init();if(skeleton.boneTexture){skeleton.boneTexture.dispose();skeleton.boneTexture=null;}
 const jawIndex=skeleton.bones.length-1,a=g.attributes;
 // The skin keeps its own weights where the jaw does not reach and gives the jaw its share.
 for(let i=0;i<n;i++){const w=skinData.jaw[i];if(w<=0)continue;const own=weightsOf(a,i),mix=new Map();for(const [b,x] of own)mix.set(b,x*(1-w));mix.set(jawIndex,(mix.get(jawIndex)||0)+w);setWeights(a,i,mix);}
 a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;
 g.setAttribute('speechMouth',new THREE.Float32BufferAttribute(skinData.inside,1));
 g.setAttribute('speechDepth',new THREE.Float32BufferAttribute(skinData.depth,1));
 // the skin stretched between the parted lips (the cheeks): how far down it a vertex is (0 the upper
 // lip, 1 the lower) and how far the lips part there (0 behind the mouth's corners)
 g.setAttribute('speechLower',new THREE.Float32BufferAttribute(skinData.lower,1));
 g.setAttribute('speechPart',new THREE.Float32BufferAttribute(skinData.part,1));
 // the lips' faces (folded into the crease when closed)
 g.setAttribute('speechFold',new THREE.Float32BufferAttribute(skinData.fold,1));
 // the band between the parted lips shades with its own normals (tools/build-speaking-heads.mjs
 // bandNormals); elsewhere the attribute is the vertex's normal, never used
 const band=Float32Array.from(g.attributes.normal.array);
 if(skinData.band)skinData.band.vertices.forEach((i,k)=>band.set(skinData.band.normal.slice(k*3,k*3+3),i*3));
 g.setAttribute('speechBand',new THREE.Float32BufferAttribute(band,3));
 // The closed shape (tools/build-speaking-heads.mjs closeCrease): the lips' edges laid on the crease,
 // as a morph target the jaw blends in over its last CHEEKS_SHOW of closing.
 if(skinData.closed?.vertices.length){const d=new Float32Array(n*3);skinData.closed.vertices.forEach((i,k)=>d.set(skinData.closed.offset.slice(k*3,k*3+3),i*3));
  g.morphAttributes.position=[new THREE.Float32BufferAttribute(d,3)];g.morphTargetsRelative=true;skin.updateMorphTargets();skin.morphTargetInfluences[0]=1;}
 // The skin's weights at the vertex nearest a point (of those on one side of the mouth).
 const nearest=(p,keep=()=>true)=>{let best=-1,d=Infinity;for(let i=0;i<n;i++){if(!keep(i))continue;const e=(P.getX(i)-p.x)**2+(P.getY(i)-p.y)**2+(P.getZ(i)-p.z)**2;if(e<d){d=e;best=i;}}return weightsOf(a,best);};
 // Hair on the face (the goat's beard) grows from the skin, so it takes the skin's weights where
 // it grows, as horse-light-model.js fitLayers() gave it the skull's.
 for(const hair of worker.parts.filter(p=>/beard/.test(p.name))){const h=hair.geometry.attributes,v=new THREE.Vector3();for(let i=0;i<h.position.count;i++){setWeights(h,i,nearest(v.fromBufferAttribute(h.position,i)));}h.skinIndex.needsUpdate=h.skinWeight.needsUpdate=true;}
 // Teeth and tongue are rigid: the lower teeth and tongue on the jaw, the upper teeth on the head.
 const mouthParts=[];
 for(const part of head.parts.filter(p=>p.kind!=='skin')){
  const geo=new THREE.BufferGeometry(),count=part.position.length/3;
  geo.setAttribute('position',new THREE.Float32BufferAttribute(part.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normal,3));geo.setIndex(part.index);
  const w=new Map([[part.bone==='jaw'?jawIndex:headIndex,1]]);
  const top=[...w].sort((p,q)=>q[1]-p[1]).slice(0,4);while(top.length<4)top.push([0,0]);
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array.from({length:count},()=>top.map(([b])=>b)).flat(),4));
  geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(Array.from({length:count},()=>top.map(([,x])=>x)).flat(),4));
  const mesh=new THREE.SkinnedMesh(geo,new THREE.MeshStandardMaterial({color:0x999999,roughness:.88}));mesh.name=part.name;mesh.frustumCulled=false;mesh.userData.speechKind=part.kind;
  worker.root.add(mesh);mesh.bind(skeleton,skin.bindMatrix);mouthParts.push(mesh);
 }
 const grey=mouthParts.map(m=>m.material);let painted=[],skinMaterial=null;
 // How open the jaw is, for the paint: the cheeks between the lips are the mouth's only once they
 // open (closed, they lie folded in the crease, and the painted mouth line shows there).
 const opening={value:0};
 // The grey sculpt with the mouth shaded (the inside darker, the cheeks between the lips too).
 const greySkin=new THREE.MeshStandardMaterial({color:0x8a8a8a,roughness:.88});
 greySkin.onBeforeCompile=shader=>shadeGrey(shader,opening);greySkin.customProgramCacheKey=()=>'speaking-grey-v10';
 function setJaw(angle){jaw.rotation.z=-angle;jaw.updateMatrixWorld(true);opening.value=THREE.MathUtils.smoothstep(angle,0,CHEEKS_SHOW);if(skin.morphTargetInfluences)skin.morphTargetInfluences[0]=1-opening.value;}
 // The mouth's paint, over the character's registered paint (createAnimalPaint): the skin gets
 // its own material that draws the paint and then the mouth inside the lips; the teeth and
 // tongue are painted as the paint is lit (flat, with their form painted in), or lit.
 function applyPaint(paint,{species=head.species,sceneLighting=paint.material.isMeshStandardMaterial}={}){
  const colors=MOUTH_PAINT[species]||MOUTH;
  skinMaterial?.dispose();painted.forEach(m=>m.dispose());
  skinMaterial=paint.material.clone();const base=paint.material;
  skinMaterial.onBeforeCompile=(shader,renderer)=>{base.onBeforeCompile(shader,renderer);paintMouth(shader,colors,opening);};
  skinMaterial.customProgramCacheKey=()=>base.customProgramCacheKey()+'|speaking-mouth-v13-'+species;
  skin.material=skinMaterial;
  painted=mouthParts.map(mesh=>{const m=sceneLighting?new THREE.MeshStandardMaterial({vertexColors:true,roughness:mesh.userData.speechKind==='teeth'?.45:.7}):new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
   mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(partColors(mesh,colors,!sceneLighting),3));mesh.material=m;return m;});
 }
 function setGrey(on){if(on){skin.material=greySkin;mouthParts.forEach((m,i)=>m.material=grey[i]);}else if(skinMaterial){skin.material=skinMaterial;mouthParts.forEach((m,i)=>m.material=painted[i]);}}
 function dispose(){for(const m of mouthParts){m.removeFromParent();m.geometry.dispose();}grey.forEach(m=>m.dispose());painted.forEach(m=>m.dispose());skinMaterial?.dispose();greySkin.dispose();}
 return {jaw,skin,mouthParts,hinge:hinge.toArray(),setJaw,applyPaint,setGrey,dispose,greySkin,get material(){return skinMaterial;}};
}

// Teeth darken toward their roots in the gum; the tongue is lighter along its top, darker at its
// edges and down its groove. Unlit paint carries a painted form light (from above and in front).
const linear=c=>{const k=new THREE.Color().setRGB(c[0],c[1],c[2],THREE.SRGBColorSpace);return [k.r,k.g,k.b];};
function partColors(mesh,colors,formLight){
 const g=mesh.geometry,P=g.attributes.position,N=g.attributes.normal,count=P.count,out=new Float32Array(count*3);
 g.computeBoundingBox();const box=g.boundingBox,teeth=mesh.userData.speechKind==='teeth',upper=/upper/.test(mesh.name),L=new THREE.Vector3(.45,.75,.48).normalize(),n=new THREE.Vector3();
 for(let i=0;i<count;i++){n.fromBufferAttribute(N,i);const y=P.getY(i),z=P.getZ(i);let c;
  if(teeth){const fromTip=upper?(y-box.min.y)/(box.max.y-box.min.y):(box.max.y-y)/(box.max.y-box.min.y);c=colors.teeth.map((v,k)=>v+(colors.root[k]-v)*THREE.MathUtils.smoothstep(fromTip,.35,1));}
  else{const across=Math.abs(z)/Math.max(1e-4,Math.max(Math.abs(box.min.z),Math.abs(box.max.z))),groove=Math.exp(-((z/.004)**2))*Math.max(0,n.y);
   c=colors.tongue.map(v=>v*(1.08-.30*across**2-.18*groove)*(.85+.15*Math.max(0,n.y)));}
  if(formLight){const s=.72+.28*Math.max(0,n.dot(L));c=c.map(v=>v*s);}
  out.set(linear(c.map(v=>Math.min(1,v))),i*3);}
 return out;
}

// How much a fragment is the mouth's, and how deep in it: the inside (speechMouth, by depth under
// the approved surface) and the skin stretched between the parted lips (the mouth's inner walls,
// the corners), deepest midway between them (speechLower 0..1 across, where the lips part:
// speechPart). Per fragment, so their long triangles shade evenly however they were reduced. Open,
// the lips' faces near the corners (where the lips part only in part) are the mouth's too.
// (the stretched skin is painted as deep as the mouth's back midway between the lips: it is the
// open mouth seen from the side, in its shadow)
const SLAB_DEPTH=.03;
// (the stretched skin, and the lips' faces, take the mouth's paint over the jaw's first 2 degrees:
// closed they lie folded in the crease, where the painted mouth line shows)
const CHEEKS_SHOW=2*Math.PI/180;
// The band between the parted lips (the mouth's inner walls, the corners) shades with its own normals, the open band's facings (speechBand, skinned
// as the normal is), wherever a fragment is graded between the lips: blending in over the first and
// last tenth of the way from one lip to the other, and over the lips' parting at the corners. A game
// mesh's band is a few long triangles from one lip's edge to the other's: the lips' normals across
// them shaded as stripes (round 2), and a wall normal on their folding part, where the fold attribute
// crossed one half, as dark wedges (round 3). Every attribute here is a vertex's, so the shading is
// continuous across the band's triangles however they were reduced.
const BAND=`(smoothstep(0.,.1,vSpeechLower)*(1.-smoothstep(.9,1.,vSpeechLower))*smoothstep(.2,.6,vSpeechPart))`;
// The mouth's inside is lit as it lies in its own shadow, nearly evenly (its normal mostly toward
// the eye, by how much it is the mouth's), so its depth paint, not a game mesh's facets, gives its
// form (round 3: the inner walls' few long triangles at the game budget shaded as light streaks).
const bandNormals=fragment=>fragment.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
  {float b=${BAND},l=length(vSpeechBand);if(b>0.&&l>1e-6)normal=normalize(mix(normal,vSpeechBand/l,b));
   float m,d;speechMouthAt(m,d);if(m>0.)normal=normalize(mix(normal,normalize(vViewPosition),.8*m));}`);
const mouthVaryings=`varying float vSpeechMouth,vSpeechDepth,vSpeechLower,vSpeechPart,vSpeechFold;varying vec3 vSpeechBand;uniform float uSpeechOpen;
  void speechMouthAt(out float m,out float d){float g=vSpeechPart*4.*vSpeechLower*(1.-vSpeechLower)*uSpeechOpen;
   m=max(max(vSpeechMouth*mix(1.,uSpeechOpen,vSpeechFold),smoothstep(0.,.35,g)),smoothstep(.9,1.,vSpeechFold)*uSpeechOpen*(1.-smoothstep(.6,1.,vSpeechPart)));d=max(vSpeechDepth,${SLAB_DEPTH}*g);}`;
function mouthVertex(shader){
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float speechMouth,speechDepth,speechLower,speechPart,speechFold; attribute vec3 speechBand; varying float vSpeechMouth,vSpeechDepth,vSpeechLower,vSpeechPart,vSpeechFold; varying vec3 vSpeechBand;').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\n{vec3 b=speechBand;\n#ifdef USE_SKINNING\nb=(skinMatrix*vec4(b,0.)).xyz;\n#endif\nvSpeechBand=normalMatrix*b;}').replace('#include <begin_vertex>','#include <begin_vertex>\nvSpeechMouth=speechMouth;vSpeechDepth=speechDepth;vSpeechLower=speechLower;vSpeechPart=speechPart;vSpeechFold=speechFold;');
}
// The grey sculpt: the mouth's inside in the mouth's own red (gum, deepening to its back), so the
// open mouth reads as one and its forms show.
function shadeGrey(shader,opening){
 const v=a=>`vec3(${linear(a).map(x=>x.toFixed(4)).join(',')})`;
 mouthVertex(shader);shader.uniforms.uSpeechOpen=opening;
 shader.fragmentShader=bandNormals(shader.fragmentShader).replace('#include <common>','#include <common>\n'+mouthVaryings).replace('#include <color_fragment>',`#include <color_fragment>
  {float m,d;speechMouthAt(m,d);float deep=smoothstep(.004,.035,d);diffuseColor.rgb=mix(diffuseColor.rgb,mix(${v(MOUTH.gum)},${v(MOUTH.back)},deep*deep*(3.-2.*deep)),m);}`);
}
// The mouth inside the lips, drawn over the registered paint: the lip's own colour on its inner
// face, then gum, darkening into the back of the mouth, with a painterly grain.
function paintMouth(shader,c,opening){
 const v=a=>`vec3(${linear(a).map(x=>x.toFixed(4)).join(',')})`;
 mouthVertex(shader);shader.uniforms.uSpeechOpen=opening;
 shader.fragmentShader=bandNormals(shader.fragmentShader).replace('#include <common>',`#include <common>
  ${mouthVaryings}
  float speechHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
  float speechNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(mix(speechHash(i),speechHash(i+vec3(1,0,0)),f.x),mix(speechHash(i+vec3(0,1,0)),speechHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(speechHash(i+vec3(0,0,1)),speechHash(i+vec3(1,0,1)),f.x),mix(speechHash(i+vec3(0,1,1)),speechHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
 .replace('if(uPaintDebug>.5)',`{float m,d;speechMouthAt(m,d);if(m>.001){
   float deep=smoothstep(.004,.035,d);
   vec3 mouth=mix(${v(c.lip)},${v(c.gum)},smoothstep(.003,.011,d));
   mouth=mix(mouth,${v(c.back)},deep*deep*(3.-2.*deep));
   float up=normalize(vPaintNormal).y*(1.-${BAND});
   mouth*=(.80+.20*clamp(up*.5+.5,0.,1.))*(.90+.20*speechNoise(vPaintPosition*220.));
   diffuseColor.rgb=mix(diffuseColor.rgb,mouth,m);
  }
  // closed, the lips' faces lie in the crease: its shadow, on the faces only (the fold attribute
  // interpolates across the outer skin's last triangles: below .9 it darkened a 1-4 mm band, round 2)
  diffuseColor.rgb*=1.-.6*smoothstep(.9,1.,vSpeechFold)*(1.-uSpeechOpen);}
  if(uPaintDebug>.5)`)
 .replace('#include <alphamap_fragment>','{float m,d;speechMouthAt(m,d);if(uPaintDebug>.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.,.75,.85),m);}\n#include <alphamap_fragment>');
}

// A line of speech as syllables [text, seconds, stress 0..1] (null text: a pause), from `start`:
// the jaw opens once per syllable, wider for stressed ones, and is closed between lines.
export function jawAt(t,{start=0,open=.2,syllables}){
 let at=start;for(const [text,seconds,stress=1] of syllables){if(t<at+seconds){if(!text||t<at)return 0;const u=(t-at)/seconds;return open*(.35+.65*stress)*Math.pow(Math.sin(Math.PI*u),.8);}at+=seconds;}return 0;
}
