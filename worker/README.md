# Typelets Public Notes SSR Worker

Cloudflare Worker that provides Server-Side Rendering (SSR) for public notes pages (`/p/*`).

## Why SSR?

- **SEO**: Google sees full content instead of empty `<div id="root"></div>`
- **Social Previews**: Twitter, Facebook, LinkedIn can read meta tags
- **Performance**: Content is visible immediately (no JavaScript needed for first paint)
- **Caching**: Edge-cached HTML responses

## How It Works

```
Request: /p/my-note
        │
        ▼
┌─────────────────────┐
│  Cloudflare Cache   │──── HIT ────▶ Return cached HTML
└──────────┬──────────┘
           │ MISS
           ▼
┌─────────────────────┐
│  Worker fetches     │
│  from API           │
└──────────┬──────────┘
           │
           ▼
Generate full HTML ──▶ Cache it ──▶ Return to user
```

## Setup

### 1. Install dependencies

```bash
cd worker
pnpm install
```

### 2. Configure environment

Edit `wrangler.toml`:

```toml
[vars]
API_URL = "https://your-api-domain.com/api"
```

### 3. Configure routes in Cloudflare

Add a route in your Cloudflare dashboard:
- Pattern: `your-app-domain.com/p/*`
- Worker: `typelets-public-notes-ssr`

Or uncomment in `wrangler.toml`:

```toml
[[routes]]
pattern = "your-app-domain.com/p/*"
zone_name = "your-domain.com"
```

### 4. Deploy

```bash
pnpm run deploy
```

## Development

```bash
pnpm run dev
```

This starts a local server at `http://localhost:8787`.

Test with:
```bash
curl http://localhost:8787/p/your-note-slug
```

## Cache Behavior

- **Browser cache**: 1 hour (`max-age=3600`)
- **Edge cache**: 24 hours (`s-maxage=86400`)
- **Stale while revalidate**: 1 hour

### Cache Purging

When a note is updated, purge its cache:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://your-app-domain.com/p/note-slug"]}'
```

## What's Rendered

The worker generates a complete HTML page with:
- Full note content
- SEO meta tags (title, description, canonical URL)
- Open Graph tags (for Facebook, LinkedIn)
- Twitter Card tags
- Structured data (JSON-LD Article schema)
- Theme detection (respects user's system preference)
- Responsive design (matches main app)
