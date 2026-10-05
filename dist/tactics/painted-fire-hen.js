import * as T from './vendor/three.module.js';
import {createHenMotion} from './hen-motion.js';
import {guardHenConstruction} from './hen-rig-transaction.js';
import {burnState,panicFeet,smooth} from './painted-fire-state.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);

// The hen keeps her own feathered wings and four-toed feet. No firearm grips
// are invented for the catalog's unarmed avian character.
export function createHenFireMotion(worker,profile){return guardHenConstruction(worker,()=>{
 const motion=createHenMotion(worker),bones=Object.fromEntries(worker.bones.map(b=>[b.name,b])),attachments=[];
 bones.head.traverse(o=>{if(o.isMesh)attachments.push(o);});let state,feet;
 const restore=()=>{motion.restore();for(const p of [...worker.parts,...attachments])p.visible=true;};
 return {worker,bones,
  fire(){throw Error('The hen has no authored flamethrower grips');},
  burn(time,route){
   for(let i=2;i<route.points.length;i++){const a=route.points[i-2],b=route.points[i-1],c=route.points[i];if(Math.abs(Math.atan2(c.z-b.z,c.x-b.x)-Math.atan2(b.z-a.z,b.x-a.x))>1e-6)throw Error('Hen fire study requires a straight legal route');}
   state=burnState(time,route);feet=panicFeet(state,route,{restX:0,restZ:.157,stepLength:.22});const gait=route.length?smooth(state.run/.08)*(1-smooth((state.run-.88)/.12)):0,c=state.collapse,panic=smooth(state.local/.14)*(1-c);
   const input={time:state.time,distance:state.distance,feet:Object.fromEntries([-1,1].map(side=>[side,{x:feet[side].worldDistance-.035,lift:feet[side].y*.65,planted:feet[side].planted}])),gait,kneel:c,bob:.012*Math.sin(state.local*18)**2*gait,transfer:Math.sin(state.local*16)*gait};
   motion.apply(time,{heading:state.point.heading*180/Math.PI-35,state:input,crouchDrop:.25,kneelStep:0,crouchPole:true});
   bones.breast.rotation.z=-.22*panic-.40*c;bones.head.rotation.z=.23*panic+.30*c;bones.head.rotation.y=.13*Math.sin(state.local*11)*panic;
   for(const side of [-1,1]){bones['wing '+side].rotation.x=-side*(.24+.34*Math.sin(state.local*15+side*.7)**2)*panic;bones['wing tip '+side].rotation.x=-side*.20*panic;}
   worker.root.position.set(state.point.x,state.point.y,state.point.z);worker.root.rotation.y=-state.point.heading;worker.root.updateMatrixWorld(true);motion.skeleton.update();
   for(const p of [...worker.parts,...attachments])p.visible=state.bodyVisible;return this.diagnostics();
  },
  diagnostics(){return {state,animal:profile.id,unarmed:true,gripError:0,hands:[],drop:null,muzzle:null,direction:null,feet:Object.fromEntries([-1,1].map(side=>[side,{...feet[side],y:feet[side].y*.65,ankle:bones['foot '+side].getWorldPosition(V()).toArray()}]))};},
  restore,dispose(){restore();motion.dispose();}
 };
});}
