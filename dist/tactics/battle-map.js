import {parseMap} from './core/maps.js';

// The authored sprite-game map, not the small factoryMap() training template.
export async function loadBattleMap(fetcher=fetch){
 const response=await fetcher(new URL('./default-factory.json',import.meta.url),{cache:'no-store'});
 if(!response.ok)throw Error('Authored factory map could not load (HTTP '+response.status+'). Reload to retry.');
 return parseMap(await response.text());
}
