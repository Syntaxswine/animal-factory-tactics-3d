import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.env.REVIEW_URL||'http://127.0.0.1:4331/tactics/battle-3d.html',out=new URL('../artifacts/battle-posture/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url);await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 const box=await page.locator('#battle').boundingBox();
 const before=await page.evaluate(()=>({view:{...battle3d.view},units:battle3d.state.units.filter(u=>u.team==='squad').map(u=>battle3d.project(u))}));
 const a={x:Math.min(...before.units.map(p=>p.x))-20,y:Math.min(...before.units.map(p=>p.y))-20},b={x:Math.max(...before.units.map(p=>p.x))+20,y:Math.max(...before.units.map(p=>p.y))+20};
 for(const [start,end]of [[a,b],[b,a]]){await page.keyboard.down('Shift');await page.mouse.move(box.x+start.x,box.y+start.y);await page.mouse.down();await page.mouse.move(box.x+end.x,box.y+end.y,{steps:6});await page.screenshot({path:fileURLToPath(new URL('selection-rectangle.png',out))});await page.mouse.up();await page.keyboard.up('Shift');assert.deepEqual(await page.evaluate(()=>battle3d.selectedIds),[0,1,2,3]);assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),before.view);assert.equal(await page.evaluate(()=>battle3d.state.queue.length),0);}
 // Actual canonical group order through a ground click.
 const destination=await page.evaluate(()=>battle3d.project({x:4,y:4,z:0}));await page.mouse.click(box.x+destination.x,box.y+destination.y);
 await page.waitForFunction(()=>battle3d.state.units.filter(u=>u.team==='squad').every(u=>u.steps>0));await page.keyboard.press('Escape');
 await page.click('#restart');await page.waitForFunction(()=>battle3d.renderer.models.size>=4);assert.deepEqual(await page.evaluate(()=>battle3d.selectedIds),[0]);
 await page.click('#stance-kneeling');await page.waitForFunction(()=>battle3d.renderer.motion.sample(battle3d.state.units[0]).pose.kneel===1);
 await page.click('#stance-prone');await page.waitForFunction(()=>battle3d.renderer.motion.sample(battle3d.state.units[0]).pose.prone===1);
 await page.screenshot({path:fileURLToPath(new URL('gameplay-prone.png',out))});
 await page.emulateMedia({reducedMotion:'reduce'});await page.click('#stance-standing');await page.waitForFunction(()=>battle3d.renderer.motion.sample(battle3d.state.units[0]).pose.prone===0);
 // Controlled casualty fixture: confirms the live renderer, selection pruning and recovery.
 await page.evaluate(()=>{const u=battle3d.state.units[0];u.hp=0;u.casualty='bleeding';u.bleedTurns=3;battle3d.state.revision++;});await page.waitForFunction(()=>!battle3d.selectedIds.includes(0));
 for(const state of ['bleeding','stable','dead']){await page.evaluate(state=>{const u=battle3d.state.units[0];u.casualty=state;battle3d.state.revision++;},state);await page.waitForFunction(state=>battle3d.renderer.motion.sample(battle3d.state.units[0]).posture===state,state);}
 await page.evaluate(()=>{const u=battle3d.state.units[0];u.hp=5;u.casualty=null;u.stance='kneeling';battle3d.state.revision++;});await page.waitForFunction(()=>battle3d.renderer.motion.sample(battle3d.state.units[0]).pose.kneel===1);
 assert.deepEqual(errors,[]);
 // Independently lit contact sheets of the production rigs and materials.
 await page.goto(new URL('default-factory.json',url).href);
 await page.evaluate(async()=>{
  document.body.innerHTML='<canvas id="sheet"></canvas>';document.body.style.cssText='margin:0;background:#25362f';
  const base=new URL('battle-3d.html',location.href).href,T=await import(new URL('vendor/three.module.js',base)),{ANIMAL_MOTION_CATALOG}=await import(new URL('animal-motion-catalog.js',base));
  const {createAnimalPaint}=await import(new URL('animal-motion-paint.js',base)),{createBattlePosture}=await import(new URL('battle-posture.js',base)),{createWorkerLocomotion}=await import(new URL('worker-locomotion.js',base)),{createWeaponModel}=await import(new URL('weapon-models.js',base)),{createRifleFiring}=await import(new URL('rifle-firing.js',base));
  const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1440,650);renderer.setClearColor('#25362f');renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-6.8,6.8,3.07,-3.07,.1,100);camera.position.set(0,6,10);camera.lookAt(0,.4,0);scene.add(new T.HemisphereLight(0xfff0d5,0x667367,2));const light=new T.DirectionalLight(0xffead1,2.5);light.position.set(-3,8,6);scene.add(light);
  const ground=new T.Mesh(new T.PlaneGeometry(30,15),new T.MeshStandardMaterial({color:'#6a7658',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.01;scene.add(ground);
  let previous=[];window.sheet=async id=>{for(const item of previous){scene.remove(item.group);item.loc.dispose();item.paint.dispose();item.weapon?.dispose();item.w.dispose();}previous=[];
   const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),data=await fetch(new URL(profile.file,base)).then(r=>r.json());
   const poses=[{}, {kneel:1},{prone:1},{down:1},{down:1,stable:1},{down:1,dead:1}];
   for(const [i,pose]of poses.entries()){
    const w=profile.create(data),paint=await createAnimalPaint(renderer,w,profile,new T.TextureLoader());for(const part of w.parts)part.material=paint.material;
    const posture=createBattlePosture(w,profile),loc=createWorkerLocomotion(w,profile),weapon=profile.unarmed?null:createWeaponModel('rifle');if(weapon)w.equipWeapon(weapon);
    const sample={pose,distance:0,blend:0,heading:145};loc.apply(sample);
    if(pose.prone&&weapon){const f=createRifleFiring(w,profile,posture),h=sample.heading*Math.PI/180;f.apply({aim:0,target:new T.Vector3(12*Math.cos(h),.48,12*Math.sin(h)),sample});}else{posture.apply(sample);if(i)posture.ground();}
    const group=new T.Group();group.add(w.root);group.position.set(-5.5+i*2.2,0,0);group.updateMatrixWorld(true);scene.add(group);previous.push({w,paint,loc,weapon,group});
   }
   renderer.render(scene,camera);
  };
  window.sheetIds=ANIMAL_MOTION_CATALOG.map(p=>p.id);
 });
 // Stop the encounter's frame loop before installing the study canvas.
 for(const id of await page.evaluate(()=>sheetIds)){await page.evaluate(id=>sheet(id),id);await page.locator('#sheet').screenshot({path:fileURLToPath(new URL(id+'.png',out))});}
 fs.writeFileSync(new URL('results.json',out),JSON.stringify({selection:true,groupMovement:true,stances:true,casualtyRecovery:true,sheets:12,errors},null,2));console.log('Selection, group movement, stance, casualty and 12-species visual sheets completed.');
}finally{await browser.close();}
