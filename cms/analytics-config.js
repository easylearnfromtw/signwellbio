/* SIGN WELL CMS backend bootstrap · stable filename */
(()=>{'use strict';
const FALLBACK_ENDPOINT='https://script.google.com/macros/s/AKfycbzmZXZSepxCD1jbfpjMxsnvn0nRl-xEpeXdJoTO-TZL6Z5Zk7T-OsVGpTkIxWaCh-Y/exec';
let endpoint='';
try{endpoint=String(localStorage.getItem('signwell-backend-endpoint')||'').trim()}catch(_){}
if(!/^https:\/\/script\.google\.com\/macros\/s\/[^\s?#]+\/exec(?:[?#].*)?$/i.test(endpoint))endpoint=FALLBACK_ENDPOINT;
const enabled=/^https:\/\/script\.google\.com\/macros\/s\/[^\s?#]+\/exec(?:[?#].*)?$/i.test(endpoint);
const cfg={enabled,endpoint,version:'24.36.3',bridgeProtocol:'23.9.92'};
window.SIGNWELL_BACKEND=Object.assign({},window.SIGNWELL_BACKEND||{},cfg);
window.SIGNWELL_ANALYTICS=Object.assign({},window.SIGNWELL_ANALYTICS||{},cfg);
window.SIGNWELL_NEWSLETTER=Object.assign({},window.SIGNWELL_NEWSLETTER||{},cfg);
})();