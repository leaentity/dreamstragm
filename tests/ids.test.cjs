const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(require.resolve('../ids.js'),'utf8');
test('原生 UUID 可用时使用原生实现',()=>{
  const context={crypto:{randomUUID:()=> 'native-id'}};vm.runInNewContext(source,context);
  assert.equal(context.DreamIds.uuid(),'native-id');
});
test('局域网 HTTP 缺少 randomUUID 时仍生成合法且不同的 v4 标识',()=>{
  const context={crypto:{getRandomValues:bytes=>webcrypto.getRandomValues(bytes)}};
  vm.runInNewContext(source,context);
  const ids=Array.from({length:1000},()=>context.DreamIds.uuid());
  for(const id of ids)assert.match(id,/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.equal(new Set(ids).size,ids.length);
});
