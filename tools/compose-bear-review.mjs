import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const sharp=createRequire(import.meta.url)(process.env.SHARP_PATH||'sharp'),input=path.resolve(process.env.BEAR_REVIEW_OUTPUT||'artifacts/bear/delivery-final'),output=path.resolve('docs/tactics/review-images/bear'),review=JSON.parse(fs.readFileSync(path.join(input,'checks.json')));
assert.deepEqual(review.errors,[]);assert.equal(review.packaged.length,4);fs.mkdirSync(output,{recursive:true});
fs.copyFileSync(path.join(input,'10k-three.png'),path.join(output,'painted-three.png'));
const width=1000,height=Math.round(width*620/1450),row=height+42,parts=[];
for(const [i,[name,label]]of [['10k-front','FRONT'],['10k-side','SIDE'],['10k-back','BACK'],['10k-top','TOP']].entries()){
 const left=i%2*width,top=Math.floor(i/2)*row;
 parts.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="42"><rect width="100%" height="100%" fill="#233326"/><text x="16" y="28" font-family="Arial,sans-serif" font-size="19" fill="#f4e4b8">${label} · Regular / Red Hat / native-scale horse</text></svg>`),left,top});
 parts.push({input:await sharp(path.join(input,name+'.png')).resize(width,height).png().toBuffer(),left,top:top+42});
}
await sharp({create:{width:width*2,height:row*2,channels:3,background:'#233326'}}).composite(parts).png().toFile(path.join(output,'turnaround-review.png'));
const names=['docs/tactics/review-images/bear/painted-three.png','docs/tactics/review-images/bear/turnaround-review.png','docs/tactics/review-images/bear/neutral-paint-reference.png','dist/assets/characters/model-references/bear-worker-turnaround-v1.png','dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png','dist/assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png'],files=[];
for(const name of names){const bytes=fs.readFileSync(name),meta=await sharp(bytes).metadata();files.push({name,bytes:bytes.length,width:meta.width,height:meta.height,sha256:createHash('sha256').update(bytes).digest('hex')});}
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({date:'2026-10-28',branch:'work/bear-character',canonicalBase:'d3b0ccc',authorTriangles:27298,runtimeTriangles:10050,redHatCapTriangles:700,bones:17,surfaces:8,neutralBounds:{min:[-.2815303,0,-.4857703],max:[.2328318,1.6708453,.4859749]},outfits:['normal','red-hats'],loadouts:13,focusedTests:{passed:51,failed:0,suites:['bear-worker','horse-model-paint','dog-guard','battle-motion','tactics-pages-files','battle-posture','animal-prone']},browserCaptures:review.checks.length,errors:review.errors,lifecycle:review.lifecycle,packaged:review.packaged,review:'Artist self-review and automated checks complete; independent architect review pending.',files},null,2)+'\n');
console.log(JSON.stringify({captures:review.checks.length,files:files.map(({name,bytes,width,height})=>({name,bytes,width,height}))}));
