# Talkify

A WhatsApp-style chat application. **Currently in early development** — authentication and user-sync are working and verified; chat/messaging functionality is not yet built.

## Status: Work in Progress

This README describes what's actually implemented and tested right now, not the final planned product. Don't treat this as a finished chat app.

### Working and verified

- Clerk authentication on the frontend (sign in / sign up via modal)
- Clerk → backend webhook → MongoDB user sync (`user.created`, `user.updated`, `user.deleted` events write/update/delete a `User` document)
- Single-container monolith: Express serves both the built React frontend and the API from one process, one port, one URL
- Local dev MongoDB connection and webhook delivery verified end-to-end using ngrok as a tunnel

### Not yet implemented

- No chat/messaging API routes (`Message` model exists in the schema but nothing reads or writes to it yet)
- No chat UI — the frontend is currently just a placeholder page with Clerk sign-in/sign-up buttons
- No real-time transport (sockets) of any kind yet

## Architecture

This is a **monolith**, not two separately hosted services. The root `Dockerfile` runs a 3-stage build:

1. Builds the Vite/React frontend → static files
2. Builds the Express/Node backend
3. Copies the frontend's built static files into the backend's `public/` folder

At runtime, one Express server (`backend/src/index.js`) does two jobs on one port:

- Serves the API (currently: `/health`, `/api/webhooks/clerk`)
- Serves the built frontend as static files, with a catch-all route for client-side routing

This means one deployed instance = one URL = both frontend and backend. You do not need to deploy the frontend and backend separately.

## Tech Stack

**Backend:** Node.js (ESM), Express 5, Mongoose, MongoDB, Clerk (`@clerk/express`), `cron`
**Frontend:** React 19, Vite, Clerk (`@clerk/react`)

## Environment Variables

Split into two categories — mixing these up is the most common setup mistake in this project.

### Backend — runtime env vars (`backend/.env`)

| Variable                       | Required    | Notes                                                              |
| ------------------------------ | ----------- | ------------------------------------------------------------------ |
| `PORT`                         | Yes         | e.g. `3001`                                                        |
| `MONGO_URI`                    | Yes         | Local (`mongodb://localhost:27017/...`) or Atlas connection string |
| `FRONTEND_URL`                 | Yes         | Used for CORS origin and the keep-alive cron ping                  |
| `CLERK_SECRET_KEY`             | Yes         | From Clerk dashboard → API Keys                                    |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Yes         | From Clerk dashboard → Webhooks → your endpoint                    |
| `NODE_ENV`                     | Set by host | `production` on deploy; triggers the cron keep-alive job           |

### Frontend — build-time arg, not a runtime env var

| Variable                     | Required | Notes                                                                                                                                                                                                                                                                                |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes      | **Baked into the JS bundle at build time by Vite.** Must be present in `frontend/.env` before running `npm run build`, or passed as a Docker `--build-arg`. Setting it as a normal runtime env var on your host will NOT work — Vite only reads `VITE_*` vars during the build step. |

## Local Development

### Option A — manual (no Docker)

```bash
# 1. Build the frontend
cd frontend
npm install
npm run build

# 2. Copy the build into the backend's public folder
cd ../backend
rm -rf public && cp -r ../frontend/dist ./public

# 3. Install backend deps and run
npm install
NODE_ENV=production node src/index.js
```

Visit `http://localhost:<PORT>`.

### Option B — Docker (mirrors production)

```bash
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_your_key -t talkify .
docker run --env-file backend/.env -e NODE_ENV=production -p 3001:3001 talkify

cd frontend
npm run build
cd ../backend
rm -rf public && cp -r ../frontend/dist ./public
NODE_ENV=production node src/index.js

ngrok http 3000

```

### Testing the Clerk webhook locally

Clerk's servers can't reach `localhost` directly. To test the webhook → MongoDB path on your own machine:

1. Run `ngrok http <PORT>` in a separate terminal.
2. Copy the forwarding URL ngrok gives you.
3. In Clerk dashboard → Webhooks → your endpoint → Edit, set the URL to:
   ```
   https://<your-ngrok-domain>/api/webhooks/clerk
   ```
4. Confirm the Signing Secret on that page matches `CLERK_WEBHOOK_SIGNING_SECRET` in your `.env`.
5. Sign up in the app and check your MongoDB `users` collection.

This step is local-development-only. Once deployed, your host gives you a real public URL and ngrok is not needed.

## Deployment

The app is built to deploy as a single Docker image — one service, one URL, no separate frontend/backend hosting needed.

Notes from testing:

- Render's free tier officially doesn't require a credit card, but in practice many accounts get gated behind a card requirement anyway (inconsistent, account-risk-based, not something you're doing wrong).
- Koyeb currently offers a genuinely free single web-service tier without a forced card requirement for most signups, and supports deploying directly from a Dockerfile.
- Whichever host you use, remember to pass `VITE_CLERK_PUBLISHABLE_KEY` as a **build argument**, not a regular environment variable.

## Known Issues

- No chat/message routes exist yet — `Message` model is defined but unused.
- The catch-all static route in `backend/src/index.js` should be simplified to drop the unused error callback on `sendFile`.
