// Render the intro sprite proof's keyframe stills (frames of proof.html at
// KEYFRAME_TIMES) to PNG.
//   node tools/render-intro-keyframes.mjs [A,B,C] [baseUrl]
// Needs a server on dist/ (default http://127.0.0.1:4496). Writes
// docs/tactics/intro-sprites/keyframe-<id>.png.
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const pos=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const ids=(pos[0]||'A,B,C').split(','),base=pos[1]||'http://127.0.0.1:4496';
const out=fileURLToPath(new URL('../docs/tactics/intro-sprites/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:1700,height:1100}});
page.on('pageerror',e=>console.error('page:',e.message));page.on('console',m=>{if(m.type()==='error')console.error('console:',m.text());});
for(const id of ids){
 const t0=Date.now();
 await page.goto(`${base}/tactics/intro-sprites/keyframes.html?shot=${id}`,{waitUntil:'load'});
 await page.waitForFunction(()=>window.keyframe?.ready||window.keyframe?.error,null,{timeout:180000});
 const r=await page.evaluate(()=>window.keyframe.error?{error:window.keyframe.error}:{data:window.keyframe.canvas.toDataURL('image/png').split(',')[1],status:document.getElementById('status').textContent});
 if(r.error){console.error(id,'failed:',r.error);continue;}
 await writeFile(out+`keyframe-${id}.png`,Buffer.from(r.data,'base64'));
 console.log(r.status,'|',Date.now()-t0,'ms');
}
await browser.close();
