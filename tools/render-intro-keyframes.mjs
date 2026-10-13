// Render the intro sprite-proof keyframes to PNG.
//   node tools/render-intro-keyframes.mjs [A,B,C] [baseUrl] [--layers]
// Needs a server on dist/ (default http://127.0.0.1:4496). Writes
// docs/tactics/intro-sprites/keyframe-<id>.png (and <id>-<layer>.png with --layers).
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const args=process.argv.slice(2),flags=args.filter(a=>a.startsWith('--')),pos=args.filter(a=>!a.startsWith('--'));
const ids=(pos[0]||'A,B,C').split(','),base=pos[1]||'http://127.0.0.1:4496',layers=flags.includes('--layers');
const out=fileURLToPath(new URL('../docs/tactics/intro-sprites/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:1700,height:1100}});
page.on('pageerror',e=>console.error('page:',e.message));page.on('console',m=>{if(m.type()==='error')console.error('console:',m.text());});
for(const id of ids){
 const t0=Date.now();
 await page.goto(`${base}/tactics/intro-sprites/keyframes.html?shot=${id}`,{waitUntil:'load'});
 await page.waitForFunction(()=>window.keyframe?.ready||window.keyframe?.error,null,{timeout:180000});
 const r=await page.evaluate(({layers})=>{if(window.keyframe.error)return {error:window.keyframe.error};const o={composite:window.keyframe.canvas.toDataURL('image/png')};if(layers)for(const [k,c]of Object.entries(window.keyframe.layers))o[k]=c.toDataURL('image/png');return {o,status:document.getElementById('status').textContent};},{layers});
 if(r.error){console.error(id,'failed:',r.error);continue;}
 for(const [k,v]of Object.entries(r.o))await writeFile(out+(k==='composite'?`keyframe-${id}.png`:`${id}-${k}.png`),Buffer.from(v.split(',')[1],'base64'));
 console.log(r.status,'|',Date.now()-t0,'ms');
}
await browser.close();
