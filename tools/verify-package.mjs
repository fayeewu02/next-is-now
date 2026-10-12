import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifests/files.sha256.json'),'utf8'));
const errors=[];
for(const f of manifest.files){
  const p=path.resolve(root,f.path);
  if(!p.startsWith(root+path.sep)){errors.push('Unsafe path: '+f.path);continue;}
  try{const bytes=fs.readFileSync(p),sha=crypto.createHash('sha256').update(bytes).digest('hex');if(bytes.length!==f.bytes||sha!==f.sha256)errors.push('Changed: '+f.path);}catch{errors.push('Missing: '+f.path);}
}
console.log(JSON.stringify({passed:!errors.length,filesChecked:manifest.files.length,errors},null,2));
if(errors.length)process.exitCode=1;
