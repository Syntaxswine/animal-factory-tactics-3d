// Legacy motion adapters repartition torso cloth between hips, spine and arms.
// Retain the model's fitted neck attachment while keeping that repartition on
// the remaining weight. Vertices without head influence remain byte-identical.
export function preserveClothingHeadWeights(saved,head){
 for(const {m,indices,weights}of saved){
  if(!/shirt|waistcoat|trousers|overalls/.test(m.name))continue;
  const a=m.geometry.attributes;
  for(let i=0;i<a.skinWeight.count;i++){
   let held=0,current=0;const other=new Map();
   for(let k=0;k<4;k++){
    if(indices.getComponent(i,k)===head)held+=weights.getComponent(i,k);
    const bone=a.skinIndex.getComponent(i,k),w=a.skinWeight.getComponent(i,k);
    if(bone===head)current+=w;else if(w>0)other.set(bone,(other.get(bone)||0)+w);
   }
   if(held<=0||Math.abs(held-current)<1e-7)continue;
   const slots=[...other].sort((x,y)=>y[1]-x[1]).slice(0,3),sum=slots.reduce((n,[,w])=>n+w,0);
   const result=[[head,held],...slots.map(([bone,w])=>[bone,sum?w*(1-held)/sum:0])];
   while(result.length<4)result.push([0,0]);
   a.skinIndex.setXYZW(i,...result.map(([bone])=>bone));a.skinWeight.setXYZW(i,...result.map(([,w])=>w));
  }
 }
}

// The weights a part's names give it, as copies of its skin index and weight arrays: the character's fit of the cloth on
// the neck (horse-light-model.js) keeps them in userData.layerFit for the vertices it moved. For what reads the rig by its
// names: the idle's rig key, the casualty's contact sets, the fire's cards.
export function namedWeights(g){const a=g.attributes,f=g.userData.layerFit,si=a.skinIndex.array.slice(),sw=a.skinWeight.array.slice();if(f)f.vertices.forEach((v,k)=>{si.set(f.index.subarray(4*k,4*k+4),4*v);sw.set(f.weight.subarray(4*k,4*k+4),4*v);});return {si,sw};}
