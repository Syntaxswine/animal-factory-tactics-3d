// The speaking heads posed and drawn as the runtime and the renderer pose and draw them, and the
// closed mouth looked at from every side: what the build's closed-teeth guard and the tests'
// instruments (measure.mjs, which re-exports these) share: the build's guards look at each reduced
// head closed (closedVisibility), open at speech (holesThrough, partsCrossSkin) and its incisors'
// crowns at 12 degrees (crownExposure) as the tests do.
// In the source hash (source-hash.mjs): a change here can change what the build writes.
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

// Segment-triangle (Moller-Trumbore), endpoints excluded slightly; triangle-triangle by edges.
export function segTri(p,q,a,b,c){const e1=sub(b,a),e2=sub(c,a),dir=sub(q,p),pv=cross(dir,e2),det=dot(e1,pv);if(Math.abs(det)<1e-14)return false;const inv=1/det,tv=sub(p,a),u=dot(tv,pv)*inv;if(u<0||u>1)return false;const qv=cross(tv,e1),v=dot(dir,qv)*inv;if(v<0||u+v>1)return false;const t=dot(e2,qv)*inv;return t>1e-7&&t<1-1e-7;}
export function triTri(A,B){for(let k=0;k<3;k++){if(segTri(A[k],A[(k+1)%3],B[0],B[1],B[2]))return true;if(segTri(B[k],B[(k+1)%3],A[0],A[1],A[2]))return true;}return false;}

// The lips' front edges at the middle (rest): the frontmost folding vertex of each side, each lip
// looked for near the middle within its own reach (a game mesh's lips may keep no folding vertex
// at the middle, and one lip's nearest can lie further out than the other's: round 3's one reach
// for both found no upper lip on four game meshes, and the see-through instrument then drew
// nothing and read 0). Throws if a lip has no folding vertex.
export function lipTips(head){const s=head.parts[0],P=s.position,n=P.length/3,zmin=[Infinity,Infinity],side=i=>s.lower[i]<.5?0:1;
 for(let i=0;i<n;i++)if(s.fold[i]>.5)zmin[side(i)]=Math.min(zmin[side(i)],Math.abs(P[i*3+2]));
 const tip=[-1,-1];
 for(let i=0;i<n;i++){if(s.fold[i]<.5)continue;const k=side(i);if(Math.abs(P[i*3+2])>Math.max(.008,zmin[k]+.004))continue;if(tip[k]<0||P[i*3]>P[tip[k]*3])tip[k]=i;}
 if(tip[0]<0||tip[1]<0)throw Error(`${head.species}-${head.level}: no ${tip[0]<0?'upper':'lower'} lip's face to find its front edge by`);
 return {up:tip[0],lo:tip[1]};}

// Holes in the head (mm^2): where the first surface on the line of sight, back faces drawn, is seen
// from behind, so the eye looks into the head through a hole, a crack or an inside-out triangle,
// whatever the renderer then shows there, culling back faces (the background, or the inside of the
// mouth beyond: a hole punched in a cheek, seen from above, shows the mouth's floor). Seen from
// outside, a closed skin's first surface faces the eye. The mouth is open at its sides and front
// (the user, round 4): a line of sight through it meets the mouth's inside, which faces it, or
// nothing, so no curtain is needed. Throws if the head is not in the frame, as seeThrough. Returns
// {mm2, largest (the largest one hole, 4-connected), background (of mm2, where the renderer, culling,
// shows the background: seen through the head), largestBackground, mask, R}.
export function holesThrough(head,deg,az=0,{ppu=4000,size=1000,el=0}={}){
 const parts=pose(head,deg),S=parts[0].P,{up,lo}=lipTips(head),tipU=vtx(S,up),tipL=vtx(S,lo),a=az*Math.PI/180,e=el*Math.PI/180;
 const view={dir:[Math.sin(a)*Math.cos(e),-Math.sin(e),-Math.cos(a)*Math.cos(e)],up:[0,1,0],center:[(tipU[0]+tipL[0])/2-.04,(tipU[1]+tipL[1])/2,0],ppu,w:size,h:size};
 const R=raster(parts,{...view,both:true}),w=R.w,h=R.h,mask=new Uint8Array(w*h);
 let skinPixels=0,n=0;for(let k=0;k<w*h;k++){if(R.id[k]===0)skinPixels++;if(R.back[k]){mask[k]=1;n++;}}
 const proj=p=>{const v=sub(p,view.center);return [w/2+dot(v,R.right)*ppu,h/2-dot(v,R.up)*ppu];},framed=p=>{const [x,y]=proj(p);return x>=0&&y>=0&&x<w&&y<h;};
 if(skinPixels<w*h*.02||!framed(tipU)||!framed(tipL))throw Error(`holesThrough: ${head.species}-${head.level} at ${deg}°, ${az}° round, ${el}° up: the head is not in the frame (${skinPixels} pixels of skin)`);
 // (where any is, what the renderer shows there: drawn again, culled, only then)
 const C=n?raster(parts,view):null,bg=new Uint8Array(w*h);let nb=0;if(C)for(let k=0;k<w*h;k++)if(mask[k]&&C.id[k]<0){bg[k]=1;nb++;}
 const largestOf=m=>{const done=new Uint8Array(w*h);let largest=0;for(let k0=0;k0<w*h;k0++){if(!m[k0]||done[k0])continue;let c=0;const st=[k0];done[k0]=1;
  while(st.length){const k=st.pop();c++;const x=k%w,y=(k-x)/w;for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(j>=0&&m[j]&&!done[j]){done[j]=1;st.push(j);}}largest=Math.max(largest,c);}return largest/(ppu*ppu)*1e6;};
 return {mm2:n/(ppu*ppu)*1e6,largest:n?largestOf(mask):0,background:nb/(ppu*ppu)*1e6,largestBackground:nb?largestOf(bg):0,mask,R};
}

