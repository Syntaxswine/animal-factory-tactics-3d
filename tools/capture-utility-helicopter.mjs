import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(import.meta.dirname,'../hybrid-review/utility-helicopter');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'helicopter-capture-'+Date.now(),'utility-helicopter');
try {
 const page=await review.browser.newPage({viewport:{width:1540,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.HELICOPTER_REVIEW_URL||'http://127.0.0.1:4476/tactics/utility-helicopter-study.html');await page.waitForFunction(()=>window.helicopterReady);
 for(const mode of ['pair','intact','crashed'])for(const view of ['three','side','front','top']){
  await page.evaluate(o=>helicopterStudy.set(o),{mode,view,scale:'fit',truck:mode==='pair',horse:mode==='pair',grey:false});await page.screenshot({path:path.join(out,mode+'-'+view+'.png')});
 }
 for(const mode of ['intact','crashed']){await page.evaluate(o=>helicopterStudy.set(o),{mode,view:'three',grey:true,truck:true,horse:true});await page.screenshot({path:path.join(out,mode+'-grey.png')});}
 console.log(JSON.stringify({errors,state:await page.evaluate(()=>helicopterState)}));if(errors.length)throw Error(errors.join('\n'));
}finally{await review.closeReview();}
