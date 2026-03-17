# Vibe Player

Private desktop-first music lounge built with Nuxt 4, NuxtHub and the Cloudflare stack.

## What is implemented

- Passcode-gated private app shell
- Track upload flow with client-side metadata extraction
- Direct-to-R2 signed upload/download path when R2 credentials are configured
- Local storage proxy fallback for development via NuxtHub Blob
- D1/libSQL-backed metadata for tracks, playlists, settings, queue snapshots and upload jobs
- HTML audio player with queue, repeat, shuffle, volume and Media Session API support
- Animated shader backgrounds plus built-in muted MP4 loop scenes
- PWA manifest and installable desktop experience

## Stack

- `nuxt@4`
- `@nuxthub/core`
- Cloudflare `D1` via NuxtHub database
- Cloudflare `R2` via NuxtHub blob and optional S3 presigned URLs
- `Pinia` for app state
- `music-metadata-browser` for client-side ID3/basic metadata
- `Vitest` for utility smoke tests

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Copy envs:

```bash
cp .env.example .env
```

3. Start the app:

```bash
pnpm dev
```

The app works without R2 credentials. In that mode uploads are proxied through the app and stored with the local NuxtHub blob driver under `.data/`.

## Useful commands

```bash
pnpm dev
pnpm test
pnpm typecheck
pnpm build
pnpm build:cloudflare
pnpm db:generate
pnpm db:migrate
```

## Cloudflare setup

1. Create an R2 bucket and a D1 database.
2. Update [wrangler.jsonc](/Users/illia/workspaces/vibe.youwillmiss.dev/wrangler.jsonc) with the real bucket name and D1 database ID.
3. Set production secrets for:
   - `NUXT_APP_PASSCODE`
   - `NUXT_SESSION_SECRET`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_ENDPOINT`
4. Build and deploy:

```bash
pnpm build:cloudflare
pnpm deploy
```

## Notes

- Built-in loop videos live in [public/loops](/Users/illia/workspaces/vibe.youwillmiss.dev/public/loops) for immediate demo use.
- In production you can upload matching keys like `backgrounds/city-rain.mp4` to R2 and the app will start issuing signed playback URLs for them.
- The player intentionally does not integrate Spotify or YouTube playback.
