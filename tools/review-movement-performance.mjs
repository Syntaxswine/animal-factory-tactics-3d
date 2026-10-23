// Standalone CPU reproduction; run while browser benchmarks/tests are idle.
// Inspector sampling adds overhead. Compare like-for-like runs, not these
// numbers with browser frame intervals or GPU timers.
import fs from 'node:fs';
import path from 'node:path';
import {Session} from 'node:inspector';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {foliageReviewFixture} from '../dist/tactics/foliage-review-fixture.js';
import {createGame,refresh,moveGroup,stepMovement} from '../dist/tactics/core/engine.js';

const output=path.resolve(process.argv[2]||'artifacts/movement-review');fs.mkdirSync(output,{recursive:true});
const s=createGame(1947,foliageReviewFixture('temperate','trees-v1','sector'),false,'easy',{social:true,awareness:true,statSystem:true});refresh(s);
const profiler=new Session();profiler.connect();
const post=(method,params={})=>new Promise((resolve,reject)=>profiler.post(method,params,(error,result)=>error?reject(error):resolve(result)));
const commands=[],steps=[];let profile;
try{
 await post('Profiler.enable');await post('Profiler.start');
 for(let i=0;i<8;i++){
  const mercs=s.units.filter(u=>u.team==='squad'),at=performance.now(),ok=moveGroup(s,mercs.map(u=>u.id),mercs[0],i%2?123:119,i%2?124:127,0);commands.push({ok,ms:performance.now()-at});
  for(let j=0;s.queue.length&&j<20;j++){const at=performance.now();stepMovement(s);steps.push(performance.now()-at);}
 }
 ({profile}=await post('Profiler.stop'));
}finally{profiler.disconnect();}
const sorted=[...steps].sort((a,b)=>a-b),files=['foliage-obstacles.js','core/visibility.js','core/engine.js','foliage-review-fixture.js'];
const result={at:new Date().toISOString(),node:process.version,scenario:'temperate / trees-v1 / sector; seed 1947; eight alternating real squad orders',sources:Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url))).digest('hex')])),commands,stepCount:steps.length,stepMs:{median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)]},completedSteps:s.units.reduce((n,u)=>n+(u.steps||0),0)};
if(!commands.every(c=>c.ok)||result.completedSteps!==106)throw Error('The movement workload changed; do not compare this run');
fs.writeFileSync(path.join(output,'movement.cpuprofile'),JSON.stringify(profile));fs.writeFileSync(path.join(output,'movement.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
