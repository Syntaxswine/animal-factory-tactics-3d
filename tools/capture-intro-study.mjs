import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(import.meta.dirname,'../hybrid-review/intro-animation');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'intro-capture-'+Date.now(),'intro-animation');
try{
 const page=await review.browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.INTRO_REVIEW_URL||'http://127.0.0.1:4476/tactics/intro-study.html?module=missile');await page.waitForFunction(()=>window.introReady||window.introDisposed,{timeout:60000});if(!await page.evaluate(()=>window.introReady))throw Error(await page.locator('#error').textContent());
 const states=[];
 const samples=[['missile-three',{module:'missile',view:'three'}],['missile-nose',{module:'missile',view:'nose'}],['missile-cutaway',{module:'missile',view:'three',section:true}],['missile-x',{module:'missile',view:'tail',roll:45,section:false}],...[[1,1],[2,6],[3,10],[4,13.2],[5,16],[6,18.5],[7,20.55],[8,23],[9,25.6],[10,26.9],[11,28.4],[12,34.7]].map(([shot,time])=>['shot-'+String(shot).padStart(2,'0'),{module:'sequence',time,view:'shot'}]),['skid-contact',{module:'crash',time:26.1,view:'side',effects:false,trees:false}],['rotor-contact',{module:'crash',time:28.25,view:'three',effects:false}],['exit-open',{module:'crash',time:33,view:'three',effects:false}],['exit-side',{module:'crash',time:33,view:'side',effects:false,trees:false}],['handler-side',{module:'handler',time:6,view:'side',effects:false,trees:false}]];
 samples.push(['launch-release',{module:'sequence',time:17.68,view:'shot',effects:true}],['incoming',{module:'sequence',time:20.25,view:'shot',effects:true}],['crash-overhead',{module:'sequence',time:35,view:'top',effects:true}]);
 for(const [name,opts]of samples){states.push(await page.evaluate(o=>introStudy.set(o),{trees:true,...opts,playing:false,grey:false}));await page.screenshot({path:path.join(out,name+'.png')});}
 // Verify what is actually submitted to the renderer, not just a location
 // label. Neither rotating nor seeking may expose the remote installation.
 const sectors=await page.evaluate(()=>{const s=introStudy,render=s.renderer.render,checks=[];let drawn;
  s.renderer.render=function(scene,camera){drawn=scene;return render.call(this,scene,camera);};
  try{for(const time of [0,10,16,17.68,19.399,19.4,20.5,23,26,35])for(const view of ['shot','three','side','nose','tail','top']){
   s.set({module:'sequence',time,view,playing:false});const sam=time>=14&&time<19.4,expected=sam?s.samScene:s.scene;
   if(drawn!==expected||s.launcher.root.parent!==s.samScene||s.helicopter.root.parent!==s.scene||s.environment.root.parent!==s.scene||s.samEnvironment.root.parent!==s.samScene)throw Error('Sector scene contamination');
   if(s.environment.relay||s.scene.getObjectById(s.launcher.root.id)||s.samScene.getObjectById(s.helicopter.root.id))throw Error('Remote site or aircraft leaked into the wrong sector');
   checks.push({time,view,sector:introState.sector});
  }}finally{s.renderer.render=render;}return checks;
 });
 // Actual controls, seek restoration, mobile fit, failure cleanup and repeatable resources.
 await page.locator('#module').selectOption('missile');await page.locator('#view').selectOption('nose');await page.locator('#section').check();await page.locator('#grey').check();await page.locator('#grey').uncheck();await page.locator('#trees').uncheck();if(await page.evaluate(()=>introStudy.environment.foliage.visible))throw Error('Trees toggle failed');await page.locator('#trees').check();
 await page.evaluate(()=>introStudy.set({module:'sequence',time:35}));await page.evaluate(()=>introStudy.set({time:0}));const initial=await page.evaluate(()=>({...introState.resources}));for(let i=0;i<6;i++)for(const t of [18,23,28.4,35,0])await page.evaluate(time=>introStudy.set({time}),t);const final=await page.evaluate(()=>introState.resources);
 if(initial.geometries!==final.geometries||initial.textures!==final.textures)throw Error('Resource counts grew during replay');
 await page.locator('#play').click();await page.waitForTimeout(350);if(!await page.evaluate(()=>introState.time>0))throw Error('Playback did not advance');await page.locator('#play').click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>introStudy.set({module:'missile',view:'nose',section:true}));await page.screenshot({path:path.join(out,'mobile.png')});
 await page.evaluate(()=>{introStudy.dispose();introStudy.dispose();});if(!await page.evaluate(()=>introDisposed&&!introReady))throw Error('Dispose failed');
 const reduced=await review.browser.newPage();await reduced.emulateMedia({reducedMotion:'reduce'});await reduced.goto('http://127.0.0.1:4476/tactics/intro-study.html?play');await reduced.waitForFunction(()=>window.introReady);if(await reduced.evaluate(()=>introState.playing))throw Error('Reduced motion autoplay');await reduced.evaluate(()=>introStudy.dispose());await reduced.close();
 const failed=await review.browser.newPage();await failed.route('**/utility-helicopter/paint-atlas-v1.png',route=>route.abort());await failed.goto('http://127.0.0.1:4476/tactics/intro-study.html');await failed.waitForFunction(()=>window.introDisposed);if(!await failed.locator('#error').textContent())throw Error('Missing atlas has no visible error');await failed.close();
 fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({errors,states,sectors,initial,final,controls:true,replay:true,disposed:true,reducedMotion:true,failedLoadCleanup:true},null,2));console.log(JSON.stringify({errors,samples:samples.length,sectorChecks:sectors.length,initial,final,reducedMotion:true,failedLoadCleanup:true}));if(errors.length)throw Error(errors.join('\n'));
}finally{await review.closeReview();}
