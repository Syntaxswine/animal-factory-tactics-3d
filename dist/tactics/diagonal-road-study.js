import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld} from './hybrid-world.js';
import {DIAGONAL_ROADS,ROAD_GRASSES} from './diagonal-roads.js';
const hybrid=new HybridRenderer(),{renderer,scene,camera}=hybrid;
document.querySelector('#scene').append(renderer.domElement);renderer.setSize(640,ROAD_GRASSES.length*80);renderer.setPixelRatio(devicePixelRatio);
for(const name of ROAD_GRASSES){const d=document.createElement('div');d.textContent=name;document.querySelector('#labels').append(d);}
const map={terrain:ROAD_GRASSES.map((_,i)=>DIAGONAL_ROADS.slice(i*8,i*8+8)),props:[],edges:{},upper:[],stairs:[]};
hybrid.rebuild(buildWorld(map),null,0,map);camera.left=-4;camera.right=4;camera.top=ROAD_GRASSES.length/2;camera.bottom=-ROAD_GRASSES.length/2;camera.near=.1;camera.far=40;camera.up.set(0,0,-1);camera.position.set(3.5,15,(ROAD_GRASSES.length-1)/2);camera.lookAt(3.5,0,(ROAD_GRASSES.length-1)/2);camera.updateProjectionMatrix();
function render(){renderer.render(scene,camera);document.querySelector('#status').textContent=DIAGONAL_ROADS.length+' variants · grass, meadow, sand and concrete halves';}
hybrid.onReady=render;render();window.roadStudy={hybrid,map,render};
