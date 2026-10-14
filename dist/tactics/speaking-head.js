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

// How far each jaw opens for speech at full stress, in radians; a beak opens wider.
export const SPEECH_OPEN={horse:.2,goat:.2,bull:.19,cow:.2,donkey:.2,sheep:.2,skunk:.22,'pig-foreman':.18,'pig-director':.18,rabbit:.22,dog:.22,hen:.3};

// The mouth's paint, as display (sRGB) colours: inner lip, gum and the shadowed back of the
// mouth, by depth below the approved surface, plus the teeth and tongue. The shaders work in
// linear light, so they take linear() of these.
const MOUTH={lip:[.44,.18,.17],gum:[.64,.32,.32],back:[.17,.05,.05],teeth:[.93,.89,.77],root:[.74,.64,.50],tongue:[.80,.42,.42]};
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
 function setJaw(angle){jaw.rotation.z=-angle;jaw.updateMatrixWorld(true);}
 // The mouth's paint, over the character's registered paint (createAnimalPaint): the skin gets
 // its own material that draws the paint and then the mouth inside the lips; the teeth and
 // tongue are painted as the paint is lit (flat, with their form painted in), or lit.
 function applyPaint(paint,{species=head.species,sceneLighting=paint.material.isMeshStandardMaterial}={}){
  const colors=MOUTH_PAINT[species]||MOUTH;
  skinMaterial?.dispose();painted.forEach(m=>m.dispose());
  skinMaterial=paint.material.clone();const base=paint.material;
  skinMaterial.onBeforeCompile=(shader,renderer)=>{base.onBeforeCompile(shader,renderer);paintMouth(shader,colors);};
  skinMaterial.customProgramCacheKey=()=>base.customProgramCacheKey()+'|speaking-mouth-v1-'+species;
  skin.material=skinMaterial;
  painted=mouthParts.map(mesh=>{const m=sceneLighting?new THREE.MeshStandardMaterial({vertexColors:true,roughness:mesh.userData.speechKind==='teeth'?.45:.7}):new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
   mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(partColors(mesh,colors,!sceneLighting),3));mesh.material=m;return m;});
 }
 function setGrey(on){if(on){skin.material=worker.grey||skin.material;mouthParts.forEach((m,i)=>m.material=grey[i]);}else if(skinMaterial){skin.material=skinMaterial;mouthParts.forEach((m,i)=>m.material=painted[i]);}}
 function dispose(){for(const m of mouthParts){m.removeFromParent();m.geometry.dispose();}grey.forEach(m=>m.dispose());painted.forEach(m=>m.dispose());skinMaterial?.dispose();}
 return {jaw,skin,mouthParts,hinge:hinge.toArray(),setJaw,applyPaint,setGrey,dispose,get material(){return skinMaterial;}};
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

// The mouth inside the lips, drawn over the registered paint: the lip's own colour on its inner
// face, then gum, darkening into the back of the mouth, with a painterly grain. vSpeechMouth is 0
// on the approved surface and 1 from 4.5 mm below it; vSpeechDepth the depth below it.
function paintMouth(shader,c){
 const v=a=>`vec3(${linear(a).map(x=>x.toFixed(4)).join(',')})`;
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float speechMouth,speechDepth; varying float vSpeechMouth,vSpeechDepth;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSpeechMouth=speechMouth;vSpeechDepth=speechDepth;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
  varying float vSpeechMouth,vSpeechDepth;
  float speechHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
  float speechNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(mix(speechHash(i),speechHash(i+vec3(1,0,0)),f.x),mix(speechHash(i+vec3(0,1,0)),speechHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(speechHash(i+vec3(0,0,1)),speechHash(i+vec3(1,0,1)),f.x),mix(speechHash(i+vec3(0,1,1)),speechHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
 .replace('if(uPaintDebug>.5)',`if(vSpeechMouth>.001){
   float d=vSpeechDepth,deep=smoothstep(.004,.035,d);
   vec3 mouth=mix(${v(c.lip)},${v(c.gum)},smoothstep(.003,.011,d));
   mouth=mix(mouth,${v(c.back)},deep*deep*(3.-2.*deep));
   vec3 mn=normalize(vPaintNormal);
   mouth*=(.80+.20*clamp(mn.y*.5+.5,0.,1.))*(.90+.20*speechNoise(vPaintPosition*220.));
   diffuseColor.rgb=mix(diffuseColor.rgb,mouth,vSpeechMouth);
  }
  if(uPaintDebug>.5)`)
 .replace('#include <alphamap_fragment>','if(uPaintDebug>.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.,.75,.85),vSpeechMouth);\n#include <alphamap_fragment>');
}

// A line of speech as syllables [text, seconds, stress 0..1] (null text: a pause), from `start`:
// the jaw opens once per syllable, wider for stressed ones, and is closed between lines.
export function jawAt(t,{start=0,open=.2,syllables}){
 let at=start;for(const [text,seconds,stress=1] of syllables){if(t<at+seconds){if(!text||t<at)return 0;const u=(t-at)/seconds;return open*(.35+.65*stress)*Math.pow(Math.sin(Math.PI*u),.8);}at+=seconds;}return 0;
}
