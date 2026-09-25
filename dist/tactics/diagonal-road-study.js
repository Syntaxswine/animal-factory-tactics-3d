import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld} from './hybrid-world.js';
import {DIAGONAL_ROADS,ROAD_GRASSES} from './diagonal-roads.js';
const hybrid=new HybridRenderer(),{renderer,scene,camera}=hybrid;
document.querySelector('#scene').append(renderer.domElement);renderer.setSize(640,640);renderer.setPixelRatio(devicePixelRatio);
for(const name of ROAD_GRASSES){const d=document.createElement('div');d.textContent=name;document.querySelector('#labels').append(d);}
const map={terrain:ROAD_GRASSES.map((_,i)=>DIAGONAL_ROADS.slice(i*8,i*8+8)),props:[],edges:{},upper:[],stairs:[]};
hybrid.rebuild(buildWorld(map),null,0,map);camera.left=-4;camera.right=4;camera.top=4;camera.bottom=-4;camera.near=.1;camera.far=40;camera.up.set(0,0,-1);camera.position.set(3.5,15,3.5);camera.lookAt(3.5,0,3.5);camera.updateProjectionMatrix();
function render(){renderer.render(scene,camera);document.querySelector('#status').textContent='64 variants · existing grass, meadow and sand surfaces';}
hybrid.onReady=render;render();window.roadStudy={hybrid,map,render};
