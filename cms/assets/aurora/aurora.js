/* =====================================================================
   SIGN WELL CMS · Aurora Glass R10 · interaction layer
   ---------------------------------------------------------------------
   DOM-only progressive enhancement. It never calls CMS internals and
   never changes data; every action it offers is a proxy click on an
   existing CMS control, so all business logic stays in cms-app.js.

   · sliding glass capsule behind the active sidebar item
   · shared glass capsule for segmented controls (drag to switch)
   · phone: floating liquid-glass tab bar with a draggable lens that
     magnifies the icon under it and refracts at the edges (SVG
     displacement, Chromium), shrinks while scrolling down
   · phone: off-canvas sidebar drawer
   · large-title topbar that reveals the title once you scroll
   · sticky, scroll-spied section index for long pages
   · spotlight on paper cards, count-up metrics, staggered reveal
   ===================================================================== */
(() => {
  'use strict';
  if (window.__swAuroraR10) return;
  window.__swAuroraR10 = true;

  const doc = document, root = doc.documentElement, body = doc.body;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const mq = q => window.matchMedia(q);
  const REDUCED = mq('(prefers-reduced-motion: reduce)');
  const PHONE = mq('(max-width: 900px)');
  const APPSHELL = mq('(min-width: 901px) and (pointer: fine)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const lowFx = () => root.classList.contains('sw-lowfx');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* SVG filters inside backdrop-filter are a Chromium-only capability. */
  try {
    const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
    if (brands.some(b => /Chromium/i.test(b.brand)) && !lowFx()) root.classList.add('aw-svg-backdrop');
  } catch (_) {}

  /* ------------------------------------------------------------------
     Scroll owner: #view on the desktop app shell, the page elsewhere
     ------------------------------------------------------------------ */
  const viewEl = () => $('#view');
  const scrollTop = () => (APPSHELL.matches ? (viewEl()?.scrollTop || 0) : (window.scrollY || root.scrollTop || 0));
  const scrollRoot = () => (APPSHELL.matches ? viewEl() : null);

  /* ------------------------------------------------------------------
     1 · Sidebar capsule
     ------------------------------------------------------------------ */
  let navCap = null, navRO = null;
  function placeNavCapsule() {
    const nav = $('.sidebar .nav');
    if (!nav) return;
    if (!navCap || !navCap.isConnected) {
      navCap = doc.createElement('span');
      navCap.className = 'aw-nav-capsule';
      navCap.setAttribute('aria-hidden', 'true');
      nav.prepend(navCap);
      nav.classList.add('aw-has-capsule');
      if ('ResizeObserver' in window) {
        navRO?.disconnect();
        navRO = new ResizeObserver(() => placeNavCapsule());
        $$('.nav-group > button', nav).forEach(b => navRO.observe(b));
      }
    }
    const act = $('.nav-group > button.active', nav);
    if (!act || !act.offsetParent) { navCap.classList.remove('is-on'); return; }
    const nr = nav.getBoundingClientRect(), br = act.getBoundingClientRect();
    const y = (br.top - nr.top + nav.scrollTop).toFixed(1) + 'px', h = br.height.toFixed(1) + 'px';
    if (navCap.__awY !== y) { navCap.__awY = y; navCap.style.setProperty('--y', y); }
    if (navCap.__awH !== h) { navCap.__awH = h; navCap.style.height = h; }
    if (!navCap.classList.contains('is-on')) {
      navCap.style.transition = 'none';
      navCap.classList.add('is-on');
      navCap.getBoundingClientRect();
      navCap.style.transition = '';
    }
  }

  /* ------------------------------------------------------------------
     2 · Segmented controls with a shared, draggable glass capsule
     ------------------------------------------------------------------ */
  const SEG_SELECTOR = '.analytics-range-switch, .live-preview-tabs, .sw-context-tabs, .aw-jumpbar, .sw-nav-sections, .social-studio-stepper';
  const segButtons = el => Array.from(el.children).filter(n => n.tagName === 'BUTTON' && !n.hidden && n.offsetParent !== null);
  const segActive = el => segButtons(el).find(b => b.classList.contains('active') || b.getAttribute('aria-selected') === 'true');

  function setupSeg(el) {
    if (!el || el.offsetParent === null) return;
    let cap = Array.from(el.children).find(n => n.classList && n.classList.contains('aw-seg-capsule'));
    if (!cap) {
      cap = doc.createElement('i');
      cap.className = 'aw-seg-capsule';
      cap.setAttribute('aria-hidden', 'true');
      el.prepend(cap);
    }
    if (!el.classList.contains('aw-seg')) el.classList.add('aw-seg');
    if (!el.__awSeg) {
      bindSegDrag(el);
      el.addEventListener('scroll', () => edgeFade(el), { passive: true });
    }
    positionSeg(el, cap);
    edgeFade(el);
  }
  /* Soft fade on whichever edge still has hidden items */
  const setCls = (el, cls, on) => { if (el.classList.contains(cls) !== Boolean(on)) el.classList.toggle(cls, Boolean(on)); };
  function edgeFade(el) {
    const over = el.scrollWidth > el.clientWidth + 2;
    setCls(el, 'aw-fade-r', over && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    setCls(el, 'aw-fade-l', over && el.scrollLeft > 2);
  }
  function positionSeg(el, cap) {
    cap = cap || el.querySelector(':scope > .aw-seg-capsule');
    if (!cap) return;
    const a = segActive(el);
    const sig = a ? [a.offsetLeft, a.offsetTop, a.offsetWidth, a.offsetHeight].join(',') : 'none';
    if (cap.__awSig === sig) return;
    cap.__awSig = sig;
    if (!a) { cap.style.opacity = '0'; return; }
    cap.style.opacity = '1';
    cap.style.width = a.offsetWidth + 'px';
    cap.style.height = a.offsetHeight + 'px';
    cap.style.setProperty('--x', a.offsetLeft + 'px');
    cap.style.setProperty('--y', a.offsetTop + 'px');
    if (el.scrollWidth > el.clientWidth + 2) {
      const left = a.offsetLeft - (el.clientWidth - a.offsetWidth) / 2;
      el.scrollTo({ left: clamp(left, 0, el.scrollWidth), behavior: REDUCED.matches ? 'auto' : 'smooth' });
    }
  }
  function bindSegDrag(el) {
    el.__awSeg = true;
    let drag = null;
    const buttonAt = x => {
      const list = segButtons(el);
      let best = null, bestD = Infinity;
      list.forEach(b => { const r = b.getBoundingClientRect(); const d = Math.abs(x - (r.left + r.width / 2)); if (d < bestD) { bestD = d; best = b; } });
      return best;
    };
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.pointerType === 'touch' && el.scrollWidth > el.clientWidth + 2) return;
      const b = e.target.closest('button');
      if (!b || b.parentElement !== el) return;
      drag = { id: e.pointerId, x0: e.clientX, moved: false };
    });
    el.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(e.clientX - drag.x0) < 7) return;
      const cap = el.querySelector(':scope > .aw-seg-capsule');
      if (!cap) return;
      if (!drag.moved) { drag.moved = true; el.classList.add('is-dragging'); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      const r = el.getBoundingClientRect(), w = cap.offsetWidth;
      const x = clamp(e.clientX - r.left + el.scrollLeft - w / 2, 0, el.scrollWidth - w);
      cap.__awSig = '';
      cap.style.setProperty('--x', x + 'px');
      const over = buttonAt(e.clientX);
      if (over) { cap.style.width = over.offsetWidth + 'px'; }
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved; drag = null;
      el.classList.remove('is-dragging');
      const capEl = el.querySelector(':scope > .aw-seg-capsule'); if (capEl) capEl.__awSig = '';
      if (moved) {
        const target = buttonAt(e.clientX);
        if (target && target !== segActive(el)) target.click();
      }
      positionSeg(el);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------------------------------
     3 · Phone: liquid-glass tab bar with draggable magnifying lens
     ------------------------------------------------------------------ */
  const SECTIONS = [
    ['workspace', '首頁', 'dashboard'],
    ['content', '內容', 'articles'],
    ['publish', '發佈', 'send'],
    ['settings', '設定', 'globe']
  ];
  let tabbar = null, lens = null, lensMapKey = '';
  function buildTabbar() {
    if (tabbar && tabbar.isConnected) return tabbar;
    tabbar = doc.createElement('nav');
    tabbar.className = 'aw-tabbar aw-glass-rim';
    tabbar.setAttribute('aria-label', 'CMS 工作區');
    const items = SECTIONS.map(([k, label, icon]) =>
      `<button type="button" data-aw-section="${k}" style="--aw-icon:var(--aw-i-${icon})" aria-label="${label}"><i aria-hidden="true"></i><span>${label}</span></button>`).join('');
    const track = SECTIONS.map(([, label, icon]) => `<span style="--aw-icon:var(--aw-i-${icon})"><i></i><b>${label}</b></span>`).join('');
    tabbar.innerHTML = `<span class="aw-lens" aria-hidden="true"><span class="aw-lens-track">${track}</span></span>${items}`;
    body.appendChild(tabbar);
    lens = $('.aw-lens', tabbar);

    tabbar.addEventListener('click', e => {
      const b = e.target.closest('[data-aw-section]');
      if (!b) return;
      goSection(b.dataset.awSection);
    });

    /* The lens is positioned by a (possibly fractional) column index, so it
       follows the tab bar's own width changes (compact mode) with no JS
       measurement while scrolling. */
    let drag = null;
    const colAt = clientX => {
      const r = tabbar.getBoundingClientRect(), col = (r.width - 12) / SECTIONS.length;
      return clamp((clientX - r.left - 6) / col - .5, 0, SECTIONS.length - 1);
    };
    tabbar.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x0: e.clientX, moved: false };
      tabbar.classList.add('is-pressing');
    });
    tabbar.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(e.clientX - drag.x0) < 6) return;
      if (!drag.moved) { drag.moved = true; tabbar.classList.add('is-dragging'); try { tabbar.setPointerCapture(e.pointerId); } catch (_) {} }
      setLens(colAt(e.clientX));
    });
    const end = e => {
      tabbar.classList.remove('is-pressing');
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved; drag = null;
      tabbar.classList.remove('is-dragging');
      if (moved) {
        const i = Math.round(colAt(e.clientX)), sec = SECTIONS[i] && SECTIONS[i][0];
        if (sec && sec !== (body.dataset.swSection || 'workspace')) goSection(sec);
        else syncTabbar();
      }
    };
    tabbar.addEventListener('pointerup', end);
    tabbar.addEventListener('pointercancel', end);
    tabbar.addEventListener('transitionend', e => { if (e.target === tabbar && (e.propertyName === 'width' || e.propertyName === 'height')) updateLensMap(); });
    return tabbar;
  }
  function goSection(section) {
    const t = $(`#swMobileSections [data-mobile-section="${section}"]`) || $(`#swNavSections [data-nav-section="${section}"]`);
    if (t) t.click();
    requestAnimationFrame(syncTabbar);
  }
  let lensIdx = -1;
  function setLens(i) {
    if (!lens || i === lensIdx) return;
    lensIdx = i;
    tabbar.style.setProperty('--aw-lens-i', i.toFixed(3));
    const near = Math.round(i);
    $$('[data-aw-section]', tabbar).forEach((b, k) => { const on = k === near && Math.abs(i - near) < .45; if (b.classList.contains('is-under-lens') !== on) b.classList.toggle('is-under-lens', on); });
  }
  function syncTabbar() {
    if (!tabbar || !PHONE.matches) return;
    const section = body.dataset.swSection || 'workspace';
    let idx = 0;
    $$('[data-aw-section]', tabbar).forEach((b, k) => {
      const on = b.dataset.awSection === section;
      if (b.classList.contains('active') !== on) b.classList.toggle('active', on);
      if (b.getAttribute('aria-current') !== (on ? 'page' : 'false')) b.setAttribute('aria-current', on ? 'page' : 'false');
      if (on) idx = k;
    });
    setLens(idx);
    updateLensMap();
  }

  /* Displacement map for the refracting lens edge (feDisplacementMap) */
  function updateLensMap() {
    if (!root.classList.contains('aw-svg-backdrop') || !lens) return;
    const w = Math.round(lens.offsetWidth), h = Math.round(lens.offsetHeight);
    if (!w || !h) return;
    const key = w + 'x' + h;
    if (key === lensMapKey) return;
    lensMapKey = key;
    const W = 128, H = Math.max(16, Math.round(W * h / w));
    const c = doc.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const img = ctx.createImageData(W, H), r = H / 2, edge = Math.min(W, H) * .46;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x + .5, py = y + .5;
        const cx = clamp(px, r, W - r), cy = r;
        const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy) || 1e-3;
        const inside = r - dist;
        let ox = 0, oy = 0;
        if (inside > 0 && inside < edge) {
          const t = 1 - inside / edge, k = t * t * t;
          ox = -(dx / dist) * k; oy = -(dy / dist) * k;
        }
        const i = (y * W + x) * 4;
        img.data[i] = 128 + ox * 127; img.data[i + 1] = 128 + oy * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const fe = doc.getElementById('awLensMap');
    if (fe) { const url = c.toDataURL(); fe.setAttribute('href', url); fe.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url); }
  }

  /* ------------------------------------------------------------------
     4 · Phone drawer
     ------------------------------------------------------------------ */
  function ensureDrawerChrome() {
    const topbar = $('.topbar');
    if (topbar && !$('.aw-menu-btn', topbar)) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'aw-menu-btn';
      btn.setAttribute('aria-label', '開啟選單');
      btn.addEventListener('click', () => setDrawer(!body.classList.contains('aw-drawer-open')));
      topbar.prepend(btn);
    }
    if (topbar && !$('.aw-back-btn', topbar)) {
      /* Editor → back to the article list (proxy click on the real nav item) */
      const back = doc.createElement('button');
      back.type = 'button';
      back.className = 'aw-back-btn';
      back.setAttribute('aria-label', '返回文章列表');
      back.innerHTML = '<span>文章</span>';
      back.addEventListener('click', () => { const t = $('.nav [data-view="articles"]'); if (t) t.click(); });
      const title = $('.topbar-title', topbar);
      topbar.insertBefore(back, title || topbar.firstChild);
    }
    if (!$('.aw-scrim')) {
      const s = doc.createElement('div');
      s.className = 'aw-scrim';
      s.addEventListener('click', () => setDrawer(false));
      /* inside #cms so it shares the sidebar's stacking context */
      const cms = $('#cms');
      if (cms) cms.insertBefore(s, cms.firstChild); else body.appendChild(s);
    }
    if (topbar && !$('.aw-dock-bg')) {
      /* lives in the topbar so it shares a stacking context with the
         editor actions it sits behind on phones */
      const d = doc.createElement('div');
      d.className = 'aw-dock-bg aw-glass aw-glass-rim';
      d.setAttribute('aria-hidden', 'true');
      topbar.appendChild(d);
    }
  }
  function setDrawer(open) {
    body.classList.toggle('aw-drawer-open', Boolean(open) && PHONE.matches);
    const btn = $('.aw-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) requestAnimationFrame(() => {
      placeNavCapsule();
      const act = $('.sidebar .nav-group > button.active');
      if (act) act.scrollIntoView({ block: 'nearest' });
    });
  }
  doc.addEventListener('click', e => {
    if (!body.classList.contains('aw-drawer-open')) return;
    if (e.target.closest('.sidebar [data-view], .sidebar .smallbtn')) setTimeout(() => setDrawer(false), 120);
  });
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('aw-drawer-open')) setDrawer(false); });

  /* ------------------------------------------------------------------
     5 · Scroll behaviour: large title + compact tab bar
     ------------------------------------------------------------------ */
  let lastY = 0, ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollTop();
      body.classList.toggle('aw-scrolled', y > 64);
      if (tabbar && PHONE.matches) {
        const dy = y - lastY;
        if ((y < 80 || dy < -6) && tabbar.classList.contains('is-compact')) tabbar.classList.remove('is-compact');
        else if (dy > 6 && y >= 80 && !tabbar.classList.contains('is-compact')) tabbar.classList.add('is-compact');
      }
      lastY = y;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------------
     6 · Section index (replaces the short app jump bar on long pages)
     ------------------------------------------------------------------ */
  const INDEX_VIEWS = {
    dashboard: '#view > .analytics-panel, #view > .social-account-panel, #view > .dashboard-subscription-analytics, #view > .dashboard-newsletter-panel, #view > .panel',
    commandcenter: '#view .notion-card',
    aiopenai: '#view .sw-openai-card',
    export: '#view .publish-grid > .publish-card',
    site: '#view .site-section',
    aboutpage: '#view .about-editor-section'
  };
  const LABEL_OF = el => {
    const h = el.querySelector('.site-section-title, .about-editor-section-title strong, .ai-provider-head h3, .google-media-head h3, .passkey-settings-head h3, .notion-card-head strong, .sw-openai-card-head h3, .analytics-head-copy strong, .social-account-titlebar strong, .dashboard-sub-head strong, .dashboard-newsletter-head strong, .panel-head > span, .panel-head > div > span, h3, h2, strong');
    let t = (h ? h.textContent : '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*[\/·|]\s.*$/, '').replace(/\s*[（(].*$/, '');
    return t.length > 16 ? t.slice(0, 15).trim() + '…' : t;
  };
  let spyIO = null, indexKey = '';
  function buildIndex() {
    const v = viewEl();
    if (!v) return;
    const name = body.dataset.swView || '';
    const sel = !body.classList.contains('aw-editor') && INDEX_VIEWS[name];
    const old = $('.aw-jumpbar', v);
    if (!sel) { old?.remove(); spyIO?.disconnect(); indexKey = ''; return; }
    const targets = $$(sel).filter(el => el.offsetParent !== null && !el.closest('[hidden]'));
    const items = [];
    const seen = new Set();
    targets.forEach((el, i) => {
      const label = LABEL_OF(el);
      if (!label || seen.has(label)) return;
      seen.add(label);
      if (!el.id) el.id = 'aw-sec-' + name + '-' + i;
      items.push({ id: el.id, label });
    });
    const key = name + '|' + items.map(x => x.id + x.label).join(',');
    if (items.length < 3) { old?.remove(); spyIO?.disconnect(); indexKey = ''; return; }
    if (key === indexKey && old && old.isConnected) return;
    indexKey = key;
    old?.remove();
    const bar = doc.createElement('nav');
    bar.className = 'aw-jumpbar';
    bar.setAttribute('aria-label', '本頁段落');
    bar.innerHTML = items.map((x, i) => `<button type="button" data-aw-jump="${x.id}"${i === 0 ? ' class="active" aria-selected="true"' : ''}>${x.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</button>`).join('');
    const head = v.querySelector(':scope > .page-head, :scope > .notion-cc > .notion-cc-head');
    if (head) head.insertAdjacentElement('afterend', bar); else v.prepend(bar);
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-aw-jump]');
      if (!b) return;
      const t = doc.getElementById(b.dataset.awJump);
      if (!t) return;
      setJumpActive(bar, b);
      spyLock = Date.now() + 900;
      t.scrollIntoView({ behavior: REDUCED.matches ? 'auto' : 'smooth', block: 'start' });
    });
    setupSeg(bar);
    spyIO?.disconnect();
    if ('IntersectionObserver' in window) {
      spyIO = new IntersectionObserver(entries => {
        if (Date.now() < spyLock) return;
        const vis = entries.filter(en => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!vis) return;
        const b = bar.querySelector(`[data-aw-jump="${vis.target.id}"]`);
        if (b) setJumpActive(bar, b);
      }, { root: scrollRoot(), rootMargin: '-18% 0px -62% 0px', threshold: 0 });
      items.forEach(x => { const t = doc.getElementById(x.id); if (t) spyIO.observe(t); });
    }
  }
  let spyLock = 0;
  function setJumpActive(bar, b) {
    bar.querySelectorAll('[data-aw-jump]').forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    positionSeg(bar);
  }

  /* ------------------------------------------------------------------
     7 · Spotlight on paper cards (desktop pointer only)
     ------------------------------------------------------------------ */
  const SPOT_SEL = '.panel, .publish-card, .notion-card, .sw-openai-card, .newsletter-panel, .social-studio-card, .site-text-card, .about-editor-panel, .topic-list, .topic-form, .sw-dr-glass, .dashboard-sub-card, .social-account-panel, .analytics-panel, .dashboard-newsletter-panel, .stat, .newsletter-metric, .notion-cc-kpi, .article-create-card, .sw-ux-flow > button';
  let spotEl = null, spotRaf = 0, spotEvt = null, spotRule = null;
  /* Pointer coordinates go through a constructed stylesheet, not a style
     attribute, so DOM MutationObservers (e.g. the contrast guard) stay idle. */
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('.aw-spot.aw-spot-on{--mx:50%;--my:0%}');
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
    spotRule = sheet.cssRules[0];
  } catch (_) { spotRule = null; }
  doc.addEventListener('pointermove', e => {
    if (!FINE.matches || lowFx()) return;
    spotEvt = e;
    if (spotRaf) return;
    spotRaf = requestAnimationFrame(() => {
      spotRaf = 0;
      const ev = spotEvt;
      const el = ev.target && ev.target.closest ? ev.target.closest(SPOT_SEL) : null;
      if (el !== spotEl) { spotEl?.classList.remove('aw-spot-on'); spotEl = el; if (el && el.closest('#view')) el.classList.add('aw-spot', 'aw-spot-on'); }
      if (!el || !el.closest('#view')) return;
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left).toFixed(0) + 'px', y = (ev.clientY - r.top).toFixed(0) + 'px';
      if (spotRule) { spotRule.style.setProperty('--mx', x); spotRule.style.setProperty('--my', y); }
      else { el.style.setProperty('--mx', x); el.style.setProperty('--my', y); }
    });
  }, { passive: true });
  doc.addEventListener('pointerleave', () => { spotEl?.classList.remove('aw-spot-on'); spotEl = null; });

  /* ------------------------------------------------------------------
     8 · Count-up metrics
     ------------------------------------------------------------------ */
  const NUM_SEL = '.stat strong, .newsletter-metric strong, .notion-cc-kpi strong, .dashboard-sub-metric strong, .dashboard-newsletter-stat strong, .sw-openai-kpis strong, .social-overview-kpis strong, .analytics-total';
  function countUp(scope) {
    if (REDUCED.matches) return;
    $$(NUM_SEL, scope).forEach(el => {
      if (el.__awCounted) return;
      el.__awCounted = true;
      /* only animate a lone text node, and write through nodeValue (a
         characterData mutation) so childList observers stay quiet */
      if (el.childNodes.length !== 1 || el.firstChild.nodeType !== 3) return;
      const node = el.firstChild;
      const txt = node.nodeValue.trim();
      const m = txt.match(/^([^\d-]*)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (!m) return;
      const target = parseFloat(m[2].replace(/,/g, ''));
      if (!isFinite(target) || Math.abs(target) < 2) return;
      const dec = (m[2].split('.')[1] || '').length, comma = m[2].includes(',');
      const fmt = n => { let v = n.toFixed(dec); if (comma) v = Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return m[1] + v + m[3]; };
      const t0 = performance.now(), dur = 820 + Math.min(600, Math.log10(Math.abs(target) + 1) * 160);
      const original = node.nodeValue;
      let last = fmt(0);
      node.nodeValue = last;
      const step = now => {
        if (!node.isConnected || el.firstChild !== node || node.nodeValue !== last) return;   // the CMS updated it: stand down
        const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(2, -10 * p);
        last = p >= 1 ? original : fmt(target * e);
        node.nodeValue = last;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------------
     9 · View changes: stagger reveal, editor mode, index, capsules
     ------------------------------------------------------------------ */
  let viewSig = '';
  function onViewMutated() {
    const v = viewEl();
    if (!v) return;
    const editing = Boolean(v.querySelector(':scope > .editor-grid'));
    body.classList.toggle('aw-editor', editing);
    const sig = (body.dataset.swView || '') + (editing ? ':edit' : '');
    if (sig !== viewSig) {
      viewSig = sig;
      Array.from(v.children).slice(0, 14).forEach((c, i) => c.style.setProperty('--aw-i', String(i)));
      if (!REDUCED.matches) {
        v.classList.remove('aw-enter');
        void v.offsetWidth;
        v.classList.add('aw-enter');
        clearTimeout(onViewMutated.t);
        onViewMutated.t = setTimeout(() => v.classList.remove('aw-enter'), 1500);
      }
      lastY = 0;
      body.classList.toggle('aw-scrolled', scrollTop() > 64);
    }
    ensureEyebrow(v);
    $$('input[type=range]', v).forEach(r => { if (!r.__awRange) { r.__awRange = true; paintRange(r); } });
    countUp(v);
    buildIndex();
    refreshControls();
  }
  /* Editorial eyebrow for page heads the CMS renders without one */
  const EYEBROW = {
    articles: 'Content / Editorial desk', newsletter: 'Distribution / Letter', canva: 'Distribution / Social studio',
    commandcenter: 'Operations / Control plane', topics: 'Content / Taxonomy', aiinstructions: 'Content / AI instructions'
  };
  function ensureEyebrow(v) {
    if (body.classList.contains('aw-editor')) return;
    const slot = v.querySelector(':scope > .page-head > div:first-child, :scope > .article-hub-head > div:first-child, :scope > .social-studio > .social-studio-head > div:first-child, :scope > .notion-cc > .notion-cc-head > div:first-child');
    if (!slot || slot.querySelector('.sw-page-eyebrow')) return;
    const text = EYEBROW[body.dataset.swView || ''];
    if (!text) return;
    const eb = doc.createElement('div');
    eb.className = 'sw-page-eyebrow aw-eyebrow';
    eb.textContent = text;
    slot.prepend(eb);
  }

  /* Range sliders: paint the filled part of the track */
  function paintRange(r) {
    const min = parseFloat(r.min || 0), max = parseFloat(r.max || 100), v = parseFloat(r.value);
    const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    r.style.setProperty('--aw-fill', clamp(pct, 0, 100).toFixed(1) + '%');
  }
  doc.addEventListener('input', e => { if (e.target && e.target.type === 'range') paintRange(e.target); }, true);

  function refreshControls() {
    $$(SEG_SELECTOR).forEach(setupSeg);
    placeNavCapsule();
    syncTabbar();
  }

  let moRaf = 0;
  const schedule = () => { if (moRaf) return; moRaf = requestAnimationFrame(() => { moRaf = 0; onViewMutated(); }); };

  function init() {
    ensureDrawerChrome();
    buildTabbar();
    const v = viewEl();
    if (v) {
      new MutationObserver(schedule).observe(v, { childList: true, subtree: true });
      v.addEventListener('scroll', onScroll, { passive: true });
    }
    const side = $('.sidebar');
    if (side) new MutationObserver(() => requestAnimationFrame(placeNavCapsule)).observe(side, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    const ws = $('.workspace');
    if (ws) new MutationObserver(() => requestAnimationFrame(refreshControls)).observe(ws, { childList: true, subtree: false });
    const ctx = $('#swContextTabs');
    if (ctx) new MutationObserver(() => requestAnimationFrame(() => setupSeg(ctx))).observe(ctx, { childList: true, attributes: true, subtree: true, attributeFilter: ['class'] });
    new MutationObserver(() => requestAnimationFrame(() => { syncTabbar(); placeNavCapsule(); })).observe(body, { attributes: true, attributeFilter: ['data-sw-section', 'data-sw-view'] });
    const cms = $('#cms');
    const syncLocked = () => { const locked = !cms || cms.classList.contains('hidden'); body.classList.toggle('aw-locked', locked); if (locked) setDrawer(false); };
    syncLocked();
    if (cms) new MutationObserver(() => { syncLocked(); requestAnimationFrame(() => { refreshControls(); onScroll(); }); }).observe(cms, { attributes: true, attributeFilter: ['class'] });
    doc.addEventListener('click', e => {
      if (e.target.closest(SEG_SELECTOR)) setTimeout(() => $$(SEG_SELECTOR).forEach(el => positionSeg(el)), 30);
    }, true);
    window.addEventListener('resize', () => { lensMapKey = ''; refreshControls(); if (!PHONE.matches) setDrawer(false); }, { passive: true });
    PHONE.addEventListener?.('change', () => { setDrawer(false); refreshControls(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(refreshControls);
    schedule();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.SignWellAurora = { version: 'R10', refresh: () => { indexKey = ''; schedule(); } };
})();
