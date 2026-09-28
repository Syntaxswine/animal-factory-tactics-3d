import * as T from './vendor/three.module.js';
import {createMedicalChest} from './medical-chest.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xe8ddbd);const camera=new T.PerspectiveCamera(34,1,.01,20);camera.position.set(1.35,1.05,1.8);camera.lookAt(0,.2,0);
scene.add(new T.HemisphereLight(0xfff5df,0x636a57,2));const sun=new T.DirectionalLight(0xfff3d9,3);sun.position.set(-2,4,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const chest=createMedicalChest();scene.add(chest);const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0xcac2a8,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.001;floor.receiveShadow=true;scene.add(floor);
function render(){renderer.render(scene,camera);}function resize(){const w=innerWidth,h=Math.round(innerHeight*.7);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}addEventListener('resize',resize);document.getElementById('rotation').oninput=e=>{chest.rotation.y=Number(e.target.value)*Math.PI/180;render();};resize();
