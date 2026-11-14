const L=I18n.t;
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dreams=[{id:1,title:'Waiting for a whale',date:'2026-10-17',raw:'Lin and I waited for a bus on a cloud. A blue whale arrived. Our tickets were leaves. I felt light and safe.',body:'Lin and I waited on a soft cloud platform with no timetable. A blue whale drifted towards us. We handed over our leaf tickets and set off for the distant moon.',tags:['Lin','Flying','Travel'],image:true},{id:2,title:'The midnight bookshop',date:'2026-10-15',raw:'There was a bookshop in the forest. Grandma stood behind the counter. Every book opened into stars.',body:'I entered a bookshop deep in the forest. Grandma was waiting under a warm yellow light. A little patch of stars fell out each time I opened a book.',tags:['Grandma','Forest','Reading']},{id:3,title:'Back at our old school',date:'2026-09-28',raw:'Lin and I went back to school. A forest had grown over the playground. We were looking for our classroom.',body:'Lin and I returned to our old school. The playground had become a forest. We followed a path through the trees to find our old classroom.',tags:['Lin','Forest','Searching']}];
let posts=[{id:1,name:'Hazel',text:'If that dream bookshop existed, I would get a lifetime library card. Have you dreamed of a place like that?',tags:['Forest','Reading'],image:true,comments:[{name:'Andy',text:'My dream bookshop was under the sea!'}]},{id:2,name:'Floyd',text:'Last night I took a train to the moon. I still remember the blue outside the window.',tags:['Travel'],comments:[]}];
let chatDraft='',commentDraft='';
let freudSession = null;
let exploreDreamId=null, choosingForContext=false, weather='';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateLabel=()=>{const d=new Date();return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} · ${new Intl.DateTimeFormat(I18n.intl(),{weekday:'short'}).format(d)}`};

let page='journal',tab='journal',stack=[],selected='1',mode='interpret',god='Jung',period='Month',category='People',filter='',emptyDemo=false,draft={title:'',date:today(),raw:'',tags:[]},editing=null,description='',style='Paper daydream',messages=[],publish={text:'',type:'Full text',image:false,card:false,source:null},recording=false,recordText='',result=null;
let imageResult = null, imageRequest = null, imageError = '';
let tidyStatus='idle', tidyError='', tidySuggestions=[], tidyToken=0;
const tidyClient=DreamTidy.create();
const presetTags=['Lin','Grandma','Flying','Forest','Travel','Reading','Searching'];
const tagChoices=()=>[...new Set([...draft.tags,...tidySuggestions.map(t=>t.name),...presetTags])];
let ready=false, bootError='', saving=false, saveError='', draftCheckpoint='', resultSourceVersion=null;
const store=DreamStore.create(), objectURLs=new Map();
const ambient=DreamAmbient.create({onChange:()=>render()});
const contextDream=()=>dreams.find(d=>d.id===exploreDreamId);
function beginDream(withVoice=false){tidyStatus='idle';tidyError='';tidySuggestions=[];editing=null;draft={title:'',date:today(),raw:'',tags:[],transcriptText:''};recordText='';recording=false;draftCheckpoint=JSON.stringify(draft);go('edit');if(withVoice)go('voice');}
const dream=()=>dreams.find(d=>d.id===selected);
const refreshData=()=>{dreams=store.list();posts=store.posts();for(const [id,url]of objectURLs){if(!store.blob(id)){URL.revokeObjectURL(url);objectURLs.delete(id);}}};
const dirty=()=>['edit','voice','organize','loading','failure'].includes(page)&&draftCheckpoint&&(JSON.stringify(draft)!==draftCheckpoint||page==='voice'&&recordText.trim());
function canLeave(){if(saving)return false;if(imageRequest)return false;if(tidyClient.busy()){if(!confirm(L('AI tidy-up is running. Leave this screen? Your input is saved locally.')))return false;tidyToken++;tidyClient.cancel();tidyStatus='idle';}if(!dirty())return true;if(!confirm(L('Leave without saving your changes?')))return false;draftCheckpoint='';return true;}
function imageURL(asset){if(!objectURLs.has(asset.id))objectURLs.set(asset.id,URL.createObjectURL(store.blob(asset.id)));return objectURLs.get(asset.id);}
function clearURLs(){for(const url of objectURLs.values())URL.revokeObjectURL(url);objectURLs.clear();}
async function persist(job,done){if(saving)return;saving=true;saveError='';render();try{const value=await job();refreshData();saveError='';done?.(value);}catch(error){saveError=storageMessage(error);}finally{saving=false;document.querySelectorAll('[data-saving-disabled]').forEach(b=>{b.disabled=false;delete b.dataset.savingDisabled;});render();}}
function storageMessage(error){return error?.name==='QuotaExceededError'?'Your browser storage is full. Export a backup and free space, then try again. Your input is still here.':error?.name==='SecurityError'?'This browser blocked local storage. Try a normal browser window. Your input is still here.':error?.message||'Could not save locally. Your input is still here. Please try again.';}
const demoSVG=()=>new XMLSerializer().serializeToString(new DOMParser().parseFromString(art(),'text/html').querySelector('svg'));
const demoBlob=()=>new Blob([demoSVG()],{type:'image/svg+xml'});
async function boot(){bootError='';ready=false;render();try{await store.open({dreams,posts,demoBlob:demoBlob()});refreshData();selected=dreams[0]?.id??null;ready=true;}catch(error){bootError=storageMessage(error);}render();}
const btn=(t,a,c='')=>`<button class="btn ${c}" data-a="${a}">${L(t)}</button>`;
const styleLabel=value=>['Paper daydream','Midnight crayon','Soft collage'].includes(value)?L(value):value;
const guideLabel=value=>['Freud','Jung','Folklore'].includes(value)?L(value):value;
const tagHTML=t=>`<div class="tags">${t.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>`;
const uiIcon=(name)=>{const paths={mic:'M12 3.5 Q9 3.5 9 6.5 V12 Q9 15 12 15 Q15 15 15 12 V6.5 Q15 3.5 12 3.5 M6 11.5 Q6 17.5 12 17.5 Q18 17.5 18 11.5 M12 17.5 V21',back:'M19.5 12.4 Q12 12 5 12.1 M10.2 6.6 L4.8 12.1 L10 17.6',person:'M12 3.7 A3.5 3.5 0 1 0 12 10.7 A3.5 3.5 0 1 0 12 3.7 M5 21 V18 Q5 13 12 13 Q19 13 19 18 V21',sound:'M4 10 H8 L13 6 V18 L8 14 H4 Z M16 8 Q21 12 16 16',mute:'M4 10 H8 L13 6 V18 L8 14 H4 Z M17 9 L22 15 M22 9 L17 15',interpret:'M4 5 Q12 2 20 5 V16 Q15 15 12 19 Q9 15 4 16 Z M12 5 V18',image:'M4 4 H20 V20 H4 Z M5 17 L10 11 L14 15 L17 11 L20 15 M15 8 H15.1',stats:'M5 20 V13 H9 V20 M11 20 V8 H15 V20 M17 20 V4 H21 V20'};return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.interpret}"/></svg>`};
const mascot=()=>`<div class="mascot"><img class="assistant-portrait" src="assets/dream-assistant.png" width="128" height="128" alt="${esc(L("Blue-haired pixel dream assistant"))}"></div>`;
const homeAssistant=()=>`<div class="mascot"><div class="assistant-actor" role="img" aria-label="${esc(L('Full-body pixel dream assistant'))}"><img class="assistant-full-body" src="assets/dream-assistant-full-body-v2.png" width="140" height="270" alt=""></div><span class="assistant-doodle doodle-moon" aria-hidden="true"></span><span class="assistant-doodle doodle-star" aria-hidden="true"></span><span class="assistant-doodle doodle-trail" aria-hidden="true"></span></div><button class="assistant-pause" type="button" aria-label="${esc(L('Pause animation'))}">Ⅱ</button>`;
const art=(asset)=>asset?`<div class="art${asset.isDemo?'':' art-generated'}"><img src="${imageURL(asset)}" alt="${esc(L("Saved dream illustration"))}"></div>`:`<div class="art" aria-label="${esc(L("Sample dream illustration"))}"><svg viewBox="0 0 360 260" role="img"><rect width="360" height="260" fill="#a9bfe6"/><path d="M0 185 Q80 125 160 183 T360 160 V260 H0" fill="#becf79"/><circle cx="288" cy="52" r="30" fill="#f7f0c6"/><path d="M65 140 Q85 71 194 101 Q242 112 258 91 L251 135 Q267 158 237 165 Q120 204 65 140" fill="#8886c3" stroke="#343b35" stroke-width="2"/><path d="M134 157 Q163 186 184 163" fill="#e6cadf" stroke="#343b35"/><circle cx="95" cy="132" r="3"/><path d="M186 105 Q176 60 198 40" fill="none" stroke="#343b35" stroke-width="2"/><path d="M196 45 Q170 23 177 7 Q205 13 196 45" fill="#e1ee77" stroke="#343b35"/><g fill="#fff9df" stroke="#343b35"><ellipse cx="41" cy="66" rx="36" ry="10"/><ellipse cx="292" cy="195" rx="50" ry="13"/></g><g fill="#fff8dc" font-size="24"><text x="35" y="35">✧</text><text x="245" y="43">✦</text><text x="309" y="124">✧</text></g><path d="M25 240 Q105 205 180 244 T355 230" stroke="#758847" fill="none"/><text x="16" y="249" font-size="9" fill="#414b3c">DREAMSCAPE / SAMPLE ILLUSTRATION</text></svg></div>`;
function go(p){document.querySelector('.toast')?.remove();stack.push(page);page=p;render();window.scrollTo(0,0)}function back(){if(page==='chat')cancelFreudReply();if(imageRequest){cancelImage();return;}if(mode==='organize'&&tidyClient.busy()&&!canLeave())return;if((page==='edit'||page==='voice'&&stack.at(-1)!=='edit')&&!canLeave())return;document.querySelector('.toast')?.remove();if(page==='choose')choosingForContext=false;page=stack.pop()||tab;if(['journal','explore','circle'].includes(page))tab=page;else if(page==='detail')tab='journal';render()}function notify(t){document.querySelector('.toast')?.remove();let e=document.createElement('div');e.className='toast';e.textContent=L(t);document.body.append(e);setTimeout(()=>e.remove(),2600)}
const designAsset=(name,w=24,h=24)=>`<img src="assets/figma/${name}.svg" width="${w}" height="${h}" alt="" aria-hidden="true">`;
function header(title){const audio=ambient.state();const root=['journal','explore','circle'].includes(page)&&!(page==='explore'&&contextDream());return `<header>${root?'':`<button class="icon" data-a="back" aria-label="${esc(L("Back"))}">${uiIcon('back')}</button>`}<div class="header-title"><h1>${page==='journal'?'dreamstragm.':esc(title)}</h1></div><div class="header-actions"><button class="icon ambient-toggle ${audio.playing?'is-playing':''}" data-a="ambient" aria-label="${audio.playing?L('Mute white noise'):L('Play white noise')}" aria-pressed="${audio.playing}" ${audio.busy?'disabled':''} title="${audio.playing?L('Mute white noise'):L('Play white noise')}">${uiIcon(audio.playing?'sound':'mute')}<small>${L("Noise")}</small></button><button class="icon" data-a="settings" aria-label="${esc(L("Settings"))}">${designAsset('profile',18,18)}</button></div></header>`}
function cards(ds){return ds.length?ds.map(d=>`<article class="card pin click" data-a="detail:${d.id}" tabindex="0" role="button"><div class="row between"><span class="date">${esc(I18n.date(d.date))}</span><small>${L("Private · ☾")}</small></div><h3 style="margin-top:8px">${esc(d.title||'Untitled dream')}</h3><p>${esc(d.body||d.raw)}</p>${tagHTML(d.tags)}<small>${d.image?L('▧ Illustration　'):''}${d.card?L('✧ Reflection card　'):''}${L("Open dream")} ↗</small></article>`).join(''):`<div class="empty">${mascot()}<h3>${L("No dreams here yet")}</h3><p>${L("A little fragment is enough to begin.")}</p>${btn(L('Write your first dream'),'new','primary')}</div>`}
function publishedText(){let d=dreams.find(d=>d.id===publish.source);return publish.type==='Tags'?(d?.tags||['Dream']).map(x=>'#'+x).join(' '):publish.text}
function render(){if(!ready){$('#app').innerHTML=`<main class="storage-start"><h1>${bootError?L('Could not open your dreams'):L('Opening your dreams…')}</h1><p>${bootError?esc(L(bootError)):L('Reading this browser’s local archive.')}</p>${bootError?btn(L('Try again'),'retryStorage','full primary')+btn(L('Download recovery data'),'recovery','full'):''}</main>`;return;}$('#app').dataset.page=page;let d=dream(),h='',title='';
if(page==='journal'){title=L('Dream journal');h=`<section class="home-scene" aria-label="${esc(L("Your dream assistant"))}"><div class="assistant-stage">${homeAssistant()}<button class="voice-bubble" data-a="quickVoice" aria-label="${esc(L("Voice note (demo)"))}">${designAsset('mic')}${L("Tell me")}<small>${L("Voice · Demo")}</small></button></div></section><section class="hero home-hero"><div class="journal-meta row"><span class="date">${dateLabel()}</span><button class="weather-button" data-a="weather" aria-label="${esc(L("Choose weather"))}">${weather?esc(L(weather))+L(' · Manual'):L('Weather')}</button></div><h2>${L("Where did you go")}<br>${L("last night?")}</h2><div class="record-entry">${btn(designAsset('voice-oval',149,61)+designAsset('mic')+`<span>${L("Say it")}</span>`,'newVoice','primary')}<button class="link write-entry" data-a="new">${L("or write it down")}${designAsset('write-underline',117,4)}</button></div></section><div class="history-row"><button class="link history-toggle" data-a="pastDreams" aria-controls="past-dreams">${L("Past dreams")} <span>${dreams.length}</span>${designAsset('arrow-down',14,14)}</button>${btn(L('Export'),'export')}</div><section id="past-dreams" aria-label="${esc(L("Past dreams"))}"><div class="row"><input type="search" placeholder="${esc(L("Search dreams or tags"))}" value="${esc(filter)}" data-field="filter" aria-label="${esc(L("Search dreams"))}"><button class="link" data-a="empty">${emptyDemo?L('Show dreams'):L('Empty state')}</button></div>${cards(emptyDemo?[]:dreams.filter(x=>(x.title+x.raw+x.tags.join()).includes(filter)).sort((a,b)=>b.date.localeCompare(a.date)))}</section>`}
if(page==='edit'){title=editing?L('Edit dream'):L('Catch a dream');h=`<section class="voice-first">${btn('♩ Voice note · Demo','voice','full primary')}<small>${L("Speak a fragment, or write it below.")}</small></section><label>${L("What do you remember?")}</label><textarea data-field="draft.raw" placeholder="${esc(L("A person, a colour, a sentence… fragments are welcome."))}">${esc(draft.raw)}</textarea><label>${L("Dream date")}</label><input type="date" data-field="draft.date" value="${esc(draft.date)}"><label>${L("Give it a name (optional)")}</label><input data-field="draft.title" value="${esc(draft.title)}" placeholder="${esc(L("You can name it later"))}"><div class="row record-actions">${btn(editing?L('Save changes'):L('Save original'),'saveRaw')}${btn('✧ Tidy up with AI','organize','primary')}</div><p class="note">${L("Your input is saved locally before sending to OpenAI. Review the result before keeping it. Voice is still a demo.")}</p>`}
if(page==='voice'){title=L('Let the dream speak');h=`<div class="hero">${mascot()}<h2>${recording?L('Recording demo…'):L('A pocket for your voice')}</h2><p>${L("Demo only. Your microphone stays off.")}</p>${btn(recording?'■ Stop & transcribe · Demo':'● Start voice demo','record','primary')}</div><label>${L("Transcript · Make it yours")}</label><textarea data-field="recordText" placeholder="${esc(L("A sample transcript appears when you stop."))}">${esc(recordText)}</textarea>${btn(L('Use this text'),'useVoice','full lime')}`}
if(page==='organize'){title=L('Gather the fragments');h=`<span class="tag">${L('AI draft · Review before saving')}</span><div class="card"><small>${L('Original · Kept unchanged')}</small><p>${esc(draft.raw)}</p></div><label>${L('Tidied version · Editable')}</label><textarea data-field="organized">${esc(draft.organized||draft.raw)}</textarea><label>${L('Choose your tags')}</label><div class="tabs">${tagChoices().map(t=>`<button class="${draft.tags.includes(t)?'active':''}" data-a="tag:${esc(t)}">${presetTags.includes(t)?L(t):esc(t)}${tidySuggestions.some(x=>x.name===t)?`<small> · ${L('AI suggestion')}</small>`:''}</button>`).join('')}</div><div class="note">${L('AI can change a detail. Compare with the original and edit before confirming. Suggested tags stay unselected until you choose them.')}</div>${btn('Confirm & save','saveOrganized','full primary')}${btn('Keep the original instead','saveRaw','full')}`}
if(page==='detail'&&d){title=d.title;h=`${d.pendingDraft?`<div class="note">${L('An unfinished tidy-up input is saved on this dream.')}${btn('Resume saved input','resumeTidy','full')}<details><summary>${L('View saved input')}</summary><p>${esc(d.pendingDraft.text)}</p></details></div>`:''}<div class="row between"><span class="date">${esc(I18n.date(d.date))}</span><span class="tag">${L("☾ Only you")}</span></div><article class="card pin"><small>${L("Dream entry")}</small><p style="font-size:15px;line-height:2">${esc(d.body||d.raw)}</p>${tagHTML(d.tags)}</article><details class="card"><summary>${L("View original")}</summary><p>${esc(d.raw)}</p></details>${d.transcriptText?`<details class="card"><summary>${L("View transcript")}</summary><p>${esc(d.transcriptText)}</p></details>`:''}<details class="card"><summary>${L('Text history · {count} versions',{count:d.versions.length})}</summary>${d.versions.map(v=>`<small>${L('Version {number} · {date}',{number:v.number,date:esc(I18n.date(v.createdAt.slice(0,10)))})}</small><p>${esc(v.text)}</p>`).join('')}</details>${d.images.length?`<h3 class="subheading">${L('The shape of your dream · ')}${d.images.length}</h3>${d.images.map(a=>art(a)+`<small>${a.isDemo?L('Demo illustration'):L('Illustration')} · ${esc(styleLabel(a.style||''))} · ${L('Text v')}${a.sourceVersion}</small>`).join('')}`:''}${d.interpretations.map(c=>`<div class="card fortune"><small>${esc(guideLabel(c.god))} · ${c.god==='Folklore'?L('Cultural entertainment demo'):L('Reflection demo')} · ${L('Text v')}${c.sourceVersion}</small><h3>${esc(c.text)}</h3><p>${L("One way to explore, rather than a definite meaning.")}</p></div>`).join('')}<div class="tabs">${btn(L('Edit'),'editDream')}${btn(L('Export'),'export')}${btn(L('Share to Dream circle'),'share')}${btn(L('Delete'),'delete','danger')}</div>${btn('✧ Explore this dream','exploreCurrent','full primary')}`}
if(page==='explore'){title=L('Explore');const locked=contextDream();h=`${locked?`<section class="context-card"><small>${L("Current dream")}</small><h3>${esc(locked.title||'Untitled dream')}</h3><button class="link" data-a="changeContext">${L("Change dream")}</button></section>`:''}${[['interpret','✧',L('Explore your dream'),L('Choose a perspective and talk it through.')],['image','▧',L('Illustrate your dream'),L('Describe the scene and choose a style.')],['stats','✿',L('Dream patterns'),L('Notice familiar people and themes.')]].map(([m,i,t,desc])=>`<article class="card portal click" data-a="start:${m}" tabindex="0" role="button"><div class="symbol">${uiIcon(m)}</div><div><h3>${L(t)} ↗</h3><p>${L(desc)}</p><small>${m==='stats'?L('Sample patterns & connections'):m==='image'?L('AI illustration'):L('Freud · AI conversation')}</small></div></article>`).join('')}`}
if(page==='choose'){title=choosingForContext?L('Choose a dream'):L('Which dream shall we bring?');h=`<div class="note">${choosingForContext?L('Choose a dream to use across your next explorations.'):L('{mode} stays linked to the dream you select here.',{mode:L(mode==='image'?'Illustration':'Interpretation')})}</div>${cards(dreams)}`}
if(page==='gods'){title=L('Choose a dream guide');h=`<div class="note">${L("Current dream：")}${esc(d?.title)}</div>${[['Freud','◉',L('Explore wishes and inner tensions')],['Jung','✺',L('Explore symbols and personal associations')],['Folklore','☯',L('Explore traditional cultural imagery')]].map(([g,i,t])=>`<div class="card portal click" data-a="god:${g}" role="button" tabindex="0"><span class="symbol">${i}</span><div><h3>${L(g)}</h3><p>${L(t)}</p><small>${L(g==='Freud'?'AI conversation':'Conversation demo')}</small></div></div>`).join('')}<p class="footnote">${L("AI-inspired perspectives, not the historical people themselves")}</p>`}
if(page==='chat' && god==='Freud' && freudSession){
  title=L('Freud')+' · '+L('Dream room');
  h=freudChat();
}
if(page==='chat' && god!=='Freud'){title=L(god)+' · '+L('Dream room');h=`<span class="tag">${esc(d?.title)}${L(" · Conversation demo")}</span>${messages.map(m=>`<div class="chat ${m.me?'me':''}"><small>${m.me?L('You'):L(god)}</small><p>${esc(m.text)}</p></div>`).join('')}<div class="composer"><textarea id="chatInput" data-field="chatDraft" placeholder="${esc(L("What comes to mind?"))}" aria-label="${esc(L("Your message"))}">${esc(chatDraft)}</textarea>${btn(L('Send'),'send','primary')}</div>${btn('✧ Create a reflection card','makeCard','full lime')}<p class="footnote">${L("Scripted replies, not real analysis or predictions")}</p>`}
if(page==='card'){title=L('An echo of your dream');h=`<div class="card fortune"><div class="eyebrow">${L("DREAM ORACLE / ")}${esc(L(god))}</div><small>${L(god==='Folklore'?'Cultural entertainment demo · Not a prediction':'Reflection demo · Not a diagnosis')}</small><strong>${god==='Folklore'?'A little ease':'Room to explore'}</strong><h3>${esc(d?.title)}</h3><p>${god==='Folklore'?L('Treat this dream as a gift of imagination. Leave yourself a little room to breathe today.'):L('What was the strongest feeling in the dream? Where might it echo in your waking life?')}</p><hr class="divider"><small>${L("Sample template, without citations or real inference")}<br>2026.10.17 · Dreamstragm</small></div>${btn(L('Save to this dream'),'saveCard','full primary')}${btn(L('Share to Dream circle'),'shareCard','full')}`}
if(page==='imageBuild'){title=L('Build your dream');h=`<span class="tag">${esc(d?.title)}</span><label>${L("Describe the scene · Original stays unchanged")}</label><textarea data-field="description" maxlength="8000">${esc(description)}</textarea><label>${L("Choose a style")}</label><div class="tabs">${['Paper daydream','Midnight crayon','Soft collage'].map(s=>`<button class="${style===s?'active':''}" data-a="style:${s}">${L(s)}</button>`).join('')}</div><div class="note">${L("Only the scene description and style are sent to OpenAI.")}</div>${btn('Create illustration','generate','full primary')}`}
if(page==='loading'){title=L('A dream on its way');h=`<div class="loading">${mascot()}<h2>${mode==='organize'?L(tidyStatus==='saving'?'Saving your input locally…':'Tidying your dream…'):L('Mixing a few dream colours…')}</h2><p>${L(mode==='organize'?'Only this note is sent to OpenAI. Your archive stays on this browser.':'Creating one illustration. This may take a minute or two.')}</p>${mode==='organize'?btn('Cancel and keep input','cancelTidy','full'):btn('Back to scene','cancelImage','full')}</div>`}
if(page==='failure'){title=L('A little lost along the way');h=`<div class="empty">${mascot()}<h2>${L('That did not go through')}</h2><p>${mode==='organize'?esc(L(tidyError)):esc(L(imageError))}</p>${btn('Try again','retry','full primary')}${btn('Back to edit','returnInput','full')}${mode==='organize'?btn('Keep the original instead','saveRaw','full'):''}</div>`}
if(page==='imageResult' && imageResult){
  title=L('A picture from your dream');
  const image=imageResult;
  h=`${generatedArt(image)}<div class="card"><h3>${esc(image.title)}</h3><p>${L('Style: ')}${esc(L(image.style))}</p><small>${L('Scene: ')}${esc(image.description)}</small></div>
  ${image.saved?'<p role="status">'+L('Illustration saved')+'</p>':btn('Save to this dream','saveImage','full primary')}
  <div class="tabs">${btn('Try another','generate')}${btn('Download illustration','downloadImage')}${btn('Share image','shareImage')}${btn('Share to Dream circle','shareImageToCircle')}</div>`;
}
if(page==='stats'){title=L('Dream patterns');let ds=periodDreams();const type={People:'person',Places:'place',Themes:'theme',Events:'event'}[category],catalog=store.snapshot().tags;let names=[...new Set(ds.flatMap(d=>d.tags))].filter(name=>catalog.some(t=>t.name===name&&t.type===type));h=`<div class="tabs">${['Week','Month','Year'].map(x=>`<button class="${period===x?'active':''}" data-a="period:${x}">${L(x)}</button>`).join('')}</div><div class="card row between"><div><small>${L('By dream date · Through {date}',{date:I18n.date(today())})}</small><p><span class="count">${ds.length}</span> ${L('dreams collected')}</p></div><span style="font-size:40px">✿</span></div><div class="tabs">${['People','Places','Themes','Events'].map(x=>`<button class="${category===x?'active':''}" data-a="category:${x}">${L(x)}</button>`).join('')}</div><div class="card">${!names.length?`<p>${L('No confirmed tags in this period yet.')}</p>`:''}${names.map(n=>{let num=ds.filter(x=>x.tags.includes(n)).length;return `<div class="stat click" data-a="stat:${n}" role="button" tabindex="0"><div class="row between"><b>${n}</b><span>${L('{count} dreams ↗',{count:num})}</span></div><div class="bar"><span style="width:${num/Math.max(ds.length,1)*100}%"></span></div></div>`}).join('')}</div><div class="note">${L("Based on confirmed tags in this demo. Each dream is counted once per tag.")}</div>${btn('⌘ See dream connections','graph','full primary')}`}
if(page==='statList'){title=L('Dreams about ')+result;h=cards(periodDreams().filter(x=>x.tags.includes(result)))}
if(page==='graph'){title=L('Dream connections');h=`<div class="note">${L("Sample connections · Tap a node to see related dreams. No automatic analysis.")}</div><div class="graph"><svg viewBox="0 0 340 280"><path d="M65 60 L170 140 L280 60 M170 140 L65 225 M65 225 L280 225" stroke="#586345" stroke-width="2" fill="none"/></svg><button class="node" style="top:35px;left:18px" data-a="graphTag:Lin">${L("Lin")}</button><button class="node" style="top:110px;left:36%" data-a="detail:1">${L("Cloud whale")}</button><button class="node" style="top:35px;right:12px" data-a="graphTag:Travel">${L("Travel")}</button><button class="node" style="bottom:25px;left:12px" data-a="detail:3">${L("Old school")}</button><button class="node" style="bottom:25px;right:12px" data-a="graphTag:Forest">${L("Forest")}</button></div><div id="graphResult"></div>`}
if(page==='circle'){title=L('Dream circle');h=`<div class="row between"><span class="tag">${L("EVERY DREAM HAS A NEIGHBOR")}</span>${btn('＋ Post','publish','primary')}</div><p style="margin:15px 0">${L("A little of last night, shared today.")}</p>${posts.length?posts.map(p=>`<article class="card"><div class="row"><span class="avatar">${p.name==='You'?'☾':'✿'}</span><div><b>${p.name==='You'?L('You'):esc(p.name)}</b><div class="muted">${p.name==='You'?L('Just now'):L('Today')}${L(" · Public demo")}</div></div></div><p>${esc(p.text)}</p>${tagHTML(p.tags||[])}${p.image?art(p.images[0]):''}${p.card?'<div class="note">✧ '+esc(p.card.text)+`</div>`:''}<button class="link" data-a="post:${p.id}">${L('Join the conversation · {count} comments ↗',{count:p.comments.length})}</button></article>`).join(''):`<div class="empty">${L("No shared dreams yet. Leave the first one.")}</div>`}`}
if(page==='post'){let p=posts.find(x=>x.id===result);title=L('Dream echoes');h=p?`<article class="card"><b>${p.name==='You'?L('You'):esc(p.name)}</b><p>${esc(p.text)}</p>${tagHTML(p.tags||[])}${p.image?art(p.images[0]):''}${p.card?`<div class="note">✧ ${esc(p.card.text)}</div>`:''}${p.name==='You'?btn(L('Delete my post'),'deletePost','danger'):''}</article><h3>${L('Replies · {count}',{count:p.comments.length})}</h3>${p.comments.map((c,i)=>`<div class="card"><b>${c.name==='You'?L('You'):esc(c.name)}</b><p>${esc(c.text)}</p>${c.name==='You'?`<button class="link" data-a="deleteComment:${i}">${L("Delete")}</button>`:''}</div>`).join('')||`<div class="note">${L("No replies yet. Leave a little resonance.")}</div>`}<div class="composer"><input id="commentInput" data-field="commentDraft" value="${esc(commentDraft)}" placeholder="${esc(L("Write a reply"))}" aria-label="${esc(L("Replies"))}">${btn(L('Send'),'comment','primary')}</div>`:`<div class="empty">${L("This post has been deleted")}</div>`}
if(page==='publish'){title=L('Share a dream');h=`<div class="note">${L("Sharing creates a separate public snapshot. Your private journal stays unchanged.")}</div><label>${L("Link a dream (optional)")}</label><select data-field="publish.source"><option value="">${L("Free writing")}</option>${dreams.map(x=>`<option value="${x.id}" ${publish.source===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select><div class="tabs">${['Full text','Tags'].map(x=>`<button class="${publish.type===x?'active':''}" data-a="publicType:${x}">${x==='Full text'?L('Full text / Free writing'):L('Tags only')}</button>`).join('')}</div>${publish.type==='Full text'?`<label>${L("Public text · Check for private details")}</label><textarea data-field="publish.text">${esc(publish.text)}</textarea>`:`<div class="card"><small>${L("Only these tags will be shared, without private dream text.")}</small>${tagHTML(dreams.find(x=>x.id===publish.source)?.tags||['Dream'])}</div>`}${btn('@ Choose a sample user','mention','full')}<label class="check"><input type="checkbox" data-field="publish.image" ${publish.image?'checked':''}>${L("Include illustration")}</label><label class="check"><input type="checkbox" data-field="publish.card" ${publish.card?'checked':''}>${L("Include reflection card")}</label>${btn(L('Preview what others will see'),'preview','full primary')}`}
if(page==='preview'){title=L('What others will see');h=`<span class="tag">${L("Public preview · Sample identity: You")}</span><div class="card"><b>${L("You")}</b><p>${esc(publishedText())}</p>${publish.image?(publish.generatedImage?generatedArt(publish.generatedImage):art(publishImage())):''}${publish.card?'<div class="note">✧ '+esc(publish.cardText||'Room to explore · Reflection demo')+`</div>`:''}</div><div class="note">${L("Only the text and selected attachments above will be shared. No original notes, private links or conversations.")}</div>${btn(L('Share · Demo'),'confirmPublish','full primary')}${btn(L('Back to edit'),'back','full')}`}
if(page==='settings'){title=L('Your pocket');h=`<div class="card row"><span class="avatar">☾</span><div><h3>${L("Dreamer · Sample identity")}</h3><small>${L("No sign-in. No real account connected.")}</small></div></div><label for="languageSelect">${L('Interface language')}</label><select id="languageSelect" aria-label="${L('Language')}"><option value="en" ${I18n.locale()==='en'?'selected':''}>${L("English")}</option><option value="zh-CN" ${I18n.locale()==='zh-CN'?'selected':''}>${L("简体中文")}</option></select><p class="note">${L('Your writing and saved conversations stay in their original language.')}</p>${btn(L('Data & reset'),'data','full')}${btn(L('Privacy'),'privacy','full')}${btn(L('About this prototype'),'about','full')}<div class="note">${L("Saved dreams and local Circle posts stay in this browser after refresh. There is no cloud sync. Export backups to keep another copy.")}</div>`}
$('#app').innerHTML=`<div class="banner">${L('Saved on this browser · Tidy-up and illustration via OpenAI')}</div>${saveError?`<div class="storage-error" role="alert">${esc(L(saveError))}<button class="link" data-a="dismissSaveError">${L("Dismiss")}</button></div>`:''}${saving?`<div class="saving-status" role="status">${L("Saving locally…")}</div>`:''}${header(title)}<main>${h}</main><nav aria-label="${esc(L("Main navigation"))}">${[['journal','journal',L('Journal')],['explore','explore',L('Explore')],['circle','circle',L('Circle')]].map(([p,i,t])=>`<button class="${tab===p?'active':''}" data-a="nav:${p}"><span aria-hidden="true">${designAsset(i)}</span>${t}${tab===p?designAsset('active-mark',26,4):''}</button>`).join('')}</nav>`;
DreamAssistant.mount();
if(saving)document.querySelectorAll('button:not(:disabled)').forEach(b=>{b.disabled=true;b.dataset.savingDisabled='true';});
}
function periodDreams(){const end=today();const start=new Date(end+'T00:00:00');if(period==='Week')start.setDate(start.getDate()-((start.getDay()+6)%7));else if(period==='Month')start.setDate(1);else{start.setMonth(0,1);}const from=`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;return dreams.filter(d=>d.date<=end&&d.date>=from)}
function sheet(content){let el=document.createElement('div');el.className='overlay';el.innerHTML=`<section class="sheet" role="dialog" aria-modal="true"><button class="icon" style="float:right" data-a="close" aria-label="${esc(L("Close"))}">×</button>${content}</section>`;document.body.append(el);el.querySelector('button').focus()}
function save(organized){if(!draft.raw.trim())return notify('Write a little dream fragment first.');const input={source:organized&&tidyStatus==='ready'?'openai':'manual',tagTypes:Object.fromEntries(tidySuggestions.map(t=>[t.name,t.type])),id:editing,title:draft.title,date:draft.date||today(),raw:draft.raw,confirmedText:organized?(draft.organized||draft.raw):null,tags:[...draft.tags],transcriptText:draft.transcriptText||''};void persist(()=>store.saveDream(input),id=>{selected=id;draftCheckpoint='';tidyStatus='idle';tidySuggestions=[];page='detail';stack=['journal'];tab='journal';notify('Saved on this browser');});}
async function organizeDream(){
 if(saving||tidyClient.busy())return;if(!draft.raw.trim())return notify('Write something about your dream first.');
 const token=++tidyToken;tidyStatus='saving';tidyError='';tidySuggestions=[];mode='organize';if(page==='edit')stack.push('edit');page='loading';saving=true;render();window.scrollTo(0,0);
 try{const saved=await store.saveForTidy({id:editing,title:draft.title,date:draft.date||today(),raw:draft.raw,tags:draft.tags,transcriptText:draft.transcriptText||''});refreshData();editing=selected=saved.id;draftCheckpoint=JSON.stringify(draft);}
 catch(error){saveError=storageMessage(error);tidyStatus='idle';page='edit';if(stack.at(-1)==='edit')stack.pop();return;}
 finally{saving=false;document.querySelectorAll('[data-saving-disabled]').forEach(b=>{b.disabled=false;delete b.dataset.savingDisabled;});render();}
 if(draft.raw.length>4000){tidyStatus='error';tidyError=DreamTidy.messages.INPUT_TOO_LONG;page='failure';render();return;}
 tidyStatus='requesting';render();
 try{const result=await tidyClient.request(draft.raw);if(token!==tidyToken)return;draft.organized=result.organizedText;tidySuggestions=result.suggestedTags;tidyStatus='ready';page='organize';render();window.scrollTo(0,0);}
 catch(error){if(token!==tidyToken)return;tidyStatus='error';tidyError=error.message;page='failure';render();}
}
function returnToInput(){if(mode==='organize'){page='edit';if(stack.at(-1)==='edit')stack.pop();}else {page='imageBuild';if(stack.at(-1)==='imageBuild')stack.pop();}render();}
const imageErrors = {
  MISSING_CONFIG: 'Image generation needs an OpenAI API key on the server.',
  AUTH_FAILED: 'The server could not authenticate with OpenAI. Check the server API key.',
  MODEL_UNAVAILABLE: 'The image model is unavailable to this OpenAI project. Check model access and organization verification.',
  CONFIG_INVALID: 'OpenAI rejected the image settings. Check the configured image model.',
  BILLING_REQUIRED: 'The OpenAI account needs available API credit.',
  RATE_LIMITED: 'Image generation is busy or at its limit. Wait a moment before trying again.',
  REFUSED: 'OpenAI could not illustrate this scene. Try editing the description.',
  INPUT_TOO_LONG: 'Keep the scene description within 8,000 characters.',
  TIMEOUT: 'Image generation timed out. Your scene description is still here.',
  UNAVAILABLE: 'The image could not be generated. Your scene description is still here.',
};

const freudErrors = {
  BAD_INPUT:'Write a message and include a dream excerpt.',
  INPUT_TOO_LONG:'Keep each message within 1,500 characters.',
  DREAM_TOO_LONG:'Keep the dream excerpt within 8,000 characters.',
  CHAT_LIMIT:'This conversation has reached 12 replies. Start again to continue.',
  MISSING_CONFIG:'Freud chat needs an OpenAI API key and model on the server.',
  RATE_LIMITED:'Freud chat is busy. Wait a moment, then try again.',
  TIMEOUT:'The reply timed out. Your message is still here.',
  REFUSED:'The guide could not reply to this message. You can edit it and try again.',
};

function openFreudSession() {
  cancelFreudReply();
  const original = dream()?.raw || '';
  freudSession = {dreamId:selected, context:original.length <= 8000 ? original : '', needsExcerpt:original.length > 8000, history:[], draft:'', error:'', request:null};
}

function openGuide(guide) {
  god = guide;
  chatDraft = '';
  if (guide === 'Freud') {
    openFreudSession();
  } else {
    cancelFreudReply();
    freudSession = null;
    messages = [{text:guide === 'Jung'
      ? 'In this scripted demo, we explore personal symbols. Before assigning meanings, what is your first association with this dream?'
      : 'This is a cultural entertainment demo. Traditional imagery is a starting point for imagination, not a way to predict the future.'}];
  }
  go('chat');
}

function sendDemoReply() {
  const message = chatDraft.trim();
  if (!message) return notify('Write a message first.');
  chatDraft = '';
  messages.push({me:true,text:message}, {text:god === 'Folklore'
    ? 'Thank you for sharing. This is a scripted reply: you might treat the image as a gentle reminder to rest, rather than as an omen.'
    : 'Thank you for sharing. This is a scripted reply: notice how you felt and whether it connects with anything recent. Your own associations matter more than fixed symbol meanings.'});
  render();
}

function freudChat() {
  const session = freudSession;
  const limit = session.history.length >= 24;
  const busy = Boolean(session.request);
  const locked = busy || limit;
  const bubbles = session.history.map(message => {
    const mine = message.role === 'user';
    return `<div class="chat ${mine?'me':''}"><small>${L(mine?'You':'Freud')}</small><p>${esc(message.content)}</p></div>`;
  }).join('');
  return `<span class="tag">${esc(dream()?.title||'')}</span>
    <p class="note">${L('AI guide inspired by Freud. For personal reflection, not therapy.')}</p>
    <p class="footnote">${L('Sending shares this dream and conversation with OpenAI. Refreshing clears the chat.')}</p>
    ${session.needsExcerpt?`<label for="freudContext">${L('Paste a dream excerpt of up to 8,000 characters')}</label><textarea id="freudContext" data-field="freudContext" maxlength="8000" ${busy||session.history.length?'readonly':''}>${esc(session.context)}</textarea>`:''}
    ${bubbles||`<div class="chat"><p>${L('Which moment from this dream has stayed with you?')}</p></div>`}
    ${busy?`<p class="note" role="status">${L('Waiting for a reply…')}</p>`:''}
    ${session.error?`<p class="note freud-error" role="alert">${esc(L(session.error))}</p>`:''}
    ${limit?`<p class="note">${L(freudErrors.CHAT_LIMIT)}</p>`:''}
    <div class="composer"><textarea id="chatInput" data-field="freudDraft" maxlength="1500" aria-label="${esc(L('Your message'))}" placeholder="${esc(L('What comes to mind?'))}" ${locked?'readonly':''}>${esc(session.draft)}</textarea>
    ${locked?`<button class="btn primary" disabled>${L('Send')}</button>`:btn(session.error?'Retry reply':'Send','send','primary')}</div>
    <div class="tabs">${busy?btn('Cancel reply','cancelFreud'):''}${btn('Start again','restartFreud')}</div>
    ${btn('Create a sample reflection card','makeCard','full lime')}`;
}

function cancelFreudReply() {
  const request = freudSession?.request;
  if (!request) return;
  freudSession.request = null;
  request.abort();
}

async function sendFreud() {
  const session = freudSession;
  if (!session || session.request || session.dreamId !== selected) return;
  const content = session.draft.trim();
  if (!content) return notify('Write a message first.');
  if (!session.context.trim()) return notify(freudErrors.BAD_INPUT);
  if (content.length > 1500) return notify(freudErrors.INPUT_TOO_LONG);
  if (session.history.length >= 24) return notify(freudErrors.CHAT_LIMIT);

  const request = new AbortController();
  const userMessage = {role:'user', content};
  session.request = request;
  session.error = '';
  render();
  const timeout = setTimeout(() => request.abort(), 60000);
  try {
    const response = await fetch('/api/freud', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({dream:session.context, messages:[...session.history,userMessage]}),
      signal:request.signal,
    });
    const data = await response.json().catch(() => null);
    if (session !== freudSession || session.request !== request) return;
    if (!response.ok || typeof data?.reply !== 'string' || !data.reply.trim() || data.reply.length > 2000) {
      session.error = freudErrors[data?.error?.code] || {
        AUTH_FAILED:'The server could not authenticate with OpenAI. Check the server API key.',
        BILLING_REQUIRED:'The OpenAI account needs available API credit.',
        MODEL_UNAVAILABLE:'The configured model is not available to this OpenAI account. Check OPENAI_MODEL on the server.',
        CONFIG_INVALID:'The server model configuration could not be used. Check the model and API settings.',
      }[data?.error?.code] || 'The guide could not reply. Your message is still here.';
      return;
    }
    session.history.push(userMessage,{role:'assistant',content:data.reply});
    session.draft = '';
  } catch {
    if (session.request === request) session.error = request.signal.aborted
      ? freudErrors.TIMEOUT : 'The guide could not reply. Your message is still here.';
  } finally {
    clearTimeout(timeout);
    if (session.request === request) {
      session.request = null;
      if (page === 'chat' && god === 'Freud' && session === freudSession) {
        render();
        document.querySelector('.composer')?.scrollIntoView({block:'nearest'});
      }
    }
  }
}

function generatedArt(image) {
  return `<div class="art art-generated"><img src="${image.url}" alt="${esc(L('AI illustration'))}"></div>`;
}

async function generateImage() {
  if (imageRequest || saving) return;
  if (page === 'imageResult' && imageResult) {
    selected = imageResult.dreamId;
    description = imageResult.description;
    style = imageResult.style;
  }
  const currentDream = dream();
  if (!currentDream) return notify('Dream not found.');
  const scene = description.trim();
  if (!scene) return notify('Describe your scene first.');
  if (scene.length > 8000) return notify(imageErrors.INPUT_TOO_LONG);
  const request = new AbortController();
  imageRequest = request;
  const source = {dreamId:currentDream.id, title:currentDream.title, sourceVersion:1, description:scene, style};
  if (page === 'imageBuild') stack.push('imageBuild');
  mode = 'image';
  page = 'loading';
  render();
  window.scrollTo(0,0);
  const timeout = setTimeout(() => request.abort(), 160000);
  try {
    const response = await fetch('/api/image', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({description:source.description, style:source.style}),
      signal:request.signal,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(imageErrors[error?.error?.code] || imageErrors.UNAVAILABLE);
    }
    const blob = await response.blob();
    if (blob.type !== 'image/jpeg' || !blob.size || blob.size > 5 * 1024 * 1024) {
      throw new Error(imageErrors.UNAVAILABLE);
    }
    if (imageRequest !== request) return;
    if (imageResult) URL.revokeObjectURL(imageResult.url);
    imageResult = {...source, blob, url:URL.createObjectURL(blob), saved:false};
    page = 'imageResult';
  } catch (error) {
    if (imageRequest !== request) return;
    imageError = request.signal.aborted ? imageErrors.TIMEOUT :
      error instanceof TypeError ? imageErrors.UNAVAILABLE : error.message;
    page = 'failure';
  } finally {
    clearTimeout(timeout);
    if (imageRequest === request) {
      imageRequest = null;
      render();
    }
  }
}

function cancelImage() {
  const request = imageRequest;
  imageRequest = null;
  request?.abort();
  returnToInput();
}

function saveGeneratedImage() {
  const image = imageResult;
  if (page !== 'imageResult' || !image || image.saved) return;
  const {dreamId, sourceVersion, style, description, blob, title} = image;
  void persist(() => store.addImage(dreamId, {blob, style, description, sourceVersion, isDemo:false}), () => {
    image.saved = true;
    notify(L('Illustration saved to “{title}”',{title}));
  });
}

function downloadImage(image) {
  const link = document.createElement('a');
  link.href = image.url;
  link.download = 'dreamstragm-illustration.jpg';
  link.click();
}

async function shareGeneratedImage(image) {
  const file = new File([image.blob], 'dreamstragm-illustration.jpg', {type:'image/jpeg'});
  const data = {files:[file]};
  try {
    if (navigator.share && navigator.canShare?.(data)) {
      await navigator.share(data);
      return;
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
  }
  downloadImage(image);
  notify('Image downloaded. You can share it from your files.');
}

const publishImage=()=>dreams.find(d=>d.id===publish.source)?.images.at(-1);
function share(extra={}){let d=dream();publish={cardText:d?.card?d.card.text+' · '+d.card.god+' · Reflection demo':undefined,text:d?.body||d?.raw||'',type:'Full text',source:d?.id||null,image:false,card:false,...extra};go('publish')}
document.addEventListener('input',e=>{let f=e.target.dataset.field;if(!f)return;let v=e.target.type==='checkbox'?e.target.checked:e.target.value;if(f.startsWith('draft.'))draft[f.split('.')[1]]=v;else if(f.startsWith('publish.'))publish[f.split('.')[1]]=v;else if(f==='organized')draft.organized=v;else if(f==='chatDraft')chatDraft=v;else if(f==='freudDraft'&&freudSession){freudSession.draft=v;freudSession.error='';$('.freud-error')?.remove();}else if(f==='freudContext'&&freudSession)freudSession.context=v;else if(f==='commentDraft')commentDraft=v;else if(f==='recordText')recordText=v;else if(f==='description')description=v;else if(f==='filter'){filter=v;let pos=e.target.selectionStart;render();let input=$('[data-field="filter"]');input.focus();input.setSelectionRange?.(pos,pos)}});
document.addEventListener('change',e=>{if(e.target.dataset.field==='publish.source'){publish.generatedImage=null;publish.source=e.target.value||null;publish.text=dreams.find(x=>x.id===publish.source)?.body||'';render()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.overlay')?.remove();if(e.key==='Enter'&&e.target.matches('[role=button]'))e.target.click()});
document.addEventListener('click',e=>{let b=e.target.closest('[data-a]');if(!b)return;const action=b.dataset.a,split=action.indexOf(':');let a=split<0?action:action.slice(0,split),v=split<0?undefined:action.slice(split+1);if(saving)return;if(!ready){if(a==='retryStorage')void boot();if(a==='recovery'){const raw=store.recovery();if(raw==='null')notify('No readable data is available. Browser data has not been changed.');else download(raw,'dreamstragm-recovery.json','application/json');}return;}let d=dream();switch(a){case'nav':if(!canLeave())return;cancelFreudReply();document.querySelector('.toast')?.remove();exploreDreamId=null;choosingForContext=false;tab=v;page=v;stack=[];render();window.scrollTo(0,0);break;case'back':back();break;case'settings':if(canLeave()){cancelFreudReply();go('settings');}break;case'ambient':void ambient.toggle().catch(error=>notify(error.message));break;case'weather':sheet(`<h2>${L("Your weather")}</h2><p>${L("Choose what the sky looks like where you are.")}</p><div class="weather-options">${['☀ Sunny','☁ Cloudy','☂ Rainy','❄ Snowy','☾ Night'].map(w=>btn(L(w),'setWeather:'+w,'full')).join('')}</div>`);break;case'setWeather':weather=v;document.querySelector('.overlay')?.remove();render();break;case'close':document.querySelector('.overlay')?.remove();break;case'pastDreams':$('#past-dreams').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});break;case'dismissSaveError':saveError='';render();break;case'new':beginDream();break;case'quickVoice':case'newVoice':beginDream(true);break;case'empty':emptyDemo=!emptyDemo;render();break;case'detail':if(!store.get(v))return notify('This dream is no longer in your archive.');selected=v;if(page==='choose'){exploreDreamId=selected;if(choosingForContext){choosingForContext=false;back();}else{description=dream()?.raw||'';go(mode==='image'?'imageBuild':'gods');}}else go('detail');break;case'editDream':editing=d.id;draft={title:d.title,date:d.date,raw:d.body,tags:[...d.tags],transcriptText:d.transcriptText};draftCheckpoint=JSON.stringify(draft);go('edit');break;case'voice':go('voice');break;case'record':recording=!recording;if(!recording)recordText='Lin and I stood on a cloud as a blue whale floated slowly past us.';render();break;case'useVoice':if(!recordText.trim())return notify('Try the voice demo or type a transcript first.');draft.raw+=(draft.raw?'\n':'')+recordText;draft.transcriptText+=(draft.transcriptText?'\n':'')+recordText;back();break;case'organize':void organizeDream();break;case'tag':draft.tags=draft.tags.includes(v)?draft.tags.filter(t=>t!==v):[...draft.tags,v];render();break;case'saveRaw':save(false);break;case'saveOrganized':save(true);break;case'delete':sheet(`<h2>${L("Let this dream go?")}</h2><p>${L("This deletes the private entry, illustration and reflection card. Shared posts stay separate and can be managed in Dream circle.")}</p>${btn('Delete dream','confirmDelete','full danger')}`);break;case'confirmDelete':void persist(()=>store.deleteDream(selected),()=>{if(exploreDreamId===selected)exploreDreamId=null;document.querySelector('.overlay')?.remove();page='journal';tab='journal';stack=[];notify('Dream deleted');});break;case'export':sheet(`<h2>${L("Take your dreams with you")}</h2><label>${L("Export range")}</label><select id="exportRange"><option value="one">${L("Current dream")}</option><option value="all">${L('All {count} dreams',{count:dreams.length})}</option></select><label>${L("Text version")}</label><select id="exportVersion"><option value="body">${L("Confirmed text")}</option><option value="raw">${L("Original text")}</option></select><label class="check"><input id="exportRaw" type="checkbox">${L("Include original notes")}</label><label class="check"><input id="exportCard" type="checkbox">${L("Include reflection text")}</label><p class="note">${L("Download one Markdown file, with a section per dream. Image attachments are not included.")}</p>${btn('Download Markdown','download','full primary')}`);break;case'download':{let ds=$('#exportRange').value==='all'?dreams:[d].filter(Boolean);if(!ds.length)return notify('No dreams to export yet.');let ver=$('#exportVersion').value;let text=ds.map(x=>`# ${x.title}\n\n${L('Date: ')}${x.date}\n\n${L('Tags: ')}${x.tags.join(', ')}\n\n${x[ver]||x.raw}${$('#exportRaw').checked?'\n\n## '+L('Original notes')+'\n'+x.raw:''}${$('#exportCard').checked&&x.card?'\n\n## '+L('Reflection demo')+'\n'+x.card.text:''}`).join('\n\n---\n\n');download(text,'dreamstragm-demo.md','text/markdown;charset=utf-8');notify('Demo Markdown downloaded');break}case'start':if(v==='stats'){go('stats')}else{mode=v;choosingForContext=false;const locked=contextDream();if(locked){selected=locked.id;if(v==='image')description=locked.raw;go(v==='image'?'imageBuild':'gods');}else go('choose')}break;case'exploreCurrent':exploreDreamId=d?.id??null;choosingForContext=false;tab='explore';go('explore');break;case'changeContext':choosingForContext=true;go('choose');break;case'god':openGuide(v);break;
case'send':if(god==='Freud')void sendFreud();else sendDemoReply();break;
case'restartFreud':if(freudSession&&confirm(L('Clear this conversation and start again?'))){openFreudSession();render();}break;
case'cancelFreud':cancelFreudReply();render();break;
case'makeCard':cancelFreudReply();resultSourceVersion=d.contentVersion;go('card');break;case'saveCard':void persist(()=>store.addCard(d.id,{god,text:god==='Folklore'?'A little ease · Leave room to breathe':'Room to explore',sourceVersion:resultSourceVersion??d.contentVersion,isDemo:true}),()=>notify(L('Reflection saved to “{title}”',{title:d.title})));break;case'share':share();break;case'shareCard':share({card:true,cardText:god==='Folklore'?'A little ease · Cultural entertainment demo, not a prediction':'Room to explore · '+god+' · Reflection demo'});break;case'shareImage':if(imageResult)void shareGeneratedImage(imageResult);break;
case'shareImageToCircle':if(imageResult)share({image:true,generatedImage:imageResult,text:'',source:imageResult.dreamId});break;case'style':style=v;render();break;case'generate':void generateImage();break;
case'cancelImage':cancelImage();break;
case'retry':if(mode==='organize')void organizeDream();else void generateImage();break;
case'saveImage':saveGeneratedImage();break;
case'downloadImage':if(imageResult)downloadImage(imageResult);break;
case'cancelTidy':tidyToken++;tidyClient.cancel();tidyStatus='idle';returnToInput();break;case'resumeTidy':{const p=d.pendingDraft;if(!p)return;editing=d.id;draft={title:p.title,date:p.date,raw:p.text,tags:[...p.tags],transcriptText:p.transcriptText};draftCheckpoint=JSON.stringify(draft);tidySuggestions=[];tidyStatus='idle';go('edit');break;}case'returnInput':returnToInput();break;case'period':period=v;render();break;case'category':category=v;render();break;case'stat':result=v;go('statList');break;case'graph':go('graph');break;case'graphTag':$('#graphResult').innerHTML=`<h3 class="subheading">${esc(L('Connected with “{tag}”',{tag:v}))}</h3>${cards(dreams.filter(x=>['1','2','3'].includes(x.id)&&x.tags.includes(v)))}`;break;case'publish':publish={text:'',type:'Full text',source:null,image:false,card:false};go('publish');break;case'publicType':publish.type=v;render();break;case'mention':sheet(`<h2>${L("@ Dream neighbours")}</h2><p>${L("Sample users only. Nobody will be notified.")}</p>${['Floyd','Diana','Hazel','Andy'].map(n=>btn('@ '+n,'mentionUser:'+n,'full')).join('')}`);break;case'mentionUser':if(publish.type==='Tags')return notify('Switch to full text to mention someone.');publish.text+=' @'+v;document.querySelector('.overlay').remove();render();break;case'preview':if(!publishedText().trim()&&!publish.image&&!publish.card)return notify('Add some text or choose an attachment.');go('preview');break;case'confirmPublish':{const imageBlob=publish.image?(publish.generatedImage?.blob||(publishImage()?store.blob(publishImage().id):demoBlob())):null;void persist(()=>store.addPost({text:publishedText(),tags:publish.type==='Tags'?(dreams.find(x=>x.id===publish.source)?.tags||['Dream']):[],imageBlob,imageIsDemo:!publish.generatedImage&&(publishImage()?.isDemo??true),card:publish.card?{text:publish.cardText||'Room to explore · Reflection demo'}:null}),()=>{tab='circle';page='circle';stack=[];notify('Saved to this browser’s local Circle');});break;}case'post':result=v;go('post');break;case'comment':{const text=$('#commentInput').value.trim();if(!text)return notify('Write a reply first.');void persist(()=>store.comment(result,text),()=>{commentDraft='';notify('Reply saved');});break;}case'deleteComment':void persist(()=>store.deleteComment(result,Number(v)));break;case'deletePost':sheet(`<h2>${L("Delete this shared post?")}</h2><p>${L("Your private journal stays unchanged.")}</p>${btn('Delete post','confirmDeletePost','full danger')}`);break;case'confirmDeletePost':void persist(()=>store.deletePost(result),()=>{document.querySelector('.overlay')?.remove();page='circle';stack=[];});break;case'privacy':sheet(`<h2>${L("Privacy")}</h2><p>${L("Dreams, images and saved reflections are stored only in this browser, on this device and address. There is no cloud sync. Clearing browser data may remove them. Export backups regularly.")}</p><p>${L("AI tidy-up sends the selected note to OpenAI. Image generation sends the scene description and style you choose. Freud sends the selected dream and current conversation when you send a message. Circle posts stay in this browser.")}</p>`);break;case'data':sheet(`<h2>${L("Local data")}</h2><p>${L('{count} dreams · Saved in this browser. Backups include original notes, text history, tags, attachments and local Circle posts.',{count:dreams.length})}</p>${btn('Download full backup','backup','full primary')}<label>${L("Restore a full backup")}</label><input type="file" id="restoreFile" accept="application/json,.json" aria-label="${esc(L("Choose backup file"))}"><p class="note">${L("Restore replaces this browser’s archive after confirmation. Maximum backup size: 30 MB.")}</p>${btn('Clear local data','reset','full danger')}`);break;case'backup':void persist(async()=>download(await store.backup(),'dreamstragm-backup.json','application/json'),()=>notify('Backup downloaded'));break;case'reset':sheet(`<h2>${L("Clear all local data?")}</h2><p>${L("This permanently removes dreams, attachments, saved reflections and local Circle posts from this browser. Download a backup first. Samples will not return on refresh.")}</p>${btn('Clear all data','confirmReset','full danger')}`);break;case'confirmReset':void persist(()=>store.clear(),()=>{clearURLs();document.querySelectorAll('.overlay').forEach(e=>e.remove());page=tab='journal';stack=[];selected=null;exploreDreamId=null;draftCheckpoint='';notify('Local data cleared');});break;case'about':sheet(`<h2>${L("About this prototype")}</h2><p>${L("Use the navigation to visit your journal, explore and Dream circle. Tidy-up, illustration and Freud conversations call OpenAI through this app’s server. Voice, Jung, folklore and connections are demos. Saved entries persist in this browser.")}</p><p>${L("The assistant portrait is a locally stored image.")}</p>`);break;}});
function download(text,name,type){let url=URL.createObjectURL(new Blob([text],{type}));let a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
void boot();

// 离开前台后暂停声音，回来时仍需主动点击，避免意外自动播放。
document.addEventListener('visibilitychange',()=>{if(document.hidden)void ambient.pause().catch(()=>{});});

// 原文和已确认正文分开；未保存输入在离开页面时给出提醒，不伪装成已备份。
window.addEventListener('beforeunload',e=>{if(dirty()||saving||tidyClient.busy()||imageRequest){e.preventDefault();e.returnValue='';}});
document.addEventListener('change',async e=>{if(e.target.id!=='restoreFile')return;const file=e.target.files?.[0];if(!file)return;if(file.size>30*1024*1024){saveError='This backup is too large (maximum 30 MB).';render();return;}if(!confirm(L('Replace all local data with this backup? Export your current data first.'))){e.target.value='';return;}e.target.value='';void persist(async()=>store.restore(await file.text()),()=>{clearURLs();document.querySelectorAll('.overlay').forEach(e=>e.remove());page=tab='journal';stack=[];selected=dreams[0]?.id??null;exploreDreamId=null;draftCheckpoint='';notify('Backup restored');});});

// 偏好独立于梦境库；即使浏览器拒绝保存偏好，仍可在当前标签页使用所选语言。
document.addEventListener('change',e=>{if(e.target.id!=='languageSelect')return;const remembered=I18n.set(e.target.value);render();if(!remembered)notify('Language updated for this tab only. Your browser could not save the preference.');});
