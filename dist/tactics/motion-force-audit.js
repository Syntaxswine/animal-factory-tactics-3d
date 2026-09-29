// Diagnostic inverse dynamics for authored capsule rigs. Adapted from the
// independent weighted-window audit supplied with the motion review.
// This estimates missing external force/torque; it does not solve or approve
// motion. Segment mass is a uniform rod, not a species/equipment mass fit.
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,k)=>a.map(v=>v*k);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=a=>Math.sqrt(dot(a,a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const midpoint=(state,s)=>scale(add(state.points[s.a],state.points[s.b]),.5);

function solveLeastSquares(cols,b){
 const n=cols.length,A=cols.map((a,i)=>cols.map((c,j)=>dot(a,c)+(i===j?1e-10:0))),y=cols.map(c=>dot(c,b));
 for(let i=0;i<n;i++){
  let pivot=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[pivot][i]))pivot=r;
  [A[i],A[pivot]]=[A[pivot],A[i]];[y[i],y[pivot]]=[y[pivot],y[i]];
  for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let k=i;k<n;k++)A[r][k]-=f*A[i][k];y[r]-=f*y[i];}
 }
 const z=Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=y[i];for(let j=i+1;j<n;j++)s-=A[i][j]*z[j];z[i]=s/A[i][i];}return z;
}

// Lawson-Hanson active set; the tiny diagonal regularizer handles duplicate
// friction rays. A failure to converge is exposed, never treated as a pass.
function nnls(cols,b){
 const x=Array(cols.length).fill(0),active=new Set();
 const residual=()=>cols.reduce((r,c,i)=>x[i]?sub(r,scale(c,x[i])):r,[...b]);
 let iterations=0,converged=false;
 for(;iterations<200;iterations++){
  const r=residual();let best=-1,value=1e-7;
  for(let j=0;j<cols.length;j++)if(!active.has(j)){const w=dot(cols[j],r);if(w>value){best=j;value=w;}}
  if(best<0){converged=true;break;}active.add(best);
  for(let inner=0;inner<100;inner++){
   const ids=[...active],z=solveLeastSquares(ids.map(j=>cols[j]),b);
   if(z.every(v=>v>1e-10)){ids.forEach((j,k)=>x[j]=z[k]);break;}
   let alpha=1;ids.forEach((j,k)=>{if(z[k]<=1e-10&&x[j]-z[k]>0)alpha=Math.min(alpha,x[j]/(x[j]-z[k]));});
   ids.forEach((j,k)=>{x[j]+=alpha*(z[k]-x[j]);if(x[j]<=1e-10){x[j]=0;active.delete(j);}});
  }
 }
 return {residual:residual(),converged,iterations};
}

function distanceToSegment(p,a,b){const d=sub(b,a),length2=dot(d,d),u=length2?Math.max(0,Math.min(1,dot(sub(p,a),d)/length2)):0;return norm(sub(p,add(a,scale(d,u))));}
const defaultSurfaces={
 ground:{height:0,friction:.9,patchRadius:.03},
 sill:{height:.875,friction:1.2,patchRadius:.04,minX:-.09,maxX:.09,minZ:-.5,maxZ:.5},
};

/** Only explicitly declared contacts that touch a named body capsule and the
 * configured horizontal surface can supply support. Generous friction and a
 * small finite patch make a nonzero residual a useful warning. A zero result
 * cannot establish muscle capacity, grip, joint safety, or collision safety. */
