import test from 'node:test';import assert from 'node:assert/strict';
import {PROPS,EDGES,GROUNDS} from '../dist/tactics/environment.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {materialKind} from '../dist/tactics/hybrid-materials.js';
import {PAINTED_SURFACES} from '../dist/tactics/environment-painted-materials.js';
const map=()=>({terrain:[['yard']],upper:[],props:[],edges:{},stairs:[],starts:[],guards:[]});
test('every environment catalog descriptor resolves an explicit painted surface',()=>{
 const maps=[];for(const kind of Object.keys(PROPS)){const m=map();m.props=[{kind,x:0,y:0,z:kind.startsWith('roof-')?1:0}];maps.push(m);}
 for(const kind of Object.keys(EDGES)){const m=map();m.edges={'s:0:0':kind};maps.push(m);}
 for(const kind of ['floor','yard','water','bridge','woodland',...GROUNDS]){const m=map();m.terrain=[[kind]];maps.push(m);}
 for(const m of maps)for(const b of environmentVisuals(buildWorld(m),m))assert.ok(PAINTED_SURFACES[materialKind(b)],`${b.material} ${b.id}`);
 assert.notEqual(materialKind({material:'ground-dirt'}),materialKind({material:'ground-gravel'}));
});
test('painted terrain meets at tile boundaries while architecture detailing preserves collision data',()=>{
 const m=map();m.terrain=[['water','water']];m.edges={'s:0:0':'wall-corrugated','s:1:0':'window-brick'};const w=buildWorld(m),before=JSON.stringify(w.boxes),v=environmentVisuals(w,m);
 assert.equal(JSON.stringify(w.boxes),before);assert.ok(v.filter(b=>b.material==='water').every(b=>b.shape==='slab'));assert.ok(v.some(b=>b.id.includes(':fold:')));assert.ok(v.some(b=>b.id.endsWith(':worn-cap')));
});
