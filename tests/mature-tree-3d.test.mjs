import test from 'node:test';import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,parseMap,passable} from '../dist/tactics/core/maps.js';
import {PROPS,TREE_VARIANTS} from '../dist/tactics/core/environment.js';
import {PROPS as visualProps} from '../dist/tactics/environment.js';
import {foliageModel} from '../dist/tactics/foliage-models.js';
import {buildWorld,DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';

test('3D editor exports mature trees accepted by the pinned gameplay parser',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap('Mature-tree integration')));
 for(const [i,kind]of Object.keys(TREE_VARIANTS).entries())assert(d.apply({tool:'prop',start:{x:8+i*3,y:8,z:0},options:{propKind:kind,rotated:!!i}}).ok);
 assert.deepEqual(d.validate(),[]);const saved=d.export(),round=new EditingDocument().open(saved),map=parseMap(saved);
 assert.equal(round.export(),saved);assert.deepEqual(map.props,d.map.props);
 for(const p of map.props){assert.equal(passable(map,p),false);assert.equal(passable(map,{...p,y:p.y+1}),true);assert.deepEqual(PROPS[p.kind],visualProps[p.kind]);}
 assert(d.undo());assert(d.redo());assert.equal(d.export(),saved);
 const invalid=JSON.parse(saved);invalid.props[0].kind='tree-invalid-large';assert.throws(()=>parseMap(JSON.stringify(invalid)),/Invalid environment props/);
});

test('mature visual variants preserve approved foliage parts, scale, floor roots and rotation',()=>{
 for(const [kind,{base,scale}]of Object.entries(TREE_VARIANTS)){
  const small=foliageModel(base),large=foliageModel(kind);assert.equal(small.length,large.length);
  small.forEach((p,i)=>{assert.equal(large[i].shape,p.shape);assert.equal(large[i].material,p.material);assert.deepEqual(large[i].rotation,p.rotation);assert.deepEqual(large[i].size,p.size.map(v=>v*scale));assert.deepEqual(large[i].center,p.center.map(v=>v*scale));});
  for(const z of [0,1,2])for(const rotated of [false,true]){
   const map={terrain:[['yard']],props:[{kind,x:0,y:0,z,rotated}],edges:{},upper:[],stairs:[]},parts=environmentVisuals(buildWorld(map),map).filter(p=>p.kind==='prop');
   assert.equal(parts.length,large.length);parts.forEach((p,i)=>{assert.equal(p.source.z,z);assert.deepEqual(p.size,large[i].size);assert.equal(p.center[1],large[i].center[1]+z*DIMENSIONS.floorSpacing);assert.equal(p.yaw,rotated?-Math.PI/2:0);});
  }
 }
});
