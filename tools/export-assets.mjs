// Deterministic extraction, not a redesign. Never edits dist/app.js or supplied images.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {sharp,chromium,launchOptions} from './runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const write=(name,data)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);};
const json=(name,data)=>write(name,JSON.stringify(data,null,2)+'\n');
const window={addEventListener(){}};
const sandbox={window,document:{addEventListener(){}},Intl,Date,setTimeout,clearTimeout,console};
vm.createContext(sandbox);
for(const name of ['data.js','content.js','alternatives-demo.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',name),'utf8'),sandbox,{filename:name});
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
const marker='  render();boot();';
if(!app.includes(marker))throw new Error('Export hook no longer matches canonical code. Review before extracting.');
vm.runInContext(app.replace(marker,'  window.EXPORTS={machineSVG,art,flower,icon,glyphs};'),sandbox);
const exports=window.EXPORTS,notes=window.NEXT_NOW_DATA,assets=[];
json('manifests/collection.json',notes);
json('manifests/guides.json',window.NEXT_NOW_GUIDES);
json('manifests/demo-alternatives.json',window.NEXT_NOW_DEMO_ALTERNATIVES);
for(const n of notes){
  const input=path.join(root,'dist',n.cover),[left,top,width,height]=n.crop;
  const file=`assets/covers/${n.id}-cover.png`;
  const image=sharp(input);const meta=await image.metadata();
  if(meta.width!==n.imageWidth||meta.height!==n.imageHeight)throw new Error(`Original dimensions mismatch: ${n.id}`);
  write(file,await image.extract({left,top,width,height}).png({compressionLevel:9}).toBuffer());
  assets.push({id:n.id,type:'provided-cover',title:n.title,category:n.category,author:n.author,original:'dist/'+n.cover,originalSize:{width:meta.width,height:meta.height},crop:{left,top,width,height},cropped:file,minutes:n.minutes,durationLabel:n.durationLabel,timeBasis:n.timeBasis,sourceUrl:null,rights:'User-provided reference; original creators retain rights; no commercial reuse authorization inferred.'});
}
const browser=await chromium.launch(launchOptions),page=await browser.newPage({viewport:{width:1200,height:1100},deviceScaleFactor:1});
const svgs=[['gacha-machine',exports.machineSVG(),'illustrations',240,276],['completion-flower',exports.flower(),'icons',48,48]];
const opened=app.match(/<svg class="opened-capsule"[\s\S]*?<\/svg>/)?.[0];
if(!opened)throw new Error('Opened-capsule asset not found in canonical renderer.');
svgs.push(['gacha-opened-capsule',opened,'illustrations',132,78]);
for(const [id,cat] of Object.entries({craft:'手工',reading:'阅读',podcast:'播客',sport:'运动',food:'美食',creation:'创作'}))svgs.push([`category-${id}`,exports.art(cat),'illustrations',410,290]);
for(const name of Object.keys(exports.glyphs))svgs.push([`ui-${name}`,exports.icon(name),'icons',24,24]);
try{
  for(const [id,raw,folder,width,height] of svgs){
    const color=id==='completion-flower'?'#ff2442':'#202124';
    const svg=raw.replace('<svg ',`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="color:${color};font-family:Microsoft YaHei,PingFang SC,system-ui,sans-serif" `);
    const svgPath=`assets/${folder}/svg/${id}.svg`;write(svgPath,svg+'\n');
    const pngs=[];
    for(const scale of [2,3]){
      await page.setViewportSize({width:width*scale+40,height:height*scale+40});
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${width*scale}px;height:${height*scale}px}</style>${svg}`);
      const png=`assets/${folder}/png/${id}@${scale}x.png`;
      write(png,await page.locator('svg').screenshot({omitBackground:true,animations:'disabled'}));pngs.push(png);
    }
    assets.push({id,type:'code-native-vector',canonical:'dist/app.js',svg:svgPath,pngs,size:{width,height},color,note:id==='gacha-machine'?'SVG containing text needs the documented system font; PNG reference freezes this machine rendering.':'SVG currentColor may be changed when used inline.'});
  }
}finally{await browser.close();}
assets.push({id:'favicon',type:'code-native-vector',canonical:'dist/icon.svg'});
json('manifests/assets.json',{schemaVersion:1,generatedAt:new Date().toISOString(),sourceOfTruth:'dist files; exports are derivatives for porting, not replacements required by runtime',assets});
const css=fs.readFileSync(path.join(root,'dist/styles.css'),'utf8'),tokens={};
for(const [,name,value]of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g))if(!value.includes('var('))tokens[name]=value.trim();
json('manifests/design-tokens.json',{note:'CSS custom-property declarations only; scoped tokens are not all global. Consult ordered canonical stylesheet and screenshot metrics.',declarationsLastSeen:tokens,categoryColors:['#bfefff','#d7edaa','#ffe45c','#ffd6de','#fff0b6','#c7efe4'],canonical:'dist/styles.css'});
console.log(JSON.stringify({passed:true,originalCovers:notes.length,croppedCovers:notes.length,vectorAssets:svgs.length,bitmapScales:[2,3]}));
