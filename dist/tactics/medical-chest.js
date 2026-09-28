import * as T from './vendor/three.module.js';
// Floor-rooted, reusable model. X is the long axis; rotate the group for placement.
export function createMedicalChest(){
 const model=new T.Group(),geometry=new T.BoxGeometry(1,1,1),materials={};
 model.name='large-medical-chest';
 const colors={body:0x64705b,lid:0x91977c,dark:0x283c38,strap:0xb8af87,metal:0xd4c89a,label:0xede6cb,mark:0xa33430};
 for(const [key,color]of Object.entries(colors))materials[key]=new T.MeshStandardMaterial({color,roughness:key==='metal'?.5:.88,metalness:key==='metal'?.45:0});
 const box=(name,size,position,material)=>{const m=new T.Mesh(geometry,materials[material]);m.name=name;m.scale.set(...size);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;model.add(m);return m;};
 box('body',[.96,.28,.44],[0,.16,0],'body');
 box('base',[.98,.025,.46],[0,.0125,0],'dark');
 box('lid-seam',[.975,.014,.455],[0,.302,0],'dark');
 box('lid',[.99,.065,.47],[0,.34,0],'lid');
 for(const x of [-.32,.32]){
  box('lid-strap',[.045,.012,.474],[x,.377,0],'strap');
  for(const z of [-.226,.226]){
   box('body-strap',[.045,.29,.014],[x,.165,z],'strap');
   box('latch',[.061,.074,.024],[x,.294,z],'metal');
   box('latch-slot',[.012,.025,.026],[x,.278,z],'dark');
  }
 }
 for(const x of [-.487,.487]){
  box('side-handle-top',[.023,.024,.16],[x,.225,0],'dark');
  for(const z of [-.07,.07])box('side-handle-mount',[.027,.055,.024],[x,.203,z],'metal');
 }
 for(const x of [-.105,.105])box('handle-mount',[.032,.045,.035],[x,.403,0],'dark');
 box('carry-handle',[.24,.026,.035],[0,.431,0],'dark');
 for(const z of [-.231,.231]){
  box('medical-plaque',[.17,.15,.012],[0,.167,z],'label');
  const outer=z+Math.sign(z)*.008;
  box('medical-cross-upright',[.036,.115,.008],[0,.167,outer],'mark');
  box('medical-cross-arms',[.116,.036,.009],[0,.167,outer],'mark');
 }
 model.userData.dispose=()=>{geometry.dispose();Object.values(materials).forEach(m=>m.dispose());};
 return model;
}
