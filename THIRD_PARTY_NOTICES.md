# Bundled parts and their licences

Chess Tutor for the web is free software under the GNU General Public License v3.0 (`LICENSE`). This file records every third-party part the site ships, and every original asset taken from the [Chess Tutor Android app](https://github.com/Bennykent21/Chess-tutor-app), so the licence of each one is known. Add a row whenever something is added.

The full licence texts are bundled in `public/assets/licenses/` and linked from the site's licences page (Account > Settings > About): `GPL-3.0.txt` (the official text from gnu.org, the same as `LICENSE`), `Apache-2.0.txt`, `MIT-fantasy-pieces.txt` and `OFL-1.1.txt`.

## Engine and libraries

| Part | Where | Source | Licence |
|---|---|---|---|
| Stockfish 19 (lite, single-threaded WebAssembly) | `stockfish` npm package 19.0.0, bundled from `node_modules/stockfish/bin/stockfish-19-lite-single.{js,wasm}` | Stockfish (the Stockfish developers, stockfishchess.org) compiled to WebAssembly by Stockfish.js (Nathan Rugg and Chess.com, github.com/nmrugg/stockfish.js) | GPL-3.0 (`node_modules/stockfish/Copying.txt`) |
| chess.js 1.4 | npm dependency | github.com/jhlywa/chess.js | BSD-2-Clause |
| React and React DOM 18 | npm dependencies | react.dev | MIT |
| Lucide icons (`lucide-react`) | npm dependency | lucide.dev | ISC |
| Vite, TypeScript, tsx | Build and test tools only, not shipped | | MIT / Apache-2.0 |

## Data

| Part | Where | Source | Licence |
|---|---|---|---|
| Puzzle pack (13,485 puzzles, with accepted alternative moves) | `public/data/puzzles.tsv` | Lichess open puzzle database, selected and checked by the Android app's `tools/build_puzzle_pack.py`; the alternatives were found with Stockfish 19 at build time | CC0 1.0 |
| Opening names (3,865 named lines with ECO codes) | `public/data/openings.tsv` | `lichess-org/chess-openings`, moves converted to UCI by the app's `tools/build_openings.py` | CC0 1.0 |
| Opening repertoires (Italian Game, Caro-Kann Defence) | `public/data/repertoire/*.json` | Move counts from the Lichess opening explorer (built from the Lichess game database); trees built and every move checked with Stockfish 19 by the app's `tools/build_repertoire.py` | CC0 1.0 (the game data); the selection and notes are original, GPL-3.0 |
| Lessons (38 courses: text, positions and exercises) | `public/data/lessons/*.json` | Original, written for Chess Tutor; many exercise positions in the newer courses are puzzles from the Lichess puzzle database (CC0) | GPL-3.0 (the puzzle positions themselves are CC0) |
| Train positions (endgames to win or hold, middlegames to convert) | `public/data/positions/positions.json` | Original selection for Chess Tutor; every goal checked with Stockfish 19 by the app's `tools/check_positions.py` | GPL-3.0 |

## Pieces, art and fonts

| Part | Where | Source | Licence |
|---|---|---|---|
| Piece set "cburnett" (shown as Classic) | `public/assets/pieces/cburnett/` | Colin M.L. Burnett, via `lichess-org/lila` | GPLv2 or later, used here under GPL-3.0 |
| Piece set "merida" | `public/assets/pieces/merida/` | Armando Hernandez Marroquin, via `lichess-org/lila` | GPLv2 or later, used here under GPL-3.0 |
| Piece set "chessnut" | `public/assets/pieces/chessnut/` | Alexis Luengas, `LexLuengas/chessnut-pieces` ("Copyright 2015 Alexis Luengas"), via `lichess-org/lila` | Apache License 2.0 (`Apache-2.0.txt`) |
| Piece set "fantasy" | `public/assets/pieces/fantasy/` | Maurizio Monge, `maurimo/chess-art`, via `lichess-org/lila` | MIT (`MIT-fantasy-pieces.txt`) |
| Scene and rank pictures | `public/assets/art/art_*.webp` | Rendered for Chess Tutor from the Poly Haven model "Chess Set" by Riley Queen (CC0), lit with the Poly Haven HDRI "Studio Small 09" (CC0) | GPL-3.0 |
| Metal icons and medals | `public/assets/art/icon_*.webp`, `medal_*.webp` | Made for Chess Tutor from Material Symbols shapes (Google, Apache-2.0), lit with the Poly Haven HDRI "Brown Photostudio 02" (CC0) | Apache-2.0 (the shapes); the renders are GPL-3.0 |
| Coaches (Pip, Rookie, Sage) in four moods | `public/assets/mascot/*.svg` | Original artwork made for Chess Tutor | GPL-3.0 |
| Bot faces (12 animal characters) | `public/assets/bots/*.svg` | Original artwork made for Chess Tutor | GPL-3.0 |
| Streak flame | Drawn in `src/components/ct.tsx` | Original art for Chess Tutor | GPL-3.0 |
| Design system, board colour themes and colour palettes | `src/components/ct.tsx`, `src/index.css`, `src/domain/theme.ts` | Ported from the Android app's design system, original | GPL-3.0 |
| Schibsted Grotesk (SemiBold) | `public/assets/fonts/schibsted_grotesk_semibold.ttf` | Google Fonts release 1.100 (The Schibsted-Grotesk Project Authors) | SIL Open Font License 1.1 (`OFL-1.1.txt`) |
| Inter (Regular, Medium, SemiBold) | `public/assets/fonts/inter_*.ttf` | Google Fonts release, Inter 4.001 (The Inter Project Authors) | SIL Open Font License 1.1 |
| JetBrains Mono | `public/assets/fonts/jetbrains_mono.ttf` | JetBrains Mono 2.211 | SIL Open Font License 1.1 |

## Sounds

Unchanged copies from Kenney's packs (kenney.nl), in `public/assets/sfx/`:

| File | Original file | Pack | Licence |
|---|---|---|---|
| `sfx_move.ogg` | `impactWood_light_002.ogg` | Kenney "Impact Sounds" 1.0 | CC0 1.0 |
| `sfx_capture.ogg` | `impactWood_heavy_001.ogg` | Kenney "Impact Sounds" 1.0 | CC0 1.0 |
| `sfx_castle.ogg` | `impactPlank_medium_000.ogg` | Kenney "Impact Sounds" 1.0 | CC0 1.0 |
| `sfx_check.ogg` | `glass_002.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |
| `sfx_promote.ogg` | `maximize_006.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |
| `sfx_win.ogg` | `confirmation_004.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |
| `sfx_lose.ogg` | `minimize_008.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |
| `sfx_correct.ogg` | `confirmation_001.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |
| `sfx_wrong.ogg` | `error_008.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |
| `sfx_tap.ogg` | `click_002.ogg` | Kenney "Interface Sounds" 1.0 | CC0 1.0 |

CC0 needs no credit; Kenney asks for an optional one, which the licences page gives.

This is a record, not legal advice.
