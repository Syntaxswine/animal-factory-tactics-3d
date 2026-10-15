// The animated proof's motion in the crash sector's tile coordinates (x, y, and
// height h above level 0). Pure: shared by the sprite bake (which reads the
// art-directed pitch) and the player. Event times follow the 3D study
// (intro-timeline.js INTRO_EVENTS): hit 20.5 s, contact 26 s, rotor strike
// 28.25 s, settled 30 s, door 30.6 s.
export const PROOF_START=20.2,PROOF_END=35;
export const EVENTS=Object.freeze({hit:20.5,contact:26,rotorStrike:28.25,settled:30,door:30.6});
// The close-up of the drop past the cliff (closeup.js) cuts in after the hit
// and back out to the wide A framing. The user, 2026-10-12: "a prior shot ...
// where its zoomed in to show the scale and detail of the cliff."
export const CLOSEUP=Object.freeze({start:21.2,end:23.6});
export const KEYFRAME_TIMES=Object.freeze({0:22.4,A:23.75,B:26.6,C:34.7});
// The user's circled clearing; the wreck comes to rest at its centre.
export const REST=Object.freeze([205.5,104]);

const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
export const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function hermite(keys,t){
 if(t<=keys[0][0])return keys[0][1].slice();
 for(let i=0;i<keys.length-1;i++){const [t0,p0,v0]=keys[i],[t1,p1,v1]=keys[i+1];if(t>t1)continue;
  const dt=t1-t0,u=(t-t0)/dt,u2=u*u,u3=u2*u,h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2;
  return p0.map((_,k)=>h00*p0[k]+h10*dt*v0[k]+h01*p1[k]+h11*dt*v1[k]);}
 return keys.at(-1)[1].slice();
}
// After contact the slide copies the study's own profile (x 7 -> 8.4 -> 9 over
// 26 -> 27 -> 29 s, intro-timeline.js) at 1.5x length, ending on REST.
const SLIDE=[[26,[7],[2]],[27,[8.4],[.8]],[29,[9],[0]]],SLIDE_SCALE=1.5;
const slideX=t=>REST[0]+SLIDE_SCALE*(hermite(SLIDE,Math.min(t,29))[0]-9);
export const TOUCHDOWN=Object.freeze([slideX(26),REST[1]]);
// Hit over the plateau, across the rim at ~22 s, a steepening drop toward the
// clearing, a flare that kills most of the sink and speed, contact at 26 s.
const FLIGHT=[
 [20.2,[168.4,100.8,19.8],[6.0,.35,-.6]],
 [20.5,[170.2,100.9,19.6],[6.0,.35,-1.0]],
 [22.0,[179.2,101.6,15.4],[6.6,.5,-3.6]],
 [23.4,[188.4,102.5,9.6],[6.3,.55,-4.6]],
 [24.5,[195.3,103.2,4.6],[5.4,.5,-4.2]],
 [25.4,[199.8,103.7,1.4],[4.4,.35,-2.6]],
 [26.0,[TOUCHDOWN[0],TOUCHDOWN[1],0],[SLIDE_SCALE*2,0,-2.2]],
];
// The approach, 0 to 20.2 s (storyboard shots 01-06): one smooth heading and
// speed profile, integrated back from FLIGHT's first key so it meets the proof's
// path in place, direction and speed (19.4-21.5 s is one shot). In over the
// southern lowland, across the plateau's south rim at about 1.8 s, north-east
// over the plateau, then an easy right turn from 9 s onto the hit line.
// Heading: rad, 0 = +x, positive toward -y (north). Wide-shot heights, like
// FLIGHT; the perspective shots lift them by PERSPECTIVE_LIFT.
const AP=Object.freeze({heading:55*Math.PI/180,turn:9,speed:10.5,slow:10});
const AP_END=Math.atan2(-FLIGHT[0][2][1],FLIGHT[0][2][0]),AP_V=Math.hypot(FLIGHT[0][2][0],FLIGHT[0][2][1]);
export const approachHeading=t=>AP.heading+(AP_END-AP.heading)*smooth(AP.turn,PROOF_START,t);
const apSpeed=t=>AP.speed+(AP_V-AP.speed)*smooth(AP.slow,PROOF_START,t);
const AP_DT=.005,AP_XY=(()=>{const n=Math.round(PROOF_START/AP_DT),out=new Float64Array(2*n+2);let x=FLIGHT[0][1][0],y=FLIGHT[0][1][1];
 for(let i=n;i>=0;i--){out[2*i]=x;out[2*i+1]=y;const t=i*AP_DT,s=apSpeed(t),p=approachHeading(t);x-=s*Math.cos(p)*AP_DT;y+=s*Math.sin(p)*AP_DT;}return out;})();
