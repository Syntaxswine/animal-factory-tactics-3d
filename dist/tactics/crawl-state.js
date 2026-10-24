const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export const CRAWL_DURATION=12;
export function validateCrawlSample(distance,options={}){
 const p=options.position||{x:0,y:0,z:0},values=[distance,options.blend??1,options.heading??0,p.x,p.y,p.z];if(!values.every(Number.isFinite))throw Error('Finite crawl travel, blend, heading and position required');if((options.blend??1)<0||(options.blend??1)>1)throw Error('Crawl blend must be between zero and one');
}
// Contact phase follows accepted travel, rather than a wall-clock walking loop.
export function crawlContact(distance,stride,offset=0,{stance=.62,lift=.045}={}){
 const cycles=distance/stride+offset,phase=((cycles%1)+1)%1,recover=(phase-stance)/(1-stance),planted=phase<stance;
 return {phase,planted,x:stride*(planted?.25-phase:.25-stance+stance*smooth(recover)),lift:planted?0:lift*Math.sin(Math.PI*recover)**2};
}
// Two tiles, with a supported pause before and after, and half-second speed ramps.
export function crawlJourney(time,{backward=false}={}){
 const t=Math.max(0,Math.min(CRAWL_DURATION,time)),u=t-1,ramp=.5,duration=8,speed=2/(duration-ramp),sign=backward?-1:1;
 const integral=x=>x<=0?0:x<ramp?x*x/(2*ramp):x<duration-ramp?x-ramp/2:x<duration?duration-ramp-(duration-x)**2/(2*ramp):duration-ramp;
 const blend=u<0||u>duration?0:u<ramp?u/ramp:u>duration-ramp?(duration-u)/ramp:1;
 return {time:t,distance:sign*speed*integral(u),blend,phase:t<1?'Prone rest':t<9?(backward?'Crawl backward':'Crawl forward'):'Settle and observe'};
}
