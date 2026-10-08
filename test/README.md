# SIGNWELL BIO / TEST — V9 Editorial Finish

This directory is an isolated design test. Production homepage, production CMS, backend and subscriber data remain unchanged.

## Design goals

- Distinct, art-directed magazine cover rather than generic 3D effects.
- Comfortable long-form typography and restrained monochrome SVG iconography; **no emoji**.
- All pages share visual tokens, editorial spacing, responsive components and a fixed five-way iOS-style drag/snapping slider.
- Slider supports tap, horizontal drag, animated selection, compact-on-scroll, keyboard arrows, prefers-reduced-motion and safe-area offsets.
- Public and CMS remain separate visual systems. CMS is a review-only layout, not a publishing service.

## Routes

Public: `/`, `/topics.html`, `/about.html`, `/share.html`, `/newsletter.html` (relative to /test/).

Article reading: `/article.html?story=health`; test navigation is wired directly to this page. Helpers: `/profile.html`, `/privacy.html`, `/terms.html`, `/confirm.html`, `/unsubscribe.html`, `/error.html`, `/not-found.html`.

CMS review: `/cms/` redirects to `/review.html?area=cms`. `/review.html` includes desktop/mobile mockups of CMS and its article editor, publishing, analytics, settings and system rules.

## Assets

- `assets/site.css` — shared editorial tokens, page signatures, navigation styling.
- `assets/site.js` — shared five-entry draggable dock, local sample search, topic filters, share, simulated newsletter, reading control.
- `index.html` — full-bleed standalone V9 cover with links to individual test pages.

## Safety and data boundaries

- No real subscriptions, emails, accounts, publication, analytics or CMS writes from these demo pages.
- All sample articles and figures are illustrative, not verified, published medical content.
- All test HTML files are marked `noindex,nofollow`.
- A successful GitHub Pages deploy is not a substitute for browser/device interaction QA.

## Static QA performed

- 15 HTML routes and two shared CSS/JS assets inspected.
- No emoji, missing internal HTML links, unmatched SVG pairs or indexing omissions found.
- JavaScript syntax and CSS rule structure passed checks.
- iOS Safari / Android Chrome and desktop browser interaction testing still required before promotion to production.
