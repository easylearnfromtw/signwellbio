/* SIGNWELL BIO / TEST CMS. No production auth, API, publishing or subscriber integration. */
(()=>{"use strict";
const schema=window.SWBIO_TEST_CMS;
if(!schema){document.body.textContent="CMS 欄位設定載入失敗，請重新整理。";return;}
const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>[...root.querySelectorAll(s)];
const panels=[
 {id:"overview",label:"今日",short:"今日",eyebrow:"WORKSPACE / OVERVIEW",title:"編輯總覽",description:"一個安靜、可預覽的編輯工作台。動態負責敘事，文字內容依然是網站的核心。"},
 {id:"hero",label:"首頁封面",short:"封面",eyebrow:"PUBLIC / FIRST IMPRESSION",title:"首頁封面",description:"調整第一屏主標題和引言。立體物件、動態效果保持原有設定。"},
 {id:"motion",label:"動態場景",short:"動態",eyebrow:"PUBLIC / MOTION STUDY",title:"三幕敘事",description:"文字依序出現在 Three.js 捲動場景中。手機預覽仍保留文字避讓。"},
 {id:"stories",label:"精選文章",short:"文章",eyebrow:"PUBLIC / CURATION",title:"文章與精選",description:"安排首頁主要文章和精選欄位。這裡僅使用測試版內建的示範文章。"},
 {id:"copy",label:"編輯文案",short:"文案",eyebrow:"PUBLIC / EDITORIAL COPY",title:"編輯觀點與電子報",description:"編輯文章區標題、編輯寄語和訂閱引導。訂閱表單仍不會真的發送資料。"},
 {id:"release",label:"發行與設定",short:"發行",eyebrow:"WORKFLOW / TEST MODE",title:"預覽與發行",description:"檢查草稿狀態、打開預覽，並了解測試環境和正式 CMS 的界線。"}
];
const saved=schema.load();let values={...(saved?.values||schema.defaults)};let baseline=JSON.stringify(schema.normalize(values));
let active=panels.some(p=>p.id===location.hash.slice(1))?location.hash.slice(1):"overview";
const main=$("#editorPanel"),state=$("#saveState"),mobileNav=$("#mobileNav"),sidebar=$("#sidebarNav");
const fieldById=Object.fromEntries(schema.fields.map(f=>[f.key,f]));
const sectionIds={
 hero:["introLead","introAccent","introDescription"],
 motion:["sceneOneLabel","sceneOneDescription","sceneTwoLine1","sceneTwoLine2","sceneTwoDescription","sceneThreeLine1","sceneThreeLine2","sceneThreeDescription"],
 editorial:["currentSectionTitle","featuresSectionTitle","noteLine1","noteLine2","noteDescription"],
 newsletter:["newsletterLine1","newsletterLine2","newsletterDescription"]
};
const labelFor=id=>panels.find(p=>p.id===id)?.label||"編輯";
function toast(message){
 $(".toast")?.remove();
 const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=message;
 document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
}
const normalized=()=>schema.normalize(values);
const dirty=()=>JSON.stringify(normalized())!==baseline;
function updateSaveUI(){
 const isDirty=dirty();
 state.textContent=isDirty?"有未儲存變更":schema.load()?"已儲存草稿":"尚無草稿";
 state.classList.toggle("dirty",isDirty);
 $("#saveButton").disabled=!isDirty;
 const timestamp=$("#lastSaved");if(timestamp){const last=schema.load()?.updatedAt;timestamp.textContent=last?new Date(last).toLocaleString("zh-TW",{hour12:false}):"尚未儲存";}
}
function addElement(tag,className,textValue){
 const el=document.createElement(tag);if(className)el.className=className;
 if(textValue!==undefined)el.textContent=textValue;
 return el;
}
function buildField(field){
 const wrap=addElement("div","field-group"+(field.max>75?" wide":""));
 const id="field-"+field.key;
 const label=addElement("label","field-label");label.htmlFor=id;
 label.appendChild(addElement("span","",field.label));
 const count=addElement("small","",String((values[field.key]||"").length)+"/"+field.max);label.appendChild(count);
 const ctl=addElement(field.max>75?"textarea":"input","input");
 ctl.id=id;ctl.name=field.key;ctl.maxLength=field.max;
 if(ctl.tagName==="INPUT")ctl.type="text";else ctl.rows=field.max>190?4:3;
 ctl.value=values[field.key]??field.defaultValue;
 ctl.autocomplete="off";ctl.spellcheck=true;
 ctl.addEventListener("input",()=>{
  values[field.key]=ctl.value;count.textContent=String(ctl.value.length)+"/"+field.max;
  updateSaveUI();
 });
 wrap.append(label,ctl);
 return wrap;
}
function gridFor(keys){
 const grid=addElement("div","field-grid");
 keys.map(k=>fieldById[k]).filter(Boolean).forEach(field=>grid.appendChild(buildField(field)));
 return grid;
}
function sectionTitle(label,note){
 const row=addElement("div","section-title");row.append(addElement("h2","",label),addElement("span","",note));return row;
}
function panelBox(title,description,isSoft=false){
 const box=addElement("section","panel"+(isSoft?" soft":""));
 box.append(addElement("h2","",title),addElement("p","",description));return box;
}
function button(label,onClick,variant=""){
 const b=addElement("button","btn "+variant,label);b.type="button";b.addEventListener("click",onClick);return b;
}
function linkButton(label,href,variant=""){
 const a=addElement("a","btn "+variant,label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a;
}
function hint(message){
 const n=addElement("div","inline-info",message);return n;
}
function renderOverview(){
 const intro=addElement("div","kpis");
 const items=[["03","動態敘事章節"],["07","測試文章"],["01","獨立首頁預覽"]];
 for(const [count,label] of items){const item=addElement("div","kpi");item.append(addElement("label","",label),addElement("strong","",count),addElement("small","","TEST ONLY"));intro.appendChild(item);}
 main.appendChild(intro);
 const row=addElement("div","panels");const a=panelBox("從首頁開始","先調整標題與動態場景文案，再精選文章。這份草稿只儲存在目前瀏覽器。",true);
 a.append(sectionTitle("建議流程","01 — 04"));
 const steps=[["01","封面與品牌語氣","調整第一屏標題、引言。","hero"],["02","三幕場景文案","確認文字不會被 3D 物件遮住。","motion"],["03","文章精選與編輯文案","選取首頁文章、編輯觀點與電子報。","stories"],["04","預覽整個首頁","確認手機和桌面上每一段都自然。","release"]];
 const list=addElement("div","step-list");
 for(const [number,name,desc,target] of steps){
  const item=addElement("div","step");
  item.append(addElement("span","",number));
  const mid=addElement("div");mid.append(addElement("b","",name),addElement("p","",desc));
  const jump=addElement("a","", "開啟");jump.href="#"+target;jump.addEventListener("click",e=>{e.preventDefault();navigate(target)});
  item.append(mid,jump);list.appendChild(item);
 }
 a.appendChild(list);
 const b=panelBox("近期工作狀態","測試草稿和真實發行嚴格分離。");
 const list2=addElement("div","step-list");
 for(const [title,desc] of [
 ["測試首頁","三幕立體場景、精選文章與電子報區已建立"],
 ["草稿儲存","此裝置的 localStorage；不會同步到其他裝置"],
 ["正式 CMS","仍使用既有獨立登入與發布流程"]
 ]){const item=addElement("div","step");item.style.gridTemplateColumns="1fr";item.append(addElement("b","",title),addElement("p","",desc));list2.append(item);}
 b.append(list2,hint("重要：這裡是設計測試環境，沒有身分驗證。不要輸入病人資料、個人資訊、帳號密碼或尚未公開的內容。"));
 row.append(a,b);main.appendChild(row);
}
function renderHero(){
 main.append(sectionTitle("品牌封面","FIRST IMPRESSION"),gridFor(sectionIds.hero));
 main.append(hint("封面文字變動只影響預覽版。Three.js 3D 物件、動畫時間軸與手機避讓配置暫由程式管理，以避免非預期遮字。"));
}
function renderMotion(){
 main.append(sectionTitle("第一幕 / THE HUMAN CONDITION","01"),gridFor(["sceneOneLabel","sceneOneDescription"]));
 main.append(sectionTitle("第二幕 / NEW PERSPECTIVES","02"),gridFor(["sceneTwoLine1","sceneTwoLine2","sceneTwoDescription"]));
 main.append(sectionTitle("第三幕 / REFRAME THE QUESTION","03"),gridFor(["sceneThreeLine1","sceneThreeLine2","sceneThreeDescription"]));
 main.append(hint("手機上的每行標題建議在 12 個中文字以內。長文案仍會斷行；預覽時請檢查最小螢幕上的辨識度。"));
}
const selects=[["leadStory","首頁主要文章","CURRENT / LEAD STORY"],["featuredStory1","精選文章一","EDITORIAL / 01"],["featuredStory2","精選文章二","EDITORIAL / 02"],["featuredStory3","精選文章三","EDITORIAL / 03"]];
function storySelect([key,label,note]){
 const card=addElement("div","story-select-card");
 card.appendChild(addElement("div","eyebrow",note));
 const lab=addElement("label","field-label",label);const control=addElement("select","input");control.id="sel-"+key;lab.htmlFor=control.id;
 for(const s of schema.stories){const option=addElement("option","",s.title+" / "+s.topic);option.value=s.id;control.appendChild(option);}
 control.value=values[key];
 control.addEventListener("change",()=>{values[key]=control.value;updateSaveUI();});
 card.append(lab,control);return card;
}
function renderStories(){
 main.append(sectionTitle("首頁精選版位","CURATION / SAMPLE ARTICLES"));
 const row=addElement("div","panels");
 const left=panelBox("文章版位安排","挑選首頁最顯眼的主文章，以及下方三篇精選閱讀。");selects.forEach(x=>left.append(storySelect(x)));
 const right=panelBox("文章庫狀態","文章標題與摘要目前取自測試站內建的示範資料，尚未同步正式 CMS。",true);
 const list=addElement("div","step-list");
 schema.stories.forEach(s=>{const wrap=addElement("div","step");wrap.style.gridTemplateColumns="1fr";wrap.append(addElement("b","",s.title),addElement("p","",s.topic));list.append(wrap);});
 right.append(list);row.append(left,right);main.append(row);
 main.append(hint("注意：精選下拉選單僅改變首頁的展示版位，並不修改文章正文，也不代表文章已發布。"));
}
function renderCopy(){
 main.append(sectionTitle("首頁章節標題","EDITORIAL STRUCTURE"),gridFor(["currentSectionTitle","featuresSectionTitle"]));
 main.append(sectionTitle("編輯的話","EDITORIAL NOTE"),gridFor(["noteLine1","noteLine2","noteDescription"]));
 main.append(sectionTitle("電子報引導","LETTER / COPY"),gridFor(sectionIds.newsletter));
 main.append(hint("測試版電子報僅供 UI 預覽，無法收集 Email、寄送確認信或變更正式訂閱資料。"));
}
function saveDraft(showToast=true){
 try{
  const ret=schema.save(values);values={...ret.values};baseline=JSON.stringify(values);
  updateSaveUI();if(showToast)toast("已儲存至本機測試草稿");
  return true;
 }catch(e){console.warn("[SIGNWELL test CMS] local save failed",e);toast("無法儲存：瀏覽器限制了本機儲存");return false;}
}
function renderRelease(){
 const row=addElement("div","panels");
 const left=panelBox("預覽本機草稿","開啟新版首頁的獨立預覽，確認 3D 動態場景及下方完整閱讀區。");
 left.append(hint("按「預覽首頁」會先儲存目前草稿，再開啟 ?preview=1。公開測試首頁仍顯示原本的示範內容。"));
 const bar=addElement("div","panel-footer");
 bar.append(linkButton("開啟目前的公開測試首頁","../index.html","secondary"));
 const pre=addElement("a","btn dark","預覽草稿首頁");pre.href="../index.html?preview=1";pre.target="_blank";pre.rel="noopener";
 pre.addEventListener("click",e=>{if(!saveDraft(false)){e.preventDefault();return;}toast("預覽已準備；不會公開發布");});
 bar.append(pre);left.append(bar);
 const right=panelBox("發行狀態","這裡沒有接到正式站的發布服務，也沒有真實權限。",true);
 const states=[["測試草稿","本機瀏覽器保存"],["首頁預覽","使用 ?preview=1"],["正式發行","未啟用，需後續整合驗證"]];
 states.forEach(([k,v])=>{const line=addElement("div","step");line.style.gridTemplateColumns="1fr";line.append(addElement("b","",k),addElement("p","",v));right.appendChild(line)});
 right.append(hint("正式 CMS 必須沿用既有的登入、草稿、發布和同步機制；本工作台不提供匿名公開寫入。"));
 row.append(left,right);main.append(row);
 main.append(sectionTitle("草稿管理","LOCAL / RESET"));
 const tools=addElement("div","panel");
 tools.append(addElement("h2","","本機工作資料"),addElement("p","","草稿不會同步到 GitHub 或其他瀏覽器；清除瀏覽器資料也可能導致草稿遺失。"));
 const actions=addElement("div","panel-footer");
 actions.append(button("恢復這次已儲存的草稿",()=>{values={...(schema.load()?.values||schema.defaults)};baseline=JSON.stringify(values);render();toast("已還原已儲存的內容");}));
 actions.append(button("重設為範例內容",()=>{if(!confirm("確定重設目前的編輯欄位？這個動作不會修改公開網站。"))return;values={...schema.defaults};render();toast("已恢復範例文字，記得儲存草稿");}));
 tools.append(actions);main.append(tools);
}
function navigate(id){
 active=panels.some(x=>x.id===id)?id:"overview";
 if(location.hash.slice(1)!==active)history.replaceState(null,"","#"+active);
 render();window.scrollTo({top:0,behavior:"instant"});
}
function render(){
 const meta=panels.find(p=>p.id===active)||panels[0];
 $$(".menu button, .mobile-nav button").forEach(btn=>{
  const isActive=btn.dataset.panel===active;
  if(isActive)btn.setAttribute("aria-current","page");else btn.removeAttribute("aria-current");
 });
 mobileNav.style.setProperty("--cms-tab-index",String(Math.max(0,panels.findIndex(p=>p.id===active))));
 $("#breadcrumb").textContent=meta.label;
 $("#pageEyebrow").textContent=meta.eyebrow;
 $("#pageTitle").textContent=meta.title;
 $("#pageLead").textContent=meta.description;
 main.replaceChildren();
 switch(active){
 case "overview":renderOverview();break;
 case "hero":renderHero();break;
 case "motion":renderMotion();break;
 case "stories":renderStories();break;
 case "copy":renderCopy();break;
 case "release":renderRelease();break;
 }
 updateSaveUI();
}
function buildNav(container,mobile=false){
 panels.forEach((p,index)=>{
  const btn=addElement("button");btn.type="button";btn.dataset.panel=p.id;
  if(mobile){btn.append(addElement("span","",String(index+1).padStart(2,"0")),document.createTextNode(p.short));btn.setAttribute("aria-label",p.label);}
  else{btn.append(addElement("span","nav-number",String(index+1).padStart(2,"0")),document.createTextNode(p.label));}
  btn.addEventListener("click",()=>navigate(p.id));
  container.appendChild(btn);
 });
}
buildNav(sidebar);buildNav(mobileNav,true);

/* The 6-way mobile Studio thumb follows the active section and horizontal drag.
 * A vertical finger gesture remains native page scroll.
 */
let pointer=null,draggedIndex=null,suppressNextClick=false;
mobileNav.addEventListener("pointerdown",e=>{
 if(e.button!==0&&e.pointerType==="mouse")return;
 pointer={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};draggedIndex=null;
});
mobileNav.addEventListener("pointermove",e=>{
 if(!pointer||pointer.id!==e.pointerId)return;
 const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
 if(!pointer.dragged){
  if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.2)return;
  pointer.dragged=true;mobileNav.classList.add("is-dragging");
  try{mobileNav.setPointerCapture(e.pointerId)}catch(_){}
 }
 const bounds=mobileNav.getBoundingClientRect();
 draggedIndex=Math.min(5,Math.max(0,Math.floor((e.clientX-bounds.left)/bounds.width*6)));
 mobileNav.style.setProperty("--cms-tab-index",String(draggedIndex));
});
mobileNav.addEventListener("pointerup",()=>{
 const moved=pointer?.dragged&&draggedIndex!==null;
 pointer=null;mobileNav.classList.remove("is-dragging");
 if(moved){
  suppressNextClick=true;
  const target=panels[draggedIndex].id;
  navigate(target);
  setTimeout(()=>{suppressNextClick=false},150);
 }else mobileNav.style.setProperty("--cms-tab-index",String(Math.max(0,panels.findIndex(p=>p.id===active))));
 draggedIndex=null;
});
mobileNav.addEventListener("pointercancel",()=>{
 pointer=null;draggedIndex=null;mobileNav.classList.remove("is-dragging");
 mobileNav.style.setProperty("--cms-tab-index",String(Math.max(0,panels.findIndex(p=>p.id===active))));
});
mobileNav.addEventListener("click",e=>{
 if(suppressNextClick){e.preventDefault();e.stopImmediatePropagation();suppressNextClick=false;}
},true);

$("#saveButton").addEventListener("click",()=>saveDraft());
$("#previewButton").addEventListener("click",e=>{if(!saveDraft(false)){e.preventDefault();return;}toast("已同步本機草稿到預覽頁");});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h!==active&&panels.some(p=>p.id===h)){active=h;render();}});
window.addEventListener("beforeunload",e=>{if(dirty()){e.preventDefault();e.returnValue="";}});
render();
})();