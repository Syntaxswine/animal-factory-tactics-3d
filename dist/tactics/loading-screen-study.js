import {bindLoadingScreen} from './loading-screen.js';
const root=document.querySelector('#loading-screen'),screen=bindLoadingScreen(root),pause=document.querySelector('#preview-pause'),replay=document.querySelector('#preview-replay'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),query=new URLSearchParams(location.search);
const stages=[[0,'Establishing connection'],[13,'Receiving sector terrain'],[47,'Preparing squad equipment'],[76,'Synchronizing field operations'],[94,'Final deployment checks']];
let elapsed=0,previous=0,frame=0,playing=false,disposed=false;
function paint(){const progress=Math.min(100,elapsed/140);if(progress>=100)screen.ready();else screen.setProgress(progress,stages.findLast(([start])=>progress>=start)[1]);}
function sync(){
  cancelAnimationFrame(frame);frame=0;previous=0;screen.setPaused(!playing||document.hidden);pause.textContent=playing?'Pause':'Play';pause.setAttribute('aria-pressed',String(!playing));
  if(playing&&!document.hidden&&!disposed)frame=requestAnimationFrame(tick);
}
function tick(now){
  frame=0;if(!playing||document.hidden||disposed)return;if(previous)elapsed+=Math.min(now-previous,100);previous=now;paint();
  if(elapsed>=14000){playing=false;sync();}else frame=requestAnimationFrame(tick);
}
function toggle(){if(elapsed>=14000)elapsed=0;playing=!playing;paint();sync();}
function restart(){elapsed=0;playing=!reduced.matches;paint();sync();}
function motion(){if(reduced.matches){playing=false;sync();}}
function dispose(){if(disposed)return;disposed=true;playing=false;cancelAnimationFrame(frame);frame=0;pause.removeEventListener('click',toggle);replay.removeEventListener('click',restart);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',motion);window.removeEventListener('pagehide',dispose);screen.dispose();}
pause.addEventListener('click',toggle);replay.addEventListener('click',restart);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',motion);window.addEventListener('pagehide',dispose);
const fixed=query.has('progress')?Number(query.get('progress')):null;
if(fixed!==null&&Number.isFinite(fixed)){elapsed=Math.max(0,Math.min(100,fixed))*140;paint();}
else if(reduced.matches){elapsed=62*140;paint();}else restart();
sync();
window.loadingScreenStudy={screen,root,dispose,get state(){return{playing,elapsed,frame,state:root.dataset.state};}};
