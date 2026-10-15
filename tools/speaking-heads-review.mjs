// node tools/speaking-heads-review.mjs --stage=grey|paint [--base=http://127.0.0.1:4499] [--only=cow,hen]
// Photographs the speaking heads in the real renderer (tactics/speaking-heads.html) and writes the
// review evidence to docs/tactics/hybrid-review/speaking-heads/<stage>/:
//  - <id>.png      the approved head and the speaking head closed, open at the widest speech
//                  (SPEECH_OPEN), 12 and 24 degrees, from the side (left and right), three-quarter,
//                  front, below and the game's camera (left and right) (grey: the authoring mesh;
//                  paint: the game mesh)
//  - overview.png  every character, three-quarter, closed and open 12 degrees
//  - checks.json   per character: triangles, paint coverage, page errors (round 2: a screen
//                  difference between the closed heads was dropped, as round 1 showed it could not
//                  tell a leaking crease from a closed one; tests/speaking-heads.test.mjs measures that)
// Needs the page served (npm run serve, or the af3d-speaking-heads launch entry) and a Playwright
// with Edge (PLAYWRIGHT_PATH, as the other review tools).
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {decodePNG,encodePNG} from './png-rgba.mjs';
import {SPEECH_OPEN} from '../dist/tactics/speaking-head.js';
const arg=k=>process.argv.find(a=>a.startsWith('--'+k+'='))?.split('=')[1];
const stage=arg('stage')||'grey',base=arg('base')||'http://127.0.0.1:4499',only=arg('only')?.split(',');
if(!['grey','paint'].includes(stage))throw Error('--stage=grey or --stage=paint');
const IDS=['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog','hen'].filter(id=>!only||only.includes(id));
const level=stage==='grey'?'author':'10k',dir=new URL(`../docs/tactics/hybrid-review/speaking-heads/${stage}/`,import.meta.url);fs.mkdirSync(dir,{recursive:true});
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const W=1400,H=640,TILE=[330,300];

// Images: decode a screenshot, crop a tile centred on a pane, lay tiles out with labels.
const crop=(img,cx,cy,[w,h])=>{const out=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.round(cx-w/2+x),sy=Math.round(cy-h/2+y),k=(y*w+x)*4;if(sx<0||sy<0||sx>=img.width||sy>=img.height){out[k+3]=255;continue;}out.set(img.pixels.subarray((sy*img.width+sx)*4,(sy*img.width+sx)*4+4),k);}return {width:w,height:h,pixels:out};};
function grid(rows,gap=4){const w=Math.max(...rows.map(r=>r.reduce((s,t)=>s+t.width+gap,0)-gap)),h=rows.reduce((s,r)=>s+Math.max(...r.map(t=>t.height))+gap,0)-gap,pixels=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=24;pixels[i*4+3]=255;}
 let y0=0;for(const row of rows){let x0=0;for(const t of row){for(let y=0;y<t.height;y++)pixels.set(t.pixels.subarray(y*t.width*4,(y+1)*t.width*4),((y0+y)*w+x0)*4);x0+=t.width+gap;}y0+=Math.max(...row.map(t=>t.height))+gap;}
 return {width:w,height:h,pixels};}

const browser=await chromium.launch({headless:true,channel:'msedge'});
const checks={stage,level,base,date:new Date().toISOString(),characters:{}},overview=[];
try{
 const page=await browser.newPage({viewport:{width:1500,height:1100},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
 await page.goto(`${base}/tactics/speaking-heads.html?animal=${IDS[0]}&level=${level}`);await page.waitForFunction(()=>window.speakingHeadsReady,null,{timeout:180000});
 await page.addStyleTag({content:`#scene{width:${W}px!important;height:${H}px!important}`});
 const shot=async options=>{await page.evaluate(o=>speakingHeads.set(o),options);await page.waitForTimeout(60);return decodePNG(await page.locator('#scene canvas').screenshot());};
 const look=stage==='grey'?{grey:true,painted:false}:{grey:false,painted:true};
 for(const id of IDS){
  const before=errors.length;await page.evaluate(([id,level])=>speakingHeads.load(id,level),[id,level]);
  // (each from the character's left, and the side and the game's camera from its right too: the
  // character turned, the viewer's Turn in degrees: 180 for the side, -90 for the game's camera, which looks from the front-left; round 3's defects hid on the side its photographs left out;
  // the widest speech and the view from below too, which round 4's review missed)
  const rows=[];
  for(const [view,heading] of [['side',0],['side',180],['three',0],['front',0],['below',0],['game',0],['game',-90]]){const row=[];
   for(const [k,jaw] of [0,+(SPEECH_OPEN[id]*180/Math.PI).toFixed(2),12,24].entries()){const img=await shot({...look,coverage:false,wire:false,weights:false,view,scale:'portrait',jaw,heading});
    if(k===0)row.push(crop(img,W/4,H/2,TILE));row.push(crop(img,3*W/4,H/2,TILE));}
   rows.push(row);}
  const sheet=grid(rows);fs.writeFileSync(new URL(`${id}.png`,dir),encodePNG(sheet));
  overview.push([rows[2][0],rows[2][1],rows[2][3]]);
  const record={...(await page.evaluate(()=>speakingHeads.diagnostics()))};
  if(stage==='paint'){for(const jaw of [0,12]){await page.evaluate(o=>speakingHeads.set(o),{view:'three',scale:'close',jaw,painted:true,grey:false});record['coverage, jaw '+jaw]=await page.evaluate(()=>speakingHeads.coverage());}}
  record.pageErrors=errors.slice(before);checks.characters[id]=record;console.log(id,JSON.stringify(record));
 }
 fs.writeFileSync(new URL('overview.png',dir),encodePNG(grid(overview.map(r=>r.map(t=>crop(t,t.width/2,t.height/2,[260,240]))))));
 checks.pageErrors=errors;
}finally{await browser.close();}
fs.writeFileSync(new URL('checks.json',dir),JSON.stringify(checks,null,1)+'\n');
console.log('wrote',dir.pathname);
