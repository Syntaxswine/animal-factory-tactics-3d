// The approved head sculpts of the twelve characters, copied verbatim from the tools that
// built them, with the placement each tool gave its skull after sculpting:
//   horse        dist/tactics/horse-grey-model.js (the 856k grey study; build-horse-light.mjs --10k)
//   bull, cow, goat, skunk, rabbit, donkey, sheep    tools/build-<species>-worker.mjs
//   dog          tools/build-dog-guard.mjs
//   pig-director, pig-foreman                        tools/build-pig-<role>.mjs
//   hen          tools/build-hen-worker.mjs (head, beak, wattles and comb are separate parts)
// The speaking heads are these fields, opened at the jaw (sculpt.mjs). Every vertex of a
// shipped author skull is a vertex of its sculpt here (tests/speaking-heads.test.mjs): if a
// character's head is changed, its speaking head fails that test until it is rebuilt.
// X faces forward, Y is up, Z is the character's left/right.
import * as THREE from '../../dist/tactics/vendor/three.module.js';
import {blend,ellipsoid as E,roundedBox as B,tapered as C} from '../../dist/tactics/grey-surface.js';
const smooth=THREE.MathUtils.smoothstep,clamp=THREE.MathUtils.clamp,abs=Math.abs,exp=Math.exp;
const edgeOf=k=>(...v)=>v.reduce((a,b)=>-blend(-a,-b,k));

// horse-grey-model.js head()
function horse(x,y,z){
 let d=C(x,y,z,[-.072,1.245,0],[-.058,1.424,0],.127,.098);
 d=blend(d,E(x,y,z,[-.025,1.465,0],[.113,.106,.104]),.043);
 d=blend(d,E(x,y,z,[-.017,1.410,0],[.105,.091,.121]),.035);
 d=blend(d,C(x,y,z,[.026,1.452,0],[.195,1.372,0],.078,.069),.036);
 d=blend(d,E(x,y,z,[.203,1.350,0],[.076,.049,.082]),.025);
 d=blend(d,C(x,y,z,[-.012,1.385,0],[.181,1.329,0],.060,.040),.025);
 for(const side of [-1,1]){
  d=blend(d,E(x,y,z,[-.062,1.567,side*.067],[.030,.085,.037]),.014);
  d=blend(d,E(x,y,z,[-.023,1.404,side*.072],[.059,.045,.044]),.026);
  d=blend(d,E(x,y,z,[.025,1.367,side*.036],[.088,.028,.030]),.038);
  d=Math.max(d,-E(x,y,z,[.059,1.477,side*.098],[.033,.019,.023]));
  d=blend(d,E(x,y,z,[.056,1.477,side*.070],[.026,.012,.017]),.003);
  d=blend(d,C(x,y,z,[.030,1.481,side*.072],[.061,1.493,side*.078],.007,.006),.005);
  d=blend(d,C(x,y,z,[.061,1.493,side*.078],[.086,1.478,side*.073],.006,.005),.005);
  d=blend(d,C(x,y,z,[.030,1.478,side*.072],[.063,1.462,side*.076],.005,.005),.004);
  d=blend(d,C(x,y,z,[.063,1.462,side*.076],[.086,1.478,side*.073],.005,.005),.004);
  d=Math.max(d,-E(x,y,z,[.250,1.370,side*.077],[.021,.015,.020]));
  d=Math.max(d,-E(x,y,z,[-.039,1.589,side*.069],[.018,.044,.023]));
 }
 d+=.004*exp(-(((x-.141)/.047)**2))*exp(-(((y-1.366)/.018)**2))*exp(-(((abs(z)-.069)/.025)**2));
 const lipY=1.329,lipMask=Math.max(0,Math.min(1,(x-.16)/.05));
 d+=.0025*exp(-(((y-lipY)/.006)**2))*lipMask;
 return d;
}

