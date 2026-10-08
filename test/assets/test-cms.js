(()=>{"use strict";
const schema=window.SWBIO_TEST_CMS;
if(!schema){document.body.textContent="無法載入測試 CMS 設定。請重新整理。";return}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const tabs=["overview","home","content","preview","settings"];
const labels=["總覽","首頁","內容","預覽","設定"];
const loaded=schema.load();
const draft={...(loaded?.values||schema.defaults)};
let savedAt=loaded?.updatedAt||"",dirty=false,selectedTab="overview",frameMode="desktop",messageTimeout=0;
const n=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const url=()=>new URL("../index.html?preview=1",location.href).href;
function setDirty(next){dirty=next;const status=$("#draftStatus");status.classList.toggle("dirty",dirty);status.classList.toggle("saved",!dirty&&!!savedAt);status.textContent=dirty?"尚未儲存":savedAt?"已儲存":"尚無草稿"}
function message(s){const el=$("#toast");el.textContent=s;el.hidden=false;clearTimeout(messageTimeout);messageTimeout=setTimeout(()=>el.hidden=true,3400)}
function updateCover(){
 $$("[data-cover-lead]").forEach(x=>x.textContent=draft.introLead);
 $$("[data-cover-accent]").forEach(x=>x.textContent=draft.introAccent);
 $$("[data-cover-description]").forEach(x=>x.textContent=draft.introDescription)
}
function field(def){
 const wrap=n("div","field"+(def.max>58?" wide":""));
 const label=n("label",null,def.label);const counter=n("small",null,draft[def.key].length+" / "+def.max);
 label.htmlFor="f-"+def.key;label.appendChild(counter);
 const el=n(def.max>58?"textarea":"input");el.id="f-"+def.key;el.dataset.field=def.key;el.maxLength=def.max;el.value=draft[def.key];if(el.tagName==="INPUT")el.type="text";
 el.addEventListener("input",()=>{draft[def.key]=el.value;counter.textContent=el.value.length+" / "+def.max;setDirty(true);updateCover()});
 wrap.append(label,el);return wrap
}
schema.fields.forEach(x=>{const target=$("#fields-"+x.section);if(target)target.appendChild(field(x))});
const picks=[["leadStory","首頁焦點文章"],["featuredStory1","精選文章 01"],["featuredStory2","精選文章 02"],["featuredStory3","精選文章 03"]];
picks.forEach(([key,name])=>{
 const wrap=n("div","field"),label=n("label",null,name),sel=n("select");
 sel.id="f-"+key;sel.dataset.field=key;label.htmlFor=sel.id;
 schema.stories.forEach(a=>{const opt=n("option",null,a.topic+" / "+a.title);opt.value=a.id;sel.appendChild(opt)});
 sel.value=draft[key];sel.addEventListener("change",()=>{draft[key]=sel.value;setDirty(true)});
 wrap.append(label,sel);$("#fields-stories").appendChild(wrap)
});
function restoreFields(){
 Object.entries(draft).forEach(([key,val])=>{const el=$('[data-field="'+key+'"]');if(!el)return;el.value=val;const c=el.parentElement.querySelector("label small");if(c)c.textContent=val.length+" / "+el.maxLength});
 updateCover()
}
function save(){
 try{const out=schema.save(draft);savedAt=out.updatedAt;Object.assign(draft,out.values);restoreFields();setDirty(false);$("#savedTime").textContent=new Date(savedAt).toLocaleString("zh-TW",{hour12:false});message("草稿已儲存在此瀏覽器");if(selectedTab==="preview")loadFrame();return true}
 catch(e){message("儲存失敗：瀏覽器可能限制了本機儲存");return false}
}
const desktop=$("#desktopTabs"),mobile=$("#mobileTabs");const tabButtons=[];
[desktop,mobile].forEach(group=>tabs.forEach((tab,i)=>{const btn=n("button");btn.type="button";btn.dataset.tab=tab;btn.setAttribute("aria-selected",String(i===0));btn.innerHTML="<em>"+String(i+1).padStart(2,"0")+"</em><span>"+labels[i]+"</span>";group.appendChild(btn);tabButtons.push(btn);btn.addEventListener("click",()=>chooseTab(tab))}));
function alignSlider(i){mobile.style.setProperty("--tab-x",((mobile.clientWidth-10)/5*i)+"px")}
function chooseTab(tab,fromSwipe=false){
 if(!tabs.includes(tab))return;
 if(selectedTab==="preview"&&tab!=="preview")$("#iframeSlot").replaceChildren();
 selectedTab=tab;
 tabButtons.forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===tab)));
 $$("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==tab);
 $("#crumbCurrent").textContent=labels[tabs.indexOf(tab)];
 if(tab==="preview")loadFrame();
 alignSlider(tabs.indexOf(tab));history.replaceState(null,"",location.pathname+"#"+tab);
 if(!fromSwipe)scrollTo({top:0,behavior:"instant"})
}
let touchStart=null,touchIndex=null,swiped=false;
mobile.addEventListener("pointerdown",e=>{touchStart={id:e.pointerId,x:e.clientX,y:e.clientY};touchIndex=null;swiped=false});
mobile.addEventListener("pointermove",e=>{
 if(!touchStart||touchStart.id!==e.pointerId)return;
 const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;
 if(!swiped&&(Math.abs(dx)<12||Math.abs(dx)<=Math.abs(dy)*1.2))return;
 if(!swiped){swiped=true;mobile.classList.add("dragging");try{mobile.setPointerCapture(e.pointerId)}catch(_){}}
 touchIndex=Math.min(4,Math.max(0,Math.floor((e.clientX-mobile.getBoundingClientRect().left)/mobile.getBoundingClientRect().width*5)));
 alignSlider(touchIndex)
});
mobile.addEventListener("pointerup",()=>{
 mobile.classList.remove("dragging");
 if(swiped&&touchIndex!==null)chooseTab(tabs[touchIndex],true);
 touchStart=null;touchIndex=null;
});
mobile.addEventListener("pointercancel",()=>{touchStart=null;swiped=false;mobile.classList.remove("dragging");alignSlider(tabs.indexOf(selectedTab))});
addEventListener("resize",()=>alignSlider(tabs.indexOf(selectedTab)),{passive:true});
function loadFrame(){
 if(selectedTab!=="preview")return;
 const slot=$("#iframeSlot");slot.replaceChildren();
 const frame=n("iframe");frame.src=url();frame.title="欣緯生醫本機首頁預覽";frame.loading="lazy";slot.appendChild(frame);
 $("#previewShell").classList.toggle("mobile",frameMode==="mobile")
}
$("#saveBtn").addEventListener("click",save);
const openPreview=()=>{if(dirty&&!save())return;window.open(url(),"_blank","noopener")};
$("#previewBtn").addEventListener("click",openPreview);
$("#fullPreview").addEventListener("click",openPreview);
$("#reloadPreview").addEventListener("click",loadFrame);
$$("[data-frame]").forEach(b=>b.addEventListener("click",()=>{frameMode=b.dataset.frame;$$("[data-frame]").forEach(t=>t.setAttribute("aria-pressed",String(t===b)));loadFrame()}));
$$("[data-jump]").forEach(b=>b.addEventListener("click",()=>chooseTab(b.dataset.jump)));
$("#resetBtn").addEventListener("click",()=>{if(!confirm("回復測試版預設內容？目前草稿尚不會被刪除，需另按儲存。"))return;Object.assign(draft,schema.defaults);restoreFields();setDirty(true);message("表單已回復預設內容，尚未儲存")});
$("#clearBtn").addEventListener("click",()=>{if(!confirm("確定清除此瀏覽器的測試草稿？正式 CMS 不受影響。"))return;try{localStorage.removeItem(schema.storageKey);savedAt="";Object.assign(draft,schema.defaults);restoreFields();setDirty(false);$("#savedTime").textContent="尚無草稿";message("本機草稿已清除");if(selectedTab==="preview")loadFrame()}catch(e){message("無法清除草稿")}});
$("#exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({version:1,values:schema.normalize(draft),updatedAt:savedAt||null},null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=n("a");a.href=u;a.download="signwellbio-test-draft.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500);message("草稿 JSON 已匯出")});
addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();save()}});
addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
$("#savedTime").textContent=savedAt?new Date(savedAt).toLocaleString("zh-TW",{hour12:false}):"尚無草稿";
updateCover();setDirty(false);chooseTab(tabs.includes(location.hash.slice(1))?location.hash.slice(1):"overview")
})();