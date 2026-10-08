import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {WEAPON_MODELS,createWeaponModel} from './weapon-models.js';
import {createGrenadeModel} from './grenade-model.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {createArmedIdle} from './armed-idle-motion.js';
import {IDLE_MOODS} from './armed-idle-state.js';
export const IDLE_ANIMALS=ANIMAL_MOTION_CATALOG;
export const idleOutfits=animal=>['normal','red-hats',...(animal==='donkey'?['blue-hawaiian']:[])];
export function idleSelection(animal='horse',outfit='normal',weapon='rifle',mood='guard'){
 const profile=IDLE_ANIMALS.find(p=>p.id===animal);if(!profile||!idleOutfits(animal).includes(outfit)||!WEAPON_MODELS[weapon]||!IDLE_MOODS[mood])throw Error('Unsupported idle selection');
 return {animal,outfit,weapon,mood,profile};
}
const cache=new Map();
async function meshData(file){if(!cache.has(file))cache.set(file,fetch('./'+file).then(r=>{if(!r.ok)throw Error('Character mesh failed: '+file);return r.json();}).catch(e=>{cache.delete(file);throw e;}));return cache.get(file);}
export async function createIdleActor(renderer,loader,atlas,grenadeSurface,selection){
 const {profile,outfit,weapon:weaponId,mood}=selection;let worker,paint,cap,weapon,motion,disposed=false;
 const capTextures=new Set(),capLoader={loadAsync:async(...args)=>{const t=await loader.loadAsync(...args);capTextures.add(t);return t;}};
 function dispose(){if(disposed)return;disposed=true;worker?.root.removeFromParent();motion?.dispose();cap?.dispose();paint?.dispose();if(weapon&&weapon!==worker?.rifle)weapon.dispose();worker?.skeleton.dispose();worker?.dispose();for(const t of capTextures)t.dispose();}
 try{
  worker=profile.create(await meshData(profile.file),atlas);
  paint=await createAnimalPaint(renderer,worker,profile,loader,outfit);for(const p of worker.parts){p.material=paint.material;p.castShadow=true;}
  if(outfit==='red-hats')cap=await createRedHatCap(renderer,worker,profile,capLoader);
  weapon=weaponId==='rifle'&&!profile.unarmed?worker.rifle:weaponId==='grenade'?createGrenadeModel(grenadeSurface):createWeaponModel(weaponId,atlas);
  if(!profile.unarmed)worker.equipWeapon(weapon);for(const p of weapon.parts)p.castShadow=true;
  motion=createArmedIdle(worker,profile,{weapon,mood});paint.setGripForearm?.(!profile.unarmed&&!!weapon.carry.handPoses?.support?.gripMesh);return {worker,weapon,motion,selection,dispose};
 }catch(e){dispose();throw e;}
}