// build-bull-worker.mjs
const bullHorns=[-1,1].map(s=>new THREE.CubicBezierCurve3(new THREE.Vector3(-.044,1.528,s*.080),new THREE.Vector3(-.055,1.55,s*.125),new THREE.Vector3(-.024,1.62,s*.139),new THREE.Vector3(.002,1.646,s*.103)).getPoints(18).map(p=>p.toArray()));
function bull(x,y,z){
 let d=E(x,y,z,[-.069,1.286,0],[.112,.131,.107]);
 d=blend(d,E(x,y,z,[-.029,1.445,0],[.112,.108,.109]),.024);
 d=blend(d,E(x,y,z,[.008,1.383,0],[.105,.073,.106]),.021);
 d=blend(d,C(x,y,z,[.054,1.446,0],[.16,1.400,0],.071,.062),.018);
 d=blend(d,B(x,y,z,[.161,1.396,0],[.071,.041,.098],.027),.016);
 d=blend(d,E(x,y,z,[.130,1.366,0],[.084,.029,.082]),.008);
 for(const s of [-1,1]){
  d=blend(d,E(x,y-.12*(Math.abs(z)-.10),z,[-.069,1.463,s*.148],[.047,.044,.084]),.016);
  d=-blend(-d,E(x,y-.12*(Math.abs(z)-.10),z,[-.031,1.468,s*.165],[.030,.030,.054]),.007);
  d=blend(d,E(x,y,z,[.008,1.402,s*.088],[.059,.050,.029]),.016);
  d=blend(d,E(x,y,z,[.030,1.467,s*.082],[.044,.016,.024]),.023);
  d=-blend(-d,E(x,y,z,[.050,1.445,s*.110],[.036,.024,.024]),.006);
  d=blend(d,E(x,y,z,[.050,1.445,s*.091],[.032,.020,.023]),.007);
  d=-blend(-d,E(x,y,z,[.216,1.405,s*.067],[.023,.013,.018]),.004);
  const path=bullHorns[s<0?0:1];let horn=Infinity;for(let i=0;i<18;i++)horn=Math.min(horn,C(x,y,z,path[i],path[i+1],.027*(1-i/18)+.0035,.027*(1-(i+1)/18)+.0035));d=blend(d,horn,.012);
 }
 d+=.003*Math.exp(-(((y-1.371)/.004)**2))*THREE.MathUtils.smoothstep(x,.155,.21);
 return d;
}

// build-cow-worker.mjs
function cow(x,y,z){
 let d=E(x,y,z,[-.069,1.296,0],[.093,.131,.089]);
 d=blend(d,E(x,y,z,[-.029,1.476,0],[.100,.110,.098]),.024);
 d=blend(d,E(x,y,z,[.008,1.416,0],[.094,.073,.091]),.021);
 d=blend(d,C(x,y,z,[.047,1.467,0],[.155,1.421,0],.063,.053),.018);
 d=blend(d,E(x,y,z,[.157,1.420,0],[.069,.044,.083]),.016);
 d=blend(d,E(x,y,z,[.120,1.391,0],[.076,.029,.070]),.008);
 for(const s of [-1,1]){
  d=blend(d,E(x,y-.12*(Math.abs(z)-.10),z,[-.069,1.487,s*.148],[.047,.044,.084]),.016);
  d=-blend(-d,E(x,y-.12*(Math.abs(z)-.10),z,[-.013,1.492,s*.165],[.022,.030,.058]),.007);
  d=blend(d,E(x,y,z,[.008,1.427,s*.067],[.052,.046,.023]),.030);
  d=blend(d,E(x,y,z,[.034,1.460,s*.070],[.040,.030,.012]),.044);
  d=blend(d,E(x,y,z,[.032,1.484,s*.078],[.036,.012,.012]),.022);
  d=-blend(-d,E(x,y,z,[.205,1.430,s*.057],[.019,.011,.015]),.004);
 }
 d+=.003*Math.exp(-(((y-1.397)/.004)**2))*THREE.MathUtils.smoothstep(x,.155,.21);
 d=blend(d,E(x,y,z,[-.015,1.592,0],[.040,.020,.033]),.012);
 d=blend(d,C(x,y,z,[-.008,1.582,-.010],[.041,1.586,-.026],.026,.004),.010);
 d=blend(d,C(x,y,z,[-.025,1.583,.018],[.017,1.590,.033],.023,.004),.010);
 return d;
}

