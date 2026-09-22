// Complete surfaces hidden behind resting arms with the character's own paint.
// These bind-space repairs belong to the motion study, not the static models.
export function animalMotionRepairPaint(profile,layers=null){
 const overalls=['horse','bull','cow','rabbit','skunk'].includes(profile.id);
 if(!overalls&&!['sheep','donkey','pig-foreman'].includes(profile.id))return layers;
 const result=layers||{uniforms:{},declarations:'',application:'',dispose(){}};
 const f=profile.frame;
 const sample=(view,x,y)=>`texture2D(uModelPaint,vec2((${view+.5}+(${x})/${f.width})/4.,.5+((${y})-${f.centerY})/${f.height})).rgb`;
 const apply=(mask,color)=>`diffuseColor.rgb=mix(diffuseColor.rgb,${color},${mask});coverage*=1.-${mask};filled=max(filled,${mask});`;
 if(overalls)result.application+=`
 if(abs(vPaintPart-2.)<.1){
  float sidePanel=smoothstep(.10,.15,abs(p.z))*(1.-smoothstep(.10,.16,abs(p.x)))*smoothstep(.73,.79,p.y)*(1.-smoothstep(1.02,1.10,p.y));
  vec3 cloth=${sample(2,'.10+p.x*.6','.78+(p.y-.83)*.4')}*(.90+.10*abs(n.z));
  ${apply('sidePanel','cloth')}
 }
 `;
 // One profile source across the nape avoids a left/right texture seam.
 if(profile.id==='pig-foreman')result.application+=`
 if(abs(vPaintPart-7.)<.1){
  float neck=(1.-smoothstep(1.34,1.375,p.y))*(1.-smoothstep(.015,.06,p.x));
  vec4 skin=paintView(vec3(-.04,1.365+(p.y-1.32)*.25,.13),vec3(0.,0.,1.),1.,false);
  if(skin.a>.001){${apply('neck','skin.rgb/skin.a*(.92+.08*abs(n.z))')}}
 }
 `;
 // The rear thigh footprint remains inside brown fabric, clear of the jacket,
 // tail and background. Use broad transitions without magnifying a seat shadow.
 if(profile.id==='donkey')result.application+=`
 if(abs(vPaintPart-2.)<.1){
  float hip=smoothstep(.10,.18,abs(p.z))*(1.-smoothstep(.09,.20,abs(p.x)))*smoothstep(.66,.82,p.y);
  ${apply('hip',sample(2,'.16+p.x*.35','.62+(p.y-.83)*.8'))}
 }
 if(abs(vPaintPart-1.)<.1){
  float panel=smoothstep(.14,.19,abs(p.z))*(1.-smoothstep(.105,.15,abs(p.x)))*smoothstep(.84,.87,p.y)*(1.-smoothstep(1.06,1.12,p.y));
  ${apply('panel',sample(2,'.08+p.x*.5','1.09+(p.y-.95)*.35'))}
 }
 `;
 if(profile.id==='sheep')result.application+=`
 if(abs(vPaintPart-1.)<.1){
  float shoulder=smoothstep(.19,.24,abs(p.z))*smoothstep(1.16,1.23,p.y);
  ${apply('shoulder',sample(0,'sign(p.z)*.28+p.x*.3','1.12+(p.y-1.20)*.3'))}
 }
 if(abs(vPaintPart-9.)<.1){
  float panel=smoothstep(.14,.19,abs(p.z))*(1.-smoothstep(.08,.13,abs(p.x)))*smoothstep(.93,.97,p.y)*(1.-smoothstep(1.23,1.27,p.y));
  vec4 cloth=sheepCloth(vec3(-.18,1.14+(p.y-1.1)*.25,p.x*.5+.07),vec3(-1.,0.,0.),2.);
  if(cloth.a>.001){${apply('panel','cloth.rgb/cloth.a')}}
 }
 `;
 return result;
}
