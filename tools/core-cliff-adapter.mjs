// Explicit 3D-only extension; the original sprite core remains pinned.
export const cliffOverrides={
 'projectiles.js':'Use physical cliff caps instead of phantom upper slabs.',
 'maps.js':'Derive flat cliff caps and routes; validate both landings and price climbs at 8 AP.',
 'engine.js':'Use fixed cliff costs for all movement and emit committed traversal events.',
 'editor-model.js':'Author tagged cliff links using supported adjacent levels.'
};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Cliff adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreCliffs(name,data){
 let s=data.toString();
 if(name==='projectiles.js'){s="import {cliffSupportAt} from '../cliff-support.js';\n"+s;s=once(s,"terrainAt(state,x,y,upper)!=='void'","terrainAt(state,x,y,upper)!=='void'&&!cliffSupportAt(state,{x,y,z:upper})");}
 if(name==='maps.js'){
  s="import {cliffCapAt,cliffLinkSupported,cliffLinksAt} from '../cliff-routes.js';\n"+s;
  s=once(s,"(m.upper?.[z-1]?.[tileKey(x,y)]||'void')","(m.upper?.[z-1]?.[tileKey(x,y)]||(cliffCapAt(m,x,y,z)?'floor':'void'))");
  s=once(s,'if(stairs.has(stairKey(p.x,p.y,Math.min(z,z+dz)))&&passable', 'if(passable(m,p)&&stairs.has(stairKey(p.x,p.y,Math.min(z,z+dz)))&&passable');
  s=once(s,'roofValid=(m,p)=>inBounds',"roofValid=(m,p)=>(p.kind!=='cliff'||cliffLinkSupported(m,p)&&!blockedEdge(m,p,{x:p.x+p.dx,y:p.y+p.dy,z:p.z}))&&inBounds");
  s=once(s,'return (roofIndex(m).get(tileKey(p.x,p.y,levelOf(p)))||[]).filter', 'return [...(roofIndex(m).get(tileKey(p.x,p.y,levelOf(p)))||[]),...cliffLinksAt(m,p)].filter((q,i,a)=>a.findIndex(r=>r.x===q.x&&r.y===q.y&&r.z===q.z&&r.dx===q.dx&&r.dy===q.dy)===i).filter');
  s=once(s,"cost:6,kind:'roof'","cost:q.kind==='cliff'?8:6,kind:q.kind==='cliff'?'cliff':'roof'");
  s=once(s,'raw.climbs.some(p=>!point(p)||','raw.climbs.some(p=>!point(p)||(p.kind!==undefined&&p.kind!==\'cliff\')||');
 }else if(name==='editor-model.js'){
  s=once(s,"if(tool==='roof'){","if(tool==='roof'||tool==='cliff-climb'){");
  s=once(s,'const p={x,y,z,dx:other.x-x,dy:other.y-y};',"const p={x,y,z,dx:other.x-x,dy:other.y-y,...(tool==='cliff-climb'?{kind:'cliff'}:{})};");
 }else if(name==='engine.js'){
  s="import {automaticCliffLinks,flatCliff} from '../cliff-routes.js';\n"+s;
  s=once(s,"levelOf(q)===levelOf(p)||stanceOf(u)==='standing'", "levelOf(q)===levelOf(p)||stanceOf(u)==='standing'&&![p,q].some(v=>s.units.some(other=>other!==u&&(alive(other)||incapacitated(other))&&other.x===v.x&&other.y===v.y&&levelOf(other)===levelOf(v)))");
  s=once(s,'for(const p of s.climbs)if(known(p)', 'for(const p of [...s.climbs,...automaticCliffLinks(s)])if(known(p)');
  s=once(s,'props:s.props.filter(p=>propCells(p).some(known))','props:s.props.filter(p=>propCells(p).some(known)||flatCliff(p)&&known({...p,z:levelOf(p)+1}))');
  s="import {updateCliffSupports} from '../cliff-support.js';\nimport {recordCliffTraversal} from '../cliff-traversal.js';\n"+s;
  s=once(s,'cost:(levelOf(q)===levelOf(p)?','cost:q.kind===\'cliff\'?8:(levelOf(q)===levelOf(p)?');
  s=once(s,'function refreshNow(s){','function refreshNow(s){updateCliffSupports(s);');
  const ai='same?unit*n.cost:n.cost*movementMultiplier(g)';
  if(s.split(ai).length!==3)throw Error('Cliff AI cost anchors changed');
  s=s.replaceAll(ai,"n.kind==='cliff'?8:same?unit*n.cost:n.cost*movementMultiplier(g)");
  s=once(s,'const q={x:n.x,y:n.y,z:n.z,cost:', 'const q={x:n.x,y:n.y,z:n.z,kind:n.kind,cost:');
  s=s.replaceAll('spendMovement(u,step);', 'recordCliffTraversal(s,u,step);spendMovement(u,step);');
  s=once(s,'spendMovement(g,p);', 'recordCliffTraversal(s,g,p);spendMovement(g,p);');
 }
 return Buffer.from(s);
}
