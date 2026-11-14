// 测试替身，仅供独立浏览器回归使用。
module.exports = async page => {
  await page.route('**/api/freud', route => route.fulfill({
    json:{reply:'What stayed with you after that moment?'},
  }));
  await page.route('**/api/freud/card', route => route.fulfill({
    json:{card:{
      title:'Light on the threshold',
      association:'The doorway brings a familiar pause to mind.',
      basis:'The dreamer paused before stepping inside.',

      detail:'A scene stayed with you.',
      reading:'There may be room to slow down.',
      question:'Which detail would you return to?',
      fortune:'Take a moment to write down one thing you noticed.',
    }},
  }));
};
