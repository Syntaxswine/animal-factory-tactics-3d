import {MINUTES_PER_DAY,DAY_START,DUSK_START} from './game-clock.js';
// Shared authored bulb positions in tile units: X, height, map Y.
export const LIGHT_FORMS={
 'campfire':{w:1,h:1,fire:true,emitters:[[0,.32,0]]},
 'cooking-fire':{w:2,h:2,fire:true,emitters:[[0,.32,0]]},
 'standing-torch':{w:1,h:1,fire:true,emitters:[[0,1.36,0]]},
 'wall-torch':{w:1,h:1,fire:true,wall:true,emitters:[[0,2.06,.27]]},
 'floor-lamp':{w:1,h:1,emitters:[[0,1.48,0]]},
 'bedside-table-lamp':{w:1,h:1,emitters:[[0,.605+1.48*.48,-.045]]},
 'gooseneck-sconce':{w:1,h:1,wall:true,emitters:[[0,1.62,.55]]},
 'streetlight':{w:1,h:1,emitters:[[.24,2.51,0]]},
 'streetlight-double':{w:2,h:1,emitters:[[-.66,2.51,0],[.66,2.51,0]]}
};
export const LIGHT_PROPS=Object.fromEntries(Object.entries(LIGHT_FORMS).map(([kind,f])=>[kind,{w:f.w,h:f.h,solid:!f.wall,cover:kind==='bedside-table-lamp'?25:0}]));
export const LIGHT_RANGE=30;
export function lightBrightness(distance){return !Number.isFinite(distance)||distance<0||distance>LIGHT_RANGE?0:2**-Math.max(0,Math.ceil(distance/5)-1);}
export function lightEnabled(prop,minutes){const form=LIGHT_FORMS[prop.kind];if(!form||prop.lightMode==='off')return false;if(prop.lightMode==='on'||form.fire)return true;const m=((minutes%MINUTES_PER_DAY)+MINUTES_PER_DAY)%MINUTES_PER_DAY;return m<DAY_START||m>=DUSK_START;}
export function fixturePlacement(p){const f=LIGHT_FORMS[p.kind],w=p.rotated?f.h:f.w,h=p.rotated?f.w:f.h;return {x:p.x+(w-1)/2+(f.wall&&p.rotated?.48:0),y:p.y+(h-1)/2-(f.wall&&!p.rotated?.48:0),z:p.z||0};}
export function placedEmitters(p,floorHeight=3){const f=LIGHT_FORMS[p.kind];if(!f)return [];const center=fixturePlacement(p);
 return f.emitters.map(([x,h,y],index)=>({x:center.x+(p.rotated?-y:x),y:center.y+(p.rotated?x:y),h:center.z*floorHeight+h,prop:p,index,color:f.fire?0xffae55:0xffe5b2}));
}
export function lightSources(props,minutes){return (props||[]).filter(p=>lightEnabled(p,minutes)).flatMap(p=>placedEmitters(p));}