// build-goat-worker.mjs
const goatHorns=[-1,1].map(s=>new THREE.CubicBezierCurve3(new THREE.Vector3(-.040,1.55,s*.059),new THREE.Vector3(-.11,1.645,s*.073),new THREE.Vector3(-.22,1.625,s*.081),new THREE.Vector3(-.255,1.558,s*.085)).getPoints(20).map(p=>p.toArray()));
function goat(x,y,z){
 const f=1.38+(y-1.38)/1.25;
 let d=E(x,y,z,[-.056,1.302,0],[.085,.129,.080]);
 d=blend(d,E(x,f,z,[-.006,1.442,0],[.090,.088,.081]),.028);
 d=blend(d,E(x,f,z,[.018,1.394,0],[.080,.065,.085]),.018);
 d=blend(d,C(x,f,z,[.038,1.458,0],[.163,1.402,0],.057,.040),.017);
 d=blend(d,E(x,f,z,[.174,1.399,0],[.038,.029,.049]),.009);
 d=blend(d,C(x,f,z,[.009,1.368,0],[.149,1.364,0],.041,.030),.009);
 for(const s of [-1,1]){
  d=blend(d,E(x,f,z,[-.065,1.480,s*.117],[.041,.029,.073]),.015);
  d=Math.max(d,-E(x,f,z,[-.048,1.495,s*.126],[.030,.019,.049]));
  d=blend(d,E(x,f,z,[.011,1.404,s*.065],[.039,.036,.026]),.012);
  d=blend(d,E(x,f,z,[.040,1.458,s*.065],[.040,.013,.020]),.012);
  d=-blend(-d,E(x,f,z,[.048,1.445,s*.085],[.026,.014,.015]),.004);
  d=Math.max(d,-E(x,f,z,[.191,1.410,s*.039],[.014,.009,.013]));
  const path=goatHorns[s===-1?0:1];let horn=Infinity;for(let i=0;i<20;i++)horn=Math.min(horn,C(x,y,z,path[i],path[i+1],.033*(1-i/20)+.0015,.033*(1-(i+1)/20)+.0015));
  d=blend(d,horn,.012);
 }
 d+=.0035*Math.exp(-(((f-1.378)/.004)**2))*THREE.MathUtils.smoothstep(x,.105,.15);
 return d;
}

// build-skunk-worker.mjs
function skunk(x,y,z){
 let d=E(x,y,z,[-.057,1.302,0],[.083,.121,.080]);
 d=blend(d,E(x,y,z,[-.032,1.483,0],[.107,.126,.100]),.024);
 d=blend(d,E(x,y,z,[.009,1.402,0],[.082,.058,.087]),.019);
 d=blend(d,C(x,y,z,[.041,1.435,0],[.143,1.408,0],.057,.031),.016);
 d=blend(d,E(x,y,z,[.167,1.413,0],[.027,.022,.036]),.010);
 d=blend(d,E(x,y,z,[.091,1.386,0],[.070,.023,.047]),.009);
 for(const s of [-1,1]){
  d=blend(d,E(x,y,z,[-.050,1.600,s*.085],[.035,.048,.041]),.013);
  d=-blend(-d,E(x,y,z,[-.018,1.606,s*.090],[.022,.031,.026]),.005);
  d=blend(d,E(x,y,z,[.010,1.420,s*.073],[.052,.045,.035]),.017);
  d=blend(d,E(x,y,z,[.008,1.434,s*.078],[.059,.048,.032]),.020);
  d=blend(d,E(x,y,z,[.030,1.495,s*.073],[.044,.016,.024]),.023);
  d=-blend(-d,E(x,y,z,[.050,1.473,s*.101],[.036,.024,.024]),.006);
  d=blend(d,E(x,y,z,[.050,1.473,s*.082],[.032,.020,.023]),.007);
  d=blend(d,E(x,y,z,[-.055,1.431,s*.077],[.065,.059,.042]),.019);
 }
 return d;
}

// build-rabbit-worker.mjs
function rabbit(x,y,z){
 let d=E(x,y,z,[-.066,1.286,0],[.084,.123,.082]);
 d=blend(d,E(x,y,z,[-.027,1.429,0],[.106,.116,.118]),.023);
 d=blend(d,E(x,y,z,[.049,1.386,0],[.085,.061,.080]),.018);
 for(const side of [-1,1]){
  d=blend(d,E(x,y,z,[.042,1.397,side*.070],[.077,.058,.060]),.030);
  d=blend(d,E(x,y,z,[.081,1.390,side*.029],[.050,.034,.039]),.014);
  const yy=y-1.598,zz=side*z-.093-.30*yy,xx=x+.052+.09*yy;
  d=blend(d,E(xx,yy,zz,[0,0,0],[.028,.140,.054*(1-.18*yy/.14)]),.020);
 }
 d=blend(d,E(x,y,z,[.130,1.400,0],[.017,.015,.022]),.008);
 d=blend(d,E(x,y,z,[.089,1.362,0],[.043,.021,.041]),.010);
 return d;
}

