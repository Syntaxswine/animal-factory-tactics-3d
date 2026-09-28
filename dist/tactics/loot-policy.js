export const EQUIPMENT_DROP_RATES=Object.freeze({easy:.75,standard:.5,hard:.25});
export const noEquipmentDrops=u=>u?.playerTrainedMilitia===true;
export function equipmentDropRate(s,u){return noEquipmentDrops(u)?0:EQUIPMENT_DROP_RATES[s.difficulty]??EQUIPMENT_DROP_RATES.standard;}
export const ENEMY_WEAPON_CONDITION=Object.freeze({easy:100,standard:75,hard:50});
export function weaponCondition(s,u,item){return item.condition??(u.team==='guard'?ENEMY_WEAPON_CONDITION[s.difficulty]??75:100);}
export function initializeWeaponCondition(s,u){for(const item of u.pack||[])if(item.type==='weapon')item.condition=weaponCondition(s,u,item);}
export function damageHeldWeapon(s,u,hitZone,impactDamage){
 if(hitZone!=='weapon'||!Number.isFinite(impactDamage)||impactDamage<=0)return;
 const item=u.pack?.find(i=>i.type==='weapon'&&i.kind===u.weapon&&i.kind!=='hands');
 if(item)item.condition=Math.max(0,weaponCondition(s,u,item)-Math.max(1,Math.round(impactDamage)));
}
