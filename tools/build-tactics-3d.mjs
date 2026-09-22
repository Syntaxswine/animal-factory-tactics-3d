import './build-tactics-pages.mjs';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
fs.copyFileSync(new URL('dist/tactics-3d.html',root),new URL('.pages-output/index.html',root));
for(const file of ['battle-3d.html','battle-3d.css','battle-3d.js','battle-renderer.js','battle-visibility.js','battle-map.js','battle-environment.js','battle-motion.js','worker-locomotion.js','default-factory.json'])fs.copyFileSync(new URL('dist/tactics/'+file,root),new URL('.pages-output/tactics/'+file,root));
fs.cpSync(new URL('dist/tactics/core/',root),new URL('.pages-output/tactics/core/',root),{recursive:true});
fs.writeFileSync(new URL('.pages-output/README.md',root),'# Animal Factory Tactics 3D\n\nIndependent experimental presentation project. See the landing page for available demos and their scope.\n');
console.log('Built Animal Factory Tactics 3D landing page.');
