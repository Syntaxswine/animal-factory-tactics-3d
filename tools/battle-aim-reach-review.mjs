import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/battle-aim-reach/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:820}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const outfit of ['normal','red-hats']){
  await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4431/tactics/battle-3d.html');
  await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
  // Controlled resolved-event playback fixture. Actual core attack is checked
  // separately by battle-firing-review.mjs; no claim this authors a legal attack.
  await page.evaluate(async outfit=>{
   const r=battle3d.renderer,s=battle3d.state,u=s.units[1],old=r.models.get(1);s.phase='player';s.queue=[];
   old.root.removeFromParent();old.paint.dispose();old.cap?.dispose();old.worker.dispose();old.equipment?.dispose();r.models.delete(1);r.actors.delete(1);
   u.species='horse';u.outfit=outfit;u.weapon='rifle';u.stance='prone';await r.loadModel(u);
   for(let x=0;x<30;x++)for(let y=0;y<30;y++)s.visible.add(`${x},${y}`);
  },outfit);
  await page.waitForFunction(()=>battle3d.renderer.motion.sample(battle3d.state.units[1]).pose.prone===1);
  for(const reduced of [false,true]){
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   for(const unavailable of [false,true,false]){
    const playback=page.evaluate(({unavailable,reduced,dimensions})=>new Promise(resolve=>{
     // The refined horse now reaches the old near fixture. This steep endpoint
     // was checked directly and stays on the visible floor for impact checks.
     const r=battle3d.renderer,s=battle3d.state,u=s.units[1],x=u.x+(unavailable?1:6),y=u.y,height=unavailable?2:.48,floor=Math.floor(height/dimensions.floorSpacing),h=floor*3+(height-floor*dimensions.floorSpacing)*1.8/dimensions.standing;
     s.effect={sequence:[{shooter:u.id,ax:u.x,ay:u.y,az:0,bx:x,by:y,trajectories:[{x,y,h,kind:'wall'}]}]};
     const snapshot=()=>JSON.stringify(s,(_,v)=>v instanceof Set?[...v].sort():v),before=snapshot();r.captureCombat(s);
     const rows=[],start=performance.now();function sample(){
      const a=r.combat.active,m=r.models.get(1),fx=r.shotEffects;
      rows.push({busy:r.busy,supported:m.firing?.status?.supported,flash:fx.flash.visible,trace:fx.trace.visible,impact:fx.impact.visible,warning:document.getElementById('message').textContent.includes('firing animation unavailable'),staleOrigin:!!a?.presentationUnsupported&&!!a?.traceOrigin});
      if(performance.now()-start>(reduced?500:1400))resolve({rows,unchanged:before===snapshot(),cap:!!m.cap});else requestAnimationFrame(sample);
     }requestAnimationFrame(sample);
    }),{unavailable,reduced,dimensions:DIMENSIONS});
    if(unavailable&&!reduced){
     await page.waitForFunction(()=>battle3d.renderer.combat.active?.presentationUnsupported);
     await page.screenshot({path:fileURLToPath(new URL('unavailable-'+outfit+'.png',out))});
    }
    const result=await playback;
    assert.equal(result.unchanged,true,'playback mutated authoritative state');assert.equal(result.cap,outfit==='red-hats');
    assert.ok(result.rows.some(r=>r.impact));assert.equal(result.rows.at(-1).busy,false);assert.ok(result.rows.length>5);
    assert.ok(result.rows.every(r=>!r.staleOrigin));
    if(unavailable){assert.ok(result.rows.some(r=>r.warning));assert.ok(result.rows.every(r=>!r.flash&&!r.trace));}
    else if(!reduced){assert.ok(result.rows.some(r=>r.flash));assert.ok(result.rows.some(r=>r.trace));}
    if(reduced)assert.ok(result.rows.every(r=>!r.flash&&!r.trace));
    assert.equal(result.rows.at(-1).warning,false,'recovered pose left stale warning');
    results.push({outfit,reduced,unavailable,frames:result.rows.length,impactFrames:result.rows.filter(r=>r.impact).length,unchanged:result.unchanged});
   }
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('results.json',out),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close();}
