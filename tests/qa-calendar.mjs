import {chromium,sharp,BASE_URL,launchOptions} from '../tools/runtime.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('qa/calendar');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(launchOptions);
const errors=[],checks=[];
async function contextAt(iso){
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',timezoneId:'America/Los_Angeles'});
  // An intentionally different browser timezone verifies that civil days use Shanghai time.
  await ctx.addInitScript(timestamp=>{const RealDate=Date;class QADate extends RealDate{constructor(...args){super(...(args.length?args:[timestamp]));}static now(){return timestamp;}}window.Date=QADate;},Date.parse(iso));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto((BASE_URL+'/'));await page.getByTestId('target-mode').waitFor();return {ctx,page};
}
const shot=async(p,name)=>p.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});
const day=(p,key)=>p.locator(`[data-day="${key}"]`);
const diary=async p=>{await p.locator('[data-nav="diary"]').click();await p.getByTestId('calendar-panel').waitFor();};
const home=async p=>{await p.locator('.brand').click();await p.getByTestId('target-mode').waitFor();};
async function startReading(p){
  await home(p);await p.getByTestId('target-mode').click();await p.getByTestId('category-阅读').click();await p.getByTestId('draw-button').click();await p.getByTestId('start-button').waitFor();await p.getByTestId('start-button').click();await p.getByTestId('first-step').waitFor();
}
async function stored(p){return p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('next-is-now-demo',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('entries').objectStore('entries').getAll();q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};}));}
async function seed(p,rows){
  await p.evaluate(rows=>new Promise((resolve,reject)=>{const r=indexedDB.open('next-is-now-demo',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('entries','readwrite'),s=t.objectStore('entries');s.clear();for(const row of rows)s.put(row);t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);};}),rows);
  await p.reload();await p.getByTestId('target-mode').waitFor();await diary(p);
  await p.waitForFunction(count=>document.querySelectorAll('[data-testid="journal-entry"]').length===count,rows.length);
}
let currentPage;
try{
  const {ctx,page:p}=await contextAt('2026-10-11T12:00:00+08:00');currentPage=p;
  await diary(p);assert.equal(await p.getByTestId('calendar-day').count(),31);assert.equal(await p.locator('.calendar-day.lit').count(),0);await shot(p,'01-empty-calendar-mobile.png');
  await startReading(p);await diary(p);await p.getByTestId('journal-entry').waitFor();assert.equal(await p.locator('.calendar-day.lit').count(),0);assert.equal(await day(p,'2026-10-11').locator('.started-dot').count(),1);assert.equal(await p.getByTestId('journal-entry').locator('img').count(),0);
  const firstId=await p.getByTestId('journal-entry').getAttribute('data-id');await p.getByTestId('journal-entry').click();await p.getByTestId('diary-text').waitFor();
  assert.equal(await p.getByTestId('toggle-complete').count(),0);assert.equal((await stored(p))[0].completionMethod,'record');assert.equal((await stored(p))[0].completedAt,Date.parse('2026-10-11T12:00:00+08:00'));
  await p.getByTestId('diary-text').fill('进入灵感记录就自动打卡，文字和照片需要另存。');
  const png=await sharp({create:{width:180,height:180,channels:3,background:'#ffbdd0'}}).png().toBuffer();
  await p.getByTestId('photo-input').setInputFiles({name:'qa-photo.png',mimeType:'image/png',buffer:png});await p.waitForFunction(()=>document.querySelector('[data-testid="photo-count"]')?.textContent.includes('1/5'));await p.getByTestId('save-diary').click();await p.getByTestId('journal-entry').waitFor();assert.equal(await p.locator('.calendar-day.lit').count(),1);assert.equal(await p.getByTestId('journal-thumbnail').count(),1);
  await p.reload();await diary(p);await p.getByTestId('journal-entry').waitFor();assert.equal(await p.locator('.calendar-day.lit').count(),1);await p.getByTestId('journal-entry').click();
  await p.getByTestId('diary-text').fill('这段文字没有保存。');await p.locator('[data-nav="diary"]').click();await p.getByRole('heading',{name:'这一页要先存好吗？'}).waitFor();await p.locator('[data-action="leave-editor"]').click();assert.equal(await p.locator('.calendar-day.lit').count(),1);
  assert.equal((await stored(p))[0].text,'进入灵感记录就自动打卡，文字和照片需要另存。');
  await p.reload();await diary(p);await p.getByTestId('journal-entry').waitFor();assert.equal(await p.locator('.calendar-day.lit').count(),1);
  await day(p,'2026-10-10').click();assert.equal(await p.getByTestId('journal-entry').count(),0);assert.match(await p.locator('.timeline-empty').innerText(),/这一天，还没有记录/);await p.getByRole('button',{name:'全部记录',exact:true}).click();assert.equal(await p.getByTestId('journal-entry').count(),1);
  checks.push('empty calendar defaults to current Shanghai month; starting alone does not mark; entering journal auto-marks with record provenance; unsaved text guard and refresh persistence work');
  await startReading(p);await shot(p,'02-start-completion-action.png');await p.getByTestId('complete-entry').dblclick();await p.getByTestId('completion-celebration').waitFor();await p.locator('[data-action="completion-later"]').click();assert.equal(await p.getByTestId('complete-entry').isDisabled(),true);await diary(p);assert.equal(await p.getByTestId('journal-entry').count(),2);assert.equal(await p.locator('.calendar-day.lit').count(),1);assert.match(await day(p,'2026-10-11').getAttribute('aria-label'),/完成 2 个收藏/);
  assert.equal(await p.getByTestId('journal-entry').filter({has:p.locator('img')}).count(),1);
  assert.equal((await stored(p)).filter(e=>e.completionMethod==='explicit').length,1);
  await p.locator(`[data-testid="journal-entry"][data-id="${firstId}"]`).click();await p.locator('[data-action="delete-entry"]').click();await p.locator('[data-action="confirm-delete"]').click();await p.getByTestId('calendar-panel').waitFor();assert.match(await day(p,'2026-10-11').getAttribute('aria-label'),/完成 1 个收藏/);
  const remaining=(await stored(p)).find(e=>e.completedAt);await p.locator(`[data-testid="journal-entry"][data-id="${remaining.id}"]`).click();await p.locator('[data-action="delete-entry"]').click();await p.locator('[data-action="confirm-delete"]').click();await p.getByTestId('calendar-panel').waitFor();assert.equal(await p.locator('.calendar-day.lit').count(),0);assert.equal(await p.getByTestId('journal-entry').count(),0);
  checks.push('same-day records aggregate into one flower; deleting one keeps other record; deleting last completed entry unlights date; explicit completion needs no photo or text');
  const notes=await p.evaluate(()=>window.NEXT_NOW_DATA);
  const photo='data:image/jpeg;base64,'+(await sharp('dist/assets/saved-05.jpg').extract({left:15,top:9,width:580,height:580}).resize(160,160).jpeg({quality:80}).toBuffer()).toString('base64');
  const fixture=(id,n,createdAt,completedAt,text='',photos=[])=>({id,itemId:n.id,title:n.title,category:n.category,minutes:n.minutes,durationLabel:n.durationLabel,materials:n.materials,steps:n.steps,source:n,createdAt:Date.parse(createdAt),...(completedAt?{completedAt:Date.parse(completedAt)}:{}),text,photos});
  const rows=[
    fixture('qa-11',notes[4],'2026-10-10T12:00:00+08:00','2026-10-10T17:05:00Z','给照片做了一个小相框，动手以后心情真的变好了。',[{id:'test-photo',data:photo,name:'qa-only.jpg'}]),
    fixture('qa-10',notes[14],'2026-10-10T20:00:00+08:00','2026-10-10T20:16:00+08:00','跟练了一小段，今天也认真照顾自己。'),
    fixture('qa-07',notes[7],'2026-10-07T16:00:00+08:00','2026-10-07T16:20:00+08:00','读了几页《好运设计》，有些句子想记很久。'),
    fixture('qa-01',notes[6],'2026-09-30T23:50:00+08:00','2026-10-01T00:15:00+08:00','听了一小段访谈。'),
    fixture('legacy-pending',notes[0],'2026-10-08T18:00:00+08:00',null,'旧记录有文字和照片，但没有完成确认。',[{id:'legacy-photo',data:photo,name:'qa-old.jpg'}])
  ];
  await seed(p,rows);assert.equal(await p.locator('.calendar-day.lit').count(),4);assert.equal(await day(p,'2026-10-11').locator('.inspiration-flower').count(),1);assert.equal(await day(p,'2026-10-08').locator('.inspiration-flower').count(),0);assert.equal(await day(p,'2026-10-08').locator('.started-dot').count(),1);
  assert.equal(await p.getByTestId('journal-thumbnail').count(),2);assert.equal(await p.locator('.timeline-card.text-only img').count(),0);assert.equal(await p.getByTestId('journal-entry').first().getAttribute('data-id'),'qa-11');assert.equal(await p.locator('.timeline-time time').first().innerText(),'01:05');
  await shot(p,'03-calendar-timeline-mobile-fixture.png');await day(p,'2026-10-07').click();assert.equal(await p.getByTestId('journal-entry').count(),1);assert.equal(await p.getByTestId('journal-thumbnail').count(),0);await shot(p,'04-selected-day-text-only.png');await p.locator('[data-action="calendar-all"]').click();
  await p.getByRole('button',{name:'仅看时间轴',exact:true}).click();assert.equal(await p.getByTestId('calendar-panel').count(),0);assert.equal(await p.getByTestId('journal-entry').count(),5);await shot(p,'05-timeline-only-mobile.png');await p.getByRole('button',{name:'日历和时间轴',exact:true}).click();
  for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}px`);const bad=await p.locator('.timeline-title,.calendar-month h2').evaluateAll(els=>els.filter(e=>e.scrollWidth>e.clientWidth+1).length);assert.equal(bad,0,`text overflow at ${width}px`);await shot(p,`06-calendar-${width}px.png`);}
  await p.setViewportSize({width:390,height:844});await p.getByTestId('journal-entry').first().click();await shot(p,'07-completed-editor.png');const stamp=(await stored(p)).find(e=>e.id==='qa-11').completedAt;await p.getByTestId('diary-text').fill('补充记录，不改变原来的完成日期。');await p.getByTestId('save-diary').click();await p.getByTestId('calendar-panel').waitFor();assert.equal((await stored(p)).find(e=>e.id==='qa-11').completedAt,stamp);
  checks.push('Shanghai midnight grouping works even in Los Angeles timezone; legacy entries preserved without inferred completion; thumbnail only for recorded photo; date filter, calendar/list toggle and 320/390/768/1440 layouts verified');
  await p.getByRole('button',{name:'下个月',exact:true}).click();await p.getByRole('button',{name:'下个月',exact:true}).click();assert.match(await p.getByTestId('calendar-month').innerText(),/2026年 12月/);await p.getByRole('button',{name:'下个月',exact:true}).click();assert.match(await p.getByTestId('calendar-month').innerText(),/2027年 01月/);await p.getByRole('button',{name:'上个月',exact:true}).click();assert.match(await p.getByTestId('calendar-month').innerText(),/2026年 12月/);await p.locator('[data-action="calendar-today"]').click();assert.match(await p.getByTestId('calendar-month').innerText(),/2026年 10月/);
  const leap=await contextAt('2028-02-29T09:00:00+08:00');currentPage=leap.page;await diary(leap.page);assert.equal(await leap.page.getByTestId('calendar-day').count(),29);assert.equal(await leap.page.locator('.calendar-blank').count(),1);assert.equal(await day(leap.page,'2028-02-29').getAttribute('aria-current'),'date');await shot(leap.page,'08-leap-month.png');await leap.page.getByRole('button',{name:'上个月',exact:true}).click();await leap.page.getByRole('button',{name:'上个月',exact:true}).click();assert.match(await leap.page.getByTestId('calendar-month').innerText(),/2027年 12月/);await leap.ctx.close();await ctx.close();
  checks.push('Monday-first month grid, leap day, December/January rollover, today navigation and editing without redating verified');
  assert.deepEqual(errors,[]);const report={passed:true,checks,browserErrors:errors,fixtures:'Only isolated QA browser storage. No example journals are shipped or written to the real user browser.'};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await currentPage?.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(error.stack);process.exitCode=1;}finally{await browser.close();}
