import {canControl,navigationPath,moveGroup,pathCost} from './core/engine.js';

// Use the same known-map navigation and formation destinations as movement.
// A detached order simulation keeps previewing free of gameplay side effects.
export function walkingRoutes(state,ids,leader,goal){
 if(!canControl(state,leader))return [];
 let orders=state.queue[0]?.group;
 if(!orders&&state.queue.length){const last=state.queue.at(-1);orders=[{id:last.id,goal:last.goal||last}];}
 if(!orders){
  if(!goal)return [];
  if(ids.length>1){const copy={...state,units:state.units.map(u=>({...u})),queue:[],log:[...state.log]};if(!moveGroup(copy,ids,copy.units.find(u=>u.id===leader.id),goal.x,goal.y,goal.z))return [];orders=copy.queue[0].group;}
  else orders=[{id:leader.id,goal}];
 }
 return orders.flatMap(order=>{const unit=state.units.find(u=>u.id===order.id);if(!canControl(state,unit))return [];const path=navigationPath(state,unit,order.goal.x,order.goal.y,order.goal.z);return path?.length?[{id:unit.id,name:unit.name,start:unit,path,cost:pathCost(path),ap:unit.ap}]:[];});
}

export function drawWalkingRoutes(ctx,routes,project,level,zoom,combat){
 ctx.save();
 for(const route of routes){let previous=project(route.start);
  for(const tile of route.path){const p=project(tile),angle=Math.atan2(p.y-previous.y,p.x-previous.x)+Math.PI/2;previous=p;if((tile.z||0)!==level)continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.scale(Math.max(.55,zoom),Math.max(.55,zoom));ctx.fillStyle='#080a08';ctx.strokeStyle='#e6ddbc99';ctx.lineWidth=.65;
   for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*3,-2,2,3.5,side*.15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(side*3,3,1.7,1.6,0,0,Math.PI*2);ctx.fill();}
   ctx.restore();
  }
  const end=route.path.at(-1);if(combat&&(end.z||0)===level){const p=project(end),label=(routes.length>1?route.name+': ':'')+Number(route.cost.toFixed(1))+' AP'+(route.cost>route.ap?' · exceeds AP':'');ctx.font='bold 13px system-ui';ctx.textAlign='center';const w=ctx.measureText(label).width+14;ctx.fillStyle='#111b16ec';ctx.fillRect(p.x-w/2,p.y-35,w,22);ctx.fillStyle=route.cost>route.ap?'#ffa990':'#fff0c9';ctx.fillText(label,p.x,p.y-19);}
 }
 ctx.restore();
}
