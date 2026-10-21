import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {QUADRANTS,TOWN,TOWN_EAST,TUTORIAL_LAYOUT,SUMMIT,SHELF,tutorialMap,shelfWidth,townUpper} from '../tools/generate-tutorial-plateau.mjs';
import {parseMap,validateMap,terrainAt,roofNeighbors,neighbors,passable} from '../dist/tactics/core/maps.js';
const maps=QUADRANTS.map(q=>({q,m:tutorialMap(q)}));
const at=(x,y)=>maps.find(({q})=>q.x===x&&q.y===y).m;

test('the raised authored variant preserves the supplied ground, summit, foliage and character identities',()=>{
 const m=parseMap(fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/rough-plateau-01-four-high.json',import.meta.url),'utf8'),{allowDisconnected:true}),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(m.levels,5);assert.equal(m.props.length,1284);assert.equal(Object.keys(m.foliage).length,36496);
 assert.equal(hash(m.terrain),'0520c2bd9afabaedce00ddb73e9ac62d9c17ef2bccb662d477cc763e3d4fbbeb');assert.equal(hash(m.upper[3]),'51ce3ea4c0769b218372eada90c16e14aa35ee1bd4994a7f47afa3debf806f33');
 const foliage=Object.fromEntries(Object.entries(m.foliage).map(([key,value])=>{const [x,y,z]=key.split(',').map(Number);assert.ok(z===0||z===4);return [[x,y,z/2].join(','),value];}));
 assert.equal(hash(foliage),'52b75af4a07e1077ee5e16a90fdf8f945bedf1354670c7b24b8ada56a8985992');assert.equal(hash(m.starts.map(p=>({...p,z:2}))),'2c6e1659e1e35cfcff7938f75e4ae839addf0b6f8da34b7a58183f034b01f4e9');
 assert.deepEqual(m.props,at(1,1).props);assert.equal(m.climbs.length,0);assert.equal(m.stairs.length,0);
 // The supplied draft painted around the original markers, leaving each in
 // an isolated clearing. Raising it must not repaint those authored trees.
 const original={...m,levels:3,upper:[m.upper[1],m.upper[3]],props:m.props.filter(p=>p.z%2===0).map(p=>({...p,z:p.z/2})),foliage,starts:m.starts.map(p=>({...p,z:2})),exits:m.exits.map(p=>({...p,z:2}))};
 assert.deepEqual(validateMap(m).map(e=>e.replace('level 5','level 3')),validateMap(original));assert.equal(validateMap(m).length,4);
 const recipe=JSON.parse(fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/placeholder.json',import.meta.url)));assert.equal(recipe.variants[0],'rough-plateau-01-four-high.json');
});
test('four saved variants round-trip as valid maps with closed tiers and summit starts',()=>{for(const {q,m}of maps){const saved=JSON.parse(fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-'+q.step+'/rough-plateau.json',import.meta.url)));assert.deepEqual(saved,m);assert.deepEqual(parseMap(JSON.stringify(saved)),m);assert.equal(m.climbs.length,0);assert.equal(m.stairs.length,0);assert.ok(!m.props.some(p=>p.kind.startsWith('ramp')));assert.ok(m.props.length<=2048);for(const p of [...m.starts,...m.exits]){assert.equal(p.z,SUMMIT);assert.ok(passable(m,p));}for(const p of m.props){const low={x:p.x,y:p.y,z:p.z},high={...low,z:p.z+1};assert.equal(passable(m,low),false);assert.equal(roofNeighbors(m,high).length,0);assert.ok(neighbors(m,high).every(n=>n.z===high.z));}}});
test('terrain and cliff bands match across all four shared edges on every level',()=>{for(const k of [0,1])for(let n=0;n<240;n++)for(let z=0;z<=SUMMIT;z++){assert.equal(terrainAt(at(0,k),239,n,z),terrainAt(at(1,k),0,n,z));assert.equal(terrainAt(at(k,0),n,239,z),terrainAt(at(k,1),n,0,z));}const cliff=(m,x,y,z)=>m.props.some(p=>p.x===x&&p.y===y&&p.z===z);for(const k of [0,1])for(let n=0;n<240;n++)for(let z=0;z<SUMMIT;z++){assert.equal(cliff(at(0,k),239,n,z),cliff(at(1,k),0,n,z));assert.equal(cliff(at(k,0),n,239,z),cliff(at(k,1),n,0,z));}});
test('outer seams sit 24 tiles from outside edges',()=>{const m=at(1,1);assert.equal(terrainAt(m,216,0,SHELF),'void');assert.notEqual(terrainAt(m,215,0,SHELF),'void');assert.equal(terrainAt(m,0,216,SHELF),'void');assert.notEqual(terrainAt(m,0,215,SHELF),'void');});
test('shelf varies from zero to two tiles and upper terrain stays within the lower footprint',()=>{const widths=new Set();for(const {q,m}of maps)for(let y=0;y<240;y++)for(let x=0;x<240;x++){const top=terrainAt(m,x,y,SUMMIT),lower=terrainAt(m,x,y,SHELF);if(top!=='void')assert.equal(m.terrain[y][x]==='ground-grass'&&!m.props.some(p=>p.x===x&&p.y===y&&p.z===0),false);if(lower==='ground-dirt'){widths.add(shelfWidth(q.x*240+x,q.y*240+y));let nearest=Infinity;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(terrainAt(m,x+dx,y+dy,SUMMIT)!=='void')nearest=Math.min(nearest,Math.abs(dx)+Math.abs(dy));assert.ok(nearest<=2,'shelf wider than two tiles at '+x+','+y);}}assert.ok(widths.has(0)&&widths.has(1)&&widths.has(2));});
test('northwest town approach includes the sketched upper-tier curve and reaches its travel marker',()=>{const m=at(0,0);for(let x=0;x<240;x++)assert.equal(terrainAt(m,x,0,SUMMIT)!=='void',townUpper(x,0)||(x>=80+shelfWidth(x,0)&&x<160-shelfWidth(x,0)));assert.deepEqual(m.exits,[{x:120,y:0,z:SUMMIT}]);assert.deepEqual(m.sectorTemplate.plateau.townApproach.bounds,[80,160]);});

test('sector four west face stays at the 24 tile margin',()=>{const m=at(0,0);for(let y=24;y<240;y++){assert.ok(m.props.some(p=>p.x===24&&p.y===y&&p.z===0));assert.equal(terrainAt(m,23,y,SUMMIT),'void');}});
test('town variant validates and cliff enters 24 tiles deep with a matching southern seam',()=>{const town=tutorialMap(TOWN),nw=at(0,0),saved=JSON.parse(fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-5/rough-plateau.json',import.meta.url)));assert.deepEqual(saved,town);assert.deepEqual(parseMap(JSON.stringify(town)),town);for(let x=0;x<240;x++)for(let z=0;z<=SUMMIT;z++)assert.equal(terrainAt(town,x,239,z),terrainAt(nw,x,0,z));assert.equal(terrainAt(town,125,215,SHELF),'void');assert.notEqual(terrainAt(town,120,216,SHELF),'void');assert.equal(town.climbs.length,0);assert.equal(town.stairs.length,0);});

test('town sketch adds lower-tier shapes and an upper-tier southern curve without raising the surrounding ground',()=>{const m=tutorialMap(TOWN);for(const [x,y]of [[40,60],[45,185]]){assert.equal(terrainAt(m,x,y,SHELF),'ground-dirt');assert.equal(terrainAt(m,x,y,SUMMIT),'void');}assert.equal(terrainAt(m,50,230,SUMMIT),'ground-grass');assert.equal(terrainAt(m,180,180,0),'ground-grass');assert.equal(terrainAt(m,180,180,SHELF),'void');for(let y=0;y<240;y++)for(let x=0;x<240;x++)assert.equal(terrainAt(m,x,y,0)==='ground-asphalt',(y>=117&&y<=122)||(x>=117&&x<=122&&y<120));for(const [x,y]of [[0,120],[239,120],[120,0],[120,120]])assert.ok(passable(m,{x,y,z:0}));});

test('six-sector layout joins both town maps and preserves the closed northeast seam',()=>{
 assert.deepEqual(TUTORIAL_LAYOUT.steps,[[5,6],[4,3],[2,1]]);const west=tutorialMap(TOWN),east=tutorialMap(TOWN_EAST),ne=at(1,0);
 const saved=JSON.parse(fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-6/rough-plateau.json',import.meta.url)));assert.deepEqual(saved,east);assert.deepEqual(parseMap(JSON.stringify(east)),east);
 for(let n=0;n<240;n++)for(let z=0;z<=SUMMIT;z++){assert.equal(terrainAt(west,239,n,z),terrainAt(east,0,n,z));assert.equal(terrainAt(east,n,239,z),terrainAt(ne,n,0,z));}
 assert.equal(west.archLandmark.topLayer,4);assert.equal(east.archLandmark.topLayer,2);assert.ok(east.props.some(p=>p.kind==='stone-arch-small'));
});

test('the authored town descent connects the original summit to ground without opening other cliffs',()=>{
 const town=tutorialMap(TOWN),points=[];for(let y=239;y>=217;y--)points.push({x:120,y,z:SUMMIT});for(let z=3;z>=0;z--)for(let y=204+4*z;y>=201+4*z;y--)points.push({x:120,y,z});
 for(let i=1;i<points.length;i++)assert.ok(neighbors(town,points[i-1]).some(q=>q.x===points[i].x&&q.y===points[i].y&&q.z===points[i].z),JSON.stringify(points.slice(i-1,i+1)));
 for(const p of town.props.filter(p=>p.kind==='cliff-ledge'))assert.equal(passable(town,p),false);
});
