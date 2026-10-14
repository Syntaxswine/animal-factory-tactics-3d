// The mouth plan of one character, as lines on its registered paint sheet (sheet units: the
// sheet's own model units, x forward, y up, z across): the lip line in profile and from the
// front, where the mouth ends and where it opens at the front, the jaw joint, the jaw line and
// the jaw's angle, the cavity, the teeth and the tongue. It is what the reference sheets draw over
// the painted face.
import {PAINT} from './heads.mjs';

export function sheetPoint(head,place,p){
 const P=PAINT[head.id],q=P.space==='sculpt'?p.slice():place.map(p);
 if(P.lift)q[1]+=P.lift;
 return q;
}
// The head's surface along a ray from outside (sculpt space), by bisection on its field.
function surface(field,from,dir,far=.5){if(field(...from)<0)return null;
 let t=0;for(;t<far;t+=.002)if(field(from[0]+dir[0]*t,from[1]+dir[1]*t,from[2]+dir[2]*t)<0)break;if(t>=far)return null;let lo=t-.002,hi=t;
 for(let i=0;i<30;i++){const m=(lo+hi)/2;if(field(from[0]+dir[0]*m,from[1]+dir[1]*m,from[2]+dir[2]*m)<0)hi=m;else lo=m;}
 return from.map((v,k)=>v+dir[k]*hi);}

// S: the sculpt (sculpt.mjs sculptSpeaking): its geometry, teeth and tongue.
export function mouthPlan(head,M,place,S){
 const G=S.geometry,Sh=p=>sheetPoint(head,place,p),f=head.field,lines=[],dots=[];
 const open=(x,z)=>G.sigma(x,z)>0;
 // The lip line where it meets the face, seen from the side and from the front.
 const profile=[],front=[];
 for(let x=M.corner.x-M.gap/2;x<=G.frontX(0)+.002;x+=.002){const hit=surface(f,[x,G.refY(x,.3),.3],[0,0,-1]);if(hit&&open(hit[0],hit[2]))profile.push(Sh([hit[0],G.refY(hit[0],hit[2]),hit[2]]));}
 for(let z=-.2;z<=.2;z+=.002){const hit=surface(f,[.5,G.refY(G.frontX(Math.abs(z)),z),z],[-1,0,0]);if(hit&&open(hit[0],z))front.push(Sh([hit[0],G.refY(hit[0],z),z]));}
 lines.push({view:'side',kind:'lip',points:profile},{view:'front',kind:'lip',points:front});
 dots.push({view:'side',kind:'hinge',point:Sh([M.hinge[0],M.hinge[1],0])});
 dots.push({view:'side',kind:'corner',point:Sh([M.corner.x,G.refY(M.corner.x,0),0])});
 dots.push({view:'side',kind:'jaw angle',point:Sh([...G.lines.a,0])});
 lines.push({view:'side',kind:'under',points:G.lines.points.map(([x,y])=>Sh([x,y,0]))});
 // Where the cheeks end and the mouth opens at the front, seen from the front.
 if(M.cheeks){const w=G.window,x=G.frontX(w);dots.push({view:'front',kind:'window',point:Sh([x,G.refY(x,w),w])},{view:'front',kind:'window',point:Sh([x,G.refY(x,-w),-w])});}
 // The cavity's outline at the middle.
 const y=x=>G.refY(x,0)+.0005;let x0=null,x1=null;for(let x=M.cavity.back-.01;x<G.frontX(0);x+=.001)if(G.cavity(x,y(x),0)<0){if(x0===null)x0=x;x1=x;}
 if(x0!==null){const C=M.cavity;lines.push({view:'side',kind:'cavity',points:[[x0,C.roof],[x1,C.roof],[x1,-C.floor],[x0,-C.floor],[x0,C.roof]].map(([x,dy])=>Sh([x,G.refY(x,0)+(C.lift||0)+dy,0]))});}
 for(const t of S.teeth)lines.push({view:'side',kind:'tooth',points:[Sh(t.tip),Sh(t.root)]},{view:'front',kind:'tooth',points:[Sh(t.tip),Sh(t.root)]});
 if(S.tongue){const R=S.tongue.rings;lines.push({view:'side',kind:'tongue',points:[...R.map(r=>Sh([r.x,r.top,0])),...R.slice().reverse().map(r=>Sh([r.x,r.bottom,0])),Sh([R[0].x,R[0].top,0])]});}
 return {lines,dots};
}
