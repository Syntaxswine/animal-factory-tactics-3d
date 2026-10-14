// node tools/speaking-heads/registration.mjs <id> <out.png> [cx cy] [--scale=3600] [--half=.05]
// The character's registered paint around its mouth (side and front views of its paint sheet)
// with the sculpt drawn over it: the approved head's silhouette (white), the planned lip line
// where it meets the surface (magenta), the mouth's corner (cyan) and the jaw joint (yellow).
// It is how each mouth was placed on its painted mouth line, and how a change is checked.
import fs from 'node:fs';
import {decodePNG,encodePNG} from '../png-rgba.mjs';
import {HEAD,PAINT} from './heads.mjs';
import {MOUTHS} from './mouths.mjs';
import {placement} from './place.mjs';
import {mouthGeometry} from './sculpt.mjs';
import {sheetPoint} from './plan.mjs';

const args=process.argv.slice(2),id=args[0],out=args[1],head=HEAD[id],M=MOUTHS[id];
const opt=k=>args.find(a=>a.startsWith('--'+k+'='))?.split('=')[1];
const S=+(opt('scale')||3600),HALF=+(opt('half')||.05);
const place=placement(head),G=mouthGeometry(M),field=head.field,P=PAINT[id],F=P.frame;
const sheet=decodePNG(fs.readFileSync(new URL('../../'+P.sheet,import.meta.url)));
// Sheet space <-> sculpt space (sheetPoint is sculpt -> sheet; this is its inverse).
const toSculpt=([x,y,z])=>{const q=[x,y-(P.lift||0),z];return P.space==='sculpt'?q:place.unmap(q);};
const lip=sheetPoint(head,place,[M.lip.x,G.lipY(M.lip.x,0),0]);
const cx=+(args[2]&&!args[2].startsWith('--')?args[2]:lip[0]-.02),cy=+(args[3]&&!args[3].startsWith('--')?args[3]:lip[1]);
const N=Math.round(2*HALF*S),W=2*N+8,img=new Uint8ClampedArray(W*N*4);
function sample(view,across,y){const u=(view+across/F.width+.5)/4*sheet.width,v=(1-((y-F.centerY)/F.height+.5))*sheet.height;
 const x0=Math.max(0,Math.min(sheet.width-2,Math.floor(u-.5))),y0=Math.max(0,Math.min(sheet.height-2,Math.floor(v-.5))),fx=u-.5-x0,fy=v-.5-y0,c=[0,0,0];
 for(const [dx,dy,w] of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]])for(let k=0;k<3;k++)c[k]+=w*sheet.pixels[((y0+dy)*sheet.width+x0+dx)*4+k];return c;}
const panes=[{x0:0,view:1,lo:cx-HALF,across:p=>p[0]},{x0:N+8,view:0,lo:-HALF,across:p=>-p[2]}];
for(let i=0;i<W*N;i++){img[i*4]=img[i*4+1]=img[i*4+2]=40;img[i*4+3]=255;}
for(const pane of panes)for(let j=0;j<N;j++)for(let i=0;i<N;i++){const c=sample(pane.view,pane.lo+(i+.5)/S,cy+HALF-(j+.5)/S),k=(j*W+pane.x0+i)*4;img[k]=c[0];img[k+1]=c[1];img[k+2]=c[2];}
const put=(pane,p,rgb,r=0)=>{const i=Math.round((pane.across(p)-pane.lo)*S),j=Math.round((cy+HALF-p[1])*S);for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const x=i+a,y=j+b;if(x<0||x>=N||y<0||y>=N)continue;const k=(y*W+pane.x0+x)*4;img[k]=rgb[0];img[k+1]=rgb[1];img[k+2]=rgb[2];}};
// grid: 5 mm lines, 1 cm brighter
for(const pane of panes){for(let k=Math.ceil(pane.lo*200);k<=Math.floor((pane.lo+2*HALF)*200);k++){const i=Math.round((k/200-pane.lo)*S);if(i<0||i>=N)continue;for(let j=0;j<N;j+=2){const q=(j*W+pane.x0+i)*4,b=k%2?60:120;img[q]=img[q]*.6+b;img[q+1]=img[q+1]*.6+b;img[q+2]=img[q+2]*.6+b*.4;}}
 for(let k=Math.ceil((cy-HALF)*200);k<=Math.floor((cy+HALF)*200);k++){const j=Math.round((cy+HALF-k/200)*S);if(j<0||j>=N)continue;for(let i=0;i<N;i+=2){const q=(j*W+pane.x0+i)*4,b=k%2?60:120;img[q]=img[q]*.6+b;img[q+1]=img[q+1]*.6+b;img[q+2]=img[q+2]*.6+b*.4;}}}
// The approved head's silhouette in each view (inside where any depth along the view is inside).
const step=3,inside=(pane,i,j)=>{const a=pane.lo+(i+.5)/S,y=cy+HALF-(j+.5)/S;for(let d=-.3;d<=.3;d+=.004){const p=pane.view===1?[a,y,d]:[d,y,-a];if(field(...toSculpt(p))<0)return true;}return false;};
for(const pane of panes){const grid=[];for(let j=0;j<N;j+=step){const row=[];for(let i=0;i<N;i+=step)row.push(inside(pane,i,j));grid.push(row);}
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){const here=grid[r][c];if((c+1<grid[r].length&&grid[r][c+1]!==here)||(r+1<grid.length&&grid[r+1][c]!==here)){const i=c*step,j=r*step;for(let a=0;a<step;a++){const k=((j+1)*W+pane.x0+i+a)*4;if(i+a<N&&j+1<N){img[k]=img[k+1]=img[k+2]=255;}}}}}
// The lip line where the cut meets the surface, seen from the side (+z) and from the front (+x).
const cutAt=(x,z)=>{let lo=M.lip.y-.06,hi=M.lip.y+.06;const c=y=>G.cut(x,y,z);if(Math.sign(c(lo))===Math.sign(c(hi)))return null;for(let k=0;k<40;k++){const m=(lo+hi)/2;if(Math.sign(c(m))===Math.sign(c(lo)))lo=m;else hi=m;}return (lo+hi)/2;};
for(let x=M.corner.x-.03;x<=M.lip.x+.08;x+=.0005){for(let z=.3;z>=0;z-=.0005){const y=cutAt(x,z);if(y!==null&&field(x,y,z)<0){put(panes[0],sheetPoint(head,place,[x,y,z]),G.slitHalf(x,z)>0?[255,0,255]:[150,0,150],1);break;}}}
for(let z=-.12;z<=.12;z+=.0005){for(let x=.4;x>=-.1;x-=.0005){const y=cutAt(x,z);if(y!==null&&field(x,y,z)<0){put(panes[1],sheetPoint(head,place,[x,y,z]),G.slitHalf(x,z)>0?[255,0,255]:[150,0,150],1);break;}}}
put(panes[0],sheetPoint(head,place,[M.hinge[0],M.hinge[1],0]),[255,235,0],4);
const corner=sheetPoint(head,place,[M.corner.x,G.lipY(M.corner.x,M.corner.z<.15?M.corner.z:.05),0]);put(panes[0],corner,[0,229,255],3);
fs.writeFileSync(out,encodePNG({width:W,height:N,pixels:img}));
console.log(id,'window side x',(cx-HALF).toFixed(3),'..',(cx+HALF).toFixed(3),'y',(cy-HALF).toFixed(3),'..',(cy+HALF).toFixed(3),'(sheet units; grid 5 mm)');
