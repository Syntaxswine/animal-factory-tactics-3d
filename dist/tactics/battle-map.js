import {wallXrayFixture} from './wall-xray-fixture.js';
import {parseMap} from './core/maps.js';
import {receivePlaytest} from './editor-playtest.js';

// The authored sprite-game map, not the small factoryMap() training template.
export async function loadBattleMap(fetcher=fetch){
 const token=globalThis.location?new URLSearchParams(location.search).get('editorPlaytest'):null;
 if(token)return receivePlaytest(token);
 if(globalThis.location&&new URLSearchParams(location.search).get('study')==='wall-xray')return wallXrayFixture();
 const response=await fetcher(new URL('./default-factory.json',import.meta.url),{cache:'no-store'});
 if(!response.ok)throw Error('Authored factory map could not load (HTTP '+response.status+'). Reload to retry.');
 return parseMap(await response.text());
}
