import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
const srv=http.createServer((req,res)=>{
  try{
    let f=path.resolve(root,decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,""));
    if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
    if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,"index.html");
    if(!fs.existsSync(f)){res.writeHead(404).end("not found");return}
    res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"});
    fs.createReadStream(f).pipe(res);
  }catch(e){res.writeHead(500).end(String(e))}
});
await new Promise(resolve=>srv.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+srv.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const tests=[];
async function check(name,fn){
 try{await fn();tests.push(true);console.log("PASS",name)}
 catch(e){tests.push(false);console.error("FAIL",name,e.message)}
}
const routeLocal=ctx=>ctx.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
const getCtx=async (width=1280,height=850,reduced="no-preference")=>{
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:reduced});
 await routeLocal(ctx);
 return ctx;
};
const names=["白話醫學論文專欄","抗衰老醫學專欄","預防醫學專欄","青少年專欄","美學醫學專欄","男性醫學專欄","時事醫學專欄"];
await check("Seven CMS-backed taxonomy records and unique tape covers",async()=>{
 const published=JSON.parse(fs.readFileSync("public-data.json","utf8"));
 const file=JSON.parse(fs.readFileSync("topics/index.json","utf8"));
 const topics=published.topics.filter(x=>x.active!==false&&x.tapeFeatured);
 assert.equal(topics.length,7);
 assert.deepEqual(topics.map(x=>x.name),names);
 assert.deepEqual(file.filter(x=>x.tapeFeatured&&x.active!==false).map(x=>x.name),names);
 for(const t of topics){assert.ok(fs.existsSync(t.cover),"Missing cover "+t.cover);assert.ok(["linen","blue","blush","butter"].includes(t.tapeTone));}
 const cms=fs.readFileSync("cms/assets/bundles/cms-app.js","utf8");
 for(const key of ["topicCover","topicTapeTone","topicTapeFeatured","topicActive","saveTopicOnline","publishTopicsOnly","verifyPublishedTopics","assertSignwellMigrationTarget"])assert.ok(cms.includes(key),"CMS lost "+key);
});
await check("Desktop paper roller progressively stacks and each laid page is actionable",async()=>{
 const ctx=await getCtx();
 const page=await ctx.newPage();
 const errors=[];page.on("pageerror",x=>errors.push(x.message));
 await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelectorAll("#app .sw-topic-paper").length===7,{timeout:15000});
 await page.waitForFunction(()=>document.querySelector("#app .sw-topic-tape")?.classList.contains("is-ready"),{timeout:15000});
 await page.waitForFunction(()=>window.SignWellPublicSnapshot?.ready===true,{timeout:15000});
 const first=await page.locator("#app .sw-topic-paper").first().evaluate(el=>({opacity:+getComputedStyle(el).opacity,tab:el.tabIndex}));
 assert.ok(first.opacity>0.1,"First paper invisible "+JSON.stringify(first));
 await page.evaluate(()=>{const el=document.querySelector("#topicTape");const start=el.getBoundingClientRect().top+scrollY;scrollTo({top:start+(el.offsetHeight-innerHeight)*.46,behavior:"instant"})});
 await page.waitForTimeout(200);
 const middle=await page.locator("#app .sw-topic-paper").evaluateAll(els=>els.map(el=>({opacity:+getComputedStyle(el).opacity,tab:el.tabIndex,text:el.querySelector("strong")?.textContent})));
 assert.ok(middle.filter(x=>x.opacity>.3).length>=2,"Stacked chapters not visible "+JSON.stringify(middle));
 const active=await page.locator("#app .sw-topic-paper.is-top").count();
 assert.equal(active,1,"Single top page should be tracked");
 const current=page.locator("#app .sw-topic-paper.is-top");const slug=await current.getAttribute("data-topic");
 await current.click({force:true});
 await page.waitForFunction(()=>location.search.includes("topic="),{timeout:12000});
 assert.equal(new URL(page.url()).searchParams.get("topic"),slug);
 assert.ok(await page.locator("#topicArticles .section-head").count()>=1,"Topic selection did not render published article state");
 assert.deepEqual(errors,[]);
 await page.screenshot({path:"qa-topic-atlas-desktop.png",fullPage:false});
 await ctx.close();
});
await check("iPhone tape fits and links remain clickable through stacked animation",async()=>{
 const ctx=await getCtx(390,844);
 const page=await ctx.newPage();await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#app .sw-topic-paper");
 await page.waitForFunction(()=>document.querySelector("#app .sw-topic-tape")?.classList.contains("is-ready"),{timeout:12000});
 await page.waitForFunction(()=>window.SignWellPublicSnapshot?.ready===true,{timeout:15000});
 await page.evaluate(()=>{const el=document.querySelector("#topicTape");const start=el.getBoundingClientRect().top+scrollY;window.scrollTo({top:start+(el.offsetHeight-innerHeight)*.78,behavior:"instant"})});
 await page.waitForTimeout(200);
 const metrics=await page.evaluate(()=>{
  const t=document.querySelector("#topicTape"),paper=t.querySelector(".sw-topic-paper.is-top"),skip=t.querySelector(".sw-topic-skip");
  return {overflow:document.documentElement.scrollWidth-innerWidth,top:paper?.getBoundingClientRect().toJSON(),skip:skip.getBoundingClientRect().toJSON(),buttonCount:t.querySelectorAll("button[data-topic]").length,progress:t.querySelector("[data-sw-topic-current]").textContent};
 });
 assert.equal(metrics.buttonCount,7);
 assert.ok(metrics.top?.width<390&&metrics.top?.height>200,JSON.stringify(metrics));
 assert.ok(metrics.overflow<=3,"Horizontal overflow "+JSON.stringify(metrics));
 await page.screenshot({path:"qa-topic-atlas-mobile.png",fullPage:false});
 await page.locator(".sw-topic-skip").click();
 await page.waitForFunction(()=>{const d=document.querySelector("#topicDirectory");return location.hash==="#topicDirectory"&&d.getBoundingClientRect().top<300},{timeout:15000});
 const action=page.locator("#topicDirectory .topic-card").first();
 await action.click();
 await page.waitForSelector("#topicArticles .section-head",{timeout:15000});
 await ctx.close();
});
await check("Reduced-motion fallback shows all seven accessible cards",async()=>{
 const ctx=await getCtx(390,844,"reduce");
 const page=await ctx.newPage();await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await page.waitForSelector(".sw-topic-paper");
 const data=await page.locator(".sw-topic-paper").evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,opacity:getComputedStyle(el).opacity,tab:el.tabIndex,hidden:el.getAttribute("aria-hidden")})));
 assert.equal(data.length,7);
 assert.ok(data.every(x=>x.height>150&&x.opacity==="1"&&x.tab>=0),"Cards not accessible "+JSON.stringify(data));
 await ctx.close();
});
await browser.close();await new Promise(resolve=>srv.close(resolve));
const passed=tests.filter(Boolean).length;
console.log("Topic tape and CMS QA:",passed+"/"+tests.length);
if(passed!==tests.length)process.exitCode=1;
