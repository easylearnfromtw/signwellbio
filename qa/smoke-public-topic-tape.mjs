import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import {chromium} from "playwright";

const root=process.cwd(),mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  let f=path.resolve(root,decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,""));
  if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,"index.html");
  if(!fs.existsSync(f)){res.writeHead(404).end("Not Found");return}
  res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(f).pipe(res)
 }catch(e){res.writeHead(500).end(String(e))}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const checks=[];
async function check(name,fn){
 try{await fn();checks.push(true);console.log("PASS "+name)}
 catch(error){checks.push(false);console.error("FAIL "+name+" — "+error.message)}
}
const context=async(width=1280,height=880,reducedMotion="no-preference")=>{
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<=430,hasTouch:width<=430,reducedMotion});
 await ctx.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
 return ctx
};
await check("Seven published medical columns and five existing categories retained",async()=>{
 const index=JSON.parse(fs.readFileSync("topics/index.json","utf8"));
 const pub=JSON.parse(fs.readFileSync("public-data.json","utf8"));
 const names=["白話醫學論文專欄","抗衰老醫學專欄","預防醫學專欄","青少年專欄","美學醫學專欄","男性醫學專欄","時事醫學專欄"];
 assert.equal(index.length,12);
 assert.equal(index.filter(t=>t.tapeFeatured&&t.active).length,7);
 assert.deepEqual(index.slice(0,7).map(t=>t.name),names);
 assert.deepEqual(pub.topics.map(t=>t.id),index.map(t=>t.id));
 for(const t of index.slice(0,7)){
  assert.ok(t.description&&t.cover&&t.tapeTone&&t.slug);
  assert.ok(fs.existsSync(t.cover),"Artwork missing "+t.cover);
 }
 assert.ok(index.some(t=>t.name==="營養品科普"&&!t.tapeFeatured));
 assert.ok(index.some(t=>t.name==="時事探討"&&!t.tapeFeatured));
});
await check("Formal CMS topic controls and real publish serialization",async()=>{
 const s=fs.readFileSync("cms/assets/bundles/cms-app.js","utf8");
 for(const marker of ['id="topicCover"','id="topicTapeTone"','id="topicTapeFeatured"',"tapeFeatured:x.tapeFeatured===true","cover:String(x.cover||'').trim().slice(0,700)","await publishTopicsOnly()","topicsTapeGuide","topicsDirectoryTitle"])
  assert.ok(s.includes(marker),"Missing CMS integration "+marker);
 new (await import("node:vm")).Script(s);
});
await check("Desktop scene creates seven covers with native scroll and clickable paper cards",async()=>{
 const ctx=await context();
 const p=await ctx.newPage();const errors=[];p.on("pageerror",e=>errors.push(String(e)));
 await p.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await p.waitForFunction(()=>document.querySelectorAll("#app .sw-topic-paper").length===7&&document.querySelector("#app .sw-topic-tape.is-ready"),{timeout:14000});
 await p.waitForFunction(()=>document.querySelectorAll("#topicDirectory .topic-card").length===12,{timeout:14000});
 const init=await p.evaluate(()=>{
  const rail=document.querySelector("#topicTape");
  return{height:rail.offsetHeight,viewport:innerHeight,cards:rail.querySelectorAll("button.sw-topic-paper[data-topic]").length,directory:document.querySelectorAll("#topicDirectory .topic-card").length,overflow:document.documentElement.scrollWidth-innerWidth};
 });
 assert.ok(init.height>init.viewport*4,"Story rail not scrollable "+JSON.stringify(init));
 assert.equal(init.cards,7);assert.equal(init.directory,12);assert.ok(init.overflow<=3,JSON.stringify(init));
 await p.evaluate(()=>{
  const rail=document.querySelector("#topicTape");
  const distance=rail.offsetHeight-innerHeight;
  window.scrollTo({top:rail.getBoundingClientRect().top+scrollY+distance*.45,behavior:'instant'});
 });
 await p.waitForFunction(()=>document.querySelector('#topicTape .sw-topic-current')?.textContent?.trim()!=='01 / 07',{timeout:7500});
 await p.waitForTimeout(180);
 const state=await p.evaluate(()=>{
  const rail=document.querySelector("#topicTape");
  const cards=[...rail.querySelectorAll(".sw-topic-paper")];
  const top=cards.filter(c=>c.classList.contains("is-top"));
  return{now:rail.querySelector(".sw-topic-current").textContent,top:top.length,
    active:top[0]?.dataset.topic||"",visible:cards.filter(c=>parseFloat(c.style.opacity)>.5).length,
    transforms:cards.map(c=>c.style.transform.length>0),horizontal:document.documentElement.scrollWidth-innerWidth};
 });
 assert.ok(state.top===1&&state.visible>=2&&state.transforms.every(Boolean),JSON.stringify(state));
 assert.ok(state.horizontal<=3,JSON.stringify(state));
 await p.screenshot({path:"qa-topic-tape-desktop.png",fullPage:false});
 await p.locator(".sw-topic-paper.is-top").click();
 await p.waitForFunction(()=>document.querySelector("#topicArticles .section-head h2"),{timeout:13000});
 assert.ok(new URL(p.url()).searchParams.has("topic"),"Topic click did not update deep link");
 assert.ok((await p.locator("#topicArticles").innerText()).length>10,"Topic filter did not render");
 assert.deepEqual(errors,[]);
 await ctx.close()
});
for(const width of [320,390,430]){
 await check("Mobile "+width+" paper stack, reading path and dock",async()=>{
  const ctx=await context(width,844),page=await ctx.newPage();
  await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#topicTape.is-ready")?.querySelectorAll(".sw-topic-paper").length===7,{timeout:14000});
  const first=await page.evaluate(()=>{
   const rail=document.querySelector("#topicTape"),distance=rail.offsetHeight-innerHeight;
   window.scrollTo({top:rail.getBoundingClientRect().top+scrollY+distance*.27,behavior:'instant'});
   return true;
  });
  await page.waitForFunction(()=>document.querySelector('#topicTape .sw-topic-current')?.textContent?.trim()!=='01 / 07',{timeout:7500});
  await page.waitForTimeout(180);
  const ui=await page.evaluate(()=>{
   const rail=document.querySelector("#topicTape"),top=rail.querySelector(".sw-topic-paper.is-top");
   return{width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
     heading:document.querySelector(".page-hero h1").textContent,
     visibleCards:[...rail.querySelectorAll(".sw-topic-paper")].filter(e=>parseFloat(e.style.opacity)>.65).length,
     interactive:!!top&&getComputedStyle(top).pointerEvents==="auto",
     counter:rail.querySelector("[data-sw-topic-current]").textContent,
     nav:document.querySelectorAll("#pager > .pager-items .nav-item").length};
  });
  assert.ok(ui.interactive&&ui.nav===5&&ui.overflow<=3,JSON.stringify(ui));
  assert.ok(ui.visibleCards>=1,JSON.stringify(ui));
  await page.screenshot({path:"qa-topic-tape-mobile-"+width+".png",fullPage:false});
  await ctx.close()
 })
}
await check("Reduced-motion mode exposes all seven accessible paper buttons",async()=>{
 const ctx=await context(390,844,"reduce"),p=await ctx.newPage();
 await p.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await p.waitForFunction(()=>document.querySelectorAll(".sw-topic-paper").length===7,{timeout:14000});
 const r=await p.evaluate(()=>{
  const cards=[...document.querySelectorAll(".sw-topic-paper")],rail=document.querySelector("#topicTape");
  return{grid:getComputedStyle(rail.querySelector(".sw-topic-paper-stack")).display,
    tabbable:cards.filter(x=>x.tabIndex>=0).length,
    opacity:cards.map(c=>getComputedStyle(c).opacity),
    clickability:cards.every(x=>getComputedStyle(x).pointerEvents!=="none")};
 });
 assert.equal(r.grid,"grid");assert.equal(r.tabbable,7);assert.ok(r.clickability,JSON.stringify(r));
 await p.locator(".sw-topic-paper").first().click();
 await p.waitForSelector("#topicArticles .section-head",{timeout:14000});
 await ctx.close()
});
await check("SPA home navigation remains unchanged and tape rebinds after route return",async()=>{
 const ctx=await context(),p=await ctx.newPage();
 await p.goto(base+"index.html",{waitUntil:"domcontentloaded"});
 await p.waitForSelector("#swMotionHomeHost");
 await p.locator('#pager > .pager-items [data-page="topics"]').click();
 await p.waitForSelector("#topicTape.is-ready",{timeout:15000});
 await p.locator('#pager > .pager-items [data-page="about"]').click();
 await p.waitForSelector("#app .manifesto",{timeout:15000});
 await p.locator('#pager > .pager-items [data-page="topics"]').click();
 await p.waitForSelector("#topicTape.is-ready",{timeout:15000});
 assert.equal(await p.locator(".sw-topic-paper").count(),7);
 await p.locator('#pager > .pager-items [data-page="home"]').click();
 await p.waitForSelector("#swMotionHomeHost",{timeout:15000});
 assert.equal(await p.locator("#topicTape").count(),0);
 await ctx.close()
});
await browser.close();
await new Promise(resolve=>server.close(resolve));
const ok=checks.filter(Boolean).length;
console.log("Medical topic stack QA "+ok+"/"+checks.length+" passed");
if(ok!==checks.length)process.exitCode=1;
