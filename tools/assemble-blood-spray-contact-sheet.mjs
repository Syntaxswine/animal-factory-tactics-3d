import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH||'sharp');
const frames=path.resolve(process.argv[2]||'artifacts/painted-blood/bake-complete-review/frames');
const output=path.resolve('docs/tactics/review-images/painted-blood/keyframes.png');
const manifest=JSON.parse(fs.readFileSync('dist/assets/effects/painted-blood/manifest.json','utf8'));
const selected=[1,3,5,7,9,11],cell=256,label=34,gap=16,width=cell*3+gap*4,height=(cell+label)*2+gap*3;
const layers=[];
for(let i=0;i<selected.length;i++){
 const n=selected[i],left=gap+(i%3)*(cell+gap),top=gap+Math.floor(i/3)*(cell+label+gap);
 layers.push({input:fs.readFileSync(path.join(frames,String(n).padStart(2,'0')+'.png')),left,top});
 const title=n===11?'0.480 s — cleared':manifest.flipbook.times[n].toFixed(3)+' s';
 const svg=`<svg width="256" height="34"><text x="8" y="23" fill="#e9e4cb" font-family="Arial, sans-serif" font-size="16">${title}</text></svg>`;
 layers.push({input:Buffer.from(svg),left,top:top+cell});
}
fs.mkdirSync(path.dirname(output),{recursive:true});
await sharp({create:{width,height,channels:4,background:'#29332d'}}).composite(layers).png().toFile(output);
console.log(output);
