// Apply after the combat adapter. The pinned sprite branch remains untouched.
export const ballisticsOverrides={
 'engine.js':'Roll firearm probability once with D20 extremes; use shared roll-margin misses for bullets and shells.',
 'projectiles.js':'Share actor intersections with helicoid miss placement while retaining tactical obstacle tracing.'
};
export function adaptCoreBallistics(name,data){
 if(!ballisticsOverrides[name])return data;
 let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Ballistics adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='engine.js'){
  s="import {rollFirearmShot} from '../helicoid-shot.js';\n"+s;
  once("import {shotAim} from '../aim-levels.js';","import {shotAim,supportsAim} from '../aim-levels.js';");
  once('const chance=Math.max(10,Math.min(95,weaponAccuracy(a)', 'const chance=Math.max(supportsAim(w)?5:10,Math.min(95,weaponAccuracy(a)');
  once('const accurate=w.blast?false:random(s)*100<shotChance,ballistic=w.mag&&!w.incendiary;',
   'const ballistic=w.mag&&!w.incendiary,shotRoll=supportsAim(w)?rollFirearmShot(shotChance,()=>random(s)):null;\n  const accurate=shotRoll?shotRoll.rolledHit:w.blast?false:random(s)*100<shotChance;');
  if(s.split('chance:shotChance,').length!==3)throw Error('Ballistics trajectory options changed');
  s=s.replaceAll('chance:shotChance,','chance:shotChance,shotRoll,precision:w.precision??80,');
  once('reply:f.reply,shotChance};','reply:f.reply,shotChance,shotRoll};');
 }else{
  s="import {bodyIntersection,firearmTrajectory,pelletTrajectories} from '../ballistic-shot.js';\n"+s;
  const body=s.match(/  const ox=origin\.x-unit\.x,[\s\S]*?if\(t<=end&&t<limit\)\{limit=t;nearest=unit;\}/)?.[0];
  if(!body)throw Error('Ballistics body intersection anchor changed');
  once(body,'  const hit=bodyIntersection(unit,origin,d,reach,bodyHeight(unit));\n  if(hit&&hit.distance<limit){limit=hit.distance;nearest=unit;}');
  const trajectories=s.match(/export function bulletTrajectory\([\s\S]*$/)?.[0];
  if(!trajectories?.includes('export function shotgunTrajectories'))throw Error('Ballistics trajectory anchors changed');
  once(trajectories,`export function bulletTrajectory(state,shooter,target,options,random){
 return firearmTrajectory(state,shooter,target,options,random,{trace:traceProjectile,bodyHeight,muzzleHeight,targetHeight});
}

export function shotgunTrajectories(state,shooter,target,options,random){
 return pelletTrajectories(state,shooter,target,options,random,{trace:traceProjectile,bodyHeight,muzzleHeight,targetHeight});
}
`);
 }
 return Buffer.from(s);
}
