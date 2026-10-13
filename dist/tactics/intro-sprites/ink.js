// Ink a rendered sprite in the language of the game's painted sprites: a dark
// warm contour around the silhouette, plus thin lines where the surface folds
// (normals turn sharply) or one part passes in front of another (depth jumps).
// Inputs are same-size canvases from three render passes of one pose:
// colour (with alpha), view-space normals (MeshNormalMaterial) and linear depth
// packed in RGB (DEPTH_SHADER below). Returns a new canvas one ink-width larger
// on every side; `pad` reports that margin so anchors can be shifted.
export const INK=Object.freeze({rgb:[38,30,22],silhouette:1.6,creaseCos:Math.cos(38*Math.PI/180),depthJump:.18,crease:.78});
export const DEPTH_SHADER={
 vertex:`varying float vz;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vz=-mv.z;gl_Position=projectionMatrix*mv;}`,
 fragment:`uniform float near;uniform float far;varying float vz;void main(){float d=clamp((vz-near)/(far-near),0.0,1.0);vec3 e=fract(d*vec3(1.0,255.0,65025.0));e-=e.yzz*vec3(1.0/255.0,1.0/255.0,0.0);gl_FragColor=vec4(e,1.0);}`
};
export function inkSprite(color,normal,depth,{near,far,ink=INK}={}){
 const W=color.width,H=color.height,pad=Math.ceil(ink.silhouette)+1;
 const px=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;
 const C=px(color),N=px(normal),D=px(depth);
 const solid=i=>C[i*4+3]>=128,dep=i=>(D[i*4]/255+D[i*4+1]/65025+D[i*4+2]/16581375)*(far-near)+near;
 const nrm=i=>{const x=N[i*4]/127.5-1,y=N[i*4+1]/127.5-1,z=N[i*4+2]/127.5-1,l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l];};
 // Interior lines: compare each solid pixel with its right and lower neighbours.
 const lines=new Float32Array(W*H);
 for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){const i=y*W+x;if(!solid(i))continue;const a=nrm(i),da=dep(i);
  for(const j of [i+1,i+W]){if(!solid(j))continue;const b=nrm(j),cos=a[0]*b[0]+a[1]*b[1]+a[2]*b[2],jump=Math.abs(dep(j)-da);
   let s=0;if(jump>ink.depthJump)s=1;else if(cos<ink.creaseCos)s=Math.min(1,(ink.creaseCos-cos)/(ink.creaseCos+.2)+.55);
   // The nearer of the two pixels keeps the paint; the line sits on the farther one.
   if(s>0){const k=jump>ink.depthJump&&dep(j)<da?i:j;lines[k]=Math.max(lines[k],s);}}}
 const out=document.createElement('canvas');out.width=W+2*pad;out.height=H+2*pad;const g=out.getContext('2d');
 // Silhouette: the alpha mask, darkened and stamped around a ring.
 const mask=document.createElement('canvas');mask.width=W;mask.height=H;const m=mask.getContext('2d');m.drawImage(color,0,0);m.globalCompositeOperation='source-in';m.fillStyle=`rgb(${ink.rgb})`;m.fillRect(0,0,W,H);
 const r=ink.silhouette;for(let k=0;k<16;k++){const a=k/16*Math.PI*2;g.drawImage(mask,pad+Math.cos(a)*r,pad+Math.sin(a)*r);}
 g.drawImage(color,pad,pad);
 const L=g.getImageData(pad,pad,W,H),d=L.data;
 for(let i=0;i<W*H;i++){const s=lines[i];if(!s)continue;const a=s*ink.crease;d[i*4]=d[i*4]*(1-a)+ink.rgb[0]*a;d[i*4+1]=d[i*4+1]*(1-a)+ink.rgb[1]*a;d[i*4+2]=d[i*4+2]*(1-a)+ink.rgb[2]*a;}
 g.putImageData(L,pad,pad);
 return {canvas:out,pad};
}
// Render the three passes of whatever is visible in `scene` through `camera`.
export function renderPasses(T,renderer,scene,camera,W,H){
 const grab=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(renderer.domElement,0,0);return c;};
 renderer.render(scene,camera);const color=grab();
 const keep=scene.overrideMaterial,normalMat=new T.MeshNormalMaterial({side:T.DoubleSide}),depthMat=new T.ShaderMaterial({vertexShader:DEPTH_SHADER.vertex,fragmentShader:DEPTH_SHADER.fragment,uniforms:{near:{value:camera.near},far:{value:camera.far}},side:T.DoubleSide});
 scene.overrideMaterial=normalMat;renderer.render(scene,camera);const normal=grab();
 scene.overrideMaterial=depthMat;renderer.render(scene,camera);const depth=grab();
 scene.overrideMaterial=keep;normalMat.dispose();depthMat.dispose();
 return {color,normal,depth,near:camera.near,far:camera.far};
}
