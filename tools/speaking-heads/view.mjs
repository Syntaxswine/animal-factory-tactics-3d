// The speaking heads posed and drawn as the runtime and the renderer pose and draw them, and the
// closed mouth looked at from every side: what the build's closed-teeth guard and the tests'
// instruments (measure.mjs, which re-exports these) share. In the source hash (source-hash.mjs):
// a change here can change what the build writes.
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
export const vtx=(P,i)=>[P[i*3],P[i*3+1],P[i*3+2]];

// Every part posed with the jaw open `deg` degrees, as the runtime poses it (speaking-head.js): the
// skin's closed shape blended in as the jaw closes (in full at 0, none from 2 degrees), then the
// skin by its jaw weights, teeth and tongue rigid on their bones. Returns [{name, kind, bone, index,
// P (Float64Array), jaw, inside, fold, lower, teeth, pi}].
export const CLOSED_FADE=2;
export function pose(head,deg){
 const [hx,hy]=head.jaw.hinge,a=deg*Math.PI/180,c=Math.cos(-a),s=Math.sin(-a),t=Math.min(1,Math.max(0,deg/CLOSED_FADE)),shut=1-t*t*(3-2*t);
 return head.parts.map((part,pi)=>{let P=part.position;const n=P.length/3,out=new Float64Array(n*3);
  if(part.closed&&shut>0){P=Float64Array.from(P);part.closed.vertices.forEach((i,k)=>{for(let j=0;j<3;j++)P[i*3+j]+=shut*part.closed.offset[k*3+j];});}
  for(let i=0;i<n;i++){const w=part.kind==='skin'?part.jaw[i]:part.bone==='jaw'?1:0,x=P[i*3],y=P[i*3+1],dx=x-hx,dy=y-hy;
   out[i*3]=x+w*(hx+dx*c-dy*s-x);out[i*3+1]=y+w*(hy+dx*s+dy*c-y);out[i*3+2]=P[i*3+2];}
  return {name:part.name,kind:part.kind,bone:part.bone,index:part.index,P:out,jaw:part.jaw,inside:part.inside,fold:part.fold,lower:part.lower,teeth:part.teeth,pi};});
}

// Orthographic z-buffer. view: {dir (eye -> subject), up, center, ppu (pixels per metre), w, h,
// both}. Back faces are culled, as the renderer draws the parts (FrontSide; `both`, or a part's own
// `both`, draws them too). Returns {depth (larger nearer), id (part index), tri, back (1 where the
// nearest is a back face), w, h, right, up}.
// Edge-on triangles skipped.
export function raster(parts,view){
 const {w,h,ppu,center}=view,d=norm(view.dir),right=norm(cross(d,view.up)),up=cross(right,d);
 const depth=new Float32Array(w*h).fill(-Infinity),id=new Int16Array(w*h).fill(-1),tri=new Int32Array(w*h).fill(-1),back=new Uint8Array(w*h);
 for(const part of parts){const P=part.P,n=P.length/3,sx=new Float64Array(n),sy=new Float64Array(n),sz=new Float64Array(n);
  for(let i=0;i<n;i++){const v=[P[i*3]-center[0],P[i*3+1]-center[1],P[i*3+2]-center[2]];sx[i]=w/2+dot(v,right)*ppu;sy[i]=h/2-dot(v,up)*ppu;sz[i]=-dot(v,d);}
  const ix=part.index;
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],e=ix[t+2];
   const area=(sx[b]-sx[a])*(sy[e]-sy[a])-(sx[e]-sx[a])*(sy[b]-sy[a]);if(Math.abs(area)<1e-9||area>0&&!view.both&&!part.both)continue;
   const x0=Math.max(0,Math.floor(Math.min(sx[a],sx[b],sx[e]))),x1=Math.min(w-1,Math.ceil(Math.max(sx[a],sx[b],sx[e])));
   const y0=Math.max(0,Math.floor(Math.min(sy[a],sy[b],sy[e]))),y1=Math.min(h-1,Math.ceil(Math.max(sy[a],sy[b],sy[e])));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=x+.5,py=y+.5;
    const w0=((sx[b]-px)*(sy[e]-py)-(sx[e]-px)*(sy[b]-py))/area,w1=((sx[e]-px)*(sy[a]-py)-(sx[a]-px)*(sy[e]-py))/area,w2=1-w0-w1;
    if(w0<-1e-9||w1<-1e-9||w2<-1e-9)continue;const z=w0*sz[a]+w1*sz[b]+w2*sz[e],k=y*w+x;if(z<=depth[k])continue;depth[k]=z;id[k]=part.pi;tri[k]=t/3;back[k]=area>0?1:0;}}}
 return {depth,id,tri,back,w,h,right,up};
}

