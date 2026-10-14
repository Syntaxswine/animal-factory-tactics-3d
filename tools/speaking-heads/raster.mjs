// A small orthographic z-buffer rasteriser and PNG writer, so the sculpting tools can look at
// a head without a browser: grey clay under one key light, optional per-vertex colours.
// Review evidence is photographed in the real renderer (speaking-heads.html); this is for the
// tools' own iteration and for the measurements that need a depth buffer.
import fs from 'node:fs';
import {encodePNG} from '../png-rgba.mjs';

export const writePNG=(path,width,height,rgba)=>fs.writeFileSync(path,encodePNG({width,height,pixels:rgba}));

const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

// view: {dir: from the eye toward the subject, up, center, scale (px per unit), width, height}.
// meshes: [{position (flat xyz), index, normal? (flat), color? [r,g,b] 0..1, colors? (flat rgb)}].
// Returns {rgba, depth (larger is nearer, -Infinity where empty), width, height}.
export function render(meshes,view,{background=[0.55,0.55,0.53],light=[.45,.75,.5],ambient=.38,wire=false}={}){
 const W=view.width,H=view.height,d=norm(view.dir),right=norm(cross(d,view.up)),up=cross(right,d),L=norm(light),c=view.center,s=view.scale;
 const rgba=new Uint8ClampedArray(W*H*4),depth=new Float32Array(W*H).fill(-Infinity);
 for(let i=0;i<W*H;i++){rgba[i*4]=background[0]*255;rgba[i*4+1]=background[1]*255;rgba[i*4+2]=background[2]*255;rgba[i*4+3]=255;}
 for(const m of meshes){
  const P=m.position,n=P.length/3,sx=new Float32Array(n),sy=new Float32Array(n),sz=new Float32Array(n);
  for(let i=0;i<n;i++){const v=[P[i*3]-c[0],P[i*3+1]-c[1],P[i*3+2]-c[2]];sx[i]=W/2+dot(v,right)*s;sy[i]=H/2-dot(v,up)*s;sz[i]=-dot(v,d);}
  const N=m.normal,ix=m.index;
  for(let t=0;t<ix.length;t+=3){
   const a=ix[t],b=ix[t+1],e=ix[t+2];
   const area=(sx[b]-sx[a])*(sy[e]-sy[a])-(sx[e]-sx[a])*(sy[b]-sy[a]);
   if(area>=0&&!m.doubleSided)continue;           // counter-clockwise on screen is front-facing (y down)
   const x0=Math.max(0,Math.floor(Math.min(sx[a],sx[b],sx[e]))),x1=Math.min(W-1,Math.ceil(Math.max(sx[a],sx[b],sx[e])));
   const y0=Math.max(0,Math.floor(Math.min(sy[a],sy[b],sy[e]))),y1=Math.min(H-1,Math.ceil(Math.max(sy[a],sy[b],sy[e])));
   let face=null;if(!N){const pa=[P[a*3],P[a*3+1],P[a*3+2]],pb=[P[b*3],P[b*3+1],P[b*3+2]],pe=[P[e*3],P[e*3+1],P[e*3+2]];face=norm(cross(pb.map((x,k)=>x-pa[k]),pe.map((x,k)=>x-pa[k])));}
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const px=x+.5,py=y+.5;
    const w0=((sx[b]-px)*(sy[e]-py)-(sx[e]-px)*(sy[b]-py))/area,w1=((sx[e]-px)*(sy[a]-py)-(sx[a]-px)*(sy[e]-py))/area,w2=1-w0-w1;
    if(w0<-1e-6||w1<-1e-6||w2<-1e-6)continue;
    const z=w0*sz[a]+w1*sz[b]+w2*sz[e],k=y*W+x;if(z<=depth[k])continue;depth[k]=z;
    let nn=face;if(N)nn=norm([0,1,2].map(q=>w0*N[a*3+q]+w1*N[b*3+q]+w2*N[e*3+q]));
    if(area>=0)nn=nn.map(v=>-v);
    const lit=ambient+(1-ambient)*Math.max(0,dot(nn,L))+.12*Math.pow(Math.max(0,1+dot(nn,d)),3)*0;
    let col=m.color||[.72,.71,.68];if(m.colors){const C=m.colors;col=[0,1,2].map(q=>w0*C[a*3+q]+w1*C[b*3+q]+w2*C[e*3+q]);}
    if(wire){const edge=Math.min(w0,w1,w2)*Math.abs(area)/Math.max(Math.hypot(sx[b]-sx[a],sy[b]-sy[a]),Math.hypot(sx[e]-sx[b],sy[e]-sy[b]),Math.hypot(sx[a]-sx[e],sy[a]-sy[e]));if(edge<.6)col=col.map(v=>v*.35);}
    rgba[k*4]=Math.min(255,col[0]*lit*255);rgba[k*4+1]=Math.min(255,col[1]*lit*255);rgba[k*4+2]=Math.min(255,col[2]*lit*255);
   }
  }
 }
 return {rgba,depth,width:W,height:H};
}

// Lay several renders side by side (equal heights) into one image.
export function montage(images,{gap=6,background=[40,40,40]}={}){
 const H=Math.max(...images.map(i=>i.height)),W=images.reduce((w,i)=>w+i.width,0)+gap*(images.length-1);
 const rgba=new Uint8ClampedArray(W*H*4);for(let i=0;i<W*H;i++){rgba[i*4]=background[0];rgba[i*4+1]=background[1];rgba[i*4+2]=background[2];rgba[i*4+3]=255;}
 let x0=0;for(const im of images){for(let y=0;y<im.height;y++)rgba.set(im.rgba.subarray(y*im.width*4,(y+1)*im.width*4),(y*W+x0)*4);x0+=im.width+gap;}
 return {rgba,width:W,height:H};
}
export function stack(rows,{gap=6,background=[40,40,40]}={}){
 const W=Math.max(...rows.map(i=>i.width)),H=rows.reduce((h,i)=>h+i.height,0)+gap*(rows.length-1);
 const rgba=new Uint8ClampedArray(W*H*4);for(let i=0;i<W*H;i++){rgba[i*4]=background[0];rgba[i*4+1]=background[1];rgba[i*4+2]=background[2];rgba[i*4+3]=255;}
 let y0=0;for(const im of rows){for(let y=0;y<im.height;y++)rgba.set(im.rgba.subarray(y*im.width*4,(y+1)*im.width*4),((y0+y)*W)*4);y0+=im.height+gap;}
 return {rgba,width:W,height:H};
}
