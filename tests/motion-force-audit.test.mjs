import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionForceAudit,motionContactWrenches} from '../dist/tactics/motion-force-audit.js';
import {sampleWeightedWindow,WINDOW_DURATION} from '../dist/tactics/weighted-window.js';
import {sampleWeightedRoll,ROLL_DURATION} from '../dist/tactics/weighted-roll.js';
const length=v=>Math.hypot(...v),G=9.81;
function rod({height=.1,contacts=true,angle=0,x=0,z=0,mass=10}={}){
 const dx=.2*Math.cos(angle),dy=.2*Math.sin(angle);
 return {phase:'control',points:{a:[x-dx,height-dy,z],b:[x+dx,height+dy,z]},segments:[{name:'body',a:'a',b:'b',radius:.1,mass}],center:[x,height,z],totalMass:mass,contacts:contacts?[{surface:'ground',segment:'body',id:'a',point:[x,0,z]}]:[]};
}
const audit=(sampler,options={})=>createMotionForceAudit(sampler,{duration:1,...options});

test('resting body can be supported; same airborne body needs its entire weight',()=>{
 const grounded=audit(()=>rod()),floating=audit(()=>rod({height:.4,contacts:false}));
 for(const t of [0,.2,.8,1]){
  const a=grounded.at(t),b=floating.at(t);
  assert(a.solverConverged);assert(length(a.residualForce)<1e-5);assert(length(a.residualTorque)<1e-5);assert(!a.warning);
  assert(Math.abs(b.forceRatio-1)<1e-8);assert(b.warning);assert.equal(b.acceptedContacts.length,0);
 }
});

test('ballistic translation and constant symmetric spin need no phantom wrench including endpoints',()=>{
 const instrument=audit(t=>rod({height:3+2*t-.5*G*t*t,x:.7*t,angle:3*t,contacts:false}));
 for(const t of [0,.1,.25,.5,.75,1]){const a=instrument.at(t);assert(length(a.requiredForce)<1e-5);assert(length(a.requiredTorque)<.002,JSON.stringify(a));assert(!a.warning);}
});

test('accelerating free-body spin is flagged despite correct ballistic COM',()=>{
 const instrument=audit(t=>rod({height:3+2*t-.5*G*t*t,angle:20*t*t,contacts:false}));
 const a=instrument.at(.25);assert(length(a.requiredForce)<1e-5);assert(a.requiredTorque[2]>5);assert(a.torqueRatio>.1);
 assert(audit(t=>rod({height:3+2*t-.5*G*t*t,angle:20*t*t,contacts:false}),{torqueThreshold:.05}).at(.25).warning);
});

test('constant asymmetric spin includes analytic transverse angular-momentum change',()=>{
 const mass=10,a=[-.2,-.12,-.1],b=a.map(v=>-v),omega=3;
 const instrument=audit(t=>{
  const rotate=p=>[p[0]*Math.cos(omega*t)-p[1]*Math.sin(omega*t),3+2*t-.5*G*t*t+p[0]*Math.sin(omega*t)+p[1]*Math.cos(omega*t),p[2]];
  return {points:{a:rotate(a),b:rotate(b)},segments:[{name:'body',a:'a',b:'b',radius:.03,mass}],contacts:[]};
 });
 const result=instrument.at(0),Ixz=-mass*a[0]*a[2]/3,Iyz=-mass*a[1]*a[2]/3;
 assert(Math.abs(result.requiredTorque[0]-(-omega*omega*Iyz))<.001);
 assert(Math.abs(result.requiredTorque[1]-omega*omega*Ixz)<.001);
});

test('declared floating, buried, off-surface and out-of-bounds contacts cannot provide support',()=>{
 for(const [state,reason]of [
  [rod({height:.4}),'Body does not reach contact'],
  [rod({height:.01}),'Contact is buried inside body'],
  [{...rod(),contacts:[{surface:'ground',segment:'body',point:[0,.2,0]}]},'Contact is off its surface'],
  [{...rod({height:.975}),contacts:[{surface:'sill',segment:'body',point:[.2,.875,0]}]},'Contact is outside its surface'],
  [{...rod(),contacts:[{surface:'ground',segment:'imagined seat',point:[0,0,0]}]},'No matching body segment'],
 ]){const report=audit(()=>state).at(.5);assert.equal(report.acceptedContacts.length,0);assert.equal(report.rejectedContacts[0].reason,reason);assert(Math.abs(report.forceRatio-1)<1e-8);}
});

