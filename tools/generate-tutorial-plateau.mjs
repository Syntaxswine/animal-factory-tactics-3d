import fs from 'node:fs';
import path from 'node:path';
import {blankMap,setTerrain,validateMap} from '../dist/tactics/core/maps.js';
export const SIZE=240,CENTER=240,OUTER=216,INNER=214;
export const QUADRANTS=[{step:4,x:0,y:0,label:'Northwest'},{step:3,x:1,y:0,label:'Northeast'},{step:2,x:0,y:1,label:'Southwest'},{step:1,x:1,y:1,label:'Southeast · start'}];
export const TOWN={step:5,x:0,y:-1,label:'Northern town'};
// One global field keeps all sector crops joined; the north spur belongs to step 4.
export const outerInside=(x,y)=>{
 if(x<24&&y>=0&&y<240)return false;
 // Widen only the northwest western shoulder; fade out before either shared edge.
 const westExpansion=x<180&&y>20&&y<220?24*Math.sin(Math.PI*(y-20)/200)**2:0;
 const dx=x+.5+westExpansion-CENTER,dy=y+.5-CENTER,angle=Math.atan2(dy,dx);
 const radius=OUTER+18*Math.sin(2*angle)**2*Math.cos(6*angle);
 const northSpur=x+.5>=80-westExpansion&&x+.5<160&&y>=-24&&y<150;
 const westernField=x>=24&&x<160&&y>=24&&y<240;
 return Math.hypot(dx,dy)<radius||northSpur||westernField;
};
export const shelfWidth=(x,y)=>{if(y>=-24&&y<24&&x>=78&&x<=162)y=0;return Math.round(1+Math.sin((Math.abs(x+.5-CENTER)+Math.abs(y+.5-CENTER))/17)*Math.cos((Math.abs(x+.5-CENTER)-Math.abs(y+.5-CENTER))/23));};
const inside=(x,y,r)=>{
 if(!outerInside(x,y))return false;if(r===OUTER)return true;
 const width=shelfWidth(x,y);
 for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++)if(Math.abs(dx)+Math.abs(dy)<=width&&!outerInside(x+dx,y+dy))return false;
 return true;
};
const rim=(x,y,r)=>inside(x,y,r)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!inside(x+dx,y+dy,r));
// Horizontal runs keep the exported previews small while depicting exact tile coverage.
function landSVG(q,combined=false){let out='';for(let y=0;y<SIZE;y++){let x=0;while(x<SIZE){const shade=(x)=>inside(q.x*SIZE+x,q.y*SIZE+y,INNER)?'#a4b57c':inside(q.x*SIZE+x,q.y*SIZE+y,OUTER)?'#cfba8b':null;const color=shade(x),start=x++;while(x<SIZE&&shade(x)===color)x++;if(color)out+='<rect x="'+(start+(combined?q.x*SIZE:0))+'" y="'+(y+(combined?q.y*SIZE:0))+'" width="'+(x-start)+'" height="1" fill="'+color+'"/>';}}return '<g shape-rendering="crispEdges">'+out+'</g>';}
export function tutorialMap(q){
 const m=blankMap(q.step===5?'Tutorial 5 · northwest town terrain':'Tutorial '+q.step+' · closed two-tier plateau');
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const gx=q.x*SIZE+x,gy=q.y*SIZE+y;
  m.terrain[y][x]='ground-grass';
  for(const [z,r]of [[0,OUTER],[1,INNER]])if(inside(gx,gy,r)){
   setTerrain(m,x,y,z+1,z===0?'ground-dirt':'ground-grass');
   if(rim(gx,gy,r))m.props.push({kind:'cliff-ledge',x,y,z,cliffMask:15,cliffVariant:0});
   else setTerrain(m,x,y,z,'void');
  }
 }
 const sx=q.step===5?118:q.x?30:209,sy=q.step===5?180:q.y?30:209;
 m.starts=[[sx,sy],[sx+2,sy],[sx,sy+2],[sx+2,sy+2]].map(([x,y])=>({x,y,z:q.step===5?0:2}));m.exits=[q.step===5?{x:120,y:10,z:0}:q.step===4?{x:120,y:0,z:2}:{x:sx+5,y:sy+5,z:2}];
 m.sectorTemplate={id:'tutorial-step-'+q.step,status:'in-progress',tutorialStep:q.step,scope:'Rough terrain only; no lessons or campaign travel wired',plateau:{group:'tutorial-plateau-v1',quadrant:[q.x,q.y],outerRadius:OUTER,shelfWidth:[0,2],townApproach:q.step===4?{side:'north',bounds:[80,160],level:2}:null,center:[CENTER,CENTER],closed:true,notes:'Cliff faces closed; northwest summit continues north between tiles 80 and 160 for future town descent. No ramps, stairs, or climb markers. Rotate only the complete four-sector group.'}};
 return m;
}
export function svg(m,q,combined=false){
 const size=combined?480:240,ox=combined?q.x*240:0,oy=combined?q.y*240:0;
 return m.props.map(p=>'<rect x="'+(p.x+ox)+'" y="'+(p.y+oy)+'" width="1" height="1" fill="'+(p.z?'#665443':'#79614c')+'"/>').join('');
}
export function generate(){
 const root=path.resolve(import.meta.dirname,'../dist/tactics/sector-library'),maps=[...QUADRANTS,TOWN].map(q=>({q,m:tutorialMap(q)}));
 for(const {q,m}of maps){const errors=validateMap(m);if(errors.length)throw Error(errors.join('\n'));const dir=path.join(root,'tutorial-step-'+q.step);fs.writeFileSync(path.join(dir,'rough-plateau.json'),JSON.stringify(m)+'\n');const recipePath=path.join(dir,'placeholder.json'),recipe=JSON.parse(fs.readFileSync(recipePath));recipe.status='in-progress';recipe.variants=['rough-plateau.json',...recipe.variants.filter(v=>v!=='rough-plateau.json')];recipe.preview='rough-plateau.svg';fs.writeFileSync(recipePath,JSON.stringify(recipe,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'rough-plateau.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#778667"/>'+landSVG(q)+svg(m,q)+'<text x="12" y="22" fill="#fff" font-size="12">Tutorial '+q.step+'</text></svg>');
 }
 const links=maps.map(({q})=>'<a href="../editor-3d.html?editing=1&amp;sectorTemplate=tutorial-step-'+q.step+'&amp;orientation=0&amp;variant=rough-plateau.json">'+q.label+' — Tutorial '+q.step+'</a>').join('');
 const picture='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -264 512 770"><rect x="0" y="-240" width="240" height="240" fill="#778667"/><rect width="480" height="480" fill="#778667"/>'+maps.map(({q})=>landSVG(q,true)).join('')+''+maps.map(({m,q})=>svg(m,q,true)).join('')+'<path d="M0 0H480M240 -240V480M0 240H480" stroke="#eee5ce" stroke-width="1" stroke-dasharray="5 4"/><g fill="#faf3dd" font-family="sans-serif" font-size="12"><text x="12" y="-220">5 · NORTHWEST TOWN</text><text x="12" y="20">4 · NORTHWEST</text><text x="252" y="20">3 · NORTHEAST</text><text x="12" y="470">2 · SOUTHWEST</text><text x="252" y="470">1 · START</text></g><g fill="#f8df9e" stroke="#352c22" stroke-width="1">'+[[24,240],[456,240],[240,24],[240,456],[80,0],[160,0]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3"/>').join('')+'</g><text x="240" y="500" text-anchor="middle" fill="#40392d" font-size="11">24-tile outer margin · 0–2 tile shelf · northern town approach at ⅓ and ⅔</text></svg>';
 fs.writeFileSync(path.join(root,'tutorial-plateau.svg'),picture);
 fs.writeFileSync(path.join(root,'tutorial-plateau.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tutorial plateau rough maps</title><style>body{margin:0;background:#eee5ce;color:#302e26;font:16px system-ui}main{max-width:1000px;margin:32px auto;padding:0 24px}h1{font-size:28px}section{display:grid;grid-template-columns:minmax(0,2fr) minmax(200px,1fr);gap:28px}img{width:100%;border:1px solid #8a806a}a{display:block;padding:14px;background:#394c3d;color:#fff;margin:12px 0;text-decoration:none}p{line-height:1.5}@media(max-width:700px){section{display:block}}</style><main><h1>Tutorial plateau and northern town.</h1><p>Rough tutorial terrain · two elevated tiers · no ramps or climb links</p><section><img src="tutorial-plateau.svg" alt="Large irregular plateau with a narrow lower shelf and a northwest extension to town"><div>'+links+'<p>In the editor, choose altitude <b>3</b> to show both tiers, then <b>Overview</b>. Altitudes 1 and 2 expose the lower layers.</p><p>Gold dots mark the cliff seams 24 tiles from the outside edges. The irregular summit has a lower shelf varying from 0–2 tiles wide. Tutorial 4 extends north between the one-third and two-thirds marks.</p><p>The northwest travel marker is at the northern town approach. Cliff faces remain non-climbable. Sector 5 now receives the plateau 24 tiles deep from its southern edge. Its town terrain is editable; buildings, the actual descent, encounters and campaign transitions are still to be authored.</p></div></section></main>');
 console.log('Generated five validated rough tutorial maps and combined preview.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)generate();
