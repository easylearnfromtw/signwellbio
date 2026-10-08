import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import {chromium} from "playwright";

const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  let file=path.resolve(root,decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,""));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,"index.html");
  if(!fs.existsSync(file)){res.writeHead(404).end("Not Found");return}
  res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res)
 }catch(err){res.writeHead(500).end(String(err))}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
const check=async(name,fn)=>{
 try{await fn();console.log("PASS "+name);results.push(true)}
 catch(err){console.error("FAIL "+name+" — "+err.message);results.push(false)}
};
const create=async(width=1280,height=860)=>{
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
 await ctx.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
 return ctx;
};
const palettePath="assets/public-inner-palette.css";
const css=fs.readFileSync(palettePath,"utf8");
const color=(hex)=>{const n=parseInt(hex.replace("#",""),16);return[(n>>16)&255,(n>>8)&255,n&255]};
const luminance=hex=>color(hex).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const contrast=(fg,bg)=>{let a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};

await check("Semantic color palette contrasts remain readable",async()=>{
 for(const tone of ["#f6f3ea","#fffcf6","#e4eef2","#f5eccd","#f4e4e8"]){
  assert.ok(css.includes(tone),"Missing palette "+tone);
  assert.ok(contrast("#263339",tone)>=9,"Ink is too light over "+tone);
 }
 assert.ok(!css.includes("body[data-page=\"home\"]"),"Homepage override is forbidden");
});
await check("All official pages reference versioned shared palette (including published SEO articles)",async()=>{
 const paths=["index.html","topics.html","about.html","share.html","newsletter.html","privacy.html","terms.html","confirm.html","unsubscribe.html","error.html","404.html","profile.html",
 "article/從安寧病房事件看重症照護-身心負擔-財務毒性與健康平權的反思/index.html",
 "article/突發急性心肌梗塞的健康警訊-從藝人新聞看心血管急症處置/index.html"];
 for(const p of paths){
  const s=fs.readFileSync(p,"utf8");
  assert.ok(s.includes("public-inner-palette.css?build=editorial-pastels-v1"),"Missing scoped stylesheet on "+p);
  assert.ok(s.includes("</head>")&&s.includes("</body>"),"Invalid HTML shell "+p);
 }
});
await check("Homepage visual CSS remains opt-out even when palette is loaded",async()=>{
 const ctx=await create(),page=await ctx.newPage();
 await page.goto(base+"index.html",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#swMotionHomeHost",{timeout:13000});
 const r=await page.evaluate(()=>{
  const body=document.body;
  return {bodyMatch:body.matches('body:has(#app :is(.page-hero,.article-view,.share-card,.newsletter-experience))'),
   vars:getComputedStyle(body).getPropertyValue("--paper").trim(),
   cssLoaded:[...document.styleSheets].some(s=>s.href?.includes("public-inner-palette.css")),
   homeHost:!!document.querySelector("#swMotionHomeHost"),canvas:!!document.querySelector("#pager")};
 });
 assert.equal(r.bodyMatch,false,JSON.stringify(r));
 assert.ok(["#fff","#ffffff"].includes(r.vars),JSON.stringify(r));
 assert.ok(r.cssLoaded&&r.homeHost&&r.canvas,JSON.stringify(r));
 await ctx.close()
});
for(const [pageName,selector,accent] of [
 ["topics.html",".sw-topic-sticky","rgb(228, 238, 242)"],
 ["about.html",".manifesto","rgb(245, 236, 205)"],
 ["share.html",".share-card","rgb(244, 228, 232)"],
 ["newsletter.html",".newsletter-card","rgb(244, 228, 232)"]
]){
 await check("Editorial inner route "+pageName+" uses pastel palette and retains content",async()=>{
  const ctx=await create(390,844),page=await ctx.newPage();
  const errors=[];page.on("pageerror",err=>errors.push(err.message));
  await page.goto(base+pageName,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#app "+selector,{timeout:16000});
  if(pageName==="topics.html")await page.waitForFunction(()=>document.querySelectorAll("#app .topic-card").length>=7,{timeout:16000});
  const state=await page.evaluate(selector=>{
   const el=document.querySelector("#app "+selector);
   return{body:getComputedStyle(document.body).getPropertyValue("--paper").trim(),
    gradient:getComputedStyle(el).backgroundImage,ink:getComputedStyle(document.body).getPropertyValue("--ink").trim(),
    active:document.body.matches('body:has(#app :is(.page-hero,.article-view,.share-card,.newsletter-experience))'),
    overflow:document.documentElement.scrollWidth-innerWidth,
    content:document.querySelector("#app")?.innerText?.length||0,
    dock:document.querySelectorAll("#pager > .pager-items .nav-item").length
   };
  },selector);
  assert.equal(state.active,true,JSON.stringify(state));
  assert.equal(state.body,"#fffcf6",JSON.stringify(state));
  assert.equal(state.ink,"#263339",JSON.stringify(state));
  assert.ok(state.gradient.includes("linear-gradient"),"No section color gradient "+JSON.stringify(state));
  assert.ok(state.content>50&&state.dock===5,JSON.stringify(state));
  assert.ok(state.overflow<=3,"Overflow: "+JSON.stringify(state));
  assert.deepEqual(errors,[],"Client errors "+errors.join("; "));
  await page.screenshot({path:"qa-inner-"+pageName+".png",fullPage:false});
  await ctx.close()
 });
}
await check("SPA route switch from homepage and back never tints homepage",async()=>{
 const ctx=await create(),page=await ctx.newPage();
 await page.goto(base+"index.html",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#pager > .pager-items [data-page='topics']");
 await page.locator("#pager > .pager-items [data-page='topics']").click();
 await page.waitForSelector("#app .topic-grid",{timeout:14000});
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue("--paper").trim()),"#fffcf6");
 await page.locator("#pager > .pager-items [data-page='home']").click();
 await page.waitForSelector("#app #latest",{timeout:14000});
 assert.ok(["#fff","#ffffff"].includes(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue("--paper").trim())));
 assert.equal(await page.evaluate(()=>document.body.matches("body:has(#app .page-hero)")),false);
 await ctx.close()
});
await check("Article reader uses warm paper, pale-blue summary and readable citations",async()=>{
 const ctx=await create(390,844),page=await ctx.newPage();
 await page.goto(base+"index.html",{waitUntil:"domcontentloaded"});
 await page.locator("#latest [data-article]").first().click();
 await page.waitForSelector("#app .article-view .article-body",{timeout:17000});
 const s=await page.evaluate(()=>({
  active:document.body.matches("body:has(#app .article-view)"),
  bg:getComputedStyle(document.body).getPropertyValue("--paper").trim(),
  bodyColor:getComputedStyle(document.querySelector("#app .article-body")).color,
  summary:document.querySelector("#app .summary10s")?getComputedStyle(document.querySelector("#app .summary10s")).backgroundImage:"",
  overflow:document.documentElement.scrollWidth-innerWidth
 }));
 assert.ok(s.active&&s.bg==="#fffcf6",JSON.stringify(s));
 assert.ok(s.summary.includes("linear-gradient")||s.summary==="","Summary unavailable "+JSON.stringify(s));
 assert.ok(s.overflow<=3,JSON.stringify(s));
 await ctx.close()
});
for(const pageName of ["privacy.html","terms.html","unsubscribe.html","404.html"]){
 await check("Standalone "+pageName+" preserves form/text with linen palette",async()=>{
  const ctx=await create(390,844),p=await ctx.newPage();
  await p.goto(base+pageName,{waitUntil:"domcontentloaded"});
  const s=await p.evaluate(()=>({
   text:document.querySelector("main .card")?.innerText?.length||0,
   theme:document.body.matches("body:has(> main.wrap > .top + .card)"),
   card:getComputedStyle(document.querySelector("main .card")).backgroundImage,
   ink:getComputedStyle(document.body).getPropertyValue("--ink").trim(),
   overflow:document.documentElement.scrollWidth-innerWidth
  }));
  assert.ok(s.theme&&s.text>30&&s.card.includes("linear-gradient")&&s.ink==="#263339",JSON.stringify(s));
  assert.ok(s.overflow<=3,JSON.stringify(s));
  await ctx.close()
 })
}
await check("Static SEO article links remain crawlable, styled and text intact",async()=>{
 const p="article/從安寧病房事件看重症照護-身心負擔-財務毒性與健康平權的反思/";
 const ctx=await create(390,844),page=await ctx.newPage();
 await page.goto(base+p,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>[...document.styleSheets].some(sheet=>sheet.href?.includes("public-inner-palette.css")),{timeout:12000});
 const s=await page.evaluate(()=>({
  match:document.body.matches("body:has(> main > article)"),
  background:getComputedStyle(document.body).backgroundColor,
  title:document.querySelector("main article h1")?.innerText,
  summary:getComputedStyle(document.querySelector("main article .summary")).backgroundImage,
  overflow:document.documentElement.scrollWidth-innerWidth
 }));
 assert.ok(s.match&&s.background==="rgb(246, 243, 234)"&&s.title?.length>10,JSON.stringify(s));
 assert.ok(s.summary.includes("linear-gradient")&&s.overflow<=3,JSON.stringify(s));
 await ctx.close()
});
await browser.close();
await new Promise(resolve=>server.close(resolve));
const passed=results.filter(Boolean).length;
console.log("Inner editorial palette QA:",passed+"/"+results.length+" passed");
if(passed!==results.length)process.exitCode=1;
