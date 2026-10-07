# SIGN WELL Backend

The production Google Apps Script Web App is deployed separately from GitHub Pages.

Current live health (verified by Live E2E QA):
- release: **v24.25.3**
- bridge protocol: **23.9.92**
- environment: **production**
- CMS origin: `https://easylearnfromtw.github.io`
- Public target: `easylearnfromtw/signwellbio@main`

## Important

Do **not** deploy files under `backend/archive/` over the live Apps Script deployment. Those files are historical recovery sources and can be older than production.

The current CMS uses the live Apps Script deployment through the configured `/exec` endpoint and performs:
1. CMS ↔ Apps Script iframe bridge validation.
2. Runtime GitHub target validation.
3. GitHub writable preflight.
4. Atomic Public commit.
5. GitHub content verification.
6. GitHub Pages live revision verification.

The canonical deployable Apps Script source should only be added here after it is recovered from the v24.36.x full package or exported from the active Apps Script project.
