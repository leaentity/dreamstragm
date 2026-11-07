/* 统一数据层。页面只经此模块读写；快照与 Blob 在同一事务中提交。 */
(() => {
  const VERSION = 1, DB = 'dreamstragm-local';
  const clone = value => structuredClone(value);
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const timestamp = value => typeof value==='string' && !Number.isNaN(Date.parse(value));
  const fail = message => { throw new Error(message); };
  const check = (condition, message = 'Saved data is invalid. It has not been replaced.') => { if (!condition) fail(message); };
  const kinds = { Lin:'person', Grandma:'person', Forest:'place', Flying:'theme', Travel:'event', Reading:'event', Searching:'event' };
  function empty() { return {schemaVersion:VERSION, revision:0, dreams:[], tags:[], dreamTags:[], assets:[], cards:[], posts:[]}; }
  function tagsFor(state, dreamId, names, types={}) {
    state.dreamTags = state.dreamTags.filter(t => t.dreamId !== dreamId);
    for (const name of [...new Set(names)]) {
      let tag = state.tags.find(t => t.name === name);
      if (!tag) { tag = {id:uid(),name,type:kinds[name] || (Object.hasOwn(types,name)?types[name]:'unknown')}; state.tags.push(tag); }
      state.dreamTags.push({dreamId,tagId:tag.id,confirmed:true});
    }
  }
  function validate(s) {
    check(s && s.schemaVersion === VERSION, 'This data version cannot be opened here. Your saved data has not been changed.');
    check(Number.isSafeInteger(s.revision) && s.revision >= 0);
    for (const key of ['dreams','tags','dreamTags','assets','cards','posts']) check(Array.isArray(s[key]));
    const ids = key => { const set = new Set(); for (const item of s[key]) { check(item && typeof item.id === 'string' && item.id && !set.has(item.id)); set.add(item.id); } return set; };
    const dreams = ids('dreams'), tags = ids('tags'), assets = ids('assets'); ids('cards'); const posts = ids('posts');
    for (const d of s.dreams) {
      check(typeof d.originalText === 'string' && d.originalText.trim() && typeof d.title === 'string');
      check(d.confirmedText === null || typeof d.confirmedText === 'string');
      check(typeof d.transcriptText === 'string' && validDate(d.dreamDate) && timestamp(d.createdAt) && timestamp(d.updatedAt) && typeof d.isDemo === 'boolean');
      check(Number.isSafeInteger(d.contentVersion) && d.contentVersion > 0 && Array.isArray(d.versions) && d.versions.length === d.contentVersion);
      check(d.versions.every((v,i) => v && v.number === i+1 && typeof v.text === 'string' && timestamp(v.createdAt)));
      if(d.pendingDraft){const p=d.pendingDraft;check(typeof p.text==='string'&&typeof p.title==='string'&&validDate(p.date)&&Array.isArray(p.tags)&&p.tags.every(t=>typeof t==='string')&&typeof p.transcriptText==='string'&&timestamp(p.savedAt)&&p.baseVersion===d.contentVersion);}
    }
    for (const t of s.tags) check(typeof t.name === 'string' && ['person','place','theme','event','unknown'].includes(t.type));
    const links = new Set();
    for (const t of s.dreamTags) { const key=JSON.stringify([t.dreamId,t.tagId]); check(dreams.has(t.dreamId) && tags.has(t.tagId) && t.confirmed === true && !links.has(key)); links.add(key); }
    for (const a of s.assets) {
      check(['image','audio'].includes(a.kind) && typeof a.isDemo === 'boolean');
      check(a.dreamId ? dreams.has(a.dreamId) && Number.isSafeInteger(a.sourceVersion) && a.sourceVersion>0 && a.sourceVersion<=s.dreams.find(d=>d.id===a.dreamId).contentVersion : posts.has(a.postId));
    }
    for (const c of s.cards) check(dreams.has(c.dreamId) && typeof c.text === 'string' && typeof c.god === 'string' && Number.isSafeInteger(c.sourceVersion) && c.sourceVersion>0 && c.sourceVersion<=s.dreams.find(d=>d.id===c.dreamId).contentVersion);
    for (const p of s.posts) {
      check(typeof p.name === 'string' && typeof p.text === 'string' && Array.isArray(p.tags) && p.tags.every(t=>typeof t==='string') && Array.isArray(p.comments) && Array.isArray(p.assetIds));
      check(p.assetIds.every(id=>assets.has(id) && s.assets.find(a=>a.id===id).postId===p.id));
      check(p.comments.every(c=>typeof c.name==='string' && typeof c.text==='string'));
      check(!p.card || typeof p.card.text === 'string');
      // 公开实体不保留私人日志引用、原文或对话，导入也不能绕过此边界。
      check(Object.keys(p).every(k=>['id','name','text','tags','comments','assetIds','card','createdAt','isDemo'].includes(k)));
    }
    return s;
  }
  function backend() {
    let db;
    async function open() {
      if (!globalThis.indexedDB) fail('Local storage is unavailable in this browser. Try a normal browser window.');
      db = await new Promise((resolve,reject) => {
        const req=indexedDB.open(DB,VERSION);
        req.onupgradeneeded=()=>{for(const name of ['meta','blobs'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name);};
        req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
        req.onerror=()=>reject(req.error); req.onblocked=()=>reject(new Error('Close other Dreamstragm tabs, then try again.'));
      });
    }
    async function read() {
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(['meta','blobs'],'readonly'), meta=tx.objectStore('meta'), blobs=tx.objectStore('blobs');
        const state=meta.get('state'), keys=blobs.getAllKeys(), values=blobs.getAll();
        tx.oncomplete=()=>resolve({state:state.result,blobs:new Map(keys.result.map((key,i)=>[key,values.result[i]]))});
        tx.onabort=tx.onerror=()=>reject(tx.error || new Error('Could not read saved data.'));
      });
    }
    async function write(state, puts, removes, expected) {
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(['meta','blobs'],'readwrite'), meta=tx.objectStore('meta'), blobs=tx.objectStore('blobs');
        let conflict=false, writeError;
        const req=meta.get('state');
        req.onsuccess=()=>{try{
          // 多标签页使用 revision 防止旧页面静默覆盖新数据；失败保留用户草稿。
          if ((req.result?.revision ?? null)!==expected) {conflict=true;tx.abort();return;}
          meta.put(state,'state'); for(const [id,blob]of puts)blobs.put(blob,id); for(const id of removes)blobs.delete(id);
        }catch(error){writeError=error;tx.abort();}};
        tx.oncomplete=()=>resolve();
        tx.onabort=tx.onerror=()=>reject(conflict?new Error('Data changed in another tab. Copy your unsaved text, then reload this page.'):writeError || tx.error || new Error('Local save failed.'));
      });
    }
    return {open,read,write};
  }
  function create({driver=backend()}={}) {
    let state, blobs=new Map(), recovery, queue=Promise.resolve();
    const serial = job => { const next=queue.then(job); queue=next.catch(()=>{}); return next; };
    const view = d => ({...clone(d),date:d.dreamDate,raw:d.originalText,body:d.confirmedText ?? d.originalText,tags:state.dreamTags.filter(t=>t.dreamId===d.id).map(t=>state.tags.find(x=>x.id===t.tagId).name),images:clone(state.assets.filter(a=>a.dreamId===d.id&&a.kind==='image')),interpretations:clone(state.cards.filter(c=>c.dreamId===d.id))});
    const present = d => {const x=view(d);return {...x,image:x.images.length>0,card:x.interpretations.at(-1)};};
    function list(){check(state,'Local storage is not ready.');return state.dreams.map(present);}
    function posts(){return state.posts.map(p=>({...clone(p),image:p.assetIds.length>0,images:clone(state.assets.filter(a=>p.assetIds.includes(a.id)))}));}
    async function commit(change) {
      return serial(async()=>{
        check(state,'Local storage is not ready.');const next=clone(state), puts=[], removes=[];
        const result=change(next,puts,removes);next.revision=state.revision+1;validate(next);
        await driver.write(next,puts,removes,state.revision);
        // 只有事务完成后才更新页面可读快照。配额、权限或磁盘失败不会产生“假保存”。
        state=next;for(const [id,blob]of puts)blobs.set(id,blob);for(const id of removes)blobs.delete(id);return clone(result);
      });
    }
    async function open({dreams=[],posts:seedPosts=[],demoBlob}={}) {
      await driver.open();const loaded=await driver.read();recovery=loaded.state;
      if(loaded.state!==undefined){validate(loaded.state);for(const a of loaded.state.assets)check(loaded.blobs.get(a.id) instanceof Blob,'An attachment could not be read. Your data has not been replaced.');state=loaded.state;blobs=loaded.blobs;return;}
      const s=empty(),puts=[];
      for(const d of dreams){const id=String(d.id),text=d.body||d.raw;s.dreams.push({id,title:d.title,dreamDate:d.date,originalText:d.raw,confirmedText:d.body||null,transcriptText:'',contentVersion:1,versions:[{number:1,text,createdAt:now()}],createdAt:now(),updatedAt:now(),isDemo:true});tagsFor(s,id,d.tags);if(d.image){const aid=uid();s.assets.push({id:aid,dreamId:id,kind:'image',sourceVersion:1,style:d.style||'Paper daydream',description:'Sample illustration',isDemo:true,status:'ready',createdAt:now()});puts.push([aid,demoBlob]);}}
      for(const p of seedPosts){const id=String(p.id),assetIds=[];if(p.image){const aid=uid();assetIds.push(aid);s.assets.push({id:aid,postId:id,dreamId:null,kind:'image',isDemo:true,status:'ready',createdAt:now()});puts.push([aid,demoBlob]);}s.posts.push({id,name:p.name,text:p.text,tags:p.tags||[],comments:p.comments||[],assetIds,card:null,isDemo:true,createdAt:now()});}
      validate(s);await driver.write(s,puts,[],null);state=s;blobs=new Map(puts);
    }
    async function saveDream(input) {
      check(input.raw?.trim(),'Write a little dream fragment first.');check(validDate(input.date),'Choose a valid dream date.');
      return commit(s=>{
        let d=s.dreams.find(d=>d.id===input.id);
        if(input.id)check(d,'This dream no longer exists. Your text has not been saved.');
        if(!d){d={id:uid(),originalText:input.raw,createdAt:now(),contentVersion:0,versions:[],isDemo:false};s.dreams.unshift(d);}
        const text=input.confirmedText ?? input.raw;
        d.title=input.title.trim()||'Untitled dream';d.dreamDate=input.date;d.confirmedText=input.id?text:(input.confirmedText??null);d.transcriptText=input.transcriptText??d.transcriptText??'';
        d.updatedAt=now();d.contentVersion++;d.versions.push({number:d.contentVersion,text,createdAt:now(),source:input.source==='openai'?'openai':'manual'});delete d.pendingDraft;tagsFor(s,d.id,input.tags||[],input.tagTypes||{});return d.id;
      });
    }
    async function saveForTidy(input){
      check(input.raw?.trim(),'Write a little dream fragment first.');check(validDate(input.date),'Choose a valid dream date.');
      return commit(s=>{let d=s.dreams.find(d=>d.id===input.id);if(input.id)check(d,'This dream no longer exists. Your text has not been saved.');
        if(!d){d={id:uid(),title:input.title.trim()||'Untitled dream',dreamDate:input.date,originalText:input.raw,confirmedText:null,transcriptText:input.transcriptText||'',createdAt:now(),updatedAt:now(),contentVersion:1,versions:[{number:1,text:input.raw,createdAt:now(),source:'manual'}],isDemo:false};s.dreams.unshift(d);tagsFor(s,d.id,input.tags||[]);}
        // 整理前先存用户输入。既有正文不被未确认的草稿或模型结果覆盖。
        d.pendingDraft={text:input.raw,title:input.title,date:input.date,tags:[...(input.tags||[])],transcriptText:input.transcriptText||'',baseVersion:d.contentVersion,savedAt:now()};d.updatedAt=now();return{id:d.id,sourceVersion:d.contentVersion};
      });
    }
    async function deleteDream(id){return commit((s,puts,removes)=>{check(s.dreams.some(d=>d.id===id),'Dream not found.');s.dreams=s.dreams.filter(d=>d.id!==id);s.dreamTags=s.dreamTags.filter(t=>t.dreamId!==id);s.cards=s.cards.filter(c=>c.dreamId!==id);for(const a of s.assets.filter(a=>a.dreamId===id))removes.push(a.id);s.assets=s.assets.filter(a=>a.dreamId!==id);});}
    async function addImage(id,{blob,...meta}){check(blob instanceof Blob && blob.size>0 && blob.type.startsWith('image/'),'The image could not be saved.');return commit((s,puts)=>{const d=s.dreams.find(d=>d.id===id);check(d,'Dream not found.');const a={...meta,id:uid(),dreamId:id,kind:'image',sourceVersion:meta.sourceVersion??d.contentVersion,isDemo:meta.isDemo??true,status:'ready',createdAt:now()};s.assets.push(a);puts.push([a.id,blob]);return a.id;});}
    async function addCard(id,card){return commit(s=>{const d=s.dreams.find(d=>d.id===id);check(d,'Dream not found.');const c={...card,id:uid(),dreamId:id,sourceVersion:card.sourceVersion??d.contentVersion,isDemo:card.isDemo??true,createdAt:now()};s.cards.push(c);return c.id;});}
    async function addPost({text,tags=[],imageBlob,card}){return commit((s,puts)=>{const id=uid(),assetIds=[];if(imageBlob){check(imageBlob instanceof Blob,'Missing image attachment.');const aid=uid();assetIds.push(aid);s.assets.push({id:aid,postId:id,dreamId:null,kind:'image',isDemo:true,status:'ready',createdAt:now()});puts.push([aid,imageBlob]);}s.posts.unshift({id,name:'You',text,tags:[...tags],card:card?{text:card.text}:null,comments:[],assetIds,createdAt:now(),isDemo:true});return id;});}
    async function comment(postId,text){check(text.trim(),'Write a reply first.');return commit(s=>{const p=s.posts.find(p=>p.id===postId);check(p,'Post not found.');p.comments.push({name:'You',text:text.trim()});});}
    async function deleteComment(postId,index){return commit(s=>{const p=s.posts.find(p=>p.id===postId);check(p&&p.comments[index]?.name==='You','Comment not found.');p.comments.splice(index,1);});}
    async function deletePost(id){return commit((s,puts,removes)=>{check(s.posts.some(p=>p.id===id&&p.name==='You'),'Post not found.');s.posts=s.posts.filter(p=>p.id!==id);for(const a of s.assets.filter(a=>a.postId===id))removes.push(a.id);s.assets=s.assets.filter(a=>a.postId!==id);});}
    async function backup(){return serial(async()=>{const data=clone(state), files=[];for(const [id,blob]of blobs){if(!state.assets.some(a=>a.id===id))continue;const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));files.push({id,type:blob.type,data:btoa(binary)});}return JSON.stringify({format:'dreamstragm-backup',version:VERSION,state:data,files});});}
    async function restore(text){check(text.length<30*1024*1024,'This backup is too large (maximum 30 MB).');let input;try{input=JSON.parse(text);}catch{fail('This is not a valid JSON backup.');}check(input.format==='dreamstragm-backup'&&input.version===VERSION&&Array.isArray(input.files),'Unsupported backup. Nothing was replaced.');validate(input.state);const files=new Map();for(const f of input.files){check(typeof f.id==='string'&&!files.has(f.id)&&typeof f.type==='string'&&/^(image\/|audio\/)/.test(f.type));let binary;try{binary=atob(f.data);}catch{fail('Invalid attachment in backup.');}files.set(f.id,new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:f.type}));}check(input.state.assets.length===files.size&&input.state.assets.every(a=>files.has(a.id)&&files.get(a.id).type.startsWith(a.kind+'/')),'Backup attachments are missing. Nothing was replaced.');return commit((s,puts,removes)=>{for(const id of blobs.keys())removes.push(id);Object.assign(s,clone(input.state));for(const pair of files)puts.push(pair);for(const id of files.keys()){const index=removes.indexOf(id);if(index>=0)removes.splice(index,1);}});}
    async function clear(){return commit((s,puts,removes)=>{for(const id of blobs.keys())removes.push(id);Object.assign(s,empty());});}
    return {open,list,posts,get:id=>list().find(d=>d.id===id),blob:id=>blobs.get(id),saveDream,saveForTidy,deleteDream,addImage,addCard,addPost,comment,deleteComment,deletePost,backup,restore,clear,recovery:()=>JSON.stringify(recovery??null),snapshot:()=>clone(state)};
  }
  globalThis.DreamStore={create,validate};
})();
