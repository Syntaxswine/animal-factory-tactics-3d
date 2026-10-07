import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createSiteScorch,siteScorchAmount} from '../dist/tactics/strategic-site-scorch.js';
import {SITE_SLAB_HEIGHT} from '../dist/tactics/strategic-sites.js';

test('scorch starts with the blast and persists after every transient effect clears',()=>{
 for(const id of ['radio','radar','sam']){
  const texture=new T.Texture(),s=createSiteScorch(texture,id);
  try{
   assert.equal(s.at(0).visible,false);assert.equal(s.at(.5).amount,0);
   let last=0;for(let t=.5;t<=2;t+=.05){const n=s.at(t).amount;assert(n>=last);last=n;}
   const end=s.at(7.6);assert.equal(end.amount,1);assert.equal(end.visible,true);assert.deepEqual(s.at(1000),end);
   s.at(0);assert.deepEqual(s.at(7.6),end);assert.equal(siteScorchAmount(-100),0);
  }finally{s.dispose();texture.dispose();}
 }
});
test('paint stays on the horizontal slab without shadow, depth or collision geometry',()=>{
 const texture=new T.Texture();
 try{for(const id of ['radio','radar','sam']){
  const s=createSiteScorch(texture,id);try{
   const g=s.mesh.geometry,p=g.attributes.position;assert.equal(p.count,24);assert.equal(s.root.userData.cosmetic,true);
   for(let i=0;i<p.count;i++)assert(Math.abs(p.getY(i)-(SITE_SLAB_HEIGHT+.003))<1e-7);
   assert.equal(s.mesh.castShadow,false);assert.equal(s.mesh.material.depthWrite,false);assert.equal(s.mesh.material.uniforms.atlas.value,texture);
   s.root.position.set(8,3,-7);s.root.rotation.y=.7;s.root.updateMatrixWorld(true);
   for(let i=0;i<p.count;i++)assert(Math.abs(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(s.mesh.matrixWorld).y-3-SITE_SLAB_HEIGHT-.003)<1e-6);
  }finally{s.dispose();}
 }}finally{texture.dispose();}
});
test('site copies have independent intensity and release only their own resources',()=>{
 const texture=new T.Texture(),a=createSiteScorch(texture,'radio'),b=createSiteScorch(texture,'radio');let freed=0,atlasFreed=0;
 for(const r of [a.mesh.geometry,a.mesh.material])r.addEventListener('dispose',()=>freed++);texture.addEventListener('dispose',()=>atlasFreed++);
 const scene=new T.Scene();scene.add(a.root,b.root);a.at(7.6);assert.equal(b.diagnostics().amount,0);
 a.dispose();a.dispose();assert.equal(freed,2);assert.equal(atlasFreed,0);assert.equal(scene.children.length,1);assert.equal(b.at(7.6).amount,1);
 assert.throws(()=>a.at(0),/disposed/);b.dispose();texture.dispose();
});
test('invalid selectors and nonfinite times fail without losing existing marks',()=>{
 const texture=new T.Texture();assert.throws(()=>createSiteScorch(texture,'other'),/Unknown/);assert.throws(()=>createSiteScorch(null,'radio'),/atlas/);
 const s=createSiteScorch(texture,'sam');try{s.setAmount(1);for(const value of [NaN,Infinity,undefined]){assert.throws(()=>s.at(value),/finite/);assert.equal(s.diagnostics().amount,1);}s.setAmount(-1);assert.equal(s.diagnostics().visible,false);}finally{s.dispose();texture.dispose();}
});
