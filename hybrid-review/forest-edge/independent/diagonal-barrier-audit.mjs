import fs from 'node:fs';
import {createGroundEdgeField,groundEdgeWeight} from '../../../dist/tactics/biome-ground-edge.js';
let worst={delta:0};
const cases=[];
for(let mask=0;mask<8;mask++){
 const make=high=>({width:8,depth:8,heightAt:(x,z)=>x<0||z<0||x>=8||z>=8?null:x>=4&&z>=4?2:0,blockedAt:(x,z)=>x<0||z<0||x>=8||z>=8?false:x>=4&&z>=4?high:x<4&&z<4?!!(mask&1):x>=4?!!(mask&2):!!(mask&4)});
 const a=createGroundEdgeField(make(false)),b=createGroundEdgeField(make(true));
 for(let z=3.2;z<3.5;z+=.005)for(let x=3.2;x<3.5;x+=.005){const da=a.sample(x,z),db=b.sample(x,z),wa=groundEdgeWeight(da),wb=groundEdgeWeight(db),delta=Math.abs(wa-wb);if(delta>worst.delta)worst={mask,x,z,da,db,wa,wb,delta};}
 for(const [x,z]of [[3.4,3.4],[3.45,3.45],[3.49,3.49]])cases.push({mask,x,z,a:groundEdgeWeight(a.sample(x,z)),b:groundEdgeWeight(b.sample(x,z))});
}
const result={date:new Date().toISOString(),description:'Only occupancy in the diagonally adjoining elevated quadrant changes. Every sampled cell remains on the unchanged lower level.',worst,cases};
fs.writeFileSync(new URL('./diagonal-barrier-audit.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
