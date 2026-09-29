import * as T from './vendor/three.module.js';
import {sampleSneakWindow} from './weighted-window-supported.js';
const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
const mix=(a,b,t)=>a+(b-a)*t,rad=Math.PI/180;
// First beak contact with the pane at X=0 in the native-size folded passage.
export const HEN_WINDOW_IMPACT=3.053;
export const HEN_WINDOW_PHASES=[
  {label:'Approach',start:0,end:1.2},{label:'Bird crouch',start:1.2,end:2},
  {label:'Flutter to opening',start:2,end:2.7},{label:'Folded passage',start:2.7,end:4.1},
  {label:'Feet down',start:4.1,end:5.6},{label:'Settle upright',start:5.6,end:8}
];

// Native bird articulation: these are wing, shank and foot bones, not hands/knees.
export function createHenWindowFit(worker) {
  const bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
  for(const name of ['pelvis','breast','head',...[-1,1].flatMap(s=>['wing '+s,'wing tip '+s,'shank '+s,'foot '+s])])
    if(!bones[name]) throw new Error('Hen fitting needs the native bird rig: '+name);
  const rest=worker.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
  const originalSkeleton=worker.skeleton;
  const vest=worker.parts.find(m=>m.name==='fitted waistcoat');
  if(!vest)throw new Error('Hen fitting needs native part: fitted waistcoat');
  const vestOriginal={skinIndex:vest.geometry.attributes.skinIndex,skinWeight:vest.geometry.attributes.skinWeight,paintPosition:vest.geometry.attributes.paintPosition,paintNormal:vest.geometry.attributes.paintNormal};
  const vestIndex=vestOriginal.skinIndex.clone(),vestWeight=vestOriginal.skinWeight.clone();
  const vestPaint=vestOriginal.paintPosition.clone(),vestPaintNormal=vestOriginal.paintNormal.clone();
  for(let i=0;i<vestIndex.count;i++){
    const y=vest.geometry.attributes.position.getY(i),follow=T.MathUtils.smoothstep(y,1.16,1.30);
    if(follow>0){vestIndex.setXYZW(i,worker.bones.indexOf(bones.breast),worker.bones.indexOf(bones.head),0,0);vestWeight.setXYZW(i,1-follow,follow,0,0);}
  }
  const rootScale=worker.root.scale.clone();
  const specs=[['tail fold','upright tail fan',[-.20,.05,0]],['apron fold','continuous apron',[.16,.08,0]],['tie fold','apron waist tie',[0,.05,0]]];
  for(const [,part]of specs)if(!worker.parts.some(m=>m.name===part&&m.geometry.attributes.skinIndex))throw new Error('Hen fitting needs native part: '+part);
  // Separate rigid cloth/fan controls preserve each source vertex and its
  // neutral shape. They do not certify cloth/body self-clearance.
  const controls=specs.map(([name,part,position],i)=>{
    const bone=new T.Bone();bone.name=name;bone.position.set(...position);
    const mesh=worker.parts.find(m=>m.name===part),original=mesh.geometry.attributes.skinIndex,attribute=original.clone();
    for(let j=0;j<attribute.count;j++)attribute.setX(j,originalSkeleton.bones.length+i);
    return {bone,mesh,original,attribute};
  });
  for(const c of controls)bones.pelvis.add(c.bone);
  worker.root.updateMatrixWorld(true);
  let skeleton;
  try{skeleton=new T.Skeleton([...originalSkeleton.bones,...controls.map(c=>c.bone)],[...originalSkeleton.boneInverses,...controls.map(c=>c.bone.matrixWorld.clone().invert())]);}
  catch(error){for(const c of controls)c.bone.removeFromParent();throw error;}
  let disposed=false;
  function attach(){vest.geometry.setAttribute('skinIndex',vestIndex);vest.geometry.setAttribute('skinWeight',vestWeight);vest.geometry.setAttribute('paintPosition',vestPaint);vest.geometry.setAttribute('paintNormal',vestPaintNormal);for(const c of controls){bones.pelvis.add(c.bone);c.mesh.geometry.setAttribute('skinIndex',c.attribute);}for(const m of worker.parts)m.skeleton=skeleton;worker.skeleton=skeleton;}
  function restore(){for(const [name,a]of Object.entries(vestOriginal))vest.geometry.setAttribute(name,a);for(const c of controls){c.bone.removeFromParent();c.mesh.geometry.setAttribute('skinIndex',c.original);}for(const m of worker.parts)m.skeleton=originalSkeleton;worker.skeleton=originalSkeleton;}
  function apply(time) {
    if(disposed)throw new Error('Hen fitting has been disposed');
    if(!Number.isFinite(time)) throw new TypeError('Hen fitting time must be finite');
    const t=T.MathUtils.clamp(time,0,8);
    attach();
    for(const {b,p,q,s} of rest){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s);}
    const crouch=smooth((t-1.2)/.8),rise=smooth((t-4.1)/1.5),fold=crouch*(1-rise);
    // The neutral side painting includes the wing that occludes this fabric.
    // When it becomes exposed, register that cloth to an unoccluded patch of
    // the same outfit's existing front painting, not the baked red sleeve.
    if(fold===0){vestPaint.array.set(vestOriginal.paintPosition.array);vestPaintNormal.array.set(vestOriginal.paintNormal.array);}
    else for(let i=0;i<vestPaint.count;i++){
      const p=new T.Vector3().fromBufferAttribute(vestOriginal.paintPosition,i),n=new T.Vector3().fromBufferAttribute(vestOriginal.paintNormal,i);
      const weight=fold*Math.max(1-T.MathUtils.smoothstep(p.x,0,.18),T.MathUtils.smoothstep(Math.abs(p.z),.17,.26));
      p.lerp(new T.Vector3(.25,1.10+(p.y-1.04)*.20,-.12+p.z*.05),weight);n.lerp(new T.Vector3(1,0,0),weight).normalize();
      vestPaint.setXYZ(i,p.x,p.y,p.z);vestPaintNormal.setXYZ(i,n.x,n.y,n.z);
    }
    vestPaint.needsUpdate=vestPaintNormal.needsUpdate=true;
    const pitch=86*fold;
    bones.pelvis.rotation.z=-pitch*rad;
    bones.head.rotation.z=65*fold*rad;
    for(const s of [-1,1]){
      // The original shank offset is retained. Counterrotation keeps each
      // native foot beneath the bird instead of aiming it behind the head.
      bones['shank '+s].rotation.z=pitch*rad;
      bones['wing '+s].rotation.z=12*fold*rad;
      if(t<1.2){const step=s*12*Math.sin(2*Math.PI*t/1.2)*Math.sin(Math.PI*t/1.2);bones['shank '+s].rotation.z+=step*rad;bones['foot '+s].rotation.z=-step*rad;}
      if(t>2&&t<2.7)bones['wing '+s].rotation.x=s*18*Math.sin(4*Math.PI*(t-2)/.7)*Math.sin(Math.PI*(t-2)/.7)**2*rad;
    }
    controls[0].bone.rotation.z=150*fold*rad;
    controls[1].bone.rotation.z=-12*fold*rad;
    controls[2].bone.rotation.z=40*fold*rad;
    const x=t<1.2?mix(-1.2,-1,smooth(t/1.2)):t<2?mix(-1,-.95,crouch):t<2.7?-.95:t<4.1?mix(-.95,.86,smooth((t-2.7)/1.4)):mix(.86,.636,rise);
    worker.root.position.set(x,0,0);worker.root.quaternion.identity();worker.root.scale.copy(rootScale);
    worker.root.updateMatrixWorld(true);worker.skeleton.update();
    // Inspect the posed native surfaces, including a fitted cap, to locate
    // the floor and the actual cross-section of the finite-thickness frame.
    // This positions the animation; it is not a contact/force certificate.
    let floor=Infinity,lo=Infinity,hi=-Infinity;
    const include=v=>{lo=Math.min(lo,v.y);hi=Math.max(hi,v.y);};
    worker.root.traverseVisible(m=>{
      if(!m.isMesh)return;
      const a=m.geometry.attributes.position,points=Array.from({length:a.count},(_,i)=>m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld));
      for(const v of points){floor=Math.min(floor,v.y);if(Math.abs(v.x)<=.095)include(v);}
      const idx=m.geometry.index?.array;
      if(idx)for(let i=0;i<idx.length;i+=3)for(let edge=0;edge<3;edge++){
        const a=points[idx[i+edge]],b=points[idx[i+(edge+1)%3]];
        for(const x of [-.095,.095])if((a.x<x&&b.x>x)||(a.x>x&&b.x<x))include(a.clone().lerp(b,(x-a.x)/(b.x-a.x)));
      }
    });
    const grounded=.002-floor;
    // Duck the crest before it reaches the near frame, then raise the body
    // slightly for the feet. Anticipating these constraints avoids snapping
    // when a disconnected feather/cloth surface first enters the wall slab.
    let lift=t<2?grounded:t<2.7?mix(grounded,.34,smooth((t-2)/.7)):t<4.1?mix(.34,.415,smooth((t-3.2)/.15)):mix(.415,grounded,rise);
    if(lo!==Infinity&&t>=2&&t<5.6){
      const lower=.880-lo,upper=1.520-hi;
      lift=Math.max(grounded,lower<=upper?T.MathUtils.clamp(lift,lower,upper):(lower+upper)/2);
    }
    worker.root.position.y=lift;
    worker.root.updateMatrixWorld(true);worker.skeleton.update();
    // Keep comparison markers honest: these are deviations from the reference
    // mannequin, not palms/soles, authored contacts, or a bird force model.
    const reference=sampleSneakWindow(t).points;
    const errors=[-1,1].flatMap(s=>[
      ['wing'+s,bones['wing tip '+s],new T.Vector3(),new T.Vector3(...reference['palm'+s])],
      ['foot'+s,bones['foot '+s],new T.Vector3(0,-.06,0),new T.Vector3(...reference['ankle'+s]).add(new T.Vector3(0,-.06,0))]
    ]).map(([name,bone,offset,target])=>{const actual=bone.localToWorld(offset);return{name,constraint:'reference',error:actual.distanceTo(target),target:target.toArray(),actual:actual.toArray()};});
    return {errors,glassTime:t<HEN_WINDOW_IMPACT?-1:t-HEN_WINDOW_IMPACT,phase:HEN_WINDOW_PHASES.find(p=>t<p.end)?.label??HEN_WINDOW_PHASES.at(-1).label,
      supported:false,supportNote:'Authored bird flutter and landing; support and forces are unverified. Wing/foot markers compare the reference mannequin only.',fitClearance:lo===Infinity?null:.65-(hi-lo)};
  }
  return {apply,restore,phases:HEN_WINDOW_PHASES,dispose(){if(disposed)return;restore();skeleton.dispose();disposed=true;}};
}
