import {createGame,move,stepMovement,previewAttack,attack,reload,endTurn,stepEnemy,stepInvestigation,canControl,WEAPONS} from './core/engine.js';
import {factoryMap} from './core/maps.js';
import {BattleRenderer} from './battle-renderer.js';
import {FLOOR_PIXELS} from './hybrid-renderer.js';

const $=id=>document.getElementById(id),canvas=$('battle'),ctx=canvas.getContext('2d');
let renderer,state,targetId=null,level=0,picks=[],width=1,height=1,lastStep=0,drag=null,lastUI='';
const view={x:0,y:0,zoom:1.15};
const selected=()=>state.units.find(u=>u.id===state.selected);
const target=()=>state.units.find(u=>u.id===targetId&&u.hp>0&&state.detected.has(u.id));
const message=text=>{$('message').textContent=text;};
const project=u=>({x:view.x+(u.x-u.y)*28*view.zoom,y:view.y+(u.x+u.y)*14*view.zoom-((u.z||0)-level)*FLOOR_PIXELS*view.zoom});
function center(){const u=selected();level=u.z||0;$('floor').value=level;view.x=width/2-(u.x-u.y)*28*view.zoom;view.y=height*.55-(u.x+u.y)*14*view.zoom;}
function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(state)center();}
function restart(){renderer?.dispose();renderer=new BattleRenderer(()=>{});state=createGame(1947,factoryMap(),true,$('difficulty').value,{social:true,rosterSeed:1947});targetId=null;view.zoom=1.15;lastUI='';center();message(state.difficulty==='easy'?'Scenery revealed. People still need line of sight.':'Explore to reveal the map.');sync();}
function sync(){
 const u=selected(),t=target(),preview=t?previewAttack(state,u,t):null;
 const signature=JSON.stringify([state.revision,state.phase,state.round,state.selected,state.queue.length,state.units.filter(v=>v.team==='squad').map(v=>[v.hp,v.ap,v.ammo[v.weapon]]),t?.id,preview,renderer.diagnostics]);
 if(signature===lastUI)return;lastUI=signature;
 $('phase').textContent=`${state.phase==='explore'?'Exploration':state.phase==='player'?'Your turn':state.phase==='enemy'?'Guard turn':state.phase==='won'?'Encounter cleared':'Encounter ended'} · Round ${state.round}`;
 $('squad').replaceChildren(...state.units.filter(v=>v.team==='squad').map(v=>{const button=document.createElement('button');button.textContent=`${v.name} · ${v.hp} HP · ${v.ap} AP`;button.setAttribute('aria-pressed',String(v.id===state.selected));button.disabled=v.hp<=0||!!v.away;button.onclick=()=>{state.selected=v.id;targetId=null;center();sync();};return button;}));
 $('selection').textContent=`${u.name} · ${WEAPONS[u.weapon].name} · ${u.ammo[u.weapon]||0} loaded`;
 $('target').textContent=t?`${t.name} · ${preview.ok?`${preview.chance??preview.odds??'—'}% · ${preview.cost} AP`:preview.reason}`:'Select a visible opponent to inspect a shot.';
 $('fire').disabled=!preview?.ok||!canControl(state,u)||!!state.queue.length;
 $('reload').disabled=!canControl(state,u)||!!state.queue.length||!WEAPONS[u.weapon].mag;
 $('end').disabled=state.phase!=='player'||!!state.queue.length;
 $('stop').disabled=!state.queue.length;
 $('log').replaceChildren(...state.log.slice(0,8).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 if(renderer.diagnostics.length)message(renderer.diagnostics.at(-1));
}
function click(x,y){
 const hit=renderer.pick(x,y,width,height);
 if(hit!==null){const u=state.units.find(u=>u.id===hit);if(u.team==='squad'&&u.hp>0){state.selected=u.id;targetId=null;}else if(state.detected.has(u.id)&&u.hp>0)targetId=u.id;sync();return;}
 const px=(x-view.x)/(28*view.zoom),py=(y-view.y)/(14*view.zoom),tx=Math.round((px+py)/2),ty=Math.round((py-px)/2);
 if(move(state,selected(),tx,ty,level)){targetId=null;message('');}else message('Cannot move there now. Check the route, floor and available AP.');sync();
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(drag.moved){view.x+=e.clientX-drag.lastX;view.y+=e.clientY-drag.lastY;}drag.lastX=e.clientX;drag.lastY=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(!moved){const r=canvas.getBoundingClientRect();click(e.clientX-r.left,e.clientY-r.top);}});
canvas.addEventListener('pointercancel',()=>{drag=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();const box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top,old=view.zoom;view.zoom=Math.max(.08,Math.min(3,old*Math.exp(-e.deltaY*.001)));view.x=x-(x-view.x)*view.zoom/old;view.y=y-(y-view.y)*view.zoom/old;},{passive:false});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){state.queue=[];targetId=null;sync();}});
function action(fn){const ok=fn();message(ok?'':'Action unavailable.');sync();}
 $('restart').onclick=restart;$('center').onclick=center;
 $('reload').onclick=()=>action(()=>reload(state,selected()));$('end').onclick=()=>action(()=>endTurn(state));
 $('fire').onclick=()=>action(()=>{const t=target();return t&&attack(state,selected(),t);});
 $('stop').onclick=()=>{state.queue=[];sync();};$('floor').onchange=()=>{level=+$('floor').value;};
new ResizeObserver(resize).observe(canvas);resize();restart();
function frame(now){
 try{
  if(now-lastStep>180){lastStep=now;if(state.queue.length)stepMovement(state);else if(state.phase==='enemy')stepEnemy(state);else if(['explore','won'].includes(state.phase))stepInvestigation(state);sync();}
  ctx.clearRect(0,0,width,height);picks=renderer.draw(ctx,state,view,width,height,level);
  for(const u of state.units.filter(v=>v.team==='squad'&&v.hp>0&&!v.away&&(v.z||0)===level)){
   const p=project(u);ctx.strokeStyle=u.id===state.selected?'#ffe3a0':'#a4d4c2';ctx.lineWidth=u.id===state.selected?2:1;ctx.beginPath();ctx.ellipse(p.x,p.y,17*view.zoom,8*view.zoom,0,0,Math.PI*2);ctx.stroke();
  }
  if(target()){const p=project(target());ctx.strokeStyle='#ff9b80';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,18*view.zoom,9*view.zoom,0,0,Math.PI*2);ctx.stroke();}
  requestAnimationFrame(frame);
 }catch(error){message('Encounter stopped: '+error.message);console.error(error);}
}
// Read-only inspection hooks for browser regression checks.
window.battle3d={get state(){return state;},get renderer(){return renderer;},get picks(){return picks;},project,view};
requestAnimationFrame(frame);
