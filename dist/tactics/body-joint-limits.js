// Illustrative mannequin limits, not a veterinary/anatomical species model.
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const d=Math.hypot(...a);if(d<1e-10)throw Error('Degenerate joint axis');return a.map(x=>x/d);};
const signed=(from,to,axis)=>Math.atan2(dot(cross(to,from),axis),dot(from,to))*180/Math.PI;
export function jointLimitReport(state){
 const p=state.points,axis=normalize(sub(p.hip1,p['hip-1']));
 const direction=(a,b)=>normalize(sub(p[b],p[a])),lower=direction('hip','lumbar'),chest=direction('lumbar','shoulders'),neck=direction('shoulders','neck'),head=direction('neck','head');
 const joints=[];
 const add=(name,angle,min,max,planeError=0)=>joints.push({name,angle,min,max,planeError,warning:angle<min-.1||angle>max+.1||planeError>.2});
 add('spine flexion',signed(lower,chest,axis),-30,70,Math.max(Math.abs(dot(lower,axis)),Math.abs(dot(chest,axis))));
 add('neck / head flexion',signed(chest,neck,axis)+signed(neck,head,axis),-45,70,Math.max(Math.abs(dot(chest,axis)),Math.abs(dot(neck,axis)),Math.abs(dot(head,axis))));
 for(const side of [-1,1]){
  const normal=normalize(state.kneeAxes?.[side]??axis),thigh=direction('hip'+side,'knee'+side),shin=direction('knee'+side,'ankle'+side);
  add('knee '+side,signed(thigh,shin,normal),0,150,Math.max(Math.abs(dot(thigh,normal)),Math.abs(dot(shin,normal))));
 }
 return {joints,warnings:joints.filter(j=>j.warning),limitations:'Illustrative mannequin sagittal limits. Lateral spine/neck motion is unverified and warns; out-of-plane knees require a declared hinge axis. Hips, shoulders, wrists, ankles and species anatomy are not certified.'};
}
