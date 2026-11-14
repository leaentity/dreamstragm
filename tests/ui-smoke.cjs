const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
require('node:fs').mkdirSync('outputs', {recursive:true});
// 只使用虚构示例；浏览器依赖由测试环境提供，不成为 App 运行依赖。
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const a=s=>p.locator(`[data-a="${s}"]`);
 await require('./fixtures/tidy.cjs')(p);
 await require('./fixtures/image.cjs')(p);
 await require('./fixtures/freud.cjs')(p);
 await p.goto('http://localhost:5174/?v=20261106-storage1');await p.waitForSelector('nav');
 const idle=()=>p.waitForFunction(()=>!document.querySelector('.saving-status'));
 p.on('dialog',d=>d.accept());
 for(const width of [360,390,430]){
  await p.setViewportSize({width,height:844});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await p.locator('.voice-bubble').isVisible(),true);
 }
 await p.setViewportSize({width:390,height:844});
 assert.equal(await p.getByText('早安，拾梦人').count(),0);
 await p.screenshot({path:'outputs/nov06-home.png',fullPage:true});
 await a('weather').click();await a('setWeather:☀ Sunny').click();assert.match(await a('weather').innerText(),/Manual/);
 await a('ambient').click();await p.waitForTimeout(200);assert.equal(await a('ambient').getAttribute('aria-pressed'),'true');
 await a('ambient').click();assert.equal(await a('ambient').getAttribute('aria-pressed'),'false');
 await a('quickVoice').click();await a('record').click();await a('record').click();
 await p.locator('[data-field="recordText"]').fill('I was walking through a castle in the clouds.');await a('useVoice').click();
 assert.equal(await p.locator('[data-field="draft.raw"]').inputValue(),'I was walking through a castle in the clouds.');
 const labels=await p.locator('main>label').allTextContents();assert.deepEqual(labels,['What do you remember?','Dream date','Give it a name (optional)']);
 await p.screenshot({path:'outputs/nov06-record.png',fullPage:true});
 await a('organize').click();await p.waitForTimeout(1400);await a('tag:Flying').click();await a('saveOrganized').click();await idle();
 assert.match(await p.locator('main').innerText(),/castle in the clouds/);
 await a('nav:journal').click();await a('detail:2').click();await a('exploreCurrent').click();
 assert.match(await p.locator('.context-card').innerText(),/midnight bookshop/);
 await p.screenshot({path:'outputs/nov06-explore.png',fullPage:true});
 await a('start:interpret').click();assert.match(await p.locator('main').innerText(),/midnight bookshop/);assert.equal(await a('detail:1').count(),0);
 await a('god:Freud').click();await p.locator('#chatInput').fill('It felt warm in the dream.');await a('send').click();await p.waitForSelector('.chat.me');
 assert.match(await p.locator('main').innerText(),/warm/);await a('makeCard').click();await a('saveCard').click();await idle();
 await a('back').click();await a('back').click();await a('back').click();
 await a('start:image').click();assert.match(await p.locator('[data-field="description"]').inputValue(),/Grandma/);
 await a('generate').click();await a('saveImage').click();await idle();await a('shareImageToCircle').click();
 await a('publicType:Tags').click();await a('preview').click();
 const pub=await p.locator('main').innerText();assert.match(pub,/#Grandma/);assert.doesNotMatch(pub,/little patch of stars/);
 await a('confirmPublish').click();await idle();await p.locator('[data-a^="post:"]').first().click();await p.locator('#commentInput').fill('I love this dream');await a('comment').click();await idle();
 assert.match(await p.locator('main').innerText(),/I love this dream/);
 await a('nav:journal').click();await a('detail:2').click();assert.match(await p.locator('main').innerText(),/Today’s fortune/);assert.equal(await p.locator('.art').count(),1);
 await a('exploreCurrent').click();await a('changeContext').click();await a('detail:3').click();await a('start:image').click();
 assert.match(await p.locator('[data-field="description"]').inputValue(),/went back to school/);assert.doesNotMatch(await p.locator('[data-field="description"]').inputValue(),/Grandma/);
 await a('nav:explore').click();assert.equal(await p.locator('.context-card').count(),0);await a('start:interpret').click();assert.equal(await a('detail:1').count(),1);
 await a('nav:explore').click();await a('start:stats').click();await a('period:Year').click();await a('stat:Lin').click();assert.equal(await a('detail:1').count(),1);
 assert.deepEqual(errors,[]);
 for(const path of ['/','/.env','/.git/config','/ambient.js']){const r=await p.request.get('http://localhost:5174'+path);assert.equal(r.status(),path==='/'||path==='/ambient.js'?200:404);}
 console.log('PASS: 360/390/430 no overflow; voice-first + draft + organize/save; manual weather; real WebAudio toggle; dream context/reselection/isolation; image/card save; keyword privacy/publish/comment; statistics; no JS errors; preview whitelist.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
