import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,addStairs,passable} from '../dist/tactics/core/maps.js';
import {createGame,canSee,detectionChance,pathTo} from '../dist/tactics/core/engine.js';
import {woodlandDepth} from '../dist/tactics/core/woodland.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {materialKind} from '../dist/tactics/hybrid-materials.js';
import {paintFoliageMaterial} from '../dist/tactics/foliage-materials.js';
const command=(tool,a={x:8,y:8,z:0},b={x:20,y:20,z:0})=>({tool,start:a,end:b});
test('large foliage strokes skip structural terrain, complete prop footprints and access tiles; one undo restores all',()=>{
 const map=blankMap();map.terrain[10][10]='water';map.terrain[10][11]='floor';map.terrain[10][12]='ground-concrete';map.terrain[10][13]='bridge';map.terrain[10][14]='ground-asphalt';map.terrain[10][15]='void';map.props=[{x:12,y:12,z:0,kind:'workbench-metal'}];addStairs(map,18,18,0,'ladder');
 const d=new EditingDocument().open(JSON.stringify(map)),before=d.export(),r=d.apply(command('foliage-cover'));assert.ok(r.ok,r.error);assert.equal(d.editor.undo.length,1);
 for(let x=10;x<=15;x++)assert.equal(d.map.terrain[10][x],map.terrain[10][x]);assert.equal(d.map.terrain[12][12],'yard');assert.equal(d.map.terrain[12][13],'yard');assert.equal(d.map.terrain[18][18],map.terrain[18][18]);assert.equal(d.map.terrain[9][9],'woodland');
 const painted=d.export();assert.ok(d.undo());assert.equal(d.export(),before);assert.ok(d.redo());assert.equal(d.export(),painted);assert.equal(new EditingDocument().open(painted).export(),painted);
 assert.ok(d.apply(command('clear-foliage')).ok);assert.equal(d.map.terrain[9][9],'ground-grass');assert.equal(d.map.terrain[10][10],'water');assert.equal(d.map.terrain[12][12],'yard');
 assert.equal(d.apply(command('foliage-cover',{x:8,y:8,z:1},{x:20,y:20,z:1})).ok,false);
});
test('painted cover remains traversable while hiding distant people and reducing close detection',()=>{
 const map=blankMap();map.guards=[{x:22,y:10,species:'cow',weapon:'rifle',heading:180}];const d=new EditingDocument().open(JSON.stringify(map));
 const open=createGame(1,map,false),a=open.units[0],g=open.units[4];Object.assign(a,{x:10,y:10,heading:0});assert.ok(canSee(open,a,g));
 assert.ok(d.apply(command('foliage-cover',{x:12,y:9,z:0},{x:19,y:11,z:0})).ok);
 const s=createGame(1,JSON.parse(d.export()),false),u=s.units[0],v=s.units[4];Object.assign(u,{x:10,y:10,heading:0});assert.ok(Math.abs(woodlandDepth(s,u,v)-8)<1e-9);assert.equal(canSee(s,u,v),false);assert.ok(passable(s,{x:15,y:10,z:0}));assert.ok(pathTo(s,u,21,10));
 v.x=14;g.x=14;assert.ok(detectionChance(s,u,v)<detectionChance(open,a,g));
});
test('cover visuals are deterministic, painted darker and do not add collision volumes',()=>{
 const map={terrain:[['ground-grass','woodland','woodland']],props:[{x:2,y:0,z:0,kind:'crate-wood'}],edges:{},stairs:[]},world=buildWorld(map),before=JSON.stringify(world.boxes);
 const visuals=environmentVisuals(world,map),cover=visuals.filter(b=>b.kind==='foliage-cover');assert.equal(cover.length,3);assert.ok(cover.every(b=>b.source.x===1&&b.source.z===0));assert.deepEqual(environmentVisuals(world,map),visuals);assert.equal(JSON.stringify(world.boxes),before);
 const floor=world.boxes.find(b=>b.source.x===1);assert.equal(materialKind(floor),'cover-grass');
 const dark=new T.MeshStandardMaterial({map:new T.Texture()}),light=new T.MeshStandardMaterial({map:new T.Texture()}),atlas=new T.Texture();paintFoliageMaterial(dark,'cover-grass',atlas);paintFoliageMaterial(light,'grass',atlas);
 const luminance=c=>c.r*.2126+c.g*.7152+c.b*.0722;assert.ok(luminance(dark.color)<luminance(light.color)*.6);dark.dispose();light.dispose();atlas.dispose();
});
