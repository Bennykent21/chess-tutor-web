# Chess Tutor Web

The web client for Chess Tutor.

This repository is intentionally web-only. The Android implementation lives in the separate `Bennykent21/Chess-tutor-app` repository.

## Current foundation

- React + TypeScript + Vite
- `chess.js` for local legal move interaction
- Dark academy/editorial visual system aligned to the Android design tokens
- Responsive desktop/tablet/mobile shell
- Coach-first training board
- Four product areas: Openings, Puzzles, VS Games, Stats
- Supabase client bootstrap, ready for the shared backend configuration

## Design direction

Chess Tutor is a private coaching studio rather than a generic chess platform clone. The interface keeps the board useful, but the explanation is the product: what happened, why it happened, and what to train next.

The web app should share product concepts and Supabase data with Android while keeping web navigation, density, keyboard/mouse interaction, and responsive layout native to the browser.

## Local setup

```bash
npm install
npm run dev
```

Set these when connecting the shared Supabase project:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
