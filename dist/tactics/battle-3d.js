import {createCharacterScreen} from './character-screen.js';
import {AIM_LEVELS,shotAim,supportsAim} from './aim-levels.js';
import {climbTower,towerClimbPreview} from './tower-actions.js';
import {TOWER_HEIGHT} from './tower-geometry.js';
import {illuminationAt} from './awareness.js';
import {FrameClock,formatClock,timeOfDay,turnBased} from './game-clock.js';
import {startEncounterClock,tickEncounterClock,settleEncounterRounds} from './encounter-clock.js';
import {createGame,move,stepMovement,previewAttack,attack,equip,reload,endTurn,stepEnemy,stepInvestigation,canControl,WEAPONS,stanceOf,STANCES,alive,moveGroup,combatCosts,MOVEMENT_MODES,movementModeOf,movementCost,effectiveStealth} from './core/engine.js';
import {loadBattleMap} from './battle-map.js';
import {BattleRenderer} from './battle-renderer.js';
import {FLOOR_PIXELS} from './hybrid-renderer.js';
import {MOVEMENT_MS,queuedMovementDuration} from './battle-motion.js';
import {rectangleMembers,pruneSelection,toggleSelection,selectable,stanceSelection,setSelectionStance,movementSelection,setSelectionMovement} from './battle-selection.js';
import {readSettings} from './settings-3d.js';

