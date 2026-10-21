export const squadAmmoOverrides={'inventory.js':'Store mercenary reserve ammunition outside backpacks and share it across the local squad.','engine.js':'Reload from finite shared squad supplies; retain personal guard ammunition and existing AP costs.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Squad ammo adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreSquadAmmo(name,data){let s=data.toString();
 if(name==='inventory.js'){
  s="import {ammoReserve,spendAmmo,creditSquadAmmo,migrateSquadAmmo,canCreditSquadAmmo} from '../squad-ammo.js';\n"+s;
  s=once(s,"i.kind===u.weapon);}}", "i.kind===u.weapon);}migrateSquadAmmo([u]);}");
  s=once(s,"export const reserve=(u,kind)=>u.pack.filter(i=>i.type==='ammo'&&i.kind===kind).reduce((n,i)=>n+i.count,0);",'export const reserve=ammoReserve;');
  s=once(s,"export function consumeAmmo(u,kind,count){for(const i of u.pack)if(i.type==='ammo'&&i.kind===kind){const n=Math.min(count,i.count);i.count-=n;count-=n;}u.pack=u.pack.filter(i=>i.type!=='ammo'||i.count>0);}",'export const consumeAmmo=spendAmmo;');
  s=once(s,'export function accepts(u,item){',"export function accepts(u,item){if(u.team==='squad'&&item.type==='ammo')return canCreditSquadAmmo(u,item);");
  s=once(s,'export function receive(u,item){',"export function receive(u,item){if(creditSquadAmmo(u,item))return;");
 }else if(name==='engine.js'){
  s="import {settleSquadAmmo} from '../squad-ammo.js';\n"+s;
  s=once(s,'function refreshNow(s){','function refreshNow(s){settleSquadAmmo(s);');
  s=once(s,'reserve(u,u.weapon)','reserve(u,u.weapon,s)');
  s=once(s,'u.ammo[u.weapon]+=count;consumeAmmo(u,u.weapon,count);','u.ammo[u.weapon]+=count;');
  s=once(s,'if(s.queue.length||!w.mag||count<=0||(combatCosts(s)&&u.ap<3))return false;', 'if(s.queue.length||!w.mag||count<=0||(combatCosts(s)&&u.ap<3)||!consumeAmmo(u,u.weapon,count,s))return false;');
 }return Buffer.from(s);
}
