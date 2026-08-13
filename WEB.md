# Deploying the Ardent PWA

Primary URL: https://ardent-study.vercel.app

The legacy `https://bible-study-journal.expo.app` origin temporarily receives the same static PWA build so already-installed users obtain the service-worker update. New installations should use the primary Vercel URL.

1. Configure Supabase using [BACKEND.md](BACKEND.md).
2. Build with `npm run build`.
3. Deploy the contents of `dist/` to an HTTPS host.
4. Configure every unknown route to return `index.html`.
5. Set the production URL in Supabase Authentication → URL Configuration as the Site URL and add the same origin to Redirect URLs.

The generated service worker precaches only the current hashed application build and cleans obsolete caches. Supabase API calls and voice recordings are not runtime-cached.

Configure hosting so `/sw.js`, `/manifest.webmanifest`, and `/index.html` are revalidated (`Cache-Control: no-cache`), while hashed files under `/assets/` may be immutable. Recommended response headers are `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, a `Permissions-Policy` allowing microphone access only to this origin, and a Content Security Policy that permits only the deployed Supabase and scripture endpoints actually in use.

Users install from the browser menu or, on iPhone Safari, Share → Add to Home Screen. Web Push requires an installed PWA on supported iOS versions and must always be enabled from the Settings button.