const $=id=>document.getElementById(id),canvas=$('battle'),ctx=canvas.getContext('2d');
$('difficulty').value=readSettings().difficulty;
let definition;
try{definition=await loadBattleMap();}catch(error){$('message').textContent=error.message;$('restart').disabled=true;throw error;}
if(new URLSearchParams(location.search).has('editorPlaytest')){
 const back=document.createElement('button');back.id='return-editor';back.textContent='Return to editor';back.onclick=()=>{window.opener?.focus();window.close();};document.querySelector('header').append(back);
 document.querySelector('aside h1').textContent='Playtest: '+definition.name;
}
let renderer,state,targetId=null,level=0,picks=[],width=1,height=1,lastStep=0,stepDelay=MOVEMENT_MS,drag=null,lastUI='',overviewMode=false,lastUIBusy=false;
let selectedIds=new Set(),lastUIDiagnostics='',lastDiagnostic='';
const frameClock=new FrameClock();let userPaused=false,presentationTime=0,lastClockCombat;
const characterScreen=createCharacterScreen({getState:()=>state,getEquipmentState:id=>renderer?.equipmentState(id)||'carried',canEquip:()=>!renderer.busy,onEquip:(id,weapon)=>{if(renderer.busy)return false;const ok=equip(state,state.units.find(u=>u.id===id),weapon);if(ok){renderer.captureCombat(state);lastUI='';}return ok;},onOpen:()=>{frameClock.reset();sync();},onClose:()=>{frameClock.reset();sync();}});
const paused=()=>userPaused||document.hidden||characterScreen.open;
function syncClock(){const phase=timeOfDay(state.clock).phase;$('game-clock').textContent=formatClock(state.clock)+' \u00b7 '+phase[0].toUpperCase()+phase.slice(1);$('pause').textContent=userPaused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(userPaused));}
const view={x:0,y:0,zoom:1.15};
const climbButton=document.createElement('button');climbButton.id='climb-tower';climbButton.textContent='Climb tower';$('reload').parentNode.insertBefore(climbButton,$('reload'));
const selected=()=>state.units.find(u=>u.id===state.selected);
const target=()=>state.units.find(u=>u.id===targetId&&u.hp>0&&state.detected.has(u.id));
const mercStatus=u=>u.away?'Away':u.casualty==='captured'?'Captured':u.casualty==='quit'?'Left squad':u.hp>0?`${stanceOf(u)} · ${movementModeOf(u)} · ${u.hp} HP · ${u.ap} AP`:u.casualty==='bleeding'?`Bleeding · ${u.bleedTurns} turns`:u.casualty==='stable'?'Stabilized':'Dead';
const message=text=>{$('message').textContent=text;};
const project=u=>({x:view.x+(u.x-u.y)*28*view.zoom,y:view.y+(u.x+u.y)*14*view.zoom-((u.z||0)-level+((u.towerPost?TOWER_HEIGHT:u.towerElevation||0)/2.12))*FLOOR_PIXELS*view.zoom});
function focus(x,y){overviewMode=false;view.zoom=1.15;view.x=width/2-(x-y)*28*view.zoom;view.y=height*.55-(x+y)*14*view.zoom;$('hint').textContent='Click ground to move · Shift-drag to select mercs · Drag to pan · Scroll to zoom';}
function center(){const u=selected();level=u.z||0;$('floor').value=level;focus(u.x,u.y);}
function overview(){const w=definition.width,h=definition.height;overviewMode=true;view.zoom=Math.min((width-50)/((w+h)*28),(height-60)/((w+h)*14));view.x=width/2-(w-h)*14*view.zoom;view.y=30;$('hint').textContent='Click the map to inspect an area · Center returns to your squad';}
function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(state){if(overviewMode)overview();else center();}}
function restart(){renderer?.dispose();renderer=new BattleRenderer(()=>{});state=createGame(1947,definition,true,$('difficulty').value,{social:true,awareness:true,rosterSeed:1947});startEncounterClock(state);frameClock.reset();presentationTime=0;renderer.presentationNow=0;lastStep=0;userPaused=false;selectedIds=new Set([state.selected]);stepDelay=MOVEMENT_MS;drag=null;targetId=null;view.zoom=1.15;lastUI='';center();message(state.difficulty==='easy'?'Scenery revealed. People still need line of sight.':'Explore to reveal the map.');sync();}
function sync(){
 settleEncounterRounds(state);const combat=turnBased(state);if(combat!==lastClockCombat){frameClock.reset();lastClockCombat=combat;}syncClock();
 selectedIds=pruneSelection(state,selectedIds);
 if(selectedIds.size&&!selectedIds.has(state.selected))state.selected=[...selectedIds][0];
 const u=selected(),t=target(),preview=t?previewAttack(state,u,t,false,'torso',null,$('aim-level').value):null;
 const signature=JSON.stringify([state.revision,state.phase,state.round,state.selected,[...selectedIds],state.queue.length,state.units.filter(v=>v.team==='squad').map(v=>[v.hp,v.ap,v.ammo[v.weapon],v.stance,v.sneaking,v.running,v.casualty,v.bleedTurns]),t?.id,preview,renderer.diagnostics,renderer.busy,userPaused]);
 if(signature===lastUI)return;lastUI=signature;
 $('phase').textContent=`${state.phase==='explore'?'Exploration':state.phase==='player'?'Your turn':state.phase==='enemy'?'Guard turn':state.phase==='won'?'Encounter cleared':'Encounter ended'} · Round ${state.round}`;
 $('squad').replaceChildren(...state.units.filter(v=>v.team==='squad').map(v=>{const button=document.createElement('button');button.textContent=`${v.id===state.selected?"★ ":""}${v.name} · ${mercStatus(v)}`;button.setAttribute('aria-pressed',String(selectedIds.has(v.id)));button.disabled=!selectable(v);button.onclick=e=>{selectMerc(v.id,e.shiftKey);center();sync();};return button;}));
 $('light-exposure').textContent='Light on '+u.name+': '+Math.round(illuminationAt(state,u)*100)+'% · Perception '+(u.perception??50);
 $('selection').textContent=`${selectedIds.size} selected · Primary: ${u.name} · ${WEAPONS[u.weapon].name} · ${u.ammo[u.weapon]||0} loaded`;
 $('target').textContent=t?`${t.name} · ${preview.ok?`${preview.chance??preview.odds??'—'}% · ${preview.cost} AP`:preview.reason}`:'Select a visible opponent to inspect a shot.';
 for(const [key,aim] of Object.entries(AIM_LEVELS))$('aim-level').querySelector('[value='+key+']').textContent=aim.label+' � '+shotAim(WEAPONS[u.weapon],key).cost+' AP';
 $('aim-level').disabled=!supportsAim(WEAPONS[u.weapon]);
 $('fire').disabled=paused()||renderer.busy||!preview?.ok||!canControl(state,u)||!!state.queue.length;
 const climb=towerClimbPreview(state,u);climbButton.textContent=(climb.descending?'Descend tower':'Climb tower')+(combatCosts(state)?' · 6 AP':' · 30 sec');climbButton.disabled=paused()||renderer.busy||!climb.ok;climbButton.title=climb.reason||'Use the stairs or ladder at the gold entrance ring.';
 $('reload').disabled=paused()||renderer.busy||!canControl(state,u)||!!state.queue.length||!WEAPONS[u.weapon].mag;
 $('end').disabled=paused()||renderer.busy||state.phase!=='player'||!!state.queue.length;
 $('stop').disabled=paused()||!state.queue.length;
 for(const name of Object.keys(STANCES)){const b=$('stance-'+name),group=stanceSelection(state,selectedIds,name);b.setAttribute('aria-pressed',String(group.all));b.disabled=paused()||renderer.busy||!group.ready.length;}
 for(const mode of Object.keys(MOVEMENT_MODES)){const b=$('move-'+mode),group=movementSelection(state,selectedIds,mode);b.setAttribute('aria-pressed',String(group.all));b.disabled=paused()||renderer.busy||!group.ready.length;}
 const group=movementSelection(state,selectedIds,'walk').members,costs=[...new Set(group.map(movementCost))].sort((a,b)=>a-b);
 $('movement-info').textContent=(costs.length?costs.join(' / ')+' AP per straight tile':'No mercs selected')+' · Primary stealth '+effectiveStealth(u)+(u.sneaking?' (+20, capped at 100)':'');
 $('stance-cost').textContent=selectedIds.size+' selected · '+(!combatCosts(state)?'Free stance change':'2 AP per merc changing stance');
 $('log').replaceChildren(...state.log.slice(0,8).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 lastUIDiagnostics=renderer.diagnostics.join('\n');
 if(renderer.diagnostics.length){lastDiagnostic=renderer.diagnostics.at(-1);message(lastDiagnostic);}
 else if(lastDiagnostic){if($('message').textContent===lastDiagnostic)message('Ready.');lastDiagnostic='';}
}
function selectMerc(id,toggle=false){
 const u=state.units.find(u=>u.id===id);if(!u||!selectable(u))return;
 selectedIds=toggle?toggleSelection(selectedIds,id):new Set([id]);state.selected=selectedIds.has(id)?id:[...selectedIds][0];targetId=null;state.queue=[];
}
function click(x,y,shift=false){
 if(overviewMode){const px=(x-view.x)/(28*view.zoom),py=(y-view.y)/(14*view.zoom);focus((px+py)/2,(py-px)/2);return;}
 const hit=renderer.pick(x,y,width,height);
 if(hit!==null){const u=state.units.find(u=>u.id===hit);if(selectable(u)){selectMerc(u.id,shift);}else if(state.detected.has(u.id)&&u.hp>0)targetId=u.id;sync();return;}
 if(paused()||renderer.busy||shift)return;
 const px=(x-view.x)/(28*view.zoom),py=(y-view.y)/(14*view.zoom),tx=Math.round((px+py)/2),ty=Math.round((py-px)/2);
 if(selectedIds.size>1?moveGroup(state,[...selectedIds],selected(),tx,ty,level):move(state,selected(),tx,ty,level)){targetId=null;message('');}else message('Cannot move there now. Check the route, floor and available AP.');sync();
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,select:e.shiftKey};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(drag.moved&&!drag.select){view.x+=e.clientX-drag.lastX;view.y+=e.clientY-drag.lastY;}drag.lastX=e.clientX;drag.lastY=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();if(d.select&&d.moved){const ids=rectangleMembers(state.units,level,{x:d.x-r.left,y:d.y-r.top},{x:e.clientX-r.left,y:e.clientY-r.top},u=>project(renderer.displayUnit(u)));if(ids.length){selectedIds=new Set(ids);if(!selectedIds.has(state.selected))state.selected=ids[0];targetId=null;state.queue=[];message(ids.length+' mercs selected. Ground clicks move the group; stance buttons affect the group; Fire and Reload use the primary merc.');sync();}else message('No mercs in that rectangle.');}else if(!d.moved)click(e.clientX-r.left,e.clientY-r.top,d.select);});
canvas.addEventListener('pointercancel',()=>{drag=null;});
canvas.addEventListener('lostpointercapture',()=>{drag=null;});
window.addEventListener('blur',()=>{drag=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();const box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top,old=view.zoom;view.zoom=Math.max(.08,Math.min(3,old*Math.exp(-e.deltaY*.001)));view.x=x-(x-view.x)*view.zoom/old;view.y=y-(y-view.y)*view.zoom/old;},{passive:false});
document.addEventListener('keydown',e=>{if(characterScreen.open)return;if(e.key==='Escape'&&!paused()){drag=null;state.queue=[];targetId=null;sync();}});
function action(fn){if(paused()||renderer.busy)return;const ok=fn();renderer.captureCombat(state);message(ok?'':'Action unavailable.');sync();}
 for(const name of Object.keys(STANCES))$('stance-'+name).onclick=()=>{if(paused()||renderer.busy)return;const result=setSelectionStance(state,selectedIds,name);message(result.changed.length+' merc'+(result.changed.length===1?'':'s')+' changed to '+name+'.'+(result.skipped.length?' Could not change: '+result.skipped.join(', ')+'. Check AP and action availability.':''));sync();};
 for(const mode of Object.keys(MOVEMENT_MODES))$('move-'+mode).onclick=()=>{if(paused()||renderer.busy)return;const result=setSelectionMovement(state,selectedIds,mode);message(result.changed.length+' merc'+(result.changed.length===1?'':'s')+' set to '+mode+'.'+(result.skipped.length?' Could not change: '+result.skipped.join(', ')+'.':''));sync();};
 $('character').onclick=()=>characterScreen.show(state.selected);
 $('restart').onclick=restart;$('center').onclick=center;$('overview').onclick=overview;
 $('reload').onclick=()=>action(()=>reload(state,selected()));$('end').onclick=()=>action(()=>endTurn(state));
 climbButton.onclick=()=>action(()=>climbTower(state,selected()));
 $('aim-level').onchange=()=>{lastUI='';sync();};
 $('fire').onclick=()=>action(()=>{const t=target();return t&&attack(state,selected(),t,false,false,'torso',false,$('aim-level').value);});
 $('stop').onclick=()=>{if(paused())return;state.queue=[];sync();};$('floor').onchange=()=>{level=+$('floor').value;};
