/* SIGNWELL BIO / Topic Atlas Tape
   Mirrors the physical roll-to-lay structure of SIGNWELL Technology's
   giving scene, but each laid paper is an actual native topic button.
   Zero canvases, no extra scroll interception, no WebGL or external libs.
*/
(()=>{"use strict";
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
  let instance=null,queued=false;
  /* Keyboard- and touch-friendly access to every sheet, including sheets
     covered by the physical stack. The papers remain the real topic buttons. */
  function buildIndex(rail,cards){
    const stage=rail.querySelector(".sw-topic-sticky");
    if(!stage)return null;
    const wrap=document.createElement("div");
    wrap.className="sw-topic-atlas";
    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="sw-topic-atlas-toggle";
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-controls","sw-topic-atlas-list");
    toggle.textContent="主題快速索引 ";
    const count=document.createElement("span");
    count.className="sw-topic-atlas-count";
    count.textContent="01 / "+String(cards.length).padStart(2,"0");
    toggle.append(count);
    const list=document.createElement("nav");
    list.id="sw-topic-atlas-list";
    list.className="sw-topic-atlas-list";
    list.setAttribute("aria-label","選擇主題專欄");
    list.hidden=true;
    const buttons=cards.map((paper,i)=>{
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="sw-topic-atlas-item";
      const numeral=document.createElement("span");
      numeral.className="sw-topic-atlas-no";
      numeral.textContent=String(i+1).padStart(2,"0");
      const label=document.createElement("span");
      label.textContent=paper.querySelector("strong")?.textContent||"主題專欄";
      btn.append(numeral,label);
      btn.addEventListener("click",()=>{
        list.hidden=true;
        toggle.setAttribute("aria-expanded","false");
        paper.click();
      });
      list.append(btn);
      return btn;
    });
    toggle.addEventListener("click",()=>{
      const open=list.hidden;
      list.hidden=!open;
      toggle.setAttribute("aria-expanded",String(open));
    });
    wrap.append(toggle,list);
    stage.append(wrap);
    return {wrap,toggle,list,count,buttons};
  }
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&instance?.atlas&&!instance.atlas.list.hidden){
      instance.atlas.list.hidden=true;
      instance.atlas.toggle.setAttribute("aria-expanded","false");
      instance.atlas.toggle.focus();
    }
  });
  document.addEventListener("pointerdown",event=>{
    if(instance?.atlas&&!instance.atlas.wrap.contains(event.target)){
      instance.atlas.list.hidden=true;
      instance.atlas.toggle.setAttribute("aria-expanded","false");
    }
  },{passive:true});
  function update(){
    queued=false;
    if(!instance||!instance.rail.isConnected||reduced.matches)return;
    const {rail,cards,progressLabel,atlas}=instance;
    const top=rail.getBoundingClientRect().top;
    const distance=Math.max(1,rail.offsetHeight-innerHeight);
    const p=clamp(-top/distance),total=cards.length;
    const position=p*total,active=Math.min(total-1,Math.max(0,Math.floor(position)));
    progressLabel.textContent=String(active+1).padStart(2,"0")+" / "+String(total).padStart(2,"0");
    if(atlas){
      atlas.count.textContent=progressLabel.textContent;
      atlas.buttons.forEach((button,i)=>{
        button.classList.toggle("is-laid",i<=active);
        button.classList.toggle("is-current",i===active);
        if(i===active)button.setAttribute("aria-current","true");
        else button.removeAttribute("aria-current");
      });
    }
    rail.style.setProperty("--sw-topic-roll-angle",(p*720).toFixed(1)+"deg");
    rail.style.setProperty("--sw-topic-feed",Math.round(35+ease(position-active)*100)+"px");
    cards.forEach((card,i)=>{
      const local=ease((position-i+.34)/.91);
      const depth=Math.max(0,active-i);
      const isLaid=local>.03;
      const angle=[-5.4,3.2,-2.5,4.2,-4,2.6,-1.6][i%7];
      const fall=(1-local)*-innerHeight*.69;
      const x=-depth*(matchMedia("(max-width:720px)").matches?13:20);
      const y=fall-depth*(matchMedia("(max-width:720px)").matches?23:30);
      const scale=Math.max(.82,1-depth*.034);
      card.style.transform="translate(-50%,-50%) translate3d("+x.toFixed(1)+"px,"+y.toFixed(1)+"px,0) rotate("+((1-local)*-13+angle*local).toFixed(2)+"deg) scale("+scale.toFixed(3)+")";
      card.style.opacity=isLaid?String(Math.min(1,local*2.5)):"0";
      card.style.zIndex=String(5+i);
      const topCard=isLaid&&i===active;
      card.classList.toggle("is-top",topCard);
      // All laid and visible papers remain keyboard/click accessible, not just the top card.
      card.style.pointerEvents=isLaid?"auto":"none";
      card.tabIndex=isLaid?0:-1;
      card.setAttribute("aria-hidden",String(!isLaid));
    });
  }
  function schedule(){
    if(!queued){queued=true;requestAnimationFrame(update)}
  }
  function bind(){
    const rail=document.querySelector("#app [data-sw-topic-tape]");
    if(!rail){instance=null;return}
    if(instance?.rail===rail)return;
    const cards=[...rail.querySelectorAll(".sw-topic-paper")];
    const progressLabel=rail.querySelector("[data-sw-topic-current]");
    if(!cards.length||!progressLabel)return;
    instance={rail,cards,progressLabel,atlas:buildIndex(rail,cards)};
    rail.classList.add("is-ready");
    if(reduced.matches){
      cards.forEach(c=>{c.tabIndex=0;c.style.pointerEvents="auto"});
    }else update();
    rail.addEventListener("focusin",event=>{
      const i=cards.indexOf(event.target.closest(".sw-topic-paper"));
      if(i>=0&&i<cards.length&&!reduced.matches){
        progressLabel.textContent=String(i+1).padStart(2,"0")+" / "+String(cards.length).padStart(2,"0");
      }
    });
  }
  document.addEventListener("signwell:render",()=>{bind();schedule()});
  addEventListener("scroll",schedule,{passive:true});
  addEventListener("resize",schedule,{passive:true});
  reduced.addEventListener?.("change",()=>{if(instance){instance.rail.classList.add("is-ready");instance.cards.forEach(c=>{c.style.pointerEvents=reduced.matches?"auto":"none";c.tabIndex=reduced.matches?0:-1;c.setAttribute("aria-hidden",String(!reduced.matches))});schedule()}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();
