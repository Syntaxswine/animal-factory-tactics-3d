export const foliageOverrides={
 'environment.js':'Recognize both foliage surfaces; dense thickets are not walkable floor.',
 'maps.js':'Accept dense foliage on all three terrain layers.',
 'editor-model.js':'Paint dense foliage with the same protected occupancy rules as other blocking terrain.',
 'blocks.js':'Preserve both foliage types on upper layers of reusable blocks.',
 'woodland.js':'Both undergrowth and dense thickets provide foliage concealment.'
};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Foliage adapter anchor: '+a);return s.replace(a,b);}
export function adaptCoreFoliage(name,data){let s=data.toString();
 if(name==='environment.js')s="export const FOLIAGE_TERRAINS=['woodland','woodland-dense'];\nexport const isWoodland=t=>FOLIAGE_TERRAINS.includes(t);\n"+s;
 if(name==='maps.js'){
  s=once(s,"'water','bridge','woodland',...GROUNDS]","'water','bridge','woodland','woodland-dense',...GROUNDS]");
  s=once(s,"'crate','bridge','woodland',...GROUNDS]","'crate','bridge','woodland','woodland-dense',...GROUNDS]");
 }
 if(name==='editor-model.js'){
  s=once(s,"'bridge','woodland'].includes(tool)","'bridge','woodland','woodland-dense'].includes(tool)");
  s=once(s,"['crate','void','water'].includes(tool)","['crate','void','water','woodland-dense'].includes(tool)");
  s=once(s,"'bridge','woodland','void'","'bridge','woodland','woodland-dense','void'");
 }
 if(name==='blocks.js')s=once(s,"'crate','bridge',...GROUNDS]","'crate','bridge','woodland','woodland-dense',...GROUNDS]");
 if(name==='woodland.js'){
  s="import {isWoodland} from './environment.js';\n"+s;
  s=once(s,"terrainAt(s,Math.round(a.x+dx*t),Math.round(a.y+dy*t),z)==='woodland'","isWoodland(terrainAt(s,Math.round(a.x+dx*t),Math.round(a.y+dy*t),z))");
 }
 return Buffer.from(s);
}
