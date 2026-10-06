import {clickBattleControl} from './battle-ui-review.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
import {blankMap} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),out=new URL('../artifacts/explosive-barrels/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const origin=process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364',map=blankMap('Barrel combat check');map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];map.guards=[{x:20,y:24,species:'hen',weapon:'hands'},{x:40,y:40,species:'pig-foreman',weapon:'rifle'}];map.props=[{x:20,y:20,z:0,kind:'barrel-explosive'}];
const browser=await chromium.launch({channel:'msedge',headless:true});let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Disposable explosive-barrel browser regression',start:new Date().toISOString(),port:null,expiry:'End of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));await page.goto(origin+'/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.state,{},{timeout:60000});await page.click('#pause');
 await page.evaluate(async()=>{
  const {createGame}=await import('./core/engine.js'),{startEncounterClock}=await import('./encounter-clock.js'),fresh=createGame(0,battle3d.state.definition,true,'easy'),a=fresh.units[0];
  a.weapon='rifle';a.accuracy=1000;a.ap=30;a.heading=0;fresh.phase='player';fresh.rules.awareness=false;fresh.detected.add(4);startEncounterClock(fresh);
  for(let y=0;y<45;y++)for(let x=0;x<45;x++){fresh.visible.add(`${x},${y}`);fresh.seen.add(`${x},${y}`);}Object.assign(battle3d.state,fresh);battle3d.state.revision++;battle3d.renderer.reducedMotion={matches:true};
 });await clickBattleControl(page,'#center');await page.waitForFunction(()=>battle3d.renderer.models.has(0)&&battle3d.renderer.models.get(0).weapon==='rifle'&&battle3d.renderer.paintedEnvironment.count===1&&!battle3d.renderer.busy,{},{timeout:60000});
 const point=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),p=new T.Vector3(20,.4,20).project(battle3d.renderer.camera),r=document.querySelector('#battle').getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.mouse.move(point.x,point.y);await page.waitForFunction(()=>document.querySelector('#battle').dataset.targetCursor==='red');
 await page.evaluate(()=>battle3d.state.units[0].heading=180);await page.waitForFunction(()=>document.querySelector('#battle').dataset.targetCursor==='grey');await page.evaluate(()=>battle3d.state.units[0].heading=0);await page.waitForFunction(()=>document.querySelector('#battle').dataset.targetCursor==='red');
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('barrel-in-battle.png',out))});
 await page.click('#pause');await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>document.querySelector('#shot-popup').open);
 assert.equal(await page.locator('#shot-title').textContent(),'Explosive barrel');assert.equal(await page.locator('.body-target').count(),1);assert.equal(await page.locator('.shot-aims button').count(),3);assert.match(await page.locator('.shot-detail').textContent(),/fire reaches 5 tiles/);
 await page.locator('#shot-popup').screenshot({path:fileURLToPath(new URL('barrel-shot-menu.png',out))});
 await page.evaluate(async()=>{const r=battle3d.renderer;await Promise.all([r.fire.ready,r.tankEffects.ready]);r.reducedMotion={matches:false};});await page.click('#fire');await page.evaluate(()=>document.querySelector('#pause').click());
 await page.waitForFunction(()=>battle3d.state.effect?.explosions.some(e=>e.kind==='barrel'));
 const committed=await page.evaluate(()=>{const s=battle3d.state;return {barrels:s.props.length,hp:s.units[1].hp,ap:s.units[0].ap,ammo:s.units[0].ammo.rifle,fires:s.fires.length};});
 assert.deepEqual(committed,{barrels:0,hp:0,ap:24,ammo:4,fires:81});
 const seek=async age=>{await page.evaluate(age=>{const r=battle3d.renderer,n=r.presentationNow;if(r.combat.active)r.combat.active.start=n-age-380;for(const e of r.fire.entries.values()){e.start=n-age;e.waiting=false;}for(const e of r.tankEffects.bursts.values()){e.start=n-age;e.waiting=false;}},age);await page.waitForTimeout(100);};
 await seek(450);await page.waitForFunction(()=>[...battle3d.renderer.tankEffects.bursts.values()][0]?.motion&&battle3d.renderer.tankEffects.ground.get(0)?.effects,{},{timeout:30000});await seek(450);
 assert.equal(await page.evaluate(()=>[...battle3d.renderer.tankEffects.bursts.values()][0].effects.core.visible),true);assert.equal(await page.evaluate(()=>battle3d.renderer.paintedEnvironment.count),0);
 const breakup=await page.evaluate(()=>{const b=[...battle3d.renderer.tankEffects.bursts.values()][0];return {skin:b.motion.skin,label:b.motion.label,parts:b.motion.fragments.map(f=>f.root.name),smallFragments:b.effects.fragments.length,intact:b.motion.intact.visible};});
 assert.equal(breakup.skin,'explosiveRed');assert.equal(breakup.label,'flammable');assert.equal(breakup.parts.length,8);assert.ok(breakup.parts.includes('Released drum lid'));assert.ok(breakup.parts.includes('Released drum base'));assert.equal(breakup.smallFragments,0);assert.equal(breakup.intact,false);
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('barrel-explosion.png',out))});
 // Inspect the live drum debris without the fire obscuring its paint and labels.
 await page.evaluate(()=>{const fx=battle3d.renderer.tankEffects;fx.reviewDraw=fx.draw;fx.draw=function(camera){this.reviewDraw(camera);for(const b of this.bursts.values())if(b.effects)b.effects.group.visible=false;for(const e of this.ground.values())if(e.effects)e.effects.group.visible=false;};});await seek(300);
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('barrel-live-breakup.png',out))});await page.evaluate(()=>{const fx=battle3d.renderer.tankEffects;fx.draw=fx.reviewDraw;delete fx.reviewDraw;});
 await seek(6000);assert.equal(await page.evaluate(()=>battle3d.renderer.tankEffects.bursts.size),0);assert.equal(await page.evaluate(()=>battle3d.renderer.tankEffects.ground.get(0).effects.ground.length),81);
 await clickBattleControl(page,'#quicksave');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('saved'));
 await clickBattleControl(page,'#quickload');await page.waitForFunction(()=>!battle3d.state.effect&&battle3d.state.fireAnimations===undefined);
 assert.deepEqual(await page.evaluate(()=>({props:battle3d.state.props.length,hp:battle3d.state.units[1].hp,ap:battle3d.state.units[0].ap,ammo:battle3d.state.units[0].ammo.rifle,fires:battle3d.state.fires.length})),{props:0,hp:0,ap:24,ammo:4,fires:81});
 assert.equal(await page.evaluate(()=>battle3d.renderer.tankEffects.bursts.size),0,'loading must not replay the rupture');
 await page.evaluate(()=>window.oldRenderer=battle3d.renderer);await clickBattleControl(page,'#restart');await page.waitForFunction(()=>battle3d.renderer!==oldRenderer&&battle3d.renderer.paintedEnvironment.count===1,{},{timeout:60000});assert.equal(await page.evaluate(()=>oldRenderer.tankEffects.disposed),true);
 // Inspect the actual editor palette, placement, painted mesh, and undo/redo.
 await page.goto(origin+'/tactics/editor-3d.html?editing=1');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:60000});
 await page.locator('[data-group="objects"]').click();await page.selectOption('#prop-kind','barrel-explosive');assert.match(await page.locator('#prop-kind option:checked').textContent(),/Explosive barrel/);
 await page.evaluate(async()=>{const result=await editor3d.apply({tool:'prop',start:{x:10,y:10,z:0},options:{propKind:'barrel-explosive'}});if(!result.ok)throw Error(JSON.stringify(result));editor3d.view.x=10;editor3d.view.y=10;editor3d.view.span=10;await editor3d.changed();});
 await page.waitForFunction(()=>editor3d.scene.cargo.prototypes.has('barrel-single:explosiveRed:flammable'));
 assert.equal(await page.evaluate(()=>JSON.parse(editor3d.export()).props[0].kind),'barrel-explosive');await page.click('#undo');assert.equal(await page.evaluate(()=>editor3d.document.map.props.length),0);await page.click('#redo');assert.equal(await page.evaluate(()=>editor3d.document.map.props.length),1);
 await page.screenshot({path:fileURLToPath(new URL('barrel-in-editor.png',out))});
 // Close view of the same library mesh, using the game's actual painted atlases.
 await page.route('**/barrel-art-review.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#d5c8a7"><main id="view"></main></body></html>'}));
 page.on('dialog',d=>d.accept());await page.goto(origin+'/tactics/barrel-art-review.html');
 await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createCargoLibrary,CARGO_ATLAS}=await import('./painted-cargo.js'),{PAINTED_ATLAS}=await import('./painted-environment-scene.js');
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1000,800);renderer.setPixelRatio(1);renderer.setClearColor(0xd5c8a7);renderer.outputColorSpace=T.SRGBColorSpace;document.querySelector('#view').append(renderer.domElement);
  const loader=new T.TextureLoader(),textures=await Promise.all([loader.loadAsync(PAINTED_ATLAS),loader.loadAsync(CARGO_ATLAS)]);textures.forEach(t=>t.colorSpace=T.SRGBColorSpace);const library=createCargoLibrary(...textures),model=library.build('barrel-single','explosiveRed','flammable'),scene=new T.Scene();scene.add(model.root,new T.HemisphereLight(0xfff0cc,0x5d6b6a,2.2));const sun=new T.DirectionalLight(0xffecd0,2.5);sun.position.set(3,5,2);scene.add(sun);
  const camera=new T.PerspectiveCamera(34,1.25,.01,50);camera.position.set(1.45,1.3,2);camera.lookAt(0,.4,0);renderer.render(scene,camera);window.art={renderer,library,textures,model,scene,camera};
 });await page.locator('#view canvas').screenshot({path:fileURLToPath(new URL('explosive-barrel-closeup.png',out))});await page.evaluate(()=>{art.library.dispose();art.textures.forEach(t=>t.dispose());art.renderer.dispose();});
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('browser-review.json',out),JSON.stringify({committed,breakup,checks:['red/grey hover crosshair','click graphic aim menu','one charged shot','tank-sized blast','red labelled lid/base/panels without duplicate tank debris','quicksave/quickload without replay','restart','editor palette/placement/undo/redo','painted skin/labels'],errors},null,2));console.log('Explosive barrel gameplay, cursor/menu, breakup, save/reload, editor and painted asset browser checks pass.');
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
