# Efyia Book in the WAV CAVE repo

This repository now contains an integrated Efyia Book MVP frontend built with React + Vite, plus a dedicated `backend/` folder with a working Node API service.

## What is included

### Frontend MVP
The frontend now delivers the Efyia Book marketplace experience from the supplied prototype brief:
- Home page with hero search and featured studios.
- Search and filter results page.
- Stylized map page with studio previews.
- Studio profile pages with overview, equipment, and reviews.
- Booking flow with a two-step checkout and confirmation handoff.
- Login and signup flows with demo account shortcuts.
- Client, studio owner, and admin dashboard views.
- Toast notifications and role-aware navigation.
- A setup-guide page preserving the requested production roadmap.

### Backend service
The new `backend/` folder includes:
- Node HTTP server with JSON parsing and CORS headers.
- Healthcheck endpoint.
- MVP endpoints for studios, bookings, reviews, favorites, and demo auth.
- In-memory seed data so the service runs immediately after install.
- Deployment instructions for Render, Railway, and Fly.io.

## Frontend commands
Install and run the Vite app from the repository root:

```bash
npm install
npm run dev
```

Build the frontend:

```bash
npm run build
```

## Backend commands
Install and run the API from the backend folder:

```bash
cd backend
npm run dev
```

Run the backend in production mode:

```bash
cd backend
npm start
```

## Routes in the frontend app
- `/` — home page
- `/discover` — search and filters
- `/map` — map preview page
- `/studios/:slug` — studio profile
- `/booking/:studioId` — booking flow
- `/login` — login
- `/signup` — signup
- `/dashboard/client` — client dashboard
- `/dashboard/studio` — studio owner dashboard
- `/dashboard/admin` — admin dashboard
- `/about-mvp` — setup guide and production roadmap

## Backend endpoints
- `GET /health`
- `GET /api/studios`
- `POST /api/studios`
- `GET /api/studios/:id`
- `PUT /api/studios/:id`
- `DELETE /api/studios/:id`
- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/reviews`
- `POST /api/reviews`
- `PUT /api/reviews/:id`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/:id`
- `POST /api/auth/demo-login`

## Demo accounts
Use these on the frontend login page:
- `admin@efyia.com`
- `owner@studio.com`
- `artist@music.com`

Any password will work in the prototype.

## Deploy notes
- The frontend can continue deploying from the repo root as a Vite site.
- The backend should deploy from the `backend/` directory as its own Node service.
- Full backend deployment steps are documented in `backend/README.md`.
