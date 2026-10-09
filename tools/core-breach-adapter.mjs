export const breachOverrides={'maps.js':'Validate authored broken walls and floor holes.','blocks.js':'Preserve and relocate authored breach markers with reusable blocks.','engine.js':'Retain authored ruins in encounters.'};
export function adaptCoreBreaches(name,data){
 if(!breachOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Breach adapter anchor: '+a);s=s.replace(a,b);};
 if(name==='maps.js'){
  s="import {breachErrors} from '../breach-data.js';\n"+s;
  once('errors.push(...canopyErrors(raw));','errors.push(...breachErrors(raw),...canopyErrors(raw));');
 }
 if(name==='engine.js')once('edges:{...definition.edges},','edges:{...definition.edges},...(definition.breaches?{breaches:structuredClone(definition.breaches)}:{}),');
 if(name==='blocks.js'){
  s="import {breachErrors,extractBreaches,placeBreaches,clearBlockBreaches} from '../breach-data.js';\n"+s;
  once('const d={...extractLand(m,x,y),','const d={...extractBreaches(m,x,y),...extractLand(m,x,y),');
  once('placeLand(m,d,x,y);','placeLand(m,d,x,y);placeBreaches(m,d,x,y);');
  once('const landIssues=landErrors(d,24,GROUNDS);','const breachIssues=breachErrors(d,24);if(breachIssues.length)throw Error(breachIssues[0]);const landIssues=landErrors(d,24,GROUNDS);');
  once('const out=structuredClone(m);','const out=structuredClone(m);clearBlockBreaches(out,x,y);');
 }
 return Buffer.from(s);
}