// build-donkey-worker.mjs
function donkey(x,y,z){let d=E(x,y,z,[-.055,1.272,0],[.083,.113,.078]);
 d=blend(d,E(x,y,z,[-.040,1.371,0],[.099,.103,.087]),.027);
 d=blend(d,C(x,y,z,[.004,1.398,0],[.154,1.328,0],.070,.059),.021);
 d=blend(d,E(x,y,z,[.175,1.326,0],[.060,.048,.072]),.013);
 d=blend(d,C(x,y,z,[-.001,1.304,0],[.155,1.294,0],.060,.041),.019);
 for(const s of [-1,1]){d=blend(d,E(x,y,z,[-.007,1.343,s*.063],[.045,.044,.023]),.014);
 d=blend(d,E(x,y,z,[.017,1.410,s*.071],[.036,.014,.020]),.009);
 d=Math.max(d,-E(x,y,z,[.027,1.397,s*.087],[.026,.014,.016]));
 d=Math.max(d,-E(x,y,z,[.204,1.338,s*.052],[.019,.014,.014]));
 const t=(y-1.44)/.21,zz=z-s*(.061+.055*t),xx=x+.058+.025*t;
 const ear=E(xx,y,zz,[0,1.535,0],[.023,.117,.033]);d=blend(d,ear,.009);
 d=Math.max(d,-E(xx-.018,y,zz,[0,1.543,0],[.016,.089,.023]));
 }
 d+=.0024*Math.exp(-1*((y-1.302)/.004)**2)*smooth(x,.14,.19);return d;}

// build-sheep-worker.mjs
const sheepEdge=edgeOf(.007),wool=[];
for(let i=0;i<25;i++){const a=i*2.399963,up=.18+.82*(i+.5)/25,rad=Math.sqrt(1-up*up);wool.push([-.045+.101*rad*Math.cos(a),1.536+.073*up,.101*rad*Math.sin(a),.023+(i%4)*.002]);}
for(let i=0;i<34;i++){const a=i*2.399963,up=-.90+1.80*(i+.5)/34,rad=Math.sqrt(1-up*up);if(Math.cos(a)>.42&&up>-.20)continue;wool.push([-.059+.108*rad*Math.cos(a),1.398+.144*up,.119*rad*Math.sin(a),.027+(i%3)*.003]);}
function sheep(x,y,z){
 let d=blend(E(x,y,z,[-.05,1.36,0],[.116,.117,.123]),E(x,y,z,[-.026,1.485,0],[.117,.130,.105]),.025);
 d=blend(d,E(x,y,z,[.039,1.411,0],[.102,.077,.098]),.025);
 d=blend(d,C(x,y,z,[.050,1.483,0],[.131,1.403,0],.060,.050),.020);
 d=blend(d,E(x,y,z,[.145,1.395,0],[.044,.034,.059]),.014);
 d=blend(d,E(x,y,z,[.099,1.365,0],[.067,.030,.068]),.018);
 for(const side of [-1,1]){
  d=blend(d,E(x,y,z,[.043,1.441,side*.080],[.044,.042,.029]),.013);
  d=blend(d,E(x,y,z,[.050,1.484,side*.086],[.044,.031,.018]),.031);
  const zz=z*side,t=clamp((zz-.095)/.18,0,1),centerY=1.516-.070*t+.006*Math.sin(t*Math.PI),centerX=-.025-.108*t+.020*t*t+.012*((y-centerY)/.05)**2*t;
  const width=.008+.050*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.7);
  const leaf=sheepEdge(abs(y-centerY)-width,.095-zz,zz-.275,abs(x-centerX)-(.010+.013*Math.sin(Math.PI*t)));
  d=blend(d,leaf,.016);
  d=blend(d,E(x,y,z,[-.037,1.501,side*.111],[.032,.038,.042]),.014);
 }
 d=blend(d,E(x,y,z,[-.046,1.556,0],[.112,.089,.109]),.012);
 d=blend(d,E(x,y,z,[-.072,1.418,0],[.122,.178,.131]),.018);
 for(const [xx,yy,zz,r]of wool)d=blend(d,E(x,y,z,[xx,yy,zz],[r,r*.85,r]),.019);
 return d;
}

// build-dog-guard.mjs
function dog(x,y,z){
 let d=E(x,y,z,[-.067,1.296,0],[.092,.138,.090]);
 d=blend(d,E(x,y,z,[-.031,1.447,0],[.102,.113,.100]),.026);
 d=blend(d,E(x,y,z,[-.015,1.396,0],[.094,.076,.112]),.025);
 d=blend(d,C(x,y,z,[.032,1.443,0],[.177,1.404,0],.061,.044),.024);
 d=blend(d,E(x,y,z,[.182,1.408,0],[.037,.026,.046]),.012);
 d=blend(d,E(x,y,z,[.110,1.376,0],[.087,.029,.057]),.018);
 for(const side of [-1,1]){
  const t=THREE.MathUtils.clamp((y-1.50)/.20,0,1),zz=z-side*(.076+.035*t),xx=x+.057+.015*t;
  const ear=E(xx,y,zz,[0,1.588,0],[.027*(1-.65*t),.110,.069*(1-.75*t)]);
  d=blend(d,ear,.025);
  d=blend(d,C(x,y,z,[-.045,1.420,side*.078],[-.093,1.355,side*.102],.049,.017),.023);
 }
 d+=.0025*Math.exp(-1*((y-1.385)/.004)**2)*smooth(x,.12,.19);
 return d;
}

