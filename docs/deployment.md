# Deployment guide

How to get this application onto a server, with BigRock specifically in mind.

---

## 1. What the application needs

These are facts about this codebase, not general Next.js advice:

| Requirement | Why |
|---|---|
| **A continuously running Node process** (Node 20 or newer) | Next.js 16 App Router. `npm run build` then `npm start`. |
| **Cannot be a static export** | 13 modules use Server Actions (`"use server"`), and `src/proxy.ts` intercepts every request to refresh the Supabase session. Neither survives `output: "export"`. |
| **Outbound HTTPS** | The server calls Supabase and the Anthropic API. |
| **Environment variables** | Listed in §2. |
| **Roughly 1 GB RAM** | `next build` is the peak. Building on a 512 MB box tends to be killed by the OOM reaper; build elsewhere and upload `.next` if you are stuck with one. |

The database is **not** hosted here. Supabase is a separate managed service and stays
where it is — whatever you host on BigRock is only the web application talking to it.

## 2. Environment variables

Create `.env.local` in the project root on the server:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
ANTHROPIC_API_KEY=<key>          # AI clinical insights
ANTHROPIC_MODEL=claude-sonnet-5  # optional, this is the default
```

The two `NEXT_PUBLIC_` values are baked in at build time, so they must be present
**before** `npm run build`, not just before `npm start`.

## 3. Which BigRock product will work

BigRock sells several things, and only some of them can run this.

| Product | Verdict |
|---|---|
| **Domain registration only** | Fine — see Option C. Keep the domain, host the app elsewhere. |
| **Shared / WordPress hosting** | Only if the cPanel has **Setup Node.js App** with Node 20+. Ask support to confirm both before buying. Even then, see Option B's caveats. |
| **VPS hosting** (root access) | Works properly. This is the option to pick if the app must live on BigRock. |
| **Dedicated server** | Works, and is more than this needs. |

**Ask BigRock support these three questions before choosing:**

1. Does the plan include cPanel's *Setup Node.js App* (CloudLinux Node.js Selector / Passenger)?
2. Which Node.js versions are available? (Needs **20 or newer**.)
3. Are long-running processes and outbound HTTPS to third-party APIs permitted?

If the answer to any is no, you need the VPS.

---

## Option A — BigRock VPS (recommended if hosting on BigRock)

Full control, and the way this app is meant to run.

**1. Install Node 20 via nvm**

```bash
ssh root@<your-server-ip>
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
node -v
```

**2. Get the code and build**

```bash
cd /var/www
git clone <repo-url> app
cd app
nano .env.local          # paste the variables from §2
npm ci
npm run build
```

**3. Keep it running with PM2**

```bash
npm install -g pm2
pm2 start npm --name verbal-coach -- start
pm2 startup            # run the command it prints
pm2 save
```

The app is now on `http://127.0.0.1:3000`.

**4. Put nginx in front of it**

```bash
apt install -y nginx
nano /etc/nginx/sites-available/verbal-coach
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/verbal-coach /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

The `Upgrade` / `Connection` headers matter here — Supabase Realtime powers the live
messaging over a WebSocket, and it will fail silently without them.

**5. HTTPS**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Supabase Auth will not accept a plain-HTTP callback in production, so this step is not
optional.

**6. Point the domain at the server**

In the BigRock control panel → DNS management, set:

```
A     @      <your-server-ip>
A     www    <your-server-ip>
```

**Redeploying later:**

```bash
cd /var/www/app && git pull && npm ci && npm run build && pm2 restart verbal-coach
```

---

## Option B — BigRock shared hosting with Node.js Selector

Only if support confirmed Node 20+ and *Setup Node.js App*.

1. Build locally: `npm ci && npm run build`.
2. Upload the project to `~/apps/verbal-coach` via File Manager or FTP — including
   `.next`, `public`, `package.json`, `package-lock.json`, `next.config.ts`, and
   `.env.local`. You can leave out `node_modules` and install on the server.
3. cPanel → **Setup Node.js App** → Create Application:
   - Node version: 20+
   - Application root: `apps/verbal-coach`
   - Application URL: your domain
   - Startup file: `node_modules/next/dist/bin/next`
4. Add the environment variables from §2 in the same screen.
5. Click **Run NPM Install**, then start the application.

**Be warned.** This path is genuinely fragile:

- Passenger expects a plain Node entry point; Next.js's own CLI is an awkward fit and
  often needs a small custom `server.js` wrapper instead.
- Shared plans commonly cap memory below what `next build` needs, which is why step 1
  builds locally.
- Process restarts, idle timeouts, and WebSocket handling are outside your control, and
  live messaging is the first thing to break.

If it fights you, that is the hosting, not the app. Move to Option A or C.

---

## Option C — Domain at BigRock, application hosted elsewhere

The least painful route, and worth stating plainly: BigRock is a strong registrar and a
weak fit for a Node application. You can keep the domain exactly where it is.

1. Deploy the repository to a platform that runs Next.js natively (Vercel, Netlify,
   Render, Railway — Vercel is the reference implementation for Next.js).
2. Add the environment variables from §2 in that platform's dashboard.
3. In **BigRock → DNS management**, replace the A records with whatever the platform
   gives you, typically:

```
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

DNS changes take up to 24–48 hours to propagate fully.

---

## 4. After deploying — do not skip this

**Apply the database migrations.** In the Supabase SQL editor, run in order:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_parents.sql
supabase/migrations/0003_parent_assignments.sql
supabase/migrations/0004_clinician_sees_home_practice.sql
supabase/migrations/0005_clinician_billing.sql
supabase/migrations/0006_blueprint_rules.sql
```

Every file is safe to re-run. Skipping one does not fail at startup — it fails at the
first feature that needs it.

**Add the live URL to Supabase.** Dashboard → Authentication → URL Configuration:

- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`

Sign-up and sign-in will fail until this matches the deployed domain.

**Then check, in this order:**

1. The marketing site loads over HTTPS.
2. `/library/templates` loads and a preview opens.
3. Sign up as a clinician; you land on the dashboard.
4. Create a template in the Studio and save it.
5. Send a message and confirm it arrives without a refresh — this is the WebSocket check.
6. Open Blueprint Rules and confirm fifteen rules are listed, which confirms `0006` applied.
