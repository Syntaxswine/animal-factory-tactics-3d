// Explicit, reproducible changes to the pinned dependency. Never edit core/.
export const clockOverrides={
 'engine.js':'Use shared round timing and opt-in 3D exposure-based awareness.',
 'world.js':'Use the shared clock, one-minute completed rounds, and exploration pacing.'
};
function once(source,from,to){if(source.split(from).length!==2)throw Error('Clock adapter anchor changed: '+from.slice(0,100));return source.replace(from,to);}
export function adaptCoreClock(name,data){
 if(!clockOverrides[name])return data;
 let s=data.toString();
 if(name==='engine.js'){
  s=once(s,',ROUND_MINUTES=10,',',');
  s="import {updateAwareness,awarenessPerception} from '../awareness.js';\n"+s;
  s=once(s,'s.rules={social:!!options.social,rosterSeed};','s.rules={social:!!options.social,awareness:!!options.awareness,rosterSeed};');
  s=once(s,'export function perceive(s,a,b){','export function geometricPerceive(s,a,b){');
  s=once(s,'export const glimpsed=', 'export function perceive(s,a,b){return awarenessPerception(s,a,b,geometricPerceive(s,a,b));}\nexport const glimpsed=');
  s=once(s,'export function notices(s,a,b){','export function notices(s,a,b){\n if(s.rules?.awareness)return canSee(s,a,b);');
  s=once(s,'s.glimpses[g.id]={x:g.x,y:g.y,z:levelOf(g)};', 's.glimpses[g.id]=s.rules?.awareness?approximate(g):{x:g.x,y:g.y,z:levelOf(g)};');
  s=once(s,'if(detect)refresh(s);', "if(s.rules.awareness)for(const u of s.units){const source=u.team==='guard'?definition.guards[u.id-definition.starts.length]:definition.starts[u.id];u.perception=Number.isFinite(source?.perception)?Math.max(0,Math.min(100,source.perception)):50;}\n if(detect)refresh(s);");
  s=once(s,'function refreshNow(s){','function refreshNow(s){\n updateAwareness(s,{geometry:geometricPerceive,zones:visibleZones});');

  s="import {COMBAT_ROUND_MINUTES as ROUND_MINUTES} from '../game-clock.js';\nexport {ROUND_MINUTES};\n"+s;
 }else{
  s="import {createClock,mapStartMinutes,formatClock,advanceClock,elapsedGameMinutes,observeRoundTime,turnBased} from '../game-clock.js';\nexport {PLAY_MINUTES_PER_SECOND} from '../game-clock.js';\n"+s;
  s=once(s,'TRAVEL_MINUTES=60,PLAY_MINUTES_PER_SECOND=1,','TRAVEL_MINUTES=60,');
  s=once(s,'  return {difficulty,current:', '  const world={difficulty,current:');
  s=once(s,'clock:{minutes:480,incomeRemainder:0}', 'clock:createClock(mapStartMinutes(custom))');
  s=once(s,'positions,links:linksFrom(positions)};', 'positions,links:linksFrom(positions)};observeRoundTime(world.clock,currentMap(world));return world;');
  const label=s.match(/^export function clockLabel[^\r\n]+/m)?.[0];if(!label)throw Error('Clock label anchor changed');
  s=once(s,label,'export const clockLabel=world=>formatClock(world.clock);');
  s=once(s,'world.clock.minutes+=minutes;', 'advanceClock(world.clock,minutes);');
  const tick=s.match(/export function tickWorld[\s\S]*?\n}/)?.[0];if(!tick)throw Error('Clock tick anchor changed');
  s=once(s,tick,`export function settleWorldClock(world){const s=currentMap(world),minutes=observeRoundTime(world.clock,s),income=advanceTime(world,minutes);if(minutes){settleMorale(world,s,minutes);settleContracts(world,s);}return income;}
export function tickWorld(world,elapsedMs,{paused=false}={}){
 if(paused)return 0;const roundIncome=settleWorldClock(world),s=currentMap(world);
 if(s.phase==='lost'||turnBased(s))return roundIncome;
 const minutes=elapsedGameMinutes(elapsedMs),income=advanceTime(world,minutes);if(minutes){settleMorale(world,s,minutes);settleContracts(world,s);}return roundIncome+income;
}`);
 }
 return Buffer.from(s);
}
