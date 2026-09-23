import {STAT_DEFINITIONS} from './character-stats.js';
import {TOOLS} from './inventory-tools.js';
import {GROUNDS,EDGES,PROPS} from './core/environment.js';
import {validateMap} from './core/maps.js';
import {WEAPONS} from './core/engine.js';
import {observeRoundTime} from './game-clock.js';
export const SAVE_VERSION=1;
const fail=()=>{throw Error('This save is damaged or incomplete. Your current encounter has not been changed.');};
const terrain=new Set(['yard','floor','crate','void','water','bridge','woodland',...GROUNDS]);
const finite=n=>Number.isFinite(n)&&n>=0;
export function validateSavedState(s){
 if(!s||!s.definition||validateMap(s.definition,{connectivity:false}).length)fail();
 if(!['explore','player','enemy','won','lost'].includes(s.phase)||!Number.isInteger(s.round)||s.round<0||!finite(s.clock?.minutes)||!Number.isInteger(s.enemyIndex)||s.enemyIndex<0)fail();
 if(!Array.isArray(s.map)||s.map.length!==s.definition.height||s.map.some(r=>!Array.isArray(r)||r.length!==s.definition.width||r.some(t=>!terrain.has(t))))fail();
 for(const key of ['upper','props','stairs','climbs','units','loot','log','queue'])if(!Array.isArray(s[key]))fail();
 for(const key of ['edges','edgeLocks','rules','contacts','glimpses'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))fail();
 for(const key of ['visible','seen','detected'])if(!(s[key] instanceof Set))fail();
 if(s.alerted!==undefined&&!(s.alerted instanceof Set))fail();
 if(s.upper.length!==2||s.upper.some(layer=>!layer||typeof layer!=='object'||Array.isArray(layer)||Object.values(layer).some(t=>!terrain.has(t))))fail();
 if(Object.values(s.edges).some(v=>!EDGES[v])||s.props.some(p=>!p||!PROPS[p.kind]||![p.x,p.y,p.z??0].every(Number.isInteger)))fail();
 if(!s.units.length||s.units.length>100||new Set(s.units.map(u=>u.id)).size!==s.units.length||!s.units.some(u=>u.id===s.selected&&u.team==='squad'))fail();
 for(const u of s.units){if(!Number.isInteger(u.id)||!['squad','guard'].includes(u.team)||typeof u.name!=='string'||typeof u.species!=='string'||!WEAPONS[u.weapon]||![u.x,u.y,u.z??0].every(Number.isFinite)||![u.hp,u.maxHp,u.ap,u.maxAp].every(finite)||!Array.isArray(u.pack)||!Array.isArray(u.slots)||!u.ammo)fail();if(u.stats&&(!finite(u.stamina)||!finite(u.maxStamina)||STAT_DEFINITIONS.some(([key])=>!Number.isInteger(u.stats[key])||u.stats[key]<1||u.stats[key]>100)))fail();}
 const itemValid=i=>i&&((i.type==='weapon'&&WEAPONS[i.kind]&&finite(i.rounds))||(i.type==='ammo'&&WEAPONS[i.kind]||i.type==='tool'&&TOOLS[i.kind]||i.type==='utility'&&['medkits','wireCutters'].includes(i.kind))&&Number.isInteger(i.count)&&i.count>0);
 for(const u of s.units)if(u.pack.some(i=>!itemValid(i))||Object.values(u.ammo).some(n=>!finite(n)))fail();
 for(const p of s.loot)if(!p||!Array.isArray(p.items)||p.items.some(i=>!itemValid(i))||![p.x,p.y,p.z??0].every(Number.isFinite))fail();
 for(const key of ['seed','perceptionSeed','interactionSeed','lootSeed'])if(s[key]!==undefined&&!Number.isFinite(s[key]))fail();
 return s;
}
export function captureEncounter(state,now=Date.now()){
 const s=structuredClone(state);
 // Actions commit before their animations. Keep the result, not the presentation
 // event or unexecuted movement orders, so loading cannot replay a shot/climb.
 s.effect=null;s.queue=[];delete s.towerTraversal;delete s.shouting;delete s.sealed;
 validateSavedState(s);
 return {format:'animal-factory-tactics-3d',version:SAVE_VERSION,savedAt:now,mapName:s.definition.name,phase:s.phase,round:s.round,minutes:s.clock.minutes,state:s};
}
export function restoreEncounter(record){
 if(record?.format!=='animal-factory-tactics-3d'||record.version!==SAVE_VERSION)throw Error('This save uses an unsupported format or version.');
 const s=structuredClone(record.state);validateSavedState(s);s.effect=null;s.queue=[];delete s.towerTraversal;delete s.shouting;delete s.sealed;
 // Prime the observer without advancing time, refilling resources or recomputing awareness.
 observeRoundTime(s.clock,s);return s;
}
