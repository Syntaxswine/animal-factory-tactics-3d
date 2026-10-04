// Read-only snapshot of the incoming gameplay branch. Run with its repository
// path; no formula or damage rule is duplicated in the art study.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const source=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Supply the incoming gameplay checkout');
const load=p=>import(pathToFileURL(path.join(source,'dist/tactics',p)));
const {blankMap,edgeKey}=await load('core/maps.js');
const {createGame,WEAPONS}=await load('core/engine.js');
const {flameShape}=await load('flame-cone.js');
const map=blankMap('Painted flame contract');
map.starts=[{x:10,y:10},{x:9,y:9},{x:8,y:8},{x:7,y:7}];map.guards=[];
const s=createGame(42,map,true,'easy'),a=s.units[0];a.weapon='flamethrower';a.heading=0;
const sample=()=>flameShape(s,a,{x:20,y:10,z:0},WEAPONS.flamethrower);
const open=sample();
for(let y=5;y<=15;y++)s.edges[edgeKey('e',12,y)]='wall';
const wall=sample();
s.edges[edgeKey('e',12,10)]='doorway-concrete-open';
const doorway=sample();
const file=path.join(source,'dist/tactics/flame-cone.js');
fs.writeFileSync(new URL('../dist/tactics/fixtures/painted-fire-contract.json',import.meta.url),JSON.stringify({
 provenance:{source:'Incoming gameplay flame-cone.js',sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),captured:'2026-10-04',note:'Unmodified world-space ray results. Viewer translates all coordinates by the recorded origin.'},open,wall,doorway
},null,2)+'\n');
