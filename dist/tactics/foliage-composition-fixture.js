import {foliageDensityFixture} from './foliage-density-fixture.js';
import {buildFoliageObstacles} from './foliage-obstacles.js';

export const FOLIAGE_TREE_MIXES=Object.freeze({current:'Brush-led · current',mixed:'Mixed canopy',trees:'Tree-led'});

// An art comparison, not a new saved-map density rule. The map stays identical
// across mixes; the private obstacle set supplies both tree art and tree cover.
export function foliageCompositionFixture(family='temperate',mix='mixed'){
 if(!Object.hasOwn(FOLIAGE_TREE_MIXES,mix))throw Error('Unknown foliage composition');
 const map=foliageDensityFixture(family,100,'thicket');
 return {map,obstacles:buildFoliageObstacles(map,{denseTreeMix:mix})};
}
