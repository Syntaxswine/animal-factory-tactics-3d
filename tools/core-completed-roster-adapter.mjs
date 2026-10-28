// Add the finished native appearances to the pinned simulation without
// inventing species-specific combat rules or changing existing saved identities.
export const completedRosterOverrides={
 'maps.js':'Accept the finished bull, rabbit and dog as squad, guard and NPC appearances.',
 'recruits.js':'Include the finished bull, rabbit and dog in recruitment slates.'
};
export function adaptCoreCompletedRoster(name,input){
 if(!completedRosterOverrides[name])return input;
 const source=input.toString(),label=name==='maps.js'?'SPECIES':'RECRUIT_SPECIES';
 const expression=new RegExp('(export const '+label+'=\\[)([^\\]]+)(\\];)');
 if(!expression.test(source))throw Error('Completed roster adapter cannot find '+label);
 return Buffer.from(source.replace(expression,(_,start,items,end)=>{
  const added=['bull','rabbit','dog'].filter(id=>!items.includes("'"+id+"'"));
  return start+items+added.map(id=>",'"+id+"'").join('')+end;
 }));
}
