# Comments API (local demo)

Run a simple Node server to persist comments and reactions for the article pages. This is a lightweight demo and not hardened for production.

Install dependencies and start:

```bash
cd c:\Users\isaac\zeke_portfolio_site
npm install
npm start
```

Server will listen on `http://localhost:3000` by default. The admin token is `changeme_demo_token` by default; set `ADMIN_TOKEN` environment variable to change it.

Admin UI:
Open `http://localhost:3000/admin?token=changeme_demo_token` to review/approve/delete comments.
