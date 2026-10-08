import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseDir=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2",".woff":"font/woff"};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,"http://localhost");
  const pathname=decodeURIComponent(u.pathname).replace(/^\/+/,"");
  let full=path.resolve(baseDir,pathname);
  if(full!==baseDir&&!full.startsWith(baseDir+path.sep)){res.writeHead(403).end();return}
  if(fs.existsSync(full)&&fs.statSync(full).isDirectory())full=path.join(full,"index.html");
  if(!fs.existsSync(full)){res.writeHead(404).end("Not found");return}
  res.setHeader("Content-Type",mime[path.extname(full)]||"application/octet-stream");
  res.setHeader("Cache-Control","no-store");
  res.writeHead(200);fs.createReadStream(full).pipe(res);
 }catch(e){res.writeHead(500).end(String(e))}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const outcomes=[];
async function test(name,fn){
 try{await fn();outcomes.push({name,pass:true});console.log("PASS "+name)}
 catch(e){outcomes.push({name,pass:false,error:String(e)});console.error("FAIL "+name,String(e))}
}
const openContext=async(width,height,{reducedMotion="reduce",touch=false}={})=>{
 const ctx=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion});
 await ctx.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
 return ctx
};
const home=()=>base+"index.html";
await test("Public runtime and new motion scripts compile",async()=>{
 for(const p of ["assets/public-core.js","assets/public-motion.js","assets/public-motion-three.js","assets/public-motion-template.js","assets/public-motion-layout.css","assets/public-motion.css"]){
  assert.ok(fs.existsSync(p),"Missing "+p)
 }
 for(const p of ["assets/public-core.js","assets/public-motion.js","assets/public-motion-three.js","assets/public-motion-template.js"])
  new (await import("node:vm")).Script(fs.readFileSync(p,"utf8"),{filename:p});
});
await test("Desktop Public retains real articles while replacing legacy cover",async()=>{
 const ctx=await openContext(1440,900);
 const page=await ctx.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 await page.goto(home(),{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.querySelector(".intro")&&!document.getElementById("swMotionHomeHost").hidden,{timeout:15000});
 await page.waitForSelector("#latest .bento");
 await page.waitForFunction(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.querySelector(".intro")?.getBoundingClientRect().height>500,{timeout:15000});
 const metrics=await page.evaluate(()=>{
  const h=document.querySelector("#swMotionHomeHost"),r=h.shadowRoot;
  return {visible:!h.hidden,stage:r.querySelector("#motionStory")?.getBoundingClientRect().height||0,header:document.querySelector("#brandHome")!=null,search:document.querySelector("#searchBtn")!=null,nav:document.querySelectorAll("#pager > .pager-items .nav-item").length,articles:document.querySelectorAll("#latest .bento [data-article]").length,oldHero:document.querySelector("#app .sw-liquid-hero")!=null};
 });
 assert.equal(metrics.visible,true);assert.ok(metrics.stage>=850);assert.equal(metrics.nav,5);
 assert.ok(metrics.articles>=1,"Published article cards missing");assert.equal(metrics.oldHero,false);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:"qa-public-v11-desktop.png",fullPage:false});await ctx.close()
});
await test("Real published article navigation and iOS slider preserved",async()=>{
 const ctx=await openContext(1280,870);
 const page=await ctx.newPage();await page.goto(home(),{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#latest [data-article]",{timeout:13000});
 await page.locator("#latest [data-article]").first().click();
 await page.waitForSelector(".article-head h1",{timeout:15000});
 const hidden=await page.locator("#swMotionHomeHost").evaluate(el=>el.hidden);
 assert.equal(hidden,true,"Motion should be absent on article page");
 await page.locator('#pager > .pager-items [data-page="home"]').click();
 await page.waitForFunction(()=>!document.getElementById("swMotionHomeHost")?.hidden,{timeout:13000});
 await page.locator('#pager > .pager-items [data-page="topics"]').click();
 await page.waitForSelector(".topic-grid",{timeout:13000});
 assert.equal(await page.locator("#swMotionHomeHost").evaluate(el=>el.hidden),true);
 await page.locator('#pager > .pager-items [data-page="newsletter"]').click();
 await page.waitForFunction(()=>document.title.includes("電子報"),{timeout:13000});
 assert.ok(await page.locator("#app").innerText().then(x=>x.length>120));
 await ctx.close()
});
await test("Returning home from secondary Public document restores the new motion cover",async()=>{
 const ctx=await openContext(1280,850);
 const page=await ctx.newPage();await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#pager > .pager-items [data-page=home]",{timeout:13000});
 await page.locator("#pager > .pager-items [data-page=home]").click();
 await page.waitForURL(/\/index\.html(?:\?|$)/,{timeout:15000});
 await page.waitForFunction(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.querySelector(".intro")&&!document.getElementById("swMotionHomeHost").hidden,{timeout:15000});
 assert.ok(await page.locator("#latest .bento").count()>=1,"Published feed lost after cross-page navigation");
 await ctx.close()
});
await test("Mobile motion typography remains legible and no horizontal overflow",async()=>{
 const ctx=await openContext(390,844,{touch:true});
 const page=await ctx.newPage();await page.goto(home(),{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.querySelector("#motionStage")&&!document.getElementById("swMotionHomeHost").hidden,{timeout:15000});
 await page.evaluate(()=>document.getElementById("swMotionHomeHost").shadowRoot.querySelector("#motionStory").scrollIntoView());
 await page.waitForTimeout(400);
 const r=await page.evaluate(()=>{
  const root=document.getElementById("swMotionHomeHost").shadowRoot;
  const stage=root.querySelector("#motionStage").getBoundingClientRect();
  const sub=root.querySelector(".stage-sub").getBoundingClientRect();
  const fig=root.querySelector(".edition-figure").getBoundingClientRect();
  return {viewport:innerWidth,stage:{height:stage.height,width:stage.width},text:{top:sub.top,bottom:sub.bottom,width:sub.width},figure:{top:fig.top,bottom:fig.bottom,width:fig.width},overflow:document.documentElement.scrollWidth-innerWidth,pager:document.querySelectorAll("#pager > .pager-items .nav-item").length}
 });
 assert.ok(r.stage.width<=392&&r.stage.height>650,JSON.stringify(r));
 assert.ok(r.figure.width<230,"Mobile artifact not reduced: "+JSON.stringify(r));
 assert.ok(r.text.bottom<r.figure.top+50,"Critical copy covered by figure: "+JSON.stringify(r));
 assert.ok(r.overflow<=3,"Mobile horizontal overflow "+JSON.stringify(r));
 assert.equal(r.pager,5);
 await page.screenshot({path:"qa-public-v11-mobile.png",fullPage:false});
 await ctx.close()
});
await test("CMS motion fields are displayed only in authenticated formal CMS",async()=>{
 const cm=fs.readFileSync("cms/assets/bundles/cms-app.js","utf8");
 const html=fs.readFileSync("cms/index.html","utf8");
 assert.ok(html.includes("CMS_FRAME_BLOCKED"),"CMS frame auth guard missing");
 assert.ok(cm.includes("motionSceneTwoLine1")&&cm.includes("motionNewsletterDescription"));
 assert.ok(cm.includes("if(published!==true)throw new Error"));
});
await test("Production published data populates intro; local draft never appears",async()=>{
 const ctx=await openContext(1280,850);const page=await ctx.newPage();
 await page.goto(home(),{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.querySelector(".intro h1")?.textContent?.length>7,{timeout:13000});
 const [data,text]=await Promise.all([page.request.get(base+"public-data.json").then(x=>x.json()),page.locator("#swMotionHomeHost").evaluate(el=>el.shadowRoot.querySelector(".intro h1").textContent)]);
 assert.ok(data?.siteText);assert.ok(text.includes(data.siteText.motionIntroLead||"不只研究身體"));
 assert.equal(await page.locator('[href^="article.html?story="]').count(),0,"Mock article route leaked to Public");
 await ctx.close()
});
await test("Late-loaded motion frontend hydrates latest published CMS snapshot",async()=>{
 const ctx=await openContext(1280,820);
 const page=await ctx.newPage();
 // Simulate a slow mobile connection where the existing Public data
 // finishes rendering before the motion-enhancement JavaScript executes.
 await page.route("**/assets/public-motion.js?*",async route=>{
  await new Promise(resolve=>setTimeout(resolve,2300));
  await route.continue();
 });
 await page.goto(home(),{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>{
  const snapshot=window.SignWellPublicSnapshot;
  const host=document.getElementById("swMotionHomeHost");
  return snapshot?.page==="home"&&snapshot.ready&&!host?.hidden&&host?.shadowRoot?.querySelector(".intro h1");
 },{timeout:15000});
 const status=await page.evaluate(()=>{
  const snap=window.SignWellPublicSnapshot;
  const root=document.getElementById("swMotionHomeHost").shadowRoot;
  const articles=snap.articles.filter(a=>a.status==="Published"&&a.slug);
  return {
   title:root.querySelector(".intro h1").textContent,
   expectedLead:snap.siteText.motionIntroLead||"不只研究身體，",
   publishedFeatures:document.querySelectorAll("#swMotionFeatures .sw-motion-feature").length,
   expectedFeatured:Math.min(3,articles.length),
   visible:!document.getElementById("swMotionHomeHost").hidden
  };
 });
 assert.equal(status.visible,true);
 assert.ok(status.title.includes(status.expectedLead),JSON.stringify(status));
 assert.equal(status.publishedFeatures,status.expectedFeatured,JSON.stringify(status));
 await ctx.close();
});

await test("Real Three.js WebGL 2K-adaptive buffer and silhouette render",async()=>{
 const ctx=await openContext(1280,860,{reducedMotion:"no-preference"});
 // Keep the test deterministic: serve the pinned Three distribution locally
 // instead of depending on the CDN's availability.
 await ctx.route("https://cdn.jsdelivr.net/npm/three@0.180.0/build/**",async route=>{
  const file=route.request().url().split("/build/")[1]?.split("?")[0];
  if(!["three.module.js","three.core.js"].includes(file)){await route.abort();return}
  await route.fulfill({
   path:path.join(baseDir,"node_modules","three","build",file),
   headers:{"access-control-allow-origin":"*","content-type":"text/javascript"}
  });
 });
 const page=await ctx.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 await page.goto(home(),{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!document.getElementById("swMotionHomeHost")?.hidden,{timeout:16000});
 await page.evaluate(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.getElementById("motionStory")?.scrollIntoView());
 await page.waitForFunction(()=>{
  const stage=document.getElementById("swMotionHomeHost")?.shadowRoot?.getElementById("motionStage");
  return stage?.dataset.renderer?.startsWith("three");
 },{timeout:27000});
 const metrics=await page.evaluate(()=>{
  const root=document.getElementById("swMotionHomeHost").shadowRoot;
  const host=root.querySelector(".webgl-figure-host");
  const canvas=root.querySelector(".webgl-figure-canvas");
  return {stageWidth:root.querySelector("#motionStage").clientWidth,
   canvasCssWidth:host.clientWidth,canvasCssHeight:host.clientHeight,
   bufferWidth:canvas.width,bufferHeight:canvas.height,
   resolution:canvas.dataset.resolution,
   quality:canvas.dataset.quality,
   maxRatio:parseFloat(canvas.dataset.pixelRatio),
   renderer:root.getElementById("motionStage").dataset.renderer};
 });
 assert.ok(metrics.bufferWidth>0&&metrics.bufferHeight>0,JSON.stringify(metrics));
 assert.ok(metrics.bufferWidth<=2048&&metrics.bufferHeight<=2048,"Exceeds 2K cap: "+JSON.stringify(metrics));
 assert.ok(metrics.canvasCssWidth<metrics.stageWidth*.85,"Did not crop GPU buffer: "+JSON.stringify(metrics));
 assert.ok(metrics.maxRatio>=.8&&metrics.maxRatio<=2.71,"DPR governor invalid: "+JSON.stringify(metrics));
 assert.ok(!errors.length,"Page errors: "+errors.join("; "));
 console.log("GPU desktop metrics",JSON.stringify(metrics));
 await page.screenshot({path:"qa-public-v12-webgl-desktop.png",fullPage:false});
 await ctx.close()
});
await test("Mobile WebGL canvas stays in reading-safe area at Retina DPR",async()=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,reducedMotion:"no-preference"});
 await ctx.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await ctx.route("https://cdn.jsdelivr.net/npm/three@0.180.0/build/**",async route=>{
  const file=route.request().url().split("/build/")[1]?.split("?")[0];
  if(!["three.module.js","three.core.js"].includes(file)){await route.abort();return}
  await route.fulfill({path:path.join(baseDir,"node_modules","three","build",file),headers:{"access-control-allow-origin":"*","content-type":"text/javascript"}})
 });
 const page=await ctx.newPage();
 await page.goto(home(),{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!document.getElementById("swMotionHomeHost")?.hidden,{timeout:16000});
 await page.evaluate(()=>document.getElementById("swMotionHomeHost").shadowRoot.getElementById("motionStory").scrollIntoView());
 await page.waitForFunction(()=>{
  const stage=document.getElementById("swMotionHomeHost")?.shadowRoot?.getElementById("motionStage");
  return stage?.dataset.renderer?.startsWith("three");
 },{timeout:27000});
 const m=await page.evaluate(()=>{
  const r=document.getElementById("swMotionHomeHost").shadowRoot;
  const canvas=r.querySelector(".webgl-figure-canvas");
  const bounds=r.querySelector(".webgl-figure-host").getBoundingClientRect();
  const heading=r.querySelector(".stage-sub").getBoundingClientRect();
  return {view:innerWidth,ratio:parseFloat(canvas.dataset.pixelRatio),
   quality:canvas.dataset.quality,pixels:canvas.width*canvas.height,
   buffer:[canvas.width,canvas.height],canvas:bounds.toJSON(),
   heading:heading.toJSON()};
 });
 assert.ok(m.ratio<=1.56,"Mobile DPR too high: "+JSON.stringify(m));
 assert.ok(m.pixels<=1350000,"Mobile GPU budget exceeded: "+JSON.stringify(m));
 assert.ok(m.heading.bottom<m.canvas.top+55,"Foreground blocks legible text: "+JSON.stringify(m));
 assert.ok(m.canvas.width<m.view,"Canvas unexpectedly full viewport width: "+JSON.stringify(m));
 console.log("GPU mobile metrics",JSON.stringify({ratio:m.ratio,quality:m.quality,buffer:m.buffer,canvasWidth:m.canvas.width}));
 await page.screenshot({path:"qa-public-v12-webgl-mobile.png",fullPage:false});
 await ctx.close()
});

await browser.close();await new Promise(resolve=>server.close(resolve));
const passed=outcomes.filter(x=>x.pass).length;
console.log("\n"+passed+"/"+outcomes.length+" browser and regression tests passed");
if(passed!==outcomes.length)process.exitCode=1;
