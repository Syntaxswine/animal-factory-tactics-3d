import {createModelPaint} from './horse-model-paint.js';
import {BEAR_PAINT_FRAME} from './bear-worker.js';
// Unseen cuff rims borrow a small, clean patch of the same painted shirt.
// The outfit texture supplies the color; the regular and faction faces stay native.
export function createBearPaint(renderer,worker,texture){
 return createModelPaint(renderer,worker,texture,{species:'bear',frame:BEAR_PAINT_FRAME,paintLayers:{uniforms:{},declarations:'',dispose(){},application:`
  if(vPaintPart<1.5){
   vec3 cloth=texture2D(uModelPaint,vec2((2.5+clamp(p.x*.10,-.02,.02)/1.18)/4.,.5+(1.105+clamp(p.y-1.,-.02,.02)-.84)/2.36)).rgb;
   float missing=(1.-coverage)*(1.-filled);
   float cuff=smoothstep(.28,.34,abs(p.z))*smoothstep(.97,.995,p.y)*(1.-smoothstep(1.04,1.07,p.y));
   float chroma=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b)-min(min(diffuseColor.r,diffuseColor.g),diffuseColor.b);
   float rim=cuff*max(1.-coverage,1.-smoothstep(.025,.075,chroma));
   float useCloth=max(missing,rim);
   diffuseColor.rgb=mix(diffuseColor.rgb,cloth*(.87+.13*abs(n.y)),useCloth);coverage*=1.-useCloth;filled=max(filled,useCloth);
  }
 `}});
}