// Teeth and tongue against the skin's own triangles, posed (round 2's reviewer's instrument): for
// each part, the skin triangles it crosses, by the skin's class there: the lips' faces and the
// cheeks between them (`face`: any vertex folding), the mouth inside (`inside`: all three under the
// approved surface past .5) or the outer skin. A tooth is rooted where it crosses the gum (inside);
// through a lip's face or a cheek it shows. Returns [{part, kind, face, inside, outer}] (triangles;
// `collect`: and outerTriangles, the outer skin's crossed, and outerParts, the middles at rest of
// the part's triangles that cross them, for the build's guard).
export function partsCrossSkin(head,deg,{cell=.004,collect=false}={}){
 const parts=pose(head,deg),S=head.parts[0],tris=(part,keep=()=>true)=>{const P=part.P,I=part.index,o=[];for(let t=0;t<I.length/3;t++){if(!keep(t))continue;const v=[0,1,2].map(k=>{const i=I[t*3+k];return [P[i*3],P[i*3+1],P[i*3+2]];});o.push({t,v,min:[0,1,2].map(k=>Math.min(v[0][k],v[1][k],v[2][k])),max:[0,1,2].map(k=>Math.max(v[0][k],v[1][k],v[2][k]))});}return o;};
 const cls=t=>{const v=[S.index[t*3],S.index[t*3+1],S.index[t*3+2]];return v.some(i=>S.fold[i]>.5)?'face':v.every(i=>S.inside[i]>=.5)?'inside':'outer';};
 const skin=tris(parts[0]),grid=new Map();skin.forEach((b,j)=>{for(let x=Math.floor(b.min[0]/cell);x<=Math.floor(b.max[0]/cell);x++)for(let y=Math.floor(b.min[1]/cell);y<=Math.floor(b.max[1]/cell);y++)for(let z=Math.floor(b.min[2]/cell);z<=Math.floor(b.max[2]/cell);z++){const k=x+','+y+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(j);}});
 return parts.slice(1).map(part=>{const hit=new Set(),by=new Set();for(const a of tris(part)){const cand=new Set();
   for(let x=Math.floor(a.min[0]/cell);x<=Math.floor(a.max[0]/cell);x++)for(let y=Math.floor(a.min[1]/cell);y<=Math.floor(a.max[1]/cell);y++)for(let z=Math.floor(a.min[2]/cell);z<=Math.floor(a.max[2]/cell);z++){const l=grid.get(x+','+y+','+z);if(l)for(const j of l)cand.add(j);}
   for(const j of cand){const b=skin[j];if([0,1,2].some(d=>b.min[d]>a.max[d]||b.max[d]<a.min[d]))continue;if(triTri(a.v,b.v)){hit.add(b.t);if(collect&&cls(b.t)==='outer')by.add(a.t);}}}
  const out={part:part.name,kind:part.kind,face:0,inside:0,outer:0};for(const t of hit)out[cls(t)]++;
  if(collect){out.outerTriangles=[...hit].filter(t=>cls(t)==='outer');const R=head.parts[part.pi].position,J=part.index;out.outerParts=[...by].map(t=>[0,1,2].map(k=>(R[J[t*3]*3+k]+R[J[t*3+1]*3+k]+R[J[t*3+2]*3+k])/3));}
  return out;});
}

