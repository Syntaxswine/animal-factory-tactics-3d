// Browser regression for tactics/idle-study.html: every character, view, scale and loop seed renders without
// errors, seeking is stable in GPU resources, the timeline buttons work, and the review images are written to
// docs/tactics/hybrid-review/idle/. Needs PLAYWRIGHT_PATH and a preview (URL argument, default port 4486).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const runtime=process.env.PLAYWRIGHT_PATH;if(!runtime)throw Error('Set PLAYWRIGHT_PATH to the installed Playwright package');
const {chromium}=await import(pathToFileURL(path.join(runtime,'index.mjs')).href);
// The review browser is owned by this script and closed in its finally block, with a start and a close receipt.
const records=path.resolve(import.meta.dirname,'../artifacts/idle-study/helpers');fs.mkdirSync(records,{recursive:true});
const owner=await chromium.launchServer({channel:'msedge',headless:true}),pid=owner.process().pid,record=path.join(records,'idle-study-'+pid+'-'+Date.now());
const identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'})):{pid};
fs.writeFileSync(record+'.json',JSON.stringify({identity,task:'idle-study',startedAt:new Date().toISOString(),end:'this script closes browser and server in finally'},null,2));
const out=path.resolve(import.meta.dirname,'../docs/tactics/hybrid-review/idle');fs.mkdirSync(out,{recursive:true});
const errors=[],base=process.argv[2]||'http://127.0.0.1:4486';let browser,configurations=0,samples=0;
// A contact sheet drawn by the study's own renderer: one 300 px tile per [character, seed, time, focus, half-height, azimuth, elevation].
const sheet=async(page,file,tiles,cols)=>{const url=await page.evaluate(async({tiles,cols})=>{const S=window.idleStudy,c=S.renderer.domElement,cam=S.camera,shots=[];
  for(const [species,seed,t,f,half,az,el] of tiles){if(S.species!==species)await S.cast(species);if(S.motion.seed!==seed)S.set({seed});const st=S.seek(t),w=c.width,h=c.height;
   cam.left=-half*w/h;cam.right=half*w/h;cam.top=half;cam.bottom=-half;cam.position.set(f[0]+Math.sin(az)*6,f[1]+el*6,f[2]+Math.cos(az)*6);cam.lookAt(...f);cam.updateProjectionMatrix();S.renderer.render(S.scene,cam);
   const tile=document.createElement('canvas');tile.width=tile.height=300;tile.getContext('2d').drawImage(c,(w-h)/2,0,h,h,0,0,300,300);shots.push({tile,label:species+' · '+t.toFixed(2)+' s · '+st.phase});}
  const comp=document.createElement('canvas');comp.width=cols*300;comp.height=Math.ceil(shots.length/cols)*300;const g=comp.getContext('2d');g.font='12px sans-serif';
  shots.forEach((s,i)=>{const x=i%cols*300,y=Math.floor(i/cols)*300;g.drawImage(s.tile,x,y);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x,y,300,18);g.fillStyle='#fff';g.fillText(s.label,x+4,y+13);});return comp.toDataURL('image/png');},{tiles,cols});
 fs.writeFileSync(path.join(out,file),Buffer.from(url.split(',')[1],'base64'));};
