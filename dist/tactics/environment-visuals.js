import {PROPS,propCells} from './environment.js';
import {environmentModel} from './environment-models.js';
import {DIMENSIONS as D} from './hybrid-world.js';
import {grassTufts} from './foliage-models.js';

// The visual catalog deliberately does not replace simulation collision volumes.
export function environmentVisuals(world,map){
 const result=world.boxes.filter(b=>b.kind!=='prop'&&!b.id.includes(':slope:'));
 const occupied=new Set((map.props||[]).flatMap(p=>propCells(p).map(c=>`${c.x},${c.y},${p.z||0}`)));
 for(const b of world.boxes)if(!occupied.has(`${b.source.x},${b.source.y},${b.source.z||0}`))result.push(...grassTufts(b));
 const add=(id,source,kind,material,center,size,shape='box',rotation=[0,0,0])=>result.push({id,source,kind,material,center,size,shape,rotation});
 for(const p of map.props||[]){
  const rule=PROPS[p.kind];if(!rule)continue;
  const id=`prop:${p.x},${p.y},${p.z||0}:${p.kind}`,source={prop:id,x:p.x,y:p.y,z:p.z||0},base=(p.z||0)*D.floorSpacing;
  if(p.kind.startsWith('roof-')){
   if(p.kind==='roof-corrugated-sloped')add(id+':sheet',source,'roof','metal',[p.x+.5,base-D.slab-.16,p.y+.5],[2,.32,2],'wedge',[0,p.rotated?-Math.PI/2:0,0]);
   // Corrugation and folded eaves remain below the walkable top of the roof.
   if(p.kind.includes('corrugated'))for(let i=0;i<14;i++)add(id+':rib:'+i,source,'roof','metal',p.rotated?[p.x+.5,base-.007,p.y-.45+i*.145]:[p.x-.45+i*.145,base-.007,p.y+.5],p.rotated?[2,.018,.025]:[.025,.018,2]);
   continue;
  }
  const cells=propCells(p),w=Math.max(...cells.map(q=>q.x))-p.x+1,d=Math.max(...cells.map(q=>q.y))-p.y+1;
  const h=rule.tall?D.wall:rule.cover?D.lowCover:rule.visualHeight?Math.min(1.8,rule.visualHeight/40):.2;
  for(const [i,part]of environmentModel(p.kind,rule.w,rule.h,h).entries()){
   const [x,y,z]=part.center;
   // Parent Y rotation is composed by the renderer before each local rotation.
   add(id+':model:'+i,source,'prop',part.material,[p.x+(w-1)/2+(p.rotated?-z:x),base+y,p.y+(d-1)/2+(p.rotated?x:z)],part.size,part.shape,part.rotation);
   result.at(-1).yaw=p.rotated?-Math.PI/2:0;
  }
 }
 for(const b of world.boxes){
  if(b.kind==='fence'&&b.id.endsWith(':bar:0')){
   const [axis]=b.source.edge.split(':'),east=axis==='e';
   for(const y of [.2,1.7])add(b.id+':rail:'+y,b.source,'fence','dark-metal',[b.center[0]+(east?0:.5),b.center[1]-1+y,b.center[2]+(east?.5:0)],east?[.045,.045,1]:[1,.045,.045]);
   if(b.material==='fence-chainlink')for(let i=-6;i<=8;i++)for(const sign of [-1,1]){
    // Clip both diagonal wire families to the panel rectangle.
    const intercept=i*.2,lo=Math.max(0,sign===1?.2-intercept:intercept-1.7),hi=Math.min(1,sign===1?1.7-intercept:intercept-.2);
    if(hi<=lo)continue;const t=(lo+hi)/2,y=intercept+sign*t,length=(hi-lo)*Math.sqrt(2);
    add(b.id+`:wire:${i}:${sign}`,b.source,'fence','metal',[b.center[0]+(east?0:t),b.center[1]-1+y,b.center[2]+(east?t:0)],[.009,length,.009],'cylinder',east?[sign*Math.PI/4,0,0]:[0,0,-sign*Math.PI/4]);
   }
  }
  if(b.kind==='wall'&&b.id.endsWith(':door')){
   const east=b.size[0]<b.size[2];add(b.id+':handle',b.source,'wall','dark-metal',[b.center[0]+(east?b.size[0]/2+.025:.3),b.center[1]+.03,b.center[2]+(east?.3:b.size[2]/2+.025)],east?[.05,.045,.18]:[.18,.045,.05]);
  }
 }
 return result;
}
