// Paint the intro close-up's static plate (closeup.html) and save it.
//   node tools/render-intro-closeup.mjs [--preview file.png] [--marks] [baseUrl]
// Without --preview, writes dist/tactics/intro-sprites/plate/{cliff-plate.webp,cliff-plate.json}.
// Needs a server on dist/ (default http://127.0.0.1:4496).
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const args=process.argv.slice(2),flag=k=>args.includes('--'+k),opt=k=>{const i=args.indexOf('--'+k);return i<0?null:args[i+1];};
const base=args.find(a=>a.startsWith('http'))||'http://127.0.0.1:4496',preview=opt('preview');
const out=fileURLToPath(new URL('../dist/tactics/intro-sprites/plate/',import.meta.url));
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:1800,height:1100}});
page.on('pageerror',e=>console.error('page:',e.message));
const t0=Date.now();
// The page paints synchronously for a minute or more, so 'load' can come late:
// wait for the page's own ready flag instead.
const qs=[flag('marks')&&'marks',flag('noflora')&&'noflora',opt('scale')&&'scale='+opt('scale')].filter(Boolean).join('&');
await page.goto(base+'/tactics/intro-sprites/closeup.html'+(qs?'?'+qs:''),{waitUntil:'commit',timeout:60000});
await page.waitForFunction(()=>window.introCloseup?.ready||window.introCloseup?.error,null,{timeout:900000,polling:1000});
const r=await page.evaluate(({preview})=>{const C=window.introCloseup;if(C.error)return {error:C.error};const cv=preview?document.querySelector('#stage canvas'):C.canvas;
 return {data:cv.toDataURL(preview?'image/png':'image/webp',.93).split(',')[1],spec:C.spec,ms:C.ms,flora:C.flora,status:document.getElementById('status').textContent};},{preview:!!preview});
if(r.error){console.error('failed:',r.error);process.exit(1);}
const buf=Buffer.from(r.data,'base64');
if(preview){await writeFile(preview,buf);console.log('preview',preview);}
else if(opt('scale')&&Number(opt('scale'))!==1){console.error('refusing to save a scaled preview as the plate; pass --preview');process.exit(1);}
else{await mkdir(out,{recursive:true});await writeFile(out+'cliff-plate.webp',buf);
 await writeFile(out+'cliff-plate.json',JSON.stringify({spec:r.spec,note:'Static plate for the close-up in proof.html. Re-render with tools/render-intro-closeup.mjs whenever the close-up camera, height scale, haze, map, woodland, flora or rock rules change; proof.js paints it live (slowly) if the spec no longer matches.'},null,1)+'\n');
 console.log('wrote plate/cliff-plate.webp',buf.length,'bytes');}
console.log(r.status,'|',Date.now()-t0,'ms total');
await browser.close();
