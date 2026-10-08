# SIGNWELL BIO — staging /test/

An independent GitHub Pages test environment. **No production CMS, public homepage, article database, subscriber list, permissions or backend is modified by this staging implementation.**

## Primary routes

- Homepage / Three.js motion and editorial reading: https://easylearnfromtw.github.io/signwellbio/test/
- Editorial test CMS: https://easylearnfromtw.github.io/signwellbio/test/cms/
- Preview of this browser's saved local draft: https://easylearnfromtw.github.io/signwellbio/test/index.html?preview=1
- Independent motion laboratory: https://easylearnfromtw.github.io/signwellbio/test/experience.html
- Previous public/CMS design review: https://easylearnfromtw.github.io/signwellbio/test/review.html
- Other public routes: /topics.html, /about.html, /share.html, /newsletter.html, /article.html?story=health, /privacy.html, /terms.html

## Current CMS prototype wiring

1. The CMS at /test/cms/ loads **../assets/test-cms-schema.js** and **studio.js** with a black/white iOS-influenced layout in **studio.css**.
2. Fields cover intro copy, scene 01–03 copy, article curation, section headings, editor's note, newsletter section.
3. The user edits fields, presses **儲存草稿**, then clicks **預覽首頁**. The preview route loads the same schema and **assets/home-preview.js** to override text and links in the homepage DOM.
4. Preview is **opt-in via ?preview=1**. Normal visitors to /test/ see the default design. The only persistent change is browser-local storage under **signwellbio:test:homepage-draft:v1**.
5. Article curation uses a hard-coded demo catalog and routes to test sample articles. Changing curation is **not** an article publication action.
6. Production CMS remains at **../cms/**; it has independent authentication, data and publishing workflows. The staging editor is unauthenticated and **never communicates with production Apps Script or CMS backend**.

**Security:** Do not enter credentials, patient records, subscriber data or other private information into this unauthenticated test CMS. Local draft storage is tied to this browser/origin, is not shared to another device, and can disappear if browser storage is cleared.

## Visual system

- Scroll-driven Three.js + GSAP animation is **primarily for the homepage only**.
- The 3D scene loads lazily and has a CSS fallback if WebGL or an external package is unavailable.
- On mobile, editorial copy has reserved space; the 3D foreground is smaller and shifted to the bottom-right.
- Reading/article/other pages are deliberately less animated.
- Existing bottom iOS-like five-item drag/swipe slider remains shared across test public pages.
- No emoji. System typography, monochrome SVG iconography, warm paper backgrounds and graphite/blue/gold accents.
- Reduced-motion support and test-only noindex directives are required.

## Integration requirements before any promotion to production

- Replace the local demo schema with a versioned CMS/public API contract.
- Preserve production login/session handling, admin authorization, article IDs, draft/published status, subscriber consent, CSRF/origin restrictions and errors.
- Update public story rendering from real CMS published records; never mix drafts into the public feed.
- Provide preview tokens or authenticated previews and draft validation, with server-side enforcement.
- Test exact iPhone and desktop viewports; deploy to production only after separately approved QA and data migration checks.

## Validation notes

GitHub Files and deployment are inspected with the connected GitHub account. Static JS/CSS, unique landing-section IDs and file references were checked. This is **not** proof of full Safari touch interaction, backend sync or successful user login.

