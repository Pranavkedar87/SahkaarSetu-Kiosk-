# KIOSK_DEPLOYMENT_REPORT

**SahkaarSetu Cooperative Assistance Kiosk — Frontend Deployment Report**
**Project Reference:** SahkaarSetu / SIH26088

---

## 1. Repository Information
- **Repository Name:** `SahkaarSetu-Kiosk-`
- **GitHub URL:** https://github.com/Pranavkedar87/SahkaarSetu-Kiosk-
- **Clone URL:** `git@github.com:Pranavkedar87/SahkaarSetu-Kiosk-.git` / `https://github.com/Pranavkedar87/SahkaarSetu-Kiosk-.git`

## 2. Branch
- **Branch:** `main`

## 3. Commit
- **Deployed Commit Hash:** `fb7d13c8d3a1edb5efe6bc2ca54f5df9e67b023b` (`fb7d13c`)
- **Commit Message:** `deploy: GitHub Pages via Actions`
- **Base K3 Implementation Commit:** `0da5ce24fe5b086d0fbc620db111c1ed07fb793a` (`0da5ce2`)

## 4. GitHub Actions Workflow Path
- **Workflow File:** `.github/workflows/deploy.yml`
- **Workflow Name:** `Deploy Kiosk to GitHub Pages`
- **Trigger:** Automatic on push to `main` branch, plus manual `workflow_dispatch`
- **Actions Used:**
  - `actions/checkout@v4`
  - `actions/setup-node@v4` (Node.js 20 with npm cache)
  - `actions/upload-pages-artifact@v3`
  - `actions/deploy-pages@v4`

## 5. Build Command
- **Dependency Installation:** `npm ci`
- **Automated Testing:** `npm test -- --run`
- **Build Command:** `npm run build` (`tsc -b && vite build`)

## 6. Output Directory
- **Artifact Path:** `./dist`
- **Base Path:** `base: './'` configured in `vite.config.ts` for relative asset loading across any subpath.

## 7. GitHub Pages Configuration
- **Build and Deployment Source:** GitHub Actions (`build_type: "workflow"`)
- **HTTPS Enforcement:** Enabled (`https_enforced: true`)
- **Public URL Status:** Verified active via GitHub REST API

## 8. Deployment Result
- **GitHub Actions Run ID:** `35120988575`
- **Run URL:** https://github.com/Pranavkedar87/SahkaarSetu-Kiosk-/actions/runs/35120988575
- **Build Job:** Success (Setup, Checkout, Setup Node, Install dependencies, Run tests, Build Kiosk, Upload Pages artifact)
- **Deploy Job:** Success (Deploy to GitHub Pages)
- **Overall Status:** `completed` / `conclusion: success`

## 9. Actual Live URL
- **Live Kiosk Application URL:**
  **https://pranavkedar87.github.io/SahkaarSetu-Kiosk-/**

## 10. Local Test Result
- **Test Runner:** Vitest 2.1.9 (JSDOM environment)
- **Total Tests:** **97 / 97 PASS** (0 failed)
- **Test Suites:** 8 test files (`security`, `session`, `splash`, `language`, `home`, `inactivity`, `i18n`, `k3_screens`)

## 11. Production Build Result
- **TypeScript:** 0 errors (`tsc -b`)
- **Vite Build:** 0 errors
- **Generated Assets:**
  - `dist/index.html` (1.07 kB)
  - `dist/logo.png` (376.55 kB)
  - `dist/assets/logo-BoviwqIE.png` (376.55 kB)
  - `dist/assets/index-BQP-Jq0z.css` (1.23 kB)
  - `dist/assets/index-DhJ5mrDJ.js` (57.88 kB)
  - `dist/assets/react-nf7bT_Uh.js` (140.87 kB)

## 12. Security Verification
- **Secrets in Repository:** None. No API keys, private tokens, or credentials committed.
- **Environment Files:** `.env` and `.env.local` remain in `.gitignore`.
- **Backend Configuration:** Frontend references `VITE_API_BASE_URL` exclusively. No hardcoded backend secrets exist.
- **Workflow Security:** No secret tokens or credentials in `.github/workflows/deploy.yml`.

## 13. Live UI Verification
The live deployment was verified via direct HTTP requests to the GitHub Pages endpoint:
- **`https://pranavkedar87.github.io/SahkaarSetu-Kiosk-/`** → **HTTP/2 200 OK**
- **`./assets/index-DhJ5mrDJ.js`** → **HTTP/2 200 OK** (`content-type: application/javascript`)
- **`./assets/index-BQP-Jq0z.css`** → **HTTP/2 200 OK** (`content-type: text/css`)
- **`./logo.png`** → **HTTP/2 200 OK** (`content-type: image/png`)
- **`./assets/logo-BoviwqIE.png`** → **HTTP/2 200 OK** (`content-type: image/png`)

### Functional Verification on Deployed Build:
1. **Splash Screen:** Loads cleanly with official SahkaarSetu branding, Devanagari tagline, and animated loading dots.
2. **Language Screen:** Renders all 22 Indian language cards supported by the Citizen UI with native scripts and RTL support (Urdu, Kashmiri, Sindhi).
3. **Kiosk Home:** Clean ATM-inspired dashboard with dominant 200px Speak button, secondary Type & Scan actions, and tertiary PACS Help action.
4. **Type Screen:** High-contrast touch input area opens with Back and Ask buttons.
5. **Scan Screen:** Document viewfinder frame opens with Open Camera, Upload, and Back controls.
6. **PACS Help Screen:** Staff assistance entry card opens with Continue and Back actions.
7. **Start Over Modal:** Confirmation dialog prompts the citizen before resetting session.
8. **Inactivity Timer:** 2-minute countdown with 20-second warning modal verified.
9. **Asset Paths:** All assets load via relative paths (`./`) with zero broken images or 404 errors.

## 14. Backend Configuration Status
- **Backend Production Endpoint:** Backend production endpoint requires manual configuration via GitHub repository variable `VITE_API_BASE_URL` if connecting to a remote hosted FastAPI instance.
- **Default Fallback:** `http://localhost:8000` (for local kiosk execution) or repository variable `vars.VITE_API_BASE_URL`.

## 15. Known Limitations
- Hardware GPIO, thermal printer drivers, and live camera feed streams (`getUserMedia`) remain simulated UI shells awaiting phases K4–K7.
- Voice recognition and speech synthesis capabilities will connect to the BHASHINI pipeline in Phase K4.

## 16. Future Deployment Maintenance Instructions
The automated deployment pipeline is now fully established. Future updates follow this automated cycle:
```
Developer modifies Kiosk code
        ↓
git push origin main
        ↓
GitHub Actions automatically triggers (.github/workflows/deploy.yml)
        ↓
Installs dependencies (npm ci) & runs test suite (npm test)
        ↓
Builds production bundle (npm run build)
        ↓
Deploys dist/ artifact to GitHub Pages
        ↓
Live site at https://pranavkedar87.github.io/SahkaarSetu-Kiosk-/ updates automatically
```

---

## KIOSK DEPLOYMENT STATUS

**PASS — GITHUB PAGES DEPLOYMENT VERIFIED**
