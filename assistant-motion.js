/* 首页演出仅使用本地精灵图；不读取梦境正文，不发起 AI 请求。 */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup=()=>{}, paused=false, elapsed=0;
  function pose(ms){
    const t=ms%28000;
    if(t<2000)return {frame:8,x:0};
    if(t<6000)return {frame:Math.floor((t-2000)/240)%4,x:(t-2000)/4000*58};
    if(t<7800)return {frame:9,x:58};
    if(t<11000)return {frame:4+Math.min(3,Math.floor((t-7800)/800)),x:58,doodle:t>9400?1:0};
    if(t<15500)return {frame:Math.floor((t-11000)/240)%4,x:58-(t-11000)/4500*112,flip:true,doodle:1};
    if(t<19000)return {frame:10,x:-54,doodle:2};
    if(t<22000)return {frame:11,x:-54,doodle:2};
    if(t<26000)return {frame:Math.floor((t-22000)/240)%4,x:-54+(t-22000)/4000*54,doodle:2};
    return {frame:8,x:0,doodle:2};
  }
  function mount(){
    // render 会替换 DOM，每次先释放旧计时器与监听，避免重复播放。
    cleanup();
    const root=document.querySelector('.assistant-stage');
    if(!root)return;
    const actor=root.querySelector('.assistant-actor'),button=root.querySelector('.assistant-pause');
    if(!actor||!button)return;
    let alive=true,loaded=false,visible=true,last=performance.now();
    function paint(){
      const state=pose(reduced.matches?0:elapsed);
      actor.style.backgroundPosition=`${-(state.frame%4)*140}px ${-Math.floor(state.frame/4)*220}px`;
      // 独立 translate 先于 scale 应用，镜像只翻人物，不反转移动坐标。
      // 不混用 scale 属性与 transform:translateX，否则向左转身时位移也会镜像。
      actor.style.translate=`${state.x}px 0`;
      actor.style.scale=state.flip?'-1 1':'1 1';
      root.dataset.doodles=loaded&&!reduced.matches?String(state.doodle||0):'0';
      root.dataset.motionPaused=String(paused||reduced.matches||!visible||document.hidden);
      const label=I18n.t(reduced.matches?'Reduced motion is on':paused?'Play animation':'Pause animation');
      button.setAttribute('aria-label',label);button.title=label;
      button.setAttribute('aria-pressed',String(paused||reduced.matches));
      button.disabled=reduced.matches;
      button.textContent=paused||reduced.matches?'▷':'Ⅱ';
    }
    function tick(){
      const now=performance.now();
      // 隐藏标签页、滚出首页、暂停时不累计时间，回来不突然跳帧。
      if(loaded&&!paused&&!reduced.matches&&visible&&!document.hidden)elapsed+=Math.min(now-last,250);
      last=now;paint();
    }
    const image=new Image();
    image.onload=()=>{if(alive){loaded=true;root.classList.add('motion-ready');paint();}};
    image.src='assets/assistant-motion-v1.png';
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=performance.now();paint();});
    observer.observe(root);
    const toggle=()=>{paused=!paused;paint();};
    button.addEventListener('click',toggle);
    const sync=()=>{last=performance.now();paint();};
    reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    const timer=setInterval(tick,100);paint();
    cleanup=()=>{alive=false;clearInterval(timer);observer.disconnect();button.removeEventListener('click',toggle);reduced.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);};
  }
  globalThis.DreamAssistant={mount};
})();