// build-pig-director.mjs and build-pig-foreman.mjs (each has its own ear outline)
const pigEdge=edgeOf(.008);
function polygon(u,v,points){let distance=Infinity,inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=THREE.MathUtils.clamp(((u-a[0])*dx+(v-a[1])*dy)/(dx*dx+dy*dy),0,1);distance=Math.min(distance,Math.hypot(u-a[0]-t*dx,v-a[1]-t*dy));if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return distance*(inside?-1:1);}
const outline=points=>new THREE.CatmullRomCurve3(points.map(([z,y])=>new THREE.Vector3(z,y,0)),true,'centripetal').getPoints(64).slice(0,-1).map(p=>[p.x,p.y]);
const directorEarOutline=outline([
 [.105,1.587],[.145,1.595],[.183,1.550],[.225,1.475],
 [.255,1.461],[.239,1.426],[.205,1.372],[.170,1.393],
 [.145,1.515],[.112,1.537]
]);
const foremanEarOutline=outline([
 [.105,1.522],[.145,1.535],[.183,1.500],[.225,1.475],
 [.255,1.461],[.239,1.426],[.205,1.389],[.170,1.408],
 [.145,1.468],[.112,1.481]
]);
function directorEar(x,y,z){
 y-=.040;z/=1.25;
 const spread=THREE.MathUtils.smoothstep(z,.13,.25),drop=THREE.MathUtils.smoothstep(1.505-y,0,.090);
 const centerX=-.020-.110*spread-.020*drop+.018*spread*spread*spread;
 const outline=polygon(z,y,directorEarOutline),thickness=.016+.007*(1-spread);
 return pigEdge(outline,abs(x-centerX)-thickness);
}
function pigDirector(x,y,z){
 let d=E(x,y,z,[-.045,1.327,0],[.148,.102,.168]);
 d=blend(d,E(x,y,z,[-.018,1.482,0],[.174,.168,.195]),.033);
 d=blend(d,E(x,y,z,[.040,1.377,0],[.173,.102,.173]),.033);
 d=blend(d,E(x,y,z,[.100,1.343,0],[.103,.058,.133]),.025);
 d=blend(d,C(x,y,z,[.090,1.472,0],[.195,1.492,0],.080,.063),.027);
 d=blend(d,E(x,y,z,[.226,1.501,0],[.031,.054,.075]),.012);
 d=blend(d,E(x,y,z,[.133,1.421,0],[.082,.029,.080]),.012);
 for(const side of [-1,1]){
  d=blend(d,E(x,y,z,[.047,1.439,side*.120],[.083,.072,.060]),.027);
  d=blend(d,E(x,y,z,[.068,1.545,side*.119],[.048,.016,.033]),.017);
  d=-blend(-d,E(x,y,z,[.098,1.531,side*.149],[.033,.016,.023]),.004);
  d=blend(d,E(x,y,z,[.093,1.530,side*.131],[.026,.011,.020]),.005);
  d=-blend(-d,E(x,y,z,[.254,1.508,side*.034],[.024,.023,.014]),.003);
  d=blend(d,directorEar(x,y,z*side),.009);
 }
 return d;
}
function foremanEar(x,y,z){
 const spread=THREE.MathUtils.smoothstep(z,.13,.25),drop=THREE.MathUtils.smoothstep(1.505-y,0,.090);
 const centerX=-.020-.110*spread-.020*drop+.018*spread*spread*spread;
 const outline=polygon(z,y,foremanEarOutline),thickness=.016+.007*(1-spread);
 return pigEdge(outline,abs(x-centerX)-thickness);
}
function pigForeman(x,y,z){
 let d=E(x,y,z,[-.048,1.292,0],[.138,.107,.153]);
 d=blend(d,E(x,y,z,[-.022,1.431,0],[.141,.141,.151]),.030);
 d=blend(d,E(x,y,z,[.029,1.355,0],[.132,.071,.134]),.031);
 d=blend(d,C(x,y,z,[.067,1.430,0],[.175,1.423,0],.071,.058),.028);
 d=blend(d,E(x,y,z,[.205,1.425,0],[.030,.050,.068]),.012);
 d=blend(d,E(x,y,z,[.123,1.372,0],[.079,.026,.075]),.011);
 for(const s of [-1,1]){
  d=blend(d,E(x,y,z,[.027,1.399,s*.098],[.070,.056,.050]),.024);
  d=blend(d,E(x,y,z,[.061,1.485,s*.099],[.051,.020,.035]),.020);
  d=-blend(-d,E(x,y,z,[.088,1.468,s*.125],[.033,.018,.022]),.004);
  d=blend(d,E(x,y,z,[.083,1.466,s*.109],[.027,.013,.020]),.005);
  d=-blend(-d,E(x,y,z,[.231,1.432,s*.031],[.024,.022,.013]),.003);
  d=blend(d,foremanEar(x,y,z*s),.009);
 }
 d+=.0025*exp(-1*((y-1.376)/.007)**2)*THREE.MathUtils.smoothstep(x,.13,.20);
 return d;
}

