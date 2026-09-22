import * as T from './vendor/three.module.js';
import {softBox} from './painted-environment-scene.js';
import {conveyorVariant,CONVEYOR_PORTS} from './conveyor-connections.js';
export const CONVEYOR_HEIGHT=.66;
// Each tile owns its undercarriage; shared ports terminate exactly at half-tile boundaries.
export function createConveyorLibrary(cargo,steel){
 const geometries=[],textures=[],materials=[],cache=new Map();let disposed=false;
 function mat(color,source,rect){const t=source.clone();t.offset.set(rect[0],rect[1]);t.repeat.set(rect[2],rect[3]);t.needsUpdate=true;textures.push(t);const m=new T.MeshStandardMaterial({color,map:t,roughness:.88});materials.push(m);return m;}
 const frame=mat(0xd6bf93,cargo,[1/3,0,1/3,.5]),iron=mat(0x8c8c83,steel,[1240/1536,149/1024,75/1536,100/1024]),belt=mat(0x484b48,steel,[1240/1536,149/1024,75/1536,100/1024]),edge=mat(0xb0a993,steel,[1240/1536,149/1024,75/1536,100/1024]);
 function mesh(root,name,g,m,p,r=[0,0,0]){geometries.push(g);const o=new T.Mesh(g,m);o.name=name;o.position.set(...p);o.rotation.set(...r);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 function box(root,name,m,p,size,ry=0){return mesh(root,name,softBox(...size,.006,1),m,p,[0,ry,0]);}
 function roller(root,x,z,length=.64,ry=0){mesh(root,'end roller',new T.CylinderGeometry(.048,.048,length,16),iron,[x,.611,z],[0,ry,Math.PI/2]);}
 function build(mask){if(disposed)throw Error('Conveyor library disposed');if(cache.has(mask))return cache.get(mask).clone(true);const variant=conveyorVariant(mask),root=new T.Group();root.name='conveyor-'+variant.kind;root.userData={...variant,tiles:[1,1],ports:variant.ports};
 // Curved tiles put their legs under the curved deck, not outside its cutout.
 const corner=variant.kind==='corner',turn=corner?[3,6,12,9].indexOf(mask)*-Math.PI/2:0;
 const footPoints=corner?[.35,1.22].flatMap(a=>[.25,.75].map(r=>{const x=.5-r*Math.cos(a),z=-.5+r*Math.sin(a);return [x*Math.cos(turn)+z*Math.sin(turn),-x*Math.sin(turn)+z*Math.cos(turn)];})):[[-.26,-.26],[-.26,.26],[.26,-.26],[.26,.26]];
 for(const [x,z] of footPoints){box(root,'foot',iron,[x,.025,z],[.14,.05,.14]);box(root,'square leg',frame,[x,.29,z],[.06,.53,.06]);mesh(root,'foot bolt',new T.CylinderGeometry(.014,.014,.014,8),edge,[x+.04,.057,z]);}
 if(!corner){for(const x of [-.26,.26])box(root,'lower stretcher',iron,[x,.19,0],[.035,.035,.54]);box(root,'cross brace',frame,[0,.43,0],[.58,.065,.075]);}
 const straight=(angle,end=false,isolated=false)=>{const section=new T.Group();root.add(section);section.rotation.y=angle;const min=isolated?-.34:-.5,max=end||isolated?.34:.5,length=max-min;
 box(section,'belt bed',iron,[0,.567,(min+max)/2],[.72,.10,length]);box(section,'rubber belt',belt,[0,.631,(min+max)/2],[.65,.04,length]);
 for(let z=min+.035;z<max-.02;z+=.08333)box(section,'belt transverse seam',iron,[0,.655,z],[.638,.006,.009]);
 for(const x of [-.366,.366]){box(section,'painted side rail',frame,[x,.615,(min+max)/2],[.058,.14,length]);for(const z of [min+.1,max-.1])mesh(section,'bearing bolt',new T.CylinderGeometry(.022,.022,.017,8),edge,[x+Math.sign(x)*.032,.605,z],[0,0,Math.PI/2]);}
 if(end||isolated){roller(section,0,max-.025);box(section,'terminal guard',frame,[0,.55,max+.025],[.76,.09,.035]);}if(isolated)roller(section,0,min+.025);
 };
 if(variant.kind==='isolated')straight(0,false,true);
 else if(variant.kind==='end'){const i=CONVEYOR_PORTS.findIndex(p=>mask&p.bit);straight(-i*Math.PI/2,true);}
 else if(variant.kind==='straight')straight(mask===5?0:Math.PI/2);
 else if(variant.kind==='corner'){
 const index=[3,6,12,9].indexOf(mask),section=new T.Group();section.rotation.y=-index*Math.PI/2;root.add(section);
 // True quarter-annulus deck; radial slats stay inside curved inner and outer rails.
 const shape=new T.Shape();shape.absarc(.5,-.5,.835,Math.PI,Math.PI/2,true);shape.absarc(.5,-.5,.165,Math.PI/2,Math.PI,false);shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:false,curveSegments:24});g.rotateX(Math.PI/2);mesh(section,'curved belt deck',g,belt,[0,.65,0]);
 function sector(name,inner,outer,from,to,height,top,material){const q=new T.Shape();q.absarc(.5,-.5,outer,Math.PI-from,Math.PI-to,true);q.absarc(.5,-.5,inner,Math.PI-to,Math.PI-from,false);q.closePath();const geo=new T.ExtrudeGeometry(q,{depth:height,bevelEnabled:false,curveSegments:24});geo.rotateX(Math.PI/2);mesh(section,name,geo,material,[0,top,0]);}
 for(let j=1;j<16;j++){const a=j/16*Math.PI/2;sector('radial belt seam',.17,.83,a-.006,a+.006,.005,.655,iron);}
 for(const radius of [.13,.87])sector('curved painted guard',radius-.029,radius+.029,0,Math.PI/2,.14,.685,frame);
 for(const a of [.35,1.22])box(section,'curved deck cross brace',frame,[.5-.5*Math.cos(a),.43,-.5+.5*Math.sin(a)],[.64,.065,.075],a);

 }else{
 box(root,'transfer table frame',frame,[0,.56,0],[.76,.12,.76]);box(root,'transfer table inset',belt,[0,.628,0],[.67,.035,.67]);
 // Omnidirectional ball-transfer table makes branches distinct from belt crossings.
 for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)mesh(root,'transfer ball',new T.SphereGeometry(.029,10,6),edge,[x*.12,.638,z*.12]);
 for(const p of CONVEYOR_PORTS){const section=new T.Group();section.rotation.y=-CONVEYOR_PORTS.indexOf(p)*Math.PI/2;root.add(section);if(mask&p.bit){box(section,'junction approach',belt,[0,.628,-.423],[.65,.042,.154]);for(const z of [-.48,-.40])box(section,'approach seam',iron,[0,.654,z],[.64,.006,.008]);for(const x of [-.366,.366])box(section,'approach rail',frame,[x,.615,-.427],[.058,.14,.146]);}else box(section,'closed junction guard',frame,[0,.64,-.366],[.76,.14,.055]);}
 }
 root.updateMatrixWorld(true);cache.set(mask,root);return root.clone(true);}
 return {build,setWireframe(value){materials.forEach(m=>m.wireframe=!!value);},stats:()=>({variants:cache.size,geometries:geometries.length}),dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());cache.clear();}};
}
