// Passive diagnostics for ordinary packaged gameplay. No simulation stepping,
// clock replacement, animation bypass, or automatic UI actions.
import {listSaves} from './save-store.js';
export function installPlayAudit(api){
 const frames=[],events=[],errors=[],resources=[],started=performance.now();let previous=started,last='',renderer,closed=false;
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;right:12px;top:56px;z-index:90;background:#16271fee;color:#ffe6ad;padding:6px;font:12px system-ui';
 const status=document.createElement('span'),button=document.createElement('button');button.textContent='Record play check';panel.append(status,button);document.body.append(panel);
 globalThis.playAudit={record(event){events.push({...event,at:performance.now()-started,phase:api.state.phase,round:api.state.round});}};
 addEventListener('error',e=>errors.push(e.message));
 for(const name of ['click','keydown'])document.addEventListener(name,e=>{const input={event:name,at:performance.now()-started,dispatchDelayMs:Math.max(0,performance.now()-e.timeStamp),phase:api.state.phase,round:api.state.round,key:e.key,target:e.target.id||e.target.getAttribute?.('aria-label')||e.target.textContent?.slice(0,50)};requestAnimationFrame(()=>events.push({...input,dispatchToFrameMs:performance.now()-started-input.at}));},{capture:true});
 function frame(now){if(closed)return;frames.push({at:now-started,ms:now-previous,phase:api.state.phase,paused:api.paused});previous=now;const next=[api.state.phase,api.state.round,api.paused].join(':');if(next!==last){events.push({event:'state',at:now-started,value:next});last=next;}
  if(renderer!==api.renderer){if(renderer)events.push({event:'disposed-renderer',at:now-started,memory:{...renderer.renderer.info.memory},programs:renderer.renderer.info.programs.length});renderer=api.renderer;events.push({event:'renderer',at:now-started});}
  status.textContent=next+' · ';requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 button.onclick=async()=>{
  const r=api.renderer,gl=r.renderer.getContext(),record={event:'checkpoint',at:performance.now()-started,...r.renderer.info.memory,programs:r.renderer.info.programs.length,glError:gl.getError(),lost:gl.isContextLost(),phase:api.state.phase,round:api.state.round,paused:api.paused,clock:api.state.clock.minutes,view:{...api.view}};resources.push(record);
  const saves=(await listSaves()).map(({id,round,minutes,mapName,savedAt})=>({id,round,minutes,mapName,savedAt})),result={frames,events,errors,resources,saves,diagnostics:r.diagnostics,image:document.getElementById('battle').toDataURL(),url:location.href};
  const response=await fetch('/results/ordinary-play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});status.textContent=response.ok?'Recorded · ':'Failed · ';
 };
 addEventListener('pagehide',()=>{closed=true;},{once:true});
}