try{
 browser=await chromium.connect(owner.wsEndpoint());
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/tactics/idle-study.html?paused',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.idleStudyReady,{timeout:90000});
 const cast=await page.evaluate(()=>[...document.getElementById('species').options].map(o=>o.value));assert.equal(cast.length,11);assert.ok(!cast.includes('hen'));
 // Horse: every view, scale and gaze setting, at a moment mid-look.
 for(const view of ['three','side','front','rear'])for(const scale of ['close','wide','game'])for(const gaze of [false,true]){
  const s=await page.evaluate(o=>{window.idleStudy.set(o);return window.idleStudy.seek(4.4);},{view,scale,gaze});assert.equal(s.view,view);assert.equal(s.scale,scale);assert.ok(Number.isFinite(s.hips[0]));configurations++;samples++;}
 // Seeds: each is its own loop with its own looks.
 const schedules=[];for(let seed=1;seed<=8;seed++){const looks=await page.evaluate(seed=>{window.idleStudy.set({seed});for(let i=0;i<=30;i++)window.idleStudy.seek(window.idleStudy.length*i/30);return window.idleStudy.schedule.looks.map(l=>l.time.toFixed(2)+l.label).join();},seed);schedules.push(looks);samples+=31;}
 assert.equal(new Set(schedules).size,8,'eight seeds, eight different loops');
 // Every character: cast, seek round the loop.
 for(const id of cast){const s=await page.evaluate(async id=>{await window.idleStudy.cast(id);let st;for(let i=0;i<=20;i++)st=window.idleStudy.seek(window.idleStudy.length*i/20);return st;},id);assert.equal(s.species,id);configurations++;samples+=21;}
 // GPU resources stay put while seeking.
 await page.evaluate(async()=>{await window.idleStudy.cast('horse');window.idleStudy.set({seed:1,view:'three',scale:'close',gaze:false});});
 const stats=await page.evaluate(()=>{const before=window.idleStudy.seek(0);for(let pass=0;pass<3;pass++)for(let i=0;i<=120;i++)window.idleStudy.seek(window.idleStudy.length*i/120);const after=window.idleStudy.seek(0);return {before:{geometries:before.geometryCount,textures:before.textureCount},after:{geometries:after.geometryCount,textures:after.textureCount}};});
 assert.equal(stats.before.geometries,stats.after.geometries);assert.equal(stats.before.textures,stats.after.textures);samples+=363;
 // An unknown control or value, and a gaze line that is not simply on or off, are refused.
 for(const o of [{colour:'red'},{species:'hen'},{seed:9},{gaze:'no'},{gaze:1}]){const refused=await page.evaluate(async o=>{try{await window.idleStudy.set(o);return null;}catch(e){return e.message;}},o);assert.ok(refused,JSON.stringify(o)+' is refused');}
 // A look button pauses and jumps to where that look lands.
 await page.locator('#keyframes button').nth(2).click();assert.equal(await page.locator('#play').textContent(),'Play');
 const landed=await page.evaluate(()=>{const l=window.idleStudy.schedule.looks[2];return (l.time+l.dur).toFixed(2);});assert.match(await page.locator('#status').textContent(),new RegExp('^'+landed.replace('.','\\.')));
 // Review images.
 for(const [name,o,t] of [['close-three',{view:'three',scale:'close',gaze:true},4.4],['gameplay',{view:'three',scale:'game',gaze:false},4.4],['surroundings',{view:'three',scale:'wide',gaze:true},24.9]]){await page.evaluate(({o,t})=>{window.idleStudy.set(o);window.idleStudy.seek(t);},{o,t});await page.screenshot({path:path.join(out,name+'.png')});}
 const looks=await page.evaluate(()=>window.idleStudy.schedule.looks.map(l=>l.time+l.dur));
 await sheet(page,'looks-horse.png',looks.map(t=>['horse',1,t,[.02,1.0,0],.62,.66,.22]),7);
 // The deepest glance at the ground each of six characters makes in loops 1-8, beside the same loop's opening look ahead
 // (the sheep and the pig director, whose clothes hold their heads, do not glance at the ground).
 const downs=[];for(const id of ['horse','cow','donkey','dog','goat','pig-foreman'])downs.push(await page.evaluate(async id=>{const S=window.idleStudy;await S.cast(id);let best=null;
  for(let seed=1;seed<=8;seed++){await S.set({seed});for(const l of S.schedule.looks)if(l.kind==='ground'&&(!best||l.pitch<best.pitch))best={seed,start:l.time,land:l.time+l.dur+.4,pitch:l.pitch};}return {id,...best};},id));
 assert.ok(downs.every(d=>d.pitch<-8),'each of the six glances down at least 8 degrees');
 await sheet(page,'glance-down-profile.png',downs.flatMap(d=>[[d.id,d.seed,0,[.05,1.3,0],.32,0,.02],[d.id,d.seed,d.land,[.05,1.3,0],.32,0,.02]]),6);
 await sheet(page,'cast.png',cast.map(id=>[id,3,11.6,[.02,.95,0],.75,.66,.2]),6);
 await page.evaluate(async()=>{await window.idleStudy.cast('horse');window.idleStudy.set({seed:1,view:'three',scale:'close',gaze:true});window.idleStudy.seek(4.4);});
 await page.setViewportSize({width:760,height:740});await page.evaluate(()=>window.idleStudy.draw());await page.screenshot({path:path.join(out,'compact.png')});
 assert.deepEqual(errors,[]);const report={browserConfigurations:configurations,seekSamples:samples,characters:cast,errors,stats};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({browserConfigurations:configurations,seekSamples:samples,errors}));
}finally{try{await browser?.close();}finally{await owner.close();fs.writeFileSync(record+'-closed.json',JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:owner.process().exitCode},null,2));}}
