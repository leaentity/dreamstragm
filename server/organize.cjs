const OpenAI=require('openai');
const {createHash}=require('node:crypto');
const instructions=require('./prompts/organize.cjs');
const MAX_INPUT=4000, MAX_BODY=32768;
const schema={type:'object',additionalProperties:false,properties:{organizedText:{type:'string'},suggestedTags:{type:'array',items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},type:{type:'string',enum:['person','place','theme','event']}},required:['name','type']}}},required:['organizedText','suggestedTags']};
class TidyError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
function config(env){const key=env.OPENAI_API_KEY?.trim(),model=env.OPENAI_MODEL?.trim();if(!key||!model||/^replace_|^your_/i.test(key)||/^replace_|^your_/i.test(model))throw new TidyError('MISSING_CONFIG',503);return{key,model};}
function validateInput(body){if(!body||Object.keys(body).some(k=>k!=='text')||typeof body.text!=='string'||!body.text.trim())throw new TidyError('BAD_INPUT',400);if(body.text.length>MAX_INPUT)throw new TidyError('INPUT_TOO_LONG',413);return body.text;}
function validateOutput(data,text){
 if(!data||typeof data.organizedText!=='string'||!data.organizedText.trim()||data.organizedText.length>8000||!Array.isArray(data.suggestedTags)||data.suggestedTags.length>8)throw new TidyError('INVALID_RESPONSE',502);
 const tags=[],seen=new Set();for(const tag of data.suggestedTags){if(!tag||typeof tag.name!=='string'||!tag.name.trim()||tag.name.length>40||!['person','place','theme','event'].includes(tag.type))throw new TidyError('INVALID_RESPONSE',502);const name=tag.name.trim();
 // 标签必须能回到原文；模型即使生成了新意象，也不直接进入用户的标签选项。
 if(text.includes(name)&&!seen.has(name)){tags.push({name,type:tag.type});seen.add(name);}}
 return{organizedText:data.organizedText,suggestedTags:tags};
}
function mappedError(error){if(error instanceof TidyError)return error;if(error?.name==='APIConnectionTimeoutError'||error?.name==='AbortError')return new TidyError('TIMEOUT',504);if([401,403].includes(error?.status))return new TidyError('AUTH_FAILED',503);if(error?.status===404)return new TidyError('MODEL_UNAVAILABLE',503);if(error?.status===400)return new TidyError('CONFIG_INVALID',503);if(error?.status===429)return new TidyError(error?.code==='insufficient_quota'||error?.error?.code==='insufficient_quota'?'BILLING_REQUIRED':'RATE_LIMITED',429);return new TidyError('UNAVAILABLE',503);}
function createOrganizer({env=process.env,makeClient=options=>new OpenAI(options)}={}){
 return async text=>{try{const {key,model}=config(env),client=makeClient({baseURL:'https://api.openai.com/v1',apiKey:key,timeout:55000,maxRetries:0,logLevel:'off'});
 const response=await client.responses.create({model,reasoning:{effort:'none'},service_tier:'default',instructions,input:[{role:'user',content:[{type:'input_text',text}]}],store:false,max_output_tokens:6000,text:{format:{type:'json_schema',name:'dream_tidy',strict:true,schema}}});
 if(response.output?.some(item=>item.content?.some(part=>part.type==='refusal')))throw new TidyError('REFUSED',422);
 if(response.status!=='completed'||!response.output_text)throw new TidyError('INVALID_RESPONSE',502);
 let parsed;try{parsed=JSON.parse(response.output_text);}catch{throw new TidyError('INVALID_RESPONSE',502);}return validateOutput(parsed,text);
 }catch(error){throw mappedError(error);}};
}
async function readBody(req){let size=0,chunks=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>MAX_BODY)throw new TidyError('INPUT_TOO_LONG',413);chunks.push(Buffer.from(chunk));}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new TidyError('BAD_INPUT',400);}}
function createHandler({organize=createOrganizer(),clock=()=>Date.now()}={}){
 const cache=new Map(),attempts=new Map();let pending=0;
 return async(req,res)=>{
  const send=(status,body)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  if(req.method!=='POST')return send(405,{error:{code:'METHOD_NOT_ALLOWED'}});
  try{
   const origin=req.headers.origin;if(origin){let host;try{host=new URL(origin).host;}catch{throw new TidyError('BAD_ORIGIN',403);}if(host!==req.headers.host)throw new TidyError('BAD_ORIGIN',403);}
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new TidyError('BAD_INPUT',415);
   const body=await readBody(req),text=validateInput(body),id=req.headers['x-request-id'];
   if(typeof id!=='string'||!/^[\w-]{16,64}$/.test(id))throw new TidyError('BAD_INPUT',400);
   const time=clock();for(const[key,item]of cache)if(item.expires<time&&!item.pending)cache.delete(key);
   const hash=createHash('sha256').update(text).digest('hex'),existing=cache.get(id);
   if(existing){if(existing.hash!==hash)throw new TidyError('BAD_INPUT',409);const result=await existing.promise;return send(result.status,result.body);}
   const ip=req.socket.remoteAddress||'local',recent=(attempts.get(ip)||[]).filter(t=>t>time-600000);attempts.set(ip,recent);
   if(pending>=4||recent.length>=20||cache.size>=100)throw new TidyError('RATE_LIMITED',429);recent.push(time);pending++;
   // 同一请求 ID 的重复点击共享结果，不自动重试、不重复计费。缓存仅在进程内短暂存在。
   const item={hash,pending:true,expires:time+120000};item.promise=(async()=>{try{return{status:200,body:await organize(text)};}catch(error){const e=mappedError(error);return{status:e.status,body:{error:{code:e.code}}};}finally{pending--;item.pending=false;}})();cache.set(id,item);const result=await item.promise;send(result.status,result.body);
  }catch(error){const e=mappedError(error);send(e.status,{error:{code:e.code}});}
 };
}
module.exports={config,mappedError,createOrganizer,createHandler,validateInput,validateOutput,TidyError,MAX_INPUT};
