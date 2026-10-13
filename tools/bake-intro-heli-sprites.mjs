// Bake helicopter sprites for the intro keyframe proof from the existing intro rig.
// The 3D study supplies the airframe states (damaged tail, buckled skids, broken
// rotor, open door); this tool only photographs them through the GAME camera
// (azimuth 45 deg, elevation 30 deg, 2:1) on a transparent background.
//
//   node tools/bake-intro-heli-sprites.mjs [baseUrl]
//
// Needs a server on dist/ (default http://127.0.0.1:4496, `PORT=4496 node tools/serve.mjs`).
// Writes dist/tactics/intro-sprites/heli/<name>.png + heli.json (anchor = model origin).
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const base=process.argv[2]||'http://127.0.0.1:4496';
const out=fileURLToPath(new URL('../dist/tactics/intro-sprites/heli/',import.meta.url));
// Sprite scale: pixels per world unit across the screen (a 2:1 tile is 64 px
// wide), so keyframes up to that zoom stay crisp.
const PPU=64/Math.SQRT2;
// name, study time, overrides. Heading is always world +X (screen right-down),
// so every keyframe keeps the nose toward screen right. pitch: +nose up (rad).
const SHOTS=[
 {name:'descent',time:23.0,pitch:-.42,roll:.10,rotor:'blur'},
 {name:'flare',time:25.3,pitch:.20,roll:.04,rotor:'blur'},
 {name:'impact',time:26.85,rotor:'blur'},
 {name:'strike',time:28.3,rotor:'model'},
 {name:'settled',time:34.7,rotor:'model'},
];
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.goto(base+'/tactics/intro-study.html?time=0',{waitUntil:'load'});
await page.waitForFunction(()=>window.introReady===true,null,{timeout:60000});
await mkdir(out,{recursive:true});
const meta={ppu:PPU,camera:{azimuth:Math.PI/4,elevation:Math.PI/6},note:'anchor = helicopter model origin (cabin, ground level when landed); shadow anchor = the same point dropped to the ground',sprites:{}};
for(const shot of SHOTS){
 const r=await page.evaluate(async({shot,PPU})=>{
  const {renderer,scene,helicopter,environment,effects}=window.introStudy;
  const T=await import('./vendor/three.module.js');
  window.introStudy.set?.(shot.time);
  helicopter.update(shot.time);
  const root=helicopter.root;
  // Keep the study's pitch/roll unless art-directed; cancel its yaw so the nose is +X.
  const pitch=shot.pitch??root.rotation.z,roll=shot.roll??root.rotation.x;
  const height=root.position.y;
  root.position.set(0,shot.time>26?root.position.y:0,0);root.rotation.set(roll,0,pitch);root.updateMatrixWorld(true);
  const hidden=[];scene.traverse(o=>{if(o!==scene&&o.parent===scene&&o!==root&&!o.isLight){if(o.visible){hidden.push(o);o.visible=false;}}});
  // The study's blur ring is unnamed; the 2D compositor paints the spinning disc
  // instead, so flight bakes hide the ring AND the frozen blades (a stopped rotor
  // reads wrong in flight). Landed bakes keep the real, broken blades.
  const toggled=[];const hide=o=>{if(o&&o.visible){o.visible=false;toggled.push(o);}};
  root.traverse(o=>{if(o.geometry?.type==='RingGeometry')hide(o);});
  const rotor=helicopter.rotor;
  hide(helicopter.marks); // skid furrows are painted in 2D, along the slide
  if(shot.rotor==='blur')for(const c of rotor.children)if(c.name!=='Rotor hub')hide(c);
  rotor.updateMatrixWorld(true);
  const bg=scene.background,fog=scene.fog;scene.background=null;scene.fog=null;
  // Neutral light for the bake: the study's warm grade turned the olive paint
  // gold; the 2D compositor applies the keyframe's own light.
  const lights=[];scene.traverse(o=>{if(o.isLight){lights.push([o,o.color.clone(),o.intensity,o.groundColor?.clone()]);if(o.isHemisphereLight){o.color.set(0xf4f6f0);o.groundColor.set(0x6f7464);o.intensity=1.9;}else if(o.isDirectionalLight){o.color.set(0xfffaf0);o.intensity=2.2;}}});
  const W=1020,H=750,cam=new T.OrthographicCamera(-W/2/PPU,W/2/PPU,H/2/PPU,-H/2/PPU,.1,400);
  const el=Math.PI/6,dir=new T.Vector3(Math.cos(el)/Math.SQRT2,Math.sin(el),Math.cos(el)/Math.SQRT2);
  const target=new T.Vector3(0,1.2,0);cam.position.copy(target).addScaledVector(dir,150);cam.up.set(-Math.sin(el)/Math.SQRT2,Math.cos(el),-Math.sin(el)/Math.SQRT2);cam.lookAt(target);cam.updateMatrixWorld(true);
  const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),shadow=renderer.shadowMap.enabled;
  renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.setClearColor(0x000000,0);
  renderer.render(scene,cam);
  const png=renderer.domElement.toDataURL('image/png');
  // Anchor: model origin on screen.
  const px=v=>{const q=v.clone().project(cam);return [(q.x+1)/2*W,(1-q.y)/2*H];};
  const anchor=px(new T.Vector3(0,0,0));
  // Rotor disc in sprite pixels: hub centre plus the two radius vectors of the
  // blade plane (rotor-local X and Z, radius 4.78 as the study's blur ring).
  const hub=new T.Vector3().setFromMatrixPosition(rotor.matrixWorld),q=new T.Quaternion();rotor.getWorldQuaternion(q);
  const ax=new T.Vector3(1,0,0).applyQuaternion(q).multiplyScalar(4.78).add(hub),az=new T.Vector3(0,0,1).applyQuaternion(q).multiplyScalar(4.78).add(hub);
  const h=px(hub),disc={hub:h,u:px(ax).map((v,i)=>v-h[i]),v:px(az).map((v,i)=>v-h[i]),hubWorld:hub.toArray()};
  // Ground shadow: flatten the airframe onto y=0 with a sun slightly off vertical.
  const sun=new T.Vector3(12,35,20).normalize() /* the study's sun position */,flat=new T.Matrix4().set(1,-sun.x/sun.y,0,0, 0,0,0,0, 0,-sun.z/sun.y,1,0, 0,0,0,1);
  const black=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide});
  const casts=[];root.traverse(o=>{if(o.isMesh&&o.visible&&o.userData?.paint!=='soil'&&!/soil|mark|furrow|blur/i.test(o.name)){let v=true;for(let p=o;p;p=p.parent)if(!p.visible){v=false;break;}if(v)casts.push(o);}});
  const proxy=new T.Group();scene.add(proxy);
  const lift=new T.Matrix4().makeTranslation(0,-height*0,0);
  for(const m of casts){const c=new T.Mesh(m.geometry,black);c.matrixAutoUpdate=false;c.matrix.copy(flat).multiply(m.matrixWorld);proxy.add(c);}
  root.visible=false;proxy.updateMatrixWorld(true);renderer.render(scene,cam);const shadowPng=renderer.domElement.toDataURL('image/png');
  scene.remove(proxy);black.dispose();root.visible=true;for(const o of toggled)o.visible=true;
  for(const [o,c,i,g]of lights){o.color.copy(c);o.intensity=i;if(g)o.groundColor.copy(g);}
  scene.background=bg;scene.fog=fog;for(const o of hidden)o.visible=true;renderer.setClearColor(clear,alpha);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);renderer.shadowMap.enabled=shadow;
  return {png,shadowPng,anchor,disc,W,H,studyHeight:height,pitch,roll,casts:casts.length};
 },{shot,PPU});
 await writeFile(out+shot.name+'.png',Buffer.from(r.png.split(',')[1],'base64'));
 await writeFile(out+shot.name+'-shadow.png',Buffer.from(r.shadowPng.split(',')[1],'base64'));
 meta.sprites[shot.name]={file:shot.name+'.png',shadow:shot.name+'-shadow.png',time:shot.time,anchor:r.anchor,rotor:shot.rotor,disc:r.disc,size:[r.W,r.H],pitch:r.pitch,roll:r.roll,studyHeight:r.studyHeight};
 console.log(shot.name,'casts',r.casts,'anchor',r.anchor.map(v=>v.toFixed(1)).join(','),'pitch',r.pitch.toFixed(3),'roll',r.roll.toFixed(3),'study height',r.studyHeight.toFixed(2));
}
await writeFile(out+'heli.json',JSON.stringify(meta,null,1)+'\n');
await browser.close();
