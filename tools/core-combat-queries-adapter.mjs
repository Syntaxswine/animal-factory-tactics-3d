export const combatQueryOverrides={'engine.js':'Reuse pure body sight rays within one synchronous action; invalidate on geometry or endpoint changes.'};
export function adaptCoreCombatQueries(name,data){
 if(name!=='engine.js')return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Combat query adapter anchor changed: '+a);s=s.replace(a,b);};
 s="import {withCombatQueries,combatQuery} from '../combat-queries.js';\n"+s;
 for(const name of ['refresh','stepEnemy','stepMovement','stepInvestigation','endTurn','attack'])once('export function '+name+'(',`export function ${name}(s,...args){return withCombatQueries(s,()=>${name}QueryAction(s,...args));}\nfunction ${name}QueryAction(`);
 once("const hit=traceProjectile(s,null,origin,direction,length,{purpose:'sight'});\n return hit.kind==='range'||hit.distance>=length-1e-7;", "return combatQuery(s,'body-ray',[origin.x,origin.y,origin.h,b.x,b.y,end].join(','),()=>{\n const hit=traceProjectile(s,null,origin,direction,length,{purpose:'sight'});\n return hit.kind==='range'||hit.distance>=length-1e-7;});");
 return Buffer.from(s);
}