test('real sill seat supports body with bounded patches; missing declaration never implies support',()=>{
 const state=rod({height:.975});state.contacts=[{surface:'sill',segment:'body',point:[0,.875,0]}];
 const supported=audit(()=>state).at(.5);assert(!supported.warning);assert(supported.forceRatio<1e-7);
 const missing=audit(()=>({...state,contacts:[]})).at(.5);assert(missing.warning);assert(Math.abs(missing.forceRatio-1)<1e-8);
 const contact=motionContactWrenches(state);assert.equal(contact.columns.length,40);assert.equal(contact.accepted.length,1);
});

test('friction limit rejects unsupported horizontal acceleration',()=>{
 const instrument=audit(t=>rod({x:10*t*t}));
 const report=instrument.at(.5);assert(report.forceRatio>.4);assert(report.warning);assert(report.solverConverged);
});

test('audit uses actual segment masses and COM without mutating sampler data',()=>{
 const state=rod({height:.4,contacts:false,mass:23});state.totalMass=999;state.center=[20,20,20];
 const before=JSON.stringify(state),report=audit(()=>state).at(.5);
 assert.equal(report.totalMass,23);assert.equal(report.bodyWeight,23*G);assert.deepEqual(report.center,[0,.4,0]);assert.equal(JSON.stringify(state),before);
});

test('precomputation preserves event peaks and exposes unconverged/invalid-contact totals',()=>{
 const instrument=audit(t=>rod({height:.4+Math.max(0,t-.505)*Math.max(0,t-.505)*4,contacts:false}),{step:.05,events:[.505]});
 const summary=instrument.precompute();
 assert(summary.samples.some(s=>Math.abs(s.time-.505)<1e-10));assert(summary.samples.some(s=>Math.abs(s.time-.503)<1e-10));
 assert(summary.peakForce.forceRatio>1.7);assert(summary.warningFraction>.99);assert.equal(summary.unconvergedSamples,0);
 assert.equal(summary.samples[0].time,0);assert.equal(summary.samples.at(-1).time,1);
});

test('malformed times, zero mass and invalid options fail explicitly',()=>{
 assert.throws(()=>audit(()=>rod()).at(NaN));assert.throws(()=>audit(()=>rod(),{duration:0}));
 assert.throws(()=>audit(()=>rod(),{derivativeStep:.5}));assert.throws(()=>audit(()=>rod({mass:0})).at(.5));
});

test('exact-time playback cache stays bounded and eviction preserves deterministic results',()=>{
 const instrument=audit(t=>rod({height:.4+t*t,contacts:false})),before=instrument.at(.1234567);
 for(let i=0;i<650;i++)instrument.at((i+.12345)/701);
 assert.deepEqual(instrument.cacheDiagnostics(),{size:4096,limit:4096});
 const after=instrument.at(.1234567);assert.deepEqual(after,before);assert.equal(instrument.cacheDiagnostics().size,4096);
});

test('a rejected extra contact alerts even when valid contacts supply the full wrench',()=>{
 const state=rod();state.contacts.push({surface:'ground',segment:'imaginary support',point:[0,0,0]});
 const result=audit(()=>state).at(.5);
 assert(result.forceRatio<1e-7);assert(result.torqueMagnitude<1e-5);assert(result.invalidContacts);assert(result.warning);
});

