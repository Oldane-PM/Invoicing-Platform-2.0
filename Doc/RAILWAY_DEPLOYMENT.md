# Deploy Backend to Railway

This guide walks through deploying the **backend API** to Railway so your Vercel frontend can connect to it.

## Prerequisites

- [Railway](https://railway.app) account
- GitHub repo connected
- Supabase project (already set up)
- Google OAuth credentials
- Vercel frontend URL: `https://invoicing-platform-2-0.vercel.app`

---

## Step 1: Create a New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Connect your GitHub account if needed, then select `Invoicing-Platform-2.0`
5. Railway will create a new service from your repo

---

## Step 2: Configure the Service

This repo includes a **`railway.toml`** file in the root that tells Railway how to build and run the backend:

```toml
[build]
buildCommand = "npm install"

[deploy]
startCommand = "npm run start:server"
healthcheckPath = "/health"
healthcheckTimeout = 100
```

Railway will pick this up automatically. If you need to override in the dashboard:

| Setting | Value |
|---------|-------|
| **Root Directory** | (leave blank – repo root) |
| **Build Command** | `npm install` |
| **Start Command** | `npm run start:server` |
| **Watch Paths** | (optional) `Server/**` to redeploy on server changes |

---

## Step 3: Add Environment Variables

Go to the **Variables** tab and add these (from your local `.env`):

### Required

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Railway may set this automatically |
| `BETTER_AUTH_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api/auth` | Use your Railway URL; **set after first deploy** |
| `BETTER_AUTH_SECRET` | Your secret | Same as local |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Same as local |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret | Same as local |
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | From Supabase dashboard |
| `ALLOWED_ORIGINS` | `https://invoicing-platform-2-0.vercel.app` | Comma-separated for multiple origins |

### Optional (Invoice / App config)

| Key | Value |
|-----|-------|
| `COMPANY_NAME` | Intelligent Business Platforms |
| `COMPANY_ADDRESS` | 12020 Sunrise Valley Dr. Reston, VA, 20191 |
| `COMPANY_COUNTRY` | United States |
| `INVOICE_DUE_DAYS` | 15 |
| `INVOICE_CURRENCY` | USD |
| `SUPABASE_INVOICES_BUCKET` | invoices |

---

## Step 4: Generate a Public URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain** (or **Add Domain**)
3. Railway assigns a URL like `https://your-app-name.up.railway.app`
4. Copy this URL for the next steps

---

## Step 5: Update BETTER_AUTH_URL

1. Go to **Variables**
2. Set `BETTER_AUTH_URL` = `https://YOUR-RAILWAY-URL.up.railway.app/api/auth`
3. Add Railway URL to `ALLOWED_ORIGINS`:  
   `https://invoicing-platform-2-0.vercel.app,https://YOUR-RAILWAY-URL.up.railway.app`
4. Railway will redeploy automatically when variables change

---

## Step 6: Configure Vercel Frontend

In your Vercel project (frontend):

1. Go to **Settings** → **Environment Variables**
2. Add: `VITE_AUTH_BASE_URL` = `https://YOUR-RAILWAY-URL.up.railway.app` (no trailing slash)
3. Redeploy the frontend

---

## Step 7: Google OAuth Redirect URI

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials:

1. Edit your OAuth 2.0 Client
2. Add to **Authorized redirect URIs**:
   - `https://YOUR-RAILWAY-URL.up.railway.app/api/auth/callback/google`
3. Add to **Authorized JavaScript origins**:
   - `https://invoicing-platform-2-0.vercel.app`
   - `https://YOUR-RAILWAY-URL.up.railway.app`

---

## Health Check

After deploy, verify:

```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/health
# Should return: {"ok":true}
```

---

## Railway Notes

- **Port:** Railway sets `PORT`; your server already uses `process.env.PORT ?? 5001`
- **Deploys:** Automatic deploys on push to the connected branch
- **Logs:** View logs in the **Deployments** tab
- **Free tier:** Railway offers $5/month in free usage; no cold starts like Render’s free tier
