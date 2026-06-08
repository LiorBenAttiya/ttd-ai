# TTD AI — Deployment Guide

## Overview

| Layer | Service | URL |
|---|---|---|
| Backend API | Azure App Service (TTDAI) | https://ttdai.azurewebsites.net |
| Frontend | Hostinger (static) | https://your-domain.com |
| Database | Supabase PostgreSQL | (existing) |

---

## Step 1 — Create GitHub Repository

1. Go to https://github.com/new
2. Name it `ttd-ai` (or your preference), set to **Private**
3. From your local TTD folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/ttd-ai.git
   git push -u origin main
   ```

---

## Step 2 — Azure App Service Setup

1. Go to https://portal.azure.com → **Create a resource** → **Web App**
2. Settings:
   - **Name**: `TTDAI`
   - **Runtime stack**: Python 3.12
   - **OS**: Linux
   - **Region**: West Europe (or nearest)
   - **Pricing tier**: B1 (Basic, ~$13/month)
3. After creation → **Configuration** → **Application settings**, add ALL these:

| Key | Value |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | `postgresql+asyncpg://...` (your Supabase connection string) |
| `JWT_SECRET_KEY` | (generate with `openssl rand -hex 32`) |
| `CORS_ORIGINS` | `http://localhost:5173,https://your-domain.com` |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |
| `OPENAI_API_KEY` | your OpenAI key |
| `ANTHROPIC_API_KEY` | your Anthropic key |
| `AZURE_TENANT_ID` | your Azure AD tenant |
| `AZURE_CLIENT_ID` | your app registration client ID |
| `AZURE_CLIENT_SECRET` | your app registration secret |
| `GRAPH_REDIRECT_URI` | `https://ttdai.azurewebsites.net/api/v1/email/callback` |
| `WA_BRIDGE_URL` | `http://YOUR_HOME_IP:3001` (your local WA bridge) |
| `WA_OWNER_PHONE` | `972543090009` |

4. **Get Publish Profile**: Overview → **Download publish profile** → save as `azure-publish-profile.xml`

---

## Step 3 — GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | Value |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Paste entire contents of `azure-publish-profile.xml` |
| `VITE_API_URL` | `https://ttdai.azurewebsites.net` |
| `HOSTINGER_FTP_SERVER` | FTP hostname from Hostinger panel (e.g. `ftp.lbatech.com`) |
| `HOSTINGER_FTP_USERNAME` | Your Hostinger FTP username |
| `HOSTINGER_FTP_PASSWORD` | Your Hostinger FTP password |

---

## Step 4 — Hostinger Frontend

1. Log into Hostinger → **Hosting** → your domain → **File Manager**
2. Make sure `public_html/` exists and is the web root
3. The GitHub Action deploys `frontend/dist/` → `public_html/` automatically on every push to `main`

**Important:** Add a `.htaccess` in `public_html/` for React Router to work:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

---

## Step 5 — First Deploy

Push to `main` and watch GitHub Actions:
```bash
git add .
git commit -m "Phase E: hosting setup"
git push
```

Go to your repo → **Actions** tab → watch the `Deploy TTD AI` workflow run.

---

## Step 6 — Smoke Test

After deploy succeeds:
```bash
# Backend health
curl https://ttdai.azurewebsites.net/health

# Should return:
# {"status":"ok","app":"TTD AI","version":"1.0.0","env":"production"}
```

Then open your Hostinger domain — the frontend should load and connect to Azure.

---

## WhatsApp Bridge Note

The `wa-bridge` (whatsapp-web.js) must stay running **locally** on your machine — it cannot run on Azure without a persistent WebSocket. Set `WA_BRIDGE_URL` in Azure to your home IP:
- Use a static IP or DynDNS
- Or use **ngrok**: `ngrok http 3001` → copy the HTTPS URL → paste into `WA_BRIDGE_URL` app setting

---

## Local Dev (unchanged)

```bash
# Backend
cd backend && venv/Scripts/uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```
