// 测试替身，仅供独立浏览器回归使用。
module.exports = page => page.route('**/api/freud', route => route.fulfill({
  json:{reply:'What stayed with you after that moment?'},
}));
