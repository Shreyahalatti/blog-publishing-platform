# Inkwell — blog publishing platform

Inkwell is a responsive blog app with a React + TypeScript client, an Express API, and PostgreSQL storage through Prisma. Readers can browse and search published stories, create accounts, publish and manage their own stories, and join discussions in comments.

## Run locally

Requirements: Node.js 20+ and PostgreSQL 14+.

1. Create a PostgreSQL database, for example `inkwell`.
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and a long, random `JWT_SECRET`.
3. Install dependencies and create the database tables:

   ```sh
   npm install
   npm run db:migrate --workspace server
   ```

4. Start the app:

   ```sh
   npm run dev
   ```

The Vite client runs at `http://localhost:5173` and proxies `/api` requests to the Express server at `http://localhost:3000`. Create an account and publish your first story to populate the feed.

## Production build

```sh
npm run build
npm start
```

The Express server serves the built client and API from the same origin. Set `DATABASE_URL`, `JWT_SECRET`, and (optionally) `CLIENT_ORIGIN` in the production environment. `CLIENT_ORIGIN` accepts a comma-separated list; leave it unset when using the same-origin Railway setup.

## Deploy to Railway

1. Push this project to a GitHub repository and create a Railway project from that repository.
2. Add a Railway PostgreSQL service.
3. Set the app service variables `DATABASE_URL` (use the PostgreSQL service's private connection URL) and `JWT_SECRET` (a unique random secret).
4. Railway uses `railway.json` to build the app, apply Prisma migrations before deploy, start the server, and check `/api/health`.
5. Generate a public domain for the app service in Railway's networking settings.

The app can be deployed as a single web service plus a PostgreSQL service. A public live URL requires a Railway account and database credentials; deployment is not performed from this repository without those credentials.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/posts?q=&category=`, `GET /api/posts/:id`
- `POST /api/posts`, `PATCH /api/posts/:id`, `DELETE /api/posts/:id` (authenticated; only the author can edit or delete)
- `POST /api/posts/:id/comments` (authenticated)
- `GET /api/health`

Passwords are hashed with bcrypt. Authenticated endpoints use a bearer token; request validation and ownership checks are enforced by the server.
