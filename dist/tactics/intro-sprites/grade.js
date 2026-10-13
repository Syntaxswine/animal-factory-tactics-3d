// Warm light, cool shadow: the storyboard's split tone, measured on its forest
// panels (INTRO-SPRITE-PROOF.md). Lit foliage and grass sit at hue 39-43 deg;
// shade sits at hue 64-98 deg with about half the saturation. A CSS filter
// cannot do this (it moves every tone together), so it runs per pixel, once,
// on static art: the painted plate, each baked aircraft frame and the stills.
export const SPLIT=Object.freeze({warmHue:37,warm:.85,coolHue:90,cool:1,shadeSat:.8,shadeDark:.2});
// The aircraft's olive paint is mid-dark, so the full split would read it as
// shade and turn it grey-green; it gets the same warm light, a lighter cool.
export const SPLIT_AIRCRAFT=Object.freeze({warmHue:37,warm:.6,coolHue:80,cool:.35,shadeSat:.25,shadeDark:.05});
const smooth=(a,b,t)=>{t=(t-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
// Move hue h toward target by fraction k, the short way round the circle.
const toward=(h,target,k)=>{let d=target-h;if(d>180)d-=360;if(d<-180)d+=360;return (h+d*k+360)%360;};
export function splitTone(data,S=SPLIT){
 for(let i=0;i<data.length;i+=4){
  if(data[i+3]===0)continue;
  const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),v=max,c=max-min;
  let s=max?c/max:0;if(s<.06)continue; // greys (rock, smoke) keep their own colour
  let h=c===0?0:max===r?60*(((g-b)/c+6)%6):max===g?60*((b-r)/c+2):60*((r-g)/c+4);
  // Only the vegetation band (yellows to greens): sky, rust and skin keep theirs.
  if(h<18||h>170)continue;
  // Hue moves with colour strength: foliage (s > .3) takes the full split,
  // ochre-grey rock (s .1-.25) keeps its own hue and the cliff's own cool light.
  const lit=smooth(.3,.66,v),shade=smooth(.62,.2,v),chroma=smooth(.1,.32,s);
  h=toward(h,S.warmHue,lit*S.warm*chroma);h=toward(h,S.coolHue,shade*S.cool*chroma);
  s*=1-shade*S.shadeSat;const vv=v*(1-shade*S.shadeDark);
  // HSV back to RGB.
  const C=vv*s,X=C*(1-Math.abs((h/60)%2-1)),m=vv-C,k=Math.floor(h/60)%6;
  const [R,G,B]=k===0?[C,X,0]:k===1?[X,C,0]:k===2?[0,C,X]:k===3?[0,X,C]:k===4?[X,0,C]:[C,0,X];
  data[i]=(R+m)*255;data[i+1]=(G+m)*255;data[i+2]=(B+m)*255;
 }
 return data;
}
export function splitToneCanvas(canvas,S=SPLIT){
 const g=canvas.getContext('2d',{willReadFrequently:true}),img=g.getImageData(0,0,canvas.width,canvas.height);
 splitTone(img.data,S);g.putImageData(img,0,0);return canvas;
}
