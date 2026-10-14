// Fast multi-core previews of the intro's rock, painted by the same terrain
// code as the plates (crash-sector.js, closeup.js) in worker threads, without
// the browser, flora or the ground paintings (tops use the palette fallback).
// The split tone and the frame's CSS grade are applied, so values read like
// the player. For trying rock rules in seconds; the plates still come from
// tools/render-intro-plate.mjs and tools/render-intro-closeup.mjs.
//   node tools/preview-intro-rock.mjs closeup [--scale .5] [--crop x0,y0,x1,y1] [--out f.png]
//   node tools/preview-intro-rock.mjs wide [--t 23.75] [--hs 2.4] [--detail .8] [--key x,up,y] [--w 30] [--mask m.png]
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync} from 'node:fs';
import zlib from 'node:zlib';
import os from 'node:os';
const ROOT=new URL('../',import.meta.url).href;
const CS=ROOT+'dist/tactics/intro-sprites/';
const rd=p=>JSON.parse(readFileSync(new URL(p,ROOT)));

if(isMainThread){
 const a=process.argv.slice(2),shot=a[0],opt=(k,d)=>{const i=a.indexOf('--'+k);return i<0?d:a[i+1];};
 const cfg={shot,scale:Number(opt('scale',.5)),t:Number(opt('t',23.75)),hs:opt('hs',null)&&Number(opt('hs')),detail:opt('detail',null)&&Number(opt('detail')),w:opt('w',null)&&Number(opt('w')),crop:opt('crop',null)&&opt('crop').split(',').map(Number),out:opt('out','prev.png'),mask:opt('mask',null),key:opt('key',null)&&(()=>{const v=opt('key').split(',').map(Number),n=Math.hypot(...v);return v.map(c=>c/n);})(),width:Number(opt('width',1600)),height:Number(opt('height',900))};
 const N=Number(opt('workers',Math.max(2,os.cpus().length-2))),t0=Date.now();
 // Frame size.
 let W,H;
 if(shot==='closeup'){const {CLOSEUP_CAMERA}=await import(CS+'closeup.js');W=Math.round(CLOSEUP_CAMERA.plate[0]*cfg.scale);H=Math.round(CLOSEUP_CAMERA.plate[1]*cfg.scale);}
 else{W=cfg.width;H=cfg.height;}
 const [x0,y0,x1,y1]=cfg.crop||[0,0,W,H],CW=x1-x0,CH=y1-y0;
 const rgb=new Uint8ClampedArray(CW*CH*4),T=new Float32Array(CW*CH),K=new Uint8Array(CW*CH),HZ=new Float32Array(CW*CH);
 const bands=[];const step=Math.ceil(CH/(N*4));for(let r=0;r<CH;r+=step)bands.push([r,Math.min(CH,r+step)]);
 let next=0;
 await Promise.all(Array.from({length:Math.min(N,bands.length)},()=>new Promise((res,rej)=>{
  const w=new Worker(new URL(import.meta.url),{workerData:{cfg,W,H,x0,y0,CW}});
  const give=()=>{if(next>=bands.length){w.postMessage(null);return;}w.postMessage(bands[next++]);};
  w.on('message',m=>{if(m.ready){give();return;}const [r0,r1]=m.band;rgb.set(m.rgb,r0*CW*4);T.set(m.T,r0*CW);K.set(m.K,r0*CW);HZ.set(m.HZ,r0*CW);give();});
  w.on('error',rej);w.on('exit',res);})));
 const t1=Date.now();
 if(shot==='closeup')closeupInk(rgb,T,K,HZ,CW,CH);
 const {splitTone}=await import(CS+'grade.js');splitTone(rgb);
 cssGrade(rgb);
 writeFileSync(cfg.out,png(rgb,CW,CH));
 if(cfg.mask){const m=new Uint8ClampedArray(CW*CH*4);for(let i=0;i<CW*CH;i++){const v=K[i]===2?255:0;m[i*4]=m[i*4+1]=m[i*4+2]=v;m[i*4+3]=255;}writeFileSync(cfg.mask,png(m,CW,CH));}
 console.log(`${cfg.out} ${CW}x${CH} paint ${((t1-t0)/1000).toFixed(1)} s, ${N} workers`);
}else{
 const {cfg,W,H,x0,y0,CW}=workerData;
 const S=await import(CS+'crash-sector.js');
 const map=rd('dist/tactics/sector-library/tutorial-step-1/rough-plateau.json'),woodland=rd('dist/tactics/intro-sprites/crash-sector-woodland.json');
 let paintBand;
 if(cfg.shot==='closeup'){
  const C=await import(CS+'closeup.js'),P=await import(CS+'plate.js');
  const sector=S.buildSector(map,woodland,{heightScale:cfg.hs??S.HEIGHT_SCALE.closeup,extend:true,detail:cfg.detail??S.ROCK_DETAIL.closeup});
  S.setGroundTextures(null);
  const view=C.closeupView(undefined,cfg.scale),HAZE=P.HAZE_COLOR.split(',').map(Number),SKYH=[214,222,218];
  const key=(()=>{const v=[-.24,.5,.83],n=Math.hypot(...v);return v.map(c=>c/n);})();
  const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],sm=(a,b,t)=>{t=Math.max(0,Math.min(1,(t-a)/(b-a)));return t*t*(3-2*t);};
  paintBand=(r0,r1)=>{const n=(r1-r0)*CW,rgb=new Uint8ClampedArray(n*4),T=new Float32Array(n),K=new Uint8Array(n),HZ=new Float32Array(n);
   for(let j=r0;j<r1;j++)for(let i=0;i<CW;i++){const px=x0+i,py=y0+j,p=(j-r0)*CW+i,dir=view.ray(px+.5,py+.5),hit=C.traceRay(sector,view.C,dir);let col;
    if(!hit){col=dir[2]<0?mixc(SKYH,HAZE,.25):[150,180,210];T[p]=1e9;K[p]=0;HZ[p]=1;}
    else{if(hit.kind==='top'){col=S.shadeTop(sector,hit.x,hit.y,hit.lev,0,0,0);K[p]=1;}else{col=S.shadeFace(sector,hit.x,hit.y,hit.h,view.focal/hit.t,key);K[p]=2;}
     T[p]=hit.t;const a=C.closeupHazeAt(hit.t);HZ[p]=a;col=mixc(col,mixc(HAZE,SKYH,sm(.3,.8,a)),a);}
    rgb[p*4]=col[0];rgb[p*4+1]=col[1];rgb[p*4+2]=col[2];rgb[p*4+3]=255;}
   return {rgb,T,K,HZ};};
 }else{
  const TR=await import(CS+'trajectory.js'),P=await import(CS+'plate.js'),PR=await import(CS+'proof.js');
  const hs=cfg.hs??S.HEIGHT_SCALE.wide,sector=S.buildSector(map,woodland,{heightScale:hs,detail:cfg.detail??S.ROCK_DETAIL.wide});
  const cam=TR.cameraAt(cfg.t),w=cfg.w??cam.w;
  paintBand=(r0,r1)=>{const rows=r1-r0,view=S.makeView({w,anchor:cam.F,at:[cam.S[0]-x0,cam.S[1]-y0-r0],width:CW,height:rows});
   let img;const ctx={createImageData:(w,h)=>(img={data:new Uint8ClampedArray(w*h*4),width:w,height:h}),putImageData(){}};
   const {faces,depth}=S.paintTerrain(ctx,sector,view,{key:cfg.key||undefined});
   const n=rows*CW,T=new Float32Array(n),K=new Uint8Array(n),HZ=new Float32Array(n),col=P.HAZE_COLOR.split(',').map(Number);
   for(let p=0;p<n;p++){K[p]=faces[p]?2:1;const hz=P.hazeAt(PR.PLATE_HAZE,depth[p]);HZ[p]=hz;const o=p*4;for(let c=0;c<3;c++)img.data[o+c]+=(col[c]-img.data[o+c])*hz;}
   return {rgb:img.data,T,K,HZ};};
 }
 parentPort.on('message',band=>{if(!band){process.exit(0);}const r=paintBand(band[0],band[1]);parentPort.postMessage({band,...r},[r.rgb.buffer,r.T.buffer,r.K.buffer,r.HZ.buffer]);});
 parentPort.postMessage({ready:true});
}

