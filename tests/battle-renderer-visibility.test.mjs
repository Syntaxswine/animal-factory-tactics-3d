import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BattleRenderer} from '../dist/tactics/battle-renderer.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {HybridRenderer} from '../dist/tactics/hybrid-renderer.js';

// Exercise both renderer draw stages with the real presentation clock. Only
// WebGL, model loading and effects are replaced; visibility/picking are real.
function renderer(){
 const r=Object.create(BattleRenderer.prototype),world={boxes:[]};
 Object.assign(r,{camera:new T.OrthographicCamera(),actors:new Map(),models:new Map(),materials:new Map(),
  renderer:{setSize(){},getPixelRatio:()=>1,render(){},domElement:{}},editorWorld:world,world,level:0,
  rebuild(){},prune(){},loot:{sync(){}},motion:{update(){}},traversal:{observe(){}},combat:new BattleCombat(),
  fire:{observe(){},display:u=>u},tankEffects:{observe(){},pendingProps:()=>[]},shotEffects:{hide(){}},flameEffects:{hide(){}},
  actor(u){let mesh=this.actors.get(u.id);if(!mesh){mesh=new T.Mesh(new T.BoxGeometry(.5,1,.5));this.actors.set(u.id,mesh);}mesh.position.set(u.x,0,u.y);return mesh;}
 });
 return r;
}
for(const weapon of ['rifle','flamethrower'])test(`${weapon}: visible casualties remain drawn before impact without revealing hidden guards`,()=>{
 const a={id:0,x:0,y:0,team:'squad',species:'horse',weapon,hp:100},b={id:1,x:2,y:0,team:'guard',hp:70},hidden={id:2,x:3,y:0,team:'guard',hp:70};
 const state={units:[a,b,hidden],map:[],props:[],detected:new Set([1]),visible:new Set(['0,0','2,0']),seen:new Set(['0,0','2,0','3,0'])},r=renderer();
 r.mapSignature=JSON.stringify([state.map,state.upper,state.edges,state.props,state.stairs]);r.seenCount=state.seen.size;
 const ctx={drawImage(){}},args=[{x:250,y:250,zoom:1},500,500,0];
 const draw=now=>{r.presentationNow=now;return r.draw(ctx,state,...args).map(p=>p.id);};
 try{
  assert.deepEqual(draw(0),[0,1]);
  b.hp=0;b.casualty='dead';state.detected.clear();state.effect={shooter:0,target:1,ax:0,ay:0,bx:2,by:0,downed:[1],trajectories:[{x:2,y:0,h:1.2,kind:'unit',unitId:1}],...(weapon==='flamethrower'?{flame:{}}:{})};
  const before=structuredClone(state);
  assert.deepEqual(draw(10),[0,1]);assert.equal(r.combat.display(b).hp,70);
  assert.deepEqual(draw(200),[0,1]);
  assert.deepEqual(draw(700),[0,1]);assert.equal(r.combat.display(b).hp,0);
  assert.deepEqual(state,before,'Presentation must not change detection or casualty state');
  state.visible.delete('2,0');assert.deepEqual(draw(800),[0],'Explored terrain does not reveal a currently unseen corpse');
  state.units=[a,hidden];assert.deepEqual(HybridRenderer.prototype.draw.call(r,ctx,{...state,terrain:state.map},...args).map(p=>p.id),[0],'The legacy renderer still applies its own detection gate');
 }finally{for(const mesh of r.actors.values()){mesh.geometry.dispose();mesh.material.dispose();}}
});
