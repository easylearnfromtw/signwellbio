
(()=>{"use strict";
const page=(document.body.dataset.page||"home");
const entries=[["home","首頁","index.html","home"],["topics","主題","topics.html","grid"],["about","關於","about.html","user"],["share","分享","share.html","share"],["newsletter","電子報","newsletter.html","mail"]];
const paths={
home:'<path d="m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7"/>',
grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.4-4.2 3.3-6.4 7.5-6.4s7.1 2.2 7.5 6.4"/>',
share:'<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="5.5" r="2.4"/><circle cx="18" cy="18.5" r="2.4"/><path d="m8.2 11 7.6-4M8.2 13l7.6 4"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
close:'<path d="M5 5 19 19M19 5 5 19"/>'
};
const icon=n=>'<svg class="sw-line-icon" viewBox="0 0 24 24" aria-hidden="true">'+paths[n]+'</svg>';
const here=page==="article"||page==="privacy"||page==="terms"||page==="search"||page==="profile"?"topics":page;
const mainRoot=document.querySelector("#publicScreen")||document.body;
const nav=document.createElement("nav");nav.className="sw-ios-dock";nav.id="swIosDock";nav.setAttribute("aria-label","iOS 滑桿主要導覽");nav.innerHTML='<div class="dock-thumb" aria-hidden="true"></div>'+entries.map(([k,label,href,ii])=>'<a href="'+href+'" data-dock="'+k+'"'+(here===k?' aria-current="page"':'')+'>'+icon(ii)+'<span>'+label+'</span></a>').join('');
document.body.appendChild(nav);
const links=[...nav.querySelectorAll("a")],thumb=nav.querySelector(".dock-thumb");let active=Math.max(0,entries.findIndex(x=>x[0]===here)), preview=active,started=null,dragged=false,ignoreClick=false;
function updateThumb(i,instant=false){let x=links[i];if(!x)return;const n=nav.getBoundingClientRect(),r=x.getBoundingClientRect(),scale=n.width/nav.offsetWidth||1;const left=(r.left-n.left)/scale;thumb.style.setProperty("--dock-x",left+"px");thumb.style.width=(r.width/scale)+"px";links.forEach((a,j)=>a.classList.toggle("is-preview",j===i&&j!==active));if(instant){thumb.style.transition="none";requestAnimationFrame(()=>thumb.style.removeProperty("transition"));}}
function pointerIndex(clientX){const rect=nav.getBoundingClientRect();const dx=(clientX-rect.left)/rect.width;return Math.max(0,Math.min(links.length-1,Math.floor(dx*links.length)));}
function finish(e){if(!started)return;const wasDragged=dragged;started=null;nav.classList.remove("is-dragging");if(wasDragged){ignoreClick=true;let u=links[preview].getAttribute("href");if(u)location.assign(u);}else updateThumb(active);}
nav.addEventListener("pointerdown",e=>{if(e.button!==0&&e.pointerType==="mouse")return;started={id:e.pointerId,x:e.clientX};dragged=false;preview=active;},{passive:true});
nav.addEventListener("pointermove",e=>{if(!started||started.id!==e.pointerId)return;if(!dragged&&Math.abs(e.clientX-started.x)>9){dragged=true;try{nav.setPointerCapture(e.pointerId)}catch(_){}}if(dragged){nav.classList.add("is-dragging");preview=pointerIndex(e.clientX);updateThumb(preview);}});
nav.addEventListener("pointerup",finish);nav.addEventListener("pointercancel",()=>{started=null;dragged=false;nav.classList.remove("is-dragging");updateThumb(active)});
nav.addEventListener("click",e=>{if(ignoreClick){e.preventDefault();ignoreClick=false;}});
nav.addEventListener("keydown",e=>{const a=entries.findIndex(x=>x[0]===here);if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const i=(a+(e.key==="ArrowRight"?1:-1)+entries.length)%entries.length;location.href=entries[i][2];}});
window.addEventListener("resize",()=>updateThumb(active,true),{passive:true});
if(document.fonts?.ready)document.fonts.ready.then(()=>updateThumb(active,true));updateThumb(active,true);
let previousY=scrollY,acc=0;
addEventListener("scroll",()=>{const dy=scrollY-previousY;previousY=scrollY;if(scrollY<80||dy<-8){nav.classList.remove("is-compact");acc=0}else if(dy>0){acc+=dy;if(acc>55)nav.classList.add("is-compact")}updateThumb(active,true);},{passive:true});
const container=document.querySelector("#publicScreen .p-header")||document.querySelector(".sw-header-actions");
if(container){const btn=document.createElement("button");btn.className="sw-search-trigger";btn.type="button";btn.setAttribute("aria-label","搜尋文章");btn.innerHTML=icon("search")+'<span>搜尋</span>';container.appendChild(btn);btn.addEventListener("click",openSearch);}
const modal=document.createElement("div");modal.className="sw-modal";modal.hidden=true;modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","搜尋文章");modal.innerHTML='<div class="sw-modal-card"><div class="sw-modal-head"><h2>搜尋 SIGNWELL</h2><button type="button" id="swSearchClose" aria-label="關閉">'+icon("close")+'</button></div><input id="swSearchInput" type="search" autocomplete="off" placeholder="搜尋文章、主題與關鍵字"><div class="sw-results" id="swSearchResults"></div><p class="sw-hint">搜尋結果為測試示意內容，不會查詢正式資料庫。</p></div>';document.body.appendChild(modal);
const storyItems=[
 ["health","當健康不再只是治療，醫療的價值會如何改變？","醫療產業"],
 ["aging","醫療之外，什麼才是長期健康的關鍵？","長壽與預防"],
 ["aesthetic","男性外觀管理，不只是美容這麼簡單。","男性美學"],
 ["ai","AI 讓醫學知識更便宜，誰會真正受益？","醫療產業"],
 ["natural","對「自然」的追求，為什麼反而需要更多克制？","男性美學"],
 ["longevity","健康老化，不等於永遠年輕。","長壽與預防"],
 ["thinking","當答案太容易取得。","醫學思辨"]];
window.SW_TEST_STORIES=storyItems;
const field=modal.querySelector("input"),results=modal.querySelector(".sw-results"),close=modal.querySelector("#swSearchClose"),safe=t=>t.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function drawResults(){const q=field.value.trim().toLocaleLowerCase();const all=storyItems.filter(x=>!q||(x[1]+x[2]).toLocaleLowerCase().includes(q));results.innerHTML=all.map(x=>'<a class="sw-result" href="article.html?story='+encodeURIComponent(x[0])+'"><strong>'+safe(x[1])+'</strong><small>'+safe(x[2])+' / EDITORIAL SAMPLE</small></a>').join("")||'<p class="sw-hint">沒有符合的示範文章。</p>';}
function openSearch(){modal.hidden=false;document.body.classList.add("has-modal");drawResults();field.focus();}
function closeSearch(){modal.hidden=true;document.body.classList.remove("has-modal");}
field.addEventListener("input",drawResults);close.addEventListener("click",closeSearch);modal.addEventListener("pointerdown",e=>{if(e.target===modal)closeSearch()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)closeSearch();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();modal.hidden?openSearch():closeSearch()}});
document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{const f=btn.dataset.filter;document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));let n=0;document.querySelectorAll("[data-category]").forEach(card=>{let ok=f==="all"||card.dataset.category===f;card.hidden=!ok;if(ok)n++;});const count=document.querySelector("#topicCount");if(count)count.textContent=n+" 則示範內容";}));
document.querySelectorAll("[data-copy-link]").forEach(btn=>btn.addEventListener("click",async()=>{let url=btn.dataset.copyLink||"https://easylearnfromtw.github.io/signwellbio/test/";try{await navigator.clipboard.writeText(url);toast("已複製分享連結");}catch(_){toast("無法自動複製，請長按網址複製");}}));
document.querySelectorAll("[data-native-share]").forEach(btn=>btn.addEventListener("click",async()=>{if(navigator.share){try{await navigator.share({title:"SIGNWELL 欣緯生醫",url:"https://easylearnfromtw.github.io/signwellbio/test/"});}catch(_){}}else toast("此瀏覽器沒有系統分享選單，請使用複製連結");}));
document.querySelectorAll(".sw-newsletter-form").forEach(form=>form.addEventListener("submit",e=>{e.preventDefault();toast("此為設計測試版，未發送或儲存訂閱資訊");form.reset();}));
const article=document.querySelector("#swArticle");if(article){const id=new URLSearchParams(location.search).get("story")||"health";const current=storyItems.find(x=>x[0]===id)||storyItems[0];article.querySelector("[data-article-title]").textContent=current[1];article.querySelector("[data-article-topic]").textContent=current[2]+" / EDITORIAL";document.title=current[1]+"｜SIGNWELL 欣緯生醫";const type=document.querySelector("#swTypeControl");type?.addEventListener("click",()=>{article.classList.toggle("is-large");type.setAttribute("aria-pressed",String(article.classList.contains("is-large")))});const progress=document.querySelector(".sw-reading-progress");addEventListener("scroll",()=>{let max=Math.max(1,document.documentElement.scrollHeight-innerHeight);progress.style.width=Math.max(0,Math.min(100,(scrollY/max)*100))+"%";},{passive:true});}
function toast(msg){let old=document.querySelector(".sw-toast");old?.remove();const t=document.createElement("div");t.className="sw-toast";t.role="status";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3400);}
})();
