import {chromium,sharp,BASE_URL,launchOptions} from '../tools/runtime.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('qa/home-layout');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(launchOptions);
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto((BASE_URL+'/'));await page.getByTestId('target-mode').waitFor();
  for(const [width,height] of [[320,700],[360,780],[390,700],[390,844],[430,932],[768,1000],[1440,900],[1440,1000]]){
    await page.setViewportSize({width,height});
    const metrics=await page.evaluate(()=>{
      const rect=e=>{const {x,y,width,height,bottom}=e.getBoundingClientRect();return {x,y,width,height,bottom};};
      const heading=document.querySelector('.hero-title'),machine=document.querySelector('.hero .machine-wrap');
      return {viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,titleSize:parseFloat(getComputedStyle(heading).fontSize),title:rect(heading),machine:rect(machine),titleLines:[...document.querySelectorAll('.hero-title-line')].map(rect),nav:rect(document.querySelector('.bottom-nav')),cards:[...document.querySelectorAll('.mode-card')].map(e=>{
        const text=e.querySelector('strong'),icon=e.querySelector('.mode-icon'),range=document.createRange();range.selectNodeContents(text);
        return {button:rect(e),icon:rect(icon),text:rect(text),textLines:range.getClientRects().length,textOverflow:text.scrollWidth>text.clientWidth+1,descriptionOverflow:e.querySelector('small').scrollWidth>e.querySelector('small').clientWidth+1};
      })};
    });
    assert.equal(metrics.overflow,false,`horizontal overflow at ${width}`);assert.ok(metrics.titleSize>=(width<=760?44:64));assert.ok(metrics.machine.width>=(width<=360||width<=760&&height<=760?230:width<=760?260:310));
    assert.ok(Math.abs(metrics.title.x+metrics.title.width/2-width/2)<2,`title not centered at ${width}`);
    assert.ok(Math.abs(metrics.machine.x+metrics.machine.width/2-width/2)<2,`machine not centered at ${width}`);
    assert.ok(metrics.titleLines[0].x<metrics.titleLines[1].x,'two title lines should be staggered');
    for(const card of metrics.cards){
      assert.ok(card.button.height>=44&&card.button.height<=92,'compact card with safe touch area');
      assert.ok(card.text.x>=card.icon.x+card.icon.width+4,'title on right of icon');
      assert.ok(Math.abs(card.text.y+card.text.height/2-card.icon.y-card.icon.height/2)<2,'title and icon on same row');
      assert.equal(card.textLines,1);assert.equal(card.textOverflow,false);assert.equal(card.descriptionOverflow,false);
      assert.ok(card.button.x>=0&&card.button.x+card.button.width<=width,'card fits viewport');
      assert.ok(card.button.bottom<=metrics.nav.y-10,`card obstructed by navigation at ${width}x${height}`);
    }
    results.push(metrics);await page.screenshot({path:path.join(out,`home-${width}x${height}.png`),fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});await page.getByTestId('target-mode').click();await page.getByTestId('category-阅读').waitFor();assert.equal(await page.getByTestId('category-美食').count(),1);await page.locator('.brand').click();await page.getByTestId('random-mode').click();await page.getByTestId('result-title').waitFor();
  await page.locator('[data-nav="diary"]').click();await page.getByTestId('calendar-panel').waitFor();assert.deepEqual(errors,[]);
  const report={passed:true,checks:['larger centered staggered title and enlarged machine','compact cards; icon and title on one row at all widths','320/360/390/430/768/1440 layouts fit with navigation unobstructed','goal, random and diary navigation still work'],results,browserErrors:errors};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,checks:report.checks,sizes:results.map(r=>({width:r.viewport,title:r.titleSize,machine:r.machine.width,cardHeight:r.cards[0].button.height})),browserErrors:errors},null,2));
}catch(e){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(e.stack);process.exitCode=1;}finally{await browser.close();}
