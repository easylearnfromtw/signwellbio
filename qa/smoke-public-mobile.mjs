import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const dir=process.cwd();
const mime={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json;charset=utf-8",".svg":"image/svg+xml",".jpg":"image/jpeg",".png":"image/png",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  let file=path.resolve(dir,decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,""));
  if(file!==dir&&!file.startsWith(dir+path.sep)){res.writeHead(403).end();return}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,"index.html");
  if(!fs.existsSync(file)){res.writeHead(404).end("Not found");return}
  res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res)
 }catch(error){res.writeHead(500).end(String(error))}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const checks=[];
const rect=(r)=>({x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
const overlap=(a,b,pad=2)=>a.left<b.right-pad&&a.right>b.left+pad&&a.top<b.bottom-pad&&a.bottom>b.top+pad;
const check=async(name,fn)=>{
 try{await fn();console.log("PASS",name);checks.push(true)}
 catch(error){console.error("FAIL",name,error.message);checks.push(false)}
};
for(const [width,height] of [[320,640],[360,740],[390,844],[430,932],[768,1024]]){
 await check("Phone/tablet editorial layout "+width+"x"+height,async()=>{
  const mobile=width<=430;
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:2,reducedMotion:"reduce"});
  await context.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await context.newPage();
  await page.goto(base+"index.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("swMotionHomeHost")?.shadowRoot?.querySelector(".motion-skip")&&!document.getElementById("swMotionHomeHost").hidden,{timeout:16000});
  const m=await page.evaluate(()=>{
   const root=document.getElementById("swMotionHomeHost").shadowRoot;
   const get=s=>root.querySelector(s)?.getBoundingClientRect().toJSON();
   const dom=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
   const c=s=>root.querySelector(s)?getComputedStyle(root.querySelector(s)):null;
   return{
    viewport:[innerWidth,innerHeight],
    overflow:document.documentElement.scrollWidth-innerWidth,
    heading:get(".intro h1"),description:get(".intro p"),
    skip:get(".motion-skip"),explore:get(".study-index"),
    issue:get(".intro-issue"),intro:get(".intro"),
    dock:dom("#pager"),
    titleSize:parseFloat(c(".intro h1")?.fontSize||"0"),
    skipDisplay:c(".motion-skip")?.display,
    afterTitle:get(".after-copy h2"),
    features:document.querySelector("#swMotionFeatures")?.getBoundingClientRect().toJSON(),
    navButtons:document.querySelectorAll("#pager > .pager-items .nav-item").length
   };
  });
  for(const key of ["heading","description","skip","explore","dock"])assert.ok(m[key],key+" absent: "+JSON.stringify(m));
  assert.ok(m.overflow<=3,"horizontal overflow "+JSON.stringify(m));
  assert.ok(m.skipDisplay==="inline-flex","Skip link unstyled "+JSON.stringify(m));
  assert.ok(m.skip.height>=43&&m.explore.height>=40,"Mobile tap target too small "+JSON.stringify(m));
  assert.ok(!overlap(m.skip,m.explore),"Homepage CTAs collide "+JSON.stringify(m));
  assert.ok(!overlap(m.skip,m.dock)&&!overlap(m.explore,m.dock),"CTA overlaps iOS dock "+JSON.stringify(m));
  assert.ok(!overlap(m.heading,m.description),"Main headline collides with deck "+JSON.stringify(m));
  assert.ok(!overlap(m.description,m.skip)&&!overlap(m.description,m.explore),"Hero deck collides with CTA "+JSON.stringify(m));
  assert.ok(m.navButtons===5,"iOS dock entries regressed "+JSON.stringify(m));
  assert.ok(m.titleSize>=30&&m.titleSize<=80,"Headline size out of control "+JSON.stringify(m));
  if(mobile){
   assert.ok(!overlap(m.description,m.issue),"Issue folio overlaps description "+JSON.stringify(m));
   const scrolled=await page.evaluate(()=>{
    const r=document.getElementById("swMotionHomeHost").shadowRoot;
    r.querySelector("#motionStory").scrollIntoView();
    return true
   });
   assert.ok(scrolled);
   const scene=await page.evaluate(()=>{
    const r=document.getElementById("swMotionHomeHost").shadowRoot;
    return{headline:r.querySelector(".stage-sub").getBoundingClientRect().toJSON(),model:r.querySelector(".edition-figure").getBoundingClientRect().toJSON(),topline:r.querySelector(".stage-topline").getBoundingClientRect().toJSON(),canvas:r.querySelector(".webgl-figure-host")?.getBoundingClientRect().toJSON()};
   });
   assert.ok(!overlap(scene.headline,scene.topline),"Scene labels overlap "+JSON.stringify(scene));
   if(scene.canvas)assert.ok(scene.headline.bottom<scene.canvas.top+65,"3D overlays meaningful scene copy "+JSON.stringify(scene));
   await page.screenshot({path:"qa-public-mobile-"+width+".png",fullPage:false});
  }
  await context.close();
 });
}
await check("Article navigation and actual newsletter preserved on phone",async()=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
 await ctx.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const page=await ctx.newPage();await page.goto(base+"index.html",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#latest .bento [data-article]",{timeout:13000});
 await page.locator("#latest .bento [data-article]").first().click();
 await page.waitForSelector(".article-head h1",{timeout:15000});
 assert.equal(await page.locator("#swMotionHomeHost").evaluate(e=>e.hidden),true);
 await page.locator('#pager > .pager-items [data-page="newsletter"]').click();
 await page.waitForFunction(()=>document.title.includes("電子報"),{timeout:15000});
 assert.ok((await page.locator("#app").innerText()).length>120);
 await ctx.close()
});
await browser.close();await new Promise(resolve=>server.close(resolve));
const passed=checks.filter(Boolean).length;
console.log("Mobile editorial responsive checks:",passed+"/"+checks.length);
if(passed!==checks.length)process.exitCode=1;
