/**
 * Play a friend on this device (the app's Phase 11): who plays which colour, a clock, where the
 * game starts (normal, an opening, a position or Chess960), then the game itself with clocks,
 * undo, a draw, resigning and a rematch with the colours swapped. Nearby play needs the phone's
 * radios, so the web has this device only.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ArrowLeft, ArrowLeftRight, Flag, Handshake, RotateCcw, Shuffle } from "lucide-react";
import {
  GameEnd,
  GamePosition,
  extraMoves,
  friendPgn,
  gameEnd,
  moveText,
  playMove,
  random960,
  standardStart,
  start960
} from "../domain/friendGame";
import { OpeningLine, OpeningTree } from "../domain/openings";
import { playCue } from "../lib/audio";
import { AppSettings, TutorGameRecord, generateUuid, localDateKey } from "../lib/storage";
import { BoardHost } from "../components/BoardHost";
import { BoardPicture, PrimaryButton, SectionHeader } from "../components/ct";
import { pieceAssetUrl } from "../domain/theme";

export type FriendStartKind = "normal" | "opening" | "position" | "960";

export interface FriendSetup {
  whiteName: string;
  blackName: string;
  /** The colour of the person who owns this device (for the saved result). */
  ownerColor: "w" | "b";
  clockMs: number | null;
  incrementMs: number;
  start: GamePosition;
  openingMoves: string[];
  openingName: string | null;
  takebacks: boolean;
  /** Turn the board to whoever is to move. */
  flip: boolean;
  label: string;
}

const CLOCKS: { label: string; ms: number | null; inc: number }[] = [
  { label: "No clock", ms: null, inc: 0 },
  { label: "3 | 2", ms: 3 * 60_000, inc: 2_000 },
  { label: "5 min", ms: 5 * 60_000, inc: 0 },
  { label: "10 min", ms: 10 * 60_000, inc: 0 },
  { label: "15 | 10", ms: 15 * 60_000, inc: 10_000 },
  { label: "30 min", ms: 30 * 60_000, inc: 0 }
];

let lastDraft = {
  friend: "",
  ownerColor: "w" as "w" | "b",
  clock: 3,
  start: "normal" as FriendStartKind,
  n960: random960(),
  opening: null as OpeningLine | null,
  fen: "",
  takebacks: true,
  flip: false
};

