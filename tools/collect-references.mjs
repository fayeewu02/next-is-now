// Copies only fresh isolated-test screenshots/reports, never browser storage.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,sharp,BASE_URL,launchOptions} from './runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const write=(p,data)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
const json=(p,data)=>write(p,JSON.stringify(data,null,2)+'\n');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const screenshots=[];
for(const file of walk(path.join(root,'qa'))){
  const rel=path.relative(path.join(root,'qa'),file).replaceAll('\\','/');
  if(rel.endsWith('failure.png'))throw new Error('A failed-test screenshot exists. Do not package as accepted reference.');
  if(rel.endsWith('.png')){
    const to='references/screenshots/'+rel;write(to,fs.readFileSync(file));const meta=await sharp(file).metadata();
    screenshots.push({path:to,width:meta.width,height:meta.height,fixtureOnly:true,note:rel.includes('source-link-dialog')?'QA URL is mocked and not a real note.':rel.startsWith('home-layout/')?'Current original system-font layout.':'Isolated test content, not a user journal or source link.'});
  }else if(rel.endsWith('results.json'))write('references/test-results/'+rel,fs.readFileSync(file));
}
const browser=await chromium.launch(launchOptions),page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
try{
  await page.goto(BASE_URL+'/');await page.getByTestId('target-mode').waitFor();
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root:dom}=await cdp.send('DOM.getDocument'),fonts=[];
  for(const selector of ['.brand','.hero-title-intro','.hero-title-line','.red-text','.mode-target strong','.hero-subtitle','.mode-icon']){
    const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:dom.nodeId,selector});
    const result=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
    fonts.push({selector,fonts:result.fonts,computed:await page.locator(selector).first().evaluate(e=>({family:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight,size:getComputedStyle(e).fontSize}))});
  }
  json('references/font-rendering.json',{capturedAt:new Date().toISOString(),browser:browser.version(),platform:process.platform,deviceScaleFactor:1,viewport:{width:390,height:844},fonts,note:'Observed platform font usage, not bundled font files or cross-platform promise.'});
  const errors=[],smoke=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE_URL+'/portable-fonts.html');await page.getByTestId('target-mode').waitFor();await page.evaluate(()=>document.fonts.ready);
  for(const width of [320,390,430,1440]){
    await page.setViewportSize({width,height:width===1440?1000:844});
    const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
    const fontLoaded=await page.evaluate(()=>document.fonts.check('700 16px "NextNow Noto SC"'));
    if(!fits||!fontLoaded)throw new Error(`Portable font smoke failed at ${width}`);
    smoke.push({width,fits,fontLoaded});
    if(width===390||width===1440){const p=`references/portable-font-home-${width}px.png`;write(p,await page.screenshot({fullPage:true,animations:'disabled'}));}
  }
  await page.setViewportSize({width:390,height:844});await page.getByTestId('target-mode').click();await page.getByTestId('category-阅读').click();await page.getByTestId('draw-button').click();await page.getByTestId('start-button').waitFor();await page.getByTestId('start-button').click();await page.getByTestId('complete-entry').click();await page.getByTestId('completion-celebration').waitFor();await page.getByTestId('completion-record').click();await page.getByTestId('diary-text').fill('开源字体备用版烟测');await page.getByTestId('save-diary').click();await page.getByTestId('journal-entry').waitFor();
  if(errors.length)throw new Error(errors.join('\n'));
  json('references/test-results/portable-font-smoke.json',{passed:true,smoke,browserErrors:errors,scope:'Font file loads, homepage widths and one reading/checkin/record/journal path. Not full six-suite or cross-platform pixel verification.'});
}finally{await browser.close();}
const fontPath=path.join(root,'dist/fonts/NotoSansSC-VF.ttf'),fontBytes=fs.readFileSync(fontPath);
json('manifests/fonts.json',{schemaVersion:1,original:{stack:['Microsoft YaHei','PingFang SC','system-ui','sans-serif'],systemFontsBundled:false,observations:'references/font-rendering.json'},optional:[{family:'Noto Sans SC',cssAlias:'NextNow Noto SC',file:'dist/fonts/NotoSansSC-VF.ttf',bytes:fontBytes.length,sha256:crypto.createHash('sha256').update(fontBytes).digest('hex'),weights:'100-900 variable',license:'SIL Open Font License 1.1',licenseFile:'dist/fonts/OFL.txt',repository:'https://github.com/notofonts/noto-cjk',commit:'f8d157532fbfaeda587e826d4cd5b21a49186f7c',download:'https://raw.githubusercontent.com/notofonts/noto-cjk/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf',modified:false,entry:'dist/portable-fonts.html',pixelIdenticalToOriginal:false}]});
json('references/screenshot-index.json',{capturedAt:new Date().toISOString(),source:'Fresh six-suite run against packaged canonical dist on Windows Chrome',allJournalContentIsIsolatedQAFixture:true,screenshots});
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
write('references/gallery.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>v6 复刻验收图库</title><style>body{font-family:system-ui,sans-serif;background:#fff8e1;color:#202124;margin:32px}h1{font-size:24px}p{line-height:1.8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:24px}figure{margin:0;padding:12px;background:#fffdf4;border:1px solid #dccbaf;border-radius:14px}img{display:block;width:100%;height:320px;object-fit:contain;object-position:top;background:#fff}figcaption{font-size:12px;overflow-wrap:anywhere;padding:12px 0}a{color:#b71733}</style><h1>下次就是现在 · v6 当前代码参考图库</h1><p>先以 dist 原样运行结果为准。以下日记、照片、原帖 URL 为隔离测试样例，不是用户数据或真实帖子。日期与随机内容可变化。点击图片看原尺寸。</p><div class="grid">${screenshots.map(s=>`<figure><a href="${esc(s.path.replace('references/',''))}"><img src="${esc(s.path.replace('references/',''))}" loading="lazy"></a><figcaption>${esc(s.path.replace('references/screenshots/',''))} · ${s.width}×${s.height}</figcaption></figure>`).join('')}</div></html>`);
// Compact overview: 6 main states, deliberately not used as UI source.
const picks=['home-layout/home-390x844.png','checkin-flow/01-category-full-border.png','paper-flow/02-paper-ticket-reading.png','checkin-flow/03-completion-popup-390px.png','checkin-flow/05-photo-upload-label.png','paper-flow/09-warm-calendar-timeline.png'];
const blocks=await Promise.all(picks.map(async(rel,i)=>({input:await sharp(path.join(root,'references/screenshots',rel)).resize(260,563,{fit:'cover',position:'top'}).png().toBuffer(),left:16+(i%3)*276,top:16+Math.floor(i/3)*579})));
write('references/overview.png',await sharp({create:{width:844,height:1174,channels:4,background:'#fff8e1'}}).composite(blocks).png().toBuffer());
console.log(JSON.stringify({passed:true,currentScreenshots:screenshots.length,portableFontSmoke:true,fonts:1}));
