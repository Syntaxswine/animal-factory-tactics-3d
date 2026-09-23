import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1000,height:750}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await fs.mkdir('artifacts/cliff-live',{recursive:true});
try{await page.goto('http://127.0.0.1:4323/tactics/cliff-climb-study.html');await page.waitForFunction(()=>window.cliffClimbStudy?.ready);
 await page.evaluate(async()=>{
  const {BattleRenderer}=await import('./battle-renderer.js'),{blankMap,setTerrain}=await import('./core/maps.js'),{createGame,move,stepMovement}=await import('./core/engine.js');
  const m=blankMap();m.starts[0]={x:8,y:8,z:0};m.climbs=[{x:8,y:8,z:0,dx:1,dy:0,kind:'cliff'}];for(let y=7;y<=9;y++){m.props.push({kind:'cliff-ledge',x:9,y,z:0});setTerrain(m,9,y,1,'floor');}
  const state=createGame(1,m,true,'easy'),u=state.units[0];Object.assign(u,{species:'horse',weapon:'rifle',ap:12});state.phase='player';state.clock={minutes:600};const renderer=new BattleRenderer();renderer.state=state;await renderer.loadModel(u);renderer.actor(u);move(state,u,9,8,1);stepMovement(state);
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=750;document.body.replaceChildren(canvas);const ctx=canvas.getContext('2d');
  window.live={state,u,renderer,canvas,draw(now){renderer.presentationNow=now;ctx.clearRect(0,0,1000,750);renderer.draw(ctx,state,{x:500,y:-140,zoom:2},1000,750,now>=6900?1:0);return {busy:renderer.busy,active:!!renderer.traversal.active,position:renderer.traversal.active?.position,errors:renderer.diagnostics};}};
 });
 const frames=[];for(const now of [0,1150,2600,3650,4900,6800,6900]){const result=await page.evaluate(t=>window.live.draw(t),now);frames.push({now,...result});await page.screenshot({path:`artifacts/cliff-live/${now}.png`});}console.log(JSON.stringify({frames,errors}));if(errors.length||frames.some(f=>f.errors.length)||frames.at(-1).busy||!frames[2].position)throw Error('Live integration smoke failed');
}finally{await browser.close();}