export function motionContactWrenches(state,{surfaces=defaultSurfaces,contactTolerance=.01,lever=.5,slipTolerance=.02,materialVelocity=null}={}){
 const columns=[],accepted=[],rejected=[],slipping=[],seen=new Set();
 for(const declared of state.contacts??[]){
  // Legacy ground samplers already declare their contact point/segment, but
  // omit the surface label. Default only those points actually at ground Y=0;
  // never synthesize a contact from body proximity or assume an elevated seat.
  const defaultGround=declared.surface==null&&finite3(declared.point)&&Math.abs(declared.point[1])<=contactTolerance;
  const contact=defaultGround?{...declared,surface:'ground',surfaceDefaulted:true}:declared;
  const p=contact.point,surface=surfaces[contact.surface];let reason=null;
  if(!surface)reason='Unknown contact surface';
  else if(!finite3(p))reason='Invalid contact point';
  else if(Math.abs(p[1]-surface.height)>contactTolerance)reason='Contact is off its surface';
  else if(p[0]<(surface.minX??-Infinity)-contactTolerance||p[0]>(surface.maxX??Infinity)+contactTolerance||p[2]<(surface.minZ??-Infinity)-contactTolerance||p[2]>(surface.maxZ??Infinity)+contactTolerance)reason='Contact is outside its surface';
  const candidates=state.segments.filter(s=>contact.segment?s.name===contact.segment:(s.a===contact.id||s.b===contact.id));
  if(!reason&&!candidates.length)reason='No matching body segment';
  let gap=Infinity,segment=null;
  if(!reason){
   for(const s of candidates){const g=distanceToSegment(p,state.points[s.a],state.points[s.b])-s.radius;if(Math.abs(g)<Math.abs(gap)){gap=g;segment=s;}}
   if(Math.abs(gap)>contactTolerance)reason=gap>0?'Body does not reach contact':'Contact is buried inside body';
  }
  if(reason){rejected.push({...contact,reason,gap:Number.isFinite(gap)?gap:null});continue;}
  const key=contact.surface+':'+p.map(v=>v.toFixed(5)).join(',');if(seen.has(key))continue;seen.add(key);
  const velocity=materialVelocity?materialVelocity(segment,p):null,tangentVelocity=velocity?[velocity[0],0,velocity[2]]:null,slipSpeed=tangentVelocity?norm(tangentVelocity):null;
  const isSlipping=slipSpeed!==null&&slipSpeed>slipTolerance,undeclaredSlip=isSlipping&&contact.sliding!==true;
  const record={...contact,gap,materialVelocity:velocity,tangentVelocity,slipSpeed,isSlipping,undeclaredSlip};
  accepted.push(record);if(isSlipping)slipping.push(record);
  const radius=surface.patchRadius??.03,mu=surface.friction??.9;
  for(const [dx,dz]of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
   // Clip the generous patch to the actual configured surface boundary.
   const q=[Math.max(surface.minX??-Infinity,Math.min(surface.maxX??Infinity,p[0]+dx)),surface.height,Math.max(surface.minZ??-Infinity,Math.min(surface.maxZ??Infinity,p[2]+dz))];
   const patchVelocity=materialVelocity?materialVelocity(segment,q):null,patchSlip=patchVelocity?Math.hypot(patchVelocity[0],patchVelocity[2]):0;
   const ray=force=>columns.push([...force,...scale(cross(sub(q,state.center),force),1/lever)]);
   if(patchSlip>slipTolerance){
    // Moving contact cannot be propelled by friction. Since mu is a generous
    // bound, allow 0..mu*N resistance, strictly opposite the tangent velocity.
    // This is an admissibility check, not a calibrated kinetic-friction law.
    ray([0,1,0]);ray([-mu*patchVelocity[0]/patchSlip,1,-mu*patchVelocity[2]/patchSlip]);
   }else for(let i=0;i<8;i++){const angle=i*Math.PI/4;ray([mu*Math.cos(angle),1,mu*Math.sin(angle)]);}
  }
 }
 return {columns,accepted,rejected,slipping};
}

/** Create a pure audit. The sampler must have fixed segment identity/mass and
 * support arbitrary times in [0,duration]. Options.events adds event-adjacent
 * samples so narrow impulses do not vanish between display samples. */
