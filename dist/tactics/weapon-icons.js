// Flat side profiles for small interface controls. World loot keeps its art.
export const WEAPON_ICONS=Object.freeze(Object.fromEntries(['hands','knife','pistol','rifle','assault','smg','hmg','shotgun','sniper','grenade','launcher','rpg','flamethrower'].map(kind=>[kind,'../assets/equipment/icons/'+kind+'.svg'])));
export const weaponIcon=kind=>WEAPON_ICONS[kind]||null;
