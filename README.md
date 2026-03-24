# Digital Academy Frontend

Frontend application for Digital Academy, built with React + TypeScript + Vite.

## Team

- Project Manager: Firdavs Kamolov
- Frontend Developer: Shamsiddin Dosqulov
- Frontend Developer: Kamoliddin Muhiddinov
- Frontend Developer: Isroil Orinboyev
- Backend Developer: Habibullo Abdunigmonov
- UI/UX Designer: Shavkat Nematov
- UI/UX Designer: Muxammadjon Sultonmurodov

## Tech Stack

- React 18
- TypeScript
- Vite 6
- React Router 7
- Tailwind CSS 4
- Radix UI components
- Sonner (toast notifications)

## Project Structure

```text
src/
	main.tsx
	app/
		App.tsx
		routes.tsx
		components/
		pages/
		services/
		store/
		utils/
		data/
	styles/
```

## Requirements

- Node.js 18+ (recommended)
- npm / pnpm / yarn

## Local Development

Install dependencies and run dev server:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment Variables

Create a `.env` file in project root:

```bash
VITE_API_URL=https://api.digital-academy.live
```

Notes:
- If `VITE_API_URL` is not provided, frontend falls back to `https://api.digital-academy.live`.
- API base URL is configured in `src/app/services/api.ts`.

## Routing Overview

Main routes include:

- `/` home
- `/courses` course listing
- `/course/:id` course details
- `/search` search
- `/cart` shopping cart
- `/checkout` protected checkout
- `/profile` protected profile
- `/instructor` protected instructor dashboard
- `/learn/:courseId` protected learning page
- `/certificate/:courseId` protected certificate page
- `/help`, `/about`, `/contact`
- auth routes: `/login`, `/signup`, `/forgot-password`, `/auth/callback`, `/set-password/:userId`

Router setup lives in `src/app/routes.tsx`.

## Auth and API Notes

- Access and refresh tokens are stored in localStorage:
	- `da_access_token`
	- `da_refresh_token`
- API client automatically attaches bearer token when available.
- On `401`, token refresh is attempted automatically.
- Core API utility: `apiRequest` in `src/app/services/api.ts`.

## State Management

Context-based state is used for:

- Authentication (`AuthContext`)
- Cart (`CartContext`)

Providers are wired in `src/main.tsx`.

## Styling

- Global styles in `src/styles/`
- Tailwind CSS via Vite plugin
- Shared UI primitives under `src/app/components/ui`

## Deployment

This frontend is static-build based (Vite output).
Production updates appear only after deployment is executed on server or CI.

### If deployment is manual on a DigitalOcean droplet

Typical flow on server:

```bash
cd /path/to/front
git pull origin <deploy-branch>
npm install
npm run build
# then restart/reload the process serving built files (nginx/pm2/systemd setup dependent)
```

### If you expect auto-deploy

Confirm one of these exists:

- GitHub Actions pipeline connected to droplet
- DigitalOcean App Platform auto-deploy from branch
- Webhook/CI script on push

If none exists, pushes to GitHub will not auto-update production.

## Current npm Scripts

```json
{
	"dev": "vite",
	"build": "vite build"
}
```

## Troubleshooting

- Changes visible locally but not in production:
	- verify pushed commit is on deployed branch
	- verify droplet pulled latest commit
	- rebuild and restart static serving process
	- clear browser/CDN cache
- API errors in production:
	- verify `VITE_API_URL`
	- verify backend CORS and token endpoints