$('pause').onclick=()=>{userPaused=!userPaused;frameClock.reset();sync();};
document.addEventListener('visibilitychange',()=>{frameClock.reset();sync();});
window.addEventListener('pageshow',()=>frameClock.reset());
new ResizeObserver(resize).observe(canvas);resize();restart();
if(new URLSearchParams(location.search).get('view')==='overview')overview();
function frame(now){
 try{
  const elapsed=frameClock.sample(now,{paused:paused(),mode:turnBased(state)});presentationTime+=elapsed;renderer.presentationNow=presentationTime;tickEncounterClock(state,elapsed,{paused:paused()||renderer.traversal.busy});syncClock();
  if(!paused()&&!renderer.busy&&presentationTime-lastStep>stepDelay){lastStep=presentationTime;stepDelay=queuedMovementDuration(state);if(state.queue.length)stepMovement(state);else if(state.phase==='enemy')stepEnemy(state);else if(['explore','won'].includes(state.phase))stepInvestigation(state);renderer.captureCombat(state);sync();}
  ctx.clearRect(0,0,width,height);picks=renderer.draw(ctx,state,view,width,height,level);
  if(lastUIBusy!==renderer.busy||lastUIDiagnostics!==renderer.diagnostics.join('\n')){lastUIBusy=renderer.busy;sync();}
  for(const u of state.units.filter(v=>v.team==='squad'&&alive(v)&&(v.z||0)===level)){
   const p=project(renderer.displayUnit(u));ctx.strokeStyle=selectedIds.has(u.id)?'#ffe3a0':'#a4d4c2';ctx.lineWidth=u.id===state.selected?2:1;ctx.beginPath();ctx.ellipse(p.x,p.y,17*view.zoom,8*view.zoom,0,0,Math.PI*2);ctx.stroke();
  }
  for(const u of state.units.filter(v=>v.team==='squad'&&v.hp<=0&&!v.away&&!['captured','quit'].includes(v.casualty)&&(v.z||0)===level)){const p=project(u);ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillStyle=u.casualty==='bleeding'?'#ffc0a0':u.casualty==='stable'?'#bce1cc':'#d1cbc2';ctx.strokeStyle='#172520';ctx.lineWidth=3;const label=mercStatus(u);ctx.strokeText(label,p.x,p.y+22);ctx.fillText(label,p.x,p.y+22);}
  for(const [id,point] of Object.entries({...state.contacts,...state.glimpses}))if(!state.detected.has(+id)&&(point.z||0)===level){const p=project(point);ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillStyle=state.glimpses[id]?'#f5d480':'#aaa58c';ctx.strokeStyle='#172520';ctx.lineWidth=3;ctx.strokeText('?',p.x,p.y-12);ctx.fillText('?',p.x,p.y-12);}
  if(target()){const p=project(renderer.displayUnit(target()));ctx.strokeStyle='#ff9b80';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,18*view.zoom,9*view.zoom,0,0,Math.PI*2);ctx.stroke();}
  if(drag?.select&&drag.moved){const r=canvas.getBoundingClientRect();ctx.fillStyle='#f2cc8325';ctx.strokeStyle='#f2cc83';ctx.lineWidth=1.5;ctx.fillRect(drag.x-r.left,drag.y-r.top,drag.lastX-drag.x,drag.lastY-drag.y);ctx.strokeRect(drag.x-r.left,drag.y-r.top,drag.lastX-drag.x,drag.lastY-drag.y);}
  requestAnimationFrame(frame);
 }catch(error){message('Encounter stopped: '+error.message);console.error(error);}
}
// Read-only inspection hooks for browser regression checks.
window.battle3d={get state(){return state;},get renderer(){return renderer;},get clock(){return state.clock;},get paused(){return paused();},get picks(){return picks;},get selectedIds(){return [...selectedIds];},project,view};
requestAnimationFrame(frame);
