export const combatOverrides={'engine.js':'Shared aimed-shot, burst recoil, leg injury and suppression rules.'};
export function adaptCoreCombat(name,data){
 if(name!=='engine.js')return data;
 let s=data.toString();
 const replace=(a,b)=>{if(s.split(a).length!==2)throw Error('Combat adapter anchor changed: '+a);s=s.replace(a,b);};
 s="import {injuryMovement,turnAP,woundLeg,accuracyPenalty,roundChance,incomingFire,recoverAim} from '../combat-state.js';\n"+s;
 replace('MOVEMENT_MODES[movementModeOf(u)].apMultiplier;','MOVEMENT_MODES[movementModeOf(u)].apMultiplier*injuryMovement(u);');
 replace("q.kind==='cliff'?8:","q.kind==='cliff'?8*injuryMovement(u):");
 s=s.replaceAll("n.kind==='cliff'?8:","n.kind==='cliff'?8*injuryMovement(g):");
 replace("Not identified: face the target","Selected merc has not identified this target");
 replace('playerThreat(s,g)&&g.alert&&threatens(s,g)),contact=', "playerThreat(s,g)&&g.alert&&threatens(s,g)&&(!s.rules?.awareness||['player','enemy'].includes(s.phase)||squad(s).some(p=>canSee(s,p,g)||canSee(s,g,p)))),contact=");
 replace('-coverPenalty-(rounds>1?10:0)', '-coverPenalty-(melee?0:accuracyPenalty(a))');
 replace("if(heldWeaponJammed(a))reason=", "if(a.pinned&&aiming.level!=='hip')reason='Pinned: only hip fire available';else if(heldWeaponJammed(a))reason=");
 replace('chance:Math.round(chance),cover,','chance:Math.round(chance),shotChances:Array.from({length:rounds},(_,i)=>roundChance(chance,i)),cover,');
 replace('const accurate=w.blast?false:random(s)*100<f.p.chance,', 'const shotChance=roundChance(f.p.chance,f.p.rounds-f.left-1);\n  const accurate=w.blast?false:random(s)*100<shotChance,');
 s=s.replaceAll('chance:f.p.chance,','chance:shotChance,');
 replace('if(shot)trajectories.push', `if(ballistic&&alive(target)){
   // A clear aimed ray threatens the target even if this round misses. A solid
   // obstacle intercepting that ray prevents distant fire from pinning them.
   const threat=bulletTrajectory(s,shooter,f.aim,{accurate:true,zone:f.zone,reach:w.range*1.5},()=>0);
   if(incomingFire(s,target,shooter,threat.unitId===target.id||shot?.unitId===target.id,()=>random(s)))log(s,target.name+' is pinned by incoming fire.');
  }
  if(shot)trajectories.push`);
 replace('reply:f.reply};sequence.push(event);','reply:f.reply,shotChance};sequence.push(event);');
 replace('if(w.incendiary)ignite(s,victim);}',"if(!w.blast&&hitZone==='legs'&&amount>0)woundLeg(victim);if(w.incendiary)ignite(s,victim);}");
 replace('const living=alive(u),before=u.hp;u.hp=', 'const living=alive(u),before=u.hp;if(u.hp>=u.maxHp)delete u.legWound;u.hp=');
 replace('function contactEnds(s){', 'function contactEnds(s){for(const u of s.units){delete u.pinned;delete u.suppression;}');
 replace('u.ap=u.maxAp;', 'u.ap=turnAP(u);');
 replace('for(const g of guards(s))g.ap=g.burningTurns?0:g.maxAp;', 'for(const g of guards(s)){recoverAim(g,()=>random(s));g.ap=g.burningTurns?0:turnAP(g);}');
 replace('for(const p of squad(s)){p.ap=p.burningTurns?0:p.maxAp;', 'for(const p of squad(s)){recoverAim(p,()=>random(s));p.ap=p.burningTurns?0:turnAP(p);');
 replace('p.ap=p.maxAp;p.away.ap=p.maxAp;', 'recoverAim(p,()=>random(s));p.ap=turnAP(p);p.away.ap=p.ap;');
 return Buffer.from(s);
}
