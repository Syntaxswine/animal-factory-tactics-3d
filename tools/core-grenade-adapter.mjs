export const grenadeOverrides={
 'engine.js':'Hand grenades have a five-tile fragmentation blast and immutable release/fuse trajectory events.',
 'explosives.js':'Hand grenades use stat-scaled ballistic lobs, original-target accuracy, swept bounces and steep cover-shielded damage falloff. Launched blasts retain their kind, native presentation height and per-detonation surviving cover.'
};
export function adaptCoreGrenades(name,data){
 if(!grenadeOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Grenade adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='explosives.js'){
  s="import {nativeBlastPresentation,blastCover} from '../launched-blast-receipt.js';\nimport {grenadePreview,grenadeTrajectory} from '../grenade-ballistics.js';\nimport {detonateGrenade} from '../grenade-blast.js';\n"+s;
  once('export function explosivePreview(s,a,target,w){','export function explosivePreview(s,a,target,w){\n if(w.thrown)return grenadePreview(s,a,target,w);');
  once('export function explosiveTrajectory(s,a,target,w,p,random){','export function explosiveTrajectory(s,a,target,w,p,random){\n if(w.thrown)return grenadeTrajectory(s,a,target,w,p,random);');
  once('export function detonate(s,impact,w){','export function detonate(s,impact,w){\n if(w.thrown)return detonateGrenade(s,impact);');
  once('const radius=w.blast,candidates=[];','const radius=w.blast,candidates=[],presentation=nativeBlastPresentation(s,impact);');
  once('blast:{x:impact.x,y:impact.y,z:impact.z,h:impact.h,radius,destroyed}',"blast:{kind:w.arc?'launcher':'rocket',x:impact.x,y:impact.y,z:impact.z,h:impact.h,radius,destroyed,presentation,cover:blastCover(s)}");
 }
 if(name==='engine.js'){
  once("grenade:{name:'Fragmentation grenade',short:'Grenade',cost:5,range:10,damage:120,mag:3,blast:3,arc:true,thrown:true}","grenade:{name:'Fragmentation grenade',short:'Grenade',cost:5,range:10,damage:120,mag:3,blast:5,arc:true,thrown:true}");
  once('shotChance,shotRoll};sequence.push(event);','shotChance,shotRoll};if(w.thrown)event.grenade={shooter:structuredClone(shooter),release:1.92,recovery:4.6};sequence.push(event);');
  once('if(blastResult){event.explosions.push', 'if(blastResult){if(event.grenade)event.grenade.scenery=blastResult.before;event.explosions.push');
 }
 return Buffer.from(s);
}
