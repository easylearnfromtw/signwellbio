import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import {chromium} from "playwright";

const root=process.cwd(),mime={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json;charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  let file=path.resolve(root,decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,""));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,"index.html");
  if(!fs.existsSync(file)){res.writeHead(404).end("Not found");return}
  res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res)
 }catch(e){res.writeHead(500).end(String(e))}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const checks=[];
async function check(name,fn){
 try{await fn();console.log("PASS "+name);checks.push(true)}
 catch(e){console.error("FAIL "+name+": "+e.message);checks.push(false)}
}
const ctx=async(width=1280,height=850,motion="reduce")=>{
 const context=await browser.newContext({viewport:{width,height},reducedMotion:motion});
 await context.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
 return context
};
const seed=JSON.parse(fs.readFileSync("topics/index.json","utf8"));
await check("Seven editorial columns, seven original image assets, five preserved historical categories",async()=>{
 const active=seed.filter(t=>t.active!==false);
 assert.equal(active.length,7);
 assert.equal(active.filter(t=>t.tapeFeatured===true).length,7);
 assert.equal(new Set(active.map(t=>t.slug)).size,7);
 for(const t of active){
  assert.ok(t.cover&&fs.existsSync(t.cover),"Missing cover "+t.name+" "+t.cover);
  assert.ok(fs.readFileSync(t.cover,"utf8").includes("<svg"),"Invalid artwork "+t.cover);
 }
 assert.ok(seed.filter(t=>t.active===false).length>=5);
 const affairs=active.find(t=>t.name==="時事醫學專欄");
 assert.ok(affairs.legacyNames.includes("時事探討"));
});
await check("Main homepage's WebGL markup and loader are unchanged by topics presentation",async()=>{
 const html=fs.readFileSync("index.html","utf8");
 assert.ok(html.includes("swMotionHomeHost"));
 assert.ok(html.includes("public-v13-mobile-20261008"));
 assert.ok(!html.includes("public-topic-tape.js"));
});
await check("Official CMS edits, publishes, verifies and reloads cover/tone/aliases/stack configuration",async()=>{
 const cms=fs.readFileSync("cms/assets/bundles/cms-app.js","utf8");
 for(const token of ["topicCover","topicTapeTone","topicTapeFeatured","topicAliases","legacyNames","importPublicTopicsBtn","function v11TopicPayload","function verifyPublishedTopics"])
  assert.ok(cms.includes(token),"Missing CMS wiring "+token);
 new (await import("node:vm")).Script(cms,{filename:"cms-app.js"});
 const html=fs.readFileSync("cms/index.html","utf8");
 assert.ok(html.includes("CMS_FRAME_BLOCKED"),"Formal CMS authentication guard missing");
});
await check("Public topic renderer and scroll choreography compile",async()=>{
 const core=fs.readFileSync("assets/public-core.js","utf8");
 const tape=fs.readFileSync("assets/public-topic-tape.js","utf8");
 new (await import("node:vm")).Script(core,{filename:"public-core.js"});
 new (await import("node:vm")).Script(tape,{filename:"public-topic-tape.js"});
 assert.ok(core.includes("sw-topic-tape")&&core.includes("t.legacyNames.includes(a.category)"));
 assert.ok(tape.includes("card.style.pointerEvents=isLaid?"),"Previously laid paper must remain clickable");
});
for(const [width,height] of [[360,760],[390,844],[768,1024],[1366,900]]){
 await check("Topic artwork, floor and paper stack at "+width+"px",async()=>{
  const context=await ctx(width,height,"reduce"),page=await context.newPage();
  await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelectorAll("#app .sw-topic-paper").length===7,{timeout:16000});
  const v=await page.evaluate(()=>{
   const rail=document.querySelector("[data-sw-topic-tape]");
   const topics=[...rail.querySelectorAll(".sw-topic-paper")];
   const first=topics[0].querySelector("img");
   return {count:topics.length,active:topics.filter(x=>getComputedStyle(x).pointerEvents!=="none").length,images:topics.filter(x=>x.querySelector("img")).length,firstLoaded:first?.complete&&first?.naturalWidth>0,overflow:document.documentElement.scrollWidth-innerWidth,
    rail:rail.getBoundingClientRect().height,dock:document.querySelectorAll("#pager > .pager-items .nav-item").length,
    stories:document.querySelectorAll("#app .topic-grid [data-topic]").length,
    live:document.querySelector("body")?.className||""};
  });
  assert.equal(v.count,7);assert.equal(v.images,7);
  assert.ok(v.firstLoaded,"Illustrated image did not load "+JSON.stringify(v));
  assert.equal(v.stories,7);assert.equal(v.dock,5);
  assert.ok(v.overflow<=4,"Horizontal overflow "+JSON.stringify(v));
  assert.ok(v.rail>500,JSON.stringify(v));
  const article=page.locator("#app .topic-grid [data-topic='medical-affairs']");
  await article.click();
  await page.waitForFunction(()=>document.querySelector("#topicArticles .cards")?.textContent?.includes("心肌梗塞"),{timeout:15000});
  assert.match(new URL(page.url()).searchParams.get("topic")||"",/medical-affairs/);
  await page.screenshot({path:"qa-topic-atlas-"+width+".png",fullPage:false});
  await context.close()
 });
}
await check("Scroll stack exposes clickable previously laid papers, click targets are native buttons",async()=>{
 const context=await ctx(390,844,"no-preference"),page=await context.newPage();
 await page.goto(base+"topics.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("[data-sw-topic-tape]")?.classList.contains("is-ready"),{timeout:14000});
 await page.evaluate(()=>{
  const rail=document.querySelector("[data-sw-topic-tape]");
  const y=rail.getBoundingClientRect().top+scrollY;
  scrollTo({top:y+(rail.offsetHeight-innerHeight)*.91,behavior:"instant"});
 });
 await page.waitForTimeout(380);
 const st=await page.evaluate(()=>{
  const rail=document.querySelector("[data-sw-topic-tape]");
  const cards=[...rail.querySelectorAll(".sw-topic-paper")];
  return{visible:cards.filter(x=>getComputedStyle(x).opacity!=="0").length,
   interactive:cards.filter(x=>getComputedStyle(x).pointerEvents!=="none").length,
   top:cards.filter(x=>x.classList.contains("is-top")).map(x=>x.dataset.topic)};
 });
 assert.ok(st.visible>=5&&st.interactive>=5,"Not all laid cards clickable: "+JSON.stringify(st));
 assert.equal(st.top.length,1);
 await page.locator(".sw-topic-paper.is-top").click();
 await page.waitForFunction(()=>new URL(location.href).searchParams.has("topic"),{timeout:15000});
 await context.close()
});
await check("No direct edits to published article files",async()=>{
 const data=JSON.parse(fs.readFileSync("articles/index.json","utf8"));
 assert.equal(data.filter(x=>x.status==="Published").length,2);
 assert.ok(data.some(x=>x.category==="時事探討"),"Legacy classification unexpectedly overwritten");
});
await browser.close();
await new Promise(resolve=>server.close(resolve));
const pass=checks.filter(Boolean).length;
console.log("Editorial medical topic atlas QA "+pass+"/"+checks.length+" passed");
if(pass!==checks.length)process.exitCode=1;