function closeupInk(d,T,K,HZ,W,H){
 const INK=[40,34,26],ink=(p,a)=>{a*=1-HZ[p];if(a<=0)return;const o=p*4;for(let c=0;c<3;c++)d[o+c]+=(INK[c]-d[o+c])*a;};
 for(let py=0;py<H-1;py++)for(let px=0;px<W-1;px++){const p=py*W+px;
  for(const q of [p+1,p+W]){
   if(K[p]===1&&K[q]===2&&q===p+W){ink(p,.9);if(py>0)ink(p-W,.5);}
   else if(K[p]===2&&K[q]===1&&q===p+W)ink(p,.6);
   else if(K[p]&&K[q]){const n=T[p]<T[q]?p:q,fN=Math.min(T[p],T[q]),fF=Math.max(T[p],T[q]);if(fN<110&&fF>fN*1.12+.6)ink(n,.8);}
   else if(K[p]!==K[q]){ink(K[p]?p:q,.7);}}}
}
// CSS filter 'brightness(1.2) contrast(1.4) saturate(.72)' (plate.js GRADE), per the Filter Effects spec.
function cssGrade(d){const s=.72,m=[.213+.787*s,.715-.715*s,.072-.072*s,.213-.213*s,.715+.285*s,.072-.072*s,.213-.213*s,.715-.715*s,.072+.928*s];
 for(let i=0;i<d.length;i+=4){let r=d[i]/255*1.2,g=d[i+1]/255*1.2,b=d[i+2]/255*1.2;r=Math.min(1,r);g=Math.min(1,g);b=Math.min(1,b);
  r=(r-.5)*1.4+.5;g=(g-.5)*1.4+.5;b=(b-.5)*1.4+.5;r=Math.max(0,Math.min(1,r));g=Math.max(0,Math.min(1,g));b=Math.max(0,Math.min(1,b));
  d[i]=255*(m[0]*r+m[1]*g+m[2]*b);d[i+1]=255*(m[3]*r+m[4]*g+m[5]*b);d[i+2]=255*(m[6]*r+m[7]*g+m[8]*b);}}
function png(rgba,w,h){const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(raw,y*(w*4+1)+1);}
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(zlib.crc32(td)>>>0);return Buffer.concat([len,td,crc]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);}
