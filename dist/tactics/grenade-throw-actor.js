import {ANIMAL_MOTION_CATALOG} from './animal-motion-catalog.js';
import {createAnimalPaint} from './animal-motion-paint.js';
import {createRedHatCap} from './red-hat-model.js';
import {createGrenadeModel} from './grenade-model.js';
import {createGrenadeThrow} from './grenade-throw-motion.js';
import {createHenGrenadeThrow} from './hen-grenade-throw.js';

export const GRENADE_CHARACTERS=ANIMAL_MOTION_CATALOG;
export const grenadeOutfits=animal=>['normal','red-hats',...(animal==='donkey'?['blue-hawaiian']:[])];
export function grenadeSelection(animal='horse',outfit='normal'){
 const profile=GRENADE_CHARACTERS.find(p=>p.id===animal);
 if(!profile)throw Error('Unknown grenade thrower: '+animal);
 if(!grenadeOutfits(animal).includes(outfit))throw Error('Unsupported outfit for '+animal);
 return {animal,outfit,profile};
}

// Each actor owns its paint/cap/rig/prop. The viewer owns the shared atlas and
// grenade texture. Failed loads and superseded selections use the same cleanup.
export async function createGrenadeActor(renderer,loader,atlas,surface,selection){
 const {profile,animal,outfit}=selection;let worker,paint,cap,grenade,motion,disposed=false;
 const textures=new Set(),ownedLoader={loadAsync:async(...args)=>{const t=await loader.loadAsync(...args);textures.add(t);return t;}};
 function dispose(){if(disposed)return;disposed=true;worker?.root.removeFromParent();motion?.dispose();cap?.dispose();paint?.dispose();grenade?.dispose();if(!profile.unarmed)worker?.skeleton.dispose();worker?.dispose();for(const t of textures)t.dispose();}
 try{
  const response=await fetch('./'+profile.file);if(!response.ok)throw Error('Character mesh failed: '+profile.file);
  worker=profile.create(await response.json(),atlas);
  if(animal==='pig-director')for(const part of worker.parts.filter(p=>p.name.includes('trousers'))){
   // The turnaround's waistcoat edge overlaps the top of the trouser painting.
   // Register this newly exposed rise inside the existing brown cloth artwork.
   const a=part.geometry.attributes.paintPosition;
   for(let i=0;i<a.count;i++)if(a.getY(i)>.66)a.setY(i,.66+(a.getY(i)-.66)*.22);
   a.needsUpdate=true;
  }
  paint=await createAnimalPaint(renderer,worker,profile,loader,outfit);for(const part of worker.parts){part.material=paint.material;part.castShadow=true;}
  if(outfit==='red-hats')cap=await createRedHatCap(renderer,worker,profile,ownedLoader);
  grenade=createGrenadeModel(surface);for(const p of grenade.parts)p.castShadow=true;
  motion=profile.unarmed?createHenGrenadeThrow(worker,grenade):createGrenadeThrow(worker,grenade,{animal});
  return {selection,worker,grenade,motion,dispose};
 }catch(error){dispose();throw error;}
}
