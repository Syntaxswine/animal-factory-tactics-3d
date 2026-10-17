const replace=(text,find,replacement)=>{if(!text.includes(find))throw Error('Instrumentation anchor missing: '+find.slice(0,80));return text.replace(find,replacement);};
export function instrumentQueries(name,body){
 const functions={'core/engine.js':['stepEnemy','stepMovement','cascade','refreshNow','zoneVisible','lineOfSight','reachable','pathTo','threatens','previewAttack','geometricPerceive','perceive'],
  'core/projectiles.js':['traceProjectile'],'awareness.js':['illuminationAt','clearRay','lampStrength','spotlightReveals','ordinaryReveals','updateAwareness'],
  'foliage-obstacles.js':['synchronizeFoliage','foliageRayHit'],'battle-3d.js':['showGuardSight','sync']}[name];
 if(!functions)return body;
 let wrappers='';for(const fn of functions){const pattern=new RegExp('(export )?function '+fn+'\\(');if(!pattern.test(body))throw Error('Missing profile function '+fn);body=body.replace(pattern,(_,exp)=>{wrappers+=(exp||'')+'function '+fn+'(...args){return profileCall('+JSON.stringify(name+':'+fn)+',profileOriginal_'+fn+',args);}\n';return 'function profileOriginal_'+fn+'(';});}
 if(name==='core/engine.js'){
  body=replace(body,'while(heap.length){const p=pop();if(p.g!==scores.get(p.k))continue;',"while(heap.length){const p=pop();if(p.g!==scores.get(p.k))continue;profileCount('pathTo.nodes');");
  body=replace(body,'if(p.cost!==costs.get(key(p.x,p.y,p.z)))continue;',"if(p.cost!==costs.get(key(p.x,p.y,p.z)))continue;profileCount('reachable.nodes');");
  body=replace(body,'if(p.g!==scores.get(p.k))continue;expanded++;',"if(p.g!==scores.get(p.k))continue;expanded++;profileCount('boundedRoute.nodes');");
 }
 return `import {profileCall,profileCount} from '${name.startsWith('core/')?'../':'./'}cpu-diagnostics.js';\n`+wrappers+body;
}
export function instrument(name,body,detailed,play=false){
 body=body.replaceAll('\r\n','\n');
 if(name==='save-store.js')return body.replace("const DB='animal-factory-tactics-3d-saves-v1'","const DB='performance-verification-2026-10-16'");
 if(name==='battle-map.js')return "import {populatedFixture} from './performance-fixture.js';\n"+replace(body,'const token=globalThis.location?','return populatedFixture();\n const token=globalThis.location?');
 if(name==='battle-3d.js'){
  if(play){
   body=replace(body,"if(new URLSearchParams(location.search).get('study')==='tree-cover')return;",'');
   body=replace(body,'async function saveGame(id){',"async function saveGame(id){const at=performance.now();try{return await saveGameAudit(id);}finally{globalThis.playAudit?.record({event:'save-elapsed',id,ms:performance.now()-at});}}\nasync function saveGameAudit(id){");
   body=replace(body,'settleEncounterRounds(state);const record=campaign?null:captureEncounter(state);',"const at=performance.now();settleEncounterRounds(state);const record=campaign?null:captureEncounter(state);globalThis.playAudit?.record({event:'save-capture',id,ms:performance.now()-at});");
   const start=body.indexOf("if(new URLSearchParams(location.search).get('study')==='tree-cover'){const {installFoliagePerformanceReview}"),end=body.indexOf('\n',start);
   if(start<0)throw Error('Review installation anchor missing');return body.slice(0,start)+"const {installPlayAudit}=await import('./play-audit.js');installPlayAudit(window.battle3d);"+body.slice(end);
  }
  body="import {installInvestigation} from './performance-lab.js';\n"+body;
  body=replace(body,"$('difficulty').value=readSettings().difficulty;","$('difficulty').value='easy';");
  body=replace(body,'function autosave(){','function autosave(){return;');
  body=replace(body,'function frame(now){\n try{','function frame(now){\n if(window.perfLab?.before(now)===false)return;\n try{');
  body=replace(body,'tickEncounterClock(state,elapsed,{paused:paused()||renderer.traversal.busy});','');
  body=replace(body,'if(!paused()&&!renderer.busy&&presentationTime-lastStep>stepDelay){','if(false){');
  body=replace(body,'renderer.foliageSelectedIds=selectedIds;','window.perfLab.step(state,renderer,()=>sync());\n  renderer.foliageSelectedIds=selectedIds;');
  body=replace(body,'  requestAnimationFrame(frame);','  window.perfLab.after(state,renderer);\n  requestAnimationFrame(frame);');
  const start=body.indexOf("if(new URLSearchParams(location.search).get('study')==='tree-cover'){const {installFoliagePerformanceReview}");
  const end=body.indexOf('\n',start);if(start<0)throw Error('Review installation anchor missing');
  body=body.slice(0,start)+'await installInvestigation(window.battle3d);'+body.slice(end);
  if(detailed){body=replace(body,'picks=renderer.draw(ctx,state,view,width,height,level);','window.perfLab.mark("beforeDraw");picks=renderer.draw(ctx,state,view,width,height,level);window.perfLab.mark("afterDraw");');body=replace(body,'if(!paused()&&pickupOrder.pending)','window.perfLab.mark("afterOverlays");if(!paused()&&pickupOrder.pending)');}
 }
 if(detailed&&name==='hybrid-renderer.js'){
  body=replace(body,'  const drawStart=performance.now();','  window.perfLab?.mark("hybridStart");const drawStart=performance.now();');
  body=replace(body,'  const focus=battleFloorPoint','  window.perfLab?.mark("worldReady");const focus=battleFloorPoint');
  body=replace(body,'  const units=editor?','  window.perfLab?.mark("biomesReady");const units=editor?');
  body=replace(body,'  this.wallXray?.update(width','  window.perfLab?.mark("actorsReady");this.wallXray?.update(width');
  body=replace(body,'if(this.lights)this.lights.render','window.perfLab?.mark("lightsReady");if(this.lights)this.lights.render');
  body=replace(body,'ctx.drawImage(this.renderer.domElement','window.perfLab?.mark("webglReady");ctx.drawImage(this.renderer.domElement');
  body=replace(body,'this.drawTimes??=[];','window.perfLab?.mark("copyReady");this.drawTimes??=[];');
 }
 return body;
}
