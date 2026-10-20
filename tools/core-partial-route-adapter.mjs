export const partialRouteOverrides={'engine.js':'Player movement can stop at the nearest reachable tile when the destination is blocked; strict route queries and AI remain exact.'};
export function adaptCorePartialRoutes(name,data){
 if(name!=='engine.js')return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Partial route adapter anchor changed: '+a);s=s.replace(a,b);};
 once('export function pathTo(s,u,x,y,z=levelOf(u)){','export function pathTo(s,u,x,y,z=levelOf(u),{partial=false,avoidEnd=new Set()}={}){');
 once('if(!walkable(s,x,y,z)||(occupant(s,x,y,z)&&occupant(s,x,y,z)!==u))return null;',
  `if(!inBounds(x,y,z))return null;
 const target=occupant(s,x,y,z),exact=walkable(s,x,y,z)&&(!target||target===u)&&!avoidEnd.has(key(x,y,z));
 if(!partial&&!exact)return null;`);
 once('push({...u,z:levelOf(u),k:start,g:0,f:heuristic(u)});',
  `const trace=k=>{const path=[];while(k!==start){const entry=parents.get(k);path.push(entry.point);k=entry.parent;}return path.reverse();};
 // Track a fallback during the SAME search. A full route always wins. Only
 // strictly closer endpoints count as progress; ties prefer cheaper movement.
 const remaining=p=>Math.hypot(p.x-x,p.y-y,(levelOf(p)-z)*3);
 let best=null,bestDistance=remaining(u);
 push({...u,z:levelOf(u),k:start,g:0,f:heuristic(u)});`);
 once('if(p.k===goal){const path=[];let k=goal;while(k!==start){const entry=parents.get(k);path.push(entry.point);k=entry.parent;}return path.reverse();}',
  `if(p.k===goal&&!avoidEnd.has(p.k))return trace(goal);
  if(partial&&!avoidEnd.has(p.k)){const d=remaining(p);if(d<bestDistance-1e-9||best&&Math.abs(d-bestDistance)<1e-9&&p.g<best.g){best=p;bestDistance=d;}if(!exact&&bestDistance<=1&&best)return trace(best.k);}`);
 once("}return null;\n}\n// Tiles a unit can stand on",
  "}return partial?(best?trace(best.k):[]):null;\n}\n// Tiles a unit can stand on");
 once('export function navigationPath(s,u,x,y,z=levelOf(u)){if(!inBounds(x,y,z))return null;return pathTo(navigationState(s),u,x,y,z);}',
  'export function navigationPath(s,u,x,y,z=levelOf(u),options){if(!inBounds(x,y,z))return null;return pathTo(navigationState(s),u,x,y,z,options);}');
 once('if(!canControl(s,u))return false;const path=navigationPath(s,u,x,y,z);if(!path?.length)return false;',
  'if(!canControl(s,u))return false;const path=navigationPath(s,u,x,y,z,{partial:true});if(!path?.length)return false;');
 once('u.overwatch=null;s.queue=path.map(p=>({id:u.id,...p,goal:{x,y,z}}));return true;',
  `const end=path.at(-1),goal={x:end.x,y:end.y,z:end.z};
 if(goal.x!==x||goal.y!==y||goal.z!==z)log(s,'Route blocked: walking as close as possible, then stopping.');
 u.overwatch=null;s.queue=path.map(p=>({id:u.id,...p,goal}));return true;`);
 once('const goal=step.goal,path=navigationPath(s,actor,goal.x,goal.y,goal.z);',
  'const goal=step.goal,path=navigationPath(s,actor,goal.x,goal.y,goal.z,{partial:true});');
 once('s.queue=path.map(p=>({id:actor.id,...p,goal}));',
  `const end=path.at(-1);if(end.x!==goal.x||end.y!==goal.y||end.z!==goal.z){Object.assign(goal,{x:end.x,y:end.y,z:end.z});log(s,'Route blocked: walking as close as possible, then stopping.');}s.queue=path.map(p=>({id:actor.id,...p,goal}));`);
 once('pathTo(planning,u,goal.x,goal.y,z):null;if(path&&(path.length||u.x===goal.x&&u.y===goal.y&&levelOf(u)===z))',
  'pathTo(planning,u,goal.x,goal.y,z,{partial:true,avoidEnd:reserved}):null;if(path)');
 once('found=goal;break;}}if(!found)return false;reserved.add(key(found.x,found.y,z));orders.push({id:u.id,goal:{x:found.x,y:found.y,z}});',
  `const end=path.at(-1)||u;if(reserved.has(key(end.x,end.y,levelOf(end))))continue;found={x:end.x,y:end.y,z:levelOf(end)};break;}}if(!found)return false;reserved.add(key(found.x,found.y,found.z));orders.push({id:u.id,goal:found});`);
 once('levelOf(u)===z;}))return false;for(const u of members)',
  'levelOf(u)===o.goal.z;}))return false;for(const u of members)');
 once('const path=navigationPath(s,u,goal.x,goal.y,goal.z),step=path?.[0],valid=',
  'const path=navigationPath(s,u,goal.x,goal.y,goal.z,{partial:true}),step=path?.[0],valid=');
 once("return moved;}if(!commitClimb(s,u,valid))",
  "return moved;}const end=path.at(-1);Object.assign(goal,{x:end.x,y:end.y,z:end.z});if(!commitClimb(s,u,valid))");
 return Buffer.from(s);
}
