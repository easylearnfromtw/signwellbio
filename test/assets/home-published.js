/* SIGNWELL BIO — published CMS-to-motion preview (not a draft publisher).
 * Reads only public-data.json and the published article index. Does not access
 * CMS tokens, session data, local drafts or third-party backends.
 */
(async()=>{"use strict";
 if(new URLSearchParams(location.search).get("preview")!=="published")return;
 const $=s=>document.querySelector(s);
 const label=(text,color)=>{
  let el=$("#swPublishedPreviewBadge");
  if(!el){el=document.createElement("div");el.id="swPublishedPreviewBadge";el.setAttribute("role","status");el.style.cssText="position:fixed;top:calc(90px + env(safe-area-inset-top,0px));right:13px;z-index:85;max-width:min(280px,67vw);background:#f9f6edee;color:#183341;border:1px solid #c2c6c0;padding:10px 13px;border-radius:9px;font:750 11px/1.7 -apple-system,'PingFang TC',sans-serif;box-shadow:0 5px 17px #121b2021;backdrop-filter:blur(13px)";document.body.appendChild(el)}
  el.textContent=text;el.style.borderColor=color||"#c2c6c0";
 };
 const request=async path=>{
  const url=new URL(path,location.href);
  if(url.origin!==location.origin)throw Error("站內資料來源錯誤");
  const response=await fetch(url,{cache:"no-store",credentials:"omit"});
  if(!response.ok)throw Error("資料載入失敗："+response.status+" "+path);
  return response.json();
 };
 const set=(selector,text)=>{const el=$(selector);if(el)el.textContent=String(text)};
 const split=(selector,a,b)=>{
  const el=$(selector);if(!el)return;const br=document.createElement("br");
  el.replaceChildren(document.createTextNode(String(a)),br,document.createTextNode(String(b)));
 };
 const safeText=(o,key,fallback)=>{const v=o?.[key];return typeof v==="string"&&v.trim()?v.trim():fallback};
 const linkFor=story=>{
  const slug=String(story?.slug||"").trim();
  return slug?new URL("../article/"+encodeURIComponent(slug)+"/",location.href).href:null
 };
 const setLink=(selector,story)=>{
  const el=$(selector);if(!el)return;
  if(!story){el.removeAttribute("href");el.setAttribute("aria-disabled","true");return}
  el.textContent=String(story.title||"未命名文章");
  const href=linkFor(story);if(href){el.href=href;el.removeAttribute("aria-disabled")}
 };
 const storyMeta=article=>{
  const raw=String(article?.publishedAt||"");
  const t=/^\d{4}-\d\d-\d\d/.test(raw)?raw.slice(5,10).replace("-"," / "):"NEW";
  return t
 };
 const fillFeatured=(item,story)=>{
  if(!item)return;
  if(!story){item.hidden=true;return}
  item.hidden=false;
  const a=item.querySelector("h3 a");
  if(a){a.textContent=String(story.title||"未命名文章");a.href=linkFor(story)||"../topics.html"}
  const category=item.querySelector(".category");
  if(category)category.textContent=String(story.category||"醫學觀點");
  const excerpt=item.querySelector("p");
  if(excerpt)excerpt.textContent=String(story.summary10s||story.excerpt||"").slice(0,220)
 };
 try{
  label("正在驗證已發布資料…");
  const bundle=await request("../public-data.json");
  if(!bundle||typeof bundle!=="object"||!bundle.siteText)throw Error("公開網站資料格式不符");
  const text=bundle.siteText;
  set(".intro-inner>p",safeText(text,"motionIntroDescription","將醫學、健康與美學編排成可探索的觀點。"));
  const intro=$(".intro h1");
  if(intro){
   intro.replaceChildren(document.createTextNode(safeText(text,"motionIntroLead","不只研究身體，")));
   const accent=document.createElement("em");accent.textContent=safeText(text,"motionIntroAccent","也重新看見人。");intro.appendChild(accent)
  }
  set(".stage-sub>b",safeText(text,"motionSceneOneLabel","01 / THE HUMAN CONDITION"));
  set(".stage-sub>p",safeText(text,"motionSceneOneDescription","健康不只是數據，也關乎每一次生活選擇。"));
  split("#risingPage h2",safeText(text,"motionSceneTwoLine1","把觀點，"),safeText(text,"motionSceneTwoLine2","放進新的框架。"));
  set("#risingPage .stage-page-inner p",safeText(text,"motionSceneTwoDescription","不同領域的觀點彼此對話。"));
  split("#finalPage h2",safeText(text,"motionSceneThreeLine1","同一個人，"),safeText(text,"motionSceneThreeLine2","不只有一種定義。"));
  set("#finalPage .stage-page-inner p",safeText(text,"motionSceneThreeDescription","把醫學的證據和人的生活放在一起。"));
  set("#current .p-sectionhead h2",safeText(text,"motionCurrentSectionTitle","最新焦點"));
  set("#features .p-sectionhead h2",safeText(text,"motionFeaturesSectionTitle","精選閱讀"));
  split("#editorial-note h2",safeText(text,"motionNoteLine1","好的內容，不需要急著給答案。"),safeText(text,"motionNoteLine2","更重要的是提出對的問題。"));
  set("#editorial-note>p",safeText(text,"motionNoteDescription","觀察醫學，也觀察醫學之外的世界。"));
  split("#subscribe .p-newsletter-inner h2",safeText(text,"motionNewsletterLine1","Something"),safeText(text,"motionNewsletterLine2","worth reading."));
  set("#subscribe .p-newsletter-inner>div:first-child p",safeText(text,"motionNewsletterDescription","不定期寄出新文章。"));
  const raw=await request("../articles/index.json");
  if(!Array.isArray(raw))throw Error("正式文章索引格式不符");
  const published=raw.filter(a=>a&&a.status==="Published"&&typeof a.slug==="string"&&a.slug.trim());
  // Never display a CMS draft. Use the public index in its established order.
  const lead=published[0]||null;
  if(lead){
   setLink("#current .p-feature-title a",lead);
   const more=$("#current .read-more-link");if(more)more.href=linkFor(lead);
   set("#current .p-story-badge",String(lead.category||"醫學觀點").toUpperCase()+" / LONG READ");
   set("#current .p-excerpt",String(lead.summary10s||lead.excerpt||"").slice(0,240));
  }else{
   set("#current .p-feature-title a","尚無已發布文章");
   $("#current .p-feature-title a")?.removeAttribute("href");
   $("#current .read-more-link")?.removeAttribute("href");
   set("#current .p-excerpt","正式 CMS 尚未發布文章，這裡不顯示測試假資料。");
  }
  const list=$("#current .p-story-list");
  if(list){
   list.replaceChildren();
   published.slice(1,5).forEach(article=>{
    const row=document.createElement("div");row.className="p-story-row";
    const date=document.createElement("div");date.className="date";date.textContent=storyMeta(article);
    const content=document.createElement("div");
    const title=document.createElement("h3"),a=document.createElement("a");
    a.className="reader-launch";a.textContent=String(article.title||"未命名文章");a.href=linkFor(article);
    title.appendChild(a);
    const cat=document.createElement("span");cat.textContent=String(article.category||"醫學觀點").toUpperCase();
    content.append(title,cat);
    const end=document.createElement("span");end.className="arrow";end.textContent="→";
    row.append(date,content,end);list.appendChild(row);
   })
  }
  document.querySelectorAll("#features .p-feature-item").forEach((item,i)=>{
   const featured=published.filter(a=>a.featured&&!lead||a.featured&&a.id!==lead?.id);
   const remainder=published.filter(a=>a.id!==lead?.id);
   const stories=[...featured,...remainder.filter(a=>!featured.some(x=>x.id===a.id))];
   fillFeatured(item,stories[i]||null)
  });
  label("已發布內容預覽 / "+new Date(bundle.publishedAt||Date.now()).toLocaleDateString("zh-TW"));
 }catch(error){
  console.warn("[SIGNWELL] published motion preview validation failed",error);
  label("正式發布資料無法驗證：請勿以此畫面驗收","#b66c6c")
 }
})();