import * as T from './vendor/three.module.js';
import {createLadderPaintCorrection} from './ladder-paint.js';
import {createLadderGrip} from './ladder-grip.js';
import {createBattlePosture} from './battle-posture.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const compiledRoutes=new Map();
export const LADDER_PRESETS={
 floor:{height:2.12,plane:.35,width:.60,firstRung:.1325,spacing:.265,rungs:8,railTop:3.02},
 tower:{height:6.36,plane:.35,width:.70,firstRung:.22,spacing:.28,rungs:22,railTop:7.29,rungThickness:.06,rungDepth:.08,railThickness:.075}
};
export const WIDE_LADDER_EXIT=.94;
export const ladderRailZ=(d,y,side=1)=>side*T.MathUtils.lerp(d.width,d.exitWidth||d.width,T.MathUtils.clamp((y-d.height)/.35,0,1))/2;
export function ladderRailSegments(d){const ys=d.exitWidth?[0,d.height,d.height+.35,d.railTop]:[0,d.railTop],segments=[];for(const side of [-1,1])for(let i=1;i<ys.length;i++){const a=V(d.plane,ys[i-1],ladderRailZ(d,ys[i-1],side)),b=V(d.plane,ys[i],ladderRailZ(d,ys[i],side));segments.push({a,b});}return segments;}

// Local frame: +X faces the ladder/landing, +Y up, Z spans the rungs. The
// integration owner supplies this frame's world transform and playback time.
export function createLadderMotion(worker,profile,definition=LADDER_PRESETS.floor){
 if(profile.unarmed)throw new Error('Hen wing contacts are not authored for ladder climbing');
 const d={...definition},root=worker.root,bones=worker.bones,named=Object.fromEntries(bones.map(b=>[b.name,b]));
 if(profile.id.startsWith('pig')&&(d.exitWidth||d.width)<WIDE_LADDER_EXIT)throw new Error('Pig climbing requires the authored 0.94-wide flared exit; original narrow handholds do not fit');
 if(!worker.weapon?.anchors?.stock||(worker.weapon.id&&worker.weapon.id!=='rifle'))throw new Error('Ladder study supports the worker rifle only');
 const entry={position:root.position.clone(),quaternion:root.quaternion.clone()};checkFrame();
 if(!['height','plane','width','firstRung','spacing','rungs','railTop'].every(k=>Number.isFinite(d[k]))||['exitWidth','rungThickness','rungDepth','railThickness'].some(k=>d[k]!==undefined&&(!Number.isFinite(d[k])||d[k]<=0))||!(d.height>0&&d.firstRung>=0&&d.spacing>0&&Number.isInteger(d.rungs)&&d.rungs>=6&&d.rungs<=128&&d.width>.4&&(!d.exitWidth||d.exitWidth>=d.width)&&d.railTop>=d.height+.65&&d.firstRung+(d.rungs-1)*d.spacing<d.height))throw new Error('Ladder requires finite rung geometry and upper handholds at least 0.65 above its landing');
 worker.pose('neutral');root.position.set(0,0,0);root.rotation.set(0,0,0);root.updateMatrixWorld(true);
 const rest=new Map(bones.map(b=>[b,b.getWorldPosition(V())])),saved=worker.parts.map(p=>({p,si:p.geometry.attributes.skinIndex.clone(),sw:p.geometry.attributes.skinWeight.clone()}));
 createBattlePosture(worker,['dog','rabbit'].includes(profile.id)?{...profile,proneAim:{...profile.proneAim,tuckHem:false}}:profile); // Approved hem/pastern corrections only.
 // Preserve the inner sleeve corridor while keeping medial shirt on torso.
 if(['dog','rabbit'].includes(profile.id))for(const part of worker.parts.filter(p=>p.name.includes('shirt'))){const a=part.geometry.attributes;for(let i=0;i<a.position.count;i++){const p=V().fromBufferAttribute(a.position,i),side=p.z<0?-1:1,upper=named['upperArm'+side],lower=named['forearm'+side],axis=rest.get(lower).clone().sub(rest.get(upper)),t=T.MathUtils.clamp(p.clone().sub(rest.get(upper)).dot(axis)/axis.lengthSq(),0,1.2),distance=p.distanceTo(rest.get(upper).clone().addScaledVector(axis,t)),corridor=(1-T.MathUtils.smoothstep(distance,.095,.13))*T.MathUtils.smoothstep(Math.abs(p.z),profile.id==='dog'?.215:.24,profile.id==='dog'?.235:.27);let u=0,l=0;for(let j=0;j<4;j++){const b=bones[a.skinIndex.getComponent(i,j)],w=a.skinWeight.getComponent(i,j);if(b===upper)u+=w;if(b===lower)l+=w;}const medial=profile.id==='rabbit'?T.MathUtils.smoothstep(Math.abs(p.z),.21,.25):1,total=Math.max((u+l)*medial,corridor),elbow=1-T.MathUtils.smoothstep(p.y,.98,1.06);a.skinIndex.setXYZW(i,bones.indexOf(named.spine),bones.indexOf(upper),bones.indexOf(lower),0);a.skinWeight.setXYZW(i,1-total,total*(1-elbow),total*elbow,0);}a.skinWeight.needsUpdate=a.skinIndex.needsUpdate=true;}
 // The compact foreman's central rear seat belongs to the pelvis, not one
 // thigh chosen by the sign of a nearly-zero Z coordinate.
 if(profile.id==='pig-foreman')for(const part of worker.parts.filter(p=>p.name.includes('trousers'))){const a=part.geometry.attributes,hip=bones.indexOf(named.hips);for(let i=0;i<a.position.count;i++){const x=a.position.getX(i),y=a.position.getY(i),z=Math.abs(a.position.getZ(i)),blend=(1-T.MathUtils.smoothstep(x,-.18,-.07))*(1-T.MathUtils.smoothstep(z,.025,.11))*T.MathUtils.smoothstep(y,.50,.58)*(1-T.MathUtils.smoothstep(y,.70,.80));if(blend===0)continue;const weights=new Map([[hip,blend]]);for(let j=0;j<4;j++){const k=a.skinIndex.getComponent(i,j);weights.set(k,(weights.get(k)||0)+a.skinWeight.getComponent(i,j)*(1-blend));}const rows=[...weights].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=rows.reduce((v,[,w])=>v+w,0);while(rows.length<4)rows.push([0,0]);a.skinIndex.setXYZW(i,...rows.map(([k])=>k));a.skinWeight.setXYZW(i,...rows.map(([,w])=>w/sum));}a.skinWeight.needsUpdate=a.skinIndex.needsUpdate=true;}
 const activeSkin=worker.parts.map(p=>({p,si:p.geometry.attributes.skinIndex.clone(),sw:p.geometry.attributes.skinWeight.clone()}));
 const paintCorrection=createLadderPaintCorrection(worker,profile);
 const limbs=[],palm=V(.10,-.024,0),contacts={};
 for(const side of [-1,1]){
  const a=named['upperArm'+side],b=named['forearm'+side],c=named['hand'+side];limbs.push({id:'hand'+side,side,a,b,c,offset:palm.clone(),pole:V(-.22,-.5,side*.6),finger:named['fingers'+side]});
  const hip=named['thigh'+side],knee=named['shin'+side],ankle=named['hoof'+side];
  const foot=worker.parts.find(p=>/hoof|boot|foot/.test(p.name)&&p.name.endsWith(' '+side)),pos=foot.geometry.attributes.position;let sole=Infinity;for(let i=0;i<pos.count;i++)sole=Math.min(sole,pos.getY(i));
  let tip=-Infinity,halfWidth=0;for(let i=0;i<pos.count;i++){tip=Math.max(tip,pos.getX(i));halfWidth=Math.max(halfWidth,Math.abs(pos.getZ(i)-rest.get(ankle).z));}
  const offset=V(tip,sole,rest.get(ankle).z).sub(rest.get(ankle)),stance=Math.min(.18,d.width/2-halfWidth-.045);
  limbs.push({id:'foot'+side,side,a:hip,b:knee,c:ankle,offset,stance,pole:V(1,.4,side*.6)});
 }
 for(const l of limbs){if(l.finger&&profile.id==='pig-director'){l.surface=[];for(const part of worker.parts.filter(p=>p.name.includes('shirt'))){const a=part.geometry.attributes;for(let i=0;i<a.position.count;i++){const weights=Array.from({length:4},(_,j)=>({bone:bones[a.skinIndex.getComponent(i,j)],weight:a.skinWeight.getComponent(i,j)})).filter(w=>w.weight>0);if(weights.some(w=>(w.bone===l.a||w.bone===l.b)&&w.weight>.1))l.surface.push({point:V().fromBufferAttribute(a.position,i),weights});}}}l.la=rest.get(l.a).distanceTo(rest.get(l.b));l.lb=rest.get(l.b).distanceTo(rest.get(l.c));contacts[l.id]=rest.get(l.c).clone().add(l.offset);}
 const grips=limbs.filter(l=>l.finger).map(l=>({limb:l,asset:createLadderGrip(worker,l.side,rest.get(l.c).y)}));
 const slingGeometry=new T.BufferGeometry(),slingMaterial=new T.MeshStandardMaterial({color:0x513a25,roughness:.95,side:T.DoubleSide}),sling=new T.Mesh(slingGeometry,slingMaterial);sling.name='Rifle shoulder sling';root.add(sling);
 const back=profile.id.startsWith('pig')?-.40:profile.id==='skunk'?-.22:-.29,stowZ=profile.id==='skunk'?.53:-.15,front=profile.id.startsWith('pig')?.33:.19,slingCurve=new T.CatmullRomCurve3([V(back,-.23,stowZ),V(-.18,.17,-.18),V(.025,.22,-.17),V(front,.10,-.13),V(front,-.18,.14),V(back,-.23,stowZ)]),slingPoints=slingCurve.getPoints(32),slingPositions=new Float32Array(slingPoints.length*6),slingIndices=[];
 for(let i=0;i<slingPoints.length-1;i++)slingIndices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);slingGeometry.setAttribute('position',new T.BufferAttribute(slingPositions,3));slingGeometry.setIndex(slingIndices);
 const phases=[],neutral=structuredClone(Object.fromEntries(Object.entries(contacts).map(([k,v])=>[k,v.toArray()])));
 let state=Object.fromEntries(Object.entries(contacts).map(([k,v])=>[k,{point:v.clone(),kind:k.startsWith('hand')?'free':'floor',index:null}]));
 const rung=(index,side,hand)=>{let y=d.firstRung+index*d.spacing,rail=hand&&(index>=d.rungs||y>d.height-.20);if(rail)y=Math.max(y,d.height+.14);return {point:V(d.plane,y+(hand?0:(d.rungThickness||.055)/2),rail?ladderRailZ(d,y,side):side*(hand?d.width*.36:limbs.find(l=>l.id==='foot'+side).stance)),kind:rail?'rail':'rung',index};};
 const add=(label,id,target,duration=.48)=>{const from=Object.fromEntries(Object.entries(state).map(([k,v])=>[k,{...v,point:v.point.clone()}]));if(id)state[id]=target;phases.push({label,id,from,to:Object.fromEntries(Object.entries(state).map(([k,v])=>[k,{...v,point:v.point.clone()}])),duration});};
 const firstHand=Math.floor((Math.min(rest.get(named['upperArm-1']).y,rest.get(named.upperArm1).y)+.04-d.firstRung)/d.spacing)-(profile.id.startsWith('pig')?1:0);
 add('Reach left hand','hand-1',rung(firstHand,-1,true),1.1);add('Reach right hand','hand1',rung(firstHand+1,1,true),1.1);
 add('Mount left foot','foot-1',rung(0,-1,false),1.1);add('Mount right foot','foot1',rung(1,1,false),1.1);
 const fi={'-1':0,'1':1},hi={'-1':firstHand,'1':firstHand+1};
 const lastFoot=d.rungs-(d.height-(d.firstRung+(d.rungs-1)*d.spacing)>.20?1:2);
 while(fi[-1]<lastFoot||fi[1]<lastFoot)for(const side of [-1,1]){
  const next=Math.min(fi[side]+(profile.id.startsWith('pig')?1:2),lastFoot),advance=next-fi[side];if(next===fi[side])continue;
  fi[side]=next;add('Step '+(side===-1?'left':'right'),'foot'+side,rung(next,side,false),.9);
  hi[side]+=advance;const hand=rung(hi[side],side,true);hand.point.y=Math.min(hand.point.y,d.railTop-.005);add('Reach '+(side===-1?'left':'right'),'hand'+side,hand,profile.id.startsWith('pig')?1.5:1.1);
 }
 for(const side of [-1,1])add('Lift '+(side===-1?'left':'right')+' hand to upper hold','hand'+side,{point:V(d.plane,d.railTop-.005,ladderRailZ(d,d.railTop-.005,side)),kind:'rail',index:d.rungs+3},1.1);
 add('Step onto landing','foot1',{point:V(d.plane+.38,d.height,Math.min(.18,d.width/2-.18)),kind:'landing',index:null},2.0);
 add('Bring left foot through','foot-1',{point:V(d.plane+.28,d.height,-Math.min(.18,d.width/2-.18)),kind:'landing',index:null},2.0);
 add('Release left hand','hand-1',{point:V(d.plane+.35+neutral['hand-1'][0],d.height+neutral['hand-1'][1],neutral['hand-1'][2]),kind:'free',index:null},1.4);
 add('Release right hand','hand1',{point:V(d.plane+.35+neutral.hand1[0],d.height+neutral.hand1[1],neutral.hand1[2]),kind:'free',index:null},1);
 let elapsed=0;for(const p of phases){p.start=elapsed;elapsed+=p.duration;p.end=elapsed;}const duration=elapsed;
 let result=null,disposed=false;const routeAngles={},routeCosts={},routeFrames={},routeSteps=Math.ceil(duration*30),angleStep=Math.PI/36,angleCount=61;let bakingFrame=-1;
 function checkFrame(){root.parent?.updateMatrixWorld(true);if(root.scale.distanceTo(V(1,1,1))>1e-8||(root.parent&&!root.parent.matrixWorld.elements.every((v,i)=>Math.abs(v-(i%5===0?1:0))<1e-8)))throw new Error('Ladder motion requires an unscaled actor under an identity scene parent; use origin and heading');}
 function worldRotation(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));root.updateMatrixWorld(true);}
 const rails=ladderRailSegments(d).map(({a,b})=>{const axis=b.clone().sub(a),length=axis.length();return {center:a.clone().add(b).multiplyScalar(.5),axis:axis.normalize(),length};});
 function railDistance(p){let distance=Infinity;for(const {center,axis,length}of rails){const dy=p.y-center.y,dz=p.z-center.z,x=Math.abs(p.x-d.plane)-(d.railThickness||.07)/2,y=Math.abs(dy*axis.y+dz*axis.z)-length/2,z=Math.abs(-dy*axis.z+dz*axis.y)-(d.railThickness||.07)/2;distance=Math.min(distance,Math.hypot(Math.max(0,x),Math.max(0,y),Math.max(0,z))+Math.min(Math.max(x,y,z),0));}return distance;}
 function routeJoint(l,start,target,circle,pole,radius,axis,time){
  const preferred=pole.clone(),frames=routeFrames[l.id]??=[];
  const frame=bakingFrame>=0?bakingFrame:Math.min(routeSteps,Math.floor(time/duration*routeSteps));
  if(bakingFrame>=0){if(frame){const previous=frames[frame-1];pole=previous.pole.clone().applyQuaternion(new T.Quaternion().setFromUnitVectors(previous.axis,axis));}frames[frame]={pole:pole.clone(),axis:axis.clone()};}
  else{const previous=frames[frame];pole=previous.pole.clone().applyQuaternion(new T.Quaternion().setFromUnitVectors(previous.axis,axis));}
  const tangent=axis.clone().cross(pole),leg=l.id.startsWith('foot');
  const candidate=angle=>circle.clone().addScaledVector(pole,radius*Math.cos(angle)).addScaledVector(tangent,radius*Math.sin(angle));
  function score(angle){const mid=candidate(angle);let cost=(1-preferred.dot(pole.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent,Math.sin(angle))))*.0003;
   for(const [a,b,thickness,end]of [[start,mid,leg?.15:profile.id==='sheep'?.23:profile.id==='dog'?.22:.20,1],[mid,target,leg?.10:profile.id.startsWith('pig')?.20:.13,leg?.85:1]])for(let u=.1;u<=end+.001;u+=.1){const p=a.clone().lerp(b,u);cost+=40*Math.max(0,(b===target&&!leg?T.MathUtils.lerp(thickness,.055,T.MathUtils.smoothstep(u,.8,1)):thickness)-railDistance(p))**2;
    if(leg&&p.x>d.plane-.15&&p.x<d.plane+1.5&&p.y>d.height-.12-thickness&&p.y<d.height+thickness)cost+=60*Math.max(0,Math.min(p.x-d.plane+.15,d.height+thickness-p.y))**2;
   }
   if(l.surface&&time>phases.at(-4).start){const qa=new T.Quaternion().setFromUnitVectors(rest.get(l.b).clone().sub(rest.get(l.a)).normalize(),mid.clone().sub(start).normalize()),qb=new T.Quaternion().setFromUnitVectors(rest.get(l.c).clone().sub(rest.get(l.b)).normalize(),target.clone().sub(mid).normalize());for(const vertex of l.surface){const p=V();for(const {bone,weight}of vertex.weights){const v=vertex.point.clone().sub(rest.get(bone));if(bone===l.a)v.applyQuaternion(qa).add(start);else if(bone===l.b)v.applyQuaternion(qb).add(mid);else bone.localToWorld(v);p.addScaledVector(v,weight);}cost+=200*Math.max(0,.008-railDistance(p))**2;}}
   return cost;
  }
  let angle=0;
  if(bakingFrame>=0){const costs=new Float64Array(angleCount);for(let j=0;j<angleCount;j++)costs[j]=score((j-30)*angleStep);(routeCosts[l.id]??=[])[bakingFrame]=costs;}
  else{const frame=T.MathUtils.clamp(time/duration*routeSteps,0,routeSteps),i=Math.floor(frame),path=routeAngles[l.id];angle=T.MathUtils.lerp(path[i],path[Math.min(i+1,routeSteps)],frame-i);}
  l.routeAngle=angle;return candidate(angle);
 }
 function apply(progress,{direction='up',heading=0,origin=[0,0,0]}={}){
  if(disposed)throw new Error('Ladder motion is disposed');checkFrame();
  if(worker.weapon?.id&&worker.weapon.id!=='rifle')throw new Error('Ladder study supports the worker rifle only');
  if(!Number.isFinite(progress)||!Number.isFinite(heading)||!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite)||!['up','down'].includes(direction))throw new Error('Invalid ladder playback transform');
  const value=T.MathUtils.clamp(progress,0,1),t=(direction==='down'?1-value:value)*duration,phase=phases.find(p=>t<=p.end)||phases.at(-1),u=ease((t-phase.start)/phase.duration),sample={};
  worker.pose('neutral');for(const {p,si,sw}of activeSkin){p.geometry.setAttribute('skinIndex',si);p.geometry.setAttribute('skinWeight',sw);}paintCorrection.set(true);root.rotation.set(0,0,0);root.position.set(0,0,0);
  const mounted=ease(t/1.1)*(1-ease((t-(duration-1))/1)),heavy=profile.id.startsWith('pig');named.hips.rotation.z=(heavy?-.12:.04)*mounted;named.spine.rotation.z=(heavy?-.13:.045)*mounted;named.head.rotation.z=-.10*mounted;named.head.rotation.y=(heavy?-.70:-.45)*mounted;
  if(profile.id==='skunk')named.hips.rotation.y=-.14*ease((t-phases.at(-4).start)/(duration-phases.at(-4).start));
  const swing=Math.sin(Math.PI*u);named.spine.rotation.x=(phase.id?.endsWith('-1')?-.035:.035)*swing*mounted;root.updateMatrixWorld(true);
  for(const [id,a]of Object.entries(phase.from)){
   const b=phase.to[id],point=a.point.clone().lerp(b.point,u),moving=id===phase.id;
   if(moving&&id.startsWith('foot')&&b.kind==='landing'){
    // Lift behind the lip first; crossing and lowering happen above the deck.
    const retract=ease(u/.20),lift=ease((u-.15)/.40),cross=ease((u-.55)/.35),clear=Math.max(a.point.y,b.point.y)+.06;
    point.x=T.MathUtils.lerp(a.point.x-.24*retract,b.point.x,cross);
    point.y=u<.55?T.MathUtils.lerp(a.point.y,clear,lift):T.MathUtils.lerp(clear,b.point.y,ease((u-.90)/.10));
    point.z+=(id.endsWith('-1')?-1:1)*.06*swing*(1-T.MathUtils.smoothstep(u,.35,.65));
   }else if(moving&&id.startsWith('hand')&&b.kind==='free'){
    const clear=d.railTop+.12,cross=ease((u-.35)/.40);
    point.x=T.MathUtils.lerp(a.point.x-.08*ease(u/.25),b.point.x,cross);
    point.y=u<.4?T.MathUtils.lerp(a.point.y,clear,ease(u/.4)):T.MathUtils.lerp(clear,b.point.y,ease((u-.60)/.40));
   }else if(moving){const travel=ease((u-.20)/.60),withdraw=ease(u/.20)*(1-ease((u-.80)/.20));point.copy(a.point).lerp(b.point,travel);point.x-=(id.startsWith('foot')?.25:.23)*withdraw;point.y+=.035*Math.sin(Math.PI*travel);}
   const kind=moving?(u===0?a.kind:u===1?b.kind:'swing'):a.kind;
   const wrist=(kind,y)=>{const q=new T.Quaternion().setFromAxisAngle(V(1,0,0),kind==='rail'?(id.endsWith('-1')?-1:1)*(Math.PI/2+(d.exitWidth&&y>d.height&&y<d.height+.35?Math.atan((d.exitWidth-d.width)/.7):0)):0);if(kind==='rail')q.premultiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),(id.endsWith('-1')?-1:1)*Math.PI*ease((t-phases.at(-4).start)/4)));return q;};
   sample[id]={gripSurfaces:[a,b].filter(c=>c.kind==='rung'||c.kind==='rail').map(c=>({kind:c.kind,index:c.index,point:c.point.toArray()})),point,kind,index:u<.5?a.index:b.index,planted:kind!=='free'&&(!moving||u===0||u===1),quaternion:wrist(a.kind,a.point.y).slerp(wrist(b.kind,b.point.y),moving?u:0),grasp:a.kind==='free'?moving?u:0:b.kind==='free'?1-u:1};
  }
  const feet=[sample['foot-1'].point,sample.foot1.point],landing=ease((t-phases.at(-4).start)/(duration-phases.at(-4).start));
  const desired=V(T.MathUtils.lerp(-.12,d.plane+.29,landing),(feet[0].y+feet[1].y)/2-.14*mounted+(heavy?.24*Math.sin(Math.PI*landing):0),(phase.id?.endsWith('-1')?.015:-.015)*swing*mounted);
  const constraints=limbs.map(l=>{const target=sample[l.id].point.clone().sub(l.offset.clone().applyQuaternion(sample[l.id].quaternion)),start=l.a.getWorldPosition(V());return {l,target,center:target.clone().sub(start),radius:(l.la+l.lb)*.992,minRadius:Math.abs(l.la-l.lb)+.015};});
  // Project the pelvis into the intersection of actual limb reach volumes.
  // Targets stay on the authored rung; neither bones nor contact points stretch.
  const position=desired.clone();for(let n=0;n<400;n++){let error=0;for(const c of constraints){const v=position.clone().sub(c.center),len=v.length();if(len>c.radius){position.copy(c.center).addScaledVector(v,c.radius/len);error=Math.max(error,len-c.radius);}else if(len<c.minRadius){position.copy(c.center).addScaledVector(len>1e-8?v.normalize():V(-1,0,0),c.minRadius);error=Math.max(error,c.minRadius-len);}}if(heavy){const clearance=mounted*(1-T.MathUtils.smoothstep(position.y,d.height-.65,d.height-.45)),limit=T.MathUtils.lerp(d.plane+1.2,-.14,clearance);if(position.x>limit){error=Math.max(error,position.x-limit);position.x=limit;}}if(error<1e-8)break;}
  root.position.copy(position);root.updateMatrixWorld(true);const checks=[];
  if(profile.id==='pig-foreman'){const y=named.head.getWorldPosition(V()).y,under=T.MathUtils.smoothstep(y,d.height-.70,d.height-.45)*(1-T.MathUtils.smoothstep(y,d.height-.12,d.height+.15));named.head.rotation.y-=.55*under;root.updateMatrixWorld(true);}
  for(const {l,target}of constraints){
   const start=l.a.getWorldPosition(V()),axis=target.clone().sub(start),distance=axis.length(),reach=l.la+l.lb;
   if(distance>reach+1e-5||distance<Math.abs(l.la-l.lb)+1e-7)throw new Error(profile.id+' ladder '+l.id+' outside reach at '+progress.toFixed(4)+' distance '+distance+' range '+Math.abs(l.la-l.lb)+'..'+reach+' phase '+phase.label+' root '+position.toArray()+' target '+target.toArray()+' start '+start.toArray());
   axis.normalize();const along=(l.la*l.la-l.lb*l.lb+distance*distance)/(2*distance),pole=l.pole.clone().addScaledVector(axis,-l.pole.dot(axis)).normalize(),circle=start.clone().addScaledVector(axis,along),radius=Math.sqrt(Math.max(0,l.la*l.la-along*along));
   // Turn a high knee outward before it enters the ladder/deck plane.
   // The joint stays on its exact two-bone circle, so this cannot stretch a leg.
   if(l.id.startsWith('foot')){
    const forward=V(1,0,0).addScaledVector(axis,-axis.x),projection=forward.length();
    if(projection>1e-6&&radius>1e-6){forward.divideScalar(projection);const foot=sample[l.id].point,release=Math.max(T.MathUtils.smoothstep(circle.y-radius,d.height+.02,d.height+.20),T.MathUtils.smoothstep(foot.y,d.height-.16,d.height)*T.MathUtils.smoothstep(foot.x,d.plane-.08,d.plane+.24)),limit=T.MathUtils.clamp((d.plane-.18+.98*release-circle.x)/(radius*projection),-1,1),dot=pole.dot(forward);if(dot>limit){const across=axis.clone().cross(forward);if(across.z*l.side<0)across.negate();pole.copy(forward).multiplyScalar(limit).addScaledVector(across,Math.sqrt(1-limit*limit));}}
   }
   const mid=routeJoint(l,start,target,circle,pole,radius,axis,t);
   worldRotation(l.a,new T.Quaternion().setFromUnitVectors(rest.get(l.b).clone().sub(rest.get(l.a)).normalize(),mid.clone().sub(start).normalize()));
   worldRotation(l.b,new T.Quaternion().setFromUnitVectors(rest.get(l.c).clone().sub(rest.get(l.b)).normalize(),target.clone().sub(mid).normalize()));worldRotation(l.c,sample[l.id].quaternion);if(l.finger)l.finger.rotation.z=1.7*sample[l.id].grasp;
   checks.push({id:l.id,routeAngle:l.routeAngle,...sample[l.id],error:l.c.localToWorld(l.offset.clone()).distanceTo(sample[l.id].point)});
  }
  // Stowed rifle follows the spine; the caller's equipment object is reused.
  const gun=worker.weapon;if(gun){const spine=named.spine,origin=root.worldToLocal(spine.localToWorld(V(back,-.23,stowZ))),axis=V(0,.9,profile.id==='skunk'?-.12:.42).normalize().applyQuaternion(spine.getWorldQuaternion(new T.Quaternion()));gun.root.visible=true;gun.root.quaternion.setFromUnitVectors(V(1,0,0),axis);gun.root.position.copy(origin).sub(gun.anchors.stock.position.clone().applyQuaternion(gun.root.quaternion));gun.mount&&(gun.mount.visible=false);gun.hose&&(gun.hose.visible=false);
   for(let i=0;i<slingPoints.length;i++){const tangent=slingPoints[Math.min(i+1,32)].clone().sub(slingPoints[Math.max(0,i-1)]),across=V(1,0,0).cross(tangent).normalize().multiplyScalar(.017);for(const side of [-1,1]){const v=root.worldToLocal(spine.localToWorld(slingPoints[i].clone().addScaledVector(across,side)));slingGeometry.attributes.position.setXYZ(i*2+(side===1?1:0),v.x,v.y,v.z);}}slingGeometry.attributes.position.needsUpdate=true;slingGeometry.computeVertexNormals();slingGeometry.computeBoundingSphere();sling.visible=true;
  }
  for(const {limb,asset}of grips)asset.update(sample[limb.id].point.clone().sub(root.position),sample[limb.id].quaternion);
  root.rotation.y=-heading*Math.PI/180;root.position.copy(position).applyQuaternion(root.quaternion).add(new T.Vector3(...origin));root.updateMatrixWorld(true);worker.skeleton.update();
  result={progress:value,direction,time:t,duration,phase:direction==='up'?phase.label:({'Step onto landing':'Back onto top rung','Bring left foot through':'Step back from landing','Release left hand':'Grip left handhold','Release right hand':'Grip right handhold'}[phase.label]||phase.label.replace('Reach','Lower').replace('Step','Lower foot').replace('Mount','Dismount')),root:position.toArray(),worldRoot:root.position.toArray(),contacts:checks.map(c=>({...c,point:c.point.toArray(),worldPoint:c.point.clone().applyQuaternion(root.quaternion).add(new T.Vector3(...origin)).toArray()})),supported:true};return result;
 }
 function restore(mode='carry'){root.position.set(0,0,0);root.rotation.set(0,0,0);for(const {asset}of grips)asset.restore();for(const {p,si,sw}of saved){p.geometry.setAttribute('skinIndex',si);p.geometry.setAttribute('skinWeight',sw);}worker.pose(mode);paintCorrection.set(false);root.position.copy(entry.position);root.quaternion.copy(entry.quaternion);sling.visible=false;result=null;root.updateMatrixWorld(true);worker.skeleton.update();}
 // Solve the bend routes across the whole clip once. Adjacent samples may
 // move at most five degrees: a locally cheaper elbow solution cannot snap
 // across the rail when a contact is released. Playback still solves exact
 // contacts and rigid bone lengths at the requested time, including scrubbing.
 const routeKey=JSON.stringify([profile.id,d,bones.map(b=>rest.get(b).toArray()),limbs.map(l=>[l.offset.toArray(),l.stance])]),cached=compiledRoutes.get(routeKey);
 try{
 if(cached){Object.assign(routeAngles,cached.angles);Object.assign(routeFrames,cached.frames);}else{
 for(let frame=0;frame<=routeSteps;frame++){bakingFrame=frame;apply(frame/routeSteps);}
 bakingFrame=-1;
 for(const l of limbs){
  const rows=routeCosts[l.id],backtrack=[];let previous=rows[0].slice();
  for(let i=1;i<=routeSteps;i++){const next=new Float64Array(angleCount),back=new Uint8Array(angleCount);
   for(let j=0;j<angleCount;j++){let best=Infinity;for(let k=Math.max(0,j-1);k<=Math.min(angleCount-1,j+1);k++){const cost=previous[k]+(j-k)**2*.00001;if(cost<best){best=cost;back[j]=k;}}next[j]=best+rows[i][j];}previous=next;backtrack.push(back);
  }
  let j=previous.indexOf(Math.min(...previous));const path=new Float64Array(routeSteps+1);for(let i=routeSteps;i>=0;i--){path[i]=(j-30)*angleStep;if(i)j=backtrack[i-1][j];}routeAngles[l.id]=path;delete routeCosts[l.id];
 }
 compiledRoutes.set(routeKey,{angles:routeAngles,frames:routeFrames});if(compiledRoutes.size>32)compiledRoutes.delete(compiledRoutes.keys().next().value);
 }
 restore('neutral');
 }catch(error){restore('neutral');sling.removeFromParent();slingGeometry.dispose();slingMaterial.dispose();paintCorrection.dispose();for(const {asset}of grips)asset.dispose();for(const {p,si,sw}of saved){p.geometry.setAttribute('skinIndex',si);p.geometry.setAttribute('skinWeight',sw);}throw error;}
 return {grips:grips.map(g=>g.asset),duration,definition:d,phases:phases.map(({label,start,end,id})=>({label,start,end,id})),apply,diagnostics:()=>result,restore,dispose(){if(disposed)return;restore('neutral');disposed=true;sling.removeFromParent();slingGeometry.dispose();slingMaterial.dispose();for(const {asset}of grips)asset.dispose();for(const {p,si,sw}of saved){p.geometry.setAttribute('skinIndex',si);p.geometry.setAttribute('skinWeight',sw);}}};
}
