/* SIGNWELL BIO — isolated test-CMS schema, NOT production CMS. */
(()=>{"use strict";
 const fields=[
 ["introLead","封面第一行","不只研究身體，","hero",55],
 ["introAccent","封面重點文字","也重新看見人。","hero",55],
 ["introDescription","封面引言","將醫學、健康、美感與社會之間的關係，編排成值得探索的觀點。這一次，讓捲動也成為敘事。","hero",220],
 ["sceneOneLabel","第一幕眉標","01 / THE HUMAN CONDITION","motion",60],
 ["sceneOneDescription","第一幕說明","健康，不只是被數據量化的結果，也關乎生活中的每一次選擇。","motion",180],
 ["sceneTwoLine1","第二幕標題第一行","把觀點，","motion",30],
 ["sceneTwoLine2","第二幕標題第二行","放進新的框架。","motion",30],
 ["sceneTwoDescription","第二幕說明","讓醫學研究、生活經驗與審美文化互相對話，不急著用一個答案總結所有事情。","motion",180],
 ["sceneThreeLine1","第三幕標題第一行","同一個人，","motion",30],
 ["sceneThreeLine2","第三幕標題第二行","不只有一種定義。","motion",30],
 ["sceneThreeDescription","第三幕說明","醫學是理解身體的方式之一。把證據與人的生活放在一起，才能看見更完整的故事。","motion",180],
 ["currentSectionTitle","最新焦點區標題","最新焦點","editorial",35],
 ["featuresSectionTitle","精選閱讀區標題","精選閱讀","editorial",35],
 ["noteLine1","編輯觀點第一行","好的內容，不需要每次都急著給答案。","editorial",80],
 ["noteLine2","編輯觀點第二行","有時候，更重要的是提出對的問題。","editorial",80],
 ["noteDescription","編輯觀點說明","觀察醫學，也觀察醫學之外的世界。保留證據、立場與不確定性之間應有的距離。","editorial",210],
 ["newsletterLine1","電子報英文標題第一行","Something","newsletter",40],
 ["newsletterLine2","電子報英文標題第二行","worth reading.","newsletter",40],
 ["newsletterDescription","電子報說明","不定期寄出新文章與值得記住的觀察。沒有不必要的推銷。","newsletter",180]
 ];
 const stories=[
 ["health","當健康不再只是治療，醫療的價值會如何改變？","醫療產業","從預防、管理到醫療服務的新角色，討論科技與商業模式如何改變選擇。"],
 ["aging","醫療之外，什麼才是長期健康的關鍵？","長壽與預防","把視角從單次治療拉長到一生的選擇。"],
 ["aesthetic","男性外觀管理，不只是美容這麼簡單。","男性美學","從外貌、文化與自我形象理解美學。"],
 ["ai","AI 讓醫學知識更便宜，誰會真正受益？","醫療產業","談醫師、患者與技術平台之間的價值分配。"],
 ["natural","對「自然」的追求，為什麼反而需要更多克制？","男性美學","審美判斷不只涉及比例，也涉及取捨。"],
 ["longevity","健康老化，不等於永遠年輕。","長壽與預防","重新理解年齡、功能與生活品質。"],
 ["thinking","當答案太容易取得。","醫學思辨","好的判斷更需要脈絡、證據與不確定性。"]
 ];
 const defaults=Object.fromEntries(fields.map(([key,,value])=>[key,value]));
 Object.assign(defaults,{leadStory:"health",featuredStory1:"natural",featuredStory2:"longevity",featuredStory3:"thinking"});
 const limitFields=Object.fromEntries(fields.map(([key,,,,max])=>[key,max]));
 const catalog=Object.fromEntries(stories.map(([id,title,topic,excerpt])=>[id,{id,title,topic,excerpt}]));
 const STORAGE_KEY="signwellbio:test:homepage-draft:v1";
 function normalize(input){
  const src=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const out={};
  for(const [key,def] of Object.entries(defaults)){
   if(key.includes("Story")){
    const selected=String(src[key]??def);
    out[key]=catalog[selected]?selected:def;
   }else{
    const val=String(src[key]??def).trim();
    out[key]=val?val.slice(0,limitFields[key]):def;
   }
  }
  return out;
 }
 function load(){
  try{
   const raw=localStorage.getItem(STORAGE_KEY);
   if(!raw)return null;
   const parsed=JSON.parse(raw);
   return parsed?.version===1?{updatedAt:String(parsed.updatedAt||""),values:normalize(parsed.values)}:null;
  }catch(_){return null}
 }
 function save(values){
  const data={version:1,updatedAt:new Date().toISOString(),values:normalize(values)};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  return data;
 }
 window.SWBIO_TEST_CMS=Object.freeze({
  storageKey:STORAGE_KEY,version:1,
  fields:fields.map(([key,label,defaultValue,section,max])=>({key,label,defaultValue,section,max})),
  stories:stories.map(([id,title,topic,excerpt])=>({id,title,topic,excerpt})),
  catalog:Object.freeze(catalog),
  defaults:Object.freeze(defaults),
  normalize,load,save
 });
})();