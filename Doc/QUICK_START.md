# Invoice App v2.0 - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open in Browser
Navigate to `http://localhost:5173`

## 👤 Login Credentials

Demo login signs in with **real Supabase users** seeded by `supabase/migrations/054_demo_users.sql`.
On the login screen, type the username below (the password field is ignored — the
app signs in with the seeded credentials behind the scenes):

| Role | Username | Seeded email | Password | Access Level |
|------|----------|--------------|----------|--------------|
| **Admin** | `Admin` | `admin@demo.local` | `Demo123!` | Full system access |
| **Manager** | `Manager` | `manager@demo.local` | `Demo123!` | Team management |
| **Contractor** | `Contractor` | `contractor@demo.local` | `Demo123!` | Submit hours & view invoices |

> **First-time setup:** apply the SQL migrations to your Supabase project before
> logging in — at minimum `053_vendor_onboarding.sql` (onboarding schema) and
> `054_demo_users.sql` (these demo users). Without `054`, demo login will report
> a sign-in error.

### Re-testing contractor onboarding

To run the contractor onboarding flow from scratch again, execute
`supabase/reset_demo_contractor.sql` in the Supabase SQL Editor. It clears the
demo contractor's onboarding fields, work-order uploads, and (optionally)
generated invoice numbers. Safe to run repeatedly.

## 📱 Key Features to Test

### As Admin
1. View dashboard with metrics
2. Browse employee directory
3. Manage user access and roles
4. Review and approve submissions
5. Manage calendar and holidays

### As Manager
1. View team dashboard
2. Review pending submissions
3. Approve or reject team hours
4. View team member details

### As Contractor
1. Complete onboarding (Profile → Onboarding): upload a signed work order, enter
   role/rate/contract dates, and set your last invoice number
2. Submit work hours
3. View submission history
4. Generate PDF invoices (numbers continue from your last invoice number)
5. Update profile information

## 🛠️ Available Commands

```bash
# Development
npm run dev              # Start dev server (localhost:5173)

# Production
npm run build            # Build for production
npm run preview          # Preview production build (localhost:4173)

# Utilities
npm run type-check       # Check TypeScript types
```

## 📦 What's Included

✅ **Fully Functional App**
- 3 user portals (Admin, Manager, Contractor)
- Complete invoice management system
- PDF invoice generation
- Responsive design

✅ **Production Ready**
- Optimized build (~204 KB gzipped)
- Error boundaries
- Code splitting
- TypeScript support

✅ **Deployment Configs**
- Vercel configuration
- Netlify configuration
- Docker support
- Environment variables template

✅ **Documentation**
- Comprehensive README
- Deployment guide
- Production checklist
- This quick start guide

## 🚢 Deploy Now

### Vercel (Easiest)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 📚 Need More Help?

- **Full Documentation**: See [README.md](./README.md)
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Production Checklist**: See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

## 🎉 You're All Set!

The app is running at `http://localhost:5173`

Try logging in with different user roles to explore all features!

---

**Preview Server Running**: `http://localhost:4173` (production build preview)

