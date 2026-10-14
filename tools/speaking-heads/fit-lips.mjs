// node tools/speaking-heads/fit-lips.mjs [--check] [id,id...]
// Each muzzle's lip line, fitted to its painted mouth line. The painted line was traced off the
// approved head's paint in the viewer (speakingHeads.traceMouth: in columns 2 mm apart, the
// darkest thin line within 25 mm of the cut, joined by dynamic programming; from the side and from
// the front; painted-mouths.json, placed units: side [x, y, contrast], front [z, y, contrast]).
// Which stretches of each trace are the mouth is read off the traces drawn over the paint and is
// set here per head (CURATED); the line is fitted as y = along(x) (+ across(|z|) for a mouth on the
// front of the face), splines through knots (sculpt.mjs spline), by least squares weighted by
// contrast with a bend penalty. The mouth's corner is the painted line's back end, half a taper
// further forward (sculpt.mjs: the lips part over the taper behind the corner).
// Prints each head's knots and corner as mouths.mjs has them, and the residuals: side (the stretch
// fitted), front (the middle fitted) and front across (the whole front trace that is the mouth,
// not all fitted). --check: exit 1 if mouths.mjs is not the fit (0.2 mm at a knot, 1 mm corner).
import fs from 'node:fs';
import {HEAD,donkeyNeck} from './heads.mjs';
import {MOUTHS} from './mouths.mjs';
import {placement} from './place.mjs';
import {mouthGeometry,spline} from './sculpt.mjs';

const knots=(a,b,n)=>Array.from({length:n},(_,i)=>+(a+(b-a)*i/(n-1)).toFixed(4));
// side: the x range (sculpt) and least contrast of the trace that is the mouth; front: the |z|
// range fitted (the middle: the front trace's ends ride up the muzzle's edges) and its least
// contrast; across: the front trace that is the mouth (checked, not all fitted); corner: the
// painted line's back end (x, sculpt); cornerZ: the mouth's corner.z where it is not .2.
export const CURATED={
 horse:{side:[.160,.264,2],front:[0,.02,3],across:.05,corner:.163,along:knots(.15,.27,9)},
 goat:{side:[.105,.169,10],front:[0,.02,5],across:.035,corner:.107,along:knots(.095,.215,9)},
 bull:{side:[.113,.21,5],front:[0,.02,5],across:.04,corner:.115,along:knots(.10,.22,9)},
 cow:{side:[.105,.19,5],front:[0,.02,5],across:.05,corner:.107,along:knots(.095,.215,9)},
 donkey:{side:[.135,.226,5],front:[0,.02,5],across:.045,corner:.14,along:knots(.125,.235,9)},
 sheep:{side:[.092,.183,4],front:[0,.02,5],across:.045,corner:.095,along:knots(.085,.19,8)},
 skunk:{side:[.093,.168,5],front:null,corner:.095,along:knots(.085,.175,7)},
 'pig-foreman':{side:[.124,.225,5],front:[0,.02,5],across:.04,corner:.125,along:knots(.115,.235,9)},
 // the director's smile wraps far round the snout: the whole front trace is fitted
 'pig-director':{side:[.13,.246,5],front:[0,.1,5],across:.1,corner:.133,cornerZ:.2,along:knots(.12,.255,10)},
 // the rabbit's mouth is on the front of its face: a level line, and its rise across (the lobes
 // of its upper lip, rising at the ends); the cleft between them is left out
 rabbit:{side:[.113,.136,5],front:[.012,.065,5],across:.065,cornerZ:.068,level:[.05,.2],acrossKnots:[0,.03,.045,.06,.075]},
 dog:{side:[.074,.213,3],front:[0,.02,5],across:.045,corner:.074,along:knots(.06,.225,12)}
};
const BEND=3,TAPER_HALF=.005;

const placedToSculpt=(head,[x,y,z])=>{
 if(head.revision){let lo=y-.12,hi=y+.01;for(let k=0;k<50;k++){const m=(lo+hi)/2;if(donkeyNeck([x,m,z])[1]<y)lo=m;else hi=m;}return [x,(lo+hi)/2,z];}
 return placement(head).unmap([x,y,z]);};
const bisect=(f,a,b)=>{const fa=f(a)<0;for(let k=0;k<30;k++){const m=(a+b)/2;if((f(m)<0)===fa)a=m;else b=m;}return (a+b)/2;};
// the approved head's surface at (x, y) seen from the side, and at (y, z) seen from the front
const sideZ=(F,x,y)=>{let z=.3;while(z>0&&F(x,y,z)>=0)z-=.002;return z<=0?null:bisect(w=>F(x,y,w),z,z+.002);};
const frontX=(F,x0,y,z)=>{let x=x0;while(x>-.1&&F(x,y,z)>=0)x-=.002;return x<=-.1?null:bisect(u=>F(u,y,z),x,x+.002);};
function solve(A,b){const n=b.length;
 for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
  for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
 const x=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i];}return x;}

