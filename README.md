# 5-Kamp

Produksjonsrettet React/TypeScript/PWA for det norske kortspillet 5-Kamp.

## Innhold

- Mobil først-grensesnitt med mørk norrøn premium-stil
- PWA-manifest, service worker og appikon
- Kampoppsett for 2-8 spillere
- Lobby med kampkode
- Digital kortstokk, automatisk utdeling og poengberegning
- Historikk, statistikk, profil, prestasjoner og adminflate
- Supabase-klient og SQL-migrering for Auth, spill, spillere, runder, trekk, avatarer, temaer og achievements

## Kjør lokalt

```bash
npm install
npm run dev
```

Legg Supabase-verdier i `.env` basert på `.env.example` for innlogging og sanntid.

## Database

Kjør migreringen i `supabase/migrations/202607130001_initial_schema.sql` i Supabase SQL editor eller via Supabase CLI.

## App-distribusjon

PWA-en bruker `public/manifest.webmanifest`, `public/service-worker.js` og `public/icon-1024.png`. For App Store og Google Play kan samme webapp pakkes med Capacitor senere uten å endre appens hovedstruktur.
