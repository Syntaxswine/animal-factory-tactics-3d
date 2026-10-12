export const spotlightOverrides={'maps.js':'Validate spotlight aim points and game-clock waits.','blocks.js':'Preserve and validate relative spotlight routes in reusable blocks.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Spotlight adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreSpotlights(name,data){let s=data.toString();
 if(name==='maps.js'){
  s="import {spotlightErrors} from '../light-sources.js';\n"+s;
  s=once(s,'errors.push(...strategicSiteErrors(raw));','errors.push(...spotlightErrors(raw),...strategicSiteErrors(raw));');
 }else if(name==='blocks.js'){
  s="import {spotlightErrors} from '../light-sources.js';\n"+s;
  s=once(s,'const patrolIssues=patrolMapErrors(d,24);','const spotlightIssues=spotlightErrors(d,null);if(spotlightIssues.length)throw Error(spotlightIssues[0]);const patrolIssues=patrolMapErrors(d,24);');
 }
 return Buffer.from(s);
}
