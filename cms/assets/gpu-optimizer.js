/* SIGN WELL R10.2 · GPU / compositor governor */
(()=>{
  'use strict';
  const root=document.documentElement;
  const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const mem=Number(navigator.deviceMemory||8);
  const cores=Number(navigator.hardwareConcurrency||8);
  const dpr=Math.max(1,Number(window.devicePixelRatio||1));
  const saveData=!!(conn&&conn.saveData);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse=matchMedia('(pointer: coarse)').matches;
  const narrow=matchMedia('(max-width: 900px)').matches;
  const isiOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

  let profile='high';
  if(reduced||saveData||mem<=4||cores<=4) profile='lite';
  else if(coarse||narrow||isiOS||dpr>=2.5||mem<=6||cores<=6) profile='balanced';
  root.classList.remove('sw-gpu-high','sw-gpu-balanced','sw-gpu-lite');
  root.classList.add('sw-gpu-'+profile);
  root.dataset.swGpuProfile=profile;

  const syncVisibility=()=>{
    root.classList.toggle('sw-page-hidden',document.hidden);
    document.body?.classList.toggle('sw-page-hidden',document.hidden);
  };
  document.addEventListener('visibilitychange',syncVisibility,{passive:true});
  syncVisibility();

  /* Escalate once when the first seconds contain sustained long tasks. This is
     deliberately one-way for the current page load to avoid visual oscillation. */
  if(profile!=='lite'&&'PerformanceObserver' in window&&PerformanceObserver.supportedEntryTypes?.includes('longtask')){
    try{
      let score=0,done=false;
      const po=new PerformanceObserver(list=>{
        if(done)return;
        for(const e of list.getEntries()) if(e.duration>=70) score+=e.duration;
        if(score>=520){
          done=true;
          root.classList.remove('sw-gpu-high','sw-gpu-balanced');
          root.classList.add('sw-gpu-lite','sw-lowfx');
          root.dataset.swGpuProfile='lite-runtime';
          document.body?.classList.add('perf-lite');
          po.disconnect();
        }
      });
      po.observe({type:'longtask',buffered:true});
      setTimeout(()=>{done=true;po.disconnect()},8000);
    }catch(_){ }
  }
})();
