# Deployment Guide: Going Live with Early Access

This walks through hosting the platform publicly so real visitors can land
on your marketing page, join the waitlist, and — once you invite them — log
in and use the product on their own data.

**Recommended stack for this stage:** Render (backend) + Vercel (frontend).
Both have generous free tiers, deploy straight from a GitHub push, and let
you upgrade later without re-architecting anything. A Docker-based
self-hosted alternative is covered at the end for when you outgrow this.

---

## Part 1 — Prerequisites

1. **A GitHub account with this repo pushed to it.** You already have this.
2. **A Render account** — [render.com](https://render.com), sign up with GitHub (free).
3. **A Vercel account** — [vercel.com](https://vercel.com), sign up with GitHub (free).
4. **A domain name** (optional but recommended before sending real invites).
   Buy one from Namecheap, Cloudflare Registrar, or Google Domains — $10-15/year.
5. **A free Groq API key** (optional, for full AI assistant mode) —
   [console.groq.com](https://console.groq.com) → API Keys → Create.

---

## Part 2 — Generate your production secrets

Run these locally and save the output somewhere safe (a password manager,
not a text file in the repo):

```bash
# JWT signing key
openssl rand -hex 32

# Credential encryption key (for stored vendor API keys)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

You'll paste these into Render's environment variable UI in Part 3 — never
commit them to git.

---

## Part 3 — Deploy the backend (Render)

1. Log into Render → **New** → **Web Service**.
2. Connect your GitHub account and select this repository.
3. Configure the service:
   - **Name:** `compliance-backend` (or anything)
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free (or Starter, $7/mo, for no cold-starts)
4. Add a **Persistent Disk** (Render dashboard → your service → Disks):
   - **Mount path:** `/opt/render/project/src/backend/database`
   - **Size:** 1 GB is plenty to start
   - This is required — without it, your SQLite database (and every
     waitlist signup, trial account, and control record) is wiped on
     every redeploy.
5. Add environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `JWT_SECRET_KEY` | *(from Part 2)* |
   | `ENCRYPTION_KEY` | *(from Part 2)* |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` *(update after Part 4 with your real domain)* |
   | `FRONTEND_URL` | same as `CORS_ORIGINS` — used to build invite links |
   | `PLATFORM_ADMIN_EMAILS` | your own email — this is what lets you see the Admin panel and manage the waitlist |
   | `GROQ_API_KEY` | *(optional, from Part 1)* |

6. Click **Create Web Service**. Render builds and deploys — takes 2-5 minutes.
7. Once live, note your backend URL: `https://compliance-backend-xxxx.onrender.com`.
8. **Verify it's up:**
   ```bash
   curl https://compliance-backend-xxxx.onrender.com/
   # Expect: {"message":"Compliance Platform API","version":"1.0.0","status":"operational"}
   ```

---

## Part 4 — Deploy the frontend (Vercel)

1. Log into Vercel → **Add New** → **Project**.
2. Import the same GitHub repository.
3. Configure:
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** leave as repo root
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. Add an environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render backend URL from Part 3, e.g. `https://compliance-backend-xxxx.onrender.com` |

   This is baked into the JS bundle at build time — if you change your
   backend URL later, you must redeploy the frontend, not just restart it.
5. Click **Deploy**. Takes about a minute.
6. Note your frontend URL: `https://your-app.vercel.app`.
7. **Go back to Render** and update `CORS_ORIGINS` and `FRONTEND_URL` to
   this real Vercel URL, then let it redeploy (Render does this
   automatically when you save an env var change).

---

## Part 5 — Connect your custom domain (optional but recommended)

1. **Frontend (Vercel):** Project → Settings → Domains → Add your domain
   (e.g. `app.yourcompany.com`). Vercel gives you a CNAME record to add
   at your domain registrar. SSL is automatic and free.
2. **Backend (Render):** Service → Settings → Custom Domains → Add
   `api.yourcompany.com`. Same idea — Render gives you a CNAME, SSL is automatic.
3. Once both resolve, update `CORS_ORIGINS` / `FRONTEND_URL` on Render and
   `VITE_API_URL` on Vercel to the real domains, and redeploy both.
4. DNS propagation can take a few minutes to a few hours.

---

## Part 6 — Smoke test the live site

Do this before telling anyone about it:

1. Visit your live frontend URL. You should see the **landing page** with
   the early-access signup form, not the login screen.
2. Submit the waitlist form with your own email. You should see
   "You're on the list!" with a queue position.
3. Click **Sign In** → **Create Account** and register a normal test
   account — confirm you land in the actual app (Dashboard/Controls view),
   not bounced back to the login screen.
4. Log out, log back in as your `PLATFORM_ADMIN_EMAILS` account. You
   should see an **Admin** button in the top nav. Click it — confirm your
   test waitlist signup appears under the Early-Access Waitlist tab.
5. Click **Invite** on that signup. Copy the invite link it gives you,
   open it in an incognito window, set a password, and confirm it creates
   a real trial account and logs you straight in.
6. Open the **Ask AI** chat panel (bottom-right) and ask a question.
   Confirm you get an answer (retrieval-only is fine without a Groq key).

If all six pass, you're ready for real traffic.

---

## Part 7 — Running early access (your ongoing workflow)

This is how you'll actually operate once people start signing up:

1. **Share your landing page URL** wherever you're getting attention
   (LinkedIn, cold outreach, a Product Hunt launch, etc.) — the signup
   form is the front door.
2. **Check the Admin panel regularly.** New signups appear under
   "Early-Access Waitlist" with their company, role, and which
   frameworks they care about — use this to prioritize who to invite
   first.
3. **Click Invite** on the accounts you want to bring in. Without SMTP
   configured (see below), you'll get a link back to copy and send
   yourself (email, LinkedIn DM, whatever). With SMTP configured, it
   emails automatically.
4. **They set a password and land directly in the trial product**, on
   their own account, `plan='trial'`.
5. **Watch the Assistant FAQ Analytics tab.** This is the feedback loop
   you asked for — every question customers ask the AI assistant is
   logged (never their compliance data, just the question text and
   which controls matched). The **"Unanswered questions"** section is
   your highest-signal input: those are questions your retrieval
   couldn't match to any control, meaning either a control description
   needs to be clearer, a domain synonym needs adding (see
   `_SYNONYMS` in `backend/routes/assistant.py`), or an MCP integration
   needs to cover that data.

### Optional: automatic invite emails

Without SMTP configured, invites still work — you just copy/paste the link
yourself. To automate it, add these Render env vars (any SMTP provider
works — Gmail app passwords, SendGrid, Postmark, etc.):

| Key | Value |
|---|---|
| `SMTP_HOST` | e.g. `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your SMTP username |
| `SMTP_PASSWORD` | your SMTP password/API key |
| `SMTP_FROM` | the "from" address invites are sent from |

---

## Part 8 — Scaling beyond a single instance

The defaults here (SQLite, single-process, in-memory rate limiting) are
correct for early access with a handful to a few dozen trial customers.
Revisit these once you have real paying traffic:

- **Database:** migrate from SQLite to managed Postgres (Render offers
  this natively) once you need concurrent writes at scale or want
  point-in-time backups. This is a real migration, not a config flip —
  plan a dedicated pass for it.
- **Rate limiting:** currently in-memory per-process (`backend/services/rate_limit.py`).
  If you ever run more than one backend instance/worker, point it at
  Redis (`storage_uri="redis://..."`) so limits are shared — the comment
  in that file has the one-line change.
- **Backend workers:** don't add `--workers N` to the uvicorn start
  command without first moving off SQLite — multiple processes writing
  to the same SQLite file will corrupt it under load.
- **Frontend bundle size:** `npm run build` currently warns about a
  1.5MB main chunk. Fine for now; revisit with `build.rollupOptions.output.manualChunks`
  if load times become a complaint.

---

## Alternative: self-hosted via Docker

If you'd rather run this on your own VM (a $6/mo DigitalOcean droplet, an
AWS EC2 instance, etc.) instead of Render/Vercel:

1. Install Docker on the VM.
2. Clone the repo, `cd` into it.
3. `cp backend/.env.example backend/.env` and fill in real production values
   (same secrets as Part 2, plus `CORS_ORIGINS`/`FRONTEND_URL` set to your
   actual domain).
4. `docker compose up --build -d`
5. Put a reverse proxy (Caddy or nginx + Certbot) in front of ports 8000
   and 8080 for free automatic SSL and to serve both on port 443 under
   your real domain.
6. `docker-compose.yml` mounts a named volume for the SQLite database, so
   `docker compose down && docker compose up` preserves your data —
   `docker compose down -v` does not (that deletes the volume).

This path gives you full control but means you're responsible for
patching the OS, monitoring uptime, and backups yourself — Render/Vercel
handle all of that for you at this stage, which is why they're the
recommended default above.
