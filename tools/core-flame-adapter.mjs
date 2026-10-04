// Keep the pinned sprite fork intact; area flames belong to the 3D rules.
export const flameOverrides={'engine.js':'Flamethrowers use a placeable, scenery-clipped area cone for players, guards and reactions.'};
export function adaptCoreFlames(name,data){
 if(name!=='engine.js')return data;
 let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Flame adapter anchor changed: '+a);s=s.replace(a,b);};
 s="import {flamePreview,flameShape,flameVictims} from '../flame-cone.js';\n"+s;
 once('if(WEAPONS[a.weapon].blast)return explosivePreview',`if(WEAPONS[a.weapon].incendiary){
  const p=flamePreview(s,a,b,WEAPONS[a.weapon],combatCosts(s));
  if(!b.ground&&!canSee(s,a,b))return {...p,ok:false,reason:'Target not visible'};
  return p;
 }
 if(WEAPONS[a.weapon].blast)return explosivePreview`);
 once('if(!inCone(b,a)){','if(!b.ground&&!inCone(b,a)){');
 once('const shotChance=roundChance(f.p.chance,f.p.rounds-f.left-1);','const shotChance=w.incendiary?100:roundChance(f.p.chance,f.p.rounds-f.left-1);');
 once('const accurate=shotRoll?shotRoll.rolledHit:w.blast?false:random(s)*100<shotChance;',
  'const accurate=w.incendiary?false:shotRoll?shotRoll.rolledHit:w.blast?false:random(s)*100<shotChance;');
 once('const blastResult=w.blast?detonate(s,shot,w):null;',`const flame=w.incendiary?flameShape(s,shooter,f.aim,w):null;
  const flameHits=flame?flameVictims(s,shooter,flame).map(unit=>({unit,zone:'torso',damage:weaponDamage(w,Math.hypot(unit.x-shooter.x,unit.y-shooter.y))})):null;
  if(flame){event.flame=flame;event.hit=flameHits.length>0;log(s,shooter.name+' sprays a cone of flame.');}
  const blastResult=w.blast?detonate(s,shot,w):null;`);
 once('if(!victim&&!blastResult&&!pellets){','if(!victim&&!blastResult&&!pellets&&!flame){');
 once('const impacts=blastResult?blastResult.hits:pelletHits||', 'const impacts=flameHits||(blastResult?blastResult.hits:pelletHits)||');
 once('for(const {unit:victim,damage:rawAmount,zone:pelletZone}of impacts){const amount=',
  'for(const {unit:victim,damage:rawAmount,zone:pelletZone}of impacts){if(flame&&!alive(victim)&&!incapacitated(victim))continue;const amount=');
 once("if(!WEAPONS[u?.weapon]?.blast)return false;return attack(s,u,groundTarget(point));", "if(!WEAPONS[u?.weapon]?.blast&&!WEAPONS[u?.weapon]?.incendiary)return false;return attack(s,u,groundTarget(point));");
 return Buffer.from(s);
}
