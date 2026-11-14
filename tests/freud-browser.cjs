const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const action = name => page.locator(`[data-a="${name}"]`);
    const input = page.locator('#chatInput');
    const requests = [];
    let finishFirst;
    await page.route('**/api/freud', async route => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 1) {
        await new Promise(resolve => { finishFirst = resolve; });
        return route.fulfill({status:503,json:{error:{code:'UNAVAILABLE'}}});
      }
      await route.fulfill({json:{reply:'你补充的细节让我想到另一种理解。'}});
    });
    await page.goto('http://localhost:5174/');
    await action('detail:1').click();
    await action('exploreCurrent').click();
    await action('start:interpret').click();
    await action('god:Freud').click();
    await action('send').click();
    assert.equal(requests.length, 0);
    await input.fill('我梦到她在找我。');
    await action('send').click();
    await action('cancelGuide').waitFor();
    assert.equal(await action('send').count(), 0);
    while (!finishFirst) await new Promise(resolve => setTimeout(resolve, 20));
    finishFirst();
    await page.locator('.guide-error').waitFor();
    assert.equal(await input.inputValue(), '我梦到她在找我。');
    await action('send').click();
    await page.locator('.chat.me').waitFor();
    await input.fill('不对，是我在找她。');
    await action('send').click();
    await page.waitForFunction(() => document.querySelectorAll('.chat.me').length === 2);
    assert.equal(requests[2].messages.length, 3);
    assert.equal(requests[2].messages.at(-1).content, '不对，是我在找她。');
    assert.equal(requests[2].messages[1].role, 'assistant');
    await input.fill('我最后看到了门。');
    await action('send').click();
    await page.waitForFunction(() => document.querySelectorAll('.chat.me').length === 3);
    assert.equal(requests[3].messages.length, 5);
    page.once('dialog', dialog => dialog.dismiss());
    await action('restartGuide').click();
    assert.equal(await page.locator('.chat.me').count(), 3);
    page.once('dialog', dialog => dialog.accept());
    await action('restartGuide').click();
    assert.equal(await page.locator('.chat.me').count(), 0);
    await action('nav:journal').click();
    await action('detail:2').click();
    await action('exploreCurrent').click();
    await action('start:interpret').click();
    await action('god:Freud').click();
    await input.fill('这是另一条梦。'.repeat(150));
    await action('send').click();
    await page.locator('.chat.me').waitFor();
    assert.notEqual(requests[4].dream, requests[3].dream);
    assert.equal(requests[4].messages.length, 1);
    for (const width of [360,390,430]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.reload();
    await action('detail:2').waitFor();
    assert.equal(await page.locator('.chat.me').count(), 0);
    for (const [guide, endpoint] of [['Jung','jung'],['Folklore','folklore']]) {
      await page.route('**/api/'+endpoint, route => {
        const request = route.request().postDataJSON();
        assert.equal(request.messages.length, 1);
        assert.equal(request.dream, requests[4].dream);
        return route.fulfill({json:{reply:'Reply from '+guide}});
      }, {times:1});
      await action('detail:2').click();
      await action('exploreCurrent').click();
      await action('start:interpret').click();
      await action('god:'+guide).click();
      await input.fill('What does this image suggest?');
      await action('send').click();
      await page.getByText('Reply from '+guide,{exact:true}).waitFor();
      await action('nav:journal').click();
    }
    assert.deepEqual(errors, []);
    console.log('PASS Freud chat: failed send and retry, history, reset confirmation, dream isolation, mobile widths and reload.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
