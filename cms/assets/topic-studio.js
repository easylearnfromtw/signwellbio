/* CMS / Topic Studio — live paper preview, non-invasive enhancement.
   The canonical cms-app.js retains full control of saving and publishing. */
(()=>{
  "use strict";
  let currentUpdate=null;
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!=null)node.textContent=text;
    return node;
  };
  function enhance(){
    const cover=document.getElementById("topicCover");
    const title=document.getElementById("topicName");
    const description=document.getElementById("topicDesc");
    const tone=document.getElementById("topicTapeTone");
    const slug=document.getElementById("topicSlug");
    if(!cover||!title||!description||!tone||!slug)return;
    if(cover.dataset.swTopicStudio==="yes")return;
    cover.dataset.swTopicStudio="yes";
    const field=cover.closest(".field-group");
    if(!field)return;
    const figure=el("figure","sw-topic-studio-preview");
    figure.dataset.tone="linen";
    const art=el("div","sw-ts-art");
    const image=el("img","sw-ts-image");
    image.alt="";
    image.loading="lazy";
    image.hidden=true;
    const fallback=el("span","sw-ts-fallback","SIGNWELL / TOPIC");
    art.append(image,fallback);
    const body=el("figcaption","sw-ts-body");
    const eyebrow=el("span","sw-ts-folio","SIGNWELL BIO / COLUMN PREVIEW");
    const heading=el("strong","sw-ts-name","主題名稱預覽");
    const detail=el("span","sw-ts-description","主題說明會顯示於紙張下方");
    const link=el("a","sw-ts-link","開啟公開主題頁 ↗");
    link.target="_blank";
    link.rel="noopener noreferrer";
    body.append(eyebrow,heading,detail,link);
    figure.append(art,body);
    field.append(figure);
    let imageRequest=0;
    image.addEventListener("error",()=>{
      image.hidden=true;
      fallback.hidden=false;
      figure.classList.add("has-missing-image");
    });
    image.addEventListener("load",()=>{
      image.hidden=false;
      fallback.hidden=true;
      figure.classList.remove("has-missing-image");
    });
    function refresh(){
      heading.textContent=title.value.trim()||"主題名稱預覽";
      detail.textContent=description.value.trim()||"主題說明會顯示於紙張下方";
      const t=tone.value;
      figure.dataset.tone=["linen","blue","butter","blush"].includes(t)?t:"linen";
      const name=(slug.value||"").trim();
      const publicSlug=name||title.value.trim()||"";
      const url=new URL("../topics.html",location.href);
      if(publicSlug)url.searchParams.set("topic",publicSlug);
      link.href=url.href;
      const path=cover.value.trim();
      let src="";
      if(/^https:\/\//i.test(path))src=path;
      else if(/^\/?assets\//i.test(path))src=new URL("../"+path.replace(/^\//,""),location.href).href;
      if(image.dataset.source!==src){
        image.dataset.source=src;
        if(src){
          image.hidden=false;
          fallback.hidden=true;
          image.src=src;
        }else{
          image.removeAttribute("src");
          image.hidden=true;
          fallback.hidden=false;
          figure.classList.remove("has-missing-image");
        }
      }
    }
    for(const node of [cover,title,description,tone,slug]){
      node.addEventListener("input",refresh);
      node.addEventListener("change",refresh);
    }
    currentUpdate=refresh;
    refresh();
  }
  function init(){
    const view=document.getElementById("view");
    if(!view)return;
    new MutationObserver(enhance).observe(view,{childList:true});
    document.addEventListener("click",event=>{
      if(event.target.closest?.("[data-topic-edit],#newTopicBtn,#cancelTopic"))
        queueMicrotask(()=>currentUpdate?.());
    });
    enhance();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();