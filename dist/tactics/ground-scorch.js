import * as T from './vendor/three.module.js';

export const SCORCH_ATLAS='../assets/effects/painted-fire/ground-scorch-atlas-v1.png';
const hash=(x,z,y,salt)=>{let n=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(Math.round(y*1000),1442695041)^salt;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};

// Callers supply actual burned, dry, horizontal tiles in render-world coordinates.
// The decal never changes terrain or expires implicitly. A study can scrub amount
// to zero; a game owner retains these cells until it deliberately clears them.
export function scorchCells(input){
 if(!Array.isArray(input))throw Error('Scorch needs a list of burned tiles');
 const cells=new Map();
 for(const p of input){const {x,z}=p||{},y=p?.y??0;if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)||!Number.isFinite(y))throw Error('Scorch tile needs integer X/Z and finite ground height');const key=[y,x,z].join(',');cells.set(key,{x,y,z});}
 return [...cells.values()].sort((a,b)=>a.y-b.y||a.x-b.x||a.z-b.z);
}

export async function createGroundScorch(scene,loader){
 const atlas=await loader.loadAsync(SCORCH_ATLAS);atlas.colorSpace=T.SRGBColorSpace;
 const group=new T.Group();group.name='Persistent painted ground scorch';scene.add(group);
 const opacity={value:1};let batches=[],key='',count=0,disposed=false;
 function release(){for(const b of batches){b.mesh.removeFromParent();b.mesh.geometry.dispose();b.mesh.material.dispose();b.mask.dispose();b.mesh.dispose();}batches=[];count=0;}
 function setCells(input){
  if(disposed)throw Error('Scorch is disposed');const cells=scorchCells(input),next=JSON.stringify(cells);if(next===key)return;
  const levels=new Map();for(const p of cells){if(!levels.has(p.y))levels.set(p.y,[]);levels.get(p.y).push(p);}
  for(const tiles of levels.values()){const xs=tiles.map(p=>p.x),zs=tiles.map(p=>p.z);if(Math.max(...xs)-Math.min(...xs)>=2048||Math.max(...zs)-Math.min(...zs)>=2048)throw Error('Scorch patch exceeds 2048 tiles; partition distant regions');}
  key=next;release();count=cells.length;group.visible=opacity.value>0&&count>0;
  for(const [y,tiles]of levels){
   const minX=Math.min(...tiles.map(p=>p.x)),minZ=Math.min(...tiles.map(p=>p.z)),width=Math.max(...tiles.map(p=>p.x))-minX+1,height=Math.max(...tiles.map(p=>p.z))-minZ+1;
   const data=new Uint8Array(width*height*4);for(const p of tiles){const i=((p.z-minZ)*width+p.x-minX)*4;data[i+3]=255;}
   const mask=new T.DataTexture(data,width,height);mask.minFilter=mask.magFilter=T.NearestFilter;mask.needsUpdate=true;
   const geometry=new T.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
   const styles=new Float32Array(tiles.length*2);geometry.setAttribute('scorchStyle',new T.InstancedBufferAttribute(styles,2));
   const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:{atlas:{value:atlas},mask:{value:mask},bounds:{value:new T.Vector4(minX-.5,minZ-.5,width,height)},amount:opacity},
    vertexShader:`attribute vec2 scorchStyle;varying vec2 vUv,vStyle;varying vec3 vWorld;void main(){vUv=uv;vStyle=scorchStyle;vec4 p=instanceMatrix*vec4(position,1.0);vWorld=(modelMatrix*p).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader:`uniform sampler2D atlas,mask;uniform vec4 bounds;uniform float amount;varying vec2 vUv,vStyle;varying vec3 vWorld;
     void main(){vec2 maskUv=(vWorld.xz-bounds.xy)/bounds.zw;if(any(lessThan(maskUv,vec2(0.0)))||any(greaterThanEqual(maskUv,vec2(1.0)))||texture2D(mask,maskUv).a<.5)discard;
      vec2 at=maskUv*bounds.zw,cell=floor(at),within=fract(at);float edge=1.0;
      for(int x=-1;x<=1;x++)for(int z=-1;z<=1;z++){vec2 n=vec2(float(x),float(z)),uv=(cell+n+.5)/bounds.zw;
       if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0)))||texture2D(mask,uv).a<.5){vec2 d=max(max(n-within,within-n-1.0),vec2(0.0));edge=min(edge,length(d));}}
      vec2 frame=vec2(mod(vStyle.x,2.0),1.0-floor(vStyle.x/2.0));vec4 c=texture2D(atlas,(frame+clamp(vUv,.006,.994))*.5);
      c.a*=amount*vStyle.y*smoothstep(.012,.20,edge);if(c.a<.01)discard;gl_FragColor=c;
      #include <colorspace_fragment>
     }`
   });
   const mesh=new T.InstancedMesh(geometry,material,tiles.length);mesh.name='Scorched tiles at height '+y;mesh.renderOrder=-1;
   const matrix=new T.Matrix4(),rotation=new T.Quaternion();
   tiles.forEach((p,i)=>{const variant=Math.floor(hash(p.x,p.z,p.y,19)*4),angle=hash(p.x,p.z,p.y,73)*Math.PI*2,size=1.55+.25*hash(p.x,p.z,p.y,131);styles[i*2]=variant;styles[i*2+1]=.64+.18*hash(p.x,p.z,p.y,199);rotation.setFromAxisAngle(new T.Vector3(0,1,0),angle);matrix.compose(new T.Vector3(p.x,y+.003,p.z),rotation,new T.Vector3(size,1,size));mesh.setMatrixAt(i,matrix);});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);batches.push({mesh,mask,tiles,y});
  }
 }
 return {group,get count(){return count;},get batches(){return batches;},setCells,
  setAmount(value){opacity.value=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;group.visible=opacity.value>0&&count>0;},
  dispose(){if(disposed)return;disposed=true;release();atlas.dispose();group.removeFromParent();}
 };
}
