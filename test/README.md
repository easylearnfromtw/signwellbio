# SIGN WELL BIO · V8 Multi-page Editorial Test

Independent staging folder only; production home/CMS untouched.

## Full public routes (all with consistent iOS draggable, snapping bottom slider)

- `/test/` / `/test/index.html` — Homepage / Editorial cover
- `/test/topics.html` — Topics with interactive article filters
- `/test/about.html` — About the publication
- `/test/share.html` — Share with clipboard / native share
- `/test/newsletter.html` — Newsletter layout / no-send demo form
- `/test/article.html?story=health` — Full article reading with Aa text-size control
- `/test/privacy.html`, `/test/terms.html` — Test-site information / links to production policies
- `/test/profile.html` — Profile design placeholder (no personal data)
- `/test/confirm.html`, `/test/unsubscribe.html` — Unconnected test flow explanations
- `/test/error.html`, `/test/not-found.html` — Informational utility pages

## CMS design preview

- `/test/cms/` — Shortcut to `/test/review.html?area=cms`, with dashboard, articles, editor, publishing, analytics, and settings mock views.
- `/test/review.html` — Full design review for desktop/mobile Public and CMS.

## Architecture

- Shared CSS: `/test/assets/site.css`.
- Shared dock/search/interactions: `/test/assets/site.js`.
- One shared iOS-style drag navigation (home/topics/about/share/newsletter) injected on all public and utility test pages. Thumb snaps when clicked/dragged; compact behavior on downward scroll; keyboard Left/Right support.
- SVG monochrome icons only; no emoji. Responsive layouts.
- All static content is a demo and is NOT a real article, publication, subscription, analytics, or user database. No live APIs or credentials.
- Full-site test pages have `noindex,nofollow`.
