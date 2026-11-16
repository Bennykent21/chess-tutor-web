# Chess Tutor for the web

**A chess teacher in your browser.** Play bots that feel like people, learn from lessons that let you move the pieces, train your openings and endgames, solve thousands of puzzles, and have your games reviewed by Stockfish 19. Everything runs in the browser: no account, no ads, and no server of our own.

This is the web version of the [Chess Tutor Android app](https://github.com/Bennykent21/Chess-tutor-app). It follows the app's design and features, uses the same lessons, puzzles, openings, art and sounds, and runs the same Stockfish 19, compiled to WebAssembly.

[![Web build](https://github.com/Bennykent21/chess-tutor-web/actions/workflows/web-build.yml/badge.svg)](https://github.com/Bennykent21/chess-tutor-web/actions/workflows/web-build.yml)
[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

## What it does

### Play

- **12 bots with their own style and voice**, from Pebble (250) to Bolt (3000), each with an opening book and a way of playing. **Quick match** picks one close to your rating.
- **Build your own bot**: its strength, style, how often it slips and what it opens with.
- **Opening battle** (pick from 3,865 named lines and play it out, drill it, or be surprised), **play from any position**, **watch two bots**, and **explore** any position with Stockfish's best three lines.
- **Play a friend** on the same device: names, a clock, and a start from the normal position, an opening, any position or **Chess960**. Finished games go to your history.

### Learn

- **38 courses and 73 lessons** in six topics: basics, openings, tactics, the middlegame, endgames and the blunders everyone makes. You move the pieces on the board, with a coach above it.

### Train

- **Today**: the opening positions due for review, from every opening you have started, on a spaced schedule (Learning, then 1, 3, 7, 14 and 30 days).
- **Openings**: the Italian Game as White and the Caro-Kann as Black, built from millions of Lichess games and checked by Stockfish. Each has Core, Standard and Deep levels, its variations with how common they are, learn runs that show a line and then ask for it back, and tricky lines.
- **Your openings**: build your own lines move by move, drill them, and play them out against Stockfish.
- **Endgames and middlegames**: positions to win, hold or convert against full-strength Stockfish.
- **From your games**: the lines you keep leaving the same way, the endings you reach a pawn up and how often you win them, and mistakes you repeat.

### Puzzles

- **13,485 puzzles** from the Lichess puzzle database, with a puzzle rating that follows how you solve.
- A 50-level path across five worlds, the daily puzzle, Rush (3 minutes, 5 minutes or three lives), puzzles by theme, a custom run, and **your own mistakes** coming back as puzzles.

### Your games and progress

- **Link Chess.com or Lichess** (just your username) to bring in your games.
- **Game review** with Stockfish 19: accuracy, a grade for each move, the key moments and the better move each time.
- Stats for each time control, your openings, a training page, badges, levels and the piece you have earned.

### Make it yours

- Four colour themes (Mono, Parchment, Baize, Slate), each light and dark or following your device.
- Eleven board colours, four piece sets, three coaches, sounds and Reduce motion.
- Export all your progress to a file and import it on another browser.

## Privacy

Everything you do is kept in your browser's storage. There is no account, no analytics and no server of our own. The site goes online only to read your public games and ratings from **Chess.com** or **Lichess** when you link an account. Clearing the site's data in your browser, or Settings > Your data > Reset, removes everything.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Before a release:

```bash
npm test           # unit tests (node:test via tsx)
npm run lint       # TypeScript type check
npm run build      # production build in dist/
npm run preview    # serve the build locally
```

`dist/` is a static site: any static host works (GitHub Pages, Netlify, Cloudflare Pages, Vercel, or your own server). Stockfish runs in a Web Worker from the bundled `.wasm` file, so the host must serve `.wasm` files (all of the above do).

## How it is built

- **React 18, TypeScript and Vite**, with no backend.
- **chess.js** for the rules; Chess960 castling, which chess.js does not support, is handled in `src/domain/friendGame.ts`.
- **Stockfish 19** (the `stockfish` package, lite single-threaded WebAssembly build) in a Web Worker (`src/lib/engine.ts`).
- The code is grouped into `src/views` (one file per tab or flow), `src/components` (the board and the design system in `ct.tsx`), `src/domain` (chess logic: repertoires, puzzles, lessons, bots, findings) and `src/lib` (storage, engine, sounds, imports). The data lives in `public/data` and the art, fonts, sounds and licence texts in `public/assets`.
- Tests in `tests/` cover the repertoire trainer against both bundled books, the endgame judge, game findings, your own lines, Chess960 and friend games.

## Credits

Chess Tutor stands on open work: [Stockfish](https://stockfishchess.org) (GPL-3.0), the [Lichess](https://lichess.org) puzzle database, opening explorer data and [opening names](https://github.com/lichess-org/chess-openings) (CC0), [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause), piece sets by Colin M.L. Burnett, Armando Hernandez Marroquin, Alexis Luengas and Maurizio Monge, sounds by [Kenney](https://kenney.nl) (CC0), the Inter, Schibsted Grotesk and JetBrains Mono fonts (OFL), and a chess set model and lighting from [Poly Haven](https://polyhaven.com) (CC0). [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists every bundled part and its licence; the site shows the same list under Account > Settings > About.

## Licence

Chess Tutor is free software under the [GNU General Public License v3.0](LICENSE). You may use, study, share and change it; if you share a changed version, share its source under the same licence.
