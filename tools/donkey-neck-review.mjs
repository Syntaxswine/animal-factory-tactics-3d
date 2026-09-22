import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4428/tactics/animal-motion.html?paused&animal=donkey');
 await page.waitForFunction(()=>window.animalMotionReady);
 await page.locator('#close').check();await page.locator('#view').selectOption('side');
 const png=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{renderer,camera,scene}=animalMotion;
  const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=760;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#353a32';ctx.fillRect(0,0,1800,760);
  for(const [row,opposite]of [false,true].entries())for(const [column,time]of [0,5.8,6.5].entries()){
   animalMotion.seek(time);
   // The normal Side camera tracks heading. Reflect it around the same focus
   // to inspect the other profile without changing the character's pose.
   if(opposite){const a=35*Math.PI/180,focus=new T.Vector3(.5*Math.cos(a),.77,.5*Math.sin(a));camera.position.x=2*focus.x-camera.position.x;camera.position.z=2*focus.z-camera.position.z;camera.lookAt(focus);camera.updateMatrixWorld(true);renderer.render(scene,camera);}
   ctx.drawImage(renderer.domElement,250,0,600,360,column*600,row*380+20,600,360);
   ctx.fillStyle='white';ctx.font='15px sans-serif';ctx.fillText((opposite?'Opposite profile':'Profile')+' · '+time.toFixed(1)+' s',column*600+12,row*380+16);
  }
  return canvas.toDataURL('image/png').split(',')[1];
 });
 assert.deepEqual(errors,[]);
 fs.writeFileSync(new URL('../docs/tactics/hybrid-review/animal-motion/donkey-neck-profiles.png',import.meta.url),Buffer.from(png,'base64'));
 console.log('Captured both actual donkey profiles in carry, transition and aim.');
}finally{await browser.close();}
