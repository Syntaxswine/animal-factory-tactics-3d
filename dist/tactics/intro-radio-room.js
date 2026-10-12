import * as T from './vendor/three.module.js';
import {createHen,HEN_FRAME} from './hen-worker.js';
import {createModelPaint} from './horse-model-paint.js';
import {henPaintLayers} from './hen-paint-layers.js';
import {createIntroPaint} from './intro-paint.js';

export function createIntroRadioRoom(renderer,data,textures,atlas){
 const root=new T.Group(),hen=createHen(data),kit=createIntroPaint(atlas),paint=createModelPaint(renderer,hen,textures[0],{species:'hen',frame:HEN_FRAME,paintLayers:henPaintLayers(renderer,hen,textures.slice(1),HEN_FRAME)});root.name='Overseas radio room';root.add(hen.root);hen.parts.forEach(m=>m.material=paint.material);
 kit.box(root,'Radio desk',[1.3,.07,1.9],[.56,.88,0],2);for(const z of [-.8,.8])kit.box(root,'Desk leg '+z,[.10,.87,.10],[.9,.435,z],4);
 kit.box(root,'Radio transceiver',[.45,.43,.70],[.8,1.13,-.48],2);kit.box(root,'Radio face',[.46,.32,.02],[.8,1.13,-.12],4);
 for(let i=0;i<3;i++)kit.cylinder(root,'Radio dial '+i,.037,.037,.036,[.65+i*.13,1.1,-.086],4,[Math.PI/2,0,0]);
 kit.box(root,'Radio meter',[.23,.10,.02],[.80,1.24,-.09],1);
 for(const mesh of kit.meshes)mesh.position.x+=.52;
 kit.cylinder(root,'Microphone foot',.12,.12,.036,[.76,.94,-.12],4);kit.beam(root,'Microphone stand',[.76,.96,-.12],[.32,1.39,-.17],.022,4);kit.cylinder(root,'Microphone grille',.058,.058,.17,[.33,1.4,-.17],4,[0,0,-.6]);
 // Accessories follow the same head bone as the face.
 const head=hen.bones.find(b=>b.name==='head');for(const side of [-1,1])kit.cylinder(head,'Headphone '+side,.092,.092,.06,[-.02,.15,side*.20],4,[Math.PI/2,0,0]);
 const curve=new T.CatmullRomCurve3([[-.02,.14,-.23],[-.08,.36,-.15],[-.08,.42,0],[-.08,.36,.15],[-.02,.14,.23]].map(p=>new T.Vector3(...p)));kit.add(head,'Headphone band',new T.TubeGeometry(curve,12,.018,5),4);
 kit.box(root,'Plaster backdrop',[.08,3.4,5],[-.85,1.6,0],3);kit.box(root,'Radio room floor',[4,.05,5],[.4,-.04,0],2);
 const neck=hen.bones.find(b=>b.name==='breast');let disposed=false;
 return {root,hen,update(t){head.rotation.y=.07*Math.sin(t*1.5);head.rotation.z=.025*Math.sin(t*2.3);neck.rotation.z=.013*Math.sin(t*1.8);hen.root.updateMatrixWorld(true);hen.skeleton.update();},dispose(){if(disposed)return;disposed=true;root.removeFromParent();kit.dispose();paint.dispose();hen.dispose();}};
}
