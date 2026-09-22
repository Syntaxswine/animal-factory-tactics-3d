import {createModelPaint} from './horse-model-paint.js';
import {cowNeckPaint,COW_NECK_PAINT} from './cow-neck-paint.js';
import {rabbitPaintLayers,RABBIT_CLOTH_PAINT,RABBIT_EYE_PAINT} from './rabbit-paint-layers.js';
import {dogMotionPaint} from './dog-motion-paint.js';
import {DOG_CLOTH_PAINT,DOG_EYE_PAINT} from './dog-paint-layers.js';
import {sheepPaintLayers} from './sheep-paint-layers.js';
import {henPaintLayers} from './hen-paint-layers.js';
import {animalMotionRepairPaint} from './animal-motion-repair-paint.js';
export async function createAnimalPaint(renderer,worker,profile,loader){
 const textures=[],load=async url=>{const t=await loader.loadAsync(url);textures.push(t);return t;},base='../assets/characters/lowpoly-proof/';
 const main=await load(profile.paint),options={species:profile.id,frame:profile.frame};
 if(profile.id==='cow')options.paintLayers=cowNeckPaint(await load(COW_NECK_PAINT),renderer);
 if(profile.id==='rabbit')options.paintLayers=rabbitPaintLayers(await load(RABBIT_CLOTH_PAINT),renderer,await load(RABBIT_EYE_PAINT));
 if(profile.id==='dog')options.paintLayers=dogMotionPaint(await load(DOG_CLOTH_PAINT),renderer,await load(DOG_EYE_PAINT));
 if(profile.id==='sheep')options.paintLayers=sheepPaintLayers(renderer,worker,[await load(base+'sheep-underlay-paint-v1.png')],profile.frame);
 if(profile.id==='hen')options.paintLayers=henPaintLayers(renderer,worker,await Promise.all(['hen-underlay-paint-v1.png','hen-tail-paint-v1.png'].map(f=>load(base+f))),profile.frame);
 if(profile.id==='pig-foreman')options.earTexture=await load('../assets/characters/model-references/pig-foreman-turnaround-v2.png');
 if(profile.tailPaint)options.tailTexture=await load(profile.tailPaint);
 options.paintLayers=animalMotionRepairPaint(profile,options.paintLayers);
 const paint=createModelPaint(renderer,worker,main,options),dispose=paint.dispose;
 paint.dispose=()=>{dispose();textures.forEach(t=>t.dispose());};return paint;
}
