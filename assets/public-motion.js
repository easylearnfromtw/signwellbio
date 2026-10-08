/* SIGNWELL BIO / Public Homepage Motion 11
 * Non-destructive enhancement over the authoritative public-core runtime:
 * - app navigation, search, articles, newsletter and CSP remain untouched;
 * - shadow-root confines complex editorial CSS to the motion chapters;
 * - only published CMS siteText and article index are rendered.
 */
(()=>{"use strict";
 const host=document.getElementById("swMotionHomeHost");
 const template=window.SW_PUBLIC_MOTION_TEMPLATE;
 if(!host||!template||!host.attachShadow)return;
 const root=host.attachShadow({mode:"open"});
 const style=document.createElement("link");
 style.rel="stylesheet";style.href="assets/public-motion.css?version=11.0.1";
 root.appendChild(style);
 const content=document.createElement("div");content.className="sw-public-motion-root";content.innerHTML=template;
 root.appendChild(content);
 const $=selector=>root.querySelector(selector);
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const rail=$("#motionStory"),stage=$("#motionStage");
 const clamp=(n,l=0,h=1)=>Math.min(h,Math.max(l,n));
 const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
 const interp=(a,b,p)=>a+(b-a)*p;
 let mounted=false,suspended=true,scheduled=false,lastProgress=-1,phase=null,started3d=false,scrollInitialized=false;
 let publishedArticles=[],siteText={},publishedReady=false;
 const fallbackTitle="SIGN WELL · 欣緯生醫";
 const safe=(key,def)=>typeof siteText[key]==="string"&&siteText[key].trim()?siteText[key].trim():def;
 const set=(selector,str)=>{const node=$(selector);if(node)node.textContent=str};
 const split=(selector,a,b)=>{
  const node=$(selector);if(!node)return;
  const br=document.createElement("br");
  node.replaceChildren(document.createTextNode(a),br,document.createTextNode(b))
 };
 const updateCopy=()=>{
  const title=$(".intro h1");
  if(title){
   const em=document.createElement("em");em.textContent=safe("motionIntroAccent","也重新看見人。");
   title.replaceChildren(document.createTextNode(safe("motionIntroLead","不只研究身體，",)),em);
  }
  set(".intro-inner>p",safe("motionIntroDescription","關於醫學、健康、美學與生活的獨立編輯觀點。"));
  set(".stage-sub>b",safe("motionSceneOneLabel","01 / THE HUMAN CONDITION"));
  set(".stage-sub>p",safe("motionSceneOneDescription","健康，不只是一個被數據量化的結果。"));
  split("#risingPage h2",safe("motionSceneTwoLine1","把觀點，"),safe("motionSceneTwoLine2","放進新的框架。"));
  set("#risingPage .stage-page-inner p",safe("motionSceneTwoDescription","醫學與生活經驗彼此對話。"));
  split("#finalPage h2",safe("motionSceneThreeLine1","同一個人，"),safe("motionSceneThreeLine2","不只有一種定義。"));
  set("#finalPage .stage-page-inner p",safe("motionSceneThreeDescription","在證據與經驗之間，找到更完整的故事。"));
  set(".after-copy .mini","EDITORIAL / READING BEGINS");
  set(".after-copy>p",safe("motionNoteDescription","觀察醫學，也觀察醫學之外的世界。"));
 };
 function updateStage(){
  scheduled=false;
  if(suspended||!stage||!rail||reduced.matches)return;
  const rect=rail.getBoundingClientRect(),length=Math.max(1,rail.offsetHeight-innerHeight);
  const p=clamp(-rect.top/length);
  if(Math.abs(lastProgress-p)<.0008)return;lastProgress=p;
  const rise=smooth((p-.20)/.35),final=smooth((p-.58)/.30);
  stage.style.setProperty("--panel-y",(100-rise*100).toFixed(2)+"%");
  stage.style.setProperty("--final-y",(100-final*100).toFixed(2)+"%");
  const mobile=matchMedia("(max-width:720px)").matches;
  stage.style.setProperty("--mid-text-opacity",mobile?smooth((rise-.75)/.24).toFixed(3):"1");
  stage.style.setProperty("--last-text-opacity",mobile?smooth((final-.75)/.24).toFixed(3):"1");
  stage.style.setProperty("--story-progress",(p*100).toFixed(1)+"%");
  stage.style.setProperty("--figure-y",interp(30,-42,p).toFixed(1)+"px");
  stage.style.setProperty("--figure-rotate",interp(-12,11,p).toFixed(1)+"deg");
  stage.style.setProperty("--figure-scale",interp(1,1.09,smooth((p-.2)/.65)).toFixed(3));
  stage.style.setProperty("--big-shift",interp(0,-100,smooth((p-.07)/.67)).toFixed(1)+"px");
  stage.style.setProperty("--big-opacity",(1-smooth((p-.32)/.24)).toFixed(3));
  const next=p<.24?"01 / THE HUMAN CONDITION":p<.66?"02 / NEW PERSPECTIVES":"03 / REFRAME THE QUESTION";
  if(phase!==next){phase=next;set("#storyPhase",next)}
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(updateStage)}}
 addEventListener("scroll",schedule,{passive:true});
 addEventListener("resize",()=>{lastProgress=-1;schedule()},{passive:true});
 root.addEventListener("click",e=>{
  const anchor=e.target?.closest?.("a[href^='#']");
  if(!anchor)return;
  const id=anchor.getAttribute("href").slice(1);
  const target=root.getElementById(id)||document.getElementById(id);
  if(!target)return;
  e.preventDefault();target.scrollIntoView({behavior:reduced.matches?"auto":"smooth",block:"start"});
 });
 function articleUrl(slug){
  return "./article/"+encodeURIComponent(String(slug||"").trim())+"/";
 }
 function el(tag,className,text){
  const n=document.createElement(tag);if(className)n.className=className;
  if(text!==undefined)n.textContent=String(text);return n;
 }
 function renderContinuation(){
  const app=document.getElementById("app"),latest=app?.querySelector("#latest");
  if(!latest||suspended)return;
  app.querySelector("#swMotionFeatures")?.remove();
  app.querySelector("#swMotionEditorial")?.remove();
  // No drafts, demo titles, external feeds or invented stories.
  const sorted=publishedArticles.filter(a=>a&&a.status==="Published"&&String(a.slug||"").trim());
  const ordered=[...sorted.filter(a=>a.featured),...sorted.filter(a=>!a.featured)];
  const unique=ordered.filter((a,i,arr)=>arr.findIndex(b=>b.slug===a.slug)===i).slice(0,3);
  if(unique.length){
   const sec=el("section","sw-motion-features");sec.id="swMotionFeatures";
   const header=el("div","sw-motion-section-head"),meta=el("div","sw-motion-section-meta","CURATED READING / 02");
   const h=el("h2",null,safe("motionFeaturesSectionTitle","精選閱讀"));
   header.append(meta,h);sec.append(header);
   const grid=el("div","sw-motion-feature-grid");
   unique.forEach((a,i)=>{
    const link=el("a","sw-motion-feature");
    link.href=articleUrl(a.slug);
    const image=el("div","sw-motion-feature-art");
    const cover=String(a.cover||"").trim();
    if(/^https?:\/\//.test(cover)||/^(?:assets\/|uploads\/)/.test(cover)){
      const img=el("img");img.src=cover;img.alt="";img.loading="lazy";img.decoding="async";image.appendChild(img);
    }else image.appendChild(el("span","sw-motion-feature-mark","SIGNWELL / "+String(i+1).padStart(2,"0")));
    const label=el("div","sw-motion-feature-meta",String(a.category||"醫學觀點").toUpperCase());
    const title=el("h3",null,String(a.title||"未命名文章"));
    const excerpt=el("p",null,String(a.summary10s||a.excerpt||"").slice(0,155));
    link.append(image,label,title,excerpt);grid.appendChild(link)
   });
   sec.appendChild(grid);latest.after(sec);
  }
  const note=el("section","sw-motion-editorial-note");note.id="swMotionEditorial";
  note.appendChild(el("div","sw-motion-section-meta","EDITORIAL NOTE / 03"));
  const heading=el("h2");
  const a=el("span",null,safe("motionNoteLine1","好的內容，不需要急著給答案。"));
  const b=el("span",null,safe("motionNoteLine2","更重要的是提出對的問題。"));
  heading.append(a,b);note.appendChild(heading);
  note.appendChild(el("p",null,safe("motionNoteDescription","醫學的價值，也在於理解不確定性與不同的人生處境。")));
  const news=el("div","sw-motion-newsletter");
  const intro=el("div");
  intro.appendChild(el("small",null,"SIGNWELL / LETTER"));
  const newsletterHeading=el("h3",null,safe("motionNewsletterLine1","Something")+" "+safe("motionNewsletterLine2","worth reading."));
  intro.appendChild(newsletterHeading);
  intro.appendChild(el("p",null,safe("motionNewsletterDescription","不定期寄送編輯觀點與值得閱讀的文章。")));
  const action=el("a","sw-motion-newsletter-link","前往電子報");action.href="newsletter.html";
  news.append(intro,action);note.append(news);
  (app.querySelector("#swMotionFeatures")||latest).after(note);
  const title=latest.querySelector(".section-head h2")||latest.querySelector("h2");
  if(title)title.textContent=safe("motionCurrentSectionTitle",siteText.dailyTitle||"最新文章");
 }
 function setActive(next,info={}){
  suspended=!next;
  if(next){
   host.hidden=false;
   const app=document.getElementById("app");
   // Only suppress the previous GPU-intensive cover when the new scene
   // and its scoped stylesheet have loaded successfully.
   if(mounted&&app){
    app.querySelector(".sw-liquid-hero")?.remove();
    app.querySelector(".hero")?.remove();
   }
   if(info.siteText)siteText=info.siteText;
   if(info.articles)publishedArticles=info.articles;
   publishedReady=Boolean(info.ready);
   updateCopy();renderContinuation();lastProgress=-1;schedule();
   if(mounted)start3d();
  }else{
   host.hidden=true;lastProgress=-1;
  }
 }
 async function start3d(){
  if(started3d||reduced.matches||suspended)return;
  started3d=true;
  const begin=async()=>{
   if(suspended||reduced.matches)return;
   const load=(url)=>new Promise((resolve,reject)=>{
    const s=document.createElement("script");s.src=url;s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)
   });
   try{
    if(!window.gsap)await load("https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js");
    if(!window.ScrollTrigger)await load("https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js")
   }catch(error){console.warn("[SIGNWELL] GSAP unavailable; using native scroll with 3D",error)}
   if(suspended)return;
   import("./public-motion-three.js").catch(error=>console.warn("[SIGNWELL] WebGL module unavailable; CSS fallback kept",error))
  };
  if("IntersectionObserver" in window){
   const observer=new IntersectionObserver(entries=>{
    if(entries.some(x=>x.isIntersecting)){observer.disconnect();begin()}
   },{rootMargin:"700px 0px"});
   observer.observe(rail)
  }else begin()
 }
 style.addEventListener("load",()=>{
  mounted=true;
  if(!suspended){
   const app=document.getElementById("app");
   app?.querySelector(".sw-liquid-hero")?.remove();
   app?.querySelector(".hero")?.remove();
   start3d();
  }
 },{once:true});
 style.addEventListener("error",()=>{
  mounted=false;host.hidden=true;
  document.body.classList.remove("sw-motion-active");
  console.error("[SIGNWELL] Scoped motion CSS failed; legacy Public hero retained");
 },{once:true});
 document.addEventListener("signwell:render",e=>{
  const detail=e.detail||{};
  const next=detail.page==="home";
  document.body.classList.toggle("sw-motion-active",next);
  setActive(next,detail)
 });
 // On late-loaded script, avoid showing a broken half-rendered intro:
 host.hidden=true;
 if(document.querySelector("#app #latest")&&!new URL(location.href).searchParams.has("article")){
  setActive(true,{siteText:window.SIGNWELL_SITE_TEXT||{},ready:true})
 }
})();
