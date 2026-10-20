export const climbingOverrides={
 'maps.js':'Expose physical window, wall and ladder routes and validate ladder condition.',
 'engine.js':'Use shared Climbing eligibility, AP, committed checks and fall injuries for players and guards.',
 'editor-model.js':'Author rusty ladders without changing the portable ladder geometry.'
};
export function adaptCoreClimbing(name,data){
 if(!climbingOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Climbing adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='maps.js'){
  s="import {boundaryClimbs} from '../climbing-routes.js';\nimport {climbingMapErrors} from '../climbing.js';\n"+s;
  once('cost:stairs.get(stairKey(p.x,p.y,Math.min(z,z+dz)))}',"cost:stairs.get(stairKey(p.x,p.y,Math.min(z,z+dz))),kind:stairs.get(stairKey(p.x,p.y,Math.min(z,z+dz)))===3?'ladder':'stairs',rusty:!!m.stairs?.find(q=>q.x===p.x&&q.y===p.y&&q.z===Math.min(z,z+dz))?.rusty}");
  once('for(const link of roofNeighbors(m,p))out.push(link);','for(const link of roofNeighbors(m,p))out.push(link);out.push(...boundaryClimbs(m,p));');
  once('errors.push(...characterErrors(raw),','errors.push(...climbingMapErrors(raw),...characterErrors(raw),');
  // Replacing a rusty ladder with a normal ladder or stairs repairs the condition.
  once('?{...p,kind}:p);return true;', '?{x:p.x,y:p.y,z:p.z,kind}:p);return true;');
 }
 if(name==='editor-model.js'){
  once("if(tool==='stairs'||tool==='ladder'){", "if(tool==='stairs'||tool==='ladder'||tool==='ladder-rusty'){");
  once("addStairs(m,x,y,z,tool==='ladder'?'ladder':'stairs');return '';", "addStairs(m,x,y,z,tool.startsWith('ladder')?'ladder':'stairs');if(tool==='ladder-rusty')m.stairs.find(p=>p.x===x&&p.y===y&&p.z===z).rusty=true;return '';");
 }
 if(name==='engine.js'){
  s="import {climbingPreview,rollClimb} from '../climbing.js';\nimport {failedClimbFall,cancelClimbOrders} from '../fall-damage.js';\n"+s;
  const start=s.indexOf('export function movementNeighbors('),end=s.indexOf('\nexport const key=',start);
  if(start<0||end<start)throw Error('Movement neighbors anchor changed');
  s=s.slice(0,start)+`function movementCosts(s,step){return s.phase==='player'||!!step.climb&&combatCosts(s);}
export function movementStep(u,p,q,combat=false){
 const climb=climbingPreview(u,q,combat);
 if(climb&&(!climb.ok||stanceOf(u)!=='standing'))return null;
 const cost=climb&&!climb.legacy?climb.cost:q.kind==='cliff'?8*injuryMovement(u):(q.kind==='ramp'||levelOf(q)===levelOf(p)?STANCES[stanceOf(u)].moveCost*q.cost:q.cost)*movementMultiplier(u);
 return {...q,cost,...climb?{climb}: {}};
}
export function movementNeighbors(s,u,p=u,stairs){if(towerForUnit(s,u))return [];return neighbors(s,p,stairs).concat(siteEscapeSteps(s,u,p)).filter(q=>(q.kind==='ramp'||levelOf(q)===levelOf(p)||stanceOf(u)==='standing')&&!(levelOf(q)===levelOf(p)&&q.x!==p.x&&q.y!==p.y&&[occupant(s,q.x,p.y,levelOf(p)),occupant(s,p.x,q.y,levelOf(p))].some(v=>v&&v!==u))).map(q=>movementStep(u,p,q,combatCosts(s))).filter(Boolean);}`+s.slice(end);
  once(' recordCliffTraversal(s,u,step);recordRoofTraversal(s,u,step);spendMovement(u,step);', ' step=currentStep;if(!commitClimb(s,u,step)){refresh(s);return true;}recordSimpleTraversal(s,u,step);recordCliffTraversal(s,u,step);recordRoofTraversal(s,u,step);spendMovement(u,step);');
  once('}recordCliffTraversal(s,u,step);recordRoofTraversal(s,u,step);spendMovement(u,step);', '}if(!commitClimb(s,u,valid)){refresh(s);return true;}recordSimpleTraversal(s,u,valid);recordCliffTraversal(s,u,valid);recordRoofTraversal(s,u,valid);spendMovement(u,valid);');
  once('function stepTo(s,g,p){recordCliffTraversal', 'function stepTo(s,g,p){const live=movementNeighbors(s,g).find(q=>q.x===p.x&&q.y===p.y&&q.z===p.z);if(!live||!canMoveStamina(g,live))return false;Object.assign(p,live);if(!commitClimb(s,g,p,{guard:true}))return false;recordSimpleTraversal(s,g,p);recordCliffTraversal');
  // Climb failure and success share the combat AP gate during an alert.
  // Ordinary walking (including stairs) stays free outside turn mode.
  for(const step of ['currentStep','valid']){
   once("s.phase==='player'&&u.ap<"+step+".cost","movementCosts(s,"+step+")&&u.ap<"+step+".cost");
   once("if(s.phase==='player')u.ap-="+step+".cost","if(movementCosts(s,"+step+"))u.ap-="+step+".cost");
  }
  // Guard callers own their AP deduction; failure spends the attempt exactly once.
  s=s.replaceAll('g.ap-=p.cost;', 'g.ap=Math.max(0,g.ap-p.cost);');
  const loopStart=s.indexOf('  for(const n of neighbors(s,p,stairs).concat(siteEscapeSteps(s,g,p)))'),loopEnd=s.indexOf('\n // Out of budget:',loopStart);
  if(loopStart<0||loopEnd<loopStart)throw Error('Guard route anchor changed');
  s=s.slice(0,loopStart)+`  for(const n of neighbors(s,p,stairs).concat(siteEscapeSteps(s,g,p))){const same=n.kind==='ramp'||n.z===p.z;if(!same&&stanceOf(g)!=='standing')continue;if(same&&n.x!==p.x&&n.y!==p.y&&(occupied.has(key(n.x,p.y,p.z))||occupied.has(key(p.x,n.y,p.z))))continue;const q=movementStep(g,p,n,combatCosts(s));if(!q||combatCosts(s)&&q.cost>turnAP(g))continue;const k=key(n.x,n.y,n.z),c=p.g+q.cost;if(occupied.has(k)||c>=(scores.get(k)??Infinity))continue;scores.set(k,c);parents.set(k,{parent:p.k,point:q});push({...q,k,g:c,f:c+h(q)});}}`+s.slice(loopEnd);
  once('settleStructureCollapse(s,receipts,{fatal:', 'settleStructureCollapse(s,receipts,{hurt:(s,u,damage)=>combatDamage(s,u,damage,false,source),fatal:');
  s+=`
// A preview is pure. Only an accepted traversal consumes this independent roll.
export function commitClimb(s,u,step,{paid=false,guard=false}={}){
 const result=rollClimb(s,u,step);if(!result.checked&&!result.blocked)return true;
 s.lastClimb={unitId:u.id,kind:step.kind,...result};
 if(result.success)return true;
 if(result.blocked){cancelClimbOrders(s,u);return false;}
 if(!paid){spendMovement(u,step);if(!guard&&combatCosts(s))u.ap=Math.max(0,u.ap-step.cost);}
 u.overwatch=null;u.route=null;cancelClimbOrders(s,u);
 if(result.fall){const event=failedClimbFall(s,u,step,{hurt:(s,u,damage)=>combatDamage(s,u,damage),fatal:(s,u)=>combatDamage(s,u,Math.max(u.hp,1),true)});recordSimpleEvent(s,event);log(s,u.name+' fell: '+event.damage+' HP'+(result.criticalFailure?' (critical failure)':'')+'.');enterFire(s,u);}
 else log(s,u.name+' could not complete the climb and returned safely.');
 return false;
}
function recordSimpleEvent(s,event){s.simpleTraversal={...event,id:(s.simpleTraversal?.id||0)+1};s.simpleTraversals=[...(s.simpleTraversals||[]),s.simpleTraversal].slice(-64);}
function recordSimpleTraversal(s,u,to){
 if(!['window','wall','ladder'].includes(to.kind))return;
 recordSimpleEvent(s,{unitId:u.id,kind:to.kind,from:{x:u.x,y:u.y,z:levelOf(u)},to:{x:to.x,y:to.y,z:levelOf(to)},running:!!to.climb?.running});
}
`;
 }
 return Buffer.from(s);
}
