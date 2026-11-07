// 仅浏览器回归测试使用的固定接口；生产页面没有模拟回退。
module.exports=async function fixture(page){await page.route('**/api/organize',async route=>{const {text}=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({organizedText:text.trim().replace(/\s+/g,' '),suggestedTags:[]})});});};
