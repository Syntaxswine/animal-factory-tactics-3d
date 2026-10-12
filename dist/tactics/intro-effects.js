import * as T from './vendor/three.module.js';
import {paintedFireMaterial} from './painted-fire-effects.js';
import {missileState,missileTrail,tailHitPoint,aircraftState,aircraftPoint,smooth} from './intro-timeline.js';
const V=(...a)=>new T.Vector3(...a);

// Every particle is sampled from its birth time. Seeking/replaying never
// accumulates particles or drags an already-emitted puff along with its source.
export function createIntroEffects(smokeTexture,flameTexture){
 const root=new T.Group(),geometry=new T.PlaneGeometry(1,1),cards=[];let disposed=false;
 function card(name,kind='smoke'){const m=new T.Mesh(geometry,paintedFireMaterial(kind==='fire'?flameTexture:smokeTexture,{smoke:kind==='black',seed:cards.length*.731}));m.name=name;m.frustumCulled=false;
  if(kind==='dust'||kind==='smoke'){m.material.fragmentShader=m.material.fragmentShader.replace('c.a*=opacity;',`c.rgb=${kind==='dust'?'vec3(.42,.34,.21)':'mix(vec3(.40,.42,.38),vec3(.85,.84,.77),c.r)'};c.a*=opacity;`);}
  root.add(m);cards.push(m);return m;}
 const wakes=[0,1].map(n=>Array.from({length:66},(_,i)=>card('Missile '+n+' wake '+i))),exhausts=[0,1].map(i=>card('Motor flare '+i,'fire'));
 const flash=Array.from({length:6},(_,i)=>card('Tail impact '+i,'fire')),smoke=Array.from({length:32},(_,i)=>card('Tail damage smoke '+i,'black')),dust=Array.from({length:28},(_,i)=>card('Skid impact dust '+i,'dust'));
 function show(m,p,w,h,alpha,camera,time,roll=0){m.visible=alpha>.005;m.position.copy(p);m.scale.set(w,h,1);m.quaternion.copy(camera.quaternion);m.rotateZ(roll);m.material.uniforms.opacity.value=alpha;m.material.uniforms.clock.value=time;}
 function update(time,camera,{visible=true}={}){if(disposed)return;root.visible=visible;for(const c of cards)c.visible=false;if(!visible)return;
  for(let j=0;j<2;j++){for(const [i,s]of missileTrail(time,j).entries()){if(i>=wakes[j].length)break;show(wakes[j][i],s.position,s.size,s.size*1.05,s.opacity,camera,time,.2*Math.sin(s.id));}
   const s=missileState(time,j);if(s.flying)show(exhausts[j],s.position.clone().addScaledVector(s.direction,-1.6),.45,.70,.93,camera,time);}
  const age=time-20.5,hit=tailHitPoint();if(age>=0&&age<.45)flash.forEach((m,i)=>show(m,hit.clone().add(V(Math.sin(i)*age,.12*i*age,Math.cos(i)*age)),.5+age*2,.65+age*3,(1-age/.45)*.9,camera,time,i*.6));
  for(let i=0;i<smoke.length;i++){const birth=20.5+i*.34+Math.max(0,Math.floor((time-20.5-i*.34)/10.88))*10.88,a=time-birth;if(a<0||a>5)continue;const source=V(-3.35,1.70,.30).lerp(V(-1.8,2.4,0),smooth(27,30,birth)),point=aircraftPoint(birth,source.toArray());point.add(V(-a*.3,a*.54,0));show(smoke[i],point,.65+a*.54,.8+a*.72,.42*smooth(0,.18,a)*(1-smooth(2.2,5,a)),camera,time,i*.3);}
  for(let i=0;i<dust.length;i++){const birth=26+i*.065,a=time-birth;if(a<0||a>3.1)continue;const s=aircraftState(birth),point=s.position.clone().add(V(-.4-a*(1.0+i%3*.3),.22+a*.42,(i%2?1:-1)*(.6+a*.65)));point.y=Math.max(.1,point.y);show(dust[i],point,.45+a*1.2,.32+a*.8,.47*smooth(0,.10,a)*(1-smooth(1,3.1,a)),camera,time,i*.17);}
 }
 return {root,cards,update,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometry.dispose();cards.forEach(m=>m.material.dispose());}};
}