test('review thresholds use 10 percent body weight, 40 Nm normally, and 10 Nm in declared flight',()=>{
 const spin=(t,mode)=>({...rod({height:3+2*t-.5*G*t*t,angle:45*t*t,contacts:false}),mode});
 const normal=audit(t=>spin(t,'authored motion')),flight=audit(t=>spin(t,'ballistic flight'));
 const a=normal.at(.2),b=flight.at(.2);
 assert(a.torqueMagnitude>11.9&&a.torqueMagnitude<12.1);assert(!a.warning);assert(b.warning);
 assert.equal(a.thresholds.torqueNm,40);assert.equal(b.thresholds.torqueNm,10);
 assert.equal(normal.metadata.forceThreshold,.10);assert.equal(normal.metadata.thresholdUnits.torqueThreshold,'N·m');
 const acceleration=audit(t=>rod({height:3+2*t-.5*.88*G*t*t,contacts:false})).at(.2);
 assert(Math.abs(acceleration.forceRatio-.12)<1e-6);assert(acceleration.warning);
 const impact=audit(t=>({...rod({height:3+2*t-.5*G*t*t,angle:200*t*t,contacts:false}),mode:'impact / roll'})).at(.2);
 assert(impact.torqueMagnitude>40);assert(impact.warning,'impact peaks must remain visible');
});

test('legacy declared ground contacts work without inventing support for elevated unlabeled contacts',()=>{
 for(const [sampler,duration]of [[sampleWeightedWindow,WINDOW_DURATION],[sampleWeightedRoll,ROLL_DURATION]]){
  const instrument=createMotionForceAudit(sampler,{duration}),final=instrument.at(duration);
  assert(final.acceptedContacts.length>0);assert(final.acceptedContacts.every(c=>c.surface==='ground'));
  assert(final.acceptedContacts.some(c=>c.surfaceDefaulted));assert(final.forceRatio<1e-7);assert(!final.warning);
 }
 const state=rod({height:.975});state.contacts=[{segment:'body',point:[0,.875,0]}];
 const elevated=audit(()=>state).at(.5);assert.equal(elevated.acceptedContacts.length,0);assert.equal(elevated.rejectedContacts[0].reason,'Unknown contact surface');
 const floating=rod({height:.4});delete floating.contacts[0].surface;
 assert.equal(audit(()=>floating).at(.5).rejectedContacts[0].reason,'Body does not reach contact');
});

test('sliding contact cannot obtain propulsive friction even when slip is declared',()=>{
 for(const declared of [false,true]){
  const instrument=audit(t=>{const state=rod({x:t+.5*t*t});state.contacts[0].sliding=declared;return state;}),report=instrument.at(.5);
  assert(Math.abs(report.slippingContacts[0].slipSpeed-1.5)<1e-7);
  assert(report.residualForce[0]>9.99,'ground cannot provide the requested +10 N along +X slip');
  assert(report.requiredForce[0]-report.residualForce[0]<=1e-6,'admissible friction must not propel sliding');
  assert(report.warning);assert.equal(report.undeclaredSlip,!declared);
 }
});

test('declared sliding permits dissipative resistance; undeclared constant-speed slip stays visible',()=>{
 const braking=audit(t=>{const state=rod({x:2*t-.5*t*t});state.contacts[0].sliding=true;return state;}).at(.5);
 assert(braking.slippingContacts[0].slipSpeed>1.49);assert(!braking.undeclaredSlip);
 assert(braking.forceRatio<1e-7);assert(braking.torqueMagnitude<1e-5);assert(!braking.warning);
 const unexpected=audit(t=>rod({x:t})).at(.5);
 assert(unexpected.forceRatio<1e-7);assert(unexpected.undeclaredSlip);assert(unexpected.warning);
 assert(audit(t=>rod({x:t})).precompute().undeclaredSlipSamples>0);
});

test('contact velocity follows material rotation rather than the migrating declared contact point',()=>{
 const rolling=audit(t=>rod({x:-.1*(t-.5),angle:t-.5})).at(.5);
 assert(rolling.acceptedContacts[0].slipSpeed<1e-7,'rotation cancels translation at the material contact');
 assert(!rolling.undeclaredSlip);
 const rotating=audit(t=>rod({angle:t-.5})).at(.5);
 assert(Math.abs(rotating.slippingContacts[0].slipSpeed-.1)<1e-7,'rotation creates slip without COM translation');
 assert(rotating.warning);
});
