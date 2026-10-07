(()=>{'use strict';
  const cfg=window.SIGNWELL_PROFILE||{};
  const $=(s)=>document.querySelector(s);
  const state={profile:null};
  function api(path,opts={}){
    if(!cfg.enabled||!cfg.apiBase) return Promise.reject(new Error('Subscriber 360 尚未啟用'));
    return fetch(cfg.apiBase.replace(/\/$/,'')+path,{...opts,credentials:'include',headers:{'content-type':'application/json',...(opts.headers||{})}}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j});
  }
  function connect(p){ if(!cfg.enabled)return; location.href=cfg.apiBase.replace(/\/$/,'')+`/oauth/${encodeURIComponent(p)}/start`; }
  function renderTopics(v){const box=$('#sw360Topics');if(!box)return;const rows=Object.entries(v||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0)).slice(0,12);box.innerHTML=rows.length?rows.map(([t,x])=>`<div class="sw360-topic"><strong>${escapeHtml(t)}</strong><span>${Math.round((x.score||0)*100)}%</span><div class="sw360-bar"><i style="width:${Math.round((x.score||0)*100)}%"></i></div></div>`).join(''):'<small>尚未建立足夠的個人化訊號。</small>';}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function init(){
    document.querySelectorAll('[data-sw360-connect]').forEach(b=>{const p=b.dataset.sw360Connect;b.disabled=!cfg.enabled;b.onclick=()=>connect(p)});
    const st=$('#sw360Status');
    if(!cfg.enabled){if(st)st.textContent='此版本已包含 Subscriber 360 程式，但正式環境尚未啟用 API。';return;}
    try{state.profile=await api('/api/profile');renderTopics(state.profile?.interest?.vector);if(st)st.textContent='已載入你的授權連結與個人化資料。';}
    catch(e){if(st)st.textContent=e.message||'無法載入個人化資料';}
    $('#sw360Rebuild')?.addEventListener('click',async()=>{try{const r=await api('/api/profile/rebuild',{method:'POST',body:'{}'});const v=Object.fromEntries((r.topics||[]).map(x=>[x.topic,x]));renderTopics(v)}catch(e){if(st)st.textContent=e.message}});
  }
  addEventListener('DOMContentLoaded',init);
})();
