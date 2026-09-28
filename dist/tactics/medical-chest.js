import * as T from './vendor/three.module.js';
// Floor-rooted, reusable model. X is the long axis; rotate the group for placement.
export function createMedicalChest(){
 const model=new T.Group(),geometry=new T.BoxGeometry(1,1,1),materials={},textures=[];
 const skin=(name,base,rects)=>{
  const width=256,height=128,data=new Uint8Array(width*height*4);
  const paint=(x,y,w,h,color)=>{for(let row=Math.max(0,Math.round(y*height));row<Math.min(height,Math.round((y+h)*height));row++)for(let col=Math.max(0,Math.round(x*width));col<Math.min(width,Math.round((x+w)*width));col++){const i=(row*width+col)*4;data[i]=color>>16&255;data[i+1]=color>>8&255;data[i+2]=color&255;data[i+3]=255;}};
  paint(0,0,1,1,base);for(const r of rects)paint(...r);
  const texture=new T.DataTexture(data,width,height);texture.name=name;texture.colorSpace=T.SRGBColorSpace;texture.flipY=true;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textures.push(texture);
  return materials[name]=new T.MeshStandardMaterial({map:texture,roughness:.88});
 };
 const straps=(span)=>[-.32,.32].map(x=>[.5+(x-.0225)/span,0,.045/span,1,0xb8af87]);
 const front=skin('body-face',0x64705b,[...straps(.96),[.5-.085/.96,1-(.167-.02+.075)/.28,.17/.96,.15/.28,0xede6cb],[.5-.018/.96,1-(.167-.02+.0575)/.28,.036/.96,.115/.28,0xa33430],[.5-.058/.96,1-(.167-.02+.018)/.28,.116/.96,.036/.28,0xa33430]]);
 const side=skin('side-face',0x64705b,[[.5-.082/.44,1-(.203-.02+.0275)/.28,.024/.44,.055/.28,0xd4c89a],[.5+.058/.44,1-(.203-.02+.0275)/.28,.024/.44,.055/.28,0xd4c89a],[.5-.08/.44,1-(.225-.02+.012)/.28,.16/.44,.024/.28,0x283c38]]);
 const lidSkin=skin('lid-face',0x91977c,straps(.99));
 model.name='large-medical-chest';
 const colors={body:0x64705b,lid:0x91977c,dark:0x283c38,metal:0xd4c89a};
 for(const [key,color]of Object.entries(colors))materials[key]=new T.MeshStandardMaterial({color,roughness:key==='metal'?.5:.88,metalness:key==='metal'?.45:0});
 const box=(name,size,position,material)=>{const m=new T.Mesh(geometry,Array.isArray(material)?material:materials[material]);m.name=name;m.scale.set(...size);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;model.add(m);return m;};
 box('body',[.96,.28,.44],[0,.16,0],[side,side,materials.body,materials.body,front,front]);
 box('base',[.98,.025,.46],[0,.0125,0],'dark');
 box('lid-seam',[.975,.014,.455],[0,.302,0],'dark');
 box('lid',[.99,.065,.47],[0,.34,0],[materials.lid,materials.lid,lidSkin,materials.lid,lidSkin,lidSkin]);
 for(const x of [-.32,.32]){
  for(const z of [-.226,.226]){
   box('latch',[.061,.074,.024],[x,.294,z],'metal');
   box('latch-slot',[.012,.025,.026],[x,.278,z],'dark');
  }
 }
 for(const x of [-.105,.105])box('handle-mount',[.032,.045,.035],[x,.403,0],'dark');
 box('carry-handle',[.24,.026,.035],[0,.431,0],'dark');
 model.userData.dispose=()=>{geometry.dispose();textures.forEach(t=>t.dispose());Object.values(materials).forEach(m=>m.dispose());};
 return model;
}
