// Visual/smoke review of mixed terrain and alpha assets; run against the study server.
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CLIFF_STUDY_URL||'http://127.0.0.1:4435/tactics/cliff-study.html',out=process.env.CLIFF_REVIEW_DIR||'artifacts/cliff-surfaces';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true}),page=await browser.newPage({viewport:{width:1450,height:1000}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await page.goto(base);await page.waitForFunction(()=>window.cliffStudy?.ready);
 for(const layout of ['plateau','gorge','coast'])for(const paint of ['natural','grass','sand'])for(const colour of ['#ffffff','#a4d5b4','#eed098'])for(const grey of [false,true]){
  await page.selectOption('#layout',layout);await page.selectOption('#paint',paint);await page.selectOption('#grass',colour);await page.locator('#grey').setChecked(grey);await page.selectOption('#scale',grey?'58':'auto');await page.click('#variant');
  await page.evaluate(low=>window.cliffStudy.view(low ? .8 : 3.8,low ? .27 : .65),grey);
  results.push({layout,paint,colour,grey,status:await page.locator('#status').textContent()});if(paint==='natural'&&!grey)await page.screenshot({path:`${out}/${layout}-${colour.slice(1)}.png`});
 }
 await page.locator('#grey').uncheck();await page.selectOption('#paint','natural');await page.selectOption('#grass','#ffffff');await page.click('#reset');
 for(const layout of ['atlas','single'])for(const set of ['ledge','crag','both'])for(const grey of [false,true]){
  await page.selectOption('#layout',layout);await page.selectOption('#set',set);await page.locator('#grey').setChecked(grey);results.push({layout,set,grey,status:await page.locator('#status').textContent()});
 }
 await page.selectOption('#layout','plateau');await page.selectOption('#set','mixed');await page.locator('#grey').uncheck();await page.selectOption('#scale','58');await page.evaluate(()=>window.cliffStudy.view(.8,.27));await page.screenshot({path:`${out}/mixed-gameplay-low.png`});
 const assetMetrics=await page.evaluate(async()=>{
  const load=async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {w:c.width,h:c.height,p:ctx.getImageData(0,0,c.width,c.height).data};};
  const solid=await load('../assets/environment/sand-cliff/sand.png'),soft=await load('../assets/environment/sand-cliff/sand-feather.png');let borderError=0,edgeAlpha=0,partial=0;
  if(solid.w!==512||solid.h!==512||soft.w!==512||soft.h!==512)throw Error('Wrong sand sprite dimensions');
  for(let i=0;i<512;i++){
   for(let c=0;c<3;c++)borderError=Math.max(borderError,Math.abs(solid.p[i*512*4+c]-solid.p[(i*512+511)*4+c]),Math.abs(solid.p[i*4+c]-solid.p[(511*512+i)*4+c]));
   for(const p of [i*512,i*512+511,i,511*512+i])edgeAlpha=Math.max(edgeAlpha,soft.p[p*4+3]);
  }
  for(let i=3;i<soft.p.length;i+=4)if(soft.p[i]>0&&soft.p[i]<255)partial++;
  if(borderError>2||edgeAlpha!==0||partial<10000)throw Error('Sand sprite borders/alpha invalid');
  // Render unlit top-down grass/sand blend and inspect real pixels. Grass tint
  // must affect the exposed grass and transition, but never recolour solid sand.
  const T=await import('./vendor/three.module.js'),{createPaintedGrass}=await import('./painted-grass.js'),renderer=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false});renderer.setSize(128,128,false);const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.set(1,5,1);camera.up.set(0,0,-1);camera.lookAt(1,0,1);
  const g=new T.PlaneGeometry(2,2,16,16);g.rotateX(-Math.PI/2);g.translate(1,0,1);const a=g.attributes.position,masks=[];for(let i=0;i<a.count;i++)masks.push(a.getX(i)/2);g.setAttribute('sandBlend',new T.Float32BufferAttribute(masks,1));const material=createPaintedGrass({unlit:true,sand:true}),mesh=new T.Mesh(g,material);scene.add(mesh);
  const pixels=[];for(const tint of [0xffffff,0xa4d5b4]){material.userData.grassTint.value.set(tint);renderer.render(scene,camera);const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0);pixels.push(ctx.getImageData(0,0,128,128).data);}
  const difference=x=>[0,1,2].reduce((sum,c)=>sum+Math.abs(pixels[0][(64*128+x)*4+c]-pixels[1][(64*128+x)*4+c]),0),grassDifference=difference(4),blendDifference=difference(64),sandDifference=difference(123);
  if(grassDifference<10||blendDifference<3||sandDifference!==0)throw Error(`Grass/sand colour coupling: ${grassDifference},${blendDifference},${sandDifference}`);g.dispose();material.dispose();renderer.dispose();
  return {borderError,edgeAlpha,partial,grassDifference,blendDifference,sandDifference};
 });
 await page.setViewportSize({width:390,height:844});await page.selectOption('#scale','auto');await page.screenshot({path:`${out}/mobile.png`});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Mobile horizontal overflow');
 await page.goto(new URL('sand-ground.html',base).href);await page.locator('img').last().waitFor();if(await page.locator('img').evaluateAll(imgs=>imgs.some(i=>!i.complete||!i.naturalWidth)))errors.push('Sand gallery image failed');
 await fs.writeFile(`${out}/results.json`,JSON.stringify({results,assetMetrics,errors},null,2));console.log(JSON.stringify({configurations:results.length,assetMetrics,errors}));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
