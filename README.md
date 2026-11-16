# Chess Tutor Web

A 100% client-side, local-first chess learning, puzzle, and bot-play web application tailored for desktop and mobile browsers — powered by React, TypeScript, Vite, `chess.js`, and Stockfish.js 19 WASM.

## Architecture & Tabs (Zero Backend / Zero Supabase)

- **Home (Play Hub)**: Quick match bot matched to your rating, 12 unique roster bots + custom bot builder (rating, aggression, trades, mistake frequency, pace, resignation policy, custom White/Black repertoire), **Opening Battle** (`Play it`, `Drill it`, `Surprise me` across 3,865 ECO lines), Play from Position (FEN), Watch Two Bots, and Explore & Analyse (3-line Stockfish 19 Multi-PV).
- **Learn**: 6 structured categories (`Basics`, `Openings`, `Tactics`, `Middlegame`, `Endgames`, `Blunders`) spanning 37 JSON courses with interactive explain/play/quiz steps, coach mascot bubble, and deep links to Opening Battle and related puzzles.
- **Train**: today's mixed review of every opening on a spaced schedule (Learning, then 1, 3, 7, 14, 30 days), repertoires as White (Italian Game) and as Black (Caro-Kann) with Core, Standard and Deep levels, learn runs that show a line then ask for it back, tricky lines, and endgames to win or hold and middlegames to convert against Stockfish 19.
- **Puzzles**: 5 Worlds / 50-Level progression path (`400` to `2400` rating), 13,485 Lichess puzzles with precomputed accepted alternative moves, Daily Puzzle, **Timed Rush** (`3m`, `5m`, `Survival 3-strikes`), By Goal & Theme, Custom Run, and spaced-repetition **Mistakes Review** fed by your own analysed games.
- **Account**: Player rank ladder with 3D rank pieces, Lichess & Chess.com profile verification and game importer (`100` / `300` / `1000` depth), clickable SVG **Game Review** with Multi-PV Stockfish analysis and key-moment practice, Performance & Opening win-rate dashboards, Training metrics, 16 achievement badges, live Board & Piece Set customizer (11 board themes, 4 vector piece sets, 4 app themes × light/dark/system), Stockfish 19 Engine Health benchmark, and JSON Export/Import backup.

## Local Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`.

Verify tests, types, and production bundle:

```bash
npm test
npm run lint
npm run build
```

## Licensing & Third-Party Notices

Stockfish.js 19 runs locally inside a browser Web Worker and is GPL-3.0 licensed. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and bundled license files in `public/assets/licenses/`.