// build-hen-worker.mjs: the head part and, separately, the beak.
const henEdge=edgeOf(.004);
function henHead(x,y,z){let d=blend(E(x,y,z,[-.024,1.266,0],[.148,.225,.160]),E(x,y,z,[.005,1.469,0],[.128,.121,.120]),.045);
 d=blend(d,E(x,y,z,[.073,1.405,0],[.097,.102,.103]),.030);
 for(const s of [-1,1]){d=blend(d,E(x,y,z,[.064,1.476,s*.097],[.041,.036,.025]),.018);d=blend(d,E(x,y,z,[.060,1.508,s*.099],[.044,.007,.023]),.013);}
 for(let i=0;i<5;i++){const yy=1.20+i*.048;d=blend(d,E(x,y,z,[-.139,yy,0],[.040,.065,.093-i*.007]),.013);}
 return d;
}
function henBeak(x,y,z){const t=clamp((x-.10)/.145,0,1),center=1.445-.036*t*t,rz=.056*Math.sqrt(1-.94*t*t),ry=.037*(1-.80*t);
 let d=henEdge((Math.hypot(z/rz,(y-center)/ry)-1)*Math.min(rz,ry),.105-x,x-.246);
 d=blend(d,E(x,y,z,[.238,1.403,0],[.015,.018,.015]),.007);
 d=blend(d,E(x,y,z,[.160,1.399,0],[.066,.017,.043]),.004);
 d=blend(d,E(x,y,z,[.115,1.425,0],[.024,.033,.042]),.006);
 return d;
}

// The beak's two mandibles, as henBeak() builds them: the lower mandible is its flattened
// ellipsoid, the upper everything else (tube, hooked tip, cere). The gape is the surface
// between them, a signed distance positive toward the upper mandible.
function henUpper(x,y,z){const t=clamp((x-.10)/.145,0,1),center=1.445-.036*t*t,rz=.056*Math.sqrt(1-.94*t*t),ry=.037*(1-.80*t);
 let d=henEdge((Math.hypot(z/rz,(y-center)/ry)-1)*Math.min(rz,ry),.105-x,x-.246);
 d=blend(d,E(x,y,z,[.238,1.403,0],[.015,.018,.015]),.007);
 return blend(d,E(x,y,z,[.115,1.425,0],[.024,.033,.042]),.006);
}
const henLower=(x,y,z)=>E(x,y,z,[.160,1.399,0],[.066,.017,.043]);
export const henGape=(x,y,z)=>(henLower(x,y,z)-henUpper(x,y,z))/2;

// build-hen-worker.mjs scales every part together to 1.65 tall, from the feet's lowest point
// to the comb's highest. The comb and one foot are copied to measure those two points.
function henComb(x,y,z){let d=E(x,y,z,[-.025,1.567,0],[.145,.042,.033]);
 for(const [xx,yy,rx,ry]of [[-.141,1.570,.037,.036],[-.111,1.606,.033,.039],[-.066,1.628,.027,.046],[-.018,1.645,.026,.048],[.027,1.622,.027,.046],[.066,1.591,.027,.043]])d=blend(d,E(x,y,z,[xx,yy,0],[rx,ry,.024]),.009);
 return d;
}
const henFootSide=1,henFootZ=henFootSide*.161;
function henFoot(x,y,z){const s=henFootSide,zz=henFootZ;let d=C(x,y,z,[-.022,.336,zz],[-.014,.090,zz],.037,.029);d=blend(d,E(x,y,z,[.001,.065,zz],[.060,.045,.053]),.018);
 const toes=[[.203,.023,zz],[.153,.024,zz+.118],[.153,.024,zz-.102],[-.127,.025,zz+s*.045]];
 for(const end of toes){const rear=end[0]<0,mid=[end[0]*.48,.038,zz+(end[2]-zz)*.54];d=blend(d,C(x,y,z,[.004,.063,zz],mid,.026,.021),.007);d=blend(d,C(x,y,z,mid,end,.021,.013),.005);const nail=[end[0]+(rear?-.019:.019),.029,end[2]];d=blend(d,C(x,y,z,end,nail,.014,.011),.004);d=blend(d,C(x,y,z,nail,[end[0]+(rear?-.034:.034),.006,end[2]],.011,.003),.003);}
 return Math.max(d,.009-y);
}
export const HEN_EXTREMES={comb:{field:henComb,min:[-.20,1.50,-.050],max:[.14,1.71,.050],step:.0035},foot:{field:henFoot,min:[-.18,-.01,henFootZ-.145],max:[.25,.38,henFootZ+.16],step:.0035}};

