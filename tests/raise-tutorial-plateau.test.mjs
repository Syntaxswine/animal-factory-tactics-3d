import test from 'node:test';
import assert from 'node:assert/strict';
import {raiseTutorialPlateau} from '../tools/raise-tutorial-plateau.mjs';

function fixture(){return {version:2,width:3,height:3,levels:3,name:'Authored clearing',terrain:Array.from({length:3},()=>Array(3).fill('ground-grass')),upper:[{'0,0':'ground-dirt','1,0':'ground-dirt'},{'0,0':'ground-grass','1,0':'ground-grass','1,1':'ground-grass'}],props:[{kind:'cliff-ledge',x:0,y:0,z:0,cliffMask:15,cliffVariant:1},{kind:'cliff-ledge',x:0,y:0,z:1,cliffMask:15,cliffVariant:2},{kind:'wooden-crate-closed',x:1,y:1,z:2,container:{id:'supplies'}}],edges:{},stairs:[],climbs:[],starts:[{x:1,y:0,z:2,character:{id:'merc-one'},heading:225}],guards:[],exits:[{x:1,y:1,z:2}],foliage:{'2,2,0':[75,true,'thicket-v1'],'1,0,2':[35,false,'woodland-v1']},sectorTemplate:{id:'tutorial-step-1',plateau:{closed:true,shelfWidth:[0,2],townApproach:{side:'north',level:2}}}};}

test('doubling cliff tiers preserves authored cells, clearings, identities and the source document',()=>{
 const original=fixture(),before=structuredClone(original),raised=raiseTutorialPlateau(original);
 assert.deepEqual(original,before);assert.equal(raised.levels,5);assert.deepEqual(raised.terrain,original.terrain);
 for(const [key,terrain]of Object.entries(original.upper[0]))assert.equal(raised.upper[1][key],terrain);
 assert.deepEqual(raised.upper[3],original.upper[1]);
 assert.deepEqual(raised.props.filter(p=>p.kind==='cliff-ledge').map(p=>[p.x,p.y,p.z,p.cliffVariant]),[[0,0,0,1],[0,0,1,1],[0,0,2,2],[0,0,3,2]]);
 for(const z of [1,2,3])assert.equal(raised.upper[z-1]['0,0'],z===1?'ground-grass':'ground-dirt');
 assert.deepEqual(raised.foliage,{'2,2,0':[75,true,'thicket-v1'],'1,0,4':[35,false,'woodland-v1']});
 assert.equal(raised.foliage['1,1,4'],undefined,'a clearing stays clear');
 assert.deepEqual(raised.starts,[{...original.starts[0],z:4}]);assert.deepEqual(raised.exits,[{...original.exits[0],z:4}]);
 assert.deepEqual(raised.props.at(-1),{...original.props.at(-1),z:4});assert.equal(raised.sectorTemplate.plateau.townApproach.level,4);
});

test('a summit on editor layer four can use a two-step lower cliff and one-step upper cliff',()=>{
 const raised=raiseTutorialPlateau(fixture(),{heights:[0,2,3]});assert.equal(raised.levels,4);assert.equal(raised.starts[0].z,3);assert.deepEqual(raised.sectorTemplate.plateau.tierHeights,[2,1]);assert.deepEqual(raised.upper[2],fixture().upper[1]);
});

test('raising refuses access routes that would need their own redesign',()=>{
 for(const change of [{stairs:[{x:1,y:1,z:0}]},{climbs:[{x:1,y:1,z:0,dx:1,dy:0}]},{edges:{'e:1:1':'wall'}},{props:[{kind:'ramp-woodgold-north',x:1,y:1,z:0}]}])assert.throws(()=>raiseTutorialPlateau({...fixture(),...change}),/before adding/);
 assert.throws(()=>raiseTutorialPlateau(fixture(),{heights:[0,2,2]}),/increasing/);
});
