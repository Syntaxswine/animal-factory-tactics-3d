// Photographs of the traversal study (tactics/traversal-study.html) from the real renderer, in headless Edge.
//   node tools/photo-traversal.mjs --strip out.png [--at 0.5,1.2,2.0] [--view game] [--animal horse] [--cols 4]
//   node tools/photo-traversal.mjs --video out.webm [--fps 30] [--view close] [--speed 1]
// A strip labels each frame with its time and phase. The video is paced frame by frame (render t, push the
// frame, wait 1/fps), so its timing is the motion's timing even if the browser is slow.
// Needs a server on dist/ (default http://127.0.0.1:4490, or --base).
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const base=arg('base','http://127.0.0.1:4490'),view=arg('view','game'),animal=arg('animal','horse'),outfit=arg('outfit','normal'),[w,h]=arg('size','900x600').split('x').map(Number);
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:w+60,height:h+260}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.goto(`${base}/tactics/traversal-study.html?animal=${animal}&outfit=${outfit}&view=${view}`,{waitUntil:'load'});
await page.addStyleTag({content:`#viewport{width:${w}px!important;height:${h}px!important;min-height:0!important;flex:none!important}`});
await page.waitForFunction(()=>window.traversalStudy?.ready,null,{timeout:120000});
const err=await page.evaluate(()=>document.getElementById('error').textContent);if(err)console.error('study error:',err);
if(arg('strip',null)){
 const D=await page.evaluate(()=>window.traversalStudy.motion.duration),at=(arg('at',null)?.split(',').map(Number))||Array.from({length:8},(_,i)=>D*i/7),cols=Number(arg('cols',Math.min(4,at.length)));
 const data=await page.evaluate(async([at,cols])=>{const S=window.traversalStudy,src=S.renderer.domElement,cw=src.width,ch=src.height,rows=Math.ceil(at.length/cols);
  const strip=document.createElement('canvas');strip.width=cw*cols;strip.height=ch*rows;const g=strip.getContext('2d');g.fillStyle='#202622';g.fillRect(0,0,strip.width,strip.height);
  at.forEach((t,i)=>{const d=S.seek(t/S.motion.duration);g.drawImage(src,(i%cols)*cw,Math.floor(i/cols)*ch);g.fillStyle='rgba(0,0,0,.55)';g.fillRect((i%cols)*cw,Math.floor(i/cols)*ch,cw,26);g.fillStyle='#f3ead2';g.font='15px sans-serif';g.fillText(`${t.toFixed(2)} s  ${d.phase}`,(i%cols)*cw+8,Math.floor(i/cols)*ch+18);});
  return strip.toDataURL('image/png').split(',')[1];},[at,cols]);
 const file=resolve(arg('strip'));await writeFile(file,Buffer.from(data,'base64'));console.log('wrote',file);
}
if(arg('video',null)){
 const fps=Number(arg('fps',30)),speed=Number(arg('speed',1));
 const r=await page.evaluate(async([fps,speed])=>{const S=window.traversalStudy,canvas=S.renderer.domElement,stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
  const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6e6}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const done=new Promise(r=>rec.onstop=r);rec.start(250);const D=S.motion.duration,n=Math.round(D/speed*fps),wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<=n+Math.round(fps*.6);i++){const t0=performance.now();S.seek(Math.min(1,i/n));track.requestFrame();await wait(Math.max(0,1000/fps-(performance.now()-t0)));}
  await wait(400);rec.stop();await done;const buf=new Uint8Array(await new Blob(chunks,{type}).arrayBuffer());let s='';for(let i=0;i<buf.length;i+=32768)s+=String.fromCharCode(...buf.subarray(i,i+32768));return {data:btoa(s),type,frames:n+1};},[fps,speed]);
 const file=resolve(arg('video'));await writeFile(file,Buffer.from(r.data,'base64'));console.log('wrote',file,r.type,r.frames,'frames');
}
await browser.close();
