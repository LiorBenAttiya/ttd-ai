# Deploy Instructions — Run these when you wake up

## Step 1 — Push the code (CMD in TTD folder)

```
git add -A
git commit -m "fix: production auth + eliminate npm install crash loop"
git push
```

## Step 2 — Add INTERNAL_SERVICE_KEY to Azure App Settings

Go to: Azure Portal → TTDAI → Configuration → Application settings → New application setting

Name:  INTERNAL_SERVICE_KEY
Value: 124eec7768cb326e922a4af5228e75de37b8a40fb69b6879dfd5c0c1ae34db77

Click Save → then Restart the app.

## Step 3 — Add INTERNAL_SERVICE_KEY to GitHub Secrets

Go to: https://github.com/liorbenattiya/ttd-ai/settings/secrets/actions → New repository secret

Name:  INTERNAL_SERVICE_KEY
Value: 124eec7768cb326e922a4af5228e75de37b8a40fb69b6879dfd5c0c1ae34db77

## What happens after you push:

- GitHub Actions runs (~5-6 min): pre-installs wa-bridge node_modules (17 MB)
  and bakes VITE_INTERNAL_SERVICE_KEY into the frontend build
- Azure deploys the new package (no more OOM crash loop)
- On first startup: wa-bridge downloads Chromium once (~2 min) to /home/puppeteer-cache/
- QR code page appears — scan it with your phone
- After that, every restart is instant (Chromium cached)

## What was fixed:

1. `dev-token` returned 404 in production → both frontend and wa-bridge
   couldn't authenticate → new `service-token` endpoint works in production

2. npm install at startup downloaded Chromium (120MB) → OOM → crash loop
   → now node_modules is bundled in the deployment, Chromium downloaded
   once separately to persistent /home/ storage

## Files changed:
- backend/app/core/config.py     — added INTERNAL_SERVICE_KEY setting
- backend/app/routers/auth.py    — added POST /api/v1/auth/service-token
- frontend/src/services/api.ts   — ensureToken uses service-token in prod
- wa-bridge/index.js             — getToken uses service-token in prod
- .github/workflows/deploy.yml   — pre-install node_modules + bake key in frontend
- backend/app/main.py            — detect bundled node_modules, skip npm install,
                                   one-time Chromium download via _ensure_chromium()
