// Capture actual tank-event results from the incoming game without editing it.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
if(!process.argv[2])throw Error('Supply the gameplay checkout');
const source=path.resolve(process.argv[2]),load=p=>import(pathToFileURL(path.join(source,'dist/tactics',p)));
const {blankMap,parseMap,setTerrain}=await load('core/maps.js'),{createGame,equip,attack}=await load('core/engine.js');
function capture(water=false){
 for(let seed=0;seed<100;seed++){
  const map=blankMap();map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];map.guards=[{x:20,y:20,species:'pig-foreman',weapon:'flamethrower'}];
  const excluded=[];if(water)for(let x=21;x<=25;x++)for(let y=21;y<=24;y++){setTerrain(map,x,y,0,'water');excluded.push({x,y,z:0,kind:'water'});}
  const game=createGame(seed,parseMap(JSON.stringify(map)),true,'easy'),shooter=game.units[0],wearer=game.units[4];
  equip(game,shooter,'pistol');shooter.accuracy=1000;shooter.heading=0;wearer.hp=wearer.maxHp=500;
  attack(game,shooter,wearer,false,false,'weapon');if(!wearer.tanksExploded)continue;
  return {origin:{x:wearer.x,y:wearer.y,z:wearer.z||0},explosion:game.effect.explosions[0],fires:game.fires.map(p=>({...p})),excluded,wearer:{hp:wearer.hp,casualty:wearer.casualty,weapon:wearer.weapon,ammo:wearer.ammo.flamethrower},victims:game.units.filter(u=>u.hp===0).map(u=>({x:u.x,y:u.y,z:u.z||0}))};
 }
 throw Error('No tank event captured');
}
const engine=fs.readFileSync(path.join(source,'dist/tactics/core/engine.js'));
fs.writeFileSync(new URL('../dist/tactics/fixtures/tank-blast-contract.json',import.meta.url),JSON.stringify({provenance:{source:'Incoming gameplay core/engine.js tank explosion',sha256:createHash('sha256').update(engine).digest('hex'),captured:'2026-10-04 America/New_York',note:'Actual event, fire cells, equipment removal and casualties from attack(); no art-defined damage radius.'},open:capture(),water:capture(true)},null,2)+'\n');
