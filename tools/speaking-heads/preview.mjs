// node tools/speaking-heads/preview.mjs <id> [out.png] [--wire] [--weights]
// Clay renders of a speaking head beside the approved head: profile and three-quarter views,
// closed (the rest pose) and with the jaw open 12 and 24 degrees, for sculpting iterations.
import {fileURLToPath} from 'node:url';
import {HEAD} from './heads.mjs';
import {MOUTHS} from './mouths.mjs';
import {sculptSpeaking} from './sculpt.mjs';
import {sculptSurface} from '../../dist/tactics/grey-surface.js';
import {render,montage,stack,writePNG} from './raster.mjs';

const id=process.argv[2],out=process.argv[3]&&!process.argv[3].startsWith('--')?process.argv[3]:fileURLToPath(new URL(`../../.speaking-preview-${id}.png`,import.meta.url));
const wire=process.argv.includes('--wire'),weights=process.argv.includes('--weights');
const head=HEAD[id],M=MOUTHS[id];if(!head||!M)throw Error('unknown head '+id);
const t0=Date.now(),S=sculptSpeaking(head,M),original=sculptSurface(head.field,head.min,head.max,head.step);
console.log('sculpted in',Date.now()-t0,'ms; skin',S.skin.index.count/3,'triangles; parts',S.parts.map(p=>p.name+' '+p.geometry.index.count/3).join(', '));

const [hx,hy]=M.hinge;
function turn(p,angle,w=1){const a=-angle*w,c=Math.cos(a),s=Math.sin(a),dx=p[0]-hx,dy=p[1]-hy;return [hx+dx*c-dy*s,hy+dx*s+dy*c,p[2]];}
// Linear blend skinning about the hinge, as the runtime's jaw bone does it.
function lbs(p,angle,w){if(!w)return p;const q=turn(p,angle);return [p[0]+w*(q[0]-p[0]),p[1]+w*(q[1]-p[1]),p[2]];}
function pose(angle){
 const P=S.rest,n=P.length/3,pos=new Float32Array(n*3),N=S.skin.attributes.normal.array,nor=new Float32Array(n*3),col=new Float32Array(n*3);
 for(let i=0;i<n;i++){const p=[P[i*3],P[i*3+1],P[i*3+2]],w=S.jaw[i];pos.set(lbs(p,angle,w),i*3);
  const nn=[N[i*3],N[i*3+1],N[i*3+2]],r=turn(nn.map((v,k)=>v+[hx,hy,0][k]),angle);nor.set(nn.map((v,k)=>v+w*((r[k]-[hx,hy,0][k])-v)),i*3);
  const m=S.inside[i],skin=weights?[.25+.75*w,.35,1-.75*w]:[.74,.72,.68];col.set(skin.map((v,k)=>v*(1-m)+[.42,.12,.12][k]*m),i*3);}
 const meshes=[{position:pos,normal:nor,index:S.skin.index.array,colors:col}];
 for(const part of S.parts){const g=part.geometry,PP=g.attributes.position.array,NN=g.attributes.normal.array,a=part.bone==='jaw'?angle:0,pp=new Float32Array(PP.length),nn=new Float32Array(NN.length);
  for(let i=0;i<PP.length;i+=3){pp.set(turn([PP[i],PP[i+1],PP[i+2]],a),i);const r=turn([NN[i]+hx,NN[i+1]+hy,NN[i+2]],a);nn.set([r[0]-hx,r[1]-hy,r[2]],i);}
  meshes.push({position:pp,normal:nn,index:g.index.array,color:part.name==='tongue'?[.78,.42,.42]:[.93,.9,.8]});}
 return meshes;
}
const originalMesh=[{position:original.attributes.position.array,normal:original.attributes.normal.array,index:original.index.array,color:[.74,.72,.68]}];
const zoom=process.argv.includes('--corner');
const center=zoom?[M.corner.x+.02,M.lip.y-.004,.05]:[M.lip.x-.06,M.lip.y-.005,0],size=440,scale=zoom?3200:1650;
const views=zoom?[{dir:[-.5,-.2,-.84],up:[0,1,0]},{dir:[.2,-.1,-1],up:[0,1,0]}]:[{dir:[0,0,-1],up:[0,1,0]},{dir:[-.78,-.18,-.6],up:[0,1,0]},{dir:[-1,.05,0],up:[0,1,0]}];
const rows=views.map(v=>montage([originalMesh,pose(0),pose(12*Math.PI/180),pose(24*Math.PI/180)].map(m=>render(m,{...v,center,scale,width:size,height:size},{wire}))));
const img=stack(rows);writePNG(out,img.width,img.height,img.rgba);console.log('wrote',out);
