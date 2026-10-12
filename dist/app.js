(() => {
  'use strict';
  const DATA = window.NEXT_NOW_DATA;
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const categories = ['手工','阅读','播客','运动','美食','自填项'];
  const colors = ['#bfefff','#d7edaa','#ffe45c','#ffd6de','#fff0b6','#c7efe4'];
  const emoji = {'手工':'✂️','阅读':'📖','播客':'🎧','运动':'👟','自填项':'✎','美食':'🥣','创作':'✎'};
  const state = {route:'home',filters:{mode:'random',minutes:30,category:null,custom:''},item:null,missing:new Set(),alternate:null,seen:new Map(),entries:[],currentEntry:null,draft:null,uploading:false,saving:false,storageMessage:'',emptyReason:'',spinning:false,calendarYear:null,calendarMonth:null,selectedDay:null,journalView:'calendar',sourceLinks:{},editorFrom:'diary',demoSearch:null,demoPlan:null,demoToken:0};
  let db, toastTimer, pendingNavigation, activeSourceItem, activeDemoPost;
  const keyFor = () => JSON.stringify(state.filters);
  const makeId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dateText = date => new Date(date).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'});
  const dayFormatter = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
  const dayKey = time => {const p=Object.fromEntries(dayFormatter.formatToParts(new Date(time)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
  const isCompleted = entry => typeof entry.completedAt==='number'&&Number.isFinite(entry.completedAt)&&entry.completedAt>0;
  const eventTime = entry => isCompleted(entry)?entry.completedAt:entry.createdAt;
  const timeText = time => new Date(time).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
  const fullDayText = key => `${Number(key.slice(0,4))} 年 ${Number(key.slice(5,7))} 月 ${Number(key.slice(8))} 日`;
  // Civil dates use Shanghai time; UTC is used only for month arithmetic, never for activity timestamps.
  function focusCalendar(time=Date.now(),select=false){const key=dayKey(time);state.calendarYear=Number(key.slice(0,4));state.calendarMonth=Number(key.slice(5,7))-1;state.selectedDay=select?key:null;state.journalView='calendar';}
  const glyphs = {
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h.01m4 0h.01m4 0h.01m-8 3h.01m4 0h.01"/>',
    list:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
    left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',external:'<path d="M14 3h7v7m-9 2 9-9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>'
  };
  const icon = name => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]||''}</svg>`;
  // One-color five-petal badge. The date sits above it rather than on the same red fill.
  const flower = () => `<svg class="inspiration-flower" viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor">${Array.from({length:5},(_,index)=>`<ellipse cx="24" cy="13" rx="8.5" ry="11" transform="rotate(${index*72} 24 24)"/>`).join('')}<circle cx="24" cy="24" r="8"/></g></svg>`;
  const statusHTML = entry => `<span class="entry-status ${isCompleted(entry)?'complete':'pending'}">${isCompleted(entry)?`${icon('check')}玩过啦`:'已开启'}</span>`;
  const machineSVG = () => `<svg class="machine-svg" viewBox="-12 -8 240 276" aria-label="红色平面扭蛋机" role="img"><defs><g id="capsule"><rect x="-18" y="-15" width="36" height="30" rx="15" fill="white" stroke="#202124" stroke-width="2"/><path d="M-17 0A15 15 0 0 1-3-14H3A15 15 0 0 1 17 0Z" fill="currentColor"/><path d="M-17 0H17" stroke="#202124" stroke-width="2"/><path d="M-10-7-4-10" stroke="white" stroke-width="3" stroke-linecap="round"/></g></defs><ellipse cx="108" cy="249" rx="105" ry="10" fill="#dcc749" opacity=".45"/><rect x="29" y="140" width="176" height="92" rx="20" fill="#202124"/><circle cx="108" cy="82" r="74" fill="#c7f1f7" stroke="#202124" stroke-width="3"/><path d="M50 62Q55 25 94 20" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><g class="capsules"><use href="#capsule" transform="translate(78 67) rotate(-20)" color="#ff2442"/><use href="#capsule" transform="translate(127 53) rotate(20)" color="#ffe45c"/><use href="#capsule" transform="translate(148 90) rotate(-18)" color="#22b8be"/><use href="#capsule" transform="translate(101 102) rotate(30)" color="#ff95a7"/><use href="#capsule" transform="translate(61 106) rotate(-8)" color="#ffe45c"/><use href="#capsule" transform="translate(126 128) rotate(-12)" color="#80dce7"/></g><rect x="22" y="132" width="174" height="93" rx="20" fill="#ff2442" stroke="#202124" stroke-width="3"/><rect x="39" y="146" width="68" height="25" rx="7" fill="#fff8cf" stroke="#202124" stroke-width="2"/><text x="73" y="163" text-anchor="middle" font-size="12" font-weight="900" fill="#202124">现在开玩</text><circle cx="148" cy="171" r="24" fill="#202124"/><g class="rotor"><circle cx="145" cy="167" r="24" fill="#ffe45c" stroke="#202124" stroke-width="3"/><rect x="126" y="162" width="38" height="10" rx="5" fill="#fff8cf" stroke="#202124" stroke-width="2" transform="rotate(-30 145 167)"/></g><rect x="46" y="186" width="64" height="29" rx="10" fill="#202124"/><g class="exit-capsule"><use href="#capsule" transform="translate(78 202) rotate(8) scale(.75)" color="#ffe45c"/></g><path d="M176 203Q181 209 185 202" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/><rect x="34" y="222" width="151" height="14" rx="6" fill="#ff2442" stroke="#202124" stroke-width="3"/></svg>`;
  function art(category){
    const backgrounds={'手工':'#bfefff','阅读':'#dcecb8','播客':'#ffd6de','运动':'#fff0a4','美食':'#ccefe1','创作':'#dedaff'};
    let drawing;
    if(category==='手工'||category==='阅读') drawing=`<g transform="translate(105 67) rotate(-9 96 65)"><path d="M0 5Q47-6 92 11V122Q44 104 0 116Z" fill="#fff8cf" stroke="#202124" stroke-width="3"/><path d="M92 11Q139-7 190 5V116Q143 104 92 122Z" fill="white" stroke="#202124" stroke-width="3"/><path d="M21 35 71 40M21 52 71 57M21 70 58 73M114 38 166 32M114 56 166 50M114 75 166 68" stroke="#b5beca" stroke-width="4"/><path d="M121 0H158V92L140 78 121 92Z" fill="#ff2442" stroke="#202124" stroke-width="3"/><circle cx="140" cy="28" r="10" fill="#ffe45c"/></g>`;
    else if(category==='播客') drawing=`<path d="M118 169V123A87 87 0 0 1 292 123V169" stroke="#202124" stroke-width="18" fill="none"/><path d="M118 145V124A87 87 0 0 1 292 124V145" stroke="#ff2442" stroke-width="11" fill="none"/><rect x="101" y="134" width="43" height="75" rx="17" fill="#ffe45c" stroke="#202124" stroke-width="3"/><rect x="269" y="134" width="43" height="75" rx="17" fill="#ffe45c" stroke="#202124" stroke-width="3"/><rect x="172" y="107" width="65" height="84" rx="31" fill="white" stroke="#202124" stroke-width="3"/><path d="M160 166Q160 219 205 219Q250 219 250 166M205 219V238M187 238H223" fill="none" stroke="#202124" stroke-width="4"/><path d="M190 124V154M202 122V154M214 124V154" stroke="#22b8be" stroke-width="4" stroke-linecap="round"/>`;
    else if(category==='运动') drawing=`<path d="M101 173 176 126 188 152 227 163 247 155 291 175Q314 184 315 207H101Z" fill="#ff2442" stroke="#202124" stroke-width="3"/><path d="M101 206H316V222H101Z" fill="white" stroke="#202124" stroke-width="3"/><path d="M172 157 193 173M187 151 210 171M205 158 226 177" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="M83 117H132M70 136H113M61 157H101" stroke="#22b8be" stroke-width="5" stroke-linecap="round"/><path d="M254 79Q275 52 292 75Q307 98 280 114" fill="none" stroke="#202124" stroke-width="3"/>`;
    else if(category==='美食') drawing=`<path d="M113 136H299L278 217Q205 252 133 217Z" fill="white" stroke="#202124" stroke-width="3"/><ellipse cx="206" cy="135" rx="93" ry="27" fill="#ffd6de" stroke="#202124" stroke-width="3"/><circle cx="160" cy="128" r="19" fill="#ff2442"/><circle cx="208" cy="143" r="18" fill="#ffe45c"/><circle cx="244" cy="121" r="20" fill="#ff8da5"/><path d="M273 149 307 66" stroke="#202124" stroke-width="10" stroke-linecap="round"/><path d="M273 149 307 66" stroke="#ffe45c" stroke-width="6" stroke-linecap="round"/><path d="M154 108 165 90 176 109" fill="#22b8be" stroke="#202124" stroke-width="2"/>`;
    else drawing=`<g transform="translate(100 55) rotate(-9 90 80)"><rect width="182" height="186" rx="12" fill="white" stroke="#202124" stroke-width="3"/><path d="M25 45Q55 19 83 44T152 45M25 78Q64 114 96 73T154 78M28 128Q65 106 109 132T154 133" stroke="#ff2442" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="138" cy="159" r="13" fill="#ffe45c"/></g><path d="M292 76 326 225 312 246 296 227 274 80Z" fill="#ffe45c" stroke="#202124" stroke-width="3"/>`;
    return `<svg viewBox="0 0 410 290" role="img" aria-label="${esc(category)}灵感插画"><rect width="410" height="290" fill="${backgrounds[category]||'#bfefff'}"/><circle cx="332" cy="58" r="26" fill="#ffe45c"/><path d="M49 233 117 251 182 232 249 255 365 234" fill="none" stroke="white" stroke-width="3"/>${drawing}<path d="M52 53 56 66 69 70 56 74 52 87 48 74 35 70 48 66Z" fill="#ffe45c" stroke="#202124" stroke-width="2"/><path d="M359 168 362 177 371 180 362 183 359 192 356 183 347 180 356 177Z" fill="#fff8cf" stroke="#202124" stroke-width="2"/></svg>`;
  }
  async function openDB(){
    return new Promise((resolve,reject)=>{const request=indexedDB.open('next-is-now-demo',1);request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('storage blocked'));});
  }
  async function readEntries(){return new Promise((resolve,reject)=>{const r=db.transaction('entries','readonly').objectStore('entries').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function persist(entry){
    if(!db) return false;
    return new Promise((resolve,reject)=>{const t=db.transaction('entries','readwrite');t.objectStore('entries').put(clone(entry));t.oncomplete=()=>resolve(true);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
  }
  async function removeStored(id){if(!db)return;return new Promise((resolve,reject)=>{const t=db.transaction('entries','readwrite');t.objectStore('entries').delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
  async function saveEntry(entry){
    try{const saved=await persist(entry);state.storageMessage=saved?'':'当前浏览器无法持久保存；这次记录暂存于页面，刷新可能丢失。';}
    catch{state.storageMessage='本地保存未成功；记录暂存于页面，请保留当前页面后重试。';}
    const index=state.entries.findIndex(x=>x.id===entry.id);if(index<0)state.entries.unshift(clone(entry));else state.entries[index]=clone(entry);
    state.entries.sort((a,b)=>b.createdAt-a.createdAt);
  }
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
  function modal(title,body,actions=''){ $('#modal').dataset.kind='';$('#modal-body').innerHTML=`<div class="modal-inner"><div class="modal-header"><h2 id="modal-title">${esc(title)}</h2><button class="close-modal" data-action="close-modal" aria-label="关闭弹层">×</button></div>${body}${actions}</div>`;if(!$('#modal').open)$('#modal').showModal(); }
  const closeModal=()=>{ $('#modal').close();$('#modal').dataset.kind=''; };
  const needsChecklist=item=>['手工','美食'].includes(item.category);
  const overBudget=plan=>plan.ready&&state.filters.minutes>0&&plan.minutes>state.filters.minutes;
  const durationText=(plan,item)=>plan.kind==='demo-adapted'?`约 ${plan.minutes} 分钟 · 演示预设`:plan.kind==='adapted'?`约 ${plan.minutes} 分钟 · 调整后估算`:(item.durationLabel||`约 ${plan.minutes} 分钟`);
  const materialKey=()=>JSON.stringify([state.item?.id,[...state.missing].sort()]);
  function resetDemo(){state.demoToken++;state.demoSearch=null;state.demoPlan=null;activeDemoPost=null;}
  function validSourceURL(value){
    const raw=String(value||'').match(/https?:\/\/[^\s<>"“”]+/i)?.[0]?.replace(/[。；，、）)\]}]+$/,'');
    if(!raw)return null;
    try{const url=new URL(raw);const host=url.hostname.toLowerCase();
      if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&url.port!=='443')return null;
      if(!['xiaohongshu.com','xhslink.com'].some(domain=>host===domain||host.endsWith('.'+domain)))return null;
      url.protocol='https:';return url.href;
    }catch{return null;}
  }
  const sourceURL=item=>validSourceURL(state.sourceLinks[item.id]||item.sourceUrl);
  const guideFor=entry=>{
    if(entry.demoAlternative?.isDemo)return {summary:entry.demoAlternative.summary,basisLabel:'模拟帖子 · 演示新方法',steps:entry.steps.map((body,index)=>({title:['准备新材料','采用新方法','完成这一小步'][index]||`第 ${index+1} 步`,body})),notice:entry.demoAlternative.notice};
    const guide=entry.source?.guide||window.NEXT_NOW_GUIDES?.[entry.itemId];
    if(guide&&entry.adaptation!=='adapted')return guide;
    return {summary:entry.adaptation==='adapted'?'这是你选定的替代材料体验版，步骤依据当前方案整理。':entry.source?.intro||entry.title,basisLabel:entry.adaptation==='adapted'?'AI 整理 · 调整后准备建议':'当时选定的方案',steps:entry.steps.map((body,index)=>({title:`第 ${index+1} 步`,body})),notice:'当前未取得原视频内容，这里不是完整视频提炼。制作参数仍需查看原教程。'};
  };
  function thumbnailHTML(item,entryId){
    if(!item.cover)return `<button class="guide-thumbnail" data-action="source-entry" data-id="${esc(entryId)}" aria-label="查看原收藏">${art(item.category)}</button>`;
    const [x,y,w,h]=item.crop;
    return `<button class="guide-thumbnail" data-action="source-entry" data-id="${esc(entryId)}" aria-label="查看${esc(item.title)}的原收藏"><span class="thumb-crop" style="aspect-ratio:${w}/${h}"><img src="${esc(item.cover)}" alt="${esc(item.title)}的原收藏缩略图" style="width:${item.imageWidth/w*100}%;left:${-x/w*100}%;top:${-y/h*100}%"></span><span>查看原收藏 ${icon('external')}</span></button>`;
  }
  function coverHTML(item){
    if(!item.cover)return `<div class="art-cover">${art(item.category)}</div>`;
    const [x,y,w,h]=item.crop,url=sourceURL(item);
    const contents=`<img data-testid="primary-cover" data-note-id="${item.id}" src="${esc(item.cover)}" alt="${esc(item.title)}的收藏封面" style="width:${item.imageWidth/w*100}%;left:${-x/w*100}%;top:${-y/h*100}%" decoding="async"><span class="cover-label">${url?'点击进入小红书原帖':'点击关联原帖链接'} ${icon('external')}</span>`;
    return `<div class="art-cover saved-cover" style="--cover-ratio:${w}/${h}">${url?`<a class="cover-open" data-testid="source-direct-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="在小红书打开${esc(item.title)}">${contents}</a>`:`<button class="cover-open" data-action="source" aria-label="关联${esc(item.title)}的原帖链接">${contents}</button>`}</div>`;
  }
  function planFor(){
    const item=state.item;if(!item)return null;
    if(!needsChecklist(item))return {ready:true,title:item.title,minutes:item.minutes,materials:item.materials,steps:item.steps,reason:'',kind:'original'};
    const missing=item.materials.filter(m=>state.missing.has(m.id));const essential=missing.filter(m=>!m.optional);
    if(!essential.length)return {ready:true,title:item.title,minutes:item.minutes,materials:item.materials.filter(m=>!state.missing.has(m.id)),steps:item.steps,reason:missing.length?'已经省去可选装饰，主要玩法和时间不变。':'',kind:missing.length?'omit':'original'};
    if(state.demoPlan?.key===materialKey())return {...state.demoPlan,ready:true,kind:'demo-adapted',reason:state.demoPlan.change};
    return {ready:false,kind:'missing',essential,title:item.title,minutes:item.minutes,reason:'先查看演示替代方案，确认新材料后再开始。'};
  }
  async function searchDemoAlternatives(){
    if(state.route!=='result'||state.demoSearch?.status==='loading')return;
    const plan=planFor();if(plan.kind!=='missing')return;
    const item=state.item,key=materialKey(),token=++state.demoToken;
    const query=`${item.activity||item.title} 不用${plan.essential.map(m=>m.label).join('、')} 替代方法`;
    state.demoPlan=null;state.demoSearch={status:'loading',key,query,results:[]};render();
    await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?100:700));
    if(state.route!=='result'||state.demoToken!==token||materialKey()!==key)return;
    const results=window.NEXT_NOW_BUILD_DEMO_ALTERNATIVES(item,[...state.missing]);
    state.demoSearch={status:'done',key,query,results};render();$('#demo-search-results')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }
  function showDemoPost(post,readOnly=false){
    activeDemoPost={post:clone(post),key:materialKey(),readOnly};
    modal('替代方案 · 模拟帖子',`<article class="demo-post"><div class="demo-post-cover">${art(post.category)}<span>演示封面</span></div><span class="demo-label">${esc(post.sourceLabel)}</span><h3>${esc(post.title)}</h3><p class="demo-author">${esc(post.author)} · 虚构演示账号</p><p>${esc(post.summary)}</p><div class="demo-change"><strong>与原收藏有什么不同？</strong><p>${esc(post.change)}</p><small>原灵感：${esc(post.originalTitle)}</small></div><h4>新方案准备清单</h4><div class="demo-material-list">${post.materials.map(m=>`<span>${esc(m.label)}${m.optional?' · 可选':''}</span>`).join('')}</div><p class="demo-added">${post.added.length?'需要另外准备：'+esc(post.added.join('、')):'没有额外新增材料；仍需核对全部清单。'}</p><p>演示时长：约 ${post.minutes} 分钟${!readOnly&&state.filters.minutes>0&&post.minutes>state.filters.minutes?' · 超过当前时间，采用后需主动调整':''}</p><ol class="steps">${post.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="notice">${esc(post.notice)}</div>${readOnly?'':`<label class="demo-ready"><input type="checkbox" id="demo-material-ready" data-testid="demo-material-ready"><span>我已确认新方案的材料，并接受效果变化</span></label><button class="primary" data-action="accept-demo-plan" data-id="${esc(post.id)}" data-testid="accept-demo-plan" disabled>用这个方案</button><button class="quiet demo-cancel" data-action="close-modal">再看看，不切换</button>`}</article>`);
    $('#modal').dataset.kind='demo-post';
  }
  function candidates(){
    const f=state.filters;let list=DATA.filter(i=>f.minutes===0||i.minutes<=f.minutes);
    if(f.mode==='target'&&f.category!=='自填项')list=list.filter(i=>i.category===f.category);
    if(f.mode==='target'&&f.category==='自填项'){
      const q=f.custom.trim().toLowerCase();const mappings=[[/手工|拼豆|不织布|羊毛毡|书法|练字|小楷|篆书|折纸|串珠|拼贴|书签/,'手工'],[/阅读|小说|散文|书摘|读书|看书|史铁生|好运设计/,'阅读'],[/播客|访谈|听|音频/,'播客'],[/运动|瑜伽|跟练|背部|健身|散步|走路|跳舞|活动|球/,'运动'],[/美食|甜品|饮品|可可|酸奶|水果|烘焙|贝果|草莓|拌面|虾滑|培根|做饭/,'美食'],[/发型|编发|双麻花|ai|skill|提示词|照片|设计/,'生活技能'],[/画画|水彩|速写|涂鸦|摄影|拍照|纸条|创作/,'创作']];
      const inferred=mappings.filter(([re])=>re.test(q)).map(([,cat])=>cat);
      const general=new Set(['手工','阅读','播客','运动','美食','创作','听','书','放松','动手','活动','画画']);
      const specific=[...new Set(DATA.flatMap(i=>i.tags).filter(t=>!general.has(t)&&q.includes(t.toLowerCase())))];
      const listenIntent=/播客|听|音频/.test(q);const readIntent=!listenIntent&&/阅读|读|看书/.test(q);
      list=list.filter(i=>{
        if(listenIntent&&i.category!=='播客')return false;
        if(readIntent&&i.category!=='阅读')return false;
        if(specific.length)return i.tags.some(t=>specific.includes(t));
        if(/画画|水彩|速写|涂鸦/.test(q))return i.tags.some(t=>['画画','速写','涂鸦'].includes(t));
        return inferred.includes(i.category)||i.title.toLowerCase().includes(q)||i.tags.some(t=>q.includes(t)||t.includes(q));
      });
    }
    return list;
  }
  async function spin(reset=false){
    if(state.spinning)return;
    resetDemo();
    const key=keyFor();if(reset||!state.seen.has(key))state.seen.set(key,new Set());
    const all=candidates();if(!reset&&state.item&&all.some(i=>i.id===state.item.id))state.seen.get(key).add(state.item.id);
    let pool=all.filter(i=>!state.seen.get(key).has(i.id));if(reset&&pool.length>1)pool=pool.filter(i=>i.id!==state.item?.id);
    if(!pool.length){state.emptyReason=all.length?'exhausted':'no-match';state.route='empty';render();return;}
    const token=(state.spinToken||0)+1;state.spinToken=token;state.spinning=true;state.route='spinning';render();window.scrollTo(0,0);
    const chosen=pool[Math.floor(Math.random()*pool.length)];
    await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?100:850));
    if(token!==state.spinToken)return;
    state.spinning=false;state.item=chosen;state.missing=new Set();state.alternate=null;resetDemo();state.seen.get(key).add(chosen.id);state.route='result';render();
  }
  function conditionText(){const f=state.filters;return `${f.minutes===0?'不限时间':`${f.minutes} 分钟以内`} · ${f.mode==='random'?'随机灵感':f.category==='自填项'?f.custom:f.category}`;}
  function reasonText(){const f=state.filters;const direction=f.mode==='target'?`按你想试的「${f.category==='自填项'?f.custom:f.category}」找到了这条`:'从你的收藏素材里，随缘挑中了这条';return `${direction}。${f.minutes===0?'这次不限时间，按自己的节奏来。':`以 ${f.minutes} 分钟为筛选上限，时长按本次体验范围估算。`}`;}
  function renderHome(){
    return `<div class="home-grid home-unified view-enter"><section class="hero">
      <div class="hero-story"><div class="eyebrow"><span class="tiny-dot"></span> SAVED IDEAS, REAL MOMENTS</div>
        <h1 class="hero-title" data-testid="hero-title" aria-label="把收藏夹的“下次一定”扭成“就是现在”！"><span class="hero-title-intro">把收藏夹的</span><span class="hero-title-line">“下次一定”</span><span class="hero-title-line hero-title-finale">扭成<span class="red-text">“就是现在”！</span></span></h1>
        <p class="hero-subtitle">收藏那么多，今天玩哪个？</p><span class="floating-sticker">有空就玩 ↗</span><span class="spark" aria-hidden="true">✧</span>
        <div class="machine-wrap" data-testid="hero-machine">${machineSVG()}</div><div class="hero-note"><span class="line"></span>喜欢掉出来啦<span class="line"></span></div>
      </div>
      <section class="mode-section" aria-labelledby="mode-title"><h2 id="mode-title">今天怎么开玩？</h2><p class="mode-subtitle">有想法就按想法来，没想法就交给惊喜。</p>
        <div class="mode-cards"><button class="mode-card mode-target" data-action="target" data-testid="target-mode"><span class="mode-heading"><span class="mode-icon" aria-hidden="true">⚑</span><strong>我有目标</strong><span class="mode-arrow" aria-hidden="true">↗</span></span><small class="mode-description">想做点什么，已经有谱</small></button>
        <button class="mode-card mode-random" data-action="random" data-testid="random-mode"><span class="mode-heading"><span class="mode-icon" aria-hidden="true">✦</span><strong>随机灵感</strong><span class="mode-arrow" aria-hidden="true">↗</span></span><small class="mode-description">没想法？让收藏替你挑</small></button></div>
      </section>
    </section></div>`;
  }
  function renderConfig(){const f=state.filters,target=f.mode==='target';return `<section class="form-shell view-enter"><div class="page-head"><button class="back-button" data-action="home">← 换一种玩法</button><br><span class="mode-label">${target?'我有目标':'随机灵感 · 时间可选'}</span><h1>${target?'今天想来点什么？':'给惊喜留多久？'}</h1><p>${target?'告诉我时间和方向，剩下的交给这颗扭蛋。':'只调时间，方向继续随缘。'}</p></div><div class="form-card"><div class="field-group"><div class="field-label">你有多久？</div><div class="chips">${[15,30,90,0].map(v=>`<button class="chip ${f.minutes===v?'selected':''}" aria-pressed="${f.minutes===v}" data-action="time" data-value="${v}" data-testid="time-${v}">${v===0?'不限时间':v===30?'半小时':`${v} 分钟`}</button>`).join('')}</div></div>${target?`<div class="field-group"><div class="field-label">想往哪个方向走？</div><div class="categories">${categories.map((cat,index)=>`<button class="category ${f.category===cat?'selected':''}" style="--cat-color:${colors[index]}" data-action="category" data-value="${cat}" aria-pressed="${f.category===cat}" data-testid="category-${cat}"><span class="cat-number">0${index+1}</span><strong>${cat}</strong><span class="cat-icon" aria-hidden="true">${emoji[cat]}</span></button>`).join('')}</div>${f.category==='自填项'?`<label class="visually-hidden" for="custom-goal">自填目标</label><input class="custom-input" id="custom-goal" data-testid="custom-goal" maxlength="40" value="${esc(f.custom)}" placeholder="比如拼豆、草莓大福、双麻花…"><p class="field-help">搜索这批收藏里与目标相关的标题和标签。</p>`:''}</div>`:''}<button class="primary form-submit" data-action="draw" data-testid="draw-button" ${target&&(!f.category||(f.category==='自填项'&&!f.custom.trim()))?'disabled':''}>${target&&!f.category?'选个方向，再开玩':'扭一个，开玩！ ↗'}</button></div></section>`;}
  function renderAdapt(plan){
    if(plan.kind==='original')return '';
    if(plan.kind==='omit')return `<div class="adapt-card" data-testid="adapt-panel"><h3>省去可选项，照样玩！</h3><p>${esc(plan.reason)}</p></div>`;
    if(plan.kind==='demo-adapted')return `<div class="adapt-card demo-adopted" data-testid="adapt-panel"><span class="demo-label">已采用演示方案</span><h3>${esc(plan.title)}</h3><p>${esc(plan.change)}</p><div class="mini-actions"><button class="mini" data-action="demo-view" data-id="${esc(plan.id)}">回看模拟帖子</button><button class="mini secondary" data-action="demo-clear-choice">重新选方案</button><button class="mini secondary" data-action="reset-materials">恢复原方案</button></div></div>`;
    const search=state.demoSearch?.key===materialKey()?state.demoSearch:null;
    return `<section class="adapt-card pending demo-search-panel" data-testid="adapt-panel"><div class="adapt-head"><h3>缺材料？换个方法试试</h3><span class="demo-label">Demo 模拟</span></div><p>缺少：${esc(plan.essential.map(m=>m.label).join('、'))}</p><p class="demo-disclaimer">模拟查找流程，下面都是预设示例，未联网搜索。</p>${search?.status==='loading'?'<div class="demo-loading" role="status"><span></span>模拟查找替代方法中…</div>':search?.status==='done'?`<p class="demo-query">模拟检索词：${esc(search.query)}</p><div class="demo-search-results" data-testid="demo-search-results">${search.results.length?search.results.map(post=>`<button class="demo-result" data-action="demo-view" data-id="${esc(post.id)}"><span class="demo-result-art">${art(post.category)}</span><span class="demo-result-copy"><span class="demo-label">模拟帖子</span><strong>${esc(post.title)}</strong><small>${esc(post.change)}</small><span class="demo-result-meta">约 ${post.minutes} 分钟 · 演示预设</span></span>${icon('right')}</button>`).join(''):'<div class="demo-no-results"><strong>这个缺料组合，暂时没有演示实例</strong><p>不会把仍需缺失材料的方案推荐给你。可以恢复材料，或再扭一个。</p></div>'}</div><div class="mini-actions"><button class="mini secondary" data-action="demo-search">重新模拟查找</button><button class="mini secondary" data-action="reset-materials">恢复原方案</button></div>`:'<div class="mini-actions"><button class="mini" data-action="demo-search" data-testid="demo-search">帮我找替代方法</button><button class="mini secondary" data-action="reset-materials">恢复原方案</button></div>'}</section>`;
  }
  function renderResult(){
    const i=state.item,plan=planFor(),over=overBudget(plan),demo=plan.kind==='demo-adapted';
    const materials=needsChecklist(i)?`<section class="materials" data-testid="materials-panel"><h3>${demo?'新方法准备清单':'看看手边有什么'}</h3><p class="material-help">${demo?'已按你确认的演示方案更新；材料有变化，可重新选方案。':`手边没有？取消勾选就行${i.materials.some(m=>m.optional)?' · 装饰可选':''}`}</p><div class="material-options">${demo?plan.materials.map(m=>`<span class="material-check demo-confirmed-material">${icon('check')}<span>${esc(m.label)}</span>${m.optional?'<small>可选</small>':''}</span>`).join(''):i.materials.map(m=>`<label class="material-check ${state.missing.has(m.id)?'missing':''}"><input type="checkbox" data-material="${m.id}" data-testid="material-${m.id}" ${state.missing.has(m.id)?'':'checked'}><span>${esc(m.label)}</span>${m.optional?'<small>可选</small>':''}</label>`).join('')}</div><p class="material-help">${demo?'这是一份虚构演示清单，不代表真实帖子或可直接照做的配方。':'准备清单依据封面推测，具体以原教程为准。'}</p>${renderAdapt(plan)}</section>`:'';
    return `<section class="result-shell ticket-result view-enter"><div class="ticket-dispenser" aria-hidden="true"><div class="ticket-mini-machine">${machineSVG()}</div><span class="ticket-trail"></span><svg class="opened-capsule" viewBox="0 0 132 78"><path d="M10 34a30 30 0 0 1 60 0Z" fill="#bfefff" stroke="#202124" stroke-width="2.5" transform="rotate(-17 40 34)"/><path d="M59 43h60a30 30 0 0 1-60 0Z" fill="#fffef6" stroke="#202124" stroke-width="2.5" transform="rotate(12 89 43)"/><path d="m88 5 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="#ffe45c" stroke="#202124" stroke-width="1.5"/></svg></div>
      <article class="paper-ticket"><div class="result-grid"><div class="art-column">${demo?'<div class="demo-origin-note">原收藏参考图 · 新方法为 Demo 演示</div>':''}${coverHTML(i)}</div><div class="result-column">
        <p class="source-label">${demo?`模拟替代方案 · ${esc(plan.author)} · 非真实帖子`:`${esc(i.category)}${i.subtype?` / ${esc(i.subtype)}`:''} · ${esc(i.author||'')}`}</p><h1 class="result-title" data-testid="result-title">${esc(plan.title)}</h1>
        <div class="result-meta"><button class="time-badge" data-action="adjust-conditions" title="修改时间与方向" data-testid="result-time" data-minutes="${plan.minutes}">${esc(durationText(plan,i))}</button></div>
        <p class="result-description" data-testid="challenge-intro">${esc(demo?plan.summary:i.challengeIntro||i.intro||i.activity)}</p><p class="activity-scope">这次先玩：${esc(demo?plan.title:i.activity||plan.title)}</p>
        ${materials}${over?`<div class="over-budget" data-testid="over-budget"><strong>调整后需要 ${plan.minutes} 分钟，超过了你的 ${state.filters.minutes} 分钟。</strong>愿意多留一点时间，还是换个灵感？<div class="mini-actions"><button class="mini" data-action="extend-time">改为 ${[15,30,90].find(v=>v>=plan.minutes)||plan.minutes} 分钟</button></div></div>`:''}
        <div class="result-actions dual-actions"><button class="primary" data-action="start" data-testid="start-button" ${!plan.ready||over||state.saving?'disabled':''}>${state.saving?'正在存好…':over?'先调整时间':!plan.ready?'先选替代方案':'就它，开玩！'}</button><button class="primary secondary-solid" data-action="again">再扭一个</button></div>
      </div></div></article></section>`;
  }
  function renderEmpty(){const exhausted=state.emptyReason==='exhausted';return `<section class="form-shell view-enter"><div class="page-head"><button class="back-button" data-action="adjust-conditions">← 调整条件</button></div><div class="empty-state"><span class="empty-art" aria-hidden="true">✧</span><h1>${exhausted?'这一轮，已经扭完啦':'这个方向，暂时没找到'}</h1><p>${exhausted?'符合当前条件的演示收藏已经看过了。要不要重新装一轮？':`${esc(conditionText())}：演示收藏里暂时没有合适内容。<br>换个方向或时间，再试试。`}</p><div class="empty-actions">${exhausted?'<button class="primary" data-action="restart-round">重新装一轮</button>':'<button class="primary" data-action="adjust-conditions">换个条件</button>'}<button class="quiet" data-action="random">随缘扭一个 ↗</button></div></div></section>`;}
  function renderStart(){
    const e=state.entries.find(x=>x.id===state.currentEntry);if(!e)return renderHome();const guide=guideFor(e),done=isCompleted(e);
    return `<section class="start-shell play-shell view-enter"><div class="page-head"><span class="mode-label">开玩啦！</span><h1>${esc(e.title)}</h1><p>收藏里的喜欢，今天亲自试试。</p></div>
      <article class="play-guide" data-testid="play-guide"><div class="guide-media">${thumbnailHTML(e.source,e.id)}<span class="guide-duration">${esc(e.durationLabel||`约 ${e.minutes} 分钟`)}</span></div>
        <div class="guide-copy"><span class="guide-basis" data-testid="guide-basis">${esc(guide.basisLabel)}</span><h2>这次怎么玩</h2><p class="guide-summary">${esc(guide.summary)}</p>
          <ol class="guide-steps">${guide.steps.map((s,index)=>`<li ${index===0?'data-testid="first-step"':''}><span class="guide-step-number">${String(index+1).padStart(2,'0')}</span><div><strong>${esc(s.title)}</strong><p>${esc(s.body)}</p></div></li>`).join('')}</ol>
        </div><p class="guide-notice">${esc(guide.notice)}${e.demoAlternative?`<br><button class="demo-entry-source" data-action="entry-demo-post" data-id="${esc(e.id)}">回看采用的模拟帖子 ${icon('external')}</button>`:''}</p>
      </article><div class="start-actions completion-actions"><button class="primary" data-action="complete-entry" data-id="${esc(e.id)}" data-testid="complete-entry" ${done||state.saving?'disabled':''}>${state.saving?'正在打卡…':'体验已完成！'}</button>${done?`<button class="primary record-solid" data-action="edit-entry" data-id="${esc(e.id)}" data-testid="start-record">灵感记录</button>`:''}</div><p class="completion-help">${done?'已打卡，随时回来补上照片和感受。':'玩完后点一下，给今天开一朵小红花。'}</p></section>`;
  }
  function renderCalendar(){
    if(state.calendarYear===null)focusCalendar();
    const year=state.calendarYear,month=state.calendarMonth,today=dayKey(Date.now());
    const monthKey=`${year}-${String(month+1).padStart(2,'0')}`;
    const first=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
    const count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
    const completed=new Map(),started=new Set();
    state.entries.forEach(e=>{const key=dayKey(eventTime(e));if(isCompleted(e))completed.set(key,(completed.get(key)||0)+1);else started.add(key);});
    const completedDays=[...completed.keys()].filter(key=>key.startsWith(`${monthKey}-`)).length;
    const days=Array.from({length:first},()=>'<span class="calendar-blank" aria-hidden="true"></span>');
    for(let day=1;day<=count;day++){
      const key=`${monthKey}-${String(day).padStart(2,'0')}`,done=completed.get(key)||0,selected=state.selectedDay===key;
      days.push(`<button class="calendar-day ${done?'lit':''} ${selected?'selected':''} ${key===today?'today':''}" data-action="calendar-day" data-day="${key}" data-testid="calendar-day" aria-pressed="${selected}" ${key===today?'aria-current="date"':''} aria-label="${fullDayText(key)}${done?`，完成 ${done} 个收藏`:started.has(key)?'，有已开启记录':'，暂无记录'}"><span class="day-symbol">${done?flower():''}<span class="day-number">${day}</span></span>${!done&&started.has(key)?'<span class="started-dot" aria-hidden="true"></span>':''}</button>`);
    }
    return `<section class="calendar-card" data-testid="calendar-panel" aria-label="完成日历"><div class="calendar-top"><span class="calendar-kicker">${icon('calendar')}开玩日历</span><button class="calendar-today" data-action="calendar-today">回今天</button></div><div class="calendar-month"><button class="calendar-arrow" data-action="calendar-month" data-delta="-1" aria-label="上个月">${icon('left')}</button><h2 data-testid="calendar-month">${year}<span>年</span> ${String(month+1).padStart(2,'0')}<span>月</span></h2><button class="calendar-arrow" data-action="calendar-month" data-delta="1" aria-label="下个月">${icon('right')}</button></div><div class="calendar-weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${days.join('')}</div><div class="calendar-foot"><div class="flower-note">${flower()}<p>${completedDays?`这个月，点亮了 <strong>${completedDays}</strong> 天`:'做完一件喜欢的事，就开一朵花'}<small>点日期，看看那天的生活碎片</small></p></div><span class="calendar-legend"><i class="started-dot"></i>仅开启</span></div></section>`;
  }
  function renderTimeline(){
    const entries=state.entries.filter(e=>!state.selectedDay||dayKey(eventTime(e))===state.selectedDay).sort((a,b)=>eventTime(b)-eventTime(a));
    const groups=new Map();entries.forEach(e=>{const key=dayKey(eventTime(e));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);});
    const today=dayKey(Date.now());
    return `<section class="timeline-section" data-testid="timeline-panel" aria-label="打卡时间轴"><div class="timeline-heading"><div><span class="section-eyebrow">LITTLE MOMENTS</span><h2>开玩时间轴<span>${state.selectedDay?'这一天':`${entries.length} 条记录`}</span></h2></div>${state.selectedDay?'<button class="all-records" data-action="calendar-all">全部记录 '+icon('arrow')+'</button>':''}</div>${state.selectedDay?`<p class="selected-date">${fullDayText(state.selectedDay)}</p>`:''}${entries.length?`<div class="timeline-groups">${[...groups].map(([key,items])=>`<section class="timeline-group"><h3 class="timeline-date"><span>${key===today?'今天':`${Number(key.slice(5,7))} 月 ${Number(key.slice(8))} 日`}</span><small>${key.slice(0,4)}${key===today?` · ${Number(key.slice(5,7))} 月 ${Number(key.slice(8))} 日`:''}</small></h3><div class="timeline-list">${items.map(e=>`<div class="timeline-row ${isCompleted(e)?'is-complete':''}"><div class="timeline-time"><time datetime="${new Date(eventTime(e)).toISOString()}">${timeText(eventTime(e))}</time><span class="timeline-dot" aria-hidden="true"></span></div><button class="timeline-card ${e.photos.length?'has-photo':'text-only'}" data-action="edit-entry" data-id="${esc(e.id)}" data-testid="journal-entry">${e.photos.length?`<span class="timeline-thumbnail"><img data-testid="journal-thumbnail" src="${esc(e.photos[0].data)}" alt="${esc(e.title)}的打卡照片" loading="lazy">${e.photos.length>1?`<span class="photo-total">${e.photos.length} 张</span>`:''}</span>`:''}<span class="timeline-copy"><span class="timeline-card-meta">${statusHTML(e)}<span>${esc(e.category)}</span></span><strong class="timeline-title">${esc(e.title)}</strong>${e.text?`<span class="timeline-text">${esc(Array.from(e.text).length>90?Array.from(e.text).slice(0,90).join('')+'…':e.text)}</span>`:`<span class="timeline-text quiet-copy">${isCompleted(e)?'给今天留了一点喜欢。':'灵感已存好，随时回来继续。'}</span>`}</span><span class="timeline-card-arrow">${icon('right')}</span></button></div>`).join('')}</div></section>`).join('')}</div>`:`<div class="timeline-empty"><span class="empty-flower">${flower()}</span><h3>${state.selectedDay?'这一天，还没有记录':'日历还空着，喜欢正在路上'}</h3><p>${state.selectedDay?'选一个其他日期，或看看全部记录。':'扭一颗灵感，完成后回来点亮今天。'}</p><button class="quiet" data-action="${state.selectedDay?'calendar-all':'home'}">${state.selectedDay?'看看全部记录':'去扭一个'} ${icon('arrow')}</button></div>`}</section>`;
  }
  function renderJournal(){return `<section class="journal-shell diary-calendar view-enter"><div class="journal-header"><div><span class="section-eyebrow">MY LITTLE DAYS</span><h1>我的日记</h1><p>把收藏，过成自己的小日子。</p></div><div class="journal-view-switch" role="group" aria-label="日记展示方式"><button data-action="journal-view" data-view="calendar" aria-label="日历和时间轴" aria-pressed="${state.journalView==='calendar'}">${icon('calendar')}</button><button data-action="journal-view" data-view="timeline" aria-label="仅看时间轴" aria-pressed="${state.journalView==='timeline'}">${icon('list')}</button></div></div>${state.storageMessage?`<div class="storage-warning">${esc(state.storageMessage)}</div>`:''}${state.journalView==='calendar'?renderCalendar():''}${renderTimeline()}<p class="local-note">日记和照片保存在当前浏览器。<br>完成体验或进入灵感记录，都会点亮这一天。</p></section>`;}
  function renderEditor(){
    const e=state.draft;
    return `<section class="editor-shell notebook-editor view-enter"><div class="page-head"><button class="back-button" data-action="diary">← 返回我的日记</button><h1>灵感记录</h1><p>今天的喜欢，写在这一页。</p></div>
      <article class="notebook-page" data-testid="notebook-page"><span class="notebook-tape" aria-hidden="true"></span><span class="notebook-holes" aria-hidden="true"></span>
        <header class="notebook-top"><div><span class="notebook-date">${fullDayText(dayKey(eventTime(e)))}</span><span class="notebook-kicker">MY LITTLE MOMENT · ${esc(e.category)}</span></div><button class="notebook-add" data-action="pick-photos" aria-label="添加照片，最多五张" ${state.uploading||state.saving||e.photos.length>=5?'disabled':''}>${icon('plus')}<span class="photo-add-copy"><strong>${state.uploading?'读入中…':e.photos.length>=5?'照片已满':'添加照片'}</strong><small>${e.photos.length}/5 · 可多选</small></span></button></header>
        <h2 class="notebook-entry-title">${esc(e.title)}</h2><p class="notebook-photo-caption"><span data-testid="photo-count">${e.photos.length}/5 张照片 · 可不填</span><span>${state.uploading?'正在读入…':'用照片留住这一刻'}</span></p>
        ${state.storageMessage?`<div class="storage-warning">${esc(state.storageMessage)}</div>`:''}
        <div class="photo-grid notebook-photos">${e.photos.map((photo,index)=>`<div class="photo-slot"><img src="${esc(photo.data)}" alt="日记照片 ${index+1}"><button class="photo-remove" data-action="remove-photo" data-index="${index}" aria-label="移除第 ${index+1} 张照片">×</button></div>`).join('')}</div><input class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple id="photo-input" data-testid="photo-input" aria-label="选择最多五张照片">
        <div class="notebook-writing"><label class="visually-hidden" for="diary-text">写下今天的感受，最多 300 字</label><textarea class="diary-text" id="diary-text" data-testid="diary-text" placeholder="今天做了什么？\n有什么想记住的小事？\n一句话，也值得留下。">${esc(e.text)}</textarea><div class="text-count ${Array.from(e.text).length>300?'over':''}" id="text-count">${Array.from(e.text).length}/300</div><p class="char-error" id="text-error" ${Array.from(e.text).length<=300?'hidden':''}>文字超过 300 字了，缩短一点再保存吧。</p></div>
        <div class="notebook-actions dual-actions"><button class="primary" data-action="save-diary" data-testid="save-diary" ${state.uploading||state.saving||Array.from(e.text).length>300?'disabled':''}>${state.saving?'正在存好…':state.uploading?'照片读入中…':'存起来'}</button><button class="primary secondary-solid" data-action="reconsider" ${state.uploading||state.saving?'disabled':''}>我再想想</button></div>
        <footer class="notebook-footer"><button class="quiet" data-action="entry-guide">回看当时的灵感 ${icon('external')}</button><button class="quiet danger" data-action="delete-entry" data-id="${esc(e.id)}">删除这页</button></footer><p class="notebook-local">已打卡，文字和照片需点「存起来」保存。<br>支持 JPG、PNG、WebP，图文可留空；仅存于当前浏览器。</p>
      </article></section>`;
  }
  function render(){
    document.body.dataset.view=state.route;
    const views={home:renderHome,config:renderConfig,result:renderResult,empty:renderEmpty,start:renderStart,diary:renderJournal,editor:renderEditor,spinning:()=>`<section class="loading-shell spinning"><span class="mode-label">灵感出蛋中</span><div class="machine-wrap">${machineSVG()}</div><h1>这颗有点期待！</h1><p>正在从演示收藏里挑一件适合现在的事。</p></section>`};
    $('#app').innerHTML=(views[state.route]||renderHome)();document.querySelectorAll('[data-nav]').forEach(el=>{const active=el.dataset.nav===(state.route==='diary'||state.route==='editor'?'diary':'home');el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    document.title=`${state.route==='diary'||state.route==='editor'?'我的日记':'下次就是现在'} · 扭一个，开玩！`;
  }
  function dirty(){if(!state.draft)return false;const old=state.entries.find(e=>e.id===state.draft.id);return !old||old.text!==state.draft.text||(old.completedAt||null)!==(state.draft.completedAt||null)||old.photos.map(p=>p.id).join('|')!==state.draft.photos.map(p=>p.id).join('|');}
  function go(route){
    state.spinToken=(state.spinToken||0)+1;state.spinning=false;
    if(state.demoSearch?.status==='loading')resetDemo();
    state.route=route;if(route!=='editor')state.draft=null;render();window.scrollTo(0,0);
  }
  function requestGo(route){
    if(state.uploading){toast('照片正在读入，等一下就好。');return;}
    if(state.saving){toast('正在保存，马上就好。');return;}
    if(state.route==='editor'&&dirty()){
      pendingNavigation=route;
      modal('这一页要先存好吗？','<p>文字或照片还没有保存。打卡已记录，离开不会取消打卡。</p>','<div class="modal-actions"><button class="quiet" data-action="close-modal">继续编辑</button><button class="quiet" data-action="leave-editor">不保存离开</button><button class="primary" data-action="save-and-leave">保存再走</button></div>');
    }else go(route);
  }
  function showSource(item){
    activeSourceItem=item;const url=sourceURL(item);
    if(item.sourceKind!=='provided-cover')return modal('原收藏 · 演示笔记',`<h3>${esc(item.sourceTitle)}</h3><p>${esc(item.intro)}</p><ol class="steps">${item.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="notice">这是旧版原创虚构笔记，已保存的日记仍可回看。</div>`);
    modal('原收藏',`<div class="source-preview"><div class="source-preview-media"><img class="full-source-image" src="${esc(item.cover)}" alt="${esc(item.sourceTitle)}的完整原始截图"></div><div class="source-preview-copy"><span class="mode-label">${esc(item.category)} / ${esc(item.subtype)}</span><h3>${esc(item.sourceTitle)}</h3><p class="source-creator">${esc(item.author)}</p><p>${esc(item.guide?.summary||item.activity)}</p>
      ${url?`<a class="primary source-external-link" data-testid="source-external-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">在小红书查看原视频 / 图文 ${icon('external')}</a>`:'<div class="source-pending">原帖链接待关联<br><small>仅凭截图无法确定原帖地址。</small></div>'}
      <label class="source-link-label" for="source-url">${url?'更新这条收藏的分享链接':'粘贴这条收藏的小红书分享链接'}</label><textarea id="source-url" class="source-url-input" rows="2" placeholder="可粘贴整段分享文案，含 xhslink.com 或 xiaohongshu.com 链接">${esc(url||'')}</textarea><p id="link-error" class="char-error" hidden></p><button class="source-bind" data-action="bind-source">${url?'更新链接':'关联原帖'}</button>
      <div class="notice">本站当前持有的是你提供的截图，没有原视频或图文全文。关联后，结果页封面直接打开小红书原帖；是否需要登录由原站决定。当前摘要仅基于封面，不冒充视频提炼。链接仅保存在当前浏览器。</div></div></div>`);
    $('#modal').dataset.kind='source';
  }
  async function begin(){
    if(state.route!=='result'||state.saving)return;
    const plan=planFor();if(!plan.ready||overBudget(plan))return;
    const item=state.item;
    const entry={id:makeId(),itemId:item.id,title:plan.title,category:item.category,minutes:plan.minutes,durationLabel:durationText(plan,item),activity:plan.kind==='demo-adapted'?plan.title:item.activity,materials:clone(plan.materials),steps:[...plan.steps],source:clone(item),adaptation:plan.kind,...(plan.kind==='demo-adapted'?{demoAlternative:clone(state.demoPlan)}:{}),createdAt:Date.now(),text:'',photos:[]};
    state.saving=true;render();
    await saveEntry(entry);state.saving=false;state.currentEntry=entry.id;
    focusCalendar();
    go('start');toast(state.storageMessage?'这次灵感已暂存在页面。':'开玩啦！灵感已存进日记。');
  }
  async function markCompleted(id,method){
    const old=state.entries.find(e=>e.id===id);if(!old)return null;
    if(isCompleted(old))return old;
    const entry=clone(old);entry.completedAt=Date.now();entry.completionMethod=method;entry.updatedAt=Date.now();await saveEntry(entry);return entry;
  }
  async function editEntry(id){
    if(state.saving||state.uploading)return;
    state.editorFrom=state.route==='start'?'start':'diary';state.saving=true;
    const entry=await markCompleted(id,'record');state.saving=false;if(!entry)return;
    state.currentEntry=id;state.draft=clone(entry);focusCalendar(eventTime(entry));state.route='editor';render();window.scrollTo(0,0);
  }
  async function completeEntry(id){
    if(state.saving||state.route!=='start')return;
    const old=state.entries.find(e=>e.id===id);if(!old||isCompleted(old))return;
    clearTimeout(toastTimer);$('#toast').classList.remove('show');
    state.saving=true;render();
    const entry=await markCompleted(id,'explicit');state.saving=false;if(!entry)return;
    focusCalendar(entry.completedAt);render();
    modal('完成了一次小体验！',`<section class="completion-celebration" data-testid="completion-celebration"><div class="completion-bloom" aria-hidden="true">${flower()}${Array.from({length:6},(_,i)=>`<span class="bloom-speck" style="--speck:${i}"></span>`).join('')}</div><span class="completion-date">${esc(dateText(entry.completedAt))} · 已点亮</span><p>不必每次都做得完美，<br>今天的这一次，也值得留下。</p>${state.storageMessage?`<p class="storage-warning">${esc(state.storageMessage)}</p>`:''}<button class="primary" data-action="completion-record" data-id="${esc(entry.id)}" data-testid="completion-record" autofocus>灵感记录 ${icon('arrow')}</button><button class="completion-later" data-action="completion-later">我再想想</button></section>`);
    $('#modal').dataset.kind='completion';
  }
  async function saveDraft(destination='diary'){
    if(!state.draft||state.uploading||state.saving)return;
    if(Array.from(state.draft.text).length>300){toast('文字最多 300 字，缩短一点再存吧。');return;}
    state.saving=true;const button=$('[data-testid="save-diary"]');if(button){button.disabled=true;button.textContent='正在存好…';}
    const entry=clone(state.draft),old=state.entries.find(e=>e.id===entry.id);
    const completionChanged=(old?.completedAt||null)!==(entry.completedAt||null);
    entry.updatedAt=Date.now();await saveEntry(entry);state.saving=false;
    if(completionChanged)focusCalendar(eventTime(entry),true);
    closeModal();go(destination);toast(state.storageMessage?'已暂存于页面，暂未持久保存。':completionChanged&&isCompleted(entry)?'存好啦！给今天开了一朵灵感花。':'存好啦！');
  }
  async function photoData(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片。');
    if(file.size>20*1024*1024)throw new Error('这张图片太大了，先选一张 20 MB 以内的图片吧。');
    const url=URL.createObjectURL(file);const image=new Image();
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('图片没有读成功，换一张试试。'));image.src=url;});const ratio=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return {id:makeId(),data:canvas.toDataURL('image/webp',.85),name:file.name};}finally{URL.revokeObjectURL(url);}
  }
  async function addPhotos(files){
    if(!state.draft||state.uploading)return;
    const draft=state.draft;const remaining=5-draft.photos.length;if(remaining<=0){toast('最多 5 张照片，可以先移除一张。');return;}
    const chosen=Array.from(files).slice(0,remaining);if(!chosen.length)return;
    const clipped=files.length>remaining;state.uploading=true;render();let added=0,error='';
    for(const file of chosen){try{draft.photos.push(await photoData(file));added++;}catch(e){error=e.message;}}
    state.uploading=false;if(state.route==='editor'&&state.draft===draft)render();
    toast(error||`${clipped?'最多 5 张，':''}已添 ${added} 张，记得点「存起来」。`);
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    const action=button.dataset.action;
    try{
      if(action==='home')return requestGo('home');
      if(action==='diary'){if(!['diary','editor'].includes(state.route))focusCalendar();return requestGo('diary');}
      if(action==='journal-view'&&state.route==='diary'){state.journalView=button.dataset.view;state.selectedDay=null;render();$(`[data-action="journal-view"][data-view="${state.journalView}"]`)?.focus({preventScroll:true});return;}
      if(action==='calendar-month'&&state.route==='diary'){
        const date=new Date(Date.UTC(state.calendarYear,state.calendarMonth+Number(button.dataset.delta),1));
        state.calendarYear=date.getUTCFullYear();state.calendarMonth=date.getUTCMonth();state.selectedDay=null;render();
        $(`[data-action="calendar-month"][data-delta="${button.dataset.delta}"]`)?.focus({preventScroll:true});return;
      }
      if(action==='calendar-today'&&state.route==='diary'){focusCalendar(Date.now(),true);render();$('[data-action="calendar-today"]')?.focus({preventScroll:true});return;}
      if(action==='calendar-day'&&state.route==='diary'){state.selectedDay=state.selectedDay===button.dataset.day?null:button.dataset.day;render();$(`[data-day="${button.dataset.day}"]`)?.focus({preventScroll:true});return;}
      if(action==='calendar-all'&&state.route==='diary'){state.selectedDay=null;render();return;}
      if(action==='target'){state.filters={mode:'target',minutes:30,category:null,custom:''};return go('config');}
      if(action==='random'){state.filters={mode:'random',minutes:30,category:null,custom:''};return spin();}
      if(action==='time'||action==='category'){
        if(action==='time')state.filters.minutes=Number(button.dataset.value);
        if(action==='category')state.filters.category=button.dataset.value;
        render();
        if(action==='category'&&state.filters.category==='自填项')$('#custom-goal')?.focus();
        else $(`[data-action="${action}"][data-value="${CSS.escape(button.dataset.value)}"]`)?.focus({preventScroll:true});
        return;
      }
      if(action==='draw'){const f=state.filters;if(f.mode==='target'&&(!f.category||(f.category==='自填项'&&!f.custom.trim())))return;return spin();}
      if(action==='again')return spin();
      if(action==='restart-round')return spin(true);
      if(action==='adjust-conditions')return go('config');
      if(action==='demo-search')return await searchDemoAlternatives();
      if(action==='demo-view'){
        const post=state.demoSearch?.key===materialKey()?state.demoSearch.results.find(x=>x.id===button.dataset.id):null;
        if(post)return showDemoPost(post);return;
      }
      if(action==='accept-demo-plan'){
        if(!$('#demo-material-ready')?.checked||activeDemoPost?.readOnly)return;
        const search=state.demoSearch,post=search?.results.find(x=>x.id===button.dataset.id);
        if(!post||search.key!==materialKey()||activeDemoPost.key!==materialKey()||state.route!=='result'){toast('材料已变化，请重新查找演示方案。');return;}
        state.demoPlan={...clone(post),key:materialKey()};closeModal();render();$('[data-testid="result-title"]')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});toast('已采用演示新方法，清单和时长已更新。');return;
      }
      if(action==='demo-clear-choice'){state.demoPlan=null;render();return;}
      if(action==='entry-demo-post'){const e=state.entries.find(x=>x.id===button.dataset.id);if(e?.demoAlternative)return showDemoPost(e.demoAlternative,true);return;}
      if(action==='alternate-yes'||action==='alternate-no'){state.alternate=action==='alternate-yes';render();return;}
      if(action==='reset-materials'){state.missing.clear();state.alternate=null;resetDemo();render();return;}
      if(action==='extend-time'){const p=planFor();state.filters.minutes=[15,30,90].find(v=>v>=p.minutes)||p.minutes;render();toast(`已改为 ${state.filters.minutes} 分钟。`);return;}
      if(action==='start')return await begin();
      if(action==='complete-entry'&&state.route==='start')return await completeEntry(button.dataset.id);
      if(action==='completion-record'){const id=button.dataset.id;closeModal();return await editEntry(id);}
      if(action==='completion-later'){closeModal();return go('start');}
      if(action==='edit-entry')return await editEntry(button.dataset.id);
      if(action==='reconsider')return requestGo(state.editorFrom);
      if(action==='source')return showSource(state.item);
      if(action==='source-entry'){const e=state.entries.find(x=>x.id===button.dataset.id);if(e)return showSource(e.source);return;}
      if(action==='entry-guide'){const e=state.draft,g=guideFor(e);return modal('当时选定的灵感',`<h3>${esc(e.title)}</h3><p>${esc(g.summary)}</p><p>${esc(e.durationLabel || `约 ${e.minutes} 分钟`)} · 准备：${esc(e.materials.map(m=>m.label).join('、'))||'不用额外材料'}</p><ol class="steps">${g.steps.map(s=>`<li><strong>${esc(s.title)}</strong>：${esc(s.body)}</li>`).join('')}</ol><p class="notice">${esc(g.notice)}</p><button class="quiet" data-action="source-entry" data-id="${esc(e.id)}">查看原收藏 ↗</button>`);}
      if(action==='bind-source'){
        if(!activeSourceItem)return;const url=validSourceURL($('#source-url')?.value);
        if(!url){$('#link-error').hidden=false;$('#link-error').textContent='请使用这条收藏的 xhslink.com 或 xiaohongshu.com 分享链接。';return;}
        state.sourceLinks[activeSourceItem.id]=url;let saved=true;try{localStorage.setItem('next-now-source-links',JSON.stringify(state.sourceLinks));}catch{saved=false;}
        const item=activeSourceItem;render();showSource(item);toast(saved?'已关联。点击结果封面即可进入原帖。':'链接已关联到本页；浏览器未能持久保存。');return;
      }
      if(action==='pick-photos')return $('#photo-input')?.click();
      if(action==='remove-photo'){if(state.uploading)return;state.draft.photos.splice(Number(button.dataset.index),1);render();return;}
      if(action==='save-diary')return await saveDraft();
      if(action==='delete-entry'){const id=button.dataset.id;return modal('删除这篇记录？','<p>这篇日记的照片和文字也会一起移除。</p>',`<div class="modal-actions"><button class="quiet" data-action="close-modal">先留着</button><button class="primary" data-action="confirm-delete" data-id="${id}">删除这篇</button></div>`);}
      if(action==='confirm-delete'){await removeStored(button.dataset.id);state.entries=state.entries.filter(x=>x.id!==button.dataset.id);closeModal();go('diary');toast('已删除这篇本地记录，无法撤销。');return;}
      if(action==='close-modal')return closeModal();
      if(action==='leave-editor'){closeModal();return go(pendingNavigation||'diary');}
      if(action==='save-and-leave')return await saveDraft(pendingNavigation||'diary');
      if(action==='about')return modal('这颗 Demo，怎么玩？',`<p><strong>我有目标：</strong>选择时间和方向；自填项会搜索这批素材的标题和标签。</p><p><strong>随机灵感：</strong>直接扭一颗，默认 30 分钟以内，点击实际时长可调整时间。</p><p>手工、美食核对准备清单；其他类别直接开始。点击「体验已完成！」或进入「灵感记录」会打卡；最多 5 张图片、300 字文字，均可留空。文字和照片需要点「存起来」保存。</p><p><strong>我的日记：</strong>默认月历，下方时间轴。日期按北京时间计算，有打卡照片才显示用户照片。原有日记保留。</p><div class="notice">当前使用你提供的 ${DATA.length} 张收藏截图，没有读取真实账号的收藏列表。点击封面可关联小红书分享链接，关联后直接打开原帖；链接是否需要登录由原站决定。原视频或图文全文尚未接入，当前 AI 整理是基于封面的摘要和准备建议，不是视频提炼。时长为体验估算，材料调整为预置示例，没有实时大模型调用。<br><br>日记、照片和关联链接仅保存在当前浏览器，没有云端同步。</div>`);
    }catch(error){console.error(error);toast('这次操作没有成功，当前内容仍保留，请再试一次。');state.saving=false;}
  });
  document.addEventListener('change',event=>{
    const element=event.target;
    if(element.matches('[data-material]')){if(element.checked)state.missing.delete(element.dataset.material);else state.missing.add(element.dataset.material);state.alternate=null;resetDemo();const id=element.dataset.material;render();$(`[data-material="${CSS.escape(id)}"]`)?.focus({preventScroll:true});}
    if(element.id==='demo-material-ready'){$('[data-testid="accept-demo-plan"]').disabled=!element.checked;}
    if(element.id==='photo-input')addPhotos(element.files);
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='custom-goal'){state.filters.custom=event.target.value;const b=$('[data-testid="draw-button"]');if(b)b.disabled=!state.filters.custom.trim();}
    if(event.target.id==='diary-text'&&state.draft){state.draft.text=event.target.value;const count=Array.from(state.draft.text).length;$('#text-count').textContent=`${count}/300`;$('#text-count').classList.toggle('over',count>300);$('#text-error').hidden=count<=300;$('[data-testid="save-diary"]').disabled=count>300||state.uploading||state.saving;}
  });
  window.addEventListener('beforeunload',event=>{if(dirty()||state.uploading){event.preventDefault();event.returnValue='';}});
  async function boot(){try{const links=JSON.parse(localStorage.getItem('next-now-source-links')||'{}');if(links&&typeof links==='object'&&!Array.isArray(links))state.sourceLinks=links;}catch{}try{db=await openDB();state.entries=(await readEntries()).sort((a,b)=>b.createdAt-a.createdAt);}catch{state.storageMessage='当前浏览器无法持久保存；记录将暂存于页面，刷新可能丢失。';}render();}
  render();boot();
})();
