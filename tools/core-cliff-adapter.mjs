// Explicit 3D-only extension; the original sprite core remains pinned.
export const cliffOverrides={
 'maps.js':'Validate explicit cliff links and price them at 8 AP.',
 'engine.js':'Use fixed cliff costs for all movement and emit committed traversal events.',
 'editor-model.js':'Author tagged cliff links using supported adjacent levels.'
};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Cliff adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreCliffs(name,data){
 let s=data.toString();
 if(name==='maps.js'){
  s=once(s,"cost:6,kind:'roof'","cost:q.kind==='cliff'?8:6,kind:q.kind==='cliff'?'cliff':'roof'");
  s=once(s,'raw.climbs.some(p=>!point(p)||','raw.climbs.some(p=>!point(p)||(p.kind!==undefined&&p.kind!==\'cliff\')||');
 }else if(name==='editor-model.js'){
  s=once(s,"if(tool==='roof'){","if(tool==='roof'||tool==='cliff'){");
  s=once(s,'const p={x,y,z,dx:other.x-x,dy:other.y-y};',"const p={x,y,z,dx:other.x-x,dy:other.y-y,...(tool==='cliff'?{kind:'cliff'}:{})};");
 }else if(name==='engine.js'){
  s="import {recordCliffTraversal} from '../cliff-traversal.js';\n"+s;
  s=once(s,'cost:(levelOf(q)===levelOf(p)?','cost:q.kind===\'cliff\'?8:(levelOf(q)===levelOf(p)?');
  const ai='same?unit*n.cost:n.cost*movementMultiplier(g)';
  if(s.split(ai).length!==3)throw Error('Cliff AI cost anchors changed');
  s=s.replaceAll(ai,"n.kind==='cliff'?8:same?unit*n.cost:n.cost*movementMultiplier(g)");
  s=once(s,'const q={x:n.x,y:n.y,z:n.z,cost:', 'const q={x:n.x,y:n.y,z:n.z,kind:n.kind,cost:');
  s=s.replaceAll('spendMovement(u,step);', 'recordCliffTraversal(s,u,step);spendMovement(u,step);');
  s=once(s,'spendMovement(g,p);', 'recordCliffTraversal(s,g,p);spendMovement(g,p);');
 }
 return Buffer.from(s);
}
