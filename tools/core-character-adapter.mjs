// Data-only character identity/property extension to the pinned 3D core.
export const characterOverrides={'maps.js':'Validate character identities and data-only hooks.','editor-model.js':'Assign permanent identities at character creation.','blocks.js':'Preserve and remap character links on block duplication.','engine.js':'Expose saved character metadata and display names during playtesting.'};
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
  s="import {applyRuntimeCharacter} from '../character-properties.js';\n"+s;
  s=once(s,"definition.starts.forEach((p,i)=>{if(cast[i])add('squad',cast[i][0],cast[i][1],p.x,p.y,cast[i][2],levelOf(p));});", "definition.starts.forEach((p,i)=>{if(cast[i]){add('squad',cast[i][0],p.species||cast[i][1],p.x,p.y,p.weapon||cast[i][2],levelOf(p));if(p.outfit)s.units.at(-1).outfit=p.outfit;applyRuntimeCharacter(s.units.at(-1),p);}});");
  s=once(s,"if(g.outfit)s.units.at(-1).outfit=g.outfit;","applyRuntimeCharacter(s.units.at(-1),g);if(g.outfit)s.units.at(-1).outfit=g.outfit;");
 }
 return Buffer.from(s);
}
