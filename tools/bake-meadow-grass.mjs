// Run against the local study server. PLAYWRIGHT_MODULE may name an installed
// Playwright module; default resolves the project's ordinary playwright package.
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist/assets/environment/grass-cliff-meadow');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(process.env.GRASS_STUDY_URL||'http://127.0.0.1:4435/tactics/cliff-study.html');
 const result=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createPaintedGrass}=await import('./painted-grass.js'),size=512,renderer=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false,alpha:false});renderer.setSize(size,size,false);renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),half=size/(size-1),camera=new T.OrthographicCamera(-half,half,half,-half,.1,10);camera.position.set(1,5,1);camera.up.set(0,0,-1);camera.lookAt(1,0,1);
  const geometry=new T.PlaneGeometry(4,4);geometry.rotateX(-Math.PI/2);const mesh=new T.Mesh(geometry);mesh.position.set(1,0,1);scene.add(mesh);
  const images=[],edgeErrors=[],sheet=document.createElement('canvas');sheet.width=sheet.height=size*2;const ctx=sheet.getContext('2d'),firstEdges=[];
  for(let variant=0;variant<4;variant++){
   mesh.material=createPaintedGrass({unlit:true,variant});renderer.render(scene,camera);images.push(renderer.domElement.toDataURL('image/png'));ctx.drawImage(renderer.domElement,(variant%2)*size,Math.floor(variant/2)*size);
   const copy=document.createElement('canvas');copy.width=copy.height=size;const c=copy.getContext('2d');c.drawImage(renderer.domElement,0,0);const p=c.getImageData(0,0,size,size).data,edges=[];let maximum=0;
   for(let i=0;i<size;i++)for(let channel=0;channel<3;channel++){const left=p[(i*size)*4+channel],right=p[(i*size+size-1)*4+channel],top=p[i*4+channel],bottom=p[((size-1)*size+i)*4+channel];maximum=Math.max(maximum,Math.abs(left-right),Math.abs(top-bottom));edges.push(left,top);}
   if(!variant)firstEdges.push(...edges);else edges.forEach((v,i)=>maximum=Math.max(maximum,Math.abs(v-firstEdges[i])));edgeErrors.push(maximum);
   mesh.position.y=2;renderer.render(scene,camera);if(renderer.domElement.toDataURL('image/png')!==images.at(-1))throw Error('Meadow paint changes with elevation');mesh.position.y=0;mesh.material.dispose();
  }
  geometry.dispose();renderer.dispose();return {images,atlas:sheet.toDataURL('image/png'),edgeErrors};
 });
 if(result.edgeErrors.some(n=>n>2))throw Error('Grass border mismatch: '+result.edgeErrors.join(','));
 await fs.mkdir(out,{recursive:true});for(let i=0;i<4;i++)await fs.writeFile(path.join(out,`grass-${i}.png`),Buffer.from(result.images[i].split(',')[1],'base64'));await fs.writeFile(path.join(out,'atlas.png'),Buffer.from(result.atlas.split(',')[1],'base64'));
 await fs.writeFile(path.join(out,'tiles.json'),JSON.stringify({id:'grass-cliff-meadow',name:'Cliff meadow grass',version:1,tileWorldSize:2,pixels:512,colorSpace:'sRGB',usage:'Unlit albedo; shared procedural source in tactics/painted-grass.js. Any variant can neighbor any other without rotation. Top of image is north (-Z).',tiles:Array.from({length:4},(_,i)=>`grass-${i}.png`),atlas:{file:'atlas.png',columns:2,rows:2},maximumBorderChannelErrors:result.edgeErrors},null,2)+'\n');
 console.log('Saved four 512px meadow tiles, 1024px atlas and manifest. Border errors:',result.edgeErrors);
}finally{await browser.close();}
