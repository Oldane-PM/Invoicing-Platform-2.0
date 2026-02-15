# Deploy Backend to Render

This guide walks through deploying the **backend API** to Render so your Vercel frontend can connect to it.

## Prerequisites

- GitHub repo connected to Render
- Supabase project (already set up)
- Google OAuth credentials
- Vercel frontend URL: `https://invoicing-platform-2-0.vercel.app`

---

## Step 1: Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `Invoicing-Platform-2.0`
4. Use the settings below

---

## Step 2: Build & Start Commands

| Setting | Value |
|---------|-------|
| **Name** | `invoice-app-api` (or any name) |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm run start:server` |
| **Plan** | Free (or paid) |

---

## Step 3: Environment Variables

Add these in Render → **Environment** tab. Get values from your local `.env`.

### Required

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Render may set this automatically |
| `BETTER_AUTH_URL` | `https://YOUR-RENDER-URL.onrender.com/api/auth` | Use your Render service URL; **set this after first deploy** |
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

## Step 4: First Deploy

1. Click **Create Web Service**
2. Wait for the first deploy to finish
3. Note your service URL (e.g. `https://invoice-app-api-xxxx.onrender.com`)

---

## Step 5: Update BETTER_AUTH_URL

1. Go to **Environment** in your Render service
2. Set `BETTER_AUTH_URL` = `https://YOUR-RENDER-URL.onrender.com/api/auth`
3. Add your Render URL to `ALLOWED_ORIGINS` if needed:  
   `https://invoicing-platform-2-0.vercel.app,https://YOUR-RENDER-URL.onrender.com`
4. Trigger a **manual deploy** so the new env vars take effect

---

## Step 6: Configure Vercel Frontend

In your Vercel project (frontend):

1. Go to **Settings** → **Environment Variables**
2. Add: `VITE_AUTH_BASE_URL` = `https://YOUR-RENDER-URL.onrender.com` (no trailing slash)
3. Redeploy the frontend

---

## Step 7: Google OAuth Redirect URI

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials:

1. Edit your OAuth 2.0 Client
2. Add to **Authorized redirect URIs**:
   - `https://YOUR-RENDER-URL.onrender.com/api/auth/callback/google`
3. Add to **Authorized JavaScript origins**:
   - `https://invoicing-platform-2-0.vercel.app`
   - `https://YOUR-RENDER-URL.onrender.com`

---

## Health Check

After deploy, verify:

```bash
curl https://YOUR-RENDER-URL.onrender.com/health
# Should return: {"ok":true}
```

---

## Free Tier Notes

- Free services sleep after ~15 minutes of no traffic
- First request after sleep can take 30–60 seconds (cold start)
- Consider a paid plan for production use
