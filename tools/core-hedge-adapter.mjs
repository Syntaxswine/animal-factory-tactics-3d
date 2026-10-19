export const hedgeOverrides={
 'environment.js':'Register solid short and tall hedge cells; finite sight and wooden shot cover use the shared foliage queries.',
 'maps.js':'Validate versioned hedge placements and deterministic seeds.',
 'editor-model.js':'Persist hedge version and seed on new placements.'
};
export function adaptCoreHedges(name,data){
 let s=data.toString();const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Hedge adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='environment.js'){s="import {HEDGE_PROPS} from '../hedge-data.js';\n"+s;s+='\nObject.assign(PROPS,HEDGE_PROPS);\n';}
 if(name==='maps.js'){s="import {hedgeErrors} from '../hedge-data.js';\n"+s;once('...foliageErrors(raw),','...hedgeErrors(raw),...foliageErrors(raw),');}
 if(name==='editor-model.js'){
  s="import {isHedge,HEDGE_VERSION,HEDGE_SEED} from '../hedge-data.js';\n"+s;
  once('if(isStrategicSite(p))p.sabotage=', 'if(isHedge(p))Object.assign(p,{hedgeVersion:HEDGE_VERSION,hedgeSeed:options.hedgeSeed??HEDGE_SEED});if(isStrategicSite(p))p.sabotage=');
 }
 return Buffer.from(s);
}
