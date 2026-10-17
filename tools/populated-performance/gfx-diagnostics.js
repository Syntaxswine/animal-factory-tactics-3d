// Cold-load diagnostic only. Never loaded by the shipped game or timing runs.
(()=>{
 const failures=[],warnings=[],budgets=[],contexts=[],closed=new WeakSet(),seenBudgets=new Set(),programIds=new WeakMap();let nextProgram=0,draw=null,upload=null,capture=false;
 const describe=v=>v===null||typeof v!=='object'?v:ArrayBuffer.isView(v)?{type:v.constructor.name,bytes:v.byteLength}:{type:v.constructor.name,width:v.width,height:v.height,url:v.currentSrc||v.src,closed:closed.has(v)};
 if(globalThis.ImageBitmap){const close=ImageBitmap.prototype.close;ImageBitmap.prototype.close=function(){closed.add(this);return close.call(this);};}
 const state=new WeakMap();
 function context(gl){if(state.has(gl))return state.get(gl);const s={gl,program:null,unit:0,textures:new Map(),storage:new Map(),sources:new Map(),shaders:new Map(),locations:new Map(),uniforms:new Map(),pixelStore:{}};state.set(gl,s);contexts.push(s);return s;}
 function budget(s){const gl=s.gl,p=s.program;if(!p)return null;const shaders=(s.shaders.get(p)||[]).map(sh=>({stage:gl.getShaderParameter(sh,gl.SHADER_TYPE)===gl.VERTEX_SHADER?'vertex':'fragment',source:s.sources.get(sh)}));const samplers=[];for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);if([gl.SAMPLER_2D,gl.SAMPLER_CUBE,gl.SAMPLER_2D_SHADOW,gl.SAMPLER_CUBE_SHADOW,gl.INT_SAMPLER_2D,gl.SAMPLER_2D_ARRAY].includes(u.type)){const loc=gl.getUniformLocation(p,u.name);samplers.push({name:u.name,size:u.size,type:u.type,units:Array.from({length:u.size},(_,j)=>gl.getUniform(p,gl.getUniformLocation(p,u.size>1?u.name.replace(/\[0\]$/,'['+j+']'):u.name))),stages:shaders.filter(sh=>new RegExp('\\b'+u.name.replace(/\[.*$/,'')+'\\b').test(sh.source)).map(sh=>sh.stage)});}}return {linked:gl.getProgramParameter(p,gl.LINK_STATUS),log:gl.getProgramInfoLog(p),samplers,shaders,limits:{fragment:gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),vertex:gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),combined:gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)}};}
 const originals=new Map();
 for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const name of Object.getOwnPropertyNames(proto)){
  const d=Object.getOwnPropertyDescriptor(proto,name);if(name==='constructor'||name==='getError'||typeof d.value!=='function')continue;const fn=d.value;originals.set(proto.constructor.name+name,fn);
  proto[name]=function(...args){if(capture)return fn.apply(this,args);const s=context(this);capture=true;let value;
   try{
    if(name==='useProgram')s.program=args[0];
    if(name==='activeTexture')s.unit=args[0]-this.TEXTURE0;
    if(name==='bindTexture')s.textures.set(s.unit+':'+args[0],args[1]);
    if(name==='pixelStorei')s.pixelStore[args[0]]=args[1];
    if(name==='shaderSource')s.sources.set(args[0],args[1]);
    if(name==='attachShader'){if(!s.shaders.has(args[0]))s.shaders.set(args[0],[]);s.shaders.get(args[0]).push(args[1]);}
    const texture=s.textures.get(s.unit+':'+args[0]);
    if(name==='texStorage2D')s.storage.set(texture,{levels:args[1],format:args[2],width:args[3],height:args[4]});
    value=fn.apply(this,args);
    if(name==='linkProgram'&&!this.getProgramParameter(args[0],this.LINK_STATUS)&&failures.length<12)failures.push({name:'linkProgram',linked:false,log:this.getProgramInfoLog(args[0]),draw,shaders:(s.shaders.get(args[0])||[]).map(sh=>({log:this.getShaderInfoLog(sh),source:s.sources.get(sh)}))});
    const error=/^(tex|compressedTex|copyTex|linkProgram)/.test(name)?this.getError():0;if(error&&failures.length<12)failures.push({name,error,args:args.map(describe),texture:upload,storage:s.storage.get(texture),pixelStore:{...s.pixelStore},draw,stack:new Error().stack});
    if((name==='drawElements'||name==='drawArrays'||name==='drawElementsInstanced')&&draw&&['MeshStandardMaterial','MeshLambertMaterial','MeshPhongMaterial'].includes(draw.materialType)&&budgets.length<800){
     if(!programIds.has(s.program))programIds.set(s.program,nextProgram++);const key=draw.materialId+':'+programIds.get(s.program);if(!seenBudgets.has(key)){seenBudgets.add(key);budgets.push({key,draw,program:budget(s)});}
    }
   }finally{capture=false;}return value;
  };
 }
 const warn=console.warn;console.warn=(...args)=>{if(warnings.length<12&&args.join(' ').includes('texture units')){capture=true;try{warnings.push({message:args.map(String).join(' '),draw,upload,program:contexts.length?budget(contexts.at(-1)):null});}finally{capture=false;}}warn(...args);};
 globalThis.gfxDiagnostic={draw(object,material,scene){const parents=[];for(let o=object;o;o=o.parent)parents.push({name:o.name,type:o.type,data:Object.fromEntries(Object.entries(o.userData).filter(([k,v])=>v===null||["string","number","boolean"].includes(typeof v)))});const lights=[];scene?.traverse?.(o=>{if(o.isLight&&o.visible)lights.push({type:o.type,shadow:o.castShadow,intensity:o.intensity});});draw={name:object.name,type:object.type,parents,materialId:material.id,material:material.name,materialType:material.type,cacheKey:material.customProgramCacheKey(),lights};},upload(t,slot){upload={name:t.name,id:t.id,uuid:t.uuid,version:t.version,slot,source:describe(t.image),colorSpace:t.colorSpace,format:t.format,type:t.type,flipY:t.flipY,unpackAlignment:t.unpackAlignment};},report(){return {failures,warnings,budgets};}};
})();
