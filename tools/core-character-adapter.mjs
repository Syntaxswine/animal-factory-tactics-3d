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
  s=once(s,`export function notices(s,a,b){`,`export function notices(s,a,b){if(a.team==='guard'&&b.team==='squad'&&!playerThreat(s,a))return false;`);
  s=once(s,'export function threatens(s,g){','export function threatens(s,g){if(!playerThreat(s,g))return false;');
  s=once(s,'if(!guards(s).length&&!pending)', 'if(!guards(s).some(g=>playerThreat(s,g))&&!pending&&!s.engaged)');
  s=once(s,'!oldDetected.has(id))','!oldDetected.has(id)&&playerThreat(s,unit(s,id)))');
  s=once(s,'guards(s).filter(active)', 'guards(s).filter(g=>playerThreat(s,g)&&active(g))');
  s=once(s,'guards(s).some(g=>g.alert&&threatens(s,g))', 'guards(s).some(g=>playerThreat(s,g)&&g.alert&&threatens(s,g))');
  s=once(s,'export function setState(s,g,state,fix=null,{swept=false,quiet=false}={}){',   'export function setState(s,g,state,fix=null,{swept=false,quiet=false}={}){if(g.character){if(combatBehavior(g)!=="fight"&&state!=="rest"){g.threat=fix||g.threat||g.lastKnown;g.state=combatBehavior(g)==="flee"?"broken":"cowering";g.alert=false;g.overwatch=null;if(combatBehavior(g)==="cower")g.stance="kneeling";return;}if(!hostileToPlayer(s,g)&&state!=="rest")return;}');
  s=once(s,'function targeted(s,b,a){','function targeted(s,b,a){provokeCharacter(s,b,a);');
  s=once(s,'function combatDamage(s,u,damage,fatal=false,source=null){','function combatDamage(s,u,damage,fatal=false,source=null){provokeCharacter(s,u,source);');
  s=once(s,`if(g.team!=='guard'||!alive(g)||g.burningTurns>0||!active(g)||g.ap<1)`, `if(g.team==='guard'&&alive(g)&&!g.burningTurns&&combatBehavior(g)!=='fight'){civilianStep(s,g,true);s.enemyIndex++;refresh(s);return true;}if(g.team!=='guard'||!playerThreat(s,g)||!alive(g)||g.burningTurns>0||!active(g)||g.ap<1)`);
  s=once(s,`if(g.burningTurns)continue;const st=stateOf(g);if(st==='rest')continue;`, `if(g.burningTurns)continue;if(combatBehavior(g)!=='fight'){acted=civilianStep(s,g,false)||acted;continue;}if(!playerThreat(s,g))continue;const st=stateOf(g);if(st==='rest')continue;`);
  s=once(s,'export function resolveOverwatch(s,g){','export function resolveOverwatch(s,g){if(!playerThreat(s,g))return;');
  s=once(s,'const p=previewAttack(s,reaction?', 'if(byAI&&!playerThreat(s,a))return false;const p=previewAttack(s,reaction?');
  s+='\nfunction civilianStep(s,g,turn){if(!g.threat)return false;if(combatBehavior(g)==="cower"){g.stance="kneeling";g.overwatch=null;if(turn)g.ap=0;return false;}let moved=false;for(let n=0;n<(turn?Math.ceil(g.maxAp):1);n++){const p=fleeStep(s,g);if(!p||turn&&p.cost>g.ap)break;stepTo(s,g,p);if(turn)g.ap-=p.cost;moved=true;}if(turn)g.ap=0;return moved;}\n';

 }
 return Buffer.from(s);
}
