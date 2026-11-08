/* 使用独立浏览器档案访问真实 HTTP 局域网地址，AI 请求拦截为测试结果。 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{assert.ok(process.env.PREVIEW_URL,'Set PREVIEW_URL to an HTTP LAN address, not localhost.');const b=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});try{
const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];let requests=0;
p.on('pageerror',e=>errors.push(e.message));
await p.route('**/api/organize',async route=>{requests++;const req=route.request();assert.match(req.headers()['x-request-id'],/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);assert.deepEqual(req.postDataJSON(),{text:'I walked past a blue cloud.'});await route.fulfill({json:{organizedText:'I walked past a blue cloud.',suggestedTags:[{name:'cloud',type:'theme'}]}});});
await p.goto(process.env.PREVIEW_URL+'/?v=20261107-phone1');await p.waitForSelector('nav');
assert.equal(await p.evaluate(()=>isSecureContext),false);assert.equal(await p.evaluate(()=>typeof crypto.randomUUID),'undefined');
await p.locator('[data-a=new]').click();await p.locator('[data-field="draft.raw"]').fill('A small moon in my notebook.');await p.locator('[data-field="draft.title"]').fill('HTTP manual test');await p.locator('[data-a=saveRaw]').click();await p.waitForSelector('#app[data-page=detail]');
await p.locator('[data-a="nav:journal"]').click();await p.locator('[data-a=new]').click();await p.locator('[data-field="draft.raw"]').fill('I walked past a blue cloud.');await p.locator('[data-field="draft.title"]').fill('HTTP AI fixture test');await p.locator('[data-a=organize]').click();await p.waitForSelector('[data-a=saveOrganized]');await p.locator('[data-a="tag:cloud"]').click();await p.locator('[data-a=saveOrganized]').click();await p.waitForSelector('#app[data-page=detail]');
await p.reload();await p.waitForSelector('nav');
const records=await p.evaluate(()=>store.list().filter(d=>d.title.startsWith('HTTP ')));
assert.equal(records.length,2);assert.equal(new Set(records.map(d=>d.id)).size,2);const ai=records.find(d=>d.title==='HTTP AI fixture test');assert.equal(ai.raw,'I walked past a blue cloud.');assert.equal(ai.body,ai.raw);assert.deepEqual(ai.tags,['cloud']);assert.equal(requests,1);assert.deepEqual(errors,[]);
console.log('PASS real insecure LAN origin without randomUUID: initialization, manual save, mocked tidy request ID, confirmed save/tags and reload. No real OpenAI calls.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
