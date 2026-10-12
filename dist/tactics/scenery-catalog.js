// Placement reservations include rotor/debris overhang. Only the baked body
// clearance below standing height blocks walking, not the whole reservation.
export const HELICOPTER_FOOTPRINT=Object.freeze({w:12,h:10,origin:[6.5,3.5]});
export const SCENERY_PROPS=Object.freeze({
 'helicopter-utility':{...HELICOPTER_FOOTPRINT,name:'Utility helicopter',model:'helicopter',state:'intact',cover:0,solid:false},
 'helicopter-crash-smoke':{...HELICOPTER_FOOTPRINT,name:'Helicopter crash · survivors / smoke',model:'helicopter',state:'survivable',smoke:true,cover:0,solid:false},
 'helicopter-wreck':{...HELICOPTER_FOOTPRINT,name:'Helicopter wreck · destroyed',model:'helicopter',state:'crashed',cover:0,solid:false},
 ...Object.fromEntries([
  ['wingback','russet','Wingback chair · russet'],['wingback','teal','Wingback chair · teal'],
  ['wood','honey','Wooden chair · honey'],['wood','walnut','Wooden chair · walnut'],
  ['metal','sage','Metal chair · sage'],['metal','iron','Metal chair · iron'],
  ['desk','teal','Desk chair · teal'],['desk','russet','Desk chair · russet']
 ].map(([form,finish,name])=>['chair-'+form+'-'+finish,{w:1,h:1,name,model:'chair',form,finish,cover:25,solid:true}])),
 'guardhouse-computer':{w:1,h:1,name:'Computer terminal · green screen',model:'console',form:'computer',screen:'green',cover:25,solid:true},
 'guardhouse-computer-amber':{w:1,h:1,name:'Computer terminal · amber screen',model:'console',form:'computer',screen:'amber',cover:25,solid:true},
 'guardhouse-telephone':{w:1,h:1,name:'Telephone / radio console',model:'console',form:'telephone',cover:25,solid:true}
});
export const sceneryRule=p=>SCENERY_PROPS[p?.kind];
export const isScenery=p=>!!sceneryRule(p);
export const isHelicopter=p=>sceneryRule(p)?.model==='helicopter';
export const sceneryId=p=>`scenery:${p.x},${p.y},${p.z||0}`;
export function sceneryPoint(p,[x,y,h=0]){const r=sceneryRule(p);return {x:p.x+(p.rotated?r.h-1-y:x),y:p.y+(p.rotated?x:y),h:(p.z||0)*3+h,z:p.z||0};}
export function sceneryLocal(p,q){const r=sceneryRule(p);return p.rotated?{x:q.y-p.y,y:r.h-1-(q.x-p.x),h:(q.h??0)-(p.z||0)*3}:{x:q.x-p.x,y:q.y-p.y,h:(q.h??0)-(p.z||0)*3};}
