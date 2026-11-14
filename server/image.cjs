const OpenAI = require('openai');

const DEFAULT_MODEL = 'gpt-image-2.5-flare';
const MAX_DESCRIPTION = 8000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const styles = new Map([
  ['Paper daydream', 'Hand-drawn ink and soft watercolor on warm textured paper. Restrained pastel palette.'],
  ['Midnight crayon', 'Wax crayon on midnight-blue paper, grainy strokes and soft pools of light.'],
  ['Soft collage', 'Layered cut-paper collage, soft edges and a muted palette.'],
]);

class ImageError extends Error {
  constructor(code, status) {
    super(code);
    this.status = status;
  }
}

async function readScene(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 64 * 1024) throw new ImageError('INPUT_TOO_LONG', 413);
    chunks.push(chunk);
  }
  let scene;
  try {
    scene = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ImageError('BAD_INPUT', 400);
  }
  if (!scene || typeof scene.description !== 'string' || !scene.description.trim() ||
      !styles.has(scene.style) || Object.keys(scene).some(key => !['description', 'style'].includes(key))) {
    throw new ImageError('BAD_INPUT', 400);
  }
  if (scene.description.length > MAX_DESCRIPTION) throw new ImageError('INPUT_TOO_LONG', 413);
  return scene;
}

function createGenerator({env = process.env, makeClient = options => new OpenAI(options)} = {}) {
  return async ({description, style}) => {
    const key = env.OPENAI_API_KEY?.trim();
    if (!key || /^(replace_|your_)/i.test(key)) throw new ImageError('MISSING_CONFIG', 503);
    const client = makeClient({
      apiKey: key,
      baseURL: 'https://api.openai.com/v1',
      maxRetries: 0,
      timeout: 150000,
      logLevel: 'off',
    });
    const response = await client.images.generate({
      model: env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL,
      prompt: [
        'Create one dream journal illustration with no lettering, captions or watermark.',
        styles.get(style),
        'Keep the described people, relationships and objects. Leave ambiguous details visually open.',
        'Use the following scene as visual source material:',
        description,
      ].join('\n'),
      size: '1024x1024',
      quality: 'medium',
      output_format: 'jpeg',
      output_compression: 85,
      n: 1,
    });
    const encoded = response.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
      throw new ImageError('INVALID_RESPONSE', 502);
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length < 4 || bytes.length > MAX_IMAGE_BYTES ||
        bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff ||
        bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
      throw new ImageError('INVALID_RESPONSE', 502);
    }
    return bytes;
  };
}

function imageError(error) {
  if (error instanceof ImageError) return error;
  if (error?.name === 'APIConnectionTimeoutError') return new ImageError('TIMEOUT', 504);
  if (error?.status === 401) return new ImageError('AUTH_FAILED', 503);
  if ([403, 404].includes(error?.status)) return new ImageError('MODEL_UNAVAILABLE', 503);
  if (error?.status === 429) {
    return new ImageError(error.code === 'insufficient_quota' ? 'BILLING_REQUIRED' : 'RATE_LIMITED', 429);
  }
  if (error?.status === 400 && ['moderation_blocked', 'content_policy_violation', 'safety_violations'].includes(error.code)) {
    return new ImageError('REFUSED', 422);
  }
  if (error?.status === 400) return new ImageError('CONFIG_INVALID', 503);
  return new ImageError('UNAVAILABLE', 502);
}

function createImageHandler({generate = createGenerator(), clock = Date.now} = {}) {
  let pending = false;
  let attempts = [];
  return async (req, res) => {
    const send = (status, body, type) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
      res.end(body);
    };
    try {
      if (req.method !== 'POST') throw new ImageError('METHOD_NOT_ALLOWED', 405);
      // 要求同源浏览器请求，避免其他网页借用本地生图接口。
      let originHost;
      try {
        const origin = new URL(req.headers.origin);
        if (['http:', 'https:'].includes(origin.protocol)) originHost = origin.host;
      } catch {}
      if (!originHost || originHost !== req.headers.host || req.headers['sec-fetch-site'] === 'cross-site') {
        throw new ImageError('BAD_ORIGIN', 403);
      }
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
        throw new ImageError('BAD_INPUT', 415);
      }
      const scene = await readScene(req);
      const now = clock();
      attempts = attempts.filter(time => time > now - 600000);
      if (pending || attempts.length >= 6) throw new ImageError('RATE_LIMITED', 429);
      attempts.push(now);
      pending = true;
      try {
        const bytes = await generate(scene);
        send(200, bytes, 'image/jpeg');
      } finally {
        pending = false;
      }
    } catch (error) {
      const {status, message: code} = imageError(error);
      send(status, JSON.stringify({error: {code}}), 'application/json; charset=utf-8');
    }
  };
}

module.exports = {createGenerator, createImageHandler};
