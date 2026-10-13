// Paint the static plate for the animated intro proof (terrain, flora and
// their shadows over the whole camera path, at the 52 px/tile crash zoom).
//   node tools/render-intro-plate.mjs [baseUrl]
// Writes dist/tactics/intro-sprites/plate/{crash-plate.webp,crash-plate.json}.
// Needs a server on dist/ (default http://127.0.0.1:4496).
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const base=process.argv[2]||'http://127.0.0.1:4496';
const out=fileURLToPath(new URL('../dist/tactics/intro-sprites/plate/',import.meta.url));
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:1700,height:1100}});
page.on('pageerror',e=>console.error('page:',e.message));
const t0=Date.now();
await page.goto(base+'/tactics/intro-sprites/proof.html?paintPlate',{waitUntil:'load'});
await page.waitForFunction(()=>window.introProof?.ready||window.introProof?.error,null,{timeout:900000,polling:1000});
const r=await page.evaluate(()=>{const p=window.introProofPlate;return {data:p.canvas.toDataURL('image/webp',.93).split(',')[1],geometry:p.geometry,spec:p.spec,status:document.getElementById('status').textContent};});
await mkdir(out,{recursive:true});
const buf=Buffer.from(r.data,'base64');await writeFile(out+'crash-plate.webp',buf);
await writeFile(out+'crash-plate.json',JSON.stringify({spec:r.spec,geometry:r.geometry,tile:52,note:'Static plate for proof.html: terrain + flora + flora shadows. Re-render with tools/render-intro-plate.mjs whenever the camera path, the height scale, the haze, the map, the woodland or the flora rules change; proof.js repaints live if the geometry no longer matches.'},null,1)+'\n');
console.log(r.status,'|',buf.length,'bytes |',Date.now()-t0,'ms');
await browser.close();
