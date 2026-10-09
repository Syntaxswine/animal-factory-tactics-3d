import * as T from './vendor/three.module.js';

// Native-size buttstock carries. The trigger forearm passes in front of the
// broad stock; the support hand keeps its weapon-specific attachment (HMG
// upper handle included). These are pose values, never render-order tricks.
export const STOCKED_WEAPONS=['rifle','assault','smg','shotgun','sniper','launcher','hmg'];
const fits={
 rifle:[.24,.97,.035,.55,.35,1.2,-.4],
 assault:[.2458,.945,.0428,.5435,.6849,1.2127,-.3398],
 smg:[.24,.97,.035,.55,.35,1.2,-.4],
 shotgun:[.237,.967,.021,.601,.378,1.155,-.452],
 sniper:[.233,.988,.034,.668,.437,1.209,-.482],
 launcher:[.252,.971,.036,.828,.723,1.06,-.638],
 hmg:[.226,.938,.034,.566,.313,1.172,-.365],
};
const speciesFits={
 dog:{launcher:[.2108,.9438,.0794,.7932,.5943,1.1097,-.9612]},
 bull:{hmg:[.2318,.926,.0429,.6119,.2116,1.2366,-.3094],launcher:[.2189,1.0157,.0091,.4788,.6464,1.1185,-.2463]},
 donkey:{hmg:[.2776,.9457,.0219,.746,.2426,1.1565,-.2123],launcher:[.2393,.9925,.0465,.7313,.5825,1.0318,-.2829]},
 sheep:{hmg:[.2776,.9457,.0219,.746,.2426,1.1565,-.2123],shotgun:[.2671,.9761,.0381,.6553,.3219,1.2491,-.3085],sniper:[.2318,.926,.0429,.6119,.2116,1.2366,-.3094],launcher:[.2174,.9871,.0931,.6889,.5799,1.1622,-.5224]},
};
const v=a=>new T.Vector3(...a);
export const STOCK_RAISE_ARC={forward:.06,outward:.05,pole:[0,1,3]};
export function stockCarry(animal,weapon,base=weapon.carry){
 const id=weapon.id||'rifle',fit=speciesFits[animal]?.[id]||fits[id];
 if(base?.stockFitted||!fit||animal==='hen'||animal.startsWith('pig-'))return base;
 const [x,y,z,ax,ay,twist,poleY]=fit,axis=v([ax,ay,-.977]).normalize();
 const gunQ=new T.Quaternion().setFromUnitVectors(v([1,0,0]),axis);
 const handQ=new T.Quaternion().setFromUnitVectors(v([0,-1,0]),axis).multiply(new T.Quaternion().setFromAxisAngle(v([0,1,0]),Math.PI*twist));
 let raiseArc=id==='hmg'?{...STOCK_RAISE_ARC,forward:.02}:STOCK_RAISE_ARC;
 if(id==='assault'||(animal==='sheep'&&id==='shotgun'))raiseArc={...raiseArc,pole:[0,2,3]};
 if((animal==='horse'&&id==='smg')||(animal==='bull'&&id==='hmg'))raiseArc={...raiseArc,pole:[0,1.5,3]};
 if(animal==='sheep'&&id==='sniper')raiseArc={...raiseArc,pole:[0,2,3],aimPole:[-.12,-1,1]};
 // Keep the carrying elbow relaxed, then bring it above the fixed HMG grasp
 // while raising. This clears the real cuff through carry and level raising;
 // steep HMG aiming remains a separate fitting study.
 const support=id==='hmg'?{support:{...base?.handPoses?.support,elbowPole:[-.6,-.55,.4],weaponElbowPole:[0,1,0]}}:{};
 return {...base,stockFitted:true,raiseArc,position:[x,y-(animal==='sheep'&&id==='rifle'?.005:0),z],axis:[ax,ay,-.977],hands:base?.hands||[1,-1],handPoses:{...base?.handPoses,...support,grip:{...base?.handPoses?.grip,elbowPole:[1,poleY,.8],quaternion:gunQ.invert().multiply(handQ).toArray()}}};
}

// Keep each glove fixed to its grip as the weapon rises. Only the elbow path
// changes: twisting the wrist into a generic aim pose cuts through the stock.
// At zero aim this is exactly the carry, without a one-frame arm replacement.
export function weaponHandPose(carry,gunQ,side,aim=0,spineQ=new T.Quaternion()){
 const contact=carry?.handPoses?.[side===1?'grip':'support'],axis=v([1,0,0]).applyQuaternion(gunQ);
 const aiming=new T.Quaternion().setFromUnitVectors(v([0,-1,0]),axis);
 const quaternion=contact?.quaternion?gunQ.clone().multiply(new T.Quaternion().fromArray(contact.quaternion)):aiming;
 const palm=v(contact?.palm||[.052,-.010,0]);
 const pole=v(contact?.elbowPole||[-.12,-1,side*.55]).applyQuaternion(spineQ);
 if(contact?.weaponElbowPole)pole.lerp(v(contact.weaponElbowPole).applyQuaternion(gunQ),aim);
 else pole.lerp(v(side===1&&carry?.raiseArc?.aimPole||[-.12,-1,side*.55]),aim);
 if(side===1&&carry?.stockFitted)pole.lerp(v((carry.raiseArc||STOCK_RAISE_ARC).pole).applyQuaternion(gunQ),Math.sin(Math.PI*aim));
 return {quaternion,palm,pole,fingerCurl:contact?.fingerCurl??-.9};
}
