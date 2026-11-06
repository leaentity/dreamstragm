/* 浏览器本地合成Noise：只有用户点击才创建音频上下文，不请求外部音源。 */
(() => {
  function create({ makeContext = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('White noise is not supported in this browser.');
    return new Context();
  }, onChange = () => {} } = {}) {
    let context = null, source = null, busy = false;
    const state = () => ({ playing: Boolean(source && context?.state === 'running'), busy });
    async function toggle() {
      if (busy) return;
      busy = true; onChange();
      try {
        if (state().playing) { await context.suspend(); return; }
        if (!context || context.state === 'closed') {
          context = makeContext();
          const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
          const gain = context.createGain();
          gain.gain.setValueAtTime(0.035, context.currentTime);
          source.connect(gain); gain.connect(context.destination); source.start();
          context.onstatechange = () => onChange();
        }
        await context.resume();
      } catch (error) {
        try { await context?.close(); } catch {}
        context = null; source = null;
        throw new Error('Audio could not play. Try again or use another browser.');
      } finally { busy = false; onChange(); }
    }
    async function pause() {
      if (!state().playing || busy) return;
      busy = true; onChange();
      try { await context.suspend(); }
      finally { busy = false; onChange(); }
    }
    return { state, toggle, pause };
  }
  globalThis.DreamAmbient = { create };
})();
