import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(path, "utf8");
const cms = read("cms/assets/bundles/cms-app.js");
const cmsHtml = read("cms/index.html");
const published = read("test/assets/home-published.js");
const preview = read("test/assets/home-preview.js");
const page = read("test/index.html");
const css = read("cms/assets/motion-editor.css");
const originalIndex = read("index.html");
const schema = read("test/assets/test-cms-schema.js");
const stageStudio = read("test/cms/index.html");
const tests=[];
function test(name, fn){try{fn();tests.push({name,pass:true});process.stdout.write("PASS "+name+"\n")}catch(error){tests.push({name,pass:false});process.stderr.write("FAIL "+name+": "+error.message+"\n")}}
const has=(src,str)=>assert.ok(src.includes(str),"Missing expected marker "+str);

test("JavaScript source compiles", ()=>{
 for(const [name,src] of [["CMS",cms],["published preview",published],["local preview",preview],["schema",schema]])new vm.Script(src,{filename:name});
});
test("Production CMS protected by existing login and CSP", ()=>{
 has(cmsHtml,'CMS_FRAME_BLOCKED');has(cmsHtml,"Content-Security-Policy");has(cmsHtml,"cms-app.js");
 has(cms,"newsletterAdminKey()");has(cms,"signwellGasBridge(");has(cms,"admin.release.status");
 has(cms,"ensureGithubWritable(");has(cms,"assertSignwellMigrationTarget(");
});
test("All 19 motion content keys are in official CMS defaults", ()=>{
 const match=cms.match(/const SW_MOTION_DEFAULTS=Object\.freeze\((\{[\s\S]*?\})\);\s*Object\.assign\(DEFAULT_SITE_TEXT,SW_MOTION_DEFAULTS\)/);
 assert.ok(match,"Motion defaults missing or not merged");
 const fields=JSON.parse(match[1]);assert.equal(Object.keys(fields).length,19);
 for(const [key,val] of Object.entries(fields)){
   assert.ok(/^motion[A-Z]/.test(key),"Unexpected key: "+key);
   assert.ok(typeof val==="string"&&val.trim(),"Bad field: "+key);
   has(cms,"input('"+key+"'");
   has(published,'"'+key+'"');
 }
});
test("CMS publish uses existing validated public-data pipeline", ()=>{
 has(cms,"function currentSiteTextPayload(){return {...DEFAULT_SITE_TEXT,...(data.siteText||{})}}");
 has(cms,"function publicBundlePayload(");has(cms,"PUBLIC_BUNDLE_PATH");has(cms,"function verifyPublicBundle(");
 has(cms,"const published=await publishGitHub();");
 has(cms,"if(published!==true)throw new Error(");
 has(cms,"CMS_FRAME_BLOCKED");
});
test("Public production homepage and its existing backend remain in place", ()=>{
 has(originalIndex,'id="app"');
 has(originalIndex,'assets/public-core.js');
 assert.ok(!originalIndex.includes('assets/home-published.js'),"Production homepage unexpectedly replaced");
 has(cmsHtml,'assets/motion-editor.css');
});
test("Official staging preview reads published files only", ()=>{
 has(published,'get("preview")!=="published"');
 has(published,'request("../public-data.json")');
 has(published,'request("../articles/index.json")');
 has(published,'a.status==="Published"');
 assert.ok(!/localStorage|sessionStorage|adminKey|api\.github\.com/.test(published),"Published preview accesses private state");
 has(page,'src="assets/home-published.js"');
 has(preview,'get("preview")!=="1"');
});
test("Test CMS remains staging-only and cannot publish", ()=>{
 has(stageStudio,"STUDIO");
 assert.ok(!/script.google.com|admin.release.status|admin.article.create/.test(stageStudio),"Test CMS has production API reference");
});
test("No emoji in new integration files", ()=>{
 for(const content of [published,css])assert.ok(!/\p{Extended_Pictographic}/u.test(content));
});
test("All critical site routes preserved", ()=>{
 for(const name of ["index.html","topics.html","about.html","share.html","newsletter.html","privacy.html","terms.html"])assert.ok(fs.existsSync(name),"Missing route "+name);
});
const total=tests.length, passed=tests.filter(t=>t.pass).length;
process.stdout.write("\n"+passed+"/"+total+" regression checks passed\n");
if(passed!==total)process.exitCode=1;
