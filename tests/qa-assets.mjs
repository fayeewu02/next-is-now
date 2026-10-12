import {chromium,sharp,BASE_URL,launchOptions} from '../tools/runtime.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('qa/assets');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(launchOptions);
const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await ctx.newPage();const errors=[];const checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const home=async()=>{await page.locator('.brand').click();await page.getByTestId('target-mode').waitFor();};
const result=async()=>{await page.getByTestId('result-title').waitFor();await page.waitForFunction(()=>{const i=document.querySelector('[data-testid="primary-cover"]');return i?.complete&&i.naturalWidth>0;});};
const shot=async(name)=>page.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});
async function pick(category,minutes=15,custom=''){
  await home();await page.getByTestId('target-mode').click();await page.getByTestId(`time-${minutes}`).click();await page.getByTestId(`category-${category}`).click();
  if(custom)await page.getByTestId('custom-goal').fill(custom);
  await page.getByTestId('draw-button').click();await result();
}
try{
  await page.goto(BASE_URL);await page.getByTestId('target-mode').waitFor();
  assert.equal(await page.locator('.hero [data-testid="target-mode"]').count(),1);assert.equal(await page.locator('.hero [data-testid="random-mode"]').count(),1);
  assert.equal(await page.getByText('灵感来自',{exact:false}).count(),0);assert.equal(await page.locator('.little-note').count(),0);await shot('01-home-unified-mobile.png');
  await page.getByTestId('target-mode').click();assert.equal(await page.getByTestId('category-美食').count(),1);assert.equal(await page.getByText('现在什么状态？').count(),0);
  const cardHeight=await page.getByTestId('category-手工').evaluate(e=>e.getBoundingClientRect().height);assert.ok(cardHeight<=90&&cardHeight>=44);await shot('02-compact-categories.png');
  checks.push('both modes inside yellow landing; deleted footer/state controls; compact food category added');
  await pick('阅读');assert.equal(await page.getByTestId('result-title').innerText(),'写得太艺术了。');assert.equal(await page.getByTestId('materials-panel').count(),0);await shot('03-reading-cover.png');
  await page.getByTestId('primary-cover').click();assert.equal(await page.locator('.full-source-image').count(),1);assert.match(await page.locator('#modal-body').innerText(),/史铁生/);await page.locator('[data-action="close-modal"]').click();
  await pick('播客');assert.equal(await page.getByTestId('materials-panel').count(),0);assert.match(await page.getByTestId('result-time').innerText(),/试听/);await shot('04-podcast-cover.png');
  await pick('运动');assert.equal(await page.getByTestId('materials-panel').count(),0);assert.equal(await page.getByTestId('result-time').getAttribute('data-minutes'),'15');await shot('05-sport-cover.png');
  await pick('美食',30);assert.match(await page.getByTestId('result-title').innerText(),/皮蛋肉酱/);assert.equal(await page.getByTestId('materials-panel').count(),1);await shot('06-food-cover.png');
  checks.push('reading/podcast/sport omit checklists; food retains one; original covers/titles and full screenshot viewer work');
  await pick('自填项',15,'小楷');assert.match(await page.getByTestId('result-title').innerText(),/小楷/);assert.equal(await page.getByTestId('materials-panel').count(),1);
  await page.getByTestId('material-mat').uncheck();assert.match(await page.getByTestId('adapt-panel').innerText(),/省去可选项/);
  await page.getByTestId('material-xuanpaper').uncheck();assert.equal(await page.getByTestId('start-button').isDisabled(),true);await page.getByTestId('demo-search').click();await page.getByTestId('demo-search-results').waitFor();await page.locator('.demo-result[data-id="demo-plain-paper"]').click();await page.getByTestId('demo-material-ready').check();await page.getByTestId('accept-demo-plan').click();
  assert.equal(await page.getByTestId('result-time').getAttribute('data-minutes'),'18');assert.equal(await page.getByTestId('over-budget').isVisible(),true);await page.locator('[data-action="extend-time"]').click();
  await page.getByTestId('start-button').dblclick();await page.getByTestId('first-step').waitFor();await page.locator('[data-nav="diary"]').click();assert.equal(await page.getByTestId('journal-entry').count(),1);
  await page.getByTestId('journal-entry').click();await page.getByTestId('diary-text').fill('字'.repeat(301));assert.equal(await page.getByTestId('save-diary').isDisabled(),true);
  const text='测试：这次选了小楷，普通纸版，想练一小会儿。';await page.getByTestId('diary-text').fill(text);
  const png=await sharp({create:{width:200,height:160,channels:3,background:'#ffd6de'}}).png().toBuffer();
  await page.getByTestId('photo-input').setInputFiles(Array.from({length:6},(_,i)=>({name:`test-${i}.png`,mimeType:'image/png',buffer:png})));
  await page.waitForFunction(()=>document.querySelector('[data-testid="photo-count"]')?.textContent.includes('5/5'));assert.equal(await page.locator('.photo-slot img').count(),5);await page.getByTestId('save-diary').click();await page.getByTestId('journal-entry').waitFor();
  await page.reload();await page.locator('[data-nav="diary"]').click();await page.getByTestId('journal-entry').waitFor();await page.getByTestId('journal-entry').click();assert.equal(await page.getByTestId('diary-text').inputValue(),text);assert.equal(await page.locator('.photo-slot img').count(),5);
  checks.push('custom search selects related saved material; material/time safeguards; 5 photos/300 chars and reload persistence preserved');
  await page.locator('[data-nav="diary"]').click();await pick('自填项',0,'绵绵冰');assert.equal(await page.getByTestId('result-time').getAttribute('data-minutes'),'380');assert.match(await page.getByTestId('result-time').innerText(),/冷冻/);assert.equal(await page.getByTestId('start-button').isEnabled(),true);
  await home();await page.getByTestId('target-mode').click();await page.getByTestId('category-自填项').click();await page.getByTestId('custom-goal').fill('绵绵冰');await page.getByTestId('draw-button').click();await page.getByRole('heading',{name:'这个方向，暂时没找到'}).waitFor();
  checks.push('long freezing time is included and cannot match 30 minutes; unlimited option exposes long activities');
  const sweep=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await sweep.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(BASE_URL);
  await p.getByTestId('random-mode').click();await p.getByTestId('result-title').waitFor();const seen=new Set();
  const inspect=async()=>{await p.waitForFunction(()=>{const i=document.querySelector('[data-testid="primary-cover"]');return i?.complete&&i.naturalWidth>0;});const id=await p.getByTestId('primary-cover').getAttribute('data-note-id');assert.ok(!seen.has(id));seen.add(id);const note=await p.evaluate(id=>window.NEXT_NOW_DATA.find(n=>n.id===id),id);assert.equal(await p.getByTestId('result-title').innerText(),note.title);assert.equal(await p.getByTestId('materials-panel').count(),['手工','美食'].includes(note.category)?1:0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));};
  await inspect();await p.locator('[data-action="adjust-conditions"]').click();await p.getByTestId('time-0').click();await p.getByTestId('draw-button').click();
  for(let i=0;i<20;i++){await p.getByTestId('result-title').waitFor();await inspect();if(i<19)await p.locator('[data-action="again"]').first().click();}
  assert.equal(seen.size,21);await p.locator('[data-action="again"]').first().click();await p.getByRole('heading',{name:'这一轮，已经扭完啦'}).waitFor();await sweep.close();
  checks.push('all 21 covers load and match their exact title/category; no duplicates in a round; no mobile overflow across all result cards');
  await home();await page.setViewportSize({width:320,height:700});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByTestId('target-mode').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await home();await page.setViewportSize({width:1440,height:1000});await shot('07-home-unified-desktop.png');
  await pick('美食',30);await shot('08-food-desktop.png');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,assetsVerified:21,browserErrors:errors},null,2));
}catch(error){await shot('failure.png').catch(()=>{});console.error(error.stack);process.exitCode=1;}finally{await browser.close();}
