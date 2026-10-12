import * as T from './vendor/three.module.js';
import {createUtilityHelicopter} from './utility-helicopter.js';
import {aircraftState,airframePose,smooth} from './intro-timeline.js';
const V=(...p)=>new T.Vector3(...p),BREAK=28.25;

// An adapter over the approved static asset. The cabin remains the same rigid
// object throughout: gear, tail damage, rotor pieces and door move separately.
export function createIntroHelicopter(atlas,soil){
 const root=new T.Group(),intact=createUtilityHelicopter(atlas),wreck=createUtilityHelicopter(atlas,{state:'survivable',groundTexture:soil});root.name='Animated utility helicopter';root.add(intact.root);wreck.root.visible=false;
 const airframe=new T.Group(),gear=new T.Group(),groundFrame=new T.Group();intact.root.add(airframe,gear);root.add(groundFrame);groundFrame.matrixAutoUpdate=false;airframe.name='Rigid animated airframe';gear.name='Buckling skids';groundFrame.name='World-space crash debris';
 for(const name of ['Cabin assembly','Tail assembly','Main rotor assembly'])airframe.add(intact.root.getObjectByName(name));
 const cabin=airframe.getObjectByName('Cabin assembly');for(const p of [...cabin.children])if(/Landing skid|Skid cross tube/.test(p.name))gear.attach(p);
 const rotor=airframe.getObjectByName('Main rotor assembly'),tailRotor=airframe.getObjectByName('Tail rotor'),tail=airframe.getObjectByName('Tail assembly');
 const borrowed=new Map(),extraGeometry=new Set();
 function borrow(object,parent){const clone=object.clone(true);parent.add(clone);clone.traverse(o=>{if(o.isMesh)borrowed.set(o,o.material);});return clone;}
 const damagedTail=borrow(wreck.root.getObjectByName('Tail assembly'),airframe);
 // The damaged shell has a real exit. The original sliding door covers this
 // opening in flight; it slides aft after settling rather than disappearing.
 cabin.getObjectByName('Fuselage shell').removeFromParent();borrow(wreck.root.getObjectByName('Fuselage shell'),cabin);
 const door=new T.Group();door.name='Sliding evacuation door';cabin.add(door);
 for(const p of [...cabin.children])if(/^(Sliding cabin door 1|Cabin glass 1 |Cabin window frame 1 |Door handle 1$)/.test(p.name))door.attach(p);
 const bench=cabin.getObjectByName('Cabin bench 1'),benchFold=new T.Group();benchFold.position.set(-.74,.99,.67);benchFold.name='Folding evacuation bench';cabin.add(benchFold);benchFold.attach(bench);
 const benchStow=new T.Group();benchStow.name='Bench stowed against rear bulkhead';benchStow.position.set(-1.41,0,.67);cabin.add(benchStow);benchStow.attach(benchFold);benchStow.attach(cabin.getObjectByName('Cabin bench back 1'));
 // Morph only the undercarriage. Matching tube topology keeps every rail
 // continuous as it spreads and buckles under the still-rigid cabin.
 root.updateMatrixWorld(true);wreck.root.updateMatrixWorld(true);const morphs=[];
 function morphTarget(mesh,target){const a=mesh.geometry.attributes.position,positions=new Float32Array(a.array),b=target.geometry.attributes.position,matrix=mesh.matrixWorld.clone().invert().multiply(target.matrixWorld),to=new Float32Array(a.array.length);if(a.count!==b.count)throw Error('Skid topology mismatch');for(let i=0;i<a.count;i++)V().fromBufferAttribute(b,i).applyMatrix4(matrix).toArray(to,i*3);morphs.push({mesh,positions,to});}
 for(const s of [-1,1])morphTarget(gear.getObjectByName('Landing skid '+s),wreck.root.getObjectByName('Collapsed landing skid '+s));
 const rest=new T.Matrix4().compose(V(0,-.18,0),new T.Quaternion().setFromEuler(new T.Euler(.11,0,-.035)),V(1,1,1));
 for(const x of [-1.10,.95]){const attach=V(x,.55,0).applyMatrix4(rest),curve=new T.CatmullRomCurve3([V(x,.12,-1.04),V(x+.13,.23,-.8),attach,V(x+.13,.23,.8),V(x,.12,1.02)],false,'centripetal'),g=new T.TubeGeometry(curve,12,.065,6,false),target=new T.Mesh(g);target.updateMatrixWorld(true);morphTarget(gear.getObjectByName('Skid cross tube '+x),target);g.dispose();}
 const negative=new T.Group(),positiveHinge=new T.Group(),fragment=new T.Group();negative.name='Striking rotor blade';positiveHinge.name='Bent rotor tip hinge';rotor.add(negative,positiveHinge);positiveHinge.position.x=2.68;negative.add(fragment);fragment.position.x=-3.235;fragment.name='Detached main rotor section';
 function bladePiece(source,parent,name,length,center){const m=source.clone();m.geometry=source.geometry.clone();m.geometry.scale(length/4.55,1,1);extraGeometry.add(m.geometry);m.name=name;m.position.set(center,-.015,0);m.rotation.set(0,0,0);parent.add(m);borrowed.set(m,m.material);return m;}
 for(const side of [-1,1]){const original=rotor.getObjectByName('Main rotor blade '+side),tip=rotor.getObjectByName('Main rotor tip '+side);original.removeFromParent();
  if(side<0){bladePiece(original,negative,'Retained main rotor root',1.42,-.96);bladePiece(original,fragment,'Falling rotor section',3.13,0);fragment.add(tip);tip.position.x=-1.445;}
  else{bladePiece(original,rotor,'Main rotor inner',2.43,1.465);bladePiece(original,positiveHinge,'Bending rotor outer',2.12,1.06);positiveHinge.add(tip);tip.position.x=2.0;}
 }
 const blurG=new T.RingGeometry(.45,4.78,48),blurM=new T.MeshBasicMaterial({color:0x504e3d,side:T.DoubleSide,transparent:true,opacity:.13,depthWrite:false});blurG.rotateX(-Math.PI/2);const blur=new T.Mesh(blurG,blurM);blur.position.copy(rotor.position);airframe.add(blur);
 const marks=borrow(wreck.root.getObjectByName('Crash ground marks'),groundFrame);marks.position.set(9,0,3.5);
 let strikeBend=.7,disposed=false;
 function pose(time){const s=aircraftState(time),f=airframePose(time);root.position.copy(s.position);root.rotation.set(s.roll,s.yaw,s.pitch);airframe.position.copy(f.position);airframe.quaternion.copy(f.quaternion);
  for(const {mesh,positions,to}of morphs){const a=mesh.geometry.attributes.position;for(let i=0;i<a.array.length;i++)a.array[i]=T.MathUtils.lerp(positions[i],to[i],s.compression);a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}
  tail.visible=!s.damage;damagedTail.visible=s.damage;const dt=T.MathUtils.clamp(time-26,0,2.1);rotor.rotation.y=.27-31*27.05+31*(Math.min(time,26)+dt-dt*dt/4.2);tailRotor.rotation.z=time*48;
  negative.rotation.z=time<=BREAK?strikeBend*smooth(27.85,BREAK,time):T.MathUtils.lerp(strikeBend,.04,smooth(BREAK,28.7,time));positiveHinge.rotation.z=-.44*smooth(BREAK,28.8,time);
  blur.visible=time<27.9;blurM.opacity=.13*(1-smooth(26,28.1,time));door.position.set(-1.52*s.door,0,.08*s.door);benchFold.rotation.x=Math.PI/2*smooth(30,30.8,time);benchStow.rotation.y=Math.PI/2*smooth(30.6,31.6,time);
  root.updateMatrixWorld(true);groundFrame.matrix.copy(root.matrixWorld).invert();root.updateMatrixWorld(true);return s;
 }
 // Solve the actual blade-tip contact once. It then replays identically when
 // scrubbing in either direction; no time-step simulation or hidden state.
 pose(BREAK);let low=.1,high=1.2;for(let i=0;i<22;i++){negative.rotation.z=(low+high)/2;root.updateMatrixWorld(true);if(new T.Box3().setFromObject(negative,true).min.y>.004)low=negative.rotation.z;else high=negative.rotation.z;}strikeBend=(low+high)/2;pose(BREAK);
 const releasePosition=fragment.getWorldPosition(V()),releaseQuaternion=fragment.getWorldQuaternion(new T.Quaternion()),restQuaternion=new T.Quaternion().setFromEuler(new T.Euler(0,-.24,0));
 function update(time){if(disposed)return;const s=pose(time);if(time<BREAK){if(fragment.parent!==negative)negative.add(fragment);fragment.position.set(-3.235,0,0);fragment.quaternion.identity();}
  else{if(fragment.parent!==groundFrame)groundFrame.add(fragment);const age=time-BREAK,travel=Math.min(age,.85);fragment.position.copy(releasePosition).add(V(-travel*.8,-.7*age-4.5*age*age,-travel*1.7));fragment.quaternion.copy(releaseQuaternion).slerp(restQuaternion,smooth(0,.85,age));root.updateMatrixWorld(true);const min=new T.Box3().setFromObject(fragment,true).min.y;fragment.position.y+=Math.max(0,.004-min);}
  const trail=smooth(26,29,time);marks.visible=trail>0;marks.scale.x=Math.max(.001,trail);marks.position.x=9+.9*(1-trail);root.updateMatrixWorld(true);return s;
 }
 update(0);
 return {root,intact,wreck,airframe,rotor,gear,door,fragment,negative,marks,update,setGrey(v){intact.setGrey(v);wreck.setGrey(v);for(const [p,m]of borrowed)p.material=v?intact.parts[0].material:m;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();intact.dispose();wreck.dispose();for(const g of extraGeometry)g.dispose();blurG.dispose();blurM.dispose();}};
}
