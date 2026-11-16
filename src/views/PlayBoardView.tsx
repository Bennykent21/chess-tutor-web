import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Cpu,
  Flag,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Undo2
} from "lucide-react";
import {
  BOT_ROSTER,
  BotProfile,
  ChatEvent,
  botChatLine,
  engineSkillForRating,
  pickBotCandidateMove,
  shouldBotResign,
  thinkDelayMs
} from "../domain/bots";
import {
  BattlePlan,
  OpeningTree,
  repetitionKey
} from "../domain/openings";
import { botAssetUrl } from "../domain/theme";
import { calculateCapturesFromMoves, parseUci, uciToSan } from "../lib/chessUtils";
import { EngineLine, analyseMultiPV } from "../lib/engine";
import { playCue, triggerHaptic } from "../lib/audio";
import { AppSettings, ActiveGameSnapshot, TutorGameRecord, generateUuid, saveActiveGame } from "../lib/storage";
import { BoardArrow, BoardHost } from "../components/BoardHost";
import { CoachBubble } from "../components/CoachBubble";

export type TimeControlOption = {
  id: "none" | "blitz5" | "rapid10" | "rapid15_10";
  label: string;
  initialMs: number | null;
  incrementMs: number;
  timeClass: "untimed" | "blitz" | "rapid";
};

export const TIME_CONTROLS: TimeControlOption[] = [
  { id: "none", label: "No clock", initialMs: null, incrementMs: 0, timeClass: "untimed" },
  { id: "blitz5", label: "5 min", initialMs: 5 * 60_000, incrementMs: 0, timeClass: "blitz" },
  { id: "rapid10", label: "10 min", initialMs: 10 * 60_000, incrementMs: 0, timeClass: "rapid" },
  { id: "rapid15_10", label: "15 | 10", initialMs: 15 * 60_000, incrementMs: 10_000, timeClass: "rapid" }
];

export type PlayBoardLaunch =
  | {
      mode: "bot";
      bot: BotProfile;
      playerColor: "w" | "b";
      timeControl: TimeControlOption;
      takebacks: boolean;
      hints: boolean;
      evalBar: boolean;
      startFen?: string;
      resumeSnapshot?: ActiveGameSnapshot;
    }
  | {
      mode: "battle";
      bot: BotProfile;
      plan: BattlePlan;
      timeControl: TimeControlOption;
    }
  | {
      mode: "watch";
      whiteBot: BotProfile;
      blackBot: BotProfile;
    }
  | {
      mode: "explore";
      startFen: string;
      initialLine?: string[];
      engineSide?: "w" | "b" | null;
      engineElo?: number;
      title?: string;
    };

