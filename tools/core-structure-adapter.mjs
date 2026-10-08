export const structureOverrides={
 'projectiles.js':'Identify the exact wall or floor struck without changing shot obstruction or hit rolls.',
 'explosives.js':'Apply persistent material HP to walls and floors after resolving blast exposure against intact scenery.',
 'engine.js':'Apply firearm and flame structure damage and retain receipts for gameplay feedback.'
};
export function adaptCoreStructures(name,data){
 if(!structureOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Structure adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='projectiles.js'){
  once('terrainAt,levelOf,sightEdge,W,H,LEVELS','terrainAt,levelOf,sightEdge,edgeBetween,W,H,LEVELS');
  once("return impact('floor',t);}","return impact('floor',t,{structure:{x,y,z:upper}});}");
  once("return impact('wall',t);\n    if(ay", "return impact('wall',t,{structure:{edge:edgeBetween({x:ax,y,z},{x:bx,y,z})}});\n    if(ay");
  once("return impact('wall',t);\n   }", "return impact('wall',t,{structure:{edge:edgeBetween({x,y:ay,z},{x,y:by,z})}});\n   }");
  once("if(top&&height<=top)return impact('cover',t);", "if(top&&height<=top)return impact('cover',t,{...(terrain==='wall'?{structure:{x,y,z}}:{})});");
  once("if(z<0)return impact('floor',t);", "if(z<0)return impact('floor',t,{structure:{x,y,z:0}});");
  once("return impact('cover',hit);", "return impact('cover',hit,{...(terrain==='wall'?{structure:{x,y,z}}:{})});");
 }
 if(name==='explosives.js'){
  s="import {planStructureBlast,commitStructureDamage} from '../structure-damage.js';\nimport {structureInfo} from '../structure-health.js';\n"+s;
  once('const radius=w.blast,candidates=[];', 'const radius=w.blast,candidates=[],structures=planStructureBlast(s,impact,radius,d=>Math.max(0,Math.round(w.damage*(1-d/radius))),{spacing:3});');
  once('for(const [key,kind]of Object.entries(s.edges)){','for(const [key,kind]of Object.entries(s.edges)){\n  if(structureInfo(s,{edge:key}))continue;');
  once('if(isExplosiveBarrel(prop)||isStrategicSite(prop))continue;', "if(isExplosiveBarrel(prop)||isStrategicSite(prop)||/^(roof-|cliff-|ramp)/.test(prop.kind))continue;");
  once("if(!['wall','crate'].includes(terrain))continue;", "if(terrain!=='crate')continue;");
  once('const sites=blastStrategicSites(s,impact,radius);destroyed+=sites.length;', 'const sites=blastStrategicSites(s,impact,radius),structural=commitStructureDamage(s,structures);destroyed+=sites.length+structural.destroyed;');
  once('return {hits,barrels,sites,blast:', 'return {hits,barrels,sites,structures:structural.receipts,before:structural.before,blast:');
 }
 if(name==='engine.js'){
  s="import {projectileStructureDamage,commitStructureDamage} from '../structure-damage.js';\nimport {planFlameStructureDamage} from '../structure-flame.js';\nimport {settleStructureCollapse} from '../structure-collapse.js';\nimport {mergeScenery} from '../structure-health.js';\n"+s;
  once('export function attack(s,a,b,burst=false', `function settleAttackStructures(s,event,source){
 const receipts=[...(event.structures||[]),...event.explosions.flatMap(e=>e.structures||[])],fallen=settleStructureCollapse(s,receipts,{fatal:(s,u)=>combatDamage(s,u,Math.max(u.hp,1),true,source)});
 event.falls=fallen.falls;
 if(event.grenade){for(const e of event.explosions)mergeScenery(event.grenade.scenery,e.before);mergeScenery(event.grenade.scenery,fallen.before);}
 for(const f of fallen.falls){const u=s.units.find(u=>u.id===f.id);if(u.hp<=0&&!event.downed.includes(u.id))event.downed.push(u.id);if(u.burningTurns||u.burnedRemains){recordBurn(s,u,u.hp>0?'ignite':'ash');(event.burns??=[]).push(u.id);}log(s,u.name+' fell to level '+(f.to.z+1)+'.');}
}
export function attack(s,a,b,burst=false`);
  once("kind:'tank',unitId:wearer.id,fireSequence:receipt.sequence,burns:result.burns", "kind:'tank',unitId:wearer.id,fireSequence:receipt.sequence,burns:result.burns,structures:result.structures,before:result.before");
  once('const flameHits=flame?', 'const flameStructures=flame?planFlameStructureDamage(s,flame,w.damage):[],flameBarrelHits=flame?flameBarrels(s,flame):[];\n  const flameHits=flame?');
  once('...(flame?flameBarrels(s,flame):[])','...flameBarrelHits');
  once('const blastResult=w.blast?detonate(s,shot,w):null;', `const structureResult=flame?commitStructureDamage(s,flameStructures):w.blast?null:projectileStructureDamage(s,pellets||(shot?[shot]:[]),p=>weaponDamage(w,p.distance));
  event.structures=structureResult?.receipts||[];
  const blastResult=w.blast?detonate(s,shot,w):null;`);
  once('if(blastResult){if(event.grenade)', 'if(blastResult){event.structures=blastResult.structures||[];if(event.grenade)');
  once('const barrelHits=[', `if(event.structures.length){event.hit=true;for(const r of event.structures)log(s,r.kind.replaceAll('-',' ')+': '+(r.destroyed?'destroyed':r.hp+'/'+r.maxHp+' HP')+'.');}
  const barrelHits=[`);
  // Each burst round settles before the next round traces the changed scene.
  once("if(!victim&&!blastResult&&!pellets&&!flame){if(!event.hit)","if(!victim&&!blastResult&&!pellets&&!flame){settleAttackStructures(s,event,shooter);if(!event.hit)");
  once(' }\n }});', ' }\n settleAttackStructures(s,event,shooter);\n }});');
 }
 return Buffer.from(s);
}
