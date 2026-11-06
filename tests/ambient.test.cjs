const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sandbox = vm.createContext({});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../ambient.js'), 'utf8'), sandbox);
const create = sandbox.DreamAmbient.create;
function fakeContext() {
  return {
    state: 'suspended', sampleRate: 16, currentTime: 0, destination: {}, starts: 0,
    createBuffer: () => ({ getChannelData: () => new Float32Array(32) }),
    createBufferSource() { return { connect() {}, start: () => this.starts++ }; },
    createGain: () => ({ gain: { setValueAtTime() {} }, connect() {} }),
    async resume() { this.state = 'running'; },
    async suspend() { this.state = 'suspended'; },
    async close() { this.state = 'closed'; }
  };
}
test('不自动创建音频；重复播放使用同一音源，暂停后可恢复', async () => {
  let made = 0;
  const context = fakeContext();
  const player = create({ makeContext: () => { made++; return context; } });
  assert.equal(made, 0);
  await player.toggle(); assert.equal(player.state().playing, true);
  await player.toggle(); assert.equal(player.state().playing, false);
  await player.toggle(); assert.equal(player.state().playing, true);
  await player.pause(); assert.equal(player.state().playing, false);
  assert.equal(made, 1); assert.equal(context.starts, 1);
});
test('播放尚未完成时连续点击只创建一个音源', async () => {
  const context = fakeContext();
  let finish;
  context.resume = () => new Promise(resolve => { finish = () => { context.state = 'running'; resolve(); }; });
  const player = create({ makeContext: () => context });
  const first = player.toggle(); await player.toggle();
  assert.equal(context.starts, 1); assert.equal(player.state().busy, true);
  finish(); await first;
  assert.equal(player.state().busy, false);
});
test('音频失败释放上下文，允许用户再次点击重试', async () => {
  const broken = fakeContext();
  broken.resume = async () => { throw new Error('device'); };
  let attempts = 0;
  const player = create({ makeContext: () => ++attempts === 1 ? broken : fakeContext() });
  await assert.rejects(player.toggle(), /Try again/);
  assert.equal(broken.state, 'closed'); assert.equal(player.state().busy, false);
  await player.toggle(); assert.equal(player.state().playing, true);
});
