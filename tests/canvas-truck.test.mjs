import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {createCanvasTruck} from '../dist/tactics/canvas-truck.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/canvas-truck-'+name+'-data.json',import.meta.url)));
const author=read('author'),low=read('10k');
test('truck author and reduced meshes retain finite indexed material ownership',()=>{
 assert.ok(author.triangles>=29000&&author.triangles<=31000);assert.ok(low.triangles>=9500&&low.triangles<=10500);assert.equal(low.sourceTriangles,author.triangles);
 for(const data of [author,low]){assert.equal(data.parts.reduce((n,p)=>n+p.index.length/3,0),data.triangles);assert.equal(data.parts.length,7);for(const p of data.parts){assert.equal(p.position.length,p.normal.length);assert.ok(p.position.every(Number.isFinite));assert.ok(p.normal.every(Number.isFinite));assert.ok(p.index.every(i=>Number.isInteger(i)&&i>=0&&i<p.position.length/3));for(let i=0;i<p.normal.length;i+=3)assert.ok(Math.abs(Math.hypot(...p.normal.slice(i,i+3))-1)<.015);}}
});
test('reduced truck vertices derive from the corresponding author surfaces',()=>{
 for(const p of low.parts){const a=author.parts.find(a=>a.name===p.name);assert.equal(a.material,p.material);assert.equal(p.sourceTriangles,a.triangles);assert.ok(p.errorWorld<.016);const vertices=new Set();for(let i=0;i<a.position.length;i+=3)vertices.add(a.position.slice(i,i+3).map(v=>v.toFixed(5)).join(','));for(let i=0;i<p.position.length;i+=3)assert.ok(vertices.has(p.position.slice(i,i+3).map(v=>v.toFixed(5)).join(',')));}
});
test('truck stays grounded and keeps author silhouette at reduced budget',()=>{
 const bounds=[];for(const data of [author,low]){const truck=createCanvasTruck(data),box=new THREE.Box3().setFromObject(truck.root,true);bounds.push(box);assert.ok(Math.abs(box.min.y)<.004);assert.ok(box.max.y>2.3&&box.max.y<2.4);assert.ok(box.max.x-box.min.x>4.5&&box.max.x-box.min.x<4.9);assert.ok(box.max.z-box.min.z<2.1);assert.ok(truck.parts.every(p=>p.position.length()===0));truck.setGrey(true);assert.ok(truck.parts.every(p=>p.material===truck.grey));truck.setGrey(false);assert.ok(truck.parts.every(p=>p.material!==truck.grey));truck.dispose();}assert.ok(bounds[0].min.distanceTo(bounds[1].min)<.02);assert.ok(bounds[0].max.distanceTo(bounds[1].max)<.02);
});