export function PlayBoardView({
  launch,
  settings,
  openingTree,
  onExit,
  onSaveGame,
  onReviewGame
}: {
  launch: PlayBoardLaunch;
  settings: AppSettings;
  openingTree: OpeningTree;
  onExit: () => void;
  onSaveGame: (record: TutorGameRecord) => void;
  onReviewGame: (gameId: string) => void;
}) {
  const initialStartFen =
    launch.mode === "bot"
      ? launch.resumeSnapshot?.startFen ?? launch.startFen ?? new Chess().fen()
      : launch.mode === "explore"
      ? launch.startFen
      : new Chess().fen();

  const [fen, setFen] = useState<string>(() => {
    if (launch.mode === "bot" && launch.resumeSnapshot) {
      return launch.resumeSnapshot.fen;
    }
    if (launch.mode === "explore" && launch.initialLine?.length) {
      const c = new Chess(initialStartFen);
      for (const uci of launch.initialLine) {
        const p = parseUci(uci);
        if (!p) break;
        try {
          c.move({ from: p.from, to: p.to, promotion: p.promotion ?? "q" });
        } catch {
          break;
        }
      }
      return c.fen();
    }
    return initialStartFen;
  });

  const [uciMoves, setUciMoves] = useState<string[]>(() => {
    if (launch.mode === "bot" && launch.resumeSnapshot) return launch.resumeSnapshot.uciMoves;
    if (launch.mode === "explore" && launch.initialLine) return launch.initialLine;
    return [];
  });

  const [viewPly, setViewPly] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<"w" | "b">(() => {
    if (launch.mode === "bot") return launch.playerColor;
    if (launch.mode === "battle") return launch.plan.choice.playerColor;
    if (launch.mode === "explore") return launch.engineSide === "w" ? "b" : "w";
    return "w";
  });

  const [showEvalBar, setShowEvalBar] = useState<boolean>(() =>
    launch.mode === "explore" ? true : launch.mode === "bot" ? launch.evalBar : false
  );
  const [engineLines, setEngineLines] = useState<EngineLine[]>([]);
  const [thinking, setThinking] = useState(false);
  const [hintArrow, setHintArrow] = useState<BoardArrow | null>(null);
  const [botChat, setBotChat] = useState<string | null>(() => {
    if (launch.mode === "bot") {
      return botChatLine(launch.bot, "greeting", settings.chatLevel);
    }
    if (launch.mode === "battle") {
      return botChatLine(launch.bot, "greeting", settings.chatLevel);
    }
    return null;
  });
  const [battleFeedback, setBattleFeedback] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{
    result: "W" | "L" | "D";
    label: string;
    savedGameId?: string;
  } | null>(null);

  const [whiteMs, setWhiteMs] = useState<number | null>(() => {
    if (launch.mode === "bot") return launch.resumeSnapshot ? launch.resumeSnapshot.whiteMs : launch.timeControl.initialMs;
    if (launch.mode === "battle") return launch.timeControl.initialMs;
    return null;
  });
  const [blackMs, setBlackMs] = useState<number | null>(() => {
    if (launch.mode === "bot") return launch.resumeSnapshot ? launch.resumeSnapshot.blackMs : launch.timeControl.initialMs;
    if (launch.mode === "battle") return launch.timeControl.initialMs;
    return null;
  });

  const recentBotEvalsRef = useRef<number[]>([]);
  const savedOnFinishRef = useRef(false);
  const watchPausedRef = useRef(false);
  const [watchPaused, setWatchPaused] = useState(false);

  const replayData = useMemo(() => {
    const chess = new Chess(initialStartFen);
    const fens: string[] = [chess.fen()];
    const sans: string[] = [];
    for (const uci of uciMoves) {
      const p = parseUci(uci);
      if (!p) break;
      try {
        const m = chess.move({ from: p.from, to: p.to, promotion: p.promotion ?? "q" });
        if (!m) break;
        sans.push(m.san);
        fens.push(chess.fen());
      } catch {
        break;
      }
    }
    return { chess, fens, sans, captures: calculateCapturesFromMoves(chess.history({ verbose: true })) };
  }, [initialStartFen, uciMoves]);

  const activePly = viewPly === null ? uciMoves.length : Math.max(0, Math.min(uciMoves.length, viewPly));
  const displayedFen = replayData.fens[activePly] ?? fen;
  const displayedChess = useMemo(() => new Chess(displayedFen), [displayedFen]);
  const lastMoveUci = activePly > 0 ? uciMoves[activePly - 1] ?? null : null;

  const openingMatch = useMemo(() => {
    if (initialStartFen !== new Chess().fen()) return null;
    return openingTree.match(uciMoves);
  }, [openingTree, uciMoves, initialStartFen]);

  // Save active game snapshot for resume
  useEffect(() => {
    if (launch.mode !== "bot") return;
    if (gameOver || uciMoves.length === 0) {
      if (gameOver) saveActiveGame(null);
      return;
    }
    const chess = new Chess(initialStartFen);
    for (const uci of uciMoves) {
      const p = parseUci(uci);
      if (p) chess.move({ from: p.from, to: p.to, promotion: p.promotion ?? "q" });
    }
    saveActiveGame({
      botId: launch.bot.id,
      botName: launch.bot.name,
      botRating: launch.bot.rating,
      botFace: launch.bot.face,
      playerColor: launch.playerColor,
      fen: chess.fen(),
      startFen: initialStartFen,
      pgn: chess.pgn(),
      uciMoves,
      whiteMs,
      blackMs,
      incrementMs: launch.timeControl.incrementMs,
      updatedAt: Date.now()
    });
  }, [launch, uciMoves, gameOver, whiteMs, blackMs, initialStartFen]);

  const finalizeGame = useCallback(
    (result: "W" | "L" | "D", label: string, finalUciMoves: string[]) => {
      if (savedOnFinishRef.current) return;
      savedOnFinishRef.current = true;

      if (launch.mode === "bot" || launch.mode === "battle") {
        saveActiveGame(null);
        const c = new Chess(initialStartFen);
        for (const uci of finalUciMoves) {
          const p = parseUci(uci);
          if (p) c.move({ from: p.from, to: p.to, promotion: p.promotion ?? "q" });
        }
        const match = openingTree.match(finalUciMoves);
        const gameId = `arena:${generateUuid()}`;
        const playerColor = launch.mode === "bot" ? launch.playerColor : launch.plan.choice.playerColor;
        const record: TutorGameRecord = {
          id: gameId,
          source: "arena",
          opponent: launch.bot.name,
          botId: launch.bot.id,
          rating: launch.bot.rating,
          playerColor,
          result,
          termination: label,
          timeClass: launch.timeControl.timeClass,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          playedAt: Date.now(),
          opening: match.opening?.name ?? (launch.mode === "battle" ? launch.plan.target.name : "Custom Game"),
          eco: match.opening?.eco ?? "A00",
          moves: Math.ceil(finalUciMoves.length / 2),
          pgn: c.pgn()
        };
        onSaveGame(record);
        setGameOver({ result, label, savedGameId: gameId });
        playCue(result === "W" ? "win" : result === "L" ? "lose" : "tap", settings.soundEnabled);
        const ev: ChatEvent = result === "W" ? "player-wins" : result === "L" ? "bot-wins" : "draw";
        const msg = botChatLine(launch.bot, ev, settings.chatLevel);
        if (msg) setBotChat(msg);
      } else {
        setGameOver({ result, label });
      }
    },
    [launch, initialStartFen, openingTree, onSaveGame, settings.soundEnabled, settings.chatLevel]
  );

  // Evaluate natural game-over
  useEffect(() => {
    if (gameOver) return;
    const c = replayData.chess;
    if (c.isCheckmate()) {
      const loser = c.turn();
      const winner = loser === "w" ? "b" : "w";
      if (launch.mode === "bot" || launch.mode === "battle") {
        const playerColor = launch.mode === "bot" ? launch.playerColor : launch.plan.choice.playerColor;
        finalizeGame(winner === playerColor ? "W" : "L", "Checkmate", uciMoves);
      } else {
        finalizeGame(winner === "w" ? "W" : "L", "Checkmate", uciMoves);
      }
    } else if (c.isStalemate()) {
      finalizeGame("D", "Stalemate", uciMoves);
    } else if (c.isThreefoldRepetition()) {
      finalizeGame("D", "Threefold repetition", uciMoves);
    } else if (c.isInsufficientMaterial()) {
      finalizeGame("D", "Insufficient material", uciMoves);
    } else if (c.isDraw()) {
      finalizeGame("D", "50-move / Draw", uciMoves);
    }
  }, [replayData.chess, gameOver, launch, uciMoves, finalizeGame]);

  // Countdown Clocks
  useEffect(() => {
    if (gameOver || (launch.mode !== "bot" && launch.mode !== "battle")) return;
    if (whiteMs === null || blackMs === null || uciMoves.length === 0) return;
    const turn = replayData.chess.turn();
    const playerColor = launch.mode === "bot" ? launch.playerColor : launch.plan.choice.playerColor;
    const timer = setInterval(() => {
      if (turn === "w") {
        setWhiteMs(prev => {
          if (prev === null) return null;
          if (prev <= 200) {
            finalizeGame(playerColor === "w" ? "L" : "W", "Timeout", uciMoves);
            return 0;
          }
          return prev - 200;
        });
      } else {
        setBlackMs(prev => {
          if (prev === null) return null;
          if (prev <= 200) {
            finalizeGame(playerColor === "b" ? "L" : "W", "Timeout", uciMoves);
            return 0;
          }
          return prev - 200;
        });
      }
    }, 200);
    return () => clearInterval(timer);
  }, [gameOver, launch, whiteMs, blackMs, uciMoves, replayData.chess, finalizeGame]);

  // Stockfish Evaluation (Explore mode or when Eval bar is enabled)
  useEffect(() => {
    const needsEval = launch.mode === "explore" || showEvalBar;
    if (!needsEval) return;
    let cancelled = false;
    const numLines = launch.mode === "explore" ? 3 : 1;
    analyseMultiPV(displayedFen, { depth: launch.mode === "explore" ? 13 : 10, lines: numLines, skillLevel: 20 })
      .then(lines => {
        if (!cancelled) setEngineLines(lines);
      })
      .catch(() => {
        // ignore superseded error
      });
    return () => {
      cancelled = true;
    };
  }, [displayedFen, launch.mode, showEvalBar]);

  // Bot move execution
  useEffect(() => {
    if (gameOver) return;
    const turn = replayData.chess.turn();

    let botToMove: BotProfile | null = null;
    if (launch.mode === "bot" && turn !== launch.playerColor) {
      botToMove = launch.bot;
    } else if (launch.mode === "battle" && turn !== launch.plan.choice.playerColor) {
      botToMove = launch.bot;
    } else if (launch.mode === "watch" && !watchPaused) {
      botToMove = turn === "w" ? launch.whiteBot : launch.blackBot;
    } else if (launch.mode === "explore" && launch.engineSide && turn === launch.engineSide) {
      botToMove = {
        ...BOT_ROSTER[BOT_ROSTER.length - 1].profile,
        name: "Stockfish",
        rating: launch.engineElo ?? 2400
      };
    }

    if (!botToMove || replayData.chess.isGameOver()) return;

    let cancelled = false;
    setThinking(true);

    const runBot = async () => {
      const currentFen = replayData.chess.fen();
      const key = repetitionKey(currentFen);
      let chosenUci = "";

      // 1. Opening Battle Repertoire or Bot Repertoire
      if (launch.mode === "battle") {
        const book = launch.plan.repertoire.movesFor(turn, key);
        if (book.length) {
          chosenUci = book[Math.floor(Math.random() * Math.min(2, book.length))].uci;
        }
      } else if (launch.mode === "bot" || launch.mode === "watch") {
        const opNames = turn === "w" ? botToMove.whiteOpenings : botToMove.blackOpenings;
        if (opNames.length) {
          const lines = openingTree.linesWithin(opNames);
          const matchingMoves = new Set<string>();
          for (const l of lines) {
            if (l.moves.length > uciMoves.length) {
              const prefixMatch = uciMoves.every((m, idx) => l.moves[idx] === m);
              if (prefixMatch) matchingMoves.add(l.moves[uciMoves.length]);
            }
          }
          if (matchingMoves.size) {
            const arr = Array.from(matchingMoves);
            chosenUci = arr[Math.floor(Math.random() * arr.length)];
          }
        }
      }

      // 2. Engine calculation
      if (!chosenUci) {
        const cfg = engineSkillForRating(botToMove.rating, botToMove.mistakeLevel);
        const lines = await analyseMultiPV(currentFen, {
          lines: botToMove.rating >= 2600 ? 1 : 3,
          movetimeMs: cfg.movetimeMs,
          skillLevel: cfg.skillLevel,
          uciElo: cfg.uciElo
        }).catch(() => [] as EngineLine[]);

        if (cancelled) return;
        const top = lines[0];
        if (top && top.scoreCp !== null) {
          const botCp = turn === "w" ? top.scoreCp : -top.scoreCp;
          recentBotEvalsRef.current.push(botCp);
          if (launch.mode === "bot" && shouldBotResign(botToMove, recentBotEvalsRef.current)) {
            setThinking(false);
            finalizeGame("W", `${botToMove.name} resigned`, uciMoves);
            return;
          }
        }

        const cands = lines
          .filter(l => l.firstMove)
          .map(l => ({
            uci: l.firstMove as string,
            scoreCp: l.mateIn !== null ? Math.sign(l.mateIn) * 9000 * (turn === "w" ? 1 : -1) : (l.scoreCp ?? 0) * (turn === "w" ? 1 : -1)
          }));
        chosenUci = pickBotCandidateMove(currentFen, cands, botToMove);
      }

      if (cancelled || !chosenUci) {
        setThinking(false);
        return;
      }

      const delay = launch.mode === "watch" ? 420 : thinkDelayMs(botToMove);
      await new Promise(r => setTimeout(r, delay));
      if (cancelled || (launch.mode === "watch" && watchPausedRef.current)) {
        setThinking(false);
        return;
      }

      const nextChess = new Chess(currentFen);
      const parsed = parseUci(chosenUci);
      if (parsed) {
        const moved = nextChess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
        if (moved) {
          playCue(
            nextChess.inCheck() ? "check" : moved.captured ? "capture" : moved.san.startsWith("O-O") ? "castle" : "move",
            settings.soundEnabled
          );
          if (launch.mode === "bot" || launch.mode === "battle") {
            const ev: ChatEvent | null = nextChess.inCheck() ? "bot-checks" : moved.captured ? "bot-captures" : null;
            if (ev) {
              const msg = botChatLine(botToMove, ev, settings.chatLevel);
              if (msg) setBotChat(msg);
            }
          }
          if (launch.mode === "bot" || launch.mode === "battle") {
            const inc = launch.timeControl.incrementMs;
            if (inc > 0) {
              if (turn === "w") setWhiteMs(m => (m !== null ? m + inc : null));
              else setBlackMs(m => (m !== null ? m + inc : null));
            }
          }
          setUciMoves(prev => [...prev, chosenUci]);
          setFen(nextChess.fen());
          setViewPly(null);
          setHintArrow(null);
        }
      }
      setThinking(false);
    };

    void runBot();
    return () => {
      cancelled = true;
    };
  }, [
    uciMoves,
    gameOver,
    launch,
    replayData.chess,
    openingTree,
    settings.soundEnabled,
    settings.chatLevel,
    watchPaused,
    finalizeGame
  ]);

  const handlePlayerMove = (uci: string) => {
    if (gameOver || thinking || viewPly !== null) return;
    const chess = new Chess(displayedFen);
    const turn = chess.turn();

    // Opening Battle Drill check
    if (launch.mode === "battle" && launch.plan.choice.mode === "drill") {
      const targetMoves = launch.plan.target.moves;
      if (uciMoves.length < targetMoves.length) {
        const key = repetitionKey(displayedFen);
        const bookMoves = launch.plan.repertoire.movesFor(turn, key);
        const expected = launch.plan.choice.exactReplies
          ? [targetMoves[uciMoves.length]]
          : bookMoves.map(b => b.uci);
        if (expected.length && !expected.includes(uci)) {
          const expSan = uciToSan(displayedFen, expected[0]);
          setBattleFeedback(`Off book! In this line, play ${expSan}. Try again.`);
          playCue("wrong", settings.soundEnabled);
          triggerHaptic("wrong", settings.hapticsEnabled);
          return;
        }
      }
    }

    const parsed = parseUci(uci);
    if (!parsed) return;
    const moved = chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
    if (!moved) return;

    setBattleFeedback(null);
    setHintArrow(null);
    playCue(
      chess.inCheck() ? "check" : moved.captured ? "capture" : moved.san.startsWith("O-O") ? "castle" : "move",
      settings.soundEnabled
    );
    triggerHaptic(moved.captured ? "capture" : "move", settings.hapticsEnabled);

    if (launch.mode === "bot" || launch.mode === "battle") {
      const inc = launch.timeControl.incrementMs;
      if (inc > 0) {
        if (turn === "w") setWhiteMs(m => (m !== null ? m + inc : null));
        else setBlackMs(m => (m !== null ? m + inc : null));
      }
      const ev: ChatEvent | null = chess.inCheck() ? "player-checks" : moved.captured ? "player-captures" : null;
      if (ev) {
        const msg = botChatLine(launch.bot, ev, settings.chatLevel);
        if (msg) setBotChat(msg);
      }
    }

    if (launch.mode === "explore" && viewPly !== null) {
      setUciMoves(prev => [...prev.slice(0, viewPly), uci]);
    } else {
      setUciMoves(prev => [...prev, uci]);
    }
    setFen(chess.fen());
    setViewPly(null);
  };

  const handleTakeback = () => {
    if (gameOver || thinking || uciMoves.length === 0) return;
    const stepBack = launch.mode === "explore" ? 1 : uciMoves.length >= 2 ? 2 : 1;
    const nextMoves = uciMoves.slice(0, uciMoves.length - stepBack);
    setUciMoves(nextMoves);
    setViewPly(null);
    setHintArrow(null);
    if (launch.mode === "bot") {
      const msg = botChatLine(launch.bot, "takeback", settings.chatLevel);
      if (msg) setBotChat(msg);
    }
  };

  const handleHint = async () => {
    if (gameOver || thinking) return;
    const lines = await analyseMultiPV(displayedFen, { depth: 11, lines: 1, skillLevel: 20 }).catch(() => []);
    const best = lines[0]?.firstMove;
    if (best) {
      setHintArrow({ from: best.slice(0, 2), to: best.slice(2, 4), kind: "hint" });
      playCue("tap", settings.soundEnabled);
    }
  };

  const handleResign = () => {
    if (gameOver) return;
    finalizeGame("L", "Resignation", uciMoves);
  };

  const handleRematch = () => {
    savedOnFinishRef.current = false;
    recentBotEvalsRef.current = [];
    setUciMoves([]);
    setFen(initialStartFen);
    setViewPly(null);
    setGameOver(null);
    setHintArrow(null);
    setBattleFeedback(null);
    if (launch.mode === "bot" || launch.mode === "battle") {
      setWhiteMs(launch.timeControl.initialMs);
      setBlackMs(launch.timeControl.initialMs);
      setBotChat(botChatLine(launch.bot, "greeting", settings.chatLevel));
    }
  };

  const topLine = engineLines[0];
  const currentBestArrow: BoardArrow | null =
    launch.mode === "explore" && topLine?.firstMove
      ? { from: topLine.firstMove.slice(0, 2), to: topLine.firstMove.slice(2, 4), kind: "best" }
      : null;

  const arrows = [hintArrow, currentBestArrow].filter(Boolean) as BoardArrow[];

  const playerColor: "w" | "b" =
    launch.mode === "bot"
      ? launch.playerColor
      : launch.mode === "battle"
      ? launch.plan.choice.playerColor
      : "w";

  const topColor: "w" | "b" = orientation === "w" ? "b" : "w";
  const bottomColor: "w" | "b" = orientation;

  const playerStripFor = (side: "w" | "b") => {
    const captured = side === "w" ? replayData.captures.capturedByWhite : replayData.captures.capturedByBlack;
    const adv = side === "w" ? replayData.captures.whiteMaterialAdvantage : -replayData.captures.whiteMaterialAdvantage;
    const clock = side === "w" ? whiteMs : blackMs;
    const active = !gameOver && displayedChess.turn() === side;

    if (launch.mode === "watch") {
      const bot = side === "w" ? launch.whiteBot : launch.blackBot;
      return {
        name: `${bot.name} (${bot.rating})`,
        avatarUrl: botAssetUrl(bot.face),
        captured,
        capturedColor: (side === "w" ? "b" : "w") as "w" | "b",
        materialAdvantage: adv,
        active
      };
    }

    if (launch.mode === "explore") {
      const isEngine = launch.engineSide === side;
      return {
        name: isEngine ? `Stockfish (${launch.engineElo ?? "Max"})` : side === "w" ? "White" : "Black",
        captured,
        capturedColor: (side === "w" ? "b" : "w") as "w" | "b",
        materialAdvantage: adv,
        active
      };
    }

    const isBot = side !== playerColor;
    if (isBot) {
      return {
        name: launch.bot.name,
        subtitle: `Rating ${launch.bot.rating}`,
        avatarUrl: botAssetUrl(launch.bot.face),
        clockMs: clock,
        captured,
        capturedColor: (side === "w" ? "b" : "w") as "w" | "b",
        materialAdvantage: adv,
        active
      };
    }

    return {
      name: settings.playerName || "You",
      subtitle: side === "w" ? "White" : "Black",
      clockMs: clock,
      captured,
      capturedColor: (side === "w" ? "b" : "w") as "w" | "b",
      materialAdvantage: adv,
      active
    };
  };

  const title =
    launch.mode === "bot"
      ? `Playing ${launch.bot.name}`
      : launch.mode === "battle"
      ? `Opening Battle · ${launch.plan.target.family}`
      : launch.mode === "watch"
      ? `${launch.whiteBot.name} vs ${launch.blackBot.name}`
      : launch.title ?? "Analysis & Explore";

  return (
    <div className="ct-focus-shell">
      <header className="ct-focus-topbar">
        <button type="button" className="ct-icon-btn" onClick={onExit} aria-label="Back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="ct-focus-title">
          <strong>{title}</strong>
          {openingMatch?.opening && (
            <small>
              {openingMatch.opening.eco} · {openingMatch.opening.name}
              {openingMatch.leftBookAt !== null ? ` · Out of book move ${Math.floor(openingMatch.leftBookAt / 2) + 1}` : " · In book"}
            </small>
          )}
        </div>
        <div className="ct-focus-actions">
          <button
            type="button"
            className="ct-icon-btn"
            onClick={() => setOrientation(o => (o === "w" ? "b" : "w"))}
            title="Flip board"
          >
            <ArrowLeftRight size={17} />
          </button>
          <button
            type="button"
            className={`ct-icon-btn ${showEvalBar ? "is-active" : ""}`}
            onClick={() => setShowEvalBar(s => !s)}
            title="Toggle evaluation bar"
          >
            <Cpu size={17} />
          </button>
        </div>
      </header>

      <div className="ct-board-workspace">
        <div className="ct-board-column">
          <BoardHost
            fen={displayedFen}
            orientation={orientation}
            interactive={!gameOver && !thinking && launch.mode !== "watch" && viewPly === null}
            allowAllColors={launch.mode === "explore" && !launch.engineSide}
            allowedSide={launch.mode === "explore" ? (launch.engineSide === "w" ? "b" : launch.engineSide === "b" ? "w" : undefined) : playerColor}
            boardColorsId={settings.boardThemeId}
            pieceSetId={settings.pieceSetId}
            showCoordinates={settings.showCoordinates}
            showLegalDots={settings.showLegalDots}
            autoQueen={settings.autoQueen}
            reduceMotion={settings.reduceMotion}
            lastMove={lastMoveUci}
            arrows={arrows}
            allowUserArrows={launch.mode === "explore"}
            showEvalBar={showEvalBar}
            evalCp={topLine?.scoreCp ?? null}
            evalMate={topLine?.mateIn ?? null}
            topPlayer={playerStripFor(topColor)}
            bottomPlayer={playerStripFor(bottomColor)}
            onMove={handlePlayerMove}
          />
        </div>

        <aside className="ct-side-panel">
          {(botChat || battleFeedback) && (
            <CoachBubble
              mascotId={settings.mascotId}
              mood={battleFeedback ? "kind" : thinking ? "thinking" : "ready"}
              sideLabel={launch.mode === "bot" || launch.mode === "battle" ? launch.bot.name : undefined}
              message={battleFeedback ?? botChat ?? ""}
              tone={battleFeedback ? "warning" : "default"}
            />
          )}

          {launch.mode === "battle" && (
            <div className="ct-card ct-compact-card">
              <div className="ct-kicker">
                <BookOpen size={14} /> Target Line · {launch.plan.choice.mode.toUpperCase()}
              </div>
              <strong>{launch.plan.target.name}</strong>
              <p className="ct-muted">
                {launch.plan.choice.mode === "drill"
                  ? "Drill mode: stay strictly on book moves."
                  : "Play it: bot follows repertoire then plays freely."}
              </p>
            </div>
          )}

          {gameOver && (
            <div className={`ct-card ct-result-banner ${gameOver.result === "W" ? "is-win" : gameOver.result === "L" ? "is-loss" : ""}`}>
              <div>
                <div className="ct-kicker">Game Over</div>
                <h3>
                  {gameOver.result === "W" ? "You won!" : gameOver.result === "L" ? "Bot won" : "Draw"} · {gameOver.label}
                </h3>
              </div>
              <div className="ct-btn-row">
                {gameOver.savedGameId && (
                  <button
                    type="button"
                    className="ct-btn ct-btn-primary"
                    onClick={() => onReviewGame(gameOver.savedGameId!)}
                  >
                    <Sparkles size={16} /> Review game
                  </button>
                )}
                <button type="button" className="ct-btn ct-btn-secondary" onClick={handleRematch}>
                  <RotateCcw size={16} /> Rematch
                </button>
              </div>
            </div>
          )}

          {launch.mode === "explore" && (
            <div className="ct-card ct-engine-card">
              <div className="ct-card-head">
                <strong>Stockfish 19 Lines</strong>
                <span className="mono-num">
                  {topLine ? `d${topLine.depth}` : "Thinking…"}
                </span>
              </div>
              <div className="ct-engine-lines">
                {engineLines.length === 0 && <div className="ct-muted">Analysing position…</div>}
                {engineLines.map(line => {
                  const scoreStr =
                    line.mateIn !== null
                      ? `${line.mateIn > 0 ? "+" : "-"}M${Math.abs(line.mateIn)}`
                      : line.scoreCp !== null
                      ? `${line.scoreCp >= 0 ? "+" : ""}${(line.scoreCp / 100).toFixed(2)}`
                      : "0.00";
                  const temp = new Chess(displayedFen);
                  const sanMoves: string[] = [];
                  for (const u of line.moves.slice(0, 6)) {
                    const p = parseUci(u);
                    if (!p) break;
                    try {
                      const m = temp.move({ from: p.from, to: p.to, promotion: p.promotion ?? "q" });
                      if (!m) break;
                      sanMoves.push(m.san);
                    } catch {
                      break;
                    }
                  }
                  return (
                    <button
                      key={line.multipv}
                      type="button"
                      className="ct-engine-line-row"
                      onClick={() => {
                        if (line.firstMove) handlePlayerMove(line.firstMove);
                      }}
                    >
                      <span className="ct-eval-pill mono-num">{scoreStr}</span>
                      <span className="ct-pv-text mono-num">{sanMoves.join(" ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="ct-card ct-moves-card">
            <div className="ct-card-head">
              <strong>Moves ({replayData.sans.length})</strong>
              <div className="ct-replay-controls">
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setViewPly(0)}
                  disabled={activePly === 0}
                  title="Start"
                >
                  |&lt;
                </button>
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setViewPly(Math.max(0, activePly - 1))}
                  disabled={activePly === 0}
                  title="Previous move"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setViewPly(activePly + 1 >= uciMoves.length ? null : activePly + 1)}
                  disabled={viewPly === null}
                  title="Next move"
                >
                  &gt;
                </button>
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setViewPly(null)}
                  disabled={viewPly === null}
                  title="Live position"
                >
                  &gt;|
                </button>
              </div>
            </div>
            <div className="ct-movelist">
              {replayData.sans.length === 0 ? (
                <span className="ct-muted">Make a move on the board to begin.</span>
              ) : (
                replayData.sans.map((san, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`ct-move-chip mono-num ${activePly === idx + 1 ? "is-current" : ""}`}
                    onClick={() => setViewPly(idx + 1 === uciMoves.length ? null : idx + 1)}
                  >
                    {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}
                    {san}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="ct-thumb-bar">
            {launch.mode === "watch" ? (
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={() => {
                  const next = !watchPaused;
                  watchPausedRef.current = next;
                  setWatchPaused(next);
                }}
              >
                <Play size={16} /> {watchPaused ? "Resume Match" : "Pause Match"}
              </button>
            ) : (
              <>
                {(launch.mode === "explore" || (launch.mode === "bot" && launch.takebacks) || launch.mode === "battle") && (
                  <button
                    type="button"
                    className="ct-btn ct-btn-secondary"
                    onClick={handleTakeback}
                    disabled={uciMoves.length === 0 || Boolean(gameOver) || thinking}
                  >
                    <Undo2 size={16} /> Takeback
                  </button>
                )}
                {(launch.mode === "explore" || (launch.mode === "bot" && launch.hints) || launch.mode === "battle") && (
                  <button
                    type="button"
                    className="ct-btn ct-btn-secondary"
                    onClick={handleHint}
                    disabled={Boolean(gameOver) || thinking}
                  >
                    <Lightbulb size={16} /> Hint
                  </button>
                )}
                {(launch.mode === "bot" || launch.mode === "battle") && !gameOver && (
                  <button type="button" className="ct-btn ct-btn-ghost" onClick={handleResign}>
                    <Flag size={16} /> Resign
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
