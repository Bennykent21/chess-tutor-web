# Chess Tutor

A coach-first chess training application built around one idea:

> A chess coach that happens to have a chessboard, not a chessboard with an AI paragraph glued to it.

Chess Tutor combines interactive training, engine-backed analysis, opening study, tactics, game review, and spaced repetition into one learning workflow.

## Features

- **Coach-first learning** — the board supports explanations, drills, arrows, highlights, and analysis instead of dominating the coaching experience.
- **Game review** — import PGN and replay games with engine-backed analysis and move classification.
- **Mistake Book** — turn mistakes from analyzed games into reusable training positions.
- **Spaced repetition** — review positions through 1-day, 3-day, 7-day, and 30-day intervals, with failed reviews returning to an earlier stage.
- **Tactics** — interactive tactical training with persistent progress.
- **Openings & repertoire** — study structured opening positions and imported material.
- **Imports** — PGN, FEN, Chess.com game archives, and Lichess studies.

## Architecture

The repository contains both a React web application and a Kotlin/Android application.

### Web

Built with React, TypeScript, Vite, chess.js, Stockfish.js, Tailwind CSS, Lucide React, and Vite PWA.

```bash
npm install
npm run dev
```

The development server uses port `3000`.

```bash
npm run build
npm run preview
```

### Android

Built with Kotlin, Jetpack Compose, Room, Coroutines, OkHttp, Moshi, and a local chess/engine layer.

The Android implementation is being developed toward feature parity with the web application.

## Core data flow

```text
Game / PGN / Study
       |
       v
    PGN Parser
       |
       v
 Engine Analysis
       |
       v
Move Classification
       |
       +-----> Review / Replay
       |
       +-----> Mistake Book
                    |
                    v
             Spaced Repetition
                    |
                    v
              Training Drill
```

The goal is to turn analysis into reusable learning material rather than a disposable engine report.

## Project structure

```text
chess-tutor-v2/
├── src/                         # Web application
├── app/src/main/java/           # Android application
│   └── com/example/chess/
│       ├── analysis/
│       ├── core/
│       ├── data/
│       ├── engine/
│       ├── integrations/
│       ├── tactics/
│       └── ui/
├── public/
├── package.json
└── server.ts
```

## Design direction

Chess Tutor follows an **Editorial / Academy** aesthetic inspired by a private coaching studio rather than copying Chess.com or Lichess.

- warm charcoal surfaces
- amber / ochre accents
- restrained typography
- dense but readable information
- board interactions that support explanations
- minimal visual noise

The intended feeling is serious chess study, not a generic game dashboard.

## Repository branches

The web and Android implementations are intentionally kept on separate branches during parity development:

- `main` — stable/default repository branch.
- `web` — web application development.
- `android` — Kotlin/Android application development.
- `android-web-parity` — temporary integration branch used while bringing the implementations into parity.

Changes should be developed on the appropriate platform branch rather than mixing platform-specific work into `main`.

## Development status

This is an active development project. The web application provides the reference feature set while the Kotlin/Android application is being brought toward parity.

Some features are complete, some are partially integrated, and some still require testing. A UI existing in the codebase does not by itself mean the underlying feature is production-ready.

## Engineering principles

### Coach over board
The board supports the lesson. It is not the lesson.

### Explain decisions
Engine output should become useful coaching information wherever possible. A numerical evaluation alone is not enough.

### Turn mistakes into training
Reviewed games should produce durable learning material when appropriate.

### Persist progress
Training history should survive the current session.

### Reuse existing architecture
Before introducing a new service or abstraction, check whether the repository already provides the required capability.

### Verify before claiming completion
Features should be tested through their actual code path before being described as production-ready.

## Disclaimer

Chess Tutor is an independent project and is not affiliated with Chess.com or Lichess. External integrations depend on the availability and terms of their respective APIs.

## License

No open-source license has currently been declared for this repository. Until a license is added, the source should not be assumed to be freely reusable, modified, or redistributed.
