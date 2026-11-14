const path = require('node:path');

module.exports = async function mockImage(page) {
  await page.route('**/api/image', route => route.fulfill({
    path: path.join(__dirname, 'image.jpg'),
    contentType: 'image/jpeg',
  }));
};
