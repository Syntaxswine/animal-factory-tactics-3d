export const foliageOverrides={
 'environment.js':'Recognize both foliage surfaces; dense thickets are not walkable floor.',
 'maps.js':'Validate ground-preserving foliage overlays on all three levels and honor independent walking restrictions.',
 'editor-model.js':'Paint dense foliage with the same protected occupancy rules as other blocking terrain.',
 'blocks.js':'Preserve and relocate foliage overlays with reusable blocks, including legacy foliage terrain.',
 'engine.js':'Retain foliage density and walking restrictions in encounters.',
 'visibility.js':'Invalidate terrain visibility when foliage changes.',
 'woodland.js':'Density controls foliage concealment independently of passability.'
};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Foliage adapter anchor: '+a);return s.replace(a,b);}
export function adaptCoreFoliage(name,data){let s=data.toString();
 if(name==='environment.js')s="export const FOLIAGE_TERRAINS=['woodland','woodland-dense'];\nexport const isWoodland=t=>FOLIAGE_TERRAINS.includes(t);\n"+s;
 if(name==='maps.js'){
  s="import {foliageErrors,foliageBlocks,foliageGround,foliageKey} from '../foliage-data.js';\n"+s;
  s=once(s,'errors.push(...breachErrors(raw),','errors.push(...foliageErrors(raw),...breachErrors(raw),');
  s=once(s,'&&!propBlocks(m,p.x,p.y,levelOf(p))','&&!foliageBlocks(m,p.x,p.y,levelOf(p))&&!propBlocks(m,p.x,p.y,levelOf(p))');
  s=once(s,'if(!inBounds(x,y,z))return false;if(!z)m.terrain','if(!inBounds(x,y,z))return false;if(m.foliage&&!foliageGround(value))delete m.foliage[foliageKey(x,y,z)];if(!z)m.terrain');
  s=once(s,"'water','bridge','woodland',...GROUNDS]","'water','bridge','woodland','woodland-dense',...GROUNDS]");
  s=once(s,"'crate','bridge','woodland',...GROUNDS]","'crate','bridge','woodland','woodland-dense',...GROUNDS]");
 }
 if(name==='editor-model.js'){
  s=once(s,"'bridge','woodland'].includes(tool)","'bridge','woodland','woodland-dense'].includes(tool)");
  s=once(s,"['crate','void','water'].includes(tool)","['crate','void','water','woodland-dense'].includes(tool)");
  s=once(s,"'bridge','woodland','void'","'bridge','woodland','woodland-dense','void'");
 }
 if(name==='blocks.js'){
  s="import {foliageErrors,extractFoliage,placeFoliage} from '../foliage-data.js';\n"+s;
  s=once(s,"'crate','bridge',...GROUNDS]","'crate','bridge','woodland','woodland-dense',...GROUNDS]");
  s=once(s,'const d={...extractBreaches(m,x,y),','const d={...extractFoliage(m,x,y),...extractBreaches(m,x,y),');
  s=once(s,"if(d.edgeLocks){m.edgeLocks||={};","placeFoliage(m,d,x,y);if(d.edgeLocks){m.edgeLocks||={};");
  s=once(s,'const breachIssues=breachErrors(d,24);','const foliageIssues=foliageErrors(d,24);if(foliageIssues.length)throw Error(foliageIssues[0]);const breachIssues=breachErrors(d,24);');
 }
 if(name==='engine.js')s=once(s,'edges:{...definition.edges},','edges:{...definition.edges},...(definition.foliage?{foliage:structuredClone(definition.foliage)}:{}),');
 if(name==='visibility.js'){
  s=once(s,'JSON.stringify([s.map,s.upper,s.edges,s.props,s.stairs])','JSON.stringify([s.map,s.upper,s.edges,s.props,s.stairs,s.foliage])');
  s=once(s,"hasWoodland:signature.includes('woodland')","hasWoodland:!!Object.keys(s.foliage||{}).length||signature.includes('woodland')");
 }
 if(name==='woodland.js'){
  s="import {foliageDepth} from '../foliage-data.js';\n"+s;
  s=once(s,"if(terrainAt(s,Math.round(a.x+dx*t),Math.round(a.y+dy*t),z)==='woodland')depth+=(cuts[i]-cuts[i-1])*length;","depth+=foliageDepth(s,Math.round(a.x+dx*t),Math.round(a.y+dy*t),z)*(cuts[i]-cuts[i-1])*length;");
 }
 return Buffer.from(s);
}
