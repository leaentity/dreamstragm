/* 独立浏览器上下文使用虚构内容，不访问用户浏览器现有数据库。 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844}}), p=await context.newPage(), errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 const a=name=>p.locator(`[data-a="${name}"]`), field=name=>p.locator(`[data-field="${name}"]`);
 const idle=()=>p.waitForFunction(()=>!document.querySelector('.saving-status')&&!!document.querySelector('nav'));
 const loaded=async()=>{await p.waitForSelector('nav');await idle();};
 await require('./fixtures/tidy.cjs')(p);
 await require('./fixtures/image.cjs')(p);
 await p.goto('http://localhost:5174/?v=20261106-storage1');await loaded();
 await a('new').click();await field('draft.title').fill('Storage test');await field('draft.raw').fill('Original notes: a blue castle.');await a('organize').click();await p.waitForSelector('[data-field=organized]');await field('organized').fill('A blue castle floated above the clouds.');await a('tag:Flying').click();
 await a('saveOrganized').dblclick();await idle();await p.waitForSelector('[data-page=detail]');const id=await p.evaluate(()=>document.querySelector('[data-a=editDream]')&&document.querySelector('h1').textContent);assert.equal(id,'Storage test');
 await p.reload();await loaded();assert.equal(await p.locator('article h3',{hasText:'Storage test'}).count(),1);await p.locator('article').filter({hasText:'Storage test'}).click();
 assert.equal(await p.locator('details').filter({has:p.getByText('View original',{exact:true})}).locator('p').textContent(),'Original notes: a blue castle.');assert.match(await p.locator('main').innerText(),/A blue castle/);
 await a('editDream').click();assert.equal(await field('draft.raw').inputValue(),'A blue castle floated above the clouds.');await field('draft.raw').fill('Edited confirmed text: a silver castle.');await a('saveRaw').click();await idle();await p.reload();await loaded();await p.locator('article').filter({hasText:'Storage test'}).click();
 assert.equal(await p.locator('details').filter({has:p.getByText('View original',{exact:true})}).locator('p').textContent(),'Original notes: a blue castle.');assert.match(await p.locator('main').innerText(),/3 versions/);
 await a('exploreCurrent').click();await a('start:interpret').click();await a('god:Freud').click();await field('chatDraft').fill('It felt peaceful.');await a('send').click();await a('makeCard').click();await a('saveCard').click();await idle();await a('back').click();await a('back').click();await a('back').click();
 await a('start:image').click();assert.match(await field('description').inputValue(),/blue castle/);await p.route('**/api/image', route => route.fulfill({status:503,json:{error:{code:'MODEL_UNAVAILABLE'}}}),{times:1});
 await a('generate').click();await a('returnInput').click();assert.match(await field('description').inputValue(),/blue castle/);
 await a('generate').click();await p.waitForSelector('[data-a=saveImage]');
 await p.evaluate(()=>Object.defineProperty(navigator,'canShare',{value:()=>false}));
 const imageDownload=p.waitForEvent('download');
 await a('shareImage').click();
 const jpeg=await imageDownload;
 assert.equal(jpeg.suggestedFilename(),'dreamstragm-illustration.jpg');
 assert.deepEqual(fs.readFileSync(await jpeg.path()),fs.readFileSync(require.resolve('./fixtures/image.jpg')));
 await a('saveImage').click();await idle();assert.equal(await a('saveImage').count(),0);await a('generate').click();await a('saveImage').click();await idle();
 await a('shareImageToCircle').click();await a('publicType:Tags').click();await a('preview').click();assert.doesNotMatch(await p.locator('main').innerText(),/silver castle|Original notes/);await a('confirmPublish').click();await idle();await p.locator('[data-a^="post:"]').first().click();await field('commentDraft').fill('A local reply');await a('comment').click();await idle();
 await p.reload();await loaded();await a('nav:circle').click();await p.locator('[data-a^="post:"]').first().click();assert.match(await p.locator('main').innerText(),/A local reply/);
 await a('nav:journal').click();await p.locator('article').filter({hasText:'Storage test'}).click();assert.equal(await p.locator('.art img').count(),2);assert.match(await p.locator('main').innerText(),/Freud/);for(const img of await p.locator('.art img').all()){await img.evaluate(i=>i.decode());assert.equal(await img.evaluate(i=>i.complete&&i.naturalWidth>0),true);}
 fs.mkdirSync('outputs/storage',{recursive:true});await p.screenshot({path:'outputs/storage/saved-dream.png',fullPage:true});
 // 导出备份并通过 UI 恢复；先清空再刷新，确保示例不复活。
 await a('settings').click();await a('data').click();const download=p.waitForEvent('download');await a('backup').click();const file=await download;await idle();await file.saveAs('outputs/storage/test-backup.json');const backup=JSON.parse(fs.readFileSync('outputs/storage/test-backup.json','utf8'));assert.equal(backup.state.dreams.length,4);
 await a('reset').click();await a('confirmReset').click();await idle();await p.reload();await loaded();assert.equal(await p.locator('article.card').count(),0);await a('settings').click();await a('data').click();await p.locator('#restoreFile').setInputFiles('outputs/storage/test-backup.json');await idle();await p.waitForSelector('article');assert.equal(await p.locator('article').filter({hasText:'Storage test'}).count(),1);
 // 删除私人记录，公开图片快照和评论仍在。
 await p.locator('article').filter({hasText:'Storage test'}).click();await a('delete').click();await a('confirmDelete').click();await idle();await p.reload();await loaded();assert.equal(await p.locator('article').filter({hasText:'Storage test'}).count(),0);await a('nav:circle').click();await p.locator('[data-a^="post:"]').first().click();assert.match(await p.locator('main').innerText(),/A local reply/);assert.equal(await p.locator('.art img').count(),1);
 // 真实 IDB 事务注入写入异常，输入与界面状态应保留；恢复后重试。
 await a('nav:journal').click();await a('new').click();await field('draft.title').fill('Quota draft');await field('draft.raw').fill('Keep this input after failure.');
 await p.evaluate(()=>{globalThis.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError');};});await a('saveRaw').click();await p.waitForSelector('.storage-error');await idle();assert.match(await p.locator('.storage-error').innerText(),/storage is full/);assert.equal(await field('draft.raw').inputValue(),'Keep this input after failure.');assert.equal(await p.locator('[data-page=detail]').count(),0);
 await p.evaluate(()=>IDBObjectStore.prototype.put=globalThis.originalPut);await a('saveRaw').click();await idle();await p.waitForSelector('[data-page=detail]');await p.reload();await loaded();assert.equal(await p.locator('article').filter({hasText:'Quota draft'}).count(),1);
 // 同 origin 新页面 / 新连接读取同一份已提交数据。
 const second=await context.newPage();await second.goto('http://localhost:5174/');await second.waitForSelector('nav');assert.equal(await second.locator('article').filter({hasText:'Quota draft'}).count(),1);await second.close();
 for(const width of[360,390,430]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 // 不支持的数据版本不覆盖原库；仍可下载原始恢复信息。
 const brokenContext=await browser.newContext(), q=await brokenContext.newPage();q.on('pageerror',e=>errors.push(e.message));await q.goto('http://localhost:5174/');await q.waitForSelector('nav');
 await q.evaluate(()=>new Promise((resolve,reject)=>{const open=indexedDB.open('dreamstragm-local',1);open.onsuccess=()=>{const db=open.result,tx=db.transaction('meta','readwrite'),table=tx.objectStore('meta'),request=table.get('state');request.onsuccess=()=>{const state=request.result;state.schemaVersion=99;table.put(state,'state');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
 await q.reload();await q.waitForSelector('[data-a=retryStorage]');assert.match(await q.locator('main').innerText(),/data version/);const recoveryDownload=q.waitForEvent('download');await q.locator('[data-a=recovery]').click();const recoveryFile=await recoveryDownload;await recoveryFile.saveAs('outputs/storage/recovery.json');assert.equal(JSON.parse(fs.readFileSync('outputs/storage/recovery.json','utf8')).schemaVersion,99);await brokenContext.close();
 const deniedContext=await browser.newContext();await deniedContext.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Blocked','SecurityError');}}));const denied=await deniedContext.newPage();denied.on('pageerror',e=>errors.push(e.message));await denied.goto('http://localhost:5174/');await denied.waitForSelector('[data-a=retryStorage]');assert.match(await denied.locator('main').innerText(),/blocked local storage/);await deniedContext.close();
 // 同一个独立测试档案关闭浏览器进程后，再启动读取。
 const profile=fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(),'dreamstragm-storage-'));
 const options={...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true};
 let persistent=await chromium.launchPersistentContext(profile,options);let fresh=await persistent.newPage();await fresh.goto('http://localhost:5174/');await fresh.waitForSelector('nav');await fresh.locator('[data-a=new]').click();await fresh.locator('[data-field=\"draft.title\"]').fill('Browser restart');await fresh.locator('[data-field=\"draft.raw\"]').fill('Survives closing the test browser.');await fresh.locator('[data-a=saveRaw]').click();await fresh.waitForSelector('[data-page=detail]');await persistent.close();
 persistent=await chromium.launchPersistentContext(profile,options);fresh=await persistent.newPage();await fresh.goto('http://localhost:5174/');await fresh.waitForSelector('nav');assert.equal(await fresh.locator('article').filter({hasText:'Browser restart'}).count(),1);await persistent.close();fs.rmSync(profile,{recursive:true,force:true});
 assert.deepEqual(errors,[]);console.log('PASS real IndexedDB: refresh/reopen; immutable original + 2 text versions; stable dream attachments and card; double click; 2 image blobs; public snapshot privacy + comments; full backup/restore; delete/clear without reseeding; quota failure retains input and retries; 360/390/430 layout; no JS errors.');
 await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
