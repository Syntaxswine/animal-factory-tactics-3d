import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';

// Reproducible, intentionally conservative thickness measurements, not a fit
// certificate for a retargeted animal. Never use percentiles to hide appendages.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist/tactics/body-envelope-profiles.json');
const categories=['lowerTorso','chest','neck','head','upperArm','forearm','hand','thigh','shin','foot'];
const round=n=>Math.round(n*1e6)/1e6;
const vec=v=>v.toArray().map(round);
const distanceToSegment=(p,a,b)=>{const d=b.clone().sub(a),t=THREE.MathUtils.clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1);return p.distanceTo(a.clone().addScaledVector(d,t));};
const profiles={};
for(const item of ANIMAL_MOTION_CATALOG){
 const filename=path.join(root,'dist/tactics',item.file),bytes=fs.readFileSync(filename),data=JSON.parse(bytes),source={file:item.file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),triangles:data.triangles};
 if(item.id==='hen'){
  profiles[item.id]={label:item.label,source,supported:false,reason:'The bird rig has wings and shanks, not the mannequin arm/thigh chain. A mammal thickness transfer would imply a false fit.',radii:null,diameters:null};
  continue;
 }
 const model=item.create(data);model.pose('neutral');model.root.updateMatrixWorld(true);
 const joints=Object.fromEntries(model.bones.map(b=>[b.name,b.getWorldPosition(new THREE.Vector3())]));
 const shoulders=joints['upperArm-1'].clone().add(joints.upperArm1).multiplyScalar(.5);
 // The source has no separate neck or terminal head bone. Shoulder midpoint
 // and head root delimit the neck. The head proxy uses the mannequin's 0.14
 // length, so high ears/horns cannot disappear into an arbitrarily long axis.
 const axes={lowerTorso:[[joints.hips,joints.spine]],chest:[[joints.spine,shoulders]],neck:[[shoulders,joints.head]],head:[[joints.head,joints.head.clone().add(new THREE.Vector3(0,.14,0))]]};
 for(const key of ['upperArm','forearm','hand','thigh','shin','foot'])axes[key]=[];
 for(const side of [-1,1]){
  axes.upperArm.push([joints['upperArm'+side],joints['forearm'+side]]);
  axes.forearm.push([joints['forearm'+side],joints['hand'+side]]);
  axes.hand.push([joints['hand'+side],joints['fingers'+side]]);
  axes.thigh.push([joints['thigh'+side],joints['shin'+side]]);
  axes.shin.push([joints['shin'+side],joints['hoof'+side]]);
  // Same 0.12 terminal forward axis as the mannequin. Thick soles and toes
  // outside it enlarge the measured radius instead of being clipped away.
  axes.foot.push([joints['hoof'+side],joints['hoof'+side].clone().add(new THREE.Vector3(.12,0,0))]);
 }
 const measurement=Object.fromEntries(categories.map(category=>[category,{vertices:0,maxRadius:0,axisPairs:axes[category].map(pair=>pair.map(vec)),witness:null}]));
 const excludedParts=[];let sourceVertices=0;
 for(const mesh of model.parts){
  const p=mesh.geometry.attributes.position,si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,indices=new Set(mesh.geometry.index?.array??Array.from({length:p.count},(_,i)=>i));
  // Tail orientation needs its own chain; placing it in a hip capsule would
  // produce neither a useful body envelope nor a faithful tail collision.
  if(/tail|utility pouch|utility belt/i.test(mesh.name)){excludedParts.push({name:mesh.name,vertices:indices.size});continue;}
  for(const i of indices){
   const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);let dominant=0;for(let j=1;j<4;j++)if(sw.getComponent(i,j)>sw.getComponent(i,dominant))dominant=j;
   const bone=model.bones[si.getComponent(i,dominant)].name;let category;
   if(bone==='hips')category='lowerTorso';
   else if(bone==='spine')category=q.y<joints.spine.y?'lowerTorso':((/skull|neck|scarf/i.test(mesh.name)&&q.y>=shoulders.y)?'neck':'chest');
   else if(bone==='head')category='head';
   else if(bone.startsWith('upperArm'))category='upperArm';
   else if(bone.startsWith('forearm'))category='forearm';
   else if(/^(hand|fingers)/.test(bone))category='hand';
   else if(bone.startsWith('thigh'))category='thigh';
   else if(bone.startsWith('shin'))category='shin';
   else if(bone.startsWith('hoof'))category='foot';
   else throw Error('Unclassified source bone: '+bone);
   const axisIndex=axes[category].length===1?0:(bone.endsWith('-1')?0:1),axis=axes[category][axisIndex],r=distanceToSegment(q,...axis),m=measurement[category];m.vertices++;sourceVertices++;
   if(r>m.maxRadius){m.maxRadius=r;m.witness={part:mesh.name,vertex:i,position:vec(q),dominantBone:bone,axisIndex};}
  }
 }
 const radii={},diameters={};
 for(const category of categories){const m=measurement[category];if(!m.vertices)throw Error(item.id+' has no '+category+' samples');radii[category]=Math.ceil(m.maxRadius*1e6)/1e6;diameters[category]=round(radii[category]*2);m.maxRadius=round(m.maxRadius);}
 profiles[item.id]={label:item.label,source,supported:true,radii,diameters,measurements:measurement,sourceVertices,excludedParts,limitations:['Thickness-only overlay: authored mannequin lengths, joint positions, motion and mass remain unchanged.','The maximum-radius capsule intentionally overestimates empty space around muzzle, ears, horns, cap and clothing.','Dominant rest-pose skin weights partition vertices; blended deformation, inter-category triangles and posed garment bulging are not certified.','Terminal head/foot proxy lengths are 0.14/0.12 world units, matching the mannequin; other axes use source rig joints.','Source outfit only. Red hats, stowed/carried weapons, straps, auxiliary grip meshes and excluded tail/utility parts require separate envelopes.']};
 model.dispose();
}
const result={schemaVersion:1,units:'world units; one tile is 1',method:{name:'maximum rest-vertex distance to anatomical segment',command:'node tools/build-body-envelope-profiles.mjs',partition:'Each indexed, rendered body vertex is assigned by its strongest normalized skin weight. Spine-weighted vertices below the spine root use lower torso; skull/neck parts above the shoulder midpoint use neck; remaining spine vertices use chest. Left/right radii aggregate by maximum.',radius:'Maximum Euclidean distance to the finite source axis, rounded upward to one microunit. No percentile trimming, animal rescaling or species number substitutions.',coverage:'Conservative per-category point envelopes in neutral source pose, not retargeted whole-animal capsule containment or physical collision validation.'},profiles};
const text=JSON.stringify(result,null,1)+'\n';if(Buffer.byteLength(text)>100000)throw Error('Profile output exceeds compact budget');fs.writeFileSync(output,text);console.log(`Wrote ${Object.keys(profiles).length} profiles (${Buffer.byteLength(text)} bytes), ${Object.values(profiles).filter(p=>p.supported).length} supported thickness overlays.`);
