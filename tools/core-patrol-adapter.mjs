export const patrolOverrides={'engine.js':'Follow authored calm patrols with game-clock waypoint waits.','maps.js':'Validate authored patrol waypoints.','blocks.js':'Translate and validate reusable character patrol routes.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Patrol adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCorePatrol(name,data){let s=data.toString();
 if(name==='maps.js'){
  s="import {patrolMapErrors} from '../character-patrol.js';\n"+s;
  s=once(s,'errors.push(...characterErrors(raw));','errors.push(...characterErrors(raw),...patrolMapErrors(raw,240,passable));');
  s=once(s,'const targets=[...raw.starts,...raw.guards,...raw.exits]', 'const targets=[...raw.starts,...raw.guards,...raw.exits,...raw.guards.flatMap(g=>g.patrol||[])]');
  s=once(s,'Unreachable start or marker at','Unreachable start, marker or patrol waypoint at');
 }else if(name==='blocks.js'){
  s="import {shiftPatrol,patrolMapErrors} from '../character-patrol.js';\n"+s;
  s=once(s,'const shift=(p,x,y)=>({...p,x:p.x+x,y:p.y+y});','const shift=(p,x,y)=>({...p,x:p.x+x,y:p.y+y,...p.patrol&&{patrol:shiftPatrol(p.patrol,x,y)}});');
  s=once(s,'const foliageIssues=foliageErrors(d,24);','const patrolIssues=patrolMapErrors(d,24);if(patrolIssues.length)throw Error(patrolIssues[0]);const foliageIssues=foliageErrors(d,24);');
 }else if(name==='engine.js'){
  s="import {patrolDestination} from '../character-patrol.js';\n"+s;
  s=once(s,"if(g.burningTurns)continue;if(combatBehavior(g)!=='fight')",`if(g.burningTurns)continue;
  if(stateOf(g)==='rest'&&!g.npcFrightened&&g.patrol?.length){
   const dest=patrolDestination(s,g),p=dest?realtimeStep(s,g,dest,quota,new Set([key(dest.x,dest.y,levelOf(dest))])):null;
   if(p){stepTo(s,g,p);patrolDestination(s,g);acted=true;}continue;
  }
  if(combatBehavior(g)!=='fight')`);
 }
 return Buffer.from(s);
}
