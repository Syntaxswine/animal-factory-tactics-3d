// Bake the actual ground shader, including its shared borders, into ordinary
// PNG tiles. Source imagegen atlases are preserved unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(import.meta.dirname,'../dist/assets/environment/biome-foliage/ground-tiles'),owner=await launchSiteReview(chromium,'ground-export-'+Date.now(),'biome-foliage');fs.mkdirSync(out,{recursive:true});
try{
 const page=await owner.browser.newPage();await page.goto(process.env.BIOME_REVIEW_URL||'http://127.0.0.1:4476/tactics/biome-foliage-study.html');await page.waitForFunction(()=>window.biomeReady||window.biomeDisposed,{timeout:60000});if(!await page.evaluate(()=>window.biomeReady))throw Error('Ground study failed');
 const result=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{BIOME_GROUNDS}=await import('./biome-foliage-data.js'),{createBiomeGround}=await import('./biome-foliage-paint.js');
  const r=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false}),scene=new T.Scene(),camera=new T.OrthographicCamera(0,2,2,0,.1,20),geometry=new T.PlaneGeometry(2,2);r.setSize(512,512,false);r.outputColorSpace=T.SRGBColorSpace;
  camera.position.set(0,10,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);const plane=new T.Mesh(geometry,null);plane.rotation.x=-Math.PI/2;plane.position.set(1,0,-1);scene.add(plane);const tiles=[],seams={};
  try{for(const kind of Object.keys(BIOME_GROUNDS)){const edges=[];
   for(let variant=0;variant<4;variant++){const m=createBiomeGround(biomeStudy.textures.ground,kind,{variant,unlit:true});plane.material=m;r.render(scene,camera);const pixels=new Uint8Array(512*512*4),gl=r.getContext();gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const edge={left:[],right:[],top:[],bottom:[]};for(let i=0;i<512;i++)for(let c=0;c<3;c++){edge.left.push(pixels[(i*512)*4+c]);edge.right.push(pixels[(i*512+511)*4+c]);edge.bottom.push(pixels[i*4+c]);edge.top.push(pixels[((511*512)+i)*4+c]);}edges.push(edge);tiles.push({kind,variant,png:r.domElement.toDataURL('image/png')});m.dispose();}
   let maximum=0;for(const a of edges)for(const b of edges)for(let i=0;i<512*3;i++)maximum=Math.max(maximum,Math.abs(a.left[i]-b.right[i]),Math.abs(a.top[i]-b.bottom[i]));seams[kind]=maximum;
  }}finally{geometry.dispose();r.dispose();r.forceContextLoss();}return {tiles,seams};
 });
 for(const [kind,maximum]of Object.entries(result.seams))if(maximum>2)throw Error('Unmatched ground borders: '+kind+' '+maximum);
 for(const tile of result.tiles){const folder=path.join(out,tile.kind);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'ground-'+tile.variant+'.png'),Buffer.from(tile.png.split(',')[1],'base64'));}
 const manifest={created:'2026-10-12',tileWorldSize:2,pixels:512,colorSpace:'sRGB',north:'Top of image is north (-Z).',variants:4,source:'../ground-atlas-v1.png',recipe:'tactics/biome-foliage-paint.js',usage:'Unlit albedo. Any of the four variants in one family can neighbor any other without rotation. Cross-family blending and automatic selection belong to gameplay integration.',maximumBorderChannelErrors:result.seams,families:Object.fromEntries(Object.keys(result.seams).map(k=>[k,[0,1,2,3].map(i=>k+'/ground-'+i+'.png')]))};fs.writeFileSync(path.join(out,'tiles.json'),JSON.stringify(manifest,null,2));await page.evaluate(()=>biomeStudy.dispose());console.log(JSON.stringify({tiles:result.tiles.length,maximumBorderChannelErrors:result.seams}));
}finally{await owner.closeReview();}
