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
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
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
await browser.close();await new Promise(resolve=>server.close(resolve));
const passed=outcomes.filter(x=>x.pass).length;
console.log("\n"+passed+"/"+outcomes.length+" browser and regression tests passed");
if(passed!==outcomes.length)process.exitCode=1;
