import {DIMENSIONS} from './hybrid-world.js';

// Minimum asset contract: four ordinary layers plus a roof/fringe layer.
// Runtime maps may support more layers without changing either arch's height.
// The schema supports these heights; this art still needs gameplay integration.
export const ARCH_ELEVATION_PLAN=Object.freeze({ordinaryLayers:4,totalLayers:5,roofLayer:4,spacing:DIMENSIONS.floorSpacing});
export const NATURAL_ARCH_PAINT='../assets/environment/natural-rock-arches/paint-atlas-v1.webp';
export const NATURAL_ARCHES=Object.freeze({
 large:Object.freeze({label:'Landmark arch',width:12,opening:8,depth:4,rise:3,spring:2.35,crown:4.70}),
 small:Object.freeze({label:'Companion arch',width:6,opening:4,depth:4,rise:1,spring:1.915,crown:1.945})
});
export function naturalArchLayout(kind='large'){
 const s=NATURAL_ARCHES[kind];if(!s)throw Error('Unknown natural arch: '+kind);
 const height=s.rise*ARCH_ELEVATION_PLAN.spacing,walkWidth=2,groundBlocked=[],passage=[],walkable=[];
 for(let j=0;j<s.depth;j++)for(let i=0;i<s.width;i++){
  const x=i+.5-s.width/2,z=j+.5-s.depth/2;
  (Math.abs(x)>s.opening/2?groundBlocked:passage).push([x,0,z]);
 }
 // The safe route is centred even when the decorative footprint is odd deep.
 for(let i=0;i<s.width;i++)for(const z of [-.5,.5])walkable.push([i+.5-s.width/2,height,z]);
 return {kind,...s,height,walkWidth,groundBlocked,passage,walkable,
  topLevel:s.rise,connections:[{side:'west',center:[-s.width/2,height,0],width:walkWidth,normal:[-1,0,0]},{side:'east',center:[s.width/2,height,0],width:walkWidth,normal:[1,0,0]}],
  road:kind==='large'?{width:6,opening:8,sideClearance:1,axis:'local Z',separate:true}:null,
  coordinates:'Y up; origin at centre of base; span along X; passage along Z; tile edges on integer X; top route Z=-1..1',
  integration:'Reusable art and measured contact data. The map schema supports five layers; registering this art with physical collision and dual-level traversal remains integration work.'};
}
