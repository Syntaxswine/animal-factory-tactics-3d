// Keep the pinned sprite fork intact; area flames belong to the 3D rules.
export const flameOverrides={'engine.js':'Flamethrowers use a scenery-clipped lethal area cone; fuel fire ends its three panic turns in permanent death and ash through the casualty pipeline, including elapsed guard settling. Tank blasts record worn-pack rupture, burned remains and fire-cell presentation receipts.'};
export function adaptCoreFlames(name,data){
 if(name!=='engine.js')return data;
 let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Flame adapter anchor changed: '+a);s=s.replace(a,b);};
 s="import {firePoint,recordBurn} from '../fire-events.js';\nimport {flamePreview,flameShape,flameVictims} from '../flame-cone.js';\n"+s;
 once("s.queue=[];log(s,u.name+' is on fire / panic for 3 turns.');", "recordBurn(s,u,'ignite');s.queue=[];log(s,u.name+' is on fire / 3 panic turns before burning to ash.');");
 once('const heading=Math.floor(random(s)*8)*45;', 'const fireRoute=[firePoint(u)],heading=Math.floor(random(s)*8)*45;');
 once('u.x=p.x;u.y=p.y;u.steps++;emitNoise(s,u,15);', 'u.x=p.x;u.y=p.y;u.steps++;fireRoute.push(firePoint(u));emitNoise(s,u,15);');
 once('u.ap=0;u.fireActedRound=s.round;', "recordBurn(s,u,'panic',fireRoute);u.ap=0;u.fireActedRound=s.round;");
 // Expiration is a committed casualty, not a renderer-driven disappearance.
 // Keep the original three panic turns and the normal loot/morale rules.
 once('function finishFireRound(s){',`function expireBurn(s,u){
 u.burningTurns=0;if(!alive(u))return;
 combatDamage(s,u,Math.max(u.hp,1),true);recordBurn(s,u,'ash');log(s,u.name+' burned to ash.');
}
function finishFireRound(s){`);
 once("if(!u.burningTurns)log(s,u.name+' is no longer on fire.');",'if(!u.burningTurns)expireBurn(s,u);');
 once('for(const g of guards(s))if(g.burningTurns)g.burningTurns=Math.max(0,g.burningTurns-rounds);',
  'for(const g of guards(s))if(g.burningTurns){g.burningTurns=Math.max(0,g.burningTurns-rounds);if(!g.burningTurns)expireBurn(s,g);}');
 once('wearer.tanksExploded=true;', 'const wornWeapon=wearer.weapon,newFires=[];wearer.tanksExploded=true;');
 once('else s.fires.push({x,y,z,turns:3});', 'else {const cell={x,y,z,turns:3};s.fires.push(cell);newFires.push({...cell});}');
 once('for(const u of victims)combatDamage(s,u,Math.max(u.hp,1),true,source);', `for(const u of victims){combatDamage(s,u,Math.max(u.hp,1),true,source);if(u!==wearer)recordBurn(s,u,'ash');}
 const receipt=recordBurn(s,wearer,'tank');receipt.weapon=wornWeapon;receipt.fires=newFires;`);
 once('return {x:wearer.x,y:wearer.y,z:levelOf(wearer),h:unitBaseHeight(wearer)+.8};',
  "return {x:wearer.x,y:wearer.y,z:levelOf(wearer),h:unitBaseHeight(wearer)+.8,kind:'tank',unitId:wearer.id,fireSequence:receipt.sequence,burns:s.units.filter(u=>victims.includes(u)||u.burningTurns&&levelOf(u)===z&&Math.hypot(u.x-wearer.x,u.y-wearer.y,unitBaseHeight(u)-unitBaseHeight(wearer))<=5).map(u=>u.id)};");
 once('explosions.push(blast);event.explosions.push(blast);', 'explosions.push(blast);event.explosions.push(blast);(event.burns??=[]).push(...blast.burns);');
 once('if(w.incendiary)ignite(s,victim);', "if(w.incendiary){if(victim.hp<=0)recordBurn(s,victim,'ash');ignite(s,victim);(event.burns??=[]).push(victim.id);}");
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
  const flameHits=flame?flameVictims(s,shooter,flame).map(unit=>({unit,zone:'torso',damage:Math.max(1,unit.hp)})):null;
  if(flame){event.flame=flame;event.hit=flameHits.length>0;log(s,shooter.name+' sprays a cone of flame.');}
  const blastResult=w.blast?detonate(s,shot,w):null;`);
 once('if(!victim&&!blastResult&&!pellets){','if(!victim&&!blastResult&&!pellets&&!flame){');
 once('const impacts=blastResult?blastResult.hits:pelletHits||', 'const impacts=flameHits||(blastResult?blastResult.hits:pelletHits)||');
 once('for(const {unit:victim,damage:rawAmount,zone:pelletZone}of impacts){const amount=',
  'for(const {unit:victim,damage:rawAmount,zone:pelletZone}of impacts){if(flame&&!alive(victim)&&!incapacitated(victim))continue;const amount=');
 // Direct spray is lethal at every point in the clipped template. Keep the
 // ordinary fatal-damage pipeline for casualties, XP, loot and event timing.
 once('const amount=damageAfterResistance(victim,rawAmount);','const amount=flame?rawAmount:damageAfterResistance(victim,rawAmount);');
 once("if(!WEAPONS[u?.weapon]?.blast)return false;return attack(s,u,groundTarget(point));", "if(!WEAPONS[u?.weapon]?.blast&&!WEAPONS[u?.weapon]?.incendiary)return false;return attack(s,u,groundTarget(point));");
 return Buffer.from(s);
}
