/* SIGNWELL BIO /test/ homepage draft preview only.
 * Preview applies solely when ?preview=1 is present; normal visitors see static test design.
 * Never connects to the production CMS or reads its storage keys.
 */
(()=>{"use strict";
 if(new URLSearchParams(location.search).get("preview")!=="1")return;
 const schema=window.SWBIO_TEST_CMS;
 if(!schema)return;
 const $=(sel,scope=document)=>scope.querySelector(sel);
 const set=(sel,value)=>{const node=$(sel);if(node)node.textContent=value};
 const split=(sel,first,second)=>{
  const el=$(sel);if(!el)return;
  const br=document.createElement("br");
  el.replaceChildren(document.createTextNode(first),br,document.createTextNode(second));
 };
 const render=(values)=>{
  const v=schema.normalize(values);
  const intro=$(".intro h1");
  if(intro){
   intro.replaceChildren(document.createTextNode(v.introLead));
   const em=document.createElement("em");em.textContent=v.introAccent;intro.appendChild(em);
  }
  set(".intro-inner>p",v.introDescription);
  set(".stage-sub>b",v.sceneOneLabel);
  set(".stage-sub>p",v.sceneOneDescription);
  split("#risingPage h2",v.sceneTwoLine1,v.sceneTwoLine2);
  set("#risingPage .stage-page-inner p",v.sceneTwoDescription);
  split("#finalPage h2",v.sceneThreeLine1,v.sceneThreeLine2);
  set("#finalPage .stage-page-inner p",v.sceneThreeDescription);
  set("#current .p-sectionhead h2",v.currentSectionTitle);
  set("#features .p-sectionhead h2",v.featuresSectionTitle);
  split("#editorial-note h2",v.noteLine1,v.noteLine2);
  set("#editorial-note>p",v.noteDescription);
  split("#subscribe .p-newsletter-inner h2",v.newsletterLine1,v.newsletterLine2);
  set("#subscribe .p-newsletter-inner>div:first-child p",v.newsletterDescription);
  const applyStory=(id,titleSelector,otherSelector,excerptSelector,catSelector)=>{
   const story=schema.catalog[id];if(!story)return;
   const link=$(titleSelector);
   if(link){link.textContent=story.title;link.setAttribute("href","article.html?story="+encodeURIComponent(story.id))}
   if(otherSelector){const other=$(otherSelector);if(other)other.setAttribute("href","article.html?story="+encodeURIComponent(story.id))}
   if(excerptSelector)set(excerptSelector,story.excerpt);
   if(catSelector)set(catSelector,story.topic.toUpperCase()+" / EDITORIAL");
  };
  applyStory(v.leadStory,"#current .p-feature-title a","#current .read-more-link","#current .p-excerpt","#current .p-story-badge");
  [v.featuredStory1,v.featuredStory2,v.featuredStory3].forEach((id,i)=>{
   const selector="#features .p-feature-item:nth-child("+(i+1)+")";
   applyStory(id,selector+" h3 a",null,selector+" p",selector+" .category");
  });
  document.title="預覽｜SIGNWELL 欣緯生醫";
  const badge=$("#swTestCmsPreviewBadge");
  if(badge)badge.textContent="CMS LOCAL PREVIEW / 未公開";
 };
 const loaded=schema.load();
 render(loaded?.values||schema.defaults);
 let badge=document.getElementById("swTestCmsPreviewBadge");
 if(!badge){
  badge=document.createElement("a");badge.id="swTestCmsPreviewBadge";
  badge.textContent="CMS LOCAL PREVIEW / 未公開";
  badge.href="cms/";
  badge.setAttribute("aria-label","返回測試 CMS 編輯");
  badge.style.cssText="position:fixed;right:12px;top:max(93px,env(safe-area-inset-top));z-index:88;background:#f7f5edea;border:1px solid #c4beb0;color:#18262e;padding:8px 12px;border-radius:100px;font:700 10px/1.45 -apple-system,BlinkMacSystemFont,'PingFang TC',sans-serif;letter-spacing:.04em;text-decoration:none;backdrop-filter:blur(12px);box-shadow:0 3px 14px #1111;max-width:65vw;";
  document.body.appendChild(badge);
 }
 addEventListener("storage",e=>{
  if(e.key===schema.storageKey)render(schema.load()?.values||schema.defaults);
 });
})();