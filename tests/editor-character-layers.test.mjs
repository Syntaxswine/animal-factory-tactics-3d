import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {MAP_LEVELS} from '../dist/tactics/map-layers.js';

for(let z=0;z<MAP_LEVELS;z++)test('character duplication supports authored layer '+(z+1)+' with fresh identity, patrol offsets and undo',()=>{
 const map=blankMap();for(let y=10;y<=18;y++)for(let x=10;x<=18;x++)setTerrain(map,x,y,z,'ground-grass');
 const d=new EditingDocument().open(JSON.stringify(map));assert.ok(d.apply({tool:'guard',start:{x:11,y:11,z},options:{species:'donkey',weapon:'pistol',outfit:'red-hats'}}).ok);
 const original=d.map.guards[0].character.id;d.updateCharacter(original,{character:{scriptId:'upper_guide',canTalk:true,dialogueRef:'welcome'}});
 d.setPatrol(original,[{x:12,y:12,z,waitSeconds:15}]);const before=d.export(),id=d.duplicateCharacter(original,{x:14,y:12,z}),copy=d.character(id).p;
 assert.notEqual(id,original);assert.equal(copy.character.scriptId,'upper_guide_2');assert.equal(copy.character.canTalk,true);assert.deepEqual(copy.patrol,[{x:15,y:13,z,waitSeconds:15}]);
 const after=d.export();assert.throws(()=>d.duplicateCharacter(original,{x:14,y:12,z}),/Overlapping/);assert.equal(d.export(),after);
 d.undo();assert.equal(d.export(),before);d.redo();assert.equal(new EditingDocument().open(d.export()).character(id).p.z,z);
 for(const p of [{x:240,y:12,z},{x:14,y:12,z:MAP_LEVELS},{x:14,y:12,z:-1},{x:14,y:12,z:1.5}]){assert.throws(()=>d.duplicateCharacter(original,p));assert.equal(d.export(),after);}
 if(z){assert.throws(()=>d.duplicateCharacter(original,{x:25,y:25,z}));assert.equal(d.export(),after);}
});
