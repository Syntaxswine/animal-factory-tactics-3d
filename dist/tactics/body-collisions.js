// Diagnostic capsule envelopes, not a collision response or anatomical solver.
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const clamp=v=>Math.max(0,Math.min(1,v));
export function segmentDistance(p,q,r,s){
 const u=sub(q,p),v=sub(s,r),w=sub(p,r),a=dot(u,u),b=dot(u,v),c=dot(v,v),d=dot(u,w),e=dot(v,w);
 let t=0,z=0;
 if(a<1e-16)z=c<1e-16?0:clamp(e/c);
 else if(c<1e-16)t=clamp(-d/a);
 else {const den=a*c-b*b;t=den>1e-16?clamp((b*e-c*d)/den):0;z=(b*t+e)/c;if(z<0){z=0;t=clamp(-d/a);}else if(z>1){z=1;t=clamp((b-d)/a);}}
 const pa=p.map((x,i)=>x+t*u[i]),pb=r.map((x,i)=>x+z*v[i]);
 return {distance:Math.hypot(...sub(pa,pb)),a:pa,b:pb};
}
// Exact minimum of the piecewise quadratic distance from a segment to an AABB.
export function segmentBoxDistance(a,b,lo,hi){
 const d=sub(b,a),cuts=[0,1];
 for(let k=0;k<3;k++)if(Math.abs(d[k])>1e-15)for(const edge of [lo[k],hi[k]]){const t=(edge-a[k])/d[k];if(t>0&&t<1)cuts.push(t);}
 cuts.sort((x,y)=>x-y);
 const distance2=t=>a.reduce((sum,x,k)=>{const v=x+d[k]*t,g=v<lo[k]?v-lo[k]:v>hi[k]?v-hi[k]:0;return sum+g*g;},0);
 let best=Infinity;
 for(let j=0;j<cuts.length-1;j++){const l=cuts[j],h=cuts[j+1],m=(l+h)/2;let aa=0,bb=0;
  for(let k=0;k<3;k++){const p=a[k]+d[k]*m,edge=p<lo[k]?lo[k]:p>hi[k]?hi[k]:null;if(edge!==null){aa+=d[k]*d[k];bb+=d[k]*(a[k]-edge);}}
  const t=aa?Math.max(l,Math.min(h,-bb/aa)):l;best=Math.min(best,distance2(l),distance2(h),distance2(t));
 }
 return Math.sqrt(best);
}
// Exactly the solid boxes drawn by the window study (glass intentionally omitted).
export const WINDOW_SOLIDS=[
 {name:'lower wall',lo:[-.08,0,-.5],hi:[.08,.85,.5]},
 {name:'upper wall',lo:[-.08,1.55,-.5],hi:[.08,2,.5]},
 ...[-1,1].map(s=>({name:s<0?'left pier':'right pier',lo:[-.08,0,s<0?-1.1:.5],hi:[.08,2,s<0?-.5:1.1]})),
 {name:'sill',lo:[-.09,.85,-.5],hi:[.09,.875,.5]},
 {name:'lintel',lo:[-.09,1.525,-.5],hi:[.09,1.55,.5]},
 ...[-1,1].map(s=>({name:s<0?'left frame':'right frame',lo:[-.09,.85,s<0?-.5:.475],hi:[.09,1.55,s<0?-.475:.5]})),
];
export function segmentCategory(name){
 if(name==='pelvis / lower back')return 'lowerTorso';if(name==='chest / upper back')return 'chest';
 if(name.includes('bridge'))return null;
 for(const [prefix,key]of [['upper arm','upperArm'],['forearm','forearm'],['hand','hand'],['thigh','thigh'],['shin','shin'],['foot','foot'],['neck','neck'],['head','head']])if(name.startsWith(prefix))return key;
 throw Error('Unmapped body segment: '+name);
}
export function envelopeSegments(state,profile=null){
 if(profile&&!profile.supported)throw Error('Unsupported body envelope');
 return state.segments.map(s=>{const key=segmentCategory(s.name),radius=profile&&key?profile.radii[key]:s.radius;if(!Number.isFinite(radius)||radius<=0)throw Error('Invalid envelope radius: '+s.name);return {...s,radius,diameter:radius*2,category:key};});
}
export function collisionReport(state,profile=null,{tolerance=.001,near=.02,solids=WINDOW_SOLIDS}={}){
 const segments=envelopeSegments(state,profile),hits=[],bridges=segments.filter(s=>s.name.includes('bridge'));
 const add=(a,b,kind,gap)=>{if(gap<near)hits.push({a,b,kind,gap,penetration:Math.max(0,-gap),severity:gap < -tolerance?'overlap':'near'});};
 const adjacent=(a,b)=>[a.a,a.b].some(p=>[b.a,b.b].includes(p))||bridges.some(s=>[a.a,a.b].includes(s.a)&&[b.a,b.b].includes(s.b)||[a.a,a.b].includes(s.b)&&[b.a,b.b].includes(s.a));
 for(let i=0;i<segments.length;i++){
  const a=segments[i],pa=state.points[a.a],pb=state.points[a.b];
  // Bridges represent joint spacing, not independently measured anatomy.
  if(a.category===null)continue;
  for(let j=i+1;j<segments.length;j++){const b=segments[j];if(b.category===null||adjacent(a,b))continue;
   add(a.name,b.name,'self',segmentDistance(pa,pb,state.points[b.a],state.points[b.b]).distance-a.radius-b.radius);
  }
  for(const box of solids)add(a.name,box.name,'window',segmentBoxDistance(pa,pb,box.lo,box.hi)-a.radius);
  add(a.name,'ground','ground',Math.min(pa[1],pb[1])-a.radius);
 }
 hits.sort((a,b)=>a.gap-b.gap||a.a.localeCompare(b.a)||a.b.localeCompare(b.b));
 return {segments,hits,overlaps:hits.filter(h=>h.severity==='overlap'),near:hits.filter(h=>h.severity==='near'),tolerance,nearDistance:near,
  limitations:'Capsule overlap is a conservative warning, not mesh penetration. Shared joints, bridge segments and joints linked by one bridge are excluded from self checks. Joint limits, forces, clothing deformation, tails and equipment are not tested.'};
}
