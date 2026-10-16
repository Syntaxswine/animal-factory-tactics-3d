import {stepMovement,stepEnemy,stepInvestigation,endTurn,attackGround,moveGroup} from './core/engine.js';
import {projectBattlePoint} from './isometric-camera.js';
import {MapGeometryCache} from './map-geometry-cache.js';

window.perfLab={mark(){},step(){},before(){},after(){}};
const warnings=[],originalWarn=console.warn;let warningCount=0,warningStack;console.warn=(...args)=>{warningCount++;if(!warningStack)warningStack=new Error().stack;if(warnings.length<20)warnings.push(args.map(String).join(' '));originalWarn(...args);};

const q=new URLSearchParams(location.search),mode=q.get('mode')||'baseline',label=q.get('run')||mode,duration=Number(q.get('seconds')||60)*1000,fullTurn=q.get('fullTurn')==='1';
// Explicit test surface: the desktop browser can constrain its viewport override.
// Apply before the application's resize observer installs; verify the actual size.
if(q.get('size')==='large'){const style=document.createElement('style');style.textContent='#battle-shell{width:1920px!important;height:auto!important;grid-template-rows:1080px auto!important}#viewport,#battle{width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important}';document.head.append(style);}
const startupFailures=[];
if(mode==='gl-startup-capture'){
 let caught=false;for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]){const getError=proto.getError;for(const [name,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(proto))){if(name==='constructor'||name==='getError'||typeof descriptor.value!=='function')continue;const fn=descriptor.value;proto[name]=function(...args){const value=fn.apply(this,args);if(!caught){const error=getError.call(this);if(error){caught=true;startupFailures.push({name,error,args:args.map(a=>typeof a==='number'||a===null?a:ArrayBuffer.isView(a)?{type:a.constructor.name,bytes:a.byteLength}:String(a)),stack:new Error().stack});}}return value;};}}
}
const quantile=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return {n:a.length,median:a[Math.floor(a.length*.5)]??null,p95:a[Math.floor(a.length*.95)]??null,p99:a[Math.floor(a.length*.99)]??null,max:a.at(-1)??null};};
function stateRecord(s){return {seed:s.seed,phase:s.phase,round:s.round,revision:s.revision,enemyIndex:s.enemyIndex,units:s.units.map(u=>({id:u.id,x:u.x,y:u.y,z:u.z,hp:u.hp,ap:u.ap,heading:u.heading,ammo:u.ammo,stance:u.stance,state:u.state,patrolIndex:u.patrolIndex,npcFrightened:u.npcFrightened})),queue:s.queue,detected:[...s.detected].sort((a,b)=>a-b),seenCount:s.seen.size};}
function resources(r){const textures=new Set(),geometry=new Set();let geometryBytes=0;const objects={};r.scene.traverse(o=>{objects[o.type]=(objects[o.type]||0)+1;if(o.geometry)geometry.add(o.geometry);if(o.instanceMatrix)geometryBytes+=o.instanceMatrix.array.byteLength;for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])for(const t of Object.values(m))if(t?.isTexture)textures.add(t);});for(const g of geometry){for(const a of Object.values(g.attributes))geometryBytes+=a.array?.byteLength||0;geometryBytes+=g.index?.array.byteLength||0;}return {objects,geometryBytes,textures:r.renderer.info.memory.textures,geometries:r.renderer.info.memory.geometries,programs:r.renderer.info.programs.length,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null};}
export async function installInvestigation(api){
 const r=api.renderer,s=api.state,gl=r.renderer.getContext(),info=r.renderer.info,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;right:10px;top:70px;z-index:100;background:#16271fee;color:#f5e6b9;padding:10px;width:260px;font:12px system-ui';panel.innerHTML='<strong>Populated-sector investigation</strong><p id="perf-status">Preparing 24 people and foliage…</p><pre id="perf-result" style="white-space:pre-wrap;max-height:200px;overflow:auto"></pre>';document.body.append(panel);
 const status=panel.querySelector('p'),output=panel.querySelector('pre'),manifest=await(await fetch('/manifest')).json();
 const sourceHashes={};for(const name of ['performance-lab.js','performance-fixture.js','battle-3d.js','hybrid-renderer.js','battle-renderer.js','character-batches.js','foliage-obstacles.js','core/visibility.js','light-renderer.js']){const data=await(await fetch(new URL(name,import.meta.url))).arrayBuffer();sourceHashes[name]=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(v=>v.toString(16).padStart(2,'0')).join('');}
 const rows=[],gpu=[],queries=[],checkpoints=[],events=[],memory=[],errors=[],longFrames=[],methodCosts={};let row,ready=false,done=false,start=0,last=0,nextTick=0,tick=0,frame=0,profiler=null,profileError=null,sampleInterval=null;
 const detailed=location.pathname.startsWith('/profile/'),gpuEnabled=q.get('gpu')!=='0',pending=[],restores=[],cacheAudits=[];let oracleFrames=0;
 if(q.get('cacheAudit')==='1'){
  const original=MapGeometryCache.prototype.get,fields=['ground','upper','edges','stairs','climbs','canopies','foliage','environment','breaches','definition.edges','definition.upper','definition.breaches','definition.props','definition.stairs','starts','guards','exits','width','height'];
  MapGeometryCache.prototype.get=function(map){const old=this.entry,at=performance.now(),result=original.call(this,map),ms=performance.now()-at;
   if(ms>1&&cacheAudits.length<100)cacheAudits.push({tick,ms,builder:this.build.name||this.build.toString().slice(0,70),rebuilt:old?.world!==this.entry.world,changedRefs:this.entry.refs.map((v,i)=>v!==old?.refs[i]?fields[i]:null).filter(Boolean),oldRevision:old?.revision,revision:this.entry.revision,propsChanged:old?.props!==this.entry.props,oldProps:old?.props,newProps:this.entry.props,breaches:map.breaches});return result;};
  restores.push(()=>MapGeometryCache.prototype.get=original);
 }
 addEventListener('error',e=>errors.push(e.message));
 let observer;try{observer=new PerformanceObserver(list=>longFrames.push(...list.getEntries().map(e=>e.toJSON())));observer.observe({type:'long-animation-frame',buffered:false});}catch{}
 function wrap(object,name,tag){if(!object?.[name])return;const original=object[name];object[name]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{if(row)row.costs[tag]=(row.costs[tag]||0)+performance.now()-at;}};restores.push(()=>object[name]=original);}
 if(detailed){for(const name of ['actor','captureCombat','displayUnit','rebuild'])wrap(r,name,name);for(const [object,name]of [[r.biomes,'update'],[r.interiorFog,'update'],[r.motion,'update'],[r.daylight,'update']])wrap(object,name,object.constructor.name+'.'+name);}
 const mark=name=>{if(row)row.marks[name]=performance.now();};
 const pollQueries=()=>{if(!ext)return;const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);if(disjoint){for(const p of queries)gl.deleteQuery(p.query);queries.length=0;events.push({event:'gpu-disjoint',frame});return;}while(queries.length&&gl.getQueryParameter(queries[0].query,gl.QUERY_RESULT_AVAILABLE)){const p=queries.shift();gpu.push({frame:p.frame,ms:gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.query);}};
 function scriptedStep(state,renderer,sync){if(!row||mode==='no-simulation'||fullTurn&&tick>0&&state.phase!=='enemy')return;const elapsed=performance.now()-start;if(elapsed+1e-6<nextTick||tick>=duration/500)return;nextTick+=500;const at=performance.now();tick++;let action;
  if(state.queue.length){action='movement';stepMovement(state);}
  else if(state.phase==='enemy'){action='enemy';stepEnemy(state);}
  else if(state.phase==='player'){action='end-turn';endTurn(state);}
  else{action='investigation';stepInvestigation(state);if(tick%8===0){const alive=state.units.filter(u=>u.team==='squad'&&u.hp>0);if(alive.length)moveGroup(state,alive.map(u=>u.id),alive[0],tick%16?123:120,127,0);}}
  row.simulationMs=performance.now()-at;renderer.captureCombat(state);sync();events.push({tick,action,ms:row.simulationMs});if(tick%10===0)checkpoints.push({tick,state:stateRecord(state)});
 }
 const lab={mark,step:scriptedStep,before(now){
  if(done)return false;if(!ready)return true;
  if(!start){start=performance.now();last=now;if(detailed&&typeof Profiler==='function'){try{profiler=new Profiler({sampleInterval:1,maxBufferSize:100000});sampleInterval=profiler.sampleInterval;}catch(e){profileError=e.message;}}else if(detailed)profileError='JS Self-Profiling API unavailable';}
  if(fullTurn&&tick>0&&s.phase!=='enemy'||performance.now()-start>=duration&&tick>=duration/500||performance.now()-start>duration+10000){done=true;finish();return false;}
  row={frame:frame++,t:performance.now()-start,raf:now-last,start:performance.now(),marks:{},costs:{},simulationMs:0,hidden:document.hidden};last=now;info.reset();
  return true;
 },after(state){if(!row)return;row.cpu=performance.now()-row.start;row.calls=info.render.calls;row.triangles=info.render.triangles;row.models=r.models.size;row.visibleActors=[...r.actors.values()].filter(o=>o.visible).length;row.alive=state.units.filter(u=>u.hp>0).length;rows.push(row);row=null;pollQueries();if(frame%120===0){status.textContent=`${Math.floor((performance.now()-start)/1000)} s · ${tick} ticks · ${mode}`;memory.push({frame,...resources(r)});}}};
 window.perfLab=lab;
 info.autoReset=false;
 const view=api.view;view.turn=0;view.zoom=.65;const p=projectBattlePoint({x:124,y:126,z:0},{...view,x:0,y:0});view.x=r.width*.5-p.x;view.y=r.height*.5-p.y;
 r.wallXray.setPointer(r.width*.52,r.height*.5);
 await Promise.all(r.biomes.terrains.map(t=>t.groundSkin.whenReady()));
 // Preload the fixed cast for the same load-ready boundary in every variant.
 await Promise.all(s.units.map(u=>r.models.has(u.id)||r.pending.has(u.id)?null:r.loadModel(u)));
 // The application's RAF must run during warm-up; do not await this timer here.
 if(mode==='no-actors'){const actor=r.actor.bind(r);r.actor=function(u){const model=actor(u);if(model)model.visible=false;return null;};}
 if(mode==='frozen-animation'){const actor=r.actor.bind(r);r.actor=function(u){return this.models.get(u.id)?.root||actor(u);};}
 if(mode==='no-shadows')r.renderer.shadowMap.enabled=false;
 if(mode==='no-foliage'){for(const terrain of r.biomes.terrains)for(const group of [terrain.root,terrain.group])if(group)group.visible=false;}
 if(mode==='no-copy'){const canvas=document.getElementById('battle'),ctx=canvas.getContext('2d'),original=ctx.drawImage;ctx.drawImage=function(image,...args){if(image===r.renderer.domElement)return;return original.call(this,image,...args);};}
 if(mode==='no-render')r.lights.render=()=>{};
 const render=r.lights.render.bind(r.lights);r.lights.render=function(...args){let query;if(row&&ext&&gpuEnabled&&frame%12===0&&queries.length<4){query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}try{return render(...args);}finally{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push({query,frame:row.frame});}}};
 if(mode==='gpu-command-capture'){
  const command=[];for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced','bindFramebuffer','useProgram','texImage2D','texSubImage2D','bufferData','bufferSubData']){const fn=gl[name];gl[name]=function(...args){if(frame===5)command.push({name,args:args.map(a=>typeof a==='number'||a===null?a:ArrayBuffer.isView(a)?{type:a.constructor.name,bytes:a.byteLength}:String(a))});return fn.apply(this,args);};}pending.command=command;
 }
 if(mode==='gl-error-capture'){
  const getError=gl.getError.bind(gl),names=new Set(),failures=[];let begun=false;
  for(let proto=Object.getPrototypeOf(gl);proto;proto=Object.getPrototypeOf(proto))for(const name of Object.getOwnPropertyNames(proto))if(name!=='constructor'&&name!=='getError'&&typeof gl[name]==='function')names.add(name);
  for(const name of names){const fn=gl[name];gl[name]=function(...args){const recording=frame===5;if(recording&&!begun){begun=true;while(getError()!==gl.NO_ERROR){}}const value=fn.apply(this,args);if(recording){const error=getError();if(error!==gl.NO_ERROR&&failures.length<100)failures.push({name,error,args:args.map(a=>typeof a==='number'||a===null?a:ArrayBuffer.isView(a)?{type:a.constructor.name,bytes:a.byteLength}:String(a)),stack:new Error().stack});}return value;};}
  pending.glFailures=failures;
 }
 setTimeout(()=>{if(q.get('size')==='large'&&(r.width!==1920||r.height!==1080))throw Error('Large test surface was not applied');memory.push({frame:-1,...resources(r)});ready=true;status.textContent='Measuring · '+mode;},5000);
 async function finish(){
  status.textContent='Saving raw trace…';const trace=profiler?await profiler.stop():null;observer?.disconnect();for(let i=0;i<12&&queries.length;i++){await new Promise(resolve=>setTimeout(resolve,20));pollQueries();}for(const p of queries)gl.deleteQuery(p.query);for(const restore of restores)restore();
  const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const result={label,mode,detailed,manifest,initialSeed:1947,fixtureHash:await digest(s.definition),browser:navigator.userAgent,gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[r.width,r.height],displayViewport:[innerWidth,innerHeight],dpr:r.renderer.getPixelRatio(),sampleInterval,profileError,duration,ticks:tick,summary:{raf:quantile(rows.slice(1).map(r=>r.raf)),cpu:quantile(rows.map(r=>r.cpu)),simulation:quantile(events.map(e=>e.ms)),gpu:quantile(gpu.map(g=>g.ms)),calls:quantile(rows.map(r=>r.calls)),triangles:quantile(rows.map(r=>r.triangles)),visibleActors:quantile(rows.map(r=>r.visibleActors)),alive:quantile(rows.map(r=>r.alive))},rows,gpuSamples:gpu,events,checkpoints,finalState:stateRecord(s),stateHash:await digest(stateRecord(s)),memory,longFrames,trace,commands:pending.command||null,diagnostics:r.diagnostics,errors,warnings,hiddenFrames:rows.filter(r=>r.hidden).length};
  const glErrors=[];for(let i=0;i<16;i++){const error=gl.getError();if(error===gl.NO_ERROR)break;glErrors.push(error);}
  Object.assign(result,{cacheAudits,fullTurn,fullTurnComplete:fullTurn&&s.phase==='player',sourceHashes,gpuSampling:gpuEnabled,warningCount,warningStack,longFrames:longFrames.filter(e=>e.startTime>=start),timeOrigin:performance.timeOrigin,measurementStartedAt:performance.timeOrigin+start,measurementEndedAt:Date.now(),oracleFrames,glErrors,glFailures:pending.glFailures,startupFailures,contextLost:gl.isContextLost(),textureUnitLimits:{fragment:gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),vertex:gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),combined:gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)}});
  if(q.get('verify')==='1'){
   const {captureEncounter,restoreEncounter}=await import('./encounter-save.js');
   const canonical=value=>JSON.stringify(value,(_,v)=>v instanceof Set?{__set:[...v].sort()}:v instanceof Map?{__map:[...v]}:v);
   const save=captureEncounter(s,0);result.saveValid=!!restoreEncounter(save);result.fullSave=canonical(save);result.fullSaveHash=await digest(result.fullSave);
   const ctx=document.getElementById('battle').getContext('2d'),animate=r.animateMaterials.bind(r);r.animateMaterials=()=>animate(42);
   for(let i=0;i<24;i++){r.presentationNow=1000000+i*5000;ctx.clearRect(0,0,r.width,r.height);r.draw(ctx,s,api.view,r.width,r.height,0);}
   result.image=r.renderer.domElement.toDataURL('image/png');
   result.postPresentationStateHash=await digest(stateRecord(s));
  }
  const response=await fetch('/results/'+label,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});if(!response.ok)throw Error('Result save failed '+response.status);
  output.textContent=JSON.stringify({...result.summary,stateHash:result.stateHash,profileError},null,2);status.textContent='Complete · '+label;
  if(q.get('suite')==='ablations'){
   const cases=['baseline-a','no-shadows','baseline-b','no-actors','frozen-animation','baseline-c','no-simulation','no-render','gpu-command-capture'],index=cases.indexOf(label),next=cases[index+1];
   if(next){const params=new URLSearchParams({study:'tree-cover',suite:'ablations',mode:next.startsWith('baseline-')?'baseline':next,run:next,seconds:next==='gpu-command-capture'?'5':'20'});location.href='../tactics/battle-3d.html?'+params;}
  }
  if(q.get('suite')==='cache'){
   const cases=['cache-baseline-1','cache-candidate-1','cache-candidate-2','cache-baseline-2','cache-baseline-3','cache-candidate-3'],index=cases.indexOf(label),next=cases[index+1];
   if(next){const version=next.includes('candidate')?'candidate':'baseline',params=new URLSearchParams({study:'tree-cover',suite:'cache',mode:'baseline',run:next,seconds:'20',gpu:'0'});location.href='/'+version+'/tactics/battle-3d.html?'+params;}
  }
  if(q.get('suite')==='render'){
   const size=q.get('size')||'normal',cases=['baseline-1','candidate-1','candidate-2','baseline-2','baseline-3','candidate-3'].map(n=>'render-'+size+'-'+n),next=cases[cases.indexOf(label)+1];
   if(next){const version=next.includes('candidate')?'candidate':'baseline',params=new URLSearchParams({study:'tree-cover',suite:'render',size,run:next,seconds:'20',gpu:'0',verify:'1'});location.href='/'+version+'/tactics/battle-3d.html?'+params;}
  }
  if(q.get('suite')==='full-turn'&&label==='full-turn-baseline'){location.href='/candidate/tactics/battle-3d.html?study=tree-cover&suite=full-turn&run=full-turn-candidate&seconds=120&gpu=0&verify=1&fullTurn=1';}
  if(q.get('suite')==='validation'&&label==='validation-baseline'){const params=new URLSearchParams({study:'tree-cover',suite:'validation',mode:'baseline',run:'validation-candidate',seconds:'20',gpu:'0',verify:'1'});location.href='/candidate/tactics/battle-3d.html?'+params;}
 }
}
