export const oneHandedOverrides={'inventory.js':'Keep a second pistol as an independent item and magazine.','engine.js':'Hold compatible one-handed ready items together and resolve dual-pistol fire as two independent shots.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('One-handed adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreOneHanded(name,data){let s=data.toString();
 if(name==='inventory.js'){
  s="import {receivedWeapon} from '../one-handed.js';\n"+s;
  s=once(s,'knife:1,pistol:1,','knife:1,pistol:1,\'pistol-offhand\':1,');
  s=once(s,'export function accepts(u,item){','export function accepts(u,item){item=receivedWeapon(u,item);');
  s=once(s,'export function receive(u,item){','export function receive(u,item){item=receivedWeapon(u,item);');
 }else if(name==='engine.js'){
  s="import {attackWeapon,handAttackReady,handWeapons,pairedInHand} from '../one-handed.js';\n"+s;
  s=once(s," rifle:{name:'Mosin-Nagant'", " 'pistol-offhand':{name:'TT-33 pistol · second',short:'TT-33 II',cost:4,range:12,damage:27,mag:8,penetrationClass:'pistol',accuracy:-20,rangeLoss:35},\n rifle:{name:'Mosin-Nagant'");
  s=once(s,'previewBarrelAttack(s,a,b,WEAPONS[a.weapon],combatCosts(s),burst,aimLevel)','previewBarrelAttack(s,a,b,attackWeapon(a,WEAPONS,burst),combatCosts(s),burst,aimLevel)');
  s=once(s,'previewGroundFire(s,a,b,WEAPONS[a.weapon],combatCosts(s),burst,aimLevel)','previewGroundFire(s,a,b,attackWeapon(a,WEAPONS,burst),combatCosts(s),burst,aimLevel)');
  s=once(s,'shotAim(WEAPONS[a.weapon],aimLevel,burst)','shotAim(attackWeapon(a,WEAPONS,burst),aimLevel,burst)');
  s=once(s,'const w=WEAPONS[a.weapon],rounds=burst?', 'const w=attackWeapon(a,WEAPONS,burst),rounds=burst?');
  s=once(s,"else if(w.mag&&a.ammo[a.weapon]<rounds)reason='Reload required';", "else if(w.mag&&!handAttackReady(a,w,rounds))reason=w.dual?'Both pistols must be loaded and unjammed':'Reload required';");
  s=once(s,'return {ok:!reason,reason,cost,rounds,aimLevel:aiming.level,chance:', 'return {ok:!reason,reason,cost,rounds,...w.dual?{dualWeapons:handWeapons(a)}:{},aimLevel:aiming.level,chance:');
  s=once(s,'const f=frames.at(-1),shooter=f.a,target=f.b,w=WEAPONS[f.weapon];', 'const f=frames.at(-1);if(f.p.dualWeapons&&f.left)f.weapon=f.p.dualWeapons[f.p.rounds-f.left];const shooter=f.a,target=f.b,w=WEAPONS[f.weapon];');
  s=once(s,'reply:f.reply,shotChance,shotRoll};', 'reply:f.reply,shotChance,shotRoll,weapon:f.weapon,...f.p.dualWeapons?{dual:true}: {}};');
  s=once(s,"id==='hands'||u.weapon===id?0:", "id==='hands'||u.weapon===id||pairedInHand(u,id)?0:");
  s=once(s,'export function attackGround(s,u,point){if(!WEAPONS[u?.weapon]?.mag)return false;return attack(s,u,groundTarget(point));}', "export function attackGround(s,u,point,burst=false,aimLevel='hip'){if(!WEAPONS[u?.weapon]?.mag)return false;return attack(s,u,groundTarget(point),burst,false,'torso',false,aimLevel);}");
 }return Buffer.from(s);
}
