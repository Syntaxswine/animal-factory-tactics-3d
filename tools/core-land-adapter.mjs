export const landOverrides={'maps.js':'Validate automatic-land ownership on import.','blocks.js':'Keep painted-land ownership when extracting, placing and replacing blocks.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Land adapter anchor: '+a);return s.replace(a,b);}
export function adaptCoreLand(name,data){let s=data.toString();
 if(name==='maps.js'){s="import {landErrors} from '../land-paint.js';\n"+s;s=once(s,'errors.push(...validateConnections(raw)', 'errors.push(...landErrors(raw,W,GROUNDS));errors.push(...validateConnections(raw)');}
 if(name==='blocks.js'){
  s="import {extractLand,placeLand,landErrors} from '../land-paint.js';\n"+s;
  s=once(s,'const d={','const d={...extractLand(m,x,y),');
  s=once(s,'mergeCharacterResources(m,d);','mergeCharacterResources(m,d);placeLand(m,d,x,y);');
  s=once(s,'const roofErrors=canopyErrors(d,24);','const landIssues=landErrors(d,24,GROUNDS);if(landIssues.length)throw Error(landIssues[0]);const roofErrors=canopyErrors(d,24);');
 }
 return Buffer.from(s);
}
