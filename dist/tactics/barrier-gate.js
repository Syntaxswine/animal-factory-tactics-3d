import * as T from './vendor/three.module.js';

export const BARRIER_GATE={tiles:[1,3],hinge:[0,1.07,-1.2],openAngle:Math.PI/2,clearHeight:.96};
function painted(material,{striped=false}={}){
 material.roughness=.93;
 material.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vGatePaint;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGatePaint=position;');
  s.fragmentShader='varying vec3 vGatePaint;\nfloat gateHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=gateHash(floor(vGatePaint*vec3(145.,110.,150.)));
   ${striped?'float band=step(.5,fract(vGatePaint.z*2.65+vGatePaint.y*2.4));diffuseColor.rgb=mix(vec3(.74,.67,.50),vec3(.49,.048,.025),band);':''}
   diffuseColor.rgb*=.92+floor(grain*4.)*.035;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.135,.073),step(.978,grain)*.36);
  `);
 };material.customProgramCacheKey=()=>`barrier-paint-v1-${striped}`;
 return material;
}
export function buildBarrierGate(root,{box,cyl,material,iron,brass},openness=0,{mirrored=false}={}){
 const instance=root,assembly=new T.Group();assembly.name='gate-assembly';assembly.scale.z=mirrored?-1:1;instance.add(assembly);root=assembly;
 const enamel=painted(material('barrier-oxide',0x9e4431)),ivory=painted(material('barrier-ivory',0xded1a7)),striped=painted(material('barrier-stripes',0xffffff),{striped:true});
 const part=(name,parent,mat,p,s)=>{const mesh=box(parent,mat,p,s);mesh.name=name;return mesh;};
 part('pedestal-foot',root,iron,[0,.055,-1.20],[.48,.11,.48]);
 part('drive-pedestal',root,enamel,[0,.50,-1.20],[.38,.82,.35]);
 part('pedestal-cap',root,iron,[0,.925,-1.20],[.43,.07,.40]);
 for(const x of [-.18,.18])for(const z of [-1.38,-1.02]){const bolt=cyl(root,brass,[x,.119,z],.018,.018,.017);bolt.name='anchor-bolt';}
 part('service-door-recess',root,iron,[.195,.51,-1.20],[.018,.61,.27]);
 part('service-door',root,enamel,[.207,.51,-1.20],[.015,.55,.23]);
 part('service-latch',root,ivory,[.225,.59,-1.27],[.025,.08,.025]);
 for(const y of [.34,.40,.46])part('vent-slot',root,iron,[.217,y,-1.20],[.01,.014,.14]);
 part('drive-collar',root,iron,[0,1.018,-1.20],[.29,.12,.25]);
 const axle=cyl(root,iron,BARRIER_GATE.hinge,.105,.105,.50);axle.rotation.z=Math.PI/2;axle.name='hinge-axle';
 for(const x of [-.26,.26]){const cap=cyl(root,brass,[x,1.07,-1.20],.055,.055,.025);cap.rotation.z=Math.PI/2;cap.name='axle-cap';}
 const arm=new T.Group();arm.name='barrier-arm';arm.position.fromArray(BARRIER_GATE.hinge);root.add(arm);
 part('boom',arm,striped,[0,0,1.38],[.10,.14,2.42]);
 part('pivot-clamp',arm,ivory,[0,0,.17],[.165,.20,.32]);
 for(const z of [.09,.25])for(const x of [-.089,.089]){const bolt=cyl(arm,brass,[x,0,z],.018,.018,.018);bolt.rotation.z=Math.PI/2;bolt.name='clamp-bolt';}
 part('tip-cap',arm,iron,[0,0,2.60],[.115,.155,.045]);
 // Counterweight sits beside the cabinet; it cannot sweep through its lid.
 part('counterweight-link',arm,iron,[.27,0,-.045],[.08,.065,.30]);
 part('counterweight',arm,enamel,[.30,0,-.15],[.16,.24,.22]);
 for(const [name,p]of [['hinge',BARRIER_GATE.hinge],['operator',[.42,.65,-1.20]],['lane-center',[0,0,0]]]){const a=new T.Object3D();a.name=name;a.position.fromArray(p);root.add(a);}
 instance.userData.barrierGate={tiles:[1,3],pivot:[0,1.07,mirrored?1.2:-1.2],openAngle:BARRIER_GATE.openAngle,mirrored};
 setBarrierGateOpen(instance,openness);
}
// Stateless absolute pose: repeatable when scrubbing, reversing, or restoring.
export function setBarrierGateOpen(root,amount){
 if(!Number.isFinite(amount)||amount<0||amount>1)throw Error('Gate openness must be between 0 and 1.');
 const arm=root.getObjectByName('barrier-arm');if(!arm)throw Error('Not a barrier gate');
 arm.rotation.x=-BARRIER_GATE.openAngle*amount;root.userData.barrierGate.openness=amount;root.updateMatrixWorld(true);
}
