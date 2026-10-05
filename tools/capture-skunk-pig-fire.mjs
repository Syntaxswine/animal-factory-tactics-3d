// Export composition only: reuse the approved fire/tank actors and effects.
// This is a staged illustration, not a captured combat outcome or game adapter.
import fs from 'node:fs';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const directory=new URL('../artifacts/tank-blast/skunk-pig-gif/',import.meta.url);fs.mkdirSync(new URL('frames/',directory),{recursive:true});
const base=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:4473/study/tactics/';
const browser=await chromium.launch({channel:'msedge',headless:true});let identity;const errors=[],samples=[];
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('helper.json',directory),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'skunk/pig fire GIF',purpose:'Capture staged skunk firing at Red Hat pig tank explosion',end:'After capture; browser.close in finally',startedAt:new Date().toISOString()},null,2));
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(new URL('painted-fire-study.html?operator=skunk&operatorOutfit=normal&animal=pig-foreman&outfit=red-hats&weapon=flamethrower&steps=0&paused=',base).href);await page.waitForFunction(()=>window.fireStudyReady,{},{timeout:60000});
 await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createTankBlastMotion,tankCentre,TANK_TIME}=await import('./tank-blast-motion.js'),{createTankBlastEffects}=await import('./tank-blast-effects.js'),{createPaintedFireEffects}=await import('./painted-fire-effects.js'),{makeBurnRoute,FIRE_TIME,smooth}=await import('./painted-fire-state.js');
  const study=window.fireStudy,{renderer,scene,camera}=study,[shooter,target]=study.actors,V=(...a)=>new T.Vector3(...a),host=document.getElementById('viewport'),targetX=7,burstAt=1.10;
  host.style.boxSizing='content-box';host.style.width='960px';host.style.height='540px';renderer.setPixelRatio(1);renderer.setSize(960,540,false);
  // Let the existing viewer finish its layout pass before composing this fixed shot.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  for(const o of scene.children){if(o.isGroup&&o.children.some(c=>c.isLine))o.visible=false;if(o.isMesh&&o.geometry.type==='PlaneGeometry'&&o.geometry.parameters.width<1)o.visible=false;}
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const sun=scene.children.find(o=>o.isDirectionalLight);sun.position.set(3,9,7);sun.target.position.set(5,0,0);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:9,bottom:-9,near:.1,far:30});sun.shadow.bias=-.0004;
  for(const actor of [shooter,target])actor.worker.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});for(const o of scene.children)if(o.isMesh&&o.geometry.parameters.width>10)o.receiveShadow=true;
  const loader=new T.TextureLoader(),[flameContract,tankContract]=await Promise.all([fetch('./fixtures/painted-fire-contract.json').then(r=>r.json()),fetch('./fixtures/tank-blast-contract.json').then(r=>r.json())]);
  const tank=createTankBlastMotion(target),bodyFx=await createPaintedFireEffects(scene,loader,target.worker),origin=tank.origin.clone().applyAxisAngle(V(0,1,0),Math.PI).add(V(targetX,0,0)),blastFx=await createTankBlastEffects(scene,loader,origin),bodyRoute=makeBurnRoute([{x:targetX,z:0}]),groundBounds=new Map();
  const ppu=63;camera.position.set(6.8,7.2,11);camera.lookAt(V(5.3,.65,0));camera.left=-480/ppu;camera.right=480/ppu;camera.top=270/ppu;camera.bottom=-270/ppu;camera.updateProjectionMatrix();
  function draw(t){
   const shot=shooter.motion.fire(t),d=tank.apply(t-burstAt+TANK_TIME.burst);
   // Pose in each rig's own frame, then place it; never solve IK under a moved parent.
   target.worker.root.position.x=targetX;target.worker.root.rotation.y=Math.PI;target.worker.root.updateMatrixWorld(true);target.worker.skeleton.update();
   const age=t-burstAt;
   study.effects.update(t,{shape:flameContract.open,muzzle:V(...shot.muzzle),camera,route:bodyRoute,body:false,flame:true,visible:true});
   bodyFx.update(d.blast.burnTime,{shape:flameContract.open,muzzle:V(),camera,route:bodyRoute,body:d.blast.active,flame:false,visible:true,suppressSmoke:age<.45});
   const fx=blastFx.update(age,{camera,contract:tankContract.open,groundOpacity:1-smooth((age-2.5)/1)});
   // Translate the recorded ground mask along with its cards, without changing its cells.
   for(const m of blastFx.ground){m.position.x+=targetX;const bounds=m.material.uniforms.groundBounds.value;if(!groundBounds.has(m))groundBounds.set(m,bounds.clone());bounds.copy(groundBounds.get(m));bounds.x+=targetX;}
   renderer.render(scene,camera);
   return {time:t,phase:d.blast.phase,operator:shooter.selection.animal,target:target.selection.animal,outfit:target.selection.outfit,targetX,burstAt,origin:origin.toArray(),wornOrigin:d.blast.active?null:tankCentre(target.worker).toArray(),destroyed:d.body.equipmentDestroyed,gear:[target.worker.weapon.root,target.worker.weapon.mount,target.worker.weapon.hose].map(o=>o.visible),shooterGripError:shot.gripError,fireCells:fx.fireCells,groundMinX:Math.min(...blastFx.ground.map(m=>m.userData.cell.x+targetX))};
  }
  window.fireEncounter={draw,renderer,dispose(){bodyFx.dispose();blastFx.dispose();sun.shadow.dispose();study.dispose();}};
 });
 const snapshots={0:'ready',.60:'spray',.95:'hit',1.10:'rupture',1.45:'blast',2.1:'fire',3.5:'smoke',6:'aftermath'};
 for(let i=0;i<=120;i++){
  const result=await page.evaluate(t=>{const d=window.fireEncounter.draw(t);return {...d,png:window.fireEncounter.renderer.domElement.toDataURL('image/png').split(',')[1]};},i/20);
  const png=Buffer.from(result.png,'base64');fs.writeFileSync(new URL('frames/'+String(i).padStart(3,'0')+'.png',directory),png);if(snapshots[i/20])fs.writeFileSync(new URL(snapshots[i/20]+'.png',directory),png);delete result.png;samples.push(result);
 }
 for(const s of samples){if(s.operator!=='skunk'||s.target!=='pig-foreman'||s.outfit!=='red-hats')errors.push('Wrong characters');if(s.destroyed!==(s.time>=s.burstAt)||s.gear.some(v=>v===(s.time>=s.burstAt)))errors.push('Incorrect destruction timing at '+s.time);if(s.shooterGripError>1e-6)errors.push('Operator hand detached');if(s.groundMinX<1.5)errors.push('Ground fire reached shooter');if(s.wornOrigin&&s.origin.some((v,i)=>Math.abs(v-s.wornOrigin[i])>1e-6))errors.push('Explosion origin detached from worn tanks');}
 const replay=await page.evaluate(()=>{const a=window.fireEncounter.draw(.95);window.fireEncounter.draw(6);return JSON.stringify(a)===JSON.stringify(window.fireEncounter.draw(.95));});if(!replay)errors.push('Replay differs');
 await page.evaluate(()=>window.fireEncounter.dispose());
 fs.writeFileSync(new URL('capture.json',directory),JSON.stringify({width:960,height:540,fps:20,frames:samples.length,sourceRevision:'82fef82',burstAt:1.10,errors,replay,samples},null,2));
 console.log(JSON.stringify({frames:samples.length,errors,replay}));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();fs.writeFileSync(new URL('closed.json',directory),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
