import * as T from './vendor/three.module.js';
import {paintedBurstMaterial} from './painted-blast-effects.js';
import {paintedFireMaterial} from './painted-fire-effects.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
const events={
 radio:[{at:.46,p:[.6,1.25,-.3],size:1.55},{at:.77,p:[.6,4.45,-.3],size:.78}],
 radar:[{at:.46,p:[.3,1.7,-.25],size:1.5},{at:.77,p:[.3,3.9,-.25],size:.85}],
 sam:[{at:.46,p:[-.65,2.15,.05],size:1.5},{at:.65,p:[.7,1.95,.1],size:1.1}],
};
// The same painted atlases as the approved character/tank effects. The caller
// owns textures; this layer owns only its cards, materials and flash lights.
export function createStrategicDestructionEffects(textures,id){
 if(!events[id])throw RangeError('Unknown strategic site: '+id);
 if(textures?.length!==3||textures.some(t=>!t?.isTexture))throw TypeError('Three painted blast textures are required');
 const root=new T.Group();root.name=id+'-destruction-effects';
 const plane=new T.PlaneGeometry(1,1),materials=[],bursts=[],smoke=[],embers=[],flames=[];
 let disposed=false,time=0,enabled=false;
 const card=(material,name)=>{
  // Clip billboards to the slab instead of letting their lower corners cut
  // through the ground when the camera is low or overhead.
  material.fragmentShader=material.fragmentShader.replace('void main(){','void main(){if('+(material.fragmentShader.includes('vWorld')?'vWorld':'world')+'.y<.245)discard;');
  materials.push(material);const mesh=new T.Mesh(plane,material);mesh.name=name;root.add(mesh);return mesh;
 };
 for(const [eventIndex,event]of events[id].entries()){
  const light=new T.PointLight(0xffa957,0,11,2);light.position.set(...event.p);root.add(light);
  const cards=Array.from({length:13},(_,i)=>card(paintedBurstMaterial(textures[0]),'Painted blast '+eventIndex+'-'+i));
  bursts.push({event,light,cards});
 }
 for(let i=0;i<30;i++){
  const m=card(paintedFireMaterial(textures[2],{smoke:true,seed:i*1.618}),'Black billow '+i);
  const ring=i%6,layer=Math.floor(i/6),angle=ring*2.399+layer*.7;
  m.userData={birth:.66+layer*.16+(ring%3)*.038,angle,radius:.38+(ring%3)*.6,layer,life:4.1+(i%4)*.22};smoke.push(m);
 }
 // Low flames remain briefly visible below the smoke; they are a presentation
 // detail and do not create gameplay burning cells or extend damage range.
 for(let i=0;i<7;i++)flames.push(card(paintedFireMaterial(textures[1],{seed:i*1.27}),'Residual flame '+i));
 for(let i=0;i<12;i++)embers.push(card(paintedFireMaterial(textures[1],{seed:i*.7}),'Short ember '+i));
 const origin=V(...events[id][0].p);origin.y=.3;
 function apply(value,camera,{visible=true}={}){
  if(disposed)throw Error('Destruction effects have been disposed');
  if(!Number.isFinite(value)||!camera?.isCamera)throw TypeError('A finite time and camera are required');
  time=Math.max(0,Math.min(7.6,value));enabled=visible;root.visible=visible;
  for(const {event,light,cards}of bursts){
   const age=time-event.at;light.intensity=visible&&age>=0?22*Math.exp(-age*19):0;
   cards.forEach((m,i)=>{
    const a=age-(i? .016+(i%3)*.022:0),angle=i*2.399,eventSize=event.size;
    m.visible=a>=0&&a<1.12;const travel=i===0?0:(.5+(i%4)*.47)*(1-Math.exp(-Math.max(0,a)*6));
    m.position.set(event.p[0]+Math.cos(angle)*travel,event.p[1]+Math.max(0,a)*(.65+(i%3)*.23),event.p[2]+Math.sin(angle)*travel);m.quaternion.copy(camera.quaternion);m.rotateZ(.45*Math.sin(i*1.71));
    const size=(.3+2.2*(1-Math.exp(-Math.max(0,a)*12)))*eventSize*(i? .58+.18*Math.sin(i)**2:1);
    m.scale.set(size,size*(.84+.18*Math.cos(i)),1);m.material.uniforms.phase.value=3*smooth(a/.90);m.material.uniforms.opacity.value=(i?.86:1)*smooth(a/.028)*(1-smooth((a-.36)/.76));
   });
  }
  smoke.forEach((m,i)=>{
   const {birth,angle,radius,layer,life}=m.userData,a=time-birth;m.visible=a>=0&&a<life;
   const age=Math.max(0,a),spread=radius+.13*age,baseY=.50+layer*.50;
   m.position.set(origin.x+Math.cos(angle)*spread-.18*age,baseY+age*(.44+layer*.045),origin.z+Math.sin(angle)*spread+.10*age);
   m.quaternion.copy(camera.quaternion);m.rotateZ(Math.sin(i*1.7)*.50+age*.025*(i%2?1:-1));
   const size=1.8+Math.min(age,2.8)*.61+(i%3)*.22;m.scale.set(size,size*(.9+.12*Math.sin(i)),1);
   m.material.uniforms.clock.value=time*.68+i*.37;m.material.uniforms.opacity.value=.96*smooth(a/.23)*(1-smooth((a-(life-1.25))/1.25));
  });
  flames.forEach((m,i)=>{
   const a=time-.67-i*.034,angle=i*2.399;m.visible=a>=0&&a<2.3;
   m.position.set(origin.x+Math.cos(angle)*(.3+i*.17),.65+Math.sin(i*1.3)**2*.3,origin.z+Math.sin(angle)*(.3+i*.17));m.quaternion.copy(camera.quaternion);
   m.scale.set(.70+(i%3)*.25,1.2+(i%3)*.24,1);m.material.uniforms.clock.value=time+i*.2;m.material.uniforms.opacity.value=.82*smooth(a/.07)*(1-smooth((a-1.25)/1.05));
  });
  embers.forEach((m,i)=>{
   const age=time-.55-(i%3)*.04,angle=i*2.399,flight=.48+.055*(i%4),a=Math.max(0,Math.min(age,flight));m.visible=age>=0&&age<flight;
   const speed=2.5+.22*(i%4);m.position.set(origin.x+Math.cos(angle)*speed*a,1.6+(2+i%3*.25)*a-4.905*a*a,origin.z+Math.sin(angle)*speed*a);m.quaternion.copy(camera.quaternion);
   m.scale.set(.10,.20,1);m.material.uniforms.clock.value=time+i;m.material.uniforms.opacity.value=1-smooth((age-flight+.15)/.15);
  });
  return diagnostics();
 }
 function diagnostics(){return {site:id,time,enabled,bursts:enabled?bursts.reduce((n,b)=>n+b.cards.filter(m=>m.visible).length,0):0,smoke:enabled?smoke.filter(m=>m.visible).length:0,flames:enabled?flames.filter(m=>m.visible).length:0,embers:enabled?embers.filter(m=>m.visible).length:0,lights:bursts.map(b=>b.light.intensity),disposed};}
 root.visible=false;
 return {root,apply,diagnostics,dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();plane.dispose();materials.forEach(m=>m.dispose());}};
}
