import * as T from './vendor/three.module.js';
import {visibleLoot} from './battle-inventory.js';
import {unitBaseHeight} from './tower-geometry.js';
export class BattleLoot {
 constructor(scene){this.group=new T.Group();scene.add(this.group);this.geometry=new T.BoxGeometry(.42,.22,.32);this.material=new T.MeshStandardMaterial({color:0xb19b68,roughness:1});this.bands=new T.MeshStandardMaterial({color:0x4a5540,roughness:1});this.models=new Map();}
 sync(state,level){const shown=state.loot.filter(p=>p.body===undefined&&(p.z||0)===level&&visibleLoot(state,p));const keep=new Set(shown);for(const [p,model]of this.models)if(!keep.has(p)){this.group.remove(model);this.models.delete(p);}for(const p of shown){if(this.models.has(p))continue;const model=new T.Group(),box=new T.Mesh(this.geometry,this.material),band=new T.Mesh(this.geometry,this.bands);box.castShadow=true;box.receiveShadow=true;band.scale.set(.22,1.03,1.03);model.add(box,band);model.position.set(p.x,unitBaseHeight(p,2.12)+.11,p.y);model.userData.pile=p;this.group.add(model);this.models.set(p,model);}}
 pick(ray){for(const hit of ray.intersectObject(this.group,true)){let part=hit.object;while(part){if(part.userData.pile)return part.userData.pile;part=part.parent;}}return null;}
 dispose(){this.group.removeFromParent();this.geometry.dispose();this.material.dispose();this.bands.dispose();this.models.clear();}
}
