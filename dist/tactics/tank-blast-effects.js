// Compatibility entry point for the approved worn-tank study.
export {PAINTED_BURST_ATLAS as TANK_BURST_ATLAS,localFireCells} from './painted-blast-effects.js';
import {createPaintedBlastEffects} from './painted-blast-effects.js';
export function createTankBlastEffects(scene,loader,origin){
 return createPaintedBlastEffects(scene,loader,origin,{name:'Worn fuel pack rupture'});
}
