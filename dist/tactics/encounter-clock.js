import {createClock,mapStartMinutes,elapsedGameMinutes,advanceClock,observeRoundTime,turnBased} from './game-clock.js';
import {settleMorale,settleContracts} from './core/world.js';

export function startEncounterClock(state){state.clock=createClock(mapStartMinutes(state.definition));observeRoundTime(state.clock,state);return state.clock;}
export function settleEncounterRounds(state){return advanceEncounterTime(state,observeRoundTime(state.clock,state));}
function advanceEncounterTime(state,delta){
 const minutes=advanceClock(state.clock,delta);
 if(minutes){const context={clock:state.clock,current:'encounter'};settleMorale(context,state,minutes);settleContracts(context,state);}
 return minutes;
}
export function tickEncounterClock(state,elapsedMs,{paused=false}={}){
 if(paused)return 0;
 const rounds=settleEncounterRounds(state);
 return rounds+(state.phase==='lost'||turnBased(state)?0:advanceEncounterTime(state,elapsedGameMinutes(elapsedMs)));
}
