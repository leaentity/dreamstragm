const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
require('node:fs').mkdirSync('outputs', {recursive:true});
// 只使用虚构示例；浏览器依赖由测试环境提供，不成为 App 运行依赖。
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const a=s=>p.locator(`[data-a="${s}"]`);
 await p.goto('http://localhost:5174/?v=20261106-ui1');
 for(const width of [360,390,430]){
  await p.setViewportSize({width,height:844});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await p.locator('.voice-bubble').isVisible(),true);
 }
 await p.setViewportSize({width:390,height:844});
 assert.equal(await p.getByText('早安，拾梦人').count(),0);
 await p.screenshot({path:'outputs/nov06-home.png',fullPage:true});
 await a('weather').click();await a('setWeather:☀ 晴').click();assert.match(await a('weather').innerText(),/手动/);
 await a('ambient').click();await p.waitForTimeout(200);assert.equal(await a('ambient').getAttribute('aria-pressed'),'true');
 await a('ambient').click();assert.equal(await a('ambient').getAttribute('aria-pressed'),'false');
 await a('quickVoice').click();await a('record').click();await a('record').click();
 await p.locator('[data-field="recordText"]').fill('我在一座云朵城堡里散步。');await a('useVoice').click();
 assert.equal(await p.locator('[data-field="draft.raw"]').inputValue(),'我在一座云朵城堡里散步。');
 const labels=await p.locator('main>label').allTextContents();assert.deepEqual(labels,['还记得什么？','梦境日期','给梦起个名字（可留空）']);
 await p.screenshot({path:'outputs/nov06-record.png',fullPage:true});
 await a('organize').click();await p.waitForTimeout(1400);await a('tag:飞行').click();await a('saveOrganized').click();
 assert.match(await p.locator('main').innerText(),/云朵城堡/);
 await a('nav:journal').click();await a('detail:2').click();await a('exploreCurrent').click();
 assert.match(await p.locator('.context-card').innerText(),/深夜书店/);
 await p.screenshot({path:'outputs/nov06-explore.png',fullPage:true});
 await a('start:interpret').click();assert.match(await p.locator('main').innerText(),/深夜书店/);assert.equal(await a('detail:1').count(),0);
 await a('god:弗洛伊德').click();await p.locator('#chatInput').fill('梦里感觉很温暖。');await a('send').click();
 assert.match(await p.locator('main').innerText(),/温暖/);await a('makeCard').click();await a('saveCard').click();
 await a('back').click();await a('back').click();await a('back').click();
 await a('start:image').click();assert.match(await p.locator('[data-field="description"]').inputValue(),/奶奶/);
 await a('generate').click();await p.waitForTimeout(1400);await a('saveImage').click();await a('shareImage').click();
 await a('publicType:关键词').click();await a('preview').click();
 const pub=await p.locator('main').innerText();assert.match(pub,/#奶奶/);assert.doesNotMatch(pub,/每翻开一本书/);
 await a('confirmPublish').click();await p.locator('[data-a^="post:"]').first().click();await p.locator('#commentInput').fill('喜欢这场梦');await a('comment').click();
 assert.match(await p.locator('main').innerText(),/喜欢这场梦/);
 await a('nav:journal').click();await a('detail:2').click();assert.match(await p.locator('main').innerText(),/解读示例/);assert.equal(await p.locator('.art').count(),1);
 await a('exploreCurrent').click();await a('changeContext').click();await a('detail:3').click();await a('start:image').click();
 assert.match(await p.locator('[data-field="description"]').inputValue(),/旧校园/);assert.doesNotMatch(await p.locator('[data-field="description"]').inputValue(),/奶奶/);
 await a('nav:explore').click();assert.equal(await p.locator('.context-card').count(),0);await a('start:interpret').click();assert.equal(await a('detail:1').count(),1);
 await a('nav:explore').click();await a('start:stats').click();await a('period:年').click();await a('stat:小林').click();assert.equal(await a('detail:1').count(),1);
 assert.deepEqual(errors,[]);
 for(const path of ['/','/.env','/.git/config','/ambient.js']){const r=await p.request.get('http://localhost:5174'+path);assert.equal(r.status(),path==='/'||path==='/ambient.js'?200:404);}
 console.log('PASS: 360/390/430 no overflow; voice-first + draft + organize/save; manual weather; real WebAudio toggle; dream context/reselection/isolation; image/card save; keyword privacy/publish/comment; statistics; no JS errors; preview whitelist.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
