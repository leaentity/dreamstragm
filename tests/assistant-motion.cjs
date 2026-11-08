const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});try{
const p=await b.newPage({viewport:{width:390,height:844}}),errors=[],api=[];
p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/'))api.push(r.url())});
await p.clock.install();await p.goto('http://localhost:5174/?v=20261107-motion2');await p.waitForSelector('.motion-ready');await p.evaluate(()=>document.fonts.ready);
fs.mkdirSync('outputs/assistant-motion',{recursive:true});
const state=()=>p.locator('.assistant-actor').getAttribute('style');
await p.addStyleTag({content:'.assistant-actor{transition:none!important}'});
let initial=await state();await p.clock.runFor(3500);assert.notEqual(await state(),initial);await p.screenshot({path:'outputs/assistant-motion/walking.png'});
const rightStart=await p.locator('.assistant-actor').boundingBox();await p.clock.runFor(500);const rightEnd=await p.locator('.assistant-actor').boundingBox();assert.ok(rightEnd.x>rightStart.x,'right-facing actor must move right');assert.equal(await p.locator('.assistant-actor').evaluate(e=>parseFloat(e.style.scale)),1);
await p.locator('.assistant-pause').click();let paused=await state();await p.clock.runFor(1500);assert.equal(await state(),paused);await p.locator('.assistant-pause').click();
await p.clock.runFor(6000);assert.equal(await p.locator('.assistant-stage').getAttribute('data-doodles'),'1');await p.screenshot({path:'outputs/assistant-motion/drawing.png'});
await p.clock.runFor(2500);const leftStart=await p.locator('.assistant-actor').boundingBox();await p.clock.runFor(500);const leftEnd=await p.locator('.assistant-actor').boundingBox();assert.ok(leftEnd.x<leftStart.x,'left-facing actor must move left');assert.equal(await p.locator('.assistant-actor').evaluate(e=>parseFloat(e.style.scale)),-1);await p.clock.runFor(3500);await p.screenshot({path:'outputs/assistant-motion/notebook.png'});
for(const width of [360,390,430]){await p.setViewportSize({width,height:844});for(let n=0;n<7;n++){await p.clock.runFor(4000);const box=await p.locator('.assistant-actor').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}const bubble=await p.locator('[data-a=quickVoice]').boundingBox();assert.ok(bubble.width>=44&&bubble.height>=44);}
await p.emulateMedia({reducedMotion:'reduce'});await p.clock.runFor(300);const reduced=await state();await p.clock.runFor(2000);assert.equal(await state(),reduced);assert.equal(await p.locator('.assistant-stage').getAttribute('data-doodles'),'0');assert.equal(await p.locator('.assistant-pause').isDisabled(),true);
await p.emulateMedia({reducedMotion:'no-preference'});await p.locator('[data-a=quickVoice]').click();await p.waitForSelector('[data-a=record]');assert.equal(await p.locator('.assistant-stage').count(),0);
await p.locator('[data-a="nav:explore"]').click();await p.locator('[data-a="nav:journal"]').click();await p.waitForSelector('.motion-ready');await p.locator('.assistant-pause').click();await p.locator('[data-a="nav:circle"]').click();await p.locator('[data-a="nav:journal"]').click();assert.equal(await p.locator('.assistant-stage').getAttribute('data-motion-paused'),'true');
await p.setViewportSize({width:390,height:844});
await p.locator('.assistant-pause').click();assert.equal(await p.locator('.assistant-stage').getAttribute('data-motion-paused'),'false');await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.clock.runFor(500);assert.equal(await p.locator('.assistant-stage').getAttribute('data-motion-paused'),'true');
const fallback=await b.newPage({viewport:{width:390,height:844}});await fallback.route('**/assets/assistant-motion-v1.png',route=>route.abort());await fallback.goto('http://localhost:5174/');await fallback.waitForSelector('.assistant-full-body');assert.equal(await fallback.locator('.motion-ready').count(),0);assert.equal(await fallback.locator('.assistant-full-body').isVisible(),true);await fallback.close();
assert.deepEqual(errors,[]);assert.deepEqual(api,[]);console.log('PASS motion cycle; doodles; pause/resume and persistence across navigation; reduced motion; 360/390/430 bounds; voice and navigation; no JS errors or API calls.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
