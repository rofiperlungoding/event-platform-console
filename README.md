# Event Platform Console

AWS Console-style dashboard for the Event Platform API. Pure HTML/CSS/JS, no build step.

## Live

- Console: https://console.rofidoesthings.site
- API: https://api.rofidoesthings.site

## Stack

- Vanilla HTML, CSS, JavaScript
- Hosted on Cloudflare Pages (free, global CDN)
- Calls API at `https://api.rofidoesthings.site` (CORS enabled)

## Local development

Just open `index.html` in a browser. No server needed.

For best results, serve via a local HTTP server (so `fetch` doesn't cache aggressively):
```bash
npx serve .
```

## Deploy

Commits to `main` trigger Cloudflare Pages auto-deploy.
