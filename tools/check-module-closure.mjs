import fs from 'node:fs';

// Follow literal relative imports, re-exports, and module-worker URLs in the
// distribution itself: source files being present does not prove deployment.
export function checkModuleClosure(root,entries){
 const seen=new Set(),missing=[];
 function visit(url,parent){
  if(seen.has(url.href))return;seen.add(url.href);
  if(!fs.existsSync(url)){missing.push(`${parent} -> ${url.pathname}`);return;}
  const source=fs.readFileSync(url,'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\bnew\s+URL\(\s*)['"](\.{1,2}\/[^'"]+\.m?js)['"]/g))visit(new URL(match[1],url),url.pathname);
 }
 for(const entry of entries)visit(new URL(entry,root),'entry point');
 if(missing.length)throw Error('Missing deployed JavaScript modules:\n'+missing.join('\n'));
 return seen.size;
}
