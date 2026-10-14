// The mouth plan of one character, as lines on its registered paint sheet (sheet units: the
// sheet's own model units, x forward, y up, z across): the lip line in profile and from the
// front, where the mouth ends, the jaw joint, how far the jaw's weight reaches, the cavity,
// the teeth and the tongue. It is what the reference sheets draw over the painted face.
import {PAINT} from './heads.mjs';
import {mouthGeometry} from './sculpt.mjs';

export function sheetPoint(head,place,p){
 const P=PAINT[head.id],q=P.space==='sculpt'?p.slice():place.map(p);
 if(P.lift)q[1]+=P.lift;
 return q;
}
// The head's surface along a ray from outside (sculpt space), by bisection on its field.
function surface(field,from,dir,far=.5){let lo=0,hi=far;if(field(...from)<0)return null;
 let t=0;for(;t<far;t+=.002)if(field(from[0]+dir[0]*t,from[1]+dir[1]*t,from[2]+dir[2]*t)<0)break;if(t>=far)return null;lo=t-.002;hi=t;
 for(let i=0;i<30;i++){const m=(lo+hi)/2;if(field(from[0]+dir[0]*m,from[1]+dir[1]*m,from[2]+dir[2]*m)<0)hi=m;else lo=m;}
 return from.map((v,k)=>v+dir[k]*hi);}

export function mouthPlan(head,M,place){
 const G=mouthGeometry(M),S=p=>sheetPoint(head,place,p),f=head.field;
 const lines=[],dots=[];
 // The lip line where it meets the face, seen from the side and from the front.
 const profile=[],front=[];
 for(let x=M.corner.x;x<=M.lip.x+.12;x+=.002){const y=G.lipY(x,0);const hit=surface(f,[x,y,.3],[0,0,-1]);if(hit)profile.push(S(hit));}
 for(let z=-.2;z<=.2;z+=.002){if(G.tear(M.lip.x,z)<=0&&Math.abs(z)>M.corner.z)continue;const y=G.lipY(M.lip.x,z),hit=surface(f,[.5,y,z],[-1,0,0]);if(hit&&G.tear(hit[0],z)>0)front.push(S(hit));}
 lines.push({view:'side',kind:'lip',points:profile},{view:'front',kind:'lip',points:front});
 dots.push({view:'side',kind:'hinge',point:S([M.hinge[0],M.hinge[1],0])});
 dots.push({view:'side',kind:'corner',point:S([M.corner.x,G.lipY(M.corner.x,0),0])});
 const a=M.throat.angle*Math.PI/180,under=[];for(let r=.0;r<=.35;r+=.01)under.push(S([M.hinge[0]+r*Math.cos(a),M.hinge[1]+r*Math.sin(a),0]));
 lines.push({view:'side',kind:'under',points:under});
 const back=[];for(let y=M.hinge[1]-.2;y<=M.lip.y+.04;y+=.005)back.push(S([M.back.x,y,0]));
 lines.push({view:'side',kind:'back',points:back});
 // The cavity's outline at the middle: from its back to where it stops `wall` inside the face.
 const c=M.cavity,G2=mouthGeometry(M,f);let xf=c.back;for(let x=c.back;x<=M.lip.x+.1;x+=.001)if(G2.cavity(x,G.lipY(x,0),0)<0)xf=x;
 const cav=[[c.back,c.roof],[xf,c.roof],[xf,-c.floor],[c.back,-c.floor],[c.back,c.roof]].map(([x,dy])=>S([x,G.lipY(x,0)+(c.lift||0)+dy,0]));
 lines.push({view:'side',kind:'cavity',points:cav});
 for(const row of M.teeth||[]){const up=row.jaw==='upper';for(let i=0;i<row.count;i++){const u=row.count===1?0:(i/(row.count-1))*2-1,z=u*row.half,x=row.x-row.arch*u*u,tip=G.lipY(x,z)+(up?-row.tip:row.tip),root=tip+(up?row.length:-row.length);
  lines.push({view:'side',kind:'tooth',points:[S([x,tip,z]),S([x,root,z])]},{view:'front',kind:'tooth',points:[S([x,tip,z]),S([x,root,z])]});}}
 if(M.tongue){const T=M.tongue,top=x=>G.lipY(x,0)-T.drop;lines.push({view:'side',kind:'tongue',points:[[T.back,0],[T.tip,0],[T.tip,-T.thick],[T.back,-T.thick],[T.back,0]].map(([x,dy])=>S([x,top(x)+dy,0]))});}
 return {lines,dots};
}
