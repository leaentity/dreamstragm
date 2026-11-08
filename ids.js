/* 局域网 HTTP 没有 randomUUID，但仍可用 getRandomValues 生成随机标识。
   ID 只用于本地记录关联及请求去重，不作为身份凭据。 */
(() => {
  function uuid(){
    if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
    const bytes=new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&0x0f)|0x40;
    bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  globalThis.DreamIds={uuid};
})();
