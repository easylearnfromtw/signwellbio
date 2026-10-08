import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const pub=read("assets/bundles/article-id-card.js");
const cms=read("cms/assets/bundles/article-id-card.js");
const css=read("assets/components/styles/article-id-card.css");
assert.equal(pub,cms,"Public and CMS Article ID Card behavior diverged");
assert.equal(css,read("cms/assets/components/styles/article-id-card.css"),"Public and CMS Article ID CSS diverged");
new Function(pub);
new Function(cms);
const required=[
  'class="swid-quick-actions"',
  'data-swid-copy-primary',
  'data-swid-sources-quick',
  'data-swid-share-primary',
  'aria-live="polite"',
  'aria-labelledby',
  'aria-expanded="false"',
  'function setTray(',
  'function setFlipped(',
  'function jumpToCardSection(',
  'var rafId=0',
  'function copyText('
];
for(const key of required)assert(pub.includes(key),"ID card missing UX contract: "+key);
for(const section of ["swid-author-section","swid-sources-section","swid-version-section"])
  assert(pub.includes(section),"Missing source/author/version section: "+section);
assert(css.includes(".swid-quick-actions")&&css.includes("@media(max-width:700px)"),"Mobile quick action UI missing");
assert(css.includes('data-flipped="1"')&&css.includes('max-width:940px'),"GPU-lite flip fallback missing");
for(const path of ["about.html","index.html","newsletter.html","preview-idcard.html","share.html","topics.html"]){
 const page=read(path);
 const needle="?build=article-id-reader-ux-20261009";
 assert(page.includes("article-id-card.css"+needle)&&page.includes("article-id-card.js"+needle),"Asset cache buster missing in "+path);
}
assert(read("sw.js").includes("article-id-reader-ux1"),"Service worker cache version not bumped");
console.log("Article ID Card Reader UX static contract: PASS (mirrored bundles, 6 page references, modal/keyboard/clipboard/mobile hooks)");
