import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist/assets/environment/sand-cliff');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(process.env.CLIFF_STUDY_URL||'http://127.0.0.1:4435/tactics/cliff-study.html');
 const result=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createPaintedSand}=await import('./painted-sand.js'),size=512,renderer=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false,alpha:true});renderer.setSize(size,size,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);
  const scene=new T.Scene(),half=size/(size-1),camera=new T.OrthographicCamera(-half,half,half,-half,.1,10);camera.position.set(1,5,1);camera.up.set(0,0,-1);camera.lookAt(1,0,1);
  const images=[],metrics=[];
  for(const feather of [false,true]){
   const geometry=new T.PlaneGeometry(feather?2:4,feather?2:4);geometry.rotateX(-Math.PI/2);const mesh=new T.Mesh(geometry,createPaintedSand({unlit:true,feather}));mesh.position.set(1,0,1);scene.add(mesh);renderer.render(scene,camera);images.push(renderer.domElement.toDataURL('image/png'));
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const p=ctx.getImageData(0,0,size,size).data;let borderError=0,borderAlpha=0,partial=0;
   for(let i=0;i<size;i++)for(let channel=0;channel<3;channel++)borderError=Math.max(borderError,Math.abs(p[i*size*4+channel]-p[(i*size+size-1)*4+channel]),Math.abs(p[i*4+channel]-p[((size-1)*size+i)*4+channel]));
   for(let i=0;i<size;i++)for(const idx of [i*size,i*size+size-1,i,(size-1)*size+i])borderAlpha=Math.max(borderAlpha,p[idx*4+3]);
   for(let i=3;i<p.length;i+=4)if(p[i]>0&&p[i]<255)partial++;
   metrics.push({borderError,borderAlpha,partial,centerAlpha:p[((size/2)*size+size/2)*4+3]});
   mesh.position.y=2;renderer.render(scene,camera);if(renderer.domElement.toDataURL('image/png')!==images.at(-1))throw Error('Sand changes with elevation');scene.remove(mesh);mesh.material.dispose();geometry.dispose();
  }
  renderer.dispose();return {images,metrics};
 });
 if(result.metrics[0].borderError>2||result.metrics[1].borderAlpha!==0||result.metrics[1].partial<10000||result.metrics[1].centerAlpha!==255)throw Error(JSON.stringify(result.metrics));
 await fs.mkdir(out,{recursive:true});for(let i=0;i<2;i++)await fs.writeFile(path.join(out,['sand.png','sand-feather.png'][i]),Buffer.from(result.images[i].split(',')[1],'base64'));
 await fs.writeFile(path.join(out,'tiles.json'),JSON.stringify({id:'sand-cliff',name:'Cliff sand',version:1,tileWorldSize:2,pixels:512,colorSpace:'sRGB',alpha:'Straight (PNG); no baked grass or ground colour',tiles:['sand.png','sand-feather.png'],usage:'sand.png repeats without rotation. sand-feather.png is an isolated alpha patch over any local ground; its transparent border reveals the actual underlying material. Top of image is north (-Z). Paint only, independent of navigation.',source:'tactics/painted-sand.js',validation:result.metrics},null,2)+'\n');
 console.log('Saved opaque seamless sand and feathered RGBA ground sprite:',result.metrics);
}finally{await browser.close();}
