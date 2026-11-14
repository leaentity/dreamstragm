const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createGenerator, createImageHandler} = require('../server/image.cjs');
const {createServer} = require('../server/dev.cjs');

const fixture = readFileSync(require.resolve('./fixtures/image.jpg'));
const scene = {description: 'A paper boat under a lavender moon.', style: 'Paper daydream'};

test('decodes a JPEG from the configured OpenAI image model', async () => {
  const generate = createGenerator({
    env: {OPENAI_API_KEY: 'fixture-key', OPENAI_IMAGE_MODEL: 'fixture-model'},
    makeClient: options => {
      assert.equal(options.maxRetries, 0);
      return {images: {generate: async request => {
        assert.equal(request.model, 'fixture-model');
        assert.equal(request.n, 1);
        assert.equal(request.output_format, 'jpeg');
        assert.ok(request.prompt.includes(scene.description));
        return {data: [{b64_json: fixture.toString('base64')}]};
      }}};
    },
  });
  assert.deepEqual(await generate(scene), fixture);
});

test('image endpoint rejects cross-origin requests and blocks overlapping generation', async t => {
  let finish;
  let started;
  const inFlight = new Promise(resolve => { started = resolve; });
  const server = createServer({imageHandler: createImageHandler({
    generate: () => new Promise(resolve => {
      finish = () => resolve(fixture);
      started();
    }),
  })});
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => { finish?.(); server.closeAllConnections(); server.close(); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const post = (body, source = origin) => fetch(origin + '/api/image', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: source},
    body: JSON.stringify(body),
  });
  assert.equal((await post(scene, 'https://example.com')).status, 403);
  assert.equal((await post({...scene, style: 'other'})).status, 400);
  const first = post(scene);
  await inFlight;
  try {
    assert.equal((await post(scene)).status, 429);
  } finally {
    finish();
  }
  const response = await first;
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), fixture);
});
