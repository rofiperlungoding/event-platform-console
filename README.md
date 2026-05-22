# Event Platform Console

The web frontend for the Event Platform: an administrator dashboard for
operational telemetry and participant management, plus a Progressive Web
Application (PWA) for participant check-in.

This repository contains static assets only — no build step, no
dependencies, no transpilation. The assets are served by the
[Event Platform API](https://github.com/rofiperlungoding/event-platform-api)
binary, which co-hosts both API endpoints and frontend files.

---

## Components

### Console Dashboard (`index.html`)

An AWS-style operational dashboard that polls the API every 8 seconds
to display:

- API health and database latency
- System metrics (CPU, memory, load average, uptime)
- Database statistics (size, table row counts)
- Participant statistics (total, by team, recent registrations)
- Full participant list with delete capability

**Implementation:** Vanilla HTML, CSS, and JavaScript. No framework, no
build tooling. Total payload: < 25 KB.

### Attendance Admin Page (`attend/admin.html`)

The QR code generator used by event organisers. Features:

- Login as administrator
- Display a session QR code that rotates every 30 seconds
- Live feed of check-ins (polled every 2 seconds)
- Pre-loaded next QR code for instant rotation
- Stop session control

**QR generation:** `qrcode-generator` library, served from CDN.

### Check-In PWA (`attend/scan.html`)

The participant-facing scanner. Features:

- Service Worker for offline asset caching
- IndexedDB-backed check-in queue
- Background Sync API for automatic queue drainage
- Device UUID generation and binding
- Online/offline state detection
- Visual indicators for synced vs pending entries

**Camera scanning:** `html5-qrcode` library.

**PWA assets:**
- `manifest.json` — Web App Manifest
- `sw.js` — Service Worker (caching + sync)
- `icon-192.svg`, `icon-512.svg` — App icons

---

## Reference Deployment

| Component                    | URL                                                    |
| ---------------------------- | ------------------------------------------------------ |
| Operational dashboard        | `https://console.rofidoesthings.site/`                 |
| Admin QR generator           | `https://console.rofidoesthings.site/attend/admin.html` |
| Participant scanner          | `https://console.rofidoesthings.site/attend/scan.html` |

The console is served by the same `event-server` binary that hosts the
API. The host's `STATIC_DIR` environment variable points to a clone of
this repository, and unmatched paths fall through to static file
resolution.

---

## Configuration

The API base URL is configured per file:

```javascript
// app.js  (admin dashboard, no LAN failover)
const API = 'https://api.rofidoesthings.site';

// attend/admin.html  (organiser QR generator)
const API = 'https://api.rofidoesthings.site';

// attend/scan.html  (participant PWA — auto-resolves LAN first)
const PUBLIC_API     = 'https://api.rofidoesthings.site';
const DEFAULT_LAN_API = 'http://192.168.100.67:3001';
```

The scanner PWA probes the LAN endpoint with a 1.5 s timeout on page
load. If reachable, all subsequent requests bypass the Cloudflare
Tunnel — this is what makes 2,000 simultaneous check-ins return in
under two seconds (the tunnel free tier caps at ~45 req/s on its own).
Operators can override the LAN URL with `?lan=http://...` query
parameter or by setting `localStorage.ep_lan_url`. When forking for a
new deployment, update both constants in each file.

---

## Deployment

### Continuous Deployment

The reference deployment uses GitHub webhooks to drive continuous
deployment:

1. Push to `main`.
2. GitHub fires a webhook to
   `https://api.example.com/deploy/console?secret=<webhook-secret>`.
3. The receiving server forks `deploy.sh`, which performs `git pull`
   on the tablet.
4. Changes are immediately visible to clients (no build, no restart).

### Local Preview

Open `index.html` in a browser. For Service Worker testing, serve via a
local HTTP server:

```bash
npx serve .
```

Service Workers require HTTPS or `localhost`; opening files via
`file://` will not register the worker.

---

## File Layout

```
event-platform-console/
├── index.html              # Operational dashboard
├── styles.css              # AWS-style theme
├── app.js                  # Dashboard polling logic
├── attend/
│   ├── admin.html          # QR generator (admin)
│   ├── scan.html           # QR scanner (PWA, participant)
│   ├── sw.js               # Service Worker
│   ├── manifest.json       # PWA manifest
│   ├── icon-192.svg        # App icon (small)
│   └── icon-512.svg        # App icon (large)
├── deploy.sh               # Auto-pull script (run by API webhook)
├── .gitignore
└── README.md               # This file
```

---

## Browser Support

| Feature              | Required Support                              |
| -------------------- | --------------------------------------------- |
| Fetch API            | All evergreen browsers                        |
| Service Workers      | Chrome ≥ 40, Firefox ≥ 44, Safari ≥ 11.1, Edge ≥ 17 |
| Background Sync API  | Chrome ≥ 49 (Firefox falls back to retry-on-online) |
| IndexedDB            | All evergreen browsers                        |
| `crypto.randomUUID`  | Chrome ≥ 92, Firefox ≥ 95, Safari ≥ 15.4     |

The PWA gracefully degrades on browsers without Background Sync: it
relies on the `online` event listener to trigger queue drainage.

---

## Security Notes

- API base URL is publicly visible in source — the API enforces
  authentication and CORS at the server.
- Auth tokens are stored in `localStorage` (vulnerable to XSS).
  Acceptable trade-off for a PWA used inside trusted-network events.
  Production deployments should consider httpOnly cookies + CSRF tokens.
- The Service Worker scope is `/attend/` only; it does not intercept
  console dashboard requests.

---

## Licence

This project is provided as-is for educational and demonstration purposes.
