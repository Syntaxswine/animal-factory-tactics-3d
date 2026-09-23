// A high, wide knee exposes the underside crotch bridge, which none of the
// neutral turnaround cameras painted cleanly. Borrow the same outfit's rear
// trouser cloth only on that downward-facing bind-space patch.
export function createCliffClimbPaint(worker,profile){
 const material=worker.parts[0].material;
 if(profile.id!=='horse'||!worker.parts[0].geometry.hasAttribute('paintPart'))return {set(){},dispose(){}};
 const hook=material.onBeforeCompile,key=material.customProgramCacheKey,strength={value:0};let active=false,disposed=false;
 function patch(shader,renderer){
  hook.call(material,shader,renderer);
  if(!shader.uniforms.uModelPaint)return;
  if(!shader.fragmentShader.includes('#include <alphamap_fragment>'))throw Error('Cliff cloth paint requires the post-color alpha-map shader chunk');
  const sampler=shader.uniforms.uRedHatUniform?'uRedHatUniform':'uModelPaint';
  shader.uniforms.cliffClothStrength=strength;
  shader.fragmentShader='uniform float cliffClothStrength;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`
   if(abs(vPaintPart-2.)<.1){
    float underside=smoothstep(.585,.610,p.y)*(1.-smoothstep(.650,.695,p.y))
      *(1.-smoothstep(.025,.065,abs(p.z)))*(1.-smoothstep(-.70,-.40,n.y))
      *smoothstep(-.165,-.130,p.x)*(1.-smoothstep(.045,.085,p.x));
    vec2 clothUV=vec2((2.5+(.17+(p.x+.04)*.35)/.925)/4.,.5+(.56+(p.y-.62)*2.+p.z*.4-.825)/1.85);
    vec3 cloth=texture2D(${sampler},clothUV).rgb*.9;
    diffuseColor.rgb=mix(diffuseColor.rgb,cloth,underside*cliffClothStrength);
   }
   #include <alphamap_fragment>`);
 }
 function set(value){if(disposed)return;strength.value=Number(value);const enabled=value>0;if(enabled===active)return;active=enabled;material.onBeforeCompile=enabled?patch:hook;material.customProgramCacheKey=enabled?()=>key.call(material)+'-cliff-crotch-v1':key;material.needsUpdate=true;}
 return {set,dispose(){if(disposed)return;set(0);disposed=true;}};
}
