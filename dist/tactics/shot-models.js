import {angularHelicoidShot,seededShots,studyBody,traceStudy} from './helicoid-shot.js';
import {AIM_LEVELS,shotAim} from './aim-levels.js';

export const SHOT_MODELS=[
 {id:'angular',name:'Angular misses',tag:'Regular scatter',color:'#466978',description:'Every failed roll uses the original angular scatter outside the intended body part.'},
 {id:'critical',name:'Helicoid misses',tag:'Original miss spread',color:'#ac3a28',description:'The original helicoid spread places failed rolls. Successful rolls go directly to the aim point.'},
 {id:'margin',name:'Roll-margin misses',tag:'Preferred pattern',color:'#867031',description:'The D20 margin changes where a failed roll goes. It does not decide the hit chance.'}
];
export const DISTANCES=[1,5,10,20,40,60,100];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bodyZones=new Set(['head','torso','legs']);
const studyWeapon={cost:4,mag:30};
export const DEFAULT_SHOT_SETUP={accuracy:65,precision:80,distance:20,aimLevel:'hip',penalty:0,zone:'torso',cover:'none',smoke:false,smokeBypass:false,seed:42};

export function angularSize(size,distance){
 if(!Number.isFinite(size)||size<0||!Number.isFinite(distance)||distance<=0)throw Error('Invalid angular size');
 return 2*Math.atan(size/(2*distance));
}

export function shotInputs(seed,count=1000){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(count)||count<1||count>10000)throw Error('Invalid sample seed or count');
 const random=seededShots(seed),accuracyRandom=seededShots((seed^0x9e3779b9)>>>0);
 // All models consume the same independent inputs.
 // A separate stream leaves every existing scatter/critical roll unchanged.
 return Array.from({length:count},()=>({die:1+Math.floor(random()*20),roll:random(),rotation:random(),damage:random(),graze:random(),accuracyRoll:accuracyRandom()}));
}

export function prepareShotSetup(settings={}){
 const c={...DEFAULT_SHOT_SETUP,...settings};
 if(!['accuracy','precision','distance','penalty'].every(k=>Number.isFinite(c[k]))||c.distance<1||c.distance>100||!Object.hasOwn(AIM_LEVELS,c.aimLevel)||!bodyZones.has(c.zone)||!['none','waist','head'].includes(c.cover))throw Error('Invalid shot setup');
 const aiming=shotAim(studyWeapon,c.aimLevel),effective=clamp(c.accuracy+aiming.accuracy-c.penalty,1,100),hitChance=clamp(effective,5,95);
 const bodies=studyBody.map(b=>({...b,center:[b.center[0],c.distance,b.center[2]]}));
 // Aim at a leg, not at the empty gap between the legs.
 const target=bodies.find(b=>b.zone===c.zone),aim=[...target.center],origin=[0,0,1.3];
 const cover=c.cover==='none'?false:{y:Math.max(c.distance*.5,c.distance-.3),halfWidth:.8,height:c.cover==='head'?1.48:1.25};
 return {...c,bodies,aim,origin,coverPlane:cover,effective,hitChance,ap:aiming.cost,modifier:Math.floor((effective-50)/10),angularWidth:angularSize(2*target.radii[0],Math.hypot(...aim.map((v,i)=>v-origin[i])))};
}

export function resolveHitRoll(setup,input){
 const critical=input.die===20?'success':input.die===1?'failure':'ordinary';
 // The supplied chance INCLUDES natural 1/20. Do not count their 5% twice.
 const ordinaryChance=clamp((setup.hitChance-5)/90,0,1);
 return {critical,ordinaryChance,rolledHit:critical==='success'||critical==='ordinary'&&input.accuracyRoll<ordinaryChance};
}

function placeMiss(setup,error,rotation){
 const make=error=>angularHelicoidShot({origin:setup.origin,aim:setup.aim,error,rotation});
 const strikesIntended=shot=>traceStudy(shot,setup.bodies).zone===setup.zone;
 let shot=make(error);
 if(!strikesIntended(shot))return {...shot,missAdjusted:false};
 // A miss of the selected part must actually pass outside that part. Find
 // its silhouette boundary along the sampled bearing, without another roll.
 // Other body parts remain collision candidates, and cover is traced later.
 let low=error,high=Math.PI*.49,clear=make(high);
 if(strikesIntended(clear))throw Error('Cannot place miss outside target silhouette');
 for(let i=0;i<16;i++){const mid=(low+high)/2,candidate=make(mid);if(strikesIntended(candidate))low=mid;else{high=mid;clear=candidate;}}
 return {...clear,missAdjusted:true};
}

