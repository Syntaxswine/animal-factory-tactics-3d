import fs from 'node:fs';
import path from 'node:path';
import {blankMap,setTerrain,validateMap} from '../dist/tactics/core/maps.js';
export const SIZE=240,CENTER=240,OUTER=160,INNER=80;
export const QUADRANTS=[{step:4,x:0,y:0,label:'Northwest'},{step:3,x:1,y:0,label:'Northeast'},{step:2,x:0,y:1,label:'Southwest'},{step:1,x:1,y:1,label:'Southeast · start'}];
const inside=(x,y,r)=>Math.hypot(x+.5-CENTER,y+.5-CENTER)<r;
const rim=(x,y,r)=>inside(x,y,r)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!inside(x+dx,y+dy,r));
export function tutorialMap(q){
 const m=blankMap('Tutorial '+q.step+' · closed two-tier plateau');
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const gx=q.x*SIZE+x,gy=q.y*SIZE+y;
  m.terrain[y][x]='ground-grass';
  for(const [z,r]of [[0,OUTER],[1,INNER]])if(inside(gx,gy,r)){
   setTerrain(m,x,y,z+1,z===0?'ground-dirt':'ground-grass');
   if(rim(gx,gy,r))m.props.push({kind:'cliff-ledge',x,y,z,cliffMask:15,cliffVariant:0});
   else setTerrain(m,x,y,z,'void');
  }
 }
 const sx=q.x?30:209,sy=q.y?30:209;
 m.starts=[[sx,sy],[sx+2,sy],[sx,sy+2],[sx+2,sy+2]].map(([x,y])=>({x,y,z:2}));m.exits=[{x:sx+5,y:sy+5,z:2}];
 m.sectorTemplate={id:'tutorial-step-'+q.step,status:'in-progress',tutorialStep:q.step,scope:'Rough terrain only; no lessons or campaign travel wired',plateau:{group:'tutorial-plateau-v1',quadrant:[q.x,q.y],outerRadius:OUTER,innerRadius:INNER,center:[CENTER,CENTER],closed:true,notes:'Both cliff rings closed. No ramps, stairs, or climb markers. Rotate only the complete four-sector group.'}};
 return m;
}
export function svg(m,q,combined=false){
 const size=combined?480:240,ox=combined?q.x*240:0,oy=combined?q.y*240:0;
 return m.props.map(p=>'<rect x="'+(p.x+ox)+'" y="'+(p.y+oy)+'" width="1" height="1" fill="'+(p.z?'#665443':'#79614c')+'"/>').join('');
}
export function generate(){
 const root=path.resolve(import.meta.dirname,'../dist/tactics/sector-library'),maps=QUADRANTS.map(q=>({q,m:tutorialMap(q)}));
 for(const {q,m}of maps){const errors=validateMap(m);if(errors.length)throw Error(errors.join('\n'));const dir=path.join(root,'tutorial-step-'+q.step);fs.writeFileSync(path.join(dir,'rough-plateau.json'),JSON.stringify(m)+'\n');const recipePath=path.join(dir,'placeholder.json'),recipe=JSON.parse(fs.readFileSync(recipePath));recipe.status='in-progress';recipe.variants=['rough-plateau.json',...recipe.variants.filter(v=>v!=='rough-plateau.json')];recipe.preview='rough-plateau.svg';fs.writeFileSync(recipePath,JSON.stringify(recipe,null,2)+'\n');
 const cells=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const gx=q.x*SIZE+x,gy=q.y*SIZE+y;if(inside(gx,gy,OUTER))cells.push('<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+(inside(gx,gy,INNER)?'#a4b57c':'#cfba8b')+'"/>');}
 fs.writeFileSync(path.join(dir,'rough-plateau.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#778667"/>'+cells.join('')+svg(m,q)+'<text x="12" y="22" fill="#fff" font-size="12">Tutorial '+q.step+'</text></svg>');
 }
 const links=maps.map(({q})=>'<a href="../editor-3d.html?editing=1&amp;sectorTemplate=tutorial-step-'+q.step+'&amp;orientation=0&amp;variant=rough-plateau.json">'+q.label+' — Tutorial '+q.step+'</a>').join('');
 const picture='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -24 512 530"><rect width="480" height="480" fill="#778667"/><circle cx="240" cy="240" r="160" fill="#cfba8b"/><circle cx="240" cy="240" r="80" fill="#a4b57c"/>'+maps.map(({m,q})=>svg(m,q,true)).join('')+'<path d="M240 0V480M0 240H480" stroke="#eee5ce" stroke-width="1" stroke-dasharray="5 4"/><g fill="#faf3dd" font-family="sans-serif" font-size="12"><text x="12" y="20">4 · NORTHWEST</text><text x="252" y="20">3 · NORTHEAST</text><text x="12" y="470">2 · SOUTHWEST</text><text x="252" y="470">1 · START</text></g><g fill="#f8df9e" stroke="#352c22" stroke-width="1">'+[[80,240],[400,240],[240,80],[240,400]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3"/>').join('')+'</g><text x="240" y="500" text-anchor="middle" fill="#40392d" font-size="11">Outer radius 160 tiles · inner radius 80 tiles · each sector 240 × 240</text></svg>';
 fs.writeFileSync(path.join(root,'tutorial-plateau.svg'),picture);
 fs.writeFileSync(path.join(root,'tutorial-plateau.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tutorial plateau rough maps</title><style>body{margin:0;background:#eee5ce;color:#302e26;font:16px system-ui}main{max-width:1000px;margin:32px auto;padding:0 24px}h1{font-size:28px}section{display:grid;grid-template-columns:minmax(0,2fr) minmax(200px,1fr);gap:28px}img{width:100%;border:1px solid #8a806a}a{display:block;padding:14px;background:#394c3d;color:#fff;margin:12px 0;text-decoration:none}p{line-height:1.5}@media(max-width:700px){section{display:block}}</style><main><h1>Four sectors. One closed plateau.</h1><p>Rough tutorial terrain · two elevated tiers · no ramps or climb links</p><section><img src="tutorial-plateau.svg" alt="Four quadrants forming two concentric circular cliff tiers"><div>'+links+'<p>In the editor, choose altitude <b>3</b> to show both tiers, then <b>Overview</b>. Altitudes 1 and 2 expose the lower layers.</p><p>Gold dots mark the outer cliff seams: 160 tiles from the central junction. The inner tier uses the complementary 80-tile radius. The boundaries are intentionally stepped to whole tiles.</p><p>Squad and travel markers are on the summit for playtesting. No tutorial encounters, town connection, or campaign transitions are included yet.</p></div></section></main>');
 console.log('Generated four validated rough tutorial maps and combined preview.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)generate();
