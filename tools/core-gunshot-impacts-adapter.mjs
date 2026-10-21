export const gunshotImpactOverrides={'engine.js':'Record authoritative per-projectile body impacts, action-locked overkill thresholds and explicit fatal head casualties without presentation RNG.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Gunshot impacts adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreGunshotImpacts(name,data){if(name!=='engine.js')return data;let s=data.toString();
 s="import {beginGunshotAction,stampGunshotEvent,prepareBodyImpact,commitBodyImpact} from '../gunshot-impacts.js';\n"+s;
 s=once(s,"aim:{...b},reply:false}","aim:{...b},reply:false,impactAction:beginGunshotAction(s)}");
 s=once(s,'sequence.push(event);','sequence.push(event);if(ballistic&&!w.blast)stampGunshotEvent(event,f.impactAction,shooter,s.units);');
 s=once(s,'pellets?.map(p=>({unit:', 'pellets?.map(p=>({trajectory:p,unit:');
 s=once(s,'zone:pelletZone}of impacts)', 'zone:pelletZone,trajectory=shot}of impacts)');
 s=once(s,'else {combatDamage(s,victim,amount,!!w.incendiary||incapacitated(victim),shooter);',
  'else {const bodyImpact=ballistic&&!w.blast?prepareBodyImpact(event,f.impactAction,trajectory,victim,amount):null;combatDamage(s,victim,amount,!!w.incendiary||incapacitated(victim)||!!bodyImpact?.fatalHead,shooter);commitBodyImpact(event,bodyImpact,victim);');
 s=once(s,"aim:{...shooter},reply:true}","aim:{...shooter},reply:true,impactAction:beginGunshotAction(s)}");
 return Buffer.from(s);
}
