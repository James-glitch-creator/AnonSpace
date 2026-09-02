# Deployment guide

## Important architecture constraint

The `backend` directory is a PHP application. It requires PHP 8.1+, Composer packages,
the MongoDB PHP extension, SMTP access, and persistent disk storage for `uploads/`.
Cloudflare Workers and Pages Functions run JavaScript/TypeScript (and other supported
Worker languages), not a PHP runtime. Therefore this backend cannot be deployed directly
to Cloudflare without a full rewrite.

Use one of these paths:

1. **Keep the PHP backend:** deploy it to a PHP host that supports the MongoDB extension
   and persistent storage, then put its `api.example.com` hostname behind Cloudflare DNS
   and proxying. This is the shortest path to production.
2. **Use Cloudflare Workers for the backend:** rewrite the PHP API, MongoDB access,
   SMTP integration, upload storage, and JWT/cookie handling for the Workers runtime.
   This is a separate migration, not a deployment configuration change.

The steps below prepare the frontend for Vercel and the existing PHP backend for option 1.

## Domain layout

Use your Cloudflare-managed domain and add both DNS records:

- `app.anonspace4.com` -> Vercel frontend
- `api.anonspace4.com` -> your PHP backend host (Cloudflare proxied)

The shared parent domain is required by the existing Vercel `proxy.ts` route guard. It
needs to receive the same `anonspace_token` cookie that the API issues. Provider URLs
such as `*.vercel.app` and `*.workers.dev` do not share a parent domain, so sign-in will
not work reliably with this architecture.

## 1. Deploy the PHP backend

Choose a PHP 8.1+ host that supports the `mongodb` extension and persistent disk. Point
the web root at `backend/`, install production dependencies, and configure the host to
send unknown routes to `index.php` (the included `.htaccess` works on Apache).

Create these production environment variables in the host's secret manager:

```dotenv
APP_ENV=production
MONGODB_URI=<your MongoDB Atlas connection string>
MONGODB_DB=anonspace
JWT_SECRET=<a newly generated long random secret>
JWT_TTL=604800
CORS_ORIGIN=https://app.anonspace4.com
COOKIE_DOMAIN=.anonspace4.com
SMTP_HOST=<SMTP host>
SMTP_PORT=587
SMTP_USERNAME=<SMTP username>
SMTP_PASSWORD=<SMTP password>
SMTP_FROM_EMAIL=<verified sender>
SMTP_FROM_NAME=AnonSpace
```

Do not commit a production `.env` file. After deploying, verify
`https://api.anonspace4.com/api/auth/me` returns a JSON `401` response rather than an HTML
error page.

## 2. Deploy the frontend to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, import the repository and set **Root Directory** to `frontend`.
   Vercel detects Next.js and uses `npm run build` automatically.
3. In **Settings -> Environment Variables**, add this for Production (and Preview if you
   have a preview API):

   ```dotenv
   NEXT_PUBLIC_API_URL=https://api.anonspace4.com
   ```

4. Deploy, then add `app.anonspace4.com` to the Vercel project. Follow Vercel's DNS
   instructions in Cloudflare; do not create conflicting DNS records.
5. Redeploy after changing any Vercel environment variable, because
   `NEXT_PUBLIC_API_URL` is included in the browser build.

## 3. Verify production

1. Open `https://app.anonspace4.com` and register/login.
2. In browser DevTools -> Application -> Cookies, confirm `anonspace_token` has
   domain `.anonspace4.com`, `Secure`, `HttpOnly`, and `SameSite=Lax`.
3. Confirm authenticated pages still load after a full refresh.
4. Create a post with an image and a video. The PHP host must keep `backend/uploads/`
   persistent across releases; move uploads to object storage before using an ephemeral
   serverless PHP host.

## Local development

Copy `frontend/.env.example` to `frontend/.env.local` only if your API is not on the
default `http://localhost:8000`. Copy `backend/.env.example` to `backend/.env` and fill
in local secrets. Keep `COOKIE_DOMAIN` empty locally.

## Railway backend deployment

The backend includes a `Dockerfile` that Railway detects when its service Root Directory
is set to `backend`. It installs PHP's MongoDB extension and configures Apache routing.

1. Create a Railway project and deploy this Git repository. Set the service **Root
   Directory** to `backend`.
2. In the service **Variables**, add the production backend variables shown above. Do
   not add an `.env` file to Git.
3. Under **Volumes**, add a volume mounted at `/var/www/html/uploads`. Under **Deploy**,
   set the start command to:

   ```sh
   sh -c 'chown -R www-data:www-data /var/www/html/uploads && apache2-foreground'
   ```

4. Under **Networking**, add the custom domain `api.anonspace4.com`. Railway supplies
   a CNAME target; create the matching `api` CNAME in Cloudflare with proxying disabled
   until Railway marks the domain active.
5. Railway has no fixed outbound IP on its standard service. In MongoDB Atlas, allow
   `0.0.0.0/0` in Network Access only if necessary, use a strong database password,
   and grant that database user access only to the `anonspace` database.
