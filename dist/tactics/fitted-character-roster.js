// Native models reviewed with the complete equipment set in the traversal
// solvers. Keep this separate from the simulation's appearance catalogue.
export const FITTED_CHARACTER_SPECIES=Object.freeze(['bear','bull','rabbit','dog']);
export const hasFittedEquipment=species=>FITTED_CHARACTER_SPECIES.includes(species);

// The narrower original rigs cannot follow a heavy receiver through the bear's
// broad shoulder arc while retaining the grip. Keep the native arm lengths and
// guide these weapons closer to the shoulder until the hand releases.
export function usesShortEquipmentArc(species,weapon){
 return hasFittedEquipment(species)&&(['knife','pistol','grenade'].includes(weapon)||species!=='bear'&&['hmg','rpg','flamethrower'].includes(weapon));
}

// These species have native 3D portraits rather than legacy armed sprite sets.
export function nativeCharacterPortrait(unit){
 return hasFittedEquipment(unit?.species)?'../assets/characters/'+(unit.outfit==='red-hats'?'red-hats/':'')+unit.species+'-idle.png':null;
}