// Where each tool put its skull after sculpting. `top` is the sculpt's own highest point.
// Each sculpt's own highest point (`top`, as sculptSurface finds it at the tool's box and step)
// is frozen here, so placing a point needs no sculpting; tools/speaking-heads/place.mjs
// measureTop() re-measures it, and the build refuses to run if it has changed.
const lift=(to,top)=>({kind:'lift',to,top,map:([x,y,z])=>[x,y+to-top,z]});
const cowPlace=top=>({kind:'cow',top,meshNormals:true,map:([x,y,z])=>{const neck=1-smooth(y,1.34,1.40),face=smooth(y,1.32,1.39),s=1+.10*face-.10*neck;return [-.04+(x+.04)*s,y+1.60-top,z*s];}});
const directorPlace=top=>({kind:'director',top,meshNormals:true,map:([x,y,z])=>[x,1.28+(y-1.28)*(1.65-1.28)/(top-1.28),z]});
// The grey horse was scaled with its body to 1.65 tall (horse-grey-model.js); the hen likewise,
// from its feet's lowest point to its comb's highest (build-hen-worker.mjs).
const greyHorse={kind:'grey-horse',scale:0.9989431320935266,lift:1.34775874292837e-12};
const henPlace={kind:'hen',top:1.6927851438522339,bottom:0.008999999612569809};
const none={kind:'none',map:p=>p};

// Each character's skull part, its 10k data, the sculpt's box and step, and the two reductions
// its tool made (author, then 10k). `targets` are triangle counts, `tolerance` world units.
export const HEADS=[
 {id:'horse',file:'horse-10k-data.json',part:'unified skull jaw neck and ears',field:horse,min:[-.23,1.11,-.155],max:[.315,1.68,.155],step:.0045,place:greyHorse,author:{target:6500,tolerance:.0025},low:{target:2500,tolerance:.008}},
 {id:'goat',file:'goat-10k-data.json',part:'unified goat skull ears and swept horns',field:goat,min:[-.39,1.11,-.20],max:[.25,1.70,.20],step:.0055,place:lift(1.65,1.634281039237976),author:{target:7800,tolerance:.006},low:{target:2800,tolerance:.015}},
 {id:'bull',file:'bull-10k-data.json',part:'unified bull skull ears and short horns',field:bull,min:[-.23,1.10,-.26],max:[.27,1.70,.26],step:.0055,place:lift(1.65,1.648288369178772),author:{target:7800,tolerance:.006},low:{target:2720,tolerance:.015}},
 {id:'cow',file:'cow-10k-data.json',part:'unified cow skull ears and forehead tuft',field:cow,min:[-.23,1.10,-.26],max:[.27,1.70,.26],step:.0055,place:cowPlace(1.6124861240386963),author:{target:7140,tolerance:.006},low:{target:2460,tolerance:.015}},
 {id:'donkey',file:'donkey-10k-data.json',part:'unified donkey skull muzzle and long ears',field:donkey,min:[-.19,1.12,-.16],max:[.26,1.68,.16],step:.0045,place:none,revision:'donkey-neck',author:{target:7000,tolerance:.006},low:{target:2600,tolerance:.015}},
 {id:'sheep',file:'sheep-10k-data.json',part:'unified sheep skull ears and wool',field:sheep,min:[-.22,1.16,-.30],max:[.23,1.70,.30],step:.0045,place:lift(1.65,1.6449997425079346),author:{target:7800,tolerance:.006},low:{target:2600,tolerance:.015}},
 {id:'skunk',file:'skunk-10k-data.json',part:'unified skunk skull rounded ears and muzzle',field:skunk,min:[-.19,1.15,-.16],max:[.22,1.69,.16],step:.0055,place:lift(1.65,1.647897720336914),author:{target:4500,tolerance:.006},low:{target:2000,tolerance:.008}},
 {id:'pig-foreman',file:'pig-foreman-10k-data.json',part:'unified pig skull folded ears and snout',field:pigForeman,min:[-.22,1.14,-.28],max:[.27,1.60,.28],step:.0045,place:none,earNormals:true,author:{target:5300,tolerance:.006},low:{target:2050,tolerance:.008}},
 {id:'pig-director',file:'pig-director-10k-data.json',part:'unified director skull folded ears and snout',field:pigDirector,min:[-.24,1.17,-.35],max:[.30,1.68,.35],step:.0045,place:directorPlace(1.6499963998794556),earNormals:true,author:{target:6100,tolerance:.006},low:{target:2150,tolerance:.008}},
 {id:'rabbit',file:'rabbit-10k-data.json',part:'unified rabbit skull and leaf ears',field:rabbit,min:[-.20,1.10,-.23],max:[.20,1.78,.23],step:.0045,place:none,author:{target:7200,tolerance:.006},low:{target:2490,tolerance:.015}},
 {id:'dog',file:'dog-guard-10k-data.json',part:'unified dog skull and upright ears',field:dog,min:[-.23,1.10,-.21],max:[.24,1.73,.21],step:.0045,place:none,author:{target:5950,tolerance:.006},low:{target:2250,tolerance:.015}},
 {id:'hen',file:'hen-10k-data.json',part:'short hooked beak',field:henBeak,min:[.08,1.38,-.074],max:[.30,1.49,.074],step:.0025,place:henPlace,head:{part:'head and feathered neck',field:henHead,min:[-.205,1.035,-.19],max:[.192,1.605,.19],step:.0045},author:{target:1500*.97,tolerance:.012},low:{target:650,tolerance:.0045}}
];
export const HEAD=Object.fromEntries(HEADS.map(h=>[h.id,h]));

