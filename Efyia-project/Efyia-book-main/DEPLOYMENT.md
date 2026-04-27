# Efyia Book — Deployment Guide

## Architecture

- **Frontend** — React + Vite SPA, deployed to Netlify
- **Backend** — Node.js + Express + Prisma, deployed to Railway
- **Database** — PostgreSQL, provisioned by Railway

---

## Backend — Railway Setup

### Step 1: Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Connect your GitHub account and select `efyia-book`.
4. Railway will detect the repository. **Do not deploy yet** — configure the service root first.

### Step 2: Set the service root directory

Railway needs to know your backend is in `/backend`, not the repo root.

1. In your Railway service settings → **Source** tab → set **Root Directory** to `backend`.
2. Set **Build Command** to `npm install && npm run db:generate`.
3. Set **Start Command** to `npm start`.

Railway will now only install and run the `/backend` folder.

### Step 3: Add a PostgreSQL database

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**.
2. Railway provisions a PostgreSQL instance and adds `DATABASE_URL` to your project variables automatically.
3. Confirm `DATABASE_URL` appears in your environment variables.

### Step 4: Set all required environment variables

In Railway → your backend service → **Variables** tab, add each of the following:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Auto-set by Railway | From the PostgreSQL addon |
| `JWT_SECRET` | 64-char random hex string | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `PORT` | `3001` | Railway also injects this automatically |
| `NODE_ENV` | `production` | Required for secure behavior |
| `CORS_ORIGINS` | `https://your-netlify-url.netlify.app` | Your Netlify frontend URL — no trailing slash |
| `PLATFORM_FEE_RATE` | `0.08` | 8% platform fee charged to clients |

**Optional (Stripe):**

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe webhook settings |

### Step 5: Run migrations on first deploy

Railway runs `npm run db:migrate` automatically on each deploy via the `release` command in `Procfile`. This runs `prisma migrate deploy`, which applies all pending migrations.

On the **very first deploy**, after migrations run, seed the database:

1. In Railway → your service → **Shell** tab (or use the Railway CLI).
2. Run: `npm run db:seed`

This creates all initial studios, users, and sample bookings. Default credentials for all seeded accounts: `efyia2024!`

### Step 6: Verify the backend is running

Visit your Railway backend URL in a browser:

```
https://your-backend.up.railway.app/health
```

Expected response:
```json
{ "status": "ok", "env": "production", "ts": "..." }
```

Also test an API endpoint:
```
https://your-backend.up.railway.app/api/studios
```

---

## Frontend — Netlify Setup

### Step 1: Deploy to Netlify

1. In Netlify → **Add new site** → **Import an existing project** → GitHub.
2. Select the `efyia-book` repo.
3. Set **Base directory**: _(leave blank — root of repo)_
4. Set **Build command**: `npm run build`
5. Set **Publish directory**: `dist`

### Step 2: Set environment variables in Netlify

In Netlify → your site → **Site configuration** → **Environment variables**:

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.up.railway.app` | Your Railway backend URL — no trailing slash |
| `VITE_APP_NAME` | `Efyia Book` | App name |

### Step 3: Set the CORS origin in Railway

After Netlify assigns your frontend URL, go back to Railway and update `CORS_ORIGINS` to match your Netlify URL exactly (e.g. `https://efyia-book.netlify.app`).

### Step 4: Verify the frontend

1. Visit your Netlify URL.
2. Confirm studios load on the homepage.
3. Test signup → log in → create a booking → check dashboard.

---

## Prisma migrations

To create a new migration after schema changes:

```bash
cd backend
npx prisma migrate dev --name describe_your_change
```

To deploy migrations to production:
```bash
npx prisma migrate deploy
```

Railway runs `prisma migrate deploy` automatically on every deploy via the `Procfile` release command.

---

## Local development

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your local DATABASE_URL and JWT_SECRET
npm install
npm run db:generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Frontend
```bash
# In repo root
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

---

## Environment variable checklist

### Backend (Railway)
- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `JWT_SECRET` — 64-char random secret
- [ ] `JWT_EXPIRES_IN` — e.g. `7d`
- [ ] `NODE_ENV` — `production`
- [ ] `CORS_ORIGINS` — Netlify frontend URL
- [ ] `PLATFORM_FEE_RATE` — e.g. `0.08`
- [ ] `PORT` — `3001` (Railway auto-injects, but set it explicitly)
- [ ] `STRIPE_SECRET_KEY` — Optional, required for Stripe payments
- [ ] `STRIPE_WEBHOOK_SECRET` — Optional, required for Stripe webhooks

### Frontend (Netlify)
- [ ] `VITE_API_URL` — Railway backend URL
- [ ] `VITE_APP_NAME` — `Efyia Book`

---

## What you still need to do manually

1. **Generate a strong JWT_SECRET** — run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and paste into Railway.
2. **Update CORS_ORIGINS in Railway** after Netlify assigns your URL.
3. **Run `npm run db:seed`** after first deploy to populate the database.
4. **Add Stripe keys** if you want live payment processing (currently bookings are confirmed without payment capture).
5. **Add a custom domain** in Netlify and Railway if needed; update CORS_ORIGINS accordingly.
6. **Set up a Mapbox access token** if you want a real interactive map — add `VITE_MAPBOX_TOKEN` in Netlify and integrate `mapbox-gl` in `MapPage.jsx`.
7. **Configure email notifications** (SendGrid or Postmark) for booking confirmations — this is not yet implemented.