const AP_H=[[0,[18.5],[.4]],[8,[20.4],[.1]],[16,[20.6],[-.1]],[PROOF_START,[FLIGHT[0][1][2]],[FLIGHT[0][2][2]]]];
export function approachPath(t){t=clamp(t,0,PROOF_START);const u=t/AP_DT,i=Math.min(Math.floor(u),AP_XY.length/2-2),f=u-i;
 return {x:mix(AP_XY[2*i],AP_XY[2*i+2],f),y:mix(AP_XY[2*i+1],AP_XY[2*i+3],f),h:hermite(AP_H,t)[0]};}
// The perspective shots stretch the cliff 4x where the wide shots stretch it
// 2.4x (crash-sector.js HEIGHT_SCALE): lifting the path by the difference in
// the summit's height keeps the aircraft's clearance over the plateau the same.
export const PERSPECTIVE_LIFT=+(2*2.12*(4-2.4)).toFixed(3);
// Attitude in flight: banked into the turn (atan(v * turn rate / g), g = 9.8
// tiles/s^2 at about 2 m a tile, positive = right side down) and the nose a
// little down for cruise, easing level by the hit line (artPitch is 0 there).
export function approachAttitude(t){
 const e=.05,rate=(approachHeading(t+e)-approachHeading(t-e))/(2*e);
 return {yaw:approachHeading(t),pitch:-.07*(1-smooth(17,PROOF_START,t)),roll:-Math.atan(apSpeed(t)*rate/9.8)};
}
// Height h is the lowest skid rail above level 0 (the bake plants the rails on
// the sprite's ground plane, so h = 0 means the skids touch flat ground).
export function heliPath(t){
 if(t<EVENTS.contact){const [x,y,h]=hermite(FLIGHT,t);return {x,y,h:Math.max(0,h)};}
 return {x:slideX(t),y:REST[1],h:0};
}
// Art-directed pitch (+ = nose up, rad): the study's curve (-0.27 fall,
// +0.14 flare) pushed to -0.40 / +0.16 so the drop reads at game scale.
export function artPitch(t){const fall=smooth(20.5,22.8,t),flare=smooth(24.0,25.65,t),contact=smooth(26,27,t);return mix(-.40*fall,.16,flare)*(1-contact);}

// Camera: tile width w (2:1 diamond px), focus tile point F lands on screen S.
// Starts above the rim; the close-up cuts in at CLOSEUP.start; the wide comes
// back on the A framing and eases down into the locked crash framing shared
// by keyframes B and C.
const CAMERA=[
 [20.2,{w:30,F:[175,101.1,16.5],S:[820,330]}],
 [23.6,{w:30,F:[188,102.5,9],S:[820,330]}],
 [25.9,{w:52,F:[204,104,0],S:[790,640]}],
];
export function cameraAt(t){
 if(t<=CAMERA[0][0])return CAMERA[0][1];
 for(let i=0;i<CAMERA.length-1;i++){const [t0,a]=CAMERA[i],[t1,b]=CAMERA[i+1];if(t>t1)continue;const u=smooth(t0,t1,t);
  // Interpolate the zoom in log space so the move reads as one steady push in.
  const w=Math.exp(mix(Math.log(a.w),Math.log(b.w),u));return {w,F:a.F.map((v,k)=>mix(v,b.F[k],u)),S:a.S.map((v,k)=>mix(v,b.S[k],u))};}
 return CAMERA.at(-1)[1];
}
