import * as T from './vendor/three.module.js';
// Bound shadow samplers per pass, not the number of authored lights.
export class LightRenderer {
 constructor(){this.target=null;this.screen=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.quad=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({depthTest:false,depthWrite:false,toneMapped:false}));this.screen.add(this.quad);}
 render(renderer,scene,camera,lights){
  const active=lights.filter(l=>l.visible);if(active.length<=4){renderer.render(scene,camera);return;}
  const size=renderer.getDrawingBufferSize(new T.Vector2());
  if(!this.target){this.target=new T.WebGLRenderTarget(size.x,size.y,{type:T.HalfFloatType});this.quad.material.map=this.target.texture;}
  else if(this.target.width!==size.x||this.target.height!==size.y)this.target.setSize(size.x,size.y);
  const previousTarget=renderer.getRenderTarget(),autoClear=renderer.autoClear,background=scene.background,lightState=[],hidden=[],materials=new Map();
  scene.traverse(o=>{
   if(o.isLight)lightState.push([o,o.visible]);
   if(!o.material)return;
   const list=Array.isArray(o.material)?o.material:[o.material];
   if(list.some(m=>!m.isMeshStandardMaterial&&!m.isMeshPhongMaterial&&!m.isMeshLambertMaterial)){hidden.push([o,o.visible]);return;}
   for(const m of list)if(!materials.has(m))materials.set(m,{blending:m.blending,transparent:m.transparent,depthWrite:m.depthWrite,depthFunc:m.depthFunc,emissiveIntensity:m.emissiveIntensity});
  });
  try{
   renderer.setRenderTarget(this.target);renderer.autoClear=true;
   active.forEach((l,i)=>l.visible=i<4);renderer.render(scene,camera);
   renderer.autoClear=false;scene.background=null;
   for(const [o]of hidden)o.visible=false;
   for(const [l]of lightState)l.visible=false;
   for(const [m]of materials){m.blending=T.AdditiveBlending;m.transparent=true;m.depthWrite=false;m.depthFunc=T.EqualDepth;m.emissiveIntensity=0;m.needsUpdate=true;}
   for(let first=4;first<active.length;first+=4){active.forEach((l,i)=>l.visible=i>=first&&i<first+4);renderer.render(scene,camera);}
  }finally{
   for(const [m,saved]of materials){Object.assign(m,saved);m.needsUpdate=true;}
   for(const [o,visible]of hidden)o.visible=visible;
   for(const [l,visible]of lightState)l.visible=visible;
   scene.background=background;renderer.autoClear=autoClear;renderer.setRenderTarget(previousTarget);
  }
  // Accumulate in linear light, convert to display color exactly once.
  renderer.render(this.screen,this.camera);
 }
 dispose(){this.target?.dispose();this.quad.geometry.dispose();this.quad.material.dispose();}
}
