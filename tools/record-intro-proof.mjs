// Stills and a WebM of the animated intro proof (proof.html).
//   node tools/record-intro-proof.mjs --frames 20.5,23.4,26.6,34.7 [--out dir]
//   node tools/record-intro-proof.mjs --video [--fps 30] [--out dir]
// The video is paced frame by frame (render t, push the frame, wait 1/fps),
// so its timing is the proof's timing even if the browser is slow.
// Needs a server on dist/ (default http://127.0.0.1:4496, or --base).
// --page intro records the whole intro (intro.html, 0-35 s) instead of the proof.
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const which=arg('page','proof'),api=which==='intro'?'intro':'introProof',base=arg('base','http://127.0.0.1:4496'),out=resolve(arg('out',fileURLToPath(new URL('../docs/tactics/intro-sprites/',import.meta.url))))+'/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1700,height:1150}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.goto(base+`/tactics/intro-sprites/${which}.html`,{waitUntil:'load'});
await page.waitForFunction(api=>window[api]?.ready||window[api]?.error,api,{timeout:300000});
const frames=arg('frames',null);
if(frames){
 for(const t of frames.split(',').map(Number)){
  const data=await page.evaluate(([t,api])=>{window[api].render(t);return window[api].canvas.toDataURL('image/png').split(',')[1];},[t,api]);
  const name=`${which}-t${t.toFixed(2)}.png`;await writeFile(out+name,Buffer.from(data,'base64'));console.log('wrote',name);
 }
}
if(process.argv.includes('--video')){
 const fps=Number(arg('fps',30));
 const r=await page.evaluate(async([fps,api])=>{
  const P=window[api],stream=P.canvas.captureStream(0),track=stream.getVideoTracks()[0];
  const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6e6}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const done=new Promise(r=>rec.onstop=r);rec.start(250);
  const n=Math.round((P.end-P.start)*fps),wait=ms=>new Promise(r=>setTimeout(r,ms));let slow=0;
  for(let i=0;i<=n;i++){const t0=performance.now();P.render(P.start+i/fps);track.requestFrame();const dt=performance.now()-t0;if(dt>1000/fps)slow++;await wait(Math.max(0,1000/fps-dt));}
  await wait(400);rec.stop();await done;
  const blob=new Blob(chunks,{type}),buf=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<buf.length;i+=32768)s+=String.fromCharCode(...buf.subarray(i,i+32768));
  return {data:btoa(s),type,frames:n+1,slow};
 },[fps,api]);
 const buf=Buffer.from(r.data,'base64');await writeFile(out+`${which}-playback.webm`,buf);
 console.log(`wrote ${which}-playback.webm`,buf.length,'bytes,',r.frames,'frames,',r.type,', frames over budget:',r.slow);
}
await browser.close();
