# Chess Tutor Web

The web client for Chess Tutor.

This repository is intentionally web-only. The Android implementation lives in the separate `Bennykent21/Chess-tutor-app` repository.

## Current foundation

- React + TypeScript + Vite
- `chess.js` for legal move validation and browser chess sessions
- Coach-first training board with SVG pieces, hints, mistake retry, and position feedback
- Learn → practice flow
- Play → local bot game flow
- Review → playable recall queue
- Persistent local progress
- Optional Supabase authentication and cloud progress sync
- Persistent spaced-repetition review queue with 1 / 3 / 7 / 14 / 30 day intervals
- Local-first game history with optional cloud game history hydration
- Shared database migration for profiles, progress, training attempts, review items, lesson progress, and games

## Design direction

Chess Tutor is a private coaching studio rather than a generic chess platform clone. The interface keeps the board useful, but the explanation is the product: what happened, why it happened, and what to train next.

The web app should share product concepts and Supabase data with Android while keeping web navigation, density, keyboard/mouse interaction, and responsive layout native to the browser.

## Local setup

```bash
npm install
npm run dev
```

The default development server is available at http://localhost:3000.

## Supabase setup

Create a Supabase project and set:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Apply `supabase/migrations/0001_chess_tutor_core.sql` to the shared project before using cloud sync.

The app remains usable without Supabase credentials. In that mode, progress, review scheduling, and recent games are stored locally in the browser. When a user signs in, progress, review items, training attempts, player profile, and completed games can sync to Supabase. Never put a Supabase service-role key in the web app; only the public anon key belongs in `VITE_SUPABASE_ANON_KEY`.