export function modelShot(model,setup,input){
 if(!SHOT_MODELS.some(m=>m.id===model))throw Error('Unknown shot model');
 if(!Number.isInteger(input.die)||input.die<1||input.die>20||!['roll','rotation','damage','graze','accuracyRoll'].every(k=>Number.isFinite(input[k])&&input[k]>=0&&input[k]<1))throw Error('Invalid shot roll');
 const {die,roll,rotation}=input,{critical,ordinaryChance,rolledHit}=resolveHitRoll(setup,input);
 const weapon=.0005+(1-clamp(setup.precision,1,100)/100)*.008;
 const margin=die+setup.modifier-11;
 const shooter=model==='margin'?.0105*clamp(1.2-margin*.12,.2,2.4):.001+(1-setup.effective/100)*.025;
 const sigma=Math.hypot(shooter,weapon);
 let error=Math.min(Math.PI/3,sigma*Math.sqrt(-2*Math.log(1-roll)));
 // A fixed large ANGLE keeps a natural 1 exceptional at close range. Never
 // exclude other body parts: the resulting ray can still strike one of them.
 if(model!=='angular'&&critical==='failure')error=(28+roll*20)*Math.PI/180;
 const shot=rolledHit?{...angularHelicoidShot({origin:setup.origin,aim:setup.aim,error:0,rotation}),missAdjusted:false}:placeMiss(setup,error,rotation);
 const collision=traceStudy(shot,setup.bodies,setup.coverPlane),hit=bodyZones.has(collision.zone);
 // A smoke curtain occupies the line in front of the target. Damage bypass
 // does not confer visibility or alter the ray; those hooks remain separate.
 const t=(setup.distance*.5-shot.origin[1])/shot.direction[1];
 const x=shot.origin[0]+shot.direction[0]*t,z=shot.origin[2]+shot.direction[2]*t;
 const throughSmoke=!!setup.smoke&&t>=0&&t<collision.distance&&Math.abs(x)<=.8&&z>=0&&z<=2.2;
 const graze=hit&&throughSmoke&&!setup.smokeBypass;
 const damage=hit?(graze?6+Math.floor(input.graze*3):Math.round((45+Math.floor(input.damage*11))*(collision.zone==='head'?1.5:collision.zone==='legs'?.85:1))):0;
 return {...shot,model,die,critical,rolledHit,ordinaryChance,margin,sigma,collision,hit,throughSmoke,graze,damage};
}

export function summarizeShots(shots,zone){
 const counts={rolledHits:0,incidental:0,selected:0,any:0,other:0,miss:0,cover:0,ground:0,grazes:0,successes:0,failures:0,damage:0};
 for(const s of shots){
  if(s.rolledHit)counts.rolledHits++;
  if(!s.rolledHit&&s.hit)counts.incidental++;
  if(s.hit){counts.any++;if(s.collision.zone===zone)counts.selected++;else counts.other++;}
  else counts[s.collision.zone]++;
  if(s.graze)counts.grazes++;
  if(s.critical==='success')counts.successes++;
  if(s.critical==='failure')counts.failures++;
  counts.damage+=s.damage;
 }
 return {...counts,count:shots.length,averageDamage:counts.damage/shots.length};
}

export function compareShots(settings,inputs=shotInputs(settings.seed??42)){
 const setup=prepareShotSetup(settings);
 return {setup,models:SHOT_MODELS.map(model=>{const shots=inputs.map(input=>modelShot(model.id,setup,input));return {...model,shots,summary:summarizeShots(shots,setup.zone)};})};
}

export function distanceComparison(settings,inputs){
 return DISTANCES.map(distance=>{const {models,setup}=compareShots({...settings,distance},inputs);return {distance,ap:setup.ap,models:models.map(m=>({id:m.id,summary:m.summary}))};});
}
