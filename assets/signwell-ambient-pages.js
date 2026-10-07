/* SIGN WELL R10.2 · cubic ambient background, GPU-governed */
(function(){
  const mm=q=>window.matchMedia&&window.matchMedia(q).matches;
  const prefersReduced=mm('(prefers-reduced-motion: reduce)');
  const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const mem=Number(navigator.deviceMemory||8),cores=Number(navigator.hardwareConcurrency||8);
  const lite=prefersReduced||!!(conn&&conn.saveData)||mem<=4||cores<=4;
  const balanced=!lite&&(mm('(pointer: coarse)')||mm('(max-width: 900px)')||(window.devicePixelRatio||1)>=2.5||mem<=6||cores<=6);
  const interval=balanced?90:50; // ~11 fps touch/high-DPR, ~20 fps desktop; motion is intentionally very slow.
  function cubicBlend(u,a,b){return a*u*u*u+b*u}
  function wave(t,duration){const phase=(t%duration)/duration;return phase*2-1}
  function createAmbient(){
    const body=document.body;if(!body)return;
    const page=(body.dataset.page||'').trim();if(page==='home'||body.querySelector('.sw-ambient-pages'))return;
    body.classList.add('sw-ambient-enabled');
    const layer=document.createElement('div');layer.className='sw-ambient-pages';layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<i class="blob blue"></i><i class="blob pink"></i><i class="blob glow"></i>';body.insertBefore(layer,body.firstChild);
    if(lite)return; // static gradients remain; no continuous wake-ups.
    let raf=0,timer=0;
    const schedule=()=>{if(document.hidden||raf||timer)return;timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(tick)},interval)};
    const tick=now=>{
      raf=0;const t=now/1000,u1=wave(t,34),u2=wave(t+5.4,42),u3=wave(t+10.2,48),root=document.documentElement;
      root.style.setProperty('--sw-blue-x',cubicBlend(u1,-6.2,18.5).toFixed(3));
      root.style.setProperty('--sw-blue-y',cubicBlend(u1,7.5,-2.8).toFixed(3));
      root.style.setProperty('--sw-blue-s',(1+.045*u1*u1*u1).toFixed(4));
      root.style.setProperty('--sw-pink-x',cubicBlend(u2,5.4,-16.4).toFixed(3));
      root.style.setProperty('--sw-pink-y',cubicBlend(u2,-6.0,3.3).toFixed(3));
      root.style.setProperty('--sw-pink-s',(1-.038*u2*u2*u2).toFixed(4));
      root.style.setProperty('--sw-glow-x',cubicBlend(u3,2.6,9.4).toFixed(3));
      root.style.setProperty('--sw-glow-y',cubicBlend(u3,-3.4,4.4).toFixed(3));
      root.style.setProperty('--sw-glow-s',(1+.028*u3*u3*u3).toFixed(4));
      root.style.setProperty('--sw-light-x',cubicBlend(u2,1.4,4.2).toFixed(3));
      root.style.setProperty('--sw-light-y',cubicBlend(u1,-.8,1.8).toFixed(3));
      schedule();
    };
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(raf)cancelAnimationFrame(raf);if(timer)clearTimeout(timer);raf=timer=0}
      else schedule();
    },{passive:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createAmbient,{once:true});else createAmbient();
})();
