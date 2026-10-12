// Independent cinematic sets, in native tile units; not campaign placements.
export const CRASH_CLEARING=Object.freeze({center:[9,0,3.5],radii:[19,12]});
export const SAM_POSITION=Object.freeze([240,0,-260]);
export const PLATEAU=Object.freeze({center:[-45,-79],radii:[96,76],tierHeight:2,tiers:2});
export const noise=n=>{const f=Math.sin(n*173.31+9.7)*43758.5453;return f-Math.floor(f);};
export function plateauContour(tier=0){
 return Array.from({length:160},(_,i)=>{const a=i/160*Math.PI*2,u=2.4*Math.sin(a*5)+1.6*Math.sin(a*9+.8),inset=tier*(1.65+.65*Math.sin(a*4)**2);return [PLATEAU.center[0]+(PLATEAU.radii[0]+u-inset)*Math.cos(a),PLATEAU.center[1]+(PLATEAU.radii[1]+u-inset)*Math.sin(a)];});
}
const contours=[plateauContour(0),plateauContour(1)];
function inside(x,z,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function crashGroundHeight(x,z){return inside(x,z,contours[1])?4:inside(x,z,contours[0])?2:0;}
function edgeDistance(x,z,points){let d=Infinity;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}return d;}
export function crashForest(){
 const patches=[[-45,-55,25,12],[-5,-45,24,16],[30,-42,16,15],[58,-21,25,18],[-35,13,18,12],[-12,26,16,10],[29,26,18,14],[53,8,16,16],[-63,-10,22,14],[-72,-82,25,24],[9,-85,28,20],[62,-71,24,20],[-75,43,20,17],[-22,-118,32,19],[62,47,24,18]];
 const out=[];
 for(let iz=0;iz<54;iz++)for(let ix=0;ix<60;ix++){
  const n=iz*60+ix,x=-126+ix*3.8+noise(n+17)*2.4,z=-135+iz*3.8+noise(n+91)*2.4;
  if(!patches.some(([cx,cz,rx,rz])=>((x-cx)/rx)**2+((z-cz)/rz)**2<.78+noise(n+33)*.35))continue;
  const scale=2.4+noise(n+19)*1.2,radius=scale*.90;
  // Crown-aware space for rotor/cabin sweep, exit and winding camera path.
  if(((x-9)/(19+radius))**2+((z-3.5)/(12+radius))**2<1)continue;
  if(x>-38&&x<22&&Math.abs(z-3.5)<8+radius)continue;
  if(z>6&&Math.abs(x-(9+.6*(z-3.5)))<7+radius)continue;
  if(contours.some(c=>edgeDistance(x,z,c)<radius*.7+.35))continue;
  out.push({x,z,y:crashGroundHeight(x,z),scale,kind:n%4===0?'tree-oak':'tree-pine',angle:n*2.399});
 }
 return out;
}
// The relay is a remote mission objective in the briefing, never a crash prop.
export function introSector(mode,time){
 if(mode==='missile')return 'workshop';
 if(mode==='handler'||mode==='sequence'&&time>=4&&time<9)return 'overseas';
 if(mode==='radar'||mode==='launch'||mode==='sequence'&&time>=12&&time<19.4)return 'sam';
 return 'crash';
}
