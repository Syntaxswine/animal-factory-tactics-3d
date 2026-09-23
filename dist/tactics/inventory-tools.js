export const TOOLS={lockpicks:{name:'Lockpick set',weight:.5},repairKit:{name:'Repair supplies',weight:2}};
export const toolCount=(u,kind)=>(u.pack||[]).filter(i=>i.type==='tool'&&i.kind===kind).reduce((n,i)=>n+i.count,0);
export function consumeTool(u,kind){const item=u.pack.find(i=>i.type==='tool'&&i.kind===kind&&i.count>0);if(!item)return false;item.count--;if(!item.count)u.pack.splice(u.pack.indexOf(item),1);return true;}
export function starterTools(u){if(u.team!=='squad'||!u.pack)return;if(u.name==='Anya'&&!toolCount(u,'lockpicks'))u.pack.push({type:'tool',kind:'lockpicks',count:1});if(u.name==='Misha'&&!toolCount(u,'repairKit'))u.pack.push({type:'tool',kind:'repairKit',count:3});}
export const carryCapacity=u=>u.stats?10+.4*u.stats.strength:Infinity;
export const loadMultiplier=(u,weight)=>u.stats?Math.max(1,weight/carryCapacity(u)):1;
