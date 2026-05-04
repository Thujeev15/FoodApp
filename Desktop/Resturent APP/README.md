# Restaurant App

Full-stack Restaurant application with separate `Backend` (Node.js/Express) and `Frontend` (React / React Native) folders.

## Summary
- **Backend**: REST API implemented with Node.js and Express. Contains routes, controllers, models, middleware and scripts for seeding and maintenance.
- **Frontend**: Mobile/React app (has `App.js` and `app.json`) that consumes the backend API and provides customer/admin/rider screens.

## Features
- User authentication (login/register)
- Menu and categories management
- Cart and ordering flow
- Promotions and payments
- Reviews and rider management

## Prerequisites
- Node.js (16+ recommended)
- npm or yarn
- MongoDB instance (local or hosted)

## Environment variables
Create a `.env` in `Backend/` with at least the following values (examples):

- `MONGO_URI` — MongoDB connection string
- `PORT` — Backend port (e.g. 3000)
- `JWT_SECRET` — Secret for signing JWTs
- `STRIPE_SECRET_KEY` — (optional) Stripe secret if payments used

The exact variables required depend on `Backend/config` and controllers.

## Backend — Setup & Run
1. Install dependencies

```bash
cd Backend
npm install
```

2. Start the server

```bash
# development
npm start
# or directly
node server.js
```

3. Useful scripts (in `Backend/scripts`)

```bash
# Seed demo data
node scripts/seed_demo_data.js

# Activate recent promotions
node scripts/activate_recent_promotions.js
```

## Frontend — Setup & Run
1. Install dependencies

```bash
cd Frontend
npm install
```

2. Start the app

```bash
npm start
# or use your usual React Native / Expo commands if applicable
```

The frontend expects the backend API base URL to be configured in `Frontend/src/api/axios.js` or via environment config.

## Project Structure (top-level)

- `Backend/` — server, routes, controllers, models, middleware, scripts, uploads
- `Frontend/` — mobile app, screens, navigation, contexts, API client

## Development Notes
- Static uploads are in `Backend/uploads` — ensure this folder is writable by the server.
- API route definitions live in `Backend/routes` and are wired in `server.js`.
- If you add environment variables, restart the backend server.

## Troubleshooting
- If the frontend cannot reach the backend, verify `MONGO_URI` and backend `PORT` and the frontend API base URL.
- Check server logs (console) for startup errors.

## Contributing
Open an issue or submit a pull request. For code changes, run linters/tests (if present) before creating a PR.

## License
MIT

---
If you want, I can: run the app, commit this README, or expand any section (API docs, env vars, scripts).
