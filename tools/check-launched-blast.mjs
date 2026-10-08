import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'launched-blast-'+Date.now()),out='artifacts/grenade-blast/launchers',base=process.env.LAUNCHED_BLAST_REVIEW_URL||'http://127.0.0.1:4476';
fs.mkdirSync(out,{recursive:true});
const report={configurations:0,shots:[],pixels:[],surfaces:[],ceilings:[],errors:[]};
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(base+'/tactics/grenade-blast-study.html?paused',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.grenadeBlastReady,{},{timeout:90000});
 for(const [weapon,radius] of [['launcher',3],['rpg',4]]){
  for(const view of ['three','top','side'])for(const scale of ['fit','game'])for(const reduced of [false,true]){
   const frames=await page.evaluate(o=>{const a=grenadeBlastStudy;a.set({...o,scene:'open'});return (o.reduced?[.01,.12,.19]:[-.05,.06,.22,.42,.65,.81]).map(t=>a.seek(t));},{weapon,view,scale,reduced});
   assert.equal(frames.at(-1).visible,false);assert.ok(frames.slice(1,-1).every(f=>f.visible&&f.radius===radius));report.configurations++;
   if(view==='three'&&scale==='fit'&&!reduced){await page.evaluate(()=>grenadeBlastStudy.seek(.22));await page.screenshot({path:out+'/'+weapon+'-study.png'});}
  }
  const pixels=await page.evaluate(async ({weapon,radius})=>{
   const T=await import('./vendor/three.module.js'),a=grenadeBlastStudy;a.set({weapon,scene:'open',view:'top',scale:'fit',reduced:false,guide:false});a.seek(.3);
   const gl=a.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,before=new Uint8Array(w*h*4),after=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,after);
   a.fx.dust.visible=false;a.renderer.render(a.scene,a.camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,before);
   const at=(x,y)=>{const v=new T.Vector3(x/w*2-1,y/h*2-1,-1).unproject(a.camera),d=new T.Vector3(0,0,-1).applyQuaternion(a.camera.quaternion);return v.addScaledVector(d,-v.y/d.y);},corner=at(.5,.5),dx=at(1.5,.5).sub(corner),dy=at(.5,1.5).sub(corner);
   let changed=0,outer=0,beyond=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);if(d<8)continue;changed++;const r=Math.hypot(corner.x+x*dx.x+y*dy.x-8,corner.z+x*dx.z+y*dy.z-8);if(r>radius-.8)outer++;if(r>radius+.15)beyond++;}
   a.draw();return {weapon,radius,changed,outer,beyond};
  },{weapon,radius});assert.ok(pixels.changed>1000);assert.ok(pixels.outer>100);assert.equal(pixels.beyond,0,JSON.stringify(pixels));report.pixels.push(pixels);
 }
 for(const weapon of ['launcher','rpg']){
  const surface=await page.evaluate(async weapon=>{
   const {explosiveTrajectory,detonate}=await import('./core/explosives.js'),{WEAPONS}=await import('./core/engine.js'),a=grenadeBlastStudy;a.set({weapon,scene:'cliff',view:'three',scale:'fit',reduced:false,guide:false});
   const s=a.fixture.state,shooter={id:0,x:2,y:8,z:0,stance:'standing'},target={x:8,y:8,z:1,ground:true,cliffSupport:{level:0,height:2}},impact=explosiveTrajectory(s,shooter,target,WEAPONS[weapon],{chance:100},()=>0),blast=detonate(s,impact,{...WEAPONS[weapon],damage:0}).blast;
   a.fixture.shot.event={trajectories:[impact],explosions:[blast]};a.seek(.22);a.camera.position.set(0,7,14);a.camera.lookAt(7,1.5,8);a.camera.updateMatrixWorld(true);a.fx.update(a.fixture.shot,s,a.camera);a.renderer.render(a.scene,a.camera);
   const gl=a.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,before=new Uint8Array(w*h*4),after=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,after);a.fx.dust.visible=false;a.renderer.render(a.scene,a.camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,before);
   let changed=0;for(let i=0;i<after.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>8)changed++;
   a.fx.dust.visible=true;a.renderer.render(a.scene,a.camera);return {weapon,kind:impact.kind,h:impact.h,changed,clearHeight:a.fx.field.ceiling-a.fx.field.floor,reach:Math.max(...a.fx.field.rays)};
  },weapon);assert.ok(surface.changed>1000,JSON.stringify(surface));assert.ok(surface.clearHeight>1);assert.ok(surface.reach>2.9);report.surfaces.push(surface);await page.screenshot({path:out+'/'+weapon+'-cliff-contact.png'});
 }
 for(const weapon of ['launcher','rpg']){
  const ceiling=await page.evaluate(async weapon=>{
   const {explosiveTrajectory,detonate}=await import('./core/explosives.js'),{WEAPONS}=await import('./core/engine.js'),a=grenadeBlastStudy;a.set({weapon,scene:'ceiling',view:'side',scale:'fit',reduced:false,guide:false});
   const s=a.fixture.state,shooter={id:0,x:3,y:8,z:0,stance:'standing'},target={x:8,y:8,z:weapon==='rpg'?1:0,ground:true},impact=explosiveTrajectory(s,shooter,target,WEAPONS[weapon],{chance:100},()=>0),blast=detonate(s,impact,{...WEAPONS[weapon],damage:0}).blast;
   a.fixture.shot.event={trajectories:[impact],explosions:[blast]};a.seek(.22);a.camera.position.set(8,2.12,18);a.camera.lookAt(8,2.12,8);a.camera.updateMatrixWorld(true);a.fx.update(a.fixture.shot,s,a.camera);a.renderer.render(a.scene,a.camera);
   const gl=a.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,before=new Uint8Array(w*h*4),after=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,after);a.fx.dust.visible=false;a.renderer.render(a.scene,a.camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,before);
   let changed=0,above=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])<=8)continue;changed++;if(2.12+((y+.5)/h*2-1)*a.camera.top>2.02)above++;}
   a.fx.dust.visible=true;a.renderer.render(a.scene,a.camera);return {weapon,changed,above,level:a.fx.field.level,ceiling:a.fx.field.ceiling};
  },weapon);assert.ok(ceiling.changed>1000,JSON.stringify(ceiling));assert.equal(ceiling.above,0);assert.equal(ceiling.level,0);assert.equal(ceiling.ceiling,2);report.ceilings.push(ceiling);await page.screenshot({path:out+'/'+weapon+'-ceiling-contact.png'});
 }
 await page.goto(base+'/tactics/battle-3d.html?study=launchers',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4,{},{timeout:90000});
 await page.evaluate(async()=>{if(!battle3d.paused)document.querySelector('#pause').click();await battle3d.renderer.grenades.ready;});
 for(let id=0;id<4;id++){
  await page.emulateMedia({reducedMotion:id<2?'no-preference':'reduce'});
  await page.locator('#squad button').nth(id).click();await page.locator('#center').click();
  // Use the real attack transaction and live renderer, paused at its peak so
  // a slow review machine cannot miss the sub-second effect while capturing.
  const shot=await page.evaluate(async id=>{
   const {attackGround}=await import('./core/engine.js'),s=battle3d.state,r=battle3d.renderer,a=s.units[id];s.phase='player';s.rules.awareness=false;a.ap=18;
   const before={ap:a.ap,ammo:a.ammo[a.weapon]},point={x:a.x,y:a.y-7,z:0};s.seen.add(`${point.x},${point.y}`);
   const accepted=attackGround(s,a,point);r.captureCombat(s);const shot=r.combat.active;
   if(!shot)return {accepted,weapon:a.weapon,missing:true};
   shot.start=r.presentationNow-(id<2?220:80);r.combat.advance(r.presentationNow);r.grenades.update(shot,s,r.camera);
   const fx=r.grenades;return {accepted,weapon:a.weapon,before,after:{ap:a.ap,ammo:a.ammo[a.weapon]},launched:shot.launched,kind:shot.event.explosions[0].kind,reduced:shot.reduced,duration:shot.phase.duration,radius:fx.field?.radius,reach:Math.max(...fx.field.rays),origin:fx.field?.origin,impact:shot.event.trajectories[0],painted:fx.blast.core.material.uniforms.textured.value,visible:fx.dust.visible,projectile:fx.projectile.root.visible,diagnostics:r.diagnostics};
  },id);
  const radius=shot.weapon==='rpg'?4:3,cost=shot.weapon==='rpg'?7:6;assert.ok(shot.accepted&&!shot.missing&&shot.launched,JSON.stringify(shot));assert.equal(shot.radius,radius);assert.ok(shot.reach>radius*.99);assert.equal(shot.after.ap,shot.before.ap-cost);assert.equal(shot.after.ammo,shot.before.ammo-1);assert.equal(shot.painted,1);assert.ok(shot.visible);assert.equal(shot.projectile,false);assert.equal(shot.origin.x,shot.impact.x);assert.equal(shot.origin.y,shot.impact.y);assert.equal(shot.reduced,id>=2);assert.equal(shot.duration,id<2?800:180);assert.deepEqual(shot.diagnostics,[]);
  await page.screenshot({path:out+'/'+shot.weapon+'-'+(shot.reduced?'reduced':'gameplay')+'.png'});
  const cleared=await page.evaluate(()=>{const r=battle3d.renderer;r.combat.active.start=r.presentationNow-801;r.combat.advance(r.presentationNow);r.grenades.update(r.combat.active,battle3d.state,r.camera);return !r.combat.busy&&!r.grenades.dust.visible;});assert.ok(cleared);
  // Avoid serializing the full cover snapshot into the compact test report.
  delete shot.origin.cover;delete shot.impact.path;report.shots.push(shot);
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({configurations:report.configurations,pixels:report.pixels,surfaces:report.surfaces,ceilings:report.ceilings,shots:report.shots.map(s=>({weapon:s.weapon,radius:s.radius,reduced:s.reduced})),errors:report.errors}));
}finally{await review.closeReview();}