// Closed (jaw 0), from 120 directions about the face (8 heights, 15 headings, the front half and
// past the sides): the most tooth and tongue any of them sees (mm^2), the most mouth interior (skin
// whose three vertices are all inside .5), and the most background seen through the closed head (a
// hole the border's flood fill cannot reach: the crease leaking), at 10 px/mm, back faces culled as
// the renderer culls them (round 2: at 4 px/mm, drawing back faces, it saw none of the leaks the
// renderer showed). Each view is framed on the whole crease (the lips' faces, posed closed) and
// `margin` round it (round 3's fixed 9 cm about the mouth's middle left out the dog's corners: a
// 4 mm tooth put through its crease there read 0, and nothing counted background, round 3's review).
// The hen's head part (her beak sits in it) is drawn too.
// (`collect`: also the middles of every tooth and tongue triangle seen, from any direction, as
// `shown`: the build reduces again with the skin round them kept)
export function closedVisibility(head,level,{ppu=10000,margin=.005,occluder=null,collect=false}={}){
 const parts=pose(head,0),skin=head.parts[0],S=parts[0].P,shown=new Map();
 if(occluder)parts.push({name:'occluder',kind:'occluder',index:occluder.index,P:Float64Array.from(occluder.position),pi:parts.length});
 const interior=new Uint8Array(skin.index.length/3);for(let t=0;t<interior.length;t++)interior[t]=Math.min(skin.inside[skin.index[t*3]],skin.inside[skin.index[t*3+1]],skin.inside[skin.index[t*3+2]])>.5?1:0;
 const crease=[];for(let i=0;i<skin.fold.length;i++)if(skin.fold[i]>.5)crease.push(vtx(S,i));
 let worst={teeth:0},worstInterior={interior:0},worstHole={hole:0};
 for(let el=-60;el<=45;el+=15)for(let az=-105;az<=105;az+=15){const e=[Math.cos(el*Math.PI/180)*Math.cos(az*Math.PI/180),Math.sin(el*Math.PI/180),Math.cos(el*Math.PI/180)*Math.sin(az*Math.PI/180)];
  const dir=e.map(v=>-v),right=norm(cross(dir,[0,1,0])),up=cross(right,dir);let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
  for(const p of crease){const u=dot(p,right),v=dot(p,up);u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
  const center=right.map((r,k)=>r*(u0+u1)/2+up[k]*(v0+v1)/2),w=Math.ceil((u1-u0+2*margin)*ppu),h=Math.ceil((v1-v0+2*margin)*ppu);
  const R=raster(parts,{dir,up:[0,1,0],center,ppu,w,h});let teeth=0,inner=0;
  for(let k=0;k<R.id.length;k++){const pi=R.id[k];if(pi<0)continue;const kind=parts[pi].kind;if(kind==='teeth'||kind==='tongue'){teeth++;if(collect)shown.set(pi+':'+R.tri[k],[pi,R.tri[k]]);}else if(pi===0&&interior[R.tri[k]])inner++;}
  const seen=new Uint8Array(w*h),stack=[];for(let x=0;x<w;x++)stack.push(x,(h-1)*w+x);for(let y=0;y<h;y++)stack.push(y*w,y*w+w-1);
  while(stack.length){const k=stack.pop();if(seen[k]||R.id[k]>=0)continue;seen[k]=1;const x=k%w,y=(k-x)/w;if(x>0)stack.push(k-1);if(x<w-1)stack.push(k+1);if(y>0)stack.push(k-w);if(y<h-1)stack.push(k+w);}
  let hole=0;for(let k=0;k<w*h;k++)if(R.id[k]<0&&!seen[k])hole++;
  const mm=1e6/(ppu*ppu);if(teeth*mm>worst.teeth)worst={teeth:teeth*mm,az,el};if(inner*mm>worstInterior.interior)worstInterior={interior:inner*mm,az,el};if(hole*mm>worstHole.hole)worstHole={hole:hole*mm,az,el};}
 const middle=([pi,t])=>{const P=parts[pi].P,I=parts[pi].index;return [0,1,2].map(j=>(P[I[t*3]*3+j]+P[I[t*3+1]*3+j]+P[I[t*3+2]*3+j])/3);};
 return {teeth:worst,interior:worstInterior,hole:worstHole,...(collect?{shown:[...shown.values()].map(middle)}:{})};
}
