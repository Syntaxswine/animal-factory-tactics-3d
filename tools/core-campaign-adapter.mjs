// Searchable containers use the same inventory, proximity and AP rules as bodies.
export const campaignOverrides={'engine.js':'Support persistent searchable containers alongside body searches; opening and searching remain separate actions.'};
export function adaptCoreCampaign(name,data){
 if(name!=='engine.js')return data;let s=data.toString();
 const replace=(from,to)=>{if(s.split(from).length!==2)throw Error('Campaign adapter anchor changed: '+from);s=s.replace(from,to);};
 replace("export const pileOpen=p=>p.body===undefined||!!p.searched;","export const pileOpen=p=>(p.body===undefined&&!p.container)||!!p.searched;");
 replace("else if(!adjacentTo(s,u,pile))reason='Stand beside the body';","else if(pile.container?.locked)reason='Container is locked';else if(!adjacentTo(s,u,pile))reason='Stand beside the body or container';");
 replace("const who=unit(s,pile.body)?.name||'the body';","const who=pile.container?.name||unit(s,pile.body)?.name||'the body';");
 return Buffer.from(s);
}
