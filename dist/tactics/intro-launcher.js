import * as T from './vendor/three.module.js';
import {createStrategicSiteLibrary} from './strategic-sites.js';
import {createIntroPaint} from './intro-paint.js';
import {createSAMMissile} from './sam-missile.js';
import {launcherState,SAM_POSITION} from './intro-timeline.js';

export function createIntroLauncher(atlas){
 const library=createStrategicSiteLibrary(atlas),site=library.build('sam'),root=site.root,kit=createIntroPaint(atlas);
 // Keep the approved slab, footings and cabinets. Replace only the batched
 // moving assembly and its supports with articulated equivalents.
 for(const name of ['elevated-launcher','fixed-detail'])root.getObjectByName(name)?.removeFromParent();
 const baseMaterials=new Map();root.traverse(o=>{if(o.isMesh)baseMaterials.set(o,o.material);});
 const turn=new T.Group(),pitch=new T.Group();turn.name='Azimuth bearing';pitch.name='Elevation cradle';root.add(turn);turn.add(pitch);pitch.position.y=2;
 kit.box(turn,'Turntable body',[1.54,.64,1.43],[0,1.1,0]);
 for(const x of [-.72,.72])kit.box(turn,'Bearing cheek '+x,[.28,1.04,.78],[x,1.69,0]);
 kit.cylinder(turn,'Elevation axle',.27,.27,2.05,[0,1.92,0],4,[0,0,Math.PI/2]);
 const missiles=[0,1].map(i=>{const x=i===0?-.71:.71;
  for(const side of [-1,1])kit.box(pitch,'Rail '+i+' '+side,[.075,.24,4.16],[x+side*.18,0,0]);
  for(const z of [-1.7,-.8,.3,1.55])kit.box(pitch,'Rail tie '+i+' '+z,[.48,.06,.13],[x,-.13,z],4);
  for(const z of [-.20,.97])kit.box(pitch,'Body saddle '+i+' '+z,[.14,.42,.14],[x,.32,z],4);
  const m=createSAMMissile(atlas);m.root.name='Loaded missile '+i;m.root.position.set(x,.70,0);m.root.rotation.y=-Math.PI/2;pitch.add(m.root);return m;
 });
 const actuator=kit.cylinder(turn,'Elevation piston',.075,.075,1,[0,0,0],4),sleeve=kit.cylinder(turn,'Actuator sleeve',.13,.13,1,[0,0,0],2);
 kit.beam(pitch,'Cradle crossbar',[-.9,-.13,1.3],[.9,-.13,1.3],.05);
 root.position.fromArray(SAM_POSITION);let disposed=false;
 function update(time){if(disposed)return;const s=launcherState(time);turn.rotation.y=s.yaw;pitch.rotation.x=-s.pitch;missiles.forEach((m,i)=>m.root.visible=s.loaded[i]);
  const a=new T.Vector3(0,.94,.80),b=new T.Vector3(0,-.13,1.3).applyEuler(pitch.rotation).add(pitch.position),v=b.clone().sub(a),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());
  actuator.position.copy(a).addScaledVector(v,.5);actuator.scale.y=v.length();actuator.quaternion.copy(q);sleeve.position.copy(a).addScaledVector(v,.3);sleeve.scale.y=v.length()*.60;sleeve.quaternion.copy(q);root.updateMatrixWorld(true);return s;
 }
 update(0);
 return {root,turn,pitch,missiles,update,setGrey(v){kit.setGrey(v);for(const [mesh,material]of baseMaterials)mesh.material=v?kit.grey:material;missiles.forEach(m=>m.setGrey(v));},dispose(){if(disposed)return;disposed=true;root.removeFromParent();missiles.forEach(m=>m.dispose());kit.dispose();library.dispose();}};
}
