import * as T from './vendor/three.module.js';
import {impactFrame,canPresentBodyImpact} from './shot-coordinates.js';

// Opt-in authoring diagnostics. It reads exactly the artist/gameplay contract;
// it does not roll, query combat, reveal people or change a casualty.
export class GunshotImpactDebug {
 constructor(scene,{enabled=false,document=globalThis.document}={}){
  this.enabled=enabled;if(!enabled)return;
  this.points=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({color:0x8af7be,size:7,sizeAttenuation:false}));
  this.arrows=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xffdc80}));
  for(const mesh of [this.points,this.arrows]){mesh.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(256*3),3).setUsage(T.DynamicDrawUsage));mesh.geometry.setDrawRange(0,0);mesh.frustumCulled=false;scene.add(mesh);}
  if(document){this.panel=document.createElement('output');this.panel.setAttribute('aria-label','Resolved gunshot impacts');Object.assign(this.panel.style,{position:'fixed',left:'12px',bottom:'92px',maxWidth:'min(600px,90vw)',padding:'10px',whiteSpace:'pre-wrap',background:'#13251ff0',color:'#f4dfad',font:'12px monospace',border:'1px solid #a39362',pointerEvents:'none',zIndex:'30'});document.body.append(this.panel);}
  this.update(null,null);
 }
 update(active,state){
  if(!this.enabled)return;
  const receipts=active?.phase.discharged?(active.event.bodyImpacts||[]).filter(r=>canPresentBodyImpact(r,active,state)).slice(0,32):[];
  let points=0,lines=0;const p=this.points.geometry.attributes.position,a=this.arrows.geometry.attributes.position;
  const text=[];
  for(const receipt of receipts){
   const {contact,incoming}=impactFrame(receipt),start=contact.clone().addScaledVector(incoming,-.75),side=new T.Vector3().crossVectors(incoming,new T.Vector3(0,1,0));
   if(side.lengthSq()<.001)side.set(1,0,0);side.normalize();
   p.setXYZ(points++,contact.x,contact.y,contact.z);
   for(const v of [start,contact,contact,contact.clone().addScaledVector(incoming,-.18).addScaledVector(side,.09),contact,contact.clone().addScaledVector(incoming,-.18).addScaledVector(side,-.09)])a.setXYZ(lines++,v.x,v.y,v.z);
   const c=receipt.contact,d=receipt.incoming;
   text.push(`${receipt.projectileId} → ${receipt.victimId} ${receipt.zone}\ncontact ${[c.x,c.y,c.h].map(n=>n.toFixed(2)).join(', ')} · incoming ${[d.x,d.y,d.h].map(n=>n.toFixed(2)).join(', ')}\ninjury ${receipt.injuryDamage} · HP ${receipt.hpBefore} → ${receipt.hpAfter} · threshold ${receipt.threshold} · ${receipt.qualificationReason}`);
  }
  for(const [mesh,count] of [[this.points,points],[this.arrows,lines]]){mesh.visible=count>0;mesh.geometry.setDrawRange(0,count);mesh.geometry.attributes.position.needsUpdate=true;}
  if(this.panel){this.panel.hidden=!receipts.length;this.panel.textContent='Resolved body impacts · v1\n'+text.join('\n');}
 }
 dispose(){for(const mesh of [this.points,this.arrows])if(mesh){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}this.panel?.remove();}
}