export function FriendSetupPage({
  settings,
  openingTree,
  onBack,
  onStart
}: {
  settings: AppSettings;
  openingTree: OpeningTree;
  onBack: () => void;
  onStart: (setup: FriendSetup) => void;
}) {
  const owner = settings.playerName.trim() || "You";
  const [friend, setFriend] = useState(lastDraft.friend);
  const [ownerColor, setOwnerColor] = useState<"w" | "b">(lastDraft.ownerColor);
  const [clock, setClock] = useState(lastDraft.clock);
  const [start, setStart] = useState<FriendStartKind>(lastDraft.start);
  const [n960, setN960] = useState(lastDraft.n960);
  const [opening, setOpening] = useState<OpeningLine | null>(lastDraft.opening);
  const [query, setQuery] = useState("");
  const [fen, setFen] = useState(lastDraft.fen);
  const [takebacks, setTakebacks] = useState(lastDraft.takebacks);
  const [flip, setFlip] = useState(lastDraft.flip);
  // The page keeps what the players chose while the app is open, as the app's draft does.
  useEffect(() => {
    lastDraft = { friend, ownerColor, clock, start, n960, opening, fen, takebacks, flip };
  }, [friend, ownerColor, clock, start, n960, opening, fen, takebacks, flip]);

  const fenProblem = useMemo(() => {
    if (start !== "position") return null;
    if (!fen.trim()) return "Paste a position (FEN)";
    try {
      const c = new Chess(fen.trim());
      if (c.isGameOver()) return "That position is already over";
      return null;
    } catch {
      return "That is not a legal position";
    }
  }, [start, fen]);
  const problem = start === "opening" && !opening ? "Choose an opening" : fenProblem;

  const matches = useMemo(() => {
    if (start !== "opening" || query.trim().length < 2) return [];
    return openingTree.searchFamilies(query, 6).flatMap(f => f.lines.slice(0, 4)).slice(0, 8);
  }, [openingTree, query, start]);

  const friendName = friend.trim() || "Friend";
  const seat = (color: "w" | "b") => {
    const isOwner = color === ownerColor;
    return (
      <div className="ct2-seat">
        <img src={pieceAssetUrl(settings.pieceSetId, color, "k")} alt="" />
        {isOwner ? (
          <span className="ct2-seat-name">{owner}</span>
        ) : (
          <input
            className="ct2-seat-input"
            aria-label="Your friend's name"
            placeholder="Friend"
            maxLength={24}
            value={friend}
            onChange={e => setFriend(e.target.value)}
          />
        )}
      </div>
    );
  };

  const go = () => {
    if (problem) return;
    const c = CLOCKS[clock];
    const startPos =
      start === "960" ? start960(n960) : start === "position" ? standardStart(new Chess(fen.trim()).fen()) : standardStart();
    onStart({
      whiteName: ownerColor === "w" ? owner : friendName,
      blackName: ownerColor === "w" ? friendName : owner,
      ownerColor,
      clockMs: c.ms,
      incrementMs: c.inc,
      start: startPos,
      openingMoves: start === "opening" && opening ? opening.moves : [],
      openingName: start === "opening" && opening ? opening.name : null,
      takebacks,
      flip,
      label: start === "960" ? `Chess960 · ${n960}` : start === "opening" && opening ? opening.name : start === "position" ? "From a position" : c.label
    });
  };

  return (
    <div className="ct2-page ct2-action-page" style={{ gap: 0 }}>
      <div className="ct2-back-bar">
        <button type="button" className="ct2-icon-btn" aria-label="Back" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
      </div>
      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 className="ct2-display">Play a friend</h1>
        <p className="ct2-caption">On this device: pass it across after each move.</p>
        <div className="ct2-seats">
          {seat("w")}
          <button
            type="button"
            className="ct2-icon-btn"
            aria-label="Swap colours"
            onClick={() => setOwnerColor(c => (c === "w" ? "b" : "w"))}
          >
            <ArrowLeftRight size={20} />
          </button>
          {seat("b")}
        </div>

        <SectionHeader title="Clock" />
        <div className="ct2-chip-row">
          {CLOCKS.map((c, i) => (
            <button key={c.label} type="button" className={`ct2-pick ${clock === i ? "is-on" : ""}`} onClick={() => setClock(i)}>
              {c.label}
            </button>
          ))}
        </div>

        <SectionHeader title="Start from" />
        <div className="ct2-segmented">
          {(
            [
              ["normal", "Normal"],
              ["opening", "Opening"],
              ["position", "Position"],
              ["960", "960"]
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={start === id ? "is-on" : ""} onClick={() => setStart(id)}>
              {label}
            </button>
          ))}
        </div>
        {start === "960" ? (
          <button type="button" className="ct2-list-row" onClick={() => setN960(random960())}>
            <span className="ct2-thumb">
              <BoardPicture
                fen={start960(n960).fen}
                boardThemeId={settings.boardThemeId}
                pieceSet={settings.pieceSetId}
                aspect={1}
                zoom={1}
              />
            </span>
            <span className="ct2-list-text">
              <strong>Chess960 · {n960}</strong>
              <small>Tap for another. Castling still ends on g or c.</small>
            </span>
            <Shuffle size={20} className="ct2-list-chevron" />
          </button>
        ) : null}
        {start === "opening" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {opening ? (
              <div className="ct2-chosen">
                <strong>{opening.name}</strong>
                <small className="ct2-caption">{opening.eco}</small>
              </div>
            ) : null}
            <input
              className="ct2-input"
              type="search"
              placeholder="Search openings (e.g. Sicilian, London)"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {matches.map((line, i) => (
              <button
                key={`${line.eco}-${line.name}-${i}`}
                type="button"
                className={`ct2-option ${opening?.name === line.name ? "is-on" : ""}`}
                onClick={() => {
                  setOpening(line);
                  setQuery("");
                }}
              >
                <span>{line.name}</span>
                <small>{line.eco}</small>
              </button>
            ))}
          </div>
        ) : null}
        {start === "position" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              className="ct2-input"
              placeholder="FEN, e.g. 8/8/8/4k3/8/8/4P3/4K3 w - - 0 1"
              value={fen}
              onChange={e => setFen(e.target.value)}
            />
            {fenProblem ? <small className="ct2-caption">{fenProblem}</small> : null}
          </div>
        ) : null}

        <div style={{ marginTop: 8 }}>
          <Toggle label="Undo" checked={takebacks} onChange={setTakebacks} />
          <Toggle label="Turn the board to whoever moves" checked={flip} onChange={setFlip} />
        </div>
      </div>
      <div className="ct2-action-bottom">
        <PrimaryButton disabled={Boolean(problem)} onClick={go}>
          {problem ?? "Start"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="ct2-toggle" onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span className={`ct2-switch ${checked ? "is-on" : ""}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

const END_WORDS: Record<Exclude<GameEnd, { over: false }>["reason"], string> = {
  checkmate: "by checkmate",
  stalemate: "Stalemate",
  insufficient: "Not enough pieces to mate",
  "fifty-moves": "Fifty moves without a capture or pawn move",
  repetition: "The same position three times"
};

type Ending = { winner: "w" | "b" | null; words: string };

export function FriendGameScreen({
  setup,
  settings,
  onExit,
  onRematch,
  onSave
}: {
  setup: FriendSetup;
  settings: AppSettings;
  onExit: () => void;
  onRematch: (setup: FriendSetup) => void;
  onSave: (record: TutorGameRecord) => void;
}) {
  // The opening's moves are played for both players before the game starts.
  const [positions, setPositions] = useState<GamePosition[]>(() => {
    const out = [setup.start];
    for (const uci of setup.openingMoves) {
      const next = playMove(out[out.length - 1], uci);
      if (!next) break;
      out.push(next);
    }
    return out;
  });
  const [clocks, setClocks] = useState<{ w: number | null; b: number | null }>({ w: setup.clockMs, b: setup.clockMs });
  const [ending, setEnding] = useState<Ending | null>(null);
  const [confirm, setConfirm] = useState<null | "resign" | "draw">(null);
  const saved = useRef(false);
  const tick = useRef<number | null>(null);
  const preset = setup.openingMoves.length;

  const pos = positions[positions.length - 1];
  const turn = pos.fen.split(" ")[1] as "w" | "b";
  const timed = setup.clockMs !== null;
  const started = positions.length - 1 > preset;

  // The clock of the player to move runs once the first move is made.
  useEffect(() => {
    if (!timed || ending || !started) return;
    let last = performance.now();
    tick.current = window.setInterval(() => {
      const now = performance.now();
      const spent = now - last;
      last = now;
      setClocks(c => {
        const left = Math.max(0, (c[turn] ?? 0) - spent);
        return { ...c, [turn]: left };
      });
    }, 100);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [timed, ending, started, turn]);

  useEffect(() => {
    if (ending || !timed) return;
    if ((clocks[turn] ?? 1) <= 0) {
      const winner = turn === "w" ? "b" : "w";
      // A flag with nothing to mate is a draw.
      const board = new Chess(pos.fen).board().flat();
      const canMate = board.some(sq => sq && sq.color === winner && sq.type !== "k");
      setEnding(canMate ? { winner, words: "on time" } : { winner: null, words: "Time ran out, but nothing could mate" });
    }
  }, [clocks, turn, ending, timed, pos.fen]);

  // Save once, when the game is over.
  useEffect(() => {
    if (!ending || saved.current || positions.length - 1 <= preset) return;
    saved.current = true;
    const result = ending.winner === null ? "1/2-1/2" : ending.winner === "w" ? "1-0" : "0-1";
    const own = ending.winner === null ? "D" : ending.winner === setup.ownerColor ? "W" : "L";
    const friendName = setup.ownerColor === "w" ? setup.blackName : setup.whiteName;
    const now = Date.now();
    onSave({
      id: `friend:${generateUuid()}`,
      source: "friend",
      opponent: friendName,
      rating: 0,
      playerColor: setup.ownerColor,
      result: own,
      termination: ending.words,
      timeClass: setup.clockMs === null ? "untimed" : setup.clockMs <= 3 * 60_000 ? "blitz" : "rapid",
      date: localDateKey(new Date(now)),
      playedAt: now,
      opening: setup.label,
      moves: Math.ceil((positions.length - 1) / 2),
      pgn: friendPgn(positions, setup.whiteName, setup.blackName, result)
    });
    playCue(own === "W" ? "win" : own === "L" ? "lose" : "success", settings.soundEnabled);
  }, [ending, positions, preset, setup, onSave, settings.soundEnabled]);

  const onMove = (uci: string) => {
    if (ending) return;
    const next = playMove(pos, uci);
    if (!next) return;
    playCue(next.san?.includes("x") ? "capture" : next.san?.startsWith("O-") ? "castle" : "move", settings.soundEnabled);
    const list = [...positions, next];
    setPositions(list);
    if (timed && setup.incrementMs && started) {
      setClocks(c => ({ ...c, [turn]: (c[turn] ?? 0) + setup.incrementMs }));
    }
    const end = gameEnd(list);
    if (end.over) {
      setEnding({
        winner: end.winner,
        words: end.reason === "checkmate" ? END_WORDS.checkmate : END_WORDS[end.reason]
      });
    }
  };

  const undo = () => {
    if (ending || positions.length - 1 <= preset) return;
    setPositions(p => p.slice(0, -1));
  };

  const orientation: "w" | "b" = setup.flip ? turn : setup.ownerColor;
  const top: "w" | "b" = orientation === "w" ? "b" : "w";
  const name = (c: "w" | "b") => (c === "w" ? setup.whiteName : setup.blackName);
  const strip = (c: "w" | "b") => ({
    name: name(c),
    subtitle: c === "w" ? "White" : "Black",
    clockMs: timed ? clocks[c] : null,
    active: !ending && turn === c
  });

  const headline = ending
    ? ending.winner === null
      ? "Draw"
      : `${name(ending.winner)} wins`
    : `${name(turn)} to move`;
  const subline = ending ? ending.words : setup.label;

  return (
    <div className="ct2-board-screen">
      <header className="ct2-board-topbar">
        <button type="button" className="ct2-icon-btn" aria-label="Back" onClick={onExit}>
          <ArrowLeft size={22} />
        </button>
        <h1>
          {setup.whiteName} vs {setup.blackName}
        </h1>
        <span style={{ width: 40 }} />
      </header>
      <div className="ct2-board-zone" aria-live="polite">
        <div className="ct2-run-words" style={{ minHeight: 56 }}>
          <h2 className="ct2-run-line">{headline}</h2>
          <p className="ct2-caption">{subline}</p>
        </div>
      </div>
      <div className="ct2-board-area">
        <BoardHost
          fen={pos.fen}
          orientation={orientation}
          interactive={!ending}
          allowAllColors
          boardColorsId={settings.boardThemeId}
          pieceSetId={settings.pieceSetId}
          showCoordinates={settings.showCoordinates}
          showLegalDots={settings.showLegalDots}
          autoQueen={settings.autoQueen}
          reduceMotion={settings.reduceMotion}
          lastMove={pos.uci}
          extraMoves={ending ? [] : extraMoves(pos)}
          topPlayer={strip(top)}
          bottomPlayer={strip(orientation)}
          onMove={onMove}
        />
        <p className="ct2-caption ct2-under ct2-move-text">{moveText(positions) || "No moves yet"}</p>
      </div>
      <div className="ct2-board-controls">
        {ending ? (
          <>
            <button type="button" className="ct2-ghost" onClick={onExit}>
              Done
            </button>
            <PrimaryButton
              onClick={() =>
                onRematch({
                  ...setup,
                  whiteName: setup.blackName,
                  blackName: setup.whiteName,
                  ownerColor: setup.ownerColor === "w" ? "b" : "w",
                  start: setup.start.rights ? start960(random960()) : setup.start,
                  label: setup.start.rights ? "Chess960" : setup.label
                })
              }
            >
              Rematch
            </PrimaryButton>
          </>
        ) : (
          <>
            {setup.takebacks ? (
              <button type="button" className="ct2-control" disabled={positions.length - 1 <= preset} onClick={undo}>
                <RotateCcw size={20} />
                <span>Undo</span>
              </button>
            ) : null}
            <button type="button" className="ct2-control" onClick={() => setConfirm("draw")}>
              <Handshake size={20} />
              <span>Draw</span>
            </button>
            <button type="button" className="ct2-control" onClick={() => setConfirm("resign")}>
              <Flag size={20} />
              <span>Resign</span>
            </button>
          </>
        )}
      </div>
      {confirm ? (
        <div className="ct2-sheet-scrim" onClick={() => setConfirm(null)}>
          <div className="ct2-sheet" role="dialog" aria-label={confirm === "draw" ? "Agree a draw?" : "Resign?"} onClick={e => e.stopPropagation()}>
            <div className="ct2-sheet-handle" aria-hidden="true" />
            <h2>{confirm === "draw" ? "Agree a draw?" : `${name(turn)} resigns?`}</h2>
            <p className="ct2-caption">
              {confirm === "draw" ? "Both of you agree the game is drawn." : `${name(turn === "w" ? "b" : "w")} wins the game.`}
            </p>
            <div className="ct2-pair-buttons" style={{ marginTop: 16 }}>
              <button type="button" className="ct2-secondary" onClick={() => setConfirm(null)}>
                Keep playing
              </button>
              <button
                type="button"
                className={confirm === "resign" ? "ct2-danger" : "ct2-secondary"}
                onClick={() => {
                  setEnding(
                    confirm === "draw"
                      ? { winner: null, words: "Agreed" }
                      : { winner: turn === "w" ? "b" : "w", words: "by resignation" }
                  );
                  setConfirm(null);
                }}
              >
                {confirm === "draw" ? "Draw" : "Resign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

