// Character identity, editable properties and NPC behavior extension to the pinned 3D core.
export const characterOverrides={'maps.js':'Validate character identities and data-only hooks.','editor-model.js':'Assign permanent identities at character creation.','blocks.js':'Preserve and remap character links on block duplication.','engine.js':'Apply character identity, allegiance, hostility and noncombatant reactions during playtesting.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Character adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreCharacters(name,data){let s=data.toString();
 if(name==='maps.js'){
  s="import {characterErrors} from '../character-properties.js';\n"+s;
  s=once(s,'const positions=new Set();',"errors.push(...characterErrors(raw));for(const p of raw.starts)if(p.species!==undefined&&!SPECIES.includes(p.species)||p.weapon!==undefined&&!WEAPON_IDS.includes(p.weapon)||p.outfit!==undefined&&!['normal','red-hats'].includes(p.outfit)&&!(p.species==='donkey'&&p.outfit==='blue-hawaiian'))errors.push('Unsupported squad appearance or weapon.');const positions=new Set();");
 }else if(name==='editor-model.js'){
  s="import {ensureCharacterIdentities,characterDefaults} from '../character-properties.js';\n"+s;
  s=once(s,'map:structuredClone(map),undo:[]','map:ensureCharacterIdentities(structuredClone(map)),undo:[]');
  s=once(s,'editor.map=structuredClone(map);','editor.map=ensureCharacterIdentities(structuredClone(map));');
  s=once(s,'m.starts[id]={x,y,z};','m.starts[id]={...m.starts[id],x,y,z};delete m.starts[id].towerPost;');
  s=once(s,'else m.guards.push(next);',"else {next.character=characterDefaults('guards',options.category||'combat');m.guards.push(next);}");
 }else if(name==='blocks.js'){
  s="import {copyBlockCharacters,mergeCharacterResources} from '../character-properties.js';\n"+s;
  s=once(s,"d.connections=structuredClone(m.blockConnections[sx+','+sy]);return d;", "d.connections=structuredClone(m.blockConnections[sx+','+sy]);if(m.characterResources)d.characterResources=structuredClone(m.characterResources);return d;");
  s=once(s,'export function applyData(m,d,x,y){','export function applyData(m,d,x,y,remap=false){if(remap)d=copyBlockCharacters(d,m);mergeCharacterResources(m,d);');
  s=once(s,'applyData(out,d,x,y);','applyData(out,d,x,y,true);');
 }else if(name==='engine.js'){
  s="import {applyRuntimeCharacter,combatBehavior,hostileToPlayer,playerThreat,provokeCharacter} from '../character-properties.js';\n"+s;
  s=once(s,"definition.starts.forEach((p,i)=>{if(cast[i])add('squad',cast[i][0],cast[i][1],p.x,p.y,cast[i][2],levelOf(p));});", "definition.starts.forEach((p,i)=>{if(cast[i]){add('squad',cast[i][0],p.species||cast[i][1],p.x,p.y,p.weapon||cast[i][2],levelOf(p));if(p.outfit)s.units.at(-1).outfit=p.outfit;applyRuntimeCharacter(s.units.at(-1),p);}});");
  s=once(s,"if(g.outfit)s.units.at(-1).outfit=g.outfit;","applyRuntimeCharacter(s.units.at(-1),g);if(g.outfit)s.units.at(-1).outfit=g.outfit;");
  s=once(s,"export function previewAttack(s,a,b,burst=false,zone='torso',token=null,aimLevel='hip'){","export function previewAttack(s,a,b,burst=false,zone='torso',token=null,aimLevel='hip'){if(a?.team==='guard'&&!playerThreat(s,a))return {ok:false,reason:'Character does not fight the player'};");
  s=once(s,`export function notices(s,a,b){`,`export function notices(s,a,b){if(a.team==='guard'&&b.team==='squad'&&!playerThreat(s,a)&&!(combatBehavior(a)!=='fight'&&(s.engaged||['player','enemy'].includes(s.phase))))return false;`);
  s=once(s,'function refreshNow(s){', 'function refreshNow(s){settleCivilianFear(s);');
  s=once(s,'export function stepInvestigation(s){',"export function stepInvestigation(s){if(['explore','won'].includes(s.phase)&&!s.engaged&&!s.fires?.length&&!guards(s).some(g=>playerThreat(s,g)&&active(g)))for(const g of guards(s))if(g.npcFrightened)g.npcFearTicks=Math.max(0,(g.npcFearTicks||0)-1);settleCivilianFear(s);");
  s=once(s,'export function threatens(s,g){','export function threatens(s,g){if(!playerThreat(s,g))return false;');
  s=once(s,'if(!guards(s).length&&!pending)', 'if(!guards(s).some(g=>playerThreat(s,g))&&!pending&&!s.engaged)');
  s=once(s,'!oldDetected.has(id))','!oldDetected.has(id)&&playerThreat(s,unit(s,id)))');
  s=once(s,'guards(s).filter(active)', 'guards(s).filter(g=>playerThreat(s,g)&&active(g))');
  s=once(s,'guards(s).some(g=>g.alert&&threatens(s,g))', 'guards(s).some(g=>playerThreat(s,g)&&g.alert&&threatens(s,g))');
  s=once(s,'export function setState(s,g,state,fix=null,{swept=false,quiet=false}={}){',   'export function setState(s,g,state,fix=null,{swept=false,quiet=false}={}){if(g.character){if(combatBehavior(g)!=="fight"&&state!=="rest"){if(!g.npcFrightened&&!["alert","broken"].includes(state))return;g.npcFrightened=true;g.npcFearTicks=ALERT_ROUNDS*REALTIME_ROUND_TICKS;g.threat=fix||g.threat||g.lastKnown;g.state=combatBehavior(g)==="flee"||g.civilianFlee?"broken":"seeking-cover";g.alert=false;g.overwatch=null;return;}if(!hostileToPlayer(s,g)&&state!=="rest")return;}');
  s=once(s,'function targeted(s,b,a){','function targeted(s,b,a){provokeCharacter(s,b,a);');
  s=once(s,'injuryStrain(u,before-u.hp);','injuryStrain(u,before-u.hp);if(u.team==="guard"&&combatBehavior(u)!=="fight"&&before>u.hp){u.npcFrightened=true;u.npcFearTicks=ALERT_ROUNDS*REALTIME_ROUND_TICKS;u.civilianFlee=true;if(source)u.threat={x:source.x,y:source.y,z:levelOf(source)};}');
  s=once(s,'function combatDamage(s,u,damage,fatal=false,source=null){','function combatDamage(s,u,damage,fatal=false,source=null){provokeCharacter(s,u,source);');
  s=once(s,`if(g.team!=='guard'||!alive(g)||g.burningTurns>0||!active(g)||g.ap<1)`, `if(g.team==='guard'&&alive(g)&&!g.burningTurns&&combatBehavior(g)!=='fight'){civilianStep(s,g,true);s.enemyIndex++;refresh(s);return true;}if(g.team!=='guard'||!playerThreat(s,g)||!alive(g)||g.burningTurns>0||!active(g)||g.ap<1)`);
  s=once(s,`if(g.burningTurns)continue;const st=stateOf(g);if(st==='rest')continue;`, `if(g.burningTurns)continue;if(combatBehavior(g)!=='fight'){acted=civilianStep(s,g,false)||acted;continue;}if(!playerThreat(s,g))continue;const st=stateOf(g);if(st==='rest')continue;`);
  s=once(s,'export function resolveOverwatch(s,g){','export function resolveOverwatch(s,g){if(!playerThreat(s,g))return;');
  s=once(s,'const p=previewAttack(s,reaction?', 'if(byAI&&!playerThreat(s,a))return false;const p=previewAttack(s,reaction?');
  s+=`
function settleCivilianFear(s){
 if(!['explore','won'].includes(s.phase)||s.engaged||s.fires?.length||guards(s).some(g=>playerThreat(s,g)&&active(g)))return;
 for(const g of guards(s))if(g.npcFrightened&&(g.npcFearTicks||0)<=0){g.npcFrightened=false;g.civilianFlee=false;g.threat=null;g.lastKnown=null;g.lastHeard=null;g.state='rest';g.alert=false;}
}
// Bounded local search: prefer nearby cover that screens the known threat.
function civilianCoverStep(s,g){
 const origin={...g,stance:'standing'},open=[{p:origin,cost:0,first:null}],seen=new Map([[key(g.x,g.y,levelOf(g)),0]]);let best=null,visited=0;
 while(open.length&&visited++<256){open.sort((a,b)=>b.cost-a.cost);const node=open.pop(),p=node.p;
  if(coverAgainst(s,g.threat,p)){
   const score=node.cost+(lineOfSight(s,g.threat,{...g,...p,stance:'kneeling'})?6:0);
   if(!best||score<best.score)best={...node,score};
  }
  if(node.cost>=24)continue;
  for(const q of movementNeighbors(s,origin,p)){if(levelOf(q)!==levelOf(g)||occupant(s,q.x,q.y,levelOf(q))||onFire(s,q))continue;
   const cost=node.cost+q.cost,k=key(q.x,q.y,levelOf(q));if(cost>24||cost>=(seen.get(k)??Infinity))continue;
   seen.set(k,cost);open.push({p:q,cost,first:node.first||q});
  }
 }
 return best;
}
function civilianStep(s,g,turn){
 if(!g.threat)return false;
 let changed=false;g.overwatch=null;
 for(let n=0;n<(turn?Math.ceil(g.maxAp):1);n++){
 const close=s.units.filter(u=>u!==g&&alive(u)&&levelOf(u)===levelOf(g)&&distance(g,u)<=10&&lineOfSight(s,g,u)).sort((a,b)=>distance(g,a)-distance(g,b))[0];
 if(close){g.civilianFlee=true;g.threat={x:close.x,y:close.y,z:levelOf(close)};}
 const flee=combatBehavior(g)==='flee'||g.civilianFlee;
  const cover=flee?null:civilianCoverStep(s,g);
  if(!flee&&cover&&!cover.first){changed||=g.stance!=='kneeling';g.stance='kneeling';g.state='cowering';break;}
  // No reachable cover: stay low rather than walking toward the danger.
  if(!flee&&!cover){changed||=g.stance!=='kneeling';g.stance='kneeling';g.state='cowering';break;}
  g.stance='standing';g.state=flee?'broken':'seeking-cover';const p=flee?fleeStep(s,g):cover.first;
  if(!p||turn&&p.cost>g.ap)break;stepTo(s,g,p);if(turn)g.ap-=p.cost;changed=true;
 }
 if(turn)g.ap=0;return changed;
}
`;

 }
 return Buffer.from(s);
}