// The crowns: as measure.mjs had them (round 1's instrument), here for the build's guard too.
// Closest point on a triangle (Ericson).
export function closestOnTri(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return [a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]];}
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return [a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]];}
 const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return [b[0]+w*(c[0]-b[0]),b[1]+w*(c[1]-b[1]),b[2]+w*(c[2]-b[2])];}
 const den=1/(va+vb+vc),v=vb*den,w=vc*den;return [a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w];}

// A posed skin as a solid: inside (by the parity of three axis-aligned rays, two of three to agree)
// and the nearest triangle (distance, and whether it is outer skin: all three vertices under
// inside .5), both through grids.
// A triangle of the outer skin: none of its vertices the mouth's (inside) or the lips' faces and
// the cheeks between them (fold), which are the mouth's when it opens.
export const outerTri=(skin,t)=>{const I=skin.index;for(let k=0;k<3;k++){const i=I[t*3+k];if(skin.inside[i]>=.5||skin.fold[i]>=.5)return false;}return true;};
export function solid(skin){
 const P=skin.P,I=skin.index,nt=I.length/3,T=[];
 for(let t=0;t<nt;t++){const v=[vtx(P,I[t*3]),vtx(P,I[t*3+1]),vtx(P,I[t*3+2])];T.push({v,min:[0,1,2].map(k=>Math.min(v[0][k],v[1][k],v[2][k])),max:[0,1,2].map(k=>Math.max(v[0][k],v[1][k],v[2][k])),outer:outerTri(skin,t)});}
 const cell=.004,grid2=(a,b)=>{const g=new Map();T.forEach((tr,t)=>{for(let i=Math.floor(tr.min[a]/cell);i<=Math.floor(tr.max[a]/cell);i++)for(let j=Math.floor(tr.min[b]/cell);j<=Math.floor(tr.max[b]/cell);j++){const k=i+','+j;if(!g.has(k))g.set(k,[]);g.get(k).push(t);}});return g;};
 const gx=grid2(1,2),gy=grid2(0,2);
 const parity=(p,axis,sign,g,a,b)=>{const l=g.get(Math.floor(p[a]/cell)+','+Math.floor(p[b]/cell))||[];let n=0;const q=p.slice();q[axis]+=sign*10;for(const t of l)if(segTri(p,q,...T[t].v))n++;return n%2===1;};
 const inside=p=>{let v=0;if(parity(p,0,1,gx,1,2))v++;if(parity(p,0,-1,gx,1,2))v++;if(v===1&&parity(p,1,1,gy,0,2))v++;return v>=2;};
 const c3=.01,g3=new Map();T.forEach((tr,t)=>{for(let i=Math.floor(tr.min[0]/c3);i<=Math.floor(tr.max[0]/c3);i++)for(let j=Math.floor(tr.min[1]/c3);j<=Math.floor(tr.max[1]/c3);j++)for(let k=Math.floor(tr.min[2]/c3);k<=Math.floor(tr.max[2]/c3);k++){const key=i+','+j+','+k;if(!g3.has(key))g3.set(key,[]);g3.get(key).push(t);}});
 const nearest=p=>{let best=Infinity,outer=false,side=0;const c=p.map(v=>Math.floor(v/c3));
  for(let r=0;r<6;r++){for(let i=c[0]-r;i<=c[0]+r;i++)for(let j=c[1]-r;j<=c[1]+r;j++)for(let k=c[2]-r;k<=c[2]+r;k++){if(Math.max(Math.abs(i-c[0]),Math.abs(j-c[1]),Math.abs(k-c[2]))!==r)continue;const l=g3.get(i+','+j+','+k);if(!l)continue;
    for(const t of l){const q=closestOnTri(p,...T[t].v),d=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);if(d<best){best=d;outer=T[t].outer;const [a,b,e]=T[t].v;side=Math.sign(dot(sub(p,q),cross(sub(b,a),sub(e,a))));}}}
   if(best<=r*c3)break;}
  return {d:best,outer,side};};
 return {inside,nearest};
}

// Each tooth's crown with the jaw open `deg`: the farthest any of its vertices outside the skin's
// solid stands from the skin (metres). Returns [{part, kind, tooth, crown}].
export function crownExposure(head,deg){
 const parts=pose(head,deg),S=solid(parts[0]),out=[];
 for(const part of parts.slice(1).filter(p=>p.teeth))part.teeth.forEach((t,i)=>{let crown=0;for(let k=t.first;k<t.first+t.count;k++){const p=vtx(part.P,k);if(!S.inside(p))crown=Math.max(crown,S.nearest(p).d);}out.push({part:part.name,kind:t.kind,tooth:i,crown});});
 return out;
}
