import {bearRosterFixture} from './bear-roster-fixture.js';
import {hasFittedEquipment} from './fitted-character-roster.js';

// A repeatable equipment and traversal range; authored campaign casts are
// unaffected. The editor can save and Playtest this through its normal path.
export function characterRosterFixture(species='bull'){
 if(!hasFittedEquipment(species))throw Error('Unknown fitted character '+species);
 const map=bearRosterFixture();map.name=species[0].toUpperCase()+species.slice(1)+' range · weapons, stances and traversal';
 for(const p of [...map.starts,...map.guards])p.species=species;
 map.guards.forEach((p,i)=>p.character.id='char_'+species+'_range_'+i);
 return map;
}
