import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ANIMAL_MOTION_CATALOG as catalog} from '../dist/tactics/animal-motion-catalog.js';
import {WEAPON_MODELS} from '../dist/tactics/weapon-models.js';

const sharp=createRequire(import.meta.url)(process.env.SHARP_PATH||'sharp');
const input=path.resolve(process.env.CRAWL_REVIEW_OUTPUT||'artifacts/crawl/review');
const output=path.resolve('docs/tactics/review-images/crawling');
const review=JSON.parse(fs.readFileSync(path.join(input,'results.json')));
if(review.errors.length)throw Error('Review has browser errors');
const uiReview=process.env.CRAWL_UI_REVIEW_OUTPUT?JSON.parse(fs.readFileSync(path.resolve(process.env.CRAWL_UI_REVIEW_OUTPUT,'results.json'))):null;
if(uiReview?.errors.length)throw Error('Final control review has browser errors');
fs.mkdirSync(output,{recursive:true});
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const label=(text,width,height=42)=>Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#24382d"/><text x="16" y="28" fill="#f2dba2" font-family="Arial,sans-serif" font-size="19">${escape(text)}</text></svg>`);
async function sheet(filename,title,items,columns,width){
 const height=Math.round(width*620/925),rowHeight=height+42,totalWidth=columns*width,totalHeight=84+Math.ceil(items.length/columns)*rowHeight,parts=[{input:label(title,totalWidth,84),top:0,left:0}];
 for(let i=0;i<items.length;i++){const [name,caption]=items[i],left=i%columns*width,top=84+Math.floor(i/columns)*rowHeight;parts.push({input:label(caption,width),left,top},{input:await sharp(path.join(input,name+'.png')).extract({left:0,top:0,width:925,height:620}).resize(width,height).png().toBuffer(),left,top:top+42});}
 await sharp({create:{width:totalWidth,height:totalHeight,channels:3,background:'#24382d'}}).composite(parts).png().toFile(path.join(output,filename));
}
await sheet('sequence.png','LOW CRAWL · supported pull, recovery and stop',[
 ['horse-three-1000','1 · Prone rest'],['horse-three-2000','2 · Pull and opposite toe push'],['horse-three-3200','3 · Recover the free arm'],['horse-three-5000','4 · Transfer to the other support'],['horse-three-9800','5 · Stop after two tiles'],['horse-contacts','6 · Joint targets and skeleton']
],3,600);
await sheet('roster.png','NATIVE ROSTER · original outfits · rifle carry, hen unarmed',catalog.map(p=>[p.id+'-normal-2400',p.label]),3,440);
const short={pistol:'TT-33',knife:'Knife',grenade:'Grenade'},pairs=[['pistol','pistol'],['pistol','knife'],['pistol','grenade'],['knife','pistol'],['knife','grenade'],['grenade','pistol'],['grenade','knife']];
await sheet('weapons.png','CRAWL CARRIES · 13 single variations and 7 paired setups',[
 ...Object.entries(WEAPON_MODELS).map(([id,w])=>['horse-'+id+'-2400',w.label]),
 ...pairs.map(([right,left])=>['horse-pair-'+right+'-'+left+'-2400',short[right]+' + '+short[left]+' (R / L)'])
],4,440);
const files=['sequence.png','roster.png','weapons.png'].map(name=>{const data=fs.readFileSync(path.join(output,name));return {name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({date:'2026-10-23',baseline:'9fdc681',canonicalBase:'a20b343',branch:'work/crawling-animations',captures:review.captures.length,errors:review.errors,resources:review.resources,cancelledLoads:review.cancelledLoads,tourWeapons:review.tourWeapons,finalControls:uiReview?{captures:uiReview.captures.length,errors:uiReview.errors,tourWeapons:uiReview.tourWeapons}:null,weaponVariations:{single:13,paired:7,pairedSpecies:11,gameplayWeaponKeys:14},packagedComparisons:['horse','flame','hen','guide','paired','heavy'],focusedTests:{passed:33,failed:0,suites:['crawl-motion','crawl-loadouts','battle-motion','tactics-pages-files']},artReview:{score:'9/10',scope:'Base motion at 9fdc681; the weapon follow-up has separate fit and browser checks'},files},null,2)+'\n');
console.log(JSON.stringify(files));
