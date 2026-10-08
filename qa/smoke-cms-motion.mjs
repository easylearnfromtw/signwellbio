import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,"http://localhost");
  const relative=decodeURIComponent(u.pathname).replace(/^\//,"");
  let file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,"index.html");
  if(!fs.existsSync(file)){res.writeHead(404).end("Not found");return}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");
  res.setHeader("Cache-Control","no-store");
  res.writeHead(200);fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500).end(String(error))}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const issues=[],report=[];
async function check(name,fn){
 try{await fn();report.push(name);console.log("PASS "+name)}
 catch(e){issues.push(name+": "+e.message);console.error("FAIL "+name,e.message)}
}
const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:"reduce"});
// The UI must work if external 3D/CDN dependencies are unavailable.
await context.route("**/*",route=>{
 const u=route.request().url();return u.startsWith(base)?route.continue():route.abort();
});
await check("CMS test editor loads and preserves six panels",async()=>{
 const page=await context.newPage();await page.goto(base+"/test/cms/",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#sidebarNav button[data-panel=hero]");
 assert.equal(await page.locator("#sidebarNav button").count(),6);
 assert.match(await page.locator("#pageTitle").innerText(),/編輯總覽/);
 await page.close()
});
await check("CMS draft save and explicit local homepage preview",async()=>{
 const page=await context.newPage();
 await page.goto(base+"/test/cms/",{waitUntil:"domcontentloaded"});
 await page.locator("#sidebarNav button[data-panel=hero]").click();
 await page.locator("#field-introLead").fill("測試預覽已成功串接，");
 await page.locator("#saveButton").click();
 assert.match(await page.locator("#saveState").innerText(),/草稿已就緒|已儲存/);
 const local=await page.evaluate(()=>localStorage.getItem("signwellbio:test:homepage-draft:v1"));
 assert.ok(local&&JSON.parse(local).values.introLead==="測試預覽已成功串接，");
 const preview=await context.newPage();
 await preview.goto(base+"/test/index.html?preview=1",{waitUntil:"domcontentloaded"});
 await preview.waitForFunction(()=>document.querySelector(".intro h1")?.textContent?.includes("測試預覽已成功串接"));
 assert.match(await preview.locator(".intro h1").innerText(),/測試預覽已成功串接/);
 assert.equal(await preview.locator("#motionStory").count(),1);
 await preview.close();await page.close()
});
await check("Normal test homepage never consumes CMS draft",async()=>{
 const p=await context.newPage();await p.goto(base+"/test/",{waitUntil:"domcontentloaded"});
 assert.doesNotMatch(await p.locator(".intro h1").innerText(),/測試預覽已成功串接/);
 await p.close()
});
await check("Published preview uses real public files and only published story routes",async()=>{
 const page=await context.newPage();await page.goto(base+"/test/index.html?preview=published",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#swPublishedPreviewBadge")?.textContent?.includes("已發布內容預覽"),{timeout:15000});
 const link=await page.locator("#current .p-feature-title a").getAttribute("href");
 assert.ok(link&&link.includes("/article/"),"Expected published article permalink, received "+link);
 assert.ok(!link.includes("article.html?story="),"Published preview must not show demo story links");
 await page.close()
});
await check("Mobile CMS navigation is readable and swipeable",async()=>{
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
 await mobile.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const page=await mobile.newPage();await page.goto(base+"/test/cms/",{waitUntil:"domcontentloaded"});
 const nav=page.locator("#mobileNav");await nav.waitFor({state:"visible"});
 assert.equal(await nav.locator("button").count(),6);
 await nav.locator('button[data-panel="motion"]').tap();
 assert.match(await page.locator("#pageTitle").innerText(),/三幕敘事/);
 const box=await nav.boundingBox();assert.ok(box&&box.width>300);
 await page.mouse.move(box.x+35,box.y+30);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.89,box.y+30,{steps:8});
 await page.mouse.up();
 assert.ok(await nav.locator('button[aria-current="page"]').count()===1,"Active thumb must indicate exactly one section");
 await mobile.close()
});
await check("Formal CMS entry stays protected by login gate",async()=>{
 const page=await context.newPage();await page.goto(base+"/cms/",{waitUntil:"domcontentloaded"});
 assert.ok((await page.content()).includes("CMS_FRAME_BLOCKED"));
 assert.ok((await page.content()).includes('Content-Security-Policy'));
 await page.close()
});
await browser.close();
await new Promise(resolve=>server.close(resolve));
console.log("\n"+report.length+"/"+(report.length+issues.length)+" browser checks passed");
if(issues.length)process.exitCode=1;
