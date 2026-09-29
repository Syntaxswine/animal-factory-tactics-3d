import {createAnimalWindowMotion} from './animal-window-motion.js';
// Preserve the original pig-study API while sharing the roster retargeter.
export function createPigWindowMotion(worker){return createAnimalWindowMotion(worker,{id:'pig-director'});}
