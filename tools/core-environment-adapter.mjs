export const environmentOverrides={
 'maps.js':'Validate optional local environment fields while preserving older maps.',
 'engine.js':'Preserve the sector environment profile in live encounters.'
};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Environment adapter anchor: '+a);return s.replace(a,b);}
export function adaptCoreEnvironment(name,data){let s=data.toString();
 if(name==='maps.js'){
  s="import {localEnvironmentErrors} from '../environment-regions.js';\n"+s;
  s=once(s,'errors.push(...foliageErrors(raw),','errors.push(...localEnvironmentErrors(raw),...foliageErrors(raw),');
 }
 if(name==='engine.js')s=once(s,'edges:{...definition.edges},','edges:{...definition.edges},...(definition.environment?{environment:structuredClone(definition.environment)}:{}),');
 return Buffer.from(s);
}
