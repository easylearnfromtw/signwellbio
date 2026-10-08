import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const js=fs.readFileSync("assets/public-motion-three.js","utf8");
const css=fs.readFileSync("assets/public-motion.css","utf8");
const loader=fs.readFileSync("assets/public-motion.js","utf8");
const homepage=fs.readFileSync("index.html","utf8");
new vm.Script(js,{filename:"public-motion-three.js"});
new vm.Script(loader,{filename:"public-motion.js"});

const matches=js.match(/  const adaptiveRatio = \(width, height\) => \{([\s\S]*?)\n  \};/);
assert.ok(matches,"Adaptive DPR governor missing");
const createRatio=new Function("window","mobile","gpuProfile","const adaptiveRatio = (width, height) => {" + matches[1] + "}; return adaptiveRatio;");
function ratio(w,h,profile,deviceRatio,handheld){
 const fn=createRatio({devicePixelRatio:deviceRatio},{matches:handheld},()=>profile);
 return fn(w,h);
}
const cases=[
 {name:"2K-class desktop quality",w:720,h:747,profile:"high",dpr:3,mobile:false,min:2.5,max:2.71},
 {name:"balanced desktop pixel budget",w:720,h:747,profile:"balanced",dpr:3,mobile:false,min:1.7,max:1.86},
 {name:"iPhone GPU-safe rendering",w:292,h:405,profile:"balanced",dpr:3,mobile:true,min:1.5,max:1.56},
 {name:"low-power Safari",w:292,h:405,profile:"lite",dpr:3,mobile:true,min:1.0,max:1.11},
 {name:"large screen bounded to 2K longest edge",w:1100,h:860,profile:"high",dpr:3,mobile:false,min:1.7,max:1.87}
];
for(const c of cases){
 const dpr=ratio(c.w,c.h,c.profile,c.dpr,c.mobile);
 assert.ok(dpr>=c.min&&dpr<=c.max,c.name+" ratio="+dpr);
 assert.ok(Math.ceil(c.w*dpr)<=2049&&Math.ceil(c.h*dpr)<=2049,c.name+" exceeded 2K edge");
 const budget=c.profile==="high"?4200000:c.profile==="balanced"?(c.mobile?1350000:2400000):850000;
 assert.ok((c.w*dpr)*(c.h*dpr)<=budget*1.01,c.name+" pixel budget exceeded");
 console.log("PASS",c.name,Math.floor(c.w*dpr)+"x"+Math.floor(c.h*dpr)+" pixels / DPR "+dpr.toFixed(2))
}
for(const marker of [
 'antialias: true','new THREE.MeshBasicMaterial({','side: THREE.BackSide',
 'bodyOutline = new THREE.Mesh(bodyGeo, outlineMaterial)',
 'renderer.shadowMap.enabled = false',
 'qualityObserver?.disconnect()',
 'resizeObserver.observe(host)',
 'c.width = 2048; c.height = 620',
 'canvas.dataset.resolution = canvas.width + "x" + canvas.height'
])assert.ok(js.includes(marker),"Missing quality feature: "+marker);
assert.ok(!js.includes('antialias: !mobile.matches'),"Mobile MSAA must remain enabled");
assert.ok(!js.includes('resizeObserver.observe(stage)'),"Do not render entire sticky scene");
assert.ok(css.includes('width:min(78vw,720px)')&&css.includes('width:clamp(230px,75vw,320px)'),"Cropped raster layout missing");
assert.ok(css.includes('left:71%')&&css.includes('top:71%'),"Mobile reading-safe placement missing");
assert.ok(loader.includes('public-motion.css?version=13.0.0'),"Old cached CSS URL");
assert.ok(loader.includes('public-motion-three.js?v=12.0.0'),"Old cached 3D module");
assert.ok(homepage.includes('public-v13-mobile-20261008'),"Old cached Public loader");
console.log("PASS", "MSAA, outline, GPU governor, cropped viewport, 2K texture and cache-busted assets");