export function createMotionForceAudit(sampler,options={}){
 // Force threshold is a body-weight ratio; torque thresholds are N·m. Flight
 // is explicitly declared, never inferred merely from a missing contact.
 const {duration,step=.04,derivativeStep=.002,gravity=9.81,lever=.5,forceThreshold=.10,torqueThreshold=40,flightTorqueThreshold=10,slipTolerance=.02,events=[]}=options;
 if(typeof sampler!=='function'||!Number.isFinite(duration)||duration<=0||!Number.isFinite(step)||step<=0||!Number.isFinite(derivativeStep)||derivativeStep<=0||derivativeStep*8>duration||!Number.isFinite(gravity)||gravity<=0||!Number.isFinite(lever)||lever<=0||![forceThreshold,torqueThreshold,flightTorqueThreshold,slipTolerance].every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid motion audit options');
 const cache=new Map(),cacheLimit=4096,clamp=t=>Math.max(0,Math.min(duration,t));
 function sample(t){
  t=clamp(t);const key=t.toFixed(9);if(cache.has(key))return cache.get(key);
  const input=sampler(t);let mass=0,center=[0,0,0];
  for(const s of input.segments){if(!Number.isFinite(s.mass)||s.mass<0||!Number.isFinite(s.radius)||s.radius<0||!finite3(input.points[s.a])||!finite3(input.points[s.b]))throw Error('Invalid segment in force audit');mass+=s.mass;center=add(center,scale(midpoint(input,s),s.mass));}
  if(!(mass>0))throw Error('Motion audit needs positive segment mass');
  const state={...input,totalMass:mass,center:scale(center,1/mass)};
  // Exact-time playback and repeated scrubbing can generate indefinitely many
  // timestamps. FIFO preserves reusable nearby derivative samples, bounded.
  if(cache.size>=cacheLimit)cache.delete(cache.keys().next().value);
  cache.set(key,state);return state;
 }
 function derivative(fn,t,order=1){
  const h=derivativeStep;
  let offsets,weights;
  if(t<2*h){offsets=[0,1,2,3,4];weights=order===1?[-25,48,-36,16,-3]:[35,-104,114,-56,11];}
  else if(t>duration-2*h){offsets=[0,-1,-2,-3,-4];weights=order===1?[25,-48,36,-16,3]:[35,-104,114,-56,11];}
  else{offsets=[-2,-1,0,1,2];weights=order===1?[1,-8,0,8,-1]:[-1,16,-30,16,-1];}
  let result=[0,0,0];for(let i=0;i<offsets.length;i++)if(weights[i])result=add(result,scale(fn(t+offsets[i]*h),weights[i]));
  return scale(result,1/(order===1?12*h:12*h*h));
 }
 const center=t=>sample(t).center;
 function momentum(t){
  const state=sample(t),velocity=derivative(center,t);let result=[0,0,0];
  for(const s of state.segments){
   const mid=midpoint(state,s),vm=derivative(q=>midpoint(sample(q),s),t),delta=sub(state.points[s.b],state.points[s.a]),length=norm(delta);
   const orbital=cross(sub(mid,state.center),scale(sub(vm,velocity),s.mass));
   const direction=q=>{const d=sub(sample(q).points[s.b],sample(q).points[s.a]),l=norm(d);return l?scale(d,1/l):[0,0,0];};
   const spin=length?scale(cross(scale(delta,1/length),derivative(direction,t)),s.mass*length*length/12):[0,0,0];
   result=add(result,add(orbital,spin));
  }return result;
 }
 function at(time){
  if(!Number.isFinite(time))throw Error('Audit time must be finite');const t=clamp(time),state=sample(t),velocity=derivative(center,t),acceleration=derivative(center,t,2);
  const bodyVelocities=new Map();
  const materialVelocity=(segment,point)=>{
   if(!bodyVelocities.has(segment.name)){
    const mid=midpoint(state,segment),linear=derivative(q=>midpoint(sample(q),segment),t);
    const direction=q=>{const d=sub(sample(q).points[segment.b],sample(q).points[segment.a]),l=norm(d);return l?scale(d,1/l):[0,0,0];};
    // Endpoint trajectories determine transverse angular velocity, but not
    // spin about the bone axis. Unobservable axial spin is assumed zero.
    const omega=cross(direction(t),derivative(direction,t));bodyVelocities.set(segment.name,{mid,linear,omega});
   }
   const {mid,linear,omega}=bodyVelocities.get(segment.name);return add(linear,cross(omega,sub(point,mid)));
  };
  const requiredForce=scale(add(acceleration,[0,gravity,0]),state.totalMass),requiredTorque=derivative(momentum,t),contacts=motionContactWrenches(state,{...options,lever,slipTolerance,materialVelocity});
  const required=[...requiredForce,...scale(requiredTorque,1/lever)],fit=contacts.columns.length?nnls(contacts.columns,required):{residual:required,converged:true,iterations:0};
  const residualForce=fit.residual.slice(0,3),residualTorque=scale(fit.residual.slice(3),lever),bodyWeight=state.totalMass*gravity;
  const forceMagnitude=norm(residualForce),torqueMagnitude=norm(residualTorque),forceRatio=forceMagnitude/bodyWeight,torqueRatio=torqueMagnitude/(bodyWeight*lever);
  const declaredFlight=state.mode==='ballistic flight',torqueLimit=declaredFlight?flightTorqueThreshold:torqueThreshold,invalidContacts=contacts.rejected.length>0,undeclaredSlip=contacts.slipping.some(c=>c.undeclaredSlip);
  return {time:t,phase:state.phase,mode:state.mode,center:state.center,velocity,acceleration,totalMass:state.totalMass,bodyWeight,requiredForce,requiredTorque,residualForce,residualTorque,forceMagnitude,torqueMagnitude,forceRatio,torqueRatio,thresholds:{forceRatio:forceThreshold,torqueNm:torqueLimit,slipSpeed:slipTolerance,declaredFlight},acceptedContacts:contacts.accepted,rejectedContacts:contacts.rejected,slippingContacts:contacts.slipping,undeclaredSlip,solverConverged:fit.converged,solverIterations:fit.iterations,warning:forceRatio>forceThreshold||torqueMagnitude>torqueLimit||!fit.converged||invalidContacts||undeclaredSlip,invalidContacts};
 }
 function precompute(){
  const times=new Set([0,duration]);for(let t=step;t<duration;t+=step)times.add(Number(t.toFixed(9)));
  for(const event of events)if(Number.isFinite(event))for(const offset of [-derivativeStep*2,-derivativeStep,0,derivativeStep,derivativeStep*2])times.add(clamp(event+offset));
  const samples=[...times].sort((a,b)=>a-b).map(at);
  const peakForce=samples.reduce((a,b)=>b.forceRatio>a.forceRatio?b:a),peakTorque=samples.reduce((a,b)=>b.torqueRatio>a.torqueRatio?b:a);
  let warningDuration=0;for(let i=1;i<samples.length;i++)warningDuration+=(samples[i].time-samples[i-1].time)*(Number(samples[i].warning)+Number(samples[i-1].warning))/2;
  return {samples,peakForce,peakTorque,warningFraction:warningDuration/duration,invalidContactSamples:samples.filter(s=>s.invalidContacts).length,undeclaredSlipSamples:samples.filter(s=>s.undeclaredSlip).length,slidingSamples:samples.filter(s=>s.slippingContacts.length).length,unconvergedSamples:samples.filter(s=>!s.solverConverged).length,step,derivativeStep};
 }
 return {at,precompute,cacheDiagnostics:()=>({size:cache.size,limit:cacheLimit}),metadata:{gravity,lever,forceThreshold,torqueThreshold,flightTorqueThreshold,slipTolerance,thresholdUnits:{forceThreshold:'body-weight ratio',torqueThreshold:'N·m',flightTorqueThreshold:'N·m',slipTolerance:'m/s'},derivativeStep,step,cacheLimit,model:'Uniform rod segment masses; declared and geometrically checked horizontal contacts; generous friction patches',slipModel:'Material velocity from segment midpoint motion and transverse angular velocity; axial spin is unobservable and assumed zero. Moving contacts permit only opposing friction in 0..mu*N. Undeclared slip warns; contact.sliding=true declares expected slip, not physical approval. Not a calibrated kinetic-friction model.',legacyContacts:'Declared contacts lacking a surface label default to ground only at Y=0 within contact tolerance; capsule validation still applies.',limitations:'Diagnostic only. Does not solve motion, prove muscle strength or grip, check joint limits/collisions, or fit species/equipment mass. Contact changes and abrupt impacts create finite-difference peaks; inspect them, do not average them away. Impacts are not exempt from warnings.'}};
}