// Each character's registered paint sheet (four 0.925 x 1.85 views unless the frame says
// otherwise) and how a placed point finds itself on it: the donkey was painted before its neck
// was lengthened (so in sculpt space); the skunk's painting sits 33 px of 887 high on its sheet
// (horse-model-paint.js: colorUV.y += 33/887).
const lowpoly='dist/assets/characters/lowpoly-proof/',F0={width:.925,height:1.85,centerY:.825};
export const PAINT={
 horse:{sheet:lowpoly+'horse-worker-model-paint-v1.png',frame:F0},
 goat:{sheet:lowpoly+'goat-worker-model-paint-v1.png',frame:F0},
 bull:{sheet:lowpoly+'bull-worker-model-paint-v2.png',frame:F0},
 cow:{sheet:lowpoly+'cow-woman-model-paint-v1.png',frame:F0},
 donkey:{sheet:lowpoly+'donkey-worker-model-paint-v1.png',frame:F0,space:'sculpt'},
 sheep:{sheet:lowpoly+'sheep-worker-model-paint-v1.png',frame:F0},
 skunk:{sheet:lowpoly+'skunk-worker-model-paint-v1.png',frame:{width:1.40,height:2.80,centerY:.825},lift:33/887*2.80},
 'pig-foreman':{sheet:lowpoly+'pig-foreman-model-paint-v1.png',frame:F0},
 'pig-director':{sheet:lowpoly+'pig-director-model-paint-v1.png',frame:{width:1.16,height:2.32,centerY:.825}},
 rabbit:{sheet:lowpoly+'rabbit-woman-model-paint-v1.png',frame:{width:.975,height:1.95,centerY:.875}},
 dog:{sheet:lowpoly+'dog-woman-model-paint-v1.png',frame:{width:.975,height:1.95,centerY:.875}},
 hen:{sheet:lowpoly+'hen-model-paint-v1.png',frame:{width:1.16,height:2.32,centerY:.825}}
};

// The donkey's tool lengthened the neck after reducing (build-donkey-worker.mjs neckRevision):
// the skull and mane rise .11 above 1.18-1.30 and the throat tapers. Positions take the
// revision; the registered paint keeps the unrevised positions (paintPosition).
export function donkeyNeck([x,y,z]){
 const throat=smooth(y,1.19,1.25)*(1-smooth(y,1.27,1.33))*(1-smooth(x,.015,.09));
 return [-.055+(x+.055)*(1-.16*throat),y+.11*smooth(y,1.18,1.30),z*(1-.20*throat)];
}
