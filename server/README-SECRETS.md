# Secret handling and deployment notes

This repository contains a small demo comments/reactions server. IMPORTANT: do not commit secrets or runtime data into the public repository.

What to keep out of the repo
- `.env` files with real credentials (use `.env.example` as a template)
- `data/` runtime files: `comments.json`, `reactions.json`, `auth.json`, `admin-sessions.json`, `verify.json`
- any private keys, SMTP credentials, or third-party secrets

Where to store real secrets
- Use your host's environment or secret manager (Render/Vercel/Heroku/GitHub Actions secrets).

Quick deploy checklist
1. Copy `.env.example` -> `.env` and fill in values locally (do not commit `.env`).
2. Ensure `data/` is in `.gitignore` so runtime data isn't committed.
3. Run `npm install` and start the server: `npm start`.
4. For production, set `NODE_ENV=production` and configure `RECAPTCHA_SECRET` and SMTP creds via your host secrets UI.

Notes
- It's safe to commit `README-SECRETS.md` (guidance), but never include actual secret values in checked-in files.
