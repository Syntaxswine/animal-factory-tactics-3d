// Explicit, reproducible changes to the pinned dependency. Never edit core/.
export const clockOverrides={
 'connections.js':'Require neighboring authored doors to agree on lock difficulty.',
 'inventory.js':'Support carried tools, stack merging and their weight.',
 'blocks.js':'Preserve authored door locks across block extraction and placement.',
 'progression.js':'Use canonical 1-100 stats and derived resources for opted-in characters.',
 'explosives.js':'Use physical tower heights, weapon skills and endurance-aware explosive previews.',
 'maps.js':'Validate donkey guide outfits, cliff tiles, tower lookouts, locks and fixture condition; enforce locked-door traversal.',
 'projectiles.js':'Trace open tower windows, elevated occupants and welded cliff surfaces.',
 'environment.js':'Register authored light and cliff footprints and collision rules.',
 'editor-model.js':'Preserve donkey guide outfits and allow supported cliff tiles at water edges.',
 'engine.js':'Use shared timing, opt-in 3D awareness, stats, stamina and authored door locks.',
 'world.js':'Use the shared clock, one-minute completed rounds, and exploration pacing.'
};
function once(source,from,to){if(source.split(from).length!==2)throw Error('Clock adapter anchor changed: '+from.slice(0,100));return source.replace(from,to);}
export function adaptCoreClock(name,data){
 if(!clockOverrides[name])return data;
 let s=data.toString();
 if(name==='environment.js'){return Buffer.from("import {CLIFF_PROPS} from '../cliff-map.js';\nimport {LIGHT_PROPS} from '../light-sources.js';\n"+s+'\nObject.assign(PROPS,LIGHT_PROPS,CLIFF_PROPS);\n');}
 if(name==='editor-model.js'){
  s=once(s,"if(options.outfit==='red-hats')next.outfit='red-hats';","if(options.outfit==='red-hats'||next.species==='donkey'&&options.outfit==='blue-hawaiian')next.outfit=options.outfit;");
  s="import {isCliff} from '../cliff-map.js';\n"+s;
  s=once(s,'!floorTerrain(terrainAt(m,q.x,q.y,q.z))||propAt(m,q.x,q.y,q.z)',"!(floorTerrain(terrainAt(m,q.x,q.y,q.z))||isCliff(p)&&terrainAt(m,q.x,q.y,q.z)==='water')||propAt(m,q.x,q.y,q.z)");
  return Buffer.from(s);
 }
 if(name==='maps.js'){
  s=once(s,"!['normal','red-hats'].includes(g.outfit)","!['normal','red-hats'].includes(g.outfit)&&!(g.species==='donkey'&&g.outfit==='blue-hawaiian')");
  s="import {isCliff,cliffMapErrors} from '../cliff-map.js';\n"+s;
  s=once(s,'const propPositions=new Set();',"errors.push(...cliffMapErrors(raw));const propPositions=new Set();");
  s=once(s,'!floorTerrain(terrainAt(raw,q.x,q.y,q.z))',"!(floorTerrain(terrainAt(raw,q.x,q.y,q.z))||isCliff(p)&&terrainAt(raw,q.x,q.y,q.z)==='water')");
  s=once(s," if(!raw.edges||", " if(raw.edgeLocks!==undefined&&(!raw.edgeLocks||typeof raw.edgeLocks!=='object'||Array.isArray(raw.edgeLocks)))return [...errors,'Invalid door locks.'];\n for(const [key,value]of Object.entries(raw.edgeLocks||{}))if(!EDGES[raw.edges?.[key]]?.opensTo||!Number.isInteger(value)||value<1||value>100)return [...errors,'Door locks require closed doors and difficulty 1-100.'];\n for(const p of raw.props||[])if(p.condition!==undefined&&(!Number.isInteger(p.condition)||p.condition<0||p.condition>100))return [...errors,'Fixture condition must be 0-100.'];\n if(!raw.edges||");
  s=once(s,'if(!next)return false;m.edges[k]=next;', 'if(!next||m.edgeLocks?.[k])return false;m.edges[k]=next;');
  s=once(s,'||EDGES[m.edges?.[edgeBetween(p,b)]]?.opensTo)', '||EDGES[m.edges?.[edgeBetween(p,b)]]?.opensTo&&!m.edgeLocks?.[edgeBetween(p,b)])');
  s="import {towerForUnit,towerEntry} from '../tower-geometry.js';\n"+s;
  s=once(s,"if(!passable(raw,p))errors.push(`Unit start needs a walkable floor at ${k}.`);", "if(p.towerPost?!towerForUnit(raw,p):!passable(raw,p))errors.push(`Unit start needs a walkable floor or valid tower post at ${k}.`);");
  s=once(s,'missing=reachedTargets(raw,targets)', 'missing=reachedTargets({...raw,edgeLocks:{}},targets)');
  s=once(s,'const targets=[...raw.starts,...raw.guards,...raw.exits],','const targets=[...raw.starts,...raw.guards,...raw.exits].map(p=>towerForUnit(raw,p)?towerEntry(towerForUnit(raw,p)):p),');
  return Buffer.from(s);
 }
 if(name==='connections.js'){
  s=once(s,"out[y+':'+z]=v;","out[y+':'+z]=v+'|'+(d.edgeLocks?.[k]||0);");
  s=once(s,"out[x+':'+z]=v;","out[x+':'+z]=v+'|'+(d.edgeLocks?.[k]||0);");
  return Buffer.from(s);
 }
 if(name==='inventory.js'){

  s="import {TOOLS} from '../inventory-tools.js';\n"+s;
  s=once(s,"i.type==='weapon'?(WEIGHT[i.kind]||0):i.count*.03", "i.type==='weapon'?(WEIGHT[i.kind]||0):i.type==='tool'?(TOOLS[i.kind]?.weight||0)*i.count:i.count*.03");
  s=once(s,"if(item.type==='ammo'&&u.pack.some(i=>i.type==='ammo'&&i.kind===item.kind))return true;", "if(['ammo','tool'].includes(item.type)&&u.pack.some(i=>i.type===item.type&&i.kind===item.kind))return true;");
  s=once(s,"const existing=u.pack.find(i=>i.type==='ammo'&&i.kind===item.kind)","const existing=u.pack.find(i=>i.type===item.type&&i.kind===item.kind)");
  return Buffer.from(s);
 }
 if(name==='blocks.js'){
  s=once(s,'retained[k]=v;',"if(d.edges[local]!==undefined&&(d.edgeLocks?.[local]||0)!==(m.edgeLocks?.[k]||0))throw Error('Shared door lock conflicts with the neighboring block.');retained[k]=v;");
  s=once(s,'if(m.blockConnections?.[sx',"if(m.edgeLocks){d.edgeLocks={};for(const [key,value]of Object.entries(m.edgeLocks)){const [axis,a,b,z]=key.split(':');const local=edgeKey(axis,Number(a)-x,Number(b)-y,Number(z||0));if(d.edges[local])d.edgeLocks[local]=value;}}if(m.blockConnections?.[sx");
  s=once(s,'for(const [k,v]of Object.entries(d.edges)){',"if(d.edgeLocks){m.edgeLocks||={};for(const [key,value]of Object.entries(d.edgeLocks)){const [axis,a,b,z]=key.split(':');m.edgeLocks[edgeKey(axis,Number(a)+x,Number(b)+y,Number(z||0))]=value;}}for(const [k,v]of Object.entries(d.edges)){");
  s=once(s,'const out=structuredClone(m);',"const out=structuredClone(m);if(out.edgeLocks)for(const key of Object.keys(out.edgeLocks))if(edgeCells(key).some(p=>inside(p,x,y)))delete out.edgeLocks[key];");
  s=once(s,'Object.assign(out.edges,retained);',"Object.assign(out.edges,retained);for(const key of Object.keys(retained))if(m.edgeLocks?.[key]){out.edgeLocks||={};out.edgeLocks[key]=m.edgeLocks[key];}");
  return Buffer.from(s);
 }
 if(name==='progression.js'){
  s="import {refreshStats,trainStat} from '../character-stats.js';\n"+s;
  s=once(s,'export function recalculate(u){','export function recalculate(u){if(u.stats){refreshStats(u);return;}');
  s=once(s,'export function train(u,skill){','export function train(u,skill){if(u.stats)return trainStat(u,skill);');
  return Buffer.from(s);
 }
 if(name==='explosives.js'){
  s="import {weaponAccuracy,damageAfterResistance} from '../character-stats.js';\n"+s;
  s=once(s,'a.accuracy-Math.max','weaponAccuracy(a)-Math.max');
  s=once(s,'damage:w.damage,zone:', 'damage:damageAfterResistance(target,w.damage),rawDamage:w.damage,zone:');
  s="import {unitBaseHeight} from '../tower-geometry.js';\n"+s;
  s=once(s,'height=levelOf(a)-levelOf(target)','height=(unitBaseHeight(a)-unitBaseHeight(target))/3');
  for(const unit of ['a','target','u'])s=s.replaceAll(`levelOf(${unit})*3`, `unitBaseHeight(${unit})`);
  s=once(s,'z:impact.z,radius,destroyed','z:impact.z,h:impact.h,radius,destroyed');
  return Buffer.from(s);
 }
 if(name==='projectiles.js'){
  s="import {cliffRayHit} from '../cliff-map-geometry.js';\nimport {unitBaseHeight,towerRayHit} from '../tower-geometry.js';\n"+s;
  s=s.replace(/levelOf\((unit|nearest|shooter|target)\)\*3/g,(_,u)=>`unitBaseHeight(${u})`);
  s=once(s,' // Exact grid/level crossings'," const hits=[towerRayHit(state.props,origin,d,limit),cliffRayHit(state.props,origin,d,limit)].filter(t=>t!==null),terrainHit=hits.length?Math.min(...hits):null;if(terrainHit!==null&&terrainHit<limit){limit=terrainHit;nearest=null;}\n // Exact grid/level crossings");
  s=once(s," if(nearest){const result=impact('unit'", " if(terrainHit!==null&&limit===terrainHit)return impact('cover',limit);\n if(nearest){const result=impact('unit'");
  return Buffer.from(s);
 }
 if(name==='engine.js'){
  s="import {starterTools} from '../inventory-tools.js';\n"+s;
  s=once(s,'levelOf(u)===levelOf(p)&&Math.abs(u.x-p.x)', 'levelOf(u)===levelOf(p)&&Math.abs(unitBaseHeight(u)-unitBaseHeight(p))<.1&&Math.abs(u.x-p.x)');
  s=once(s,'body:u.id,searched:false,items:rollLoot(s,u)', 'body:u.id,...(u.towerPost?{towerPost:structuredClone(u.towerPost)}:{}),searched:false,items:rollLoot(s,u)');
  s="import {spendStamina,spendMovement,canMoveStamina,recoverStamina} from '../stamina.js';\n"+s;
  s=once(s,'edges:{...definition.edges},','edges:{...definition.edges},edgeLocks:structuredClone(definition.edgeLocks||{}),');
  s=once(s,"if(s.phase==='player'&&path[0].cost>u.ap)","if(!canMoveStamina(u,path[0])||s.phase==='player'&&path[0].cost>u.ap)");
  s=once(s,'if(!canControl(s,u)||!currentStep||occupant', 'if(!canControl(s,u)||!currentStep||!canMoveStamina(u,currentStep)||occupant');
  s=once(s,'if(!valid||occupant', 'if(!valid||!canMoveStamina(u,valid)||occupant');
  s=s.replaceAll('openDoorBetween(s,u,step);u.heading', 'spendMovement(u,step);openDoorBetween(s,u,step);u.heading');
  s=once(s,'function stepTo(s,g,p){g.heading','function stepTo(s,g,p){spendMovement(g,p);g.heading');
  s=once(s,'function newRound(s){finishFireRound(s);','function newRound(s){recoverStamina(s,1,{combat:true});finishFireRound(s);');
  s=once(s,'if(!reaction&&combatCosts(s))a.ap-=p.cost;',"spendStamina(a,WEAPONS[a.weapon].mag?2:6);if(!reaction&&combatCosts(s))a.ap-=p.cost;");
  s="import {initializeStats,weaponAccuracy,damageAfterResistance} from '../character-stats.js';\n"+s;
  s=once(s,"if(detect)refresh(s);log(s,", "if(options.statSystem){s.rules.statSystem=true;for(const u of s.units){const source=u.team==='guard'?definition.guards[u.id-s.units.filter(v=>v.team==='squad').length]:definition.starts[u.id],authored={...(u.team==='squad'?options.cast?.[u.id]?.stats:{}),...source?.stats};if(Number.isFinite(source?.perception)&&!Number.isFinite(authored.perception))authored.perception=source.perception;initializeStats(u,authored);starterTools(u);}}\n if(detect)refresh(s);log(s,");
  s=once(s,'s.units.push(u);return u;', 'if(s.rules?.statSystem)initializeStats(u);s.units.push(u);return u;');
  s=once(s,'a.accuracy+(melee?10:0)','weaponAccuracy(a)+(melee?10:0)');
  s=once(s,'damage:Math.round(weaponDamage(w,range)*aim.damage)', 'damage:damageAfterResistance(b,Math.round(weaponDamage(w,range)*aim.damage)),rawDamage:Math.round(weaponDamage(w,range)*aim.damage)');
  s=once(s,'for(const {unit:victim,damage:amount,zone:pelletZone}of impacts){','for(const {unit:victim,damage:rawAmount,zone:pelletZone}of impacts){const amount=damageAfterResistance(victim,rawAmount);');
  s=once(s,"u.weapon=id;if(id==='flamethrower')", "u.weapon=id;if(u.stats)u.accuracy=weaponAccuracy(u);if(id==='flamethrower')");
  s="import {shotAim} from '../aim-levels.js';\n"+s;
  s=once(s,"zone='torso',token=null){","zone='torso',token=null,aimLevel='hip'){");
  s=once(s," const aim=AIM_ZONES[zone];"," const aiming=shotAim(WEAPONS[a.weapon],aimLevel,burst);if(!aiming)return {ok:false,reason:'Choose an aim level'};\n const aim=AIM_ZONES[zone];");
  s=once(s,"cost=w.cost+(rounds>1?2:0)","cost=aiming.cost");
  s=once(s,"(w.accuracy||0)+aim.accuracy","(w.accuracy||0)+aim.accuracy+aiming.accuracy");
  s=once(s,"reason,cost,rounds,chance:Math.round(chance)","reason,cost,rounds,aimLevel:aiming.level,chance:Math.round(chance)");
  s=once(s,"zone='torso',reaction=false){","zone='torso',reaction=false,aimLevel='hip'){");
  s=once(s,"a,b,burst,zone);if(!p.ok)","a,b,burst,zone,null,reaction?'hip':aimLevel);if(!p.ok)");

  s=once(s,',ROUND_MINUTES=10,',',');
  s=once(s,'export function movementNeighbors(s,u,p=u,stairs){','export function movementNeighbors(s,u,p=u,stairs){if(towerForUnit(s,u))return [];');
  s=once(s,'export function pathTo(s,u,x,y,z=levelOf(u)){','export function pathTo(s,u,x,y,z=levelOf(u)){if(towerForUnit(s,u))return null;');
  s=once(s,'export function boundedRoute(s,g,goals,budget){','export function boundedRoute(s,g,goals,budget){if(towerForUnit(s,g))return null;');
  s=once(s,'function placeAt(s,g,p){','function placeAt(s,g,p){if(towerForUnit(s,g))return false;');
  s=once(s,'if(inBounds(x,y,z)&&Math.hypot(x-wearer.x,y-wearer.y)<=5', 'if(!wearer.towerPost&&inBounds(x,y,z)&&Math.hypot(x-wearer.x,y-wearer.y)<=5');
  s=once(s,'levelOf(u)===z&&Math.max(Math.abs(u.x-wearer.x)', 'levelOf(u)===z&&Math.abs(unitBaseHeight(u)-unitBaseHeight(wearer))<=1&&Math.max(Math.abs(u.x-wearer.x)');
  s=once(s,'if(levelOf(u)===z&&Math.hypot(u.x-wearer.x,u.y-wearer.y)<=5)ignite(s,u);','if(levelOf(u)===z&&Math.hypot(u.x-wearer.x,u.y-wearer.y,unitBaseHeight(u)-unitBaseHeight(wearer))<=5)ignite(s,u);');
  s=once(s,'return {x:wearer.x,y:wearer.y,z:levelOf(wearer)};', 'return {x:wearer.x,y:wearer.y,z:levelOf(wearer),h:unitBaseHeight(wearer)+.8};');
  s=once(s,'(levelOf(a)-levelOf(b))*3' ,'unitBaseHeight(a)-unitBaseHeight(b)');
  s=once(s,'levelOf(a)*3+eyeHeight(a)','unitBaseHeight(a)+eyeHeight(a)');
  s=once(s,'levelOf(b)*3+(b.hp===undefined','unitBaseHeight(b)+(b.hp===undefined');
  s="import {towerForUnit,unitBaseHeight,TOWER_HEIGHT} from '../tower-geometry.js';\nimport {updateAwareness,awarenessPerception} from '../awareness.js';\n"+s;
  s=once(s,'s.rules={social:!!options.social,rosterSeed};','s.rules={social:!!options.social,awareness:!!options.awareness,rosterSeed};');
  s=once(s,'export function perceive(s,a,b){','export function geometricPerceive(s,a,b){');
  s=once(s,'export const glimpsed=', 'export function perceive(s,a,b){return awarenessPerception(s,a,b,geometricPerceive(s,a,b),visibleZones);}\nexport const glimpsed=');
  s=once(s,'export function notices(s,a,b){','export function notices(s,a,b){\n if(s.rules?.awareness)return canSee(s,a,b);');
  s=once(s,'s.glimpses[g.id]={x:g.x,y:g.y,z:levelOf(g)};', 's.glimpses[g.id]=s.rules?.awareness?approximate(g):{x:g.x,y:g.y,z:levelOf(g)};');
  s=once(s,'if(detect)refresh(s);', "if(s.rules.awareness)for(const u of s.units){const source=u.team==='guard'?definition.guards[u.id-s.units.filter(v=>v.team==='squad').length]:definition.starts[u.id];if(source?.towerPost)u.towerPost=structuredClone(source.towerPost);u.perception=u.stats?u.stats.perception:Number.isFinite(source?.perception)?Math.max(0,Math.min(100,source.perception)):50;}\n if(detect)refresh(s);");
  s=once(s,'s.contacts[g.id]={x:g.x,y:g.y,z:levelOf(g)};', 's.contacts[g.id]={x:g.x,y:g.y,z:levelOf(g),...(g.towerPost?{towerElevation:TOWER_HEIGHT}:{})};');
  s=once(s,'Math.round(u.y/6)*6)),z:levelOf(u)});','Math.round(u.y/6)*6)),z:levelOf(u),...(u.towerPost?{towerElevation:TOWER_HEIGHT}:{})});');
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
