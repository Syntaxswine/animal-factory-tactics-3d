// node tools/speaking-heads-viewer-check.mjs [--base=http://127.0.0.1:4499] [--ref=<git ref>]
// The speaking-heads viewer (tactics/speaking-heads.html) in the real browser, against the
// architect's review of 15 October 2026:
//  - one animation loop: while a line is said, at most one animation-frame request is pending, and
//    the frames drawn a second stay one loop's, through five control changes, a resize and a
//    character change made while speaking; stopped, none is pending;
//  - repeated character changes do not grow what the renderer holds: after three rounds of the
//    same six characters, the geometries and textures held are no more than after the first.
// Exits 1 if either fails. `--ref` serves the viewer as it was at a git ref in place of the working
// tree's (the check can fail: at 02cdd5a, before the fix, it counts a loop a redraw).
// Needs the page served (npm run serve, or the af3d-speaking-heads launch entry) and a Playwright
// with Edge (PLAYWRIGHT_PATH, as the other review tools).
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const arg=k=>process.argv.find(a=>a.startsWith('--'+k+'='))?.split('=')[1];
const base=arg('base')||'http://127.0.0.1:4499',ref=arg('ref');
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const viewer=ref?execFileSync('git',['show',`${ref}:dist/tactics/speaking-heads-viewer.js`],{cwd:new URL('..',import.meta.url),encoding:'utf8'}):null;
const ROUND=['goat','bull','horse','skunk','pig-director','hen'],failures=[];
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 if(viewer)await page.route(/\/tactics\/speaking-heads-viewer\.js/,r=>r.fulfill({body:viewer,contentType:'text/javascript'}));
 // every animation-frame request counted: pending now, and callbacks run
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window),caf=window.cancelAnimationFrame.bind(window),pending=new Set();window.__frames={pending,ran:0};
  window.requestAnimationFrame=cb=>{const id=raf(t=>{pending.delete(id);window.__frames.ran++;cb(t);});pending.add(id);return id;};
  window.cancelAnimationFrame=id=>{pending.delete(id);caf(id);};});
 await page.goto(`${base}/tactics/speaking-heads.html?animal=horse&level=10k`);await page.waitForFunction(()=>window.speakingHeadsReady,null,{timeout:180000});
 const pending=()=>page.evaluate(()=>window.__frames.pending.size);
 const perSecond=async()=>{const a=await page.evaluate(()=>window.__frames.ran);await page.waitForTimeout(1000);return await page.evaluate(()=>window.__frames.ran)-a;};
 // (the renderer, as the scene draws: the viewer before the fix has no resources())
 const memory=()=>page.evaluate(()=>{const s=speakingHeads.current.speaking.root.parent;let r=null;s.onBeforeRender=renderer=>{r=renderer;};speakingHeads.render();s.onBeforeRender=()=>{};
  return {geometries:r.info.memory.geometries,textures:r.info.memory.textures,programs:r.info.programs?.length??0};});
 const set=(id,v)=>page.evaluate(([id,v])=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input'));},[id,v]);

 const idle=await perSecond();
 await page.click('#say');await page.waitForTimeout(300);
 const speaking=await perSecond(),seen=[await pending()];
 for(const [id,v] of [['view','front'],['scale','close'],['heading','30'],['view','three'],['scale','portrait']]){await set(id,v);await page.waitForTimeout(60);seen.push(await pending());}
 await page.setViewportSize({width:1100,height:760});await page.waitForTimeout(300);seen.push(await pending());
 await page.evaluate(()=>speakingHeads.load('goat','10k'));await page.waitForTimeout(300);seen.push(await pending());
 const after=await perSecond();
 await page.click('#say');await page.waitForTimeout(300);const stopped=await pending(),still=await perSecond();
 console.log(`frames a second: idle ${idle}; speaking ${speaking}; after five controls, a resize and a character change while speaking ${after}; stopped ${still}`);
 console.log(`requests pending while speaking: ${seen.join(', ')}; stopped: ${stopped}`);
 if(Math.max(...seen)>1)failures.push(`${Math.max(...seen)} animation-frame requests pending at once while speaking`);
 if(after>speaking*1.5)failures.push(`${after} frames a second after the redraws, ${speaking} before them`);
 if(stopped||still>2)failures.push(`stopped, ${stopped} requests pending and ${still} frames a second`);

 const rounds=[];
 for(let k=0;k<3;k++){for(const id of ROUND){await page.evaluate(id=>speakingHeads.load(id,'10k'),id);await page.waitForTimeout(100);}rounds.push(await memory());}
 console.log('held after each round of',ROUND.join(', ')+':',rounds.map(r=>`${r.geometries} geometries, ${r.textures} textures, ${r.programs} programs`).join(' | '));
 if(rounds[2].geometries>rounds[0].geometries||rounds[2].textures>rounds[0].textures)failures.push(`the renderer holds more after three rounds (${rounds[2].geometries} geometries, ${rounds[2].textures} textures) than after one (${rounds[0].geometries}, ${rounds[0].textures})`);
 if(errors.length)failures.push('page errors: '+errors.join('; '));
}finally{await browser.close();}
console.log(failures.length?'FAIL\n- '+failures.join('\n- '):'PASS');
process.exitCode=failures.length?1:0;