export function fitLips(id,traces){
 const S=CURATED[id],head=HEAD[id],M=MOUTHS[id],F=head.field,T=traces[id];
 const samples=[];
 for(const [X,Y,s] of T.side){const [x,y]=placedToSculpt(head,[X,Y,0]),z=sideZ(F,x,y);if(z===null)continue;
  samples.push({kind:'side',x,y,z,s,fit:x>=S.side[0]&&x<=S.side[1]&&s>=S.side[2]});}
 if(S.front)for(const [Z,Y,s] of T.front){const p=placedToSculpt(head,[.2,Y,Z]),az=Math.abs(p[2]),x=frontX(F,M.lip.x+.15,p[1],p[2]);if(x===null)continue;
  samples.push({kind:'front',x,y:p[1],z:p[2],s,fit:az>=S.front[0]&&az<=S.front[1]&&s>=S.front[2],check:az<=S.across&&s>=S.front[2]});}
 // unknowns: the along knots (one, for a level line) and the across knots after the first (0)
 const KA=S.level||S.along,KB=S.acrossKnots||null,nA=S.level?1:KA.length,nB=KB?KB.length-1:0,n=nA+nB;
 const unit=(K,j)=>spline(K.map((u,i)=>[u,i===j?1:0]));
 const BA=S.level?[()=>1]:KA.map((_,j)=>unit(KA,j)),BB=KB?KB.slice(1).map((_,j)=>unit(KB,j+1)):[];
 const A=Array.from({length:n},()=>new Array(n).fill(0)),b=new Array(n).fill(0);
 for(const q of samples){if(!q.fit)continue;const w=Math.min(q.s,30)/10,row=[...BA.map(f=>f(q.x)),...BB.map(f=>f(Math.abs(q.z)))];
  for(let i=0;i<n;i++){b[i]+=w*row[i]*q.y;for(let j=0;j<n;j++)A[i][j]+=w*row[i]*row[j];}}
 const bend=idx=>{for(let k=1;k<idx.length-1;k++){const c=[1,-2,1];for(let p=0;p<3;p++)for(let r=0;r<3;r++)A[idx[k-1+p]][idx[k-1+r]]+=BEND*c[p]*c[r];}};
 if(nA>2)bend([...Array(nA).keys()]);if(nB>1)bend([...Array(nB).keys()].map(i=>i+nA));
 const th=solve(A,b),r4=v=>+v.toFixed(4);
 const line=KA.map((x,j)=>[x,r4(th[S.level?0:j])]),across=KB?[[0,0],...KB.slice(1).map((z,j)=>[z,r4(th[nA+j])])]:null;
 const corner={x:S.corner==null?M.corner.x:r4(S.corner+TAPER_HALF),z:S.cornerZ??M.corner.z};
 const lip={...M.lip,line,...(across?{across}:{smile:0,width:M.lip.width??.05})};if(!across)delete lip.across;
 const G=mouthGeometry({...M,lip,corner:{...M.corner,...corner}},F);
 const rms=a=>a.length?Math.sqrt(a.reduce((s,q)=>s+((q.y-G.lipY(q.x,q.z))*1000)**2,0)/a.length):0;
 return {line,across,corner,samples,residual:{side:rms(samples.filter(q=>q.kind==='side'&&q.fit)),front:rms(samples.filter(q=>q.kind==='front'&&q.fit)),across:rms(samples.filter(q=>q.kind==='front'&&q.check))}};
}

if(/fit-lips\.mjs$/.test(process.argv[1]||'')){
 const check=process.argv.includes('--check'),only=process.argv.slice(2).find(a=>!a.startsWith('--'))?.split(',');
 const traces=JSON.parse(fs.readFileSync(new URL('./painted-mouths.json',import.meta.url)));
 const num=v=>{let s=(+v.toFixed(4)).toString();return s.replace(/^(-?)0\./,'$1.');},K=k=>'['+k.map(([a,b])=>`[${num(a)},${num(b)}]`).join(',')+']';
 let bad=0;
 for(const id of Object.keys(CURATED)){if(only&&!only.includes(id))continue;const f=fitLips(id,traces),M=MOUTHS[id];
  const R=f.residual,count=k=>f.samples.filter(q=>q.kind===k&&q.fit).length;
  console.log(`${id.padEnd(13)} residual (rms) side ${R.side.toFixed(1)} mm (${count('side')}), front ${R.front.toFixed(1)} mm (${count('front')}), across the front ${R.across.toFixed(1)} mm`);
  console.log(`  line:${K(f.line)}${f.across?',across:'+K(f.across):''}  corner x ${num(f.corner.x)} z ${num(f.corner.z)}`);
  if(check){const off=[];const L=M.lip.line||[];if(L.length!==f.line.length||L.some(([x,y],i)=>Math.abs(x-f.line[i][0])>1e-6||Math.abs(y-f.line[i][1])>.0002))off.push('line');
   if(f.across&&(!M.lip.across||M.lip.across.some(([z,y],i)=>Math.abs(z-f.across[i][0])>1e-6||Math.abs(y-f.across[i][1])>.0002)))off.push('across');
   if(Math.abs(M.corner.x-f.corner.x)>.001||Math.abs(M.corner.z-f.corner.z)>.001)off.push('corner');
   if(off.length){bad++;console.log(`  NOT THE FIT: ${off.join(', ')}`);}}}
 if(check&&bad){console.log(`${bad} mouth(s) differ from the fit`);process.exit(1);}
}
