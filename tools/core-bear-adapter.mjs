// Extend the pinned simulation's accepted appearances without changing combat
// stats, save versions, existing identities or its base species trait rules.
export const bearOverrides={
 'maps.js':'Accept the painted bear as a squad, guard and NPC appearance.',
 'recruits.js':'Include the bear in newly generated recruitment slates.'
};
export function adaptCoreBear(name,input){
 if(!bearOverrides[name])return input;
 const source=input.toString(),label=name==='maps.js'?'SPECIES':'RECRUIT_SPECIES';
 const expression=new RegExp('(export const '+label+'=\\[)([^\\]]+)(\\];)');
 if(!expression.test(source))throw Error('Bear adapter cannot find '+label);
 return Buffer.from(source.replace(expression,(_,start,items,end)=>start+items+",'bear'"+end));
}
