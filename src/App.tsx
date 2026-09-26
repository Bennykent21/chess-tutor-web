import { useEffect, useMemo, useState } from "react";
import { Chess, Square } from "chess.js";
import {
  ArrowLeftRight,
  BookOpen,
  Brain,
  ChevronRight,
  CircleHelp,
  Gauge,
  History,
  Lightbulb,
  Menu,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Swords,
  Target,
  Trophy,
  X,
  Zap
} from "lucide-react";
import { curriculumLessons, openingCourses } from "./data/content";
import { applyReviewResult, countDueReviews, loadAttemptHistory, loadGameHistory, loadGameMistakes, loadProgress, loadReviewSchedule, saveAttempt, saveGameMistakes, saveGameRecord, saveProgress, saveReviewSchedule, touchActivity, loadSettings, saveSettings, TutorAttemptRecord, TutorGameMistake, TutorGameRecord, TutorProgress, TutorReviewItem, TutorSettings } from "./lib/storage";
import { AuthUser, getAuthUser, loadCloudGames, loadCloudProfile, loadCloudProgress, loadCloudReviewItems, recordGame, recordReviewAttempt, recordTrainingAttempt, saveCloudProgress, signOut, subscribeToAuthChanges, TutorProfile, updateCloudProfile } from "./lib/cloud";
import { AuthModal } from "./components/AuthModal";
import { analysePosition, findBestMove, EngineEvaluation } from "./lib/engine";
import { analyseGame } from "./lib/gameAnalysis";

type Tab = "train" | "learn" | "play" | "review";
type Orientation = "w" | "b";

type Puzzle = {
  title: string;
  category: string;
  fen: string;
  goal: string;
  hint: string;
  expected: string;
  success: string;
};

type Lesson = {
  title: string;
  subtitle: string;
  category: string;
  copy: string;
  fen?: string;
  move?: string;
  explanation: string;
};

const tabs = [
  { id: "train" as const, label: "Train", icon: Target },
  { id: "learn" as const, label: "Learn", icon: BookOpen },
  { id: "play" as const, label: "Play", icon: Swords },
  { id: "review" as const, label: "Review", icon: History }
];

const trainingPositions: Puzzle[] = [
  {
    title: "Forced mate in one",
    category: "Blunder Patterns",
    fen: "7k/5Q2/7K/8/8/8/8/8 w - - 0 1",
    goal: "Find the only move that finishes the game.",
    hint: "Look for a queen move that gives check while staying protected by your king.",
    expected: "f7g7",
    success: "Mate. The queen seals the only escape squares while your king protects g7."
  },
  {
    title: "Develop with tempo",
    category: "Opening",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    goal: "Continue development and place a bishop on an active diagonal.",
    hint: "Develop the bishop toward the sensitive f7 square.",
    expected: "f1c4",
    success: "Good. Bc4 develops with purpose and puts immediate pressure on f7."
  },
  {
    title: "Royal knight fork",
    category: "Tactics",
    fen: "1r1qk3/8/8/4N3/8/8/8/4K3 w - - 0 1",
    goal: "Win material by forking the queen and rook.",
    hint: "Find a knight square that attacks both d8 and b8 at once.",
    expected: "e5c6",
    success: "Fork found. Nc6 attacks the queen on d8 and rook on b8 simultaneously."
  },
  {
    title: "Back-rank checkmate",
    category: "Blunder Patterns",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    goal: "Use the trapped king's lack of escape squares.",
    hint: "Look for a rook move that checks along the eighth rank.",
    expected: "e1e8",
    success: "Checkmate. The rook controls the eighth rank while the black pawns take away the king's escape squares."
  }
];

const lessons: Lesson[] = [
  {
    title: "The Golden Rules of Opening",
    subtitle: "Center Control & Rapid Development",
    category: "Openings",
    copy: "Control the center, develop pieces, and castle before you start a side attack.",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1",
    move: "d2d4",
    explanation: "A second central pawn makes your position easier to develop and gives the c1 bishop a useful diagonal."
  },
  {
    title: "The Italian Game",
    subtitle: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
    category: "Openings",
    copy: "Develop with tempo against the center and put immediate pressure on f7.",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3",
    move: "f1c4",
    explanation: "The bishop develops to an active diagonal and immediately points at the sensitive f7 square."
  },
  {
    title: "The Royal Knight Fork",
    subtitle: "Simultaneous Multi-Square Strikes",
    category: "Tactics",
    copy: "A fork works because one piece cannot answer two forcing threats at once.",
    fen: "4k3/8/8/3n4/2N5/8/8/4K3 w - - 0 1",
    move: "c4d6",
    explanation: "A knight fork is valuable when the targets are high-value and the fork lands with tempo."
  },
  {
    title: "Outposts & Knight Strongholds",
    subtitle: "Dominating the 5th and 6th Ranks",
    category: "Middlegame",
    copy: "Look for squares the opponent cannot attack with a pawn and make those squares permanent assets.",
    fen: "4k3/pp3ppp/8/3N4/8/8/PP3PPP/4K3 w - - 0 1",
    move: "d5c7",
    explanation: "The knight jumps into a pawn-safe square that attacks useful targets and limits the enemy king."
  },
  {
    title: "The Opposition & Key Squares",
    subtitle: "The Universal King & Pawn Blueprint",
    category: "Endgame",
    copy: "King activity matters more than material once the board is simplified.",
    fen: "8/8/8/3k4/3P4/8/8/3K4 w - - 0 1",
    move: "d1e2",
    explanation: "Approaching the critical files while maintaining opposition is the foundation of many king-and-pawn endings."
  },
  {
    title: "Missed Mate in 1",
    subtitle: "Decisive Tactical Blindness",
    category: "Blunder Patterns",
    copy: "Train the habit of scanning every legal check before moving a quiet piece.",
    fen: "7k/5Q2/7K/8/8/8/8/8 w - - 0 1",
    move: "f7g7",
    explanation: "The mating move works because the queen covers h8, h7 and g8 while the king protects g7."
  }
];

const curriculumOnlyLessons: Lesson[] = curriculumLessons
  .filter(item => !lessons.some(lesson => lesson.title === item.title))
  .map(item => ({
    title: item.title,
    subtitle: item.subtitle,
    category: item.category,
    copy: item.copy,
    explanation: item.copy
  }));

const lessonCatalog: Lesson[] = [...lessons, ...curriculumOnlyLessons];

const reviewPositions: Puzzle[] = [
  trainingPositions[0],
  {
    title: "Hanging queen",
    category: "Blunder Patterns",
    fen: "4k3/8/8/8/3q4/8/3R4/4K3 w - - 0 1",
    goal: "Notice the loose queen before making a quiet move.",
    hint: "Scan for forcing captures first.",
    expected: "d2d4",
    success: "The rook can simply take the queen. The review habit is to inspect checks and captures before deeper plans."
  },
  trainingPositions[2],
  trainingPositions[3]
];

function puzzleFromGameMistake(mistake: TutorGameMistake): Puzzle {
  return {
    title: `Game review · ${mistake.opponent} · move ${mistake.moveNumber} · ${mistake.gameId.slice(0, 4)}`,
    category: mistake.category,
    fen: mistake.fen,
    goal: mistake.goal,
    hint: mistake.hint,
    expected: mistake.expected,
    success: mistake.success
  };
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function playCue(kind: "success" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtor = window.AudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "success" ? 660 : 220;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
  } catch {
    // Audio is optional and can be unavailable or blocked by the browser.
  }
}


function App() {
  const [tab, setTab] = useState<Tab>("train");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<TutorSettings>(() => loadSettings());
  const [helpOpen, setHelpOpen] = useState(false);
  const [trainingPuzzle, setTrainingPuzzle] = useState<Puzzle>(trainingPositions[0]);
  const [progress, setProgress] = useState<TutorProgress>(() => loadProgress());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [cloudSyncedFor, setCloudSyncedFor] = useState<string | null>(null);
  const [reviewSchedule, setReviewSchedule] = useState<TutorReviewItem[]>(() =>
    loadReviewSchedule(reviewPositions.map(item => item.title))
  );
  const [attemptHistory, setAttemptHistory] = useState<TutorAttemptRecord[]>(() => loadAttemptHistory());
  const [gameMistakes, setGameMistakes] = useState<TutorGameMistake[]>(() => loadGameMistakes());

  useEffect(() => {
    let active = true;
    getAuthUser().then(user => {
      if (active) setAuthUser(user);
    });
    return subscribeToAuthChanges(user => {
      if (active) {
        setAuthUser(user);
        if (!user) setCloudSyncedFor(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    let active = true;
    loadCloudProfile(authUser.id).then(next => {
      if (active) setProfile(next);
    });

    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || cloudSyncedFor === authUser.id) return;
    let active = true;
    Promise.all([
      loadCloudProgress(authUser.id),
      loadCloudReviewItems(authUser.id)
    ]).then(([cloud, cloudReviews]) => {
      if (!active) return;
      if (cloud) setProgress(cloud);
      if (cloudReviews.length) {
        setReviewSchedule(current => {
          const byKey = new Map(cloudReviews.map(item => [item.puzzleKey, item]));
          const merged = current.map(item => byKey.get(item.puzzleKey) ?? item);
          saveReviewSchedule(merged);
          return merged;
        });
      }
      setCloudSyncedFor(authUser.id);
    });
    return () => {
      active = false;
    };
  }, [authUser, cloudSyncedFor]);

  useEffect(() => {
    if (!gameMistakes.length) return;

    setReviewSchedule(current => {
      const existing = new Set(current.map(item => item.puzzleKey));
      const additions = gameMistakes
        .map(puzzleFromGameMistake)
        .filter(puzzle => !existing.has(puzzle.title))
        .map(puzzle => ({
          puzzleKey: puzzle.title,
          dueAt: new Date().toISOString(),
          intervalDays: 1,
          repetitions: 0,
          lastResult: null
        } satisfies TutorReviewItem));

      if (!additions.length) return current;
      const next = [...current, ...additions];
      saveReviewSchedule(next);
      return next;
    });
  }, [gameMistakes]);

  useEffect(() => {
    const due = countDueReviews(reviewSchedule);
    setProgress(current => current.reviewDue === due ? current : { ...current, reviewDue: due });
    saveReviewSchedule(reviewSchedule);
  }, [reviewSchedule]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveProgress(progress);
    if (authUser && cloudSyncedFor === authUser.id) {
      void saveCloudProgress(authUser.id, progress);
    }
  }, [progress, authUser, cloudSyncedFor]);

  function selectTab(next: Tab) {
    setTab(next);
    setMobileMenu(false);
  }

  function startLesson(lesson: Lesson) {
    if (!lesson.fen || !lesson.move) return;
    setTrainingPuzzle({
      title: lesson.title,
      category: lesson.category,
      fen: lesson.fen,
      goal: lesson.copy,
      hint: lesson.explanation,
      expected: lesson.move,
      success: lesson.explanation
    });
    setTab("train");
  }

  function recordTrainingResult(correct: boolean, puzzle: Puzzle, lessonTitle: string | undefined, hintsUsed: number) {
    setReviewSchedule(current => {
      const known = current.some(item => item.puzzleKey === puzzle.title);
      if (!known && !correct) {
        const added: TutorReviewItem = {
          puzzleKey: puzzle.title,
          dueAt: new Date().toISOString(),
          intervalDays: 1,
          repetitions: 0,
          lastResult: "wrong"
        };
        const next = [...current, added];
        saveReviewSchedule(next);
        return next;
      }
      if (!known) return current;
      const next = applyReviewResult(current, puzzle.title, correct);
      saveReviewSchedule(next);
      return next;
    });

    const attempt: TutorAttemptRecord = {
      puzzleKey: puzzle.title,
      category: puzzle.category,
      correct,
      hintsUsed,
      createdAt: new Date().toISOString()
    };
    saveAttempt(attempt);
    setAttemptHistory(current => [attempt, ...current].slice(0, 100));

    setProgress(current => {
      const active = touchActivity(current);
      const next: TutorProgress = {
        ...active,
        weeklyAccuracy: (() => { const solved = active.solvedPositions + (correct ? 1 : 0); const mistakes = active.recordedMistakes + (correct ? 0 : 1); const attempts = solved + mistakes; return attempts > 0 ? Math.round((solved / attempts) * 100) : active.weeklyAccuracy; })(),
        reviewDue: correct ? active.reviewDue : Math.min(12, active.reviewDue + 1),
        solvedPositions: active.solvedPositions + (correct ? 1 : 0),
        recordedMistakes: active.recordedMistakes + (correct ? 0 : 1),
        completedLessons: lessonTitle && correct && !active.completedLessons.includes(lessonTitle)
          ? [...active.completedLessons, lessonTitle]
          : active.completedLessons
      };
      return next;
    });

    if (authUser && cloudSyncedFor === authUser.id) {
      void recordTrainingAttempt({
        userId: authUser.id,
        lessonId: lessonTitle,
        puzzleKey: puzzle.title,
        fen: puzzle.fen,
        expectedMove: puzzle.expected,
        correct,
        hintsUsed
      });
    }
  }

  function completeReview(puzzle: Puzzle, correct: boolean) {
    setReviewSchedule(current => {
      const next = applyReviewResult(current, puzzle.title, correct);
      saveReviewSchedule(next);
      const due = countDueReviews(next);
      setProgress(progressCurrent => correct
        ? {
            ...touchActivity(progressCurrent),
            reviewDue: due,
            weeklyAccuracy: Math.min(99, progressCurrent.weeklyAccuracy + 1)
          }
        : {
            ...touchActivity(progressCurrent),
            recordedMistakes: progressCurrent.recordedMistakes + 1,
            reviewDue: due
          }
      );
      const updated = next.find(item => item.puzzleKey === puzzle.title);
      if (authUser && cloudSyncedFor === authUser.id && updated) {
        void recordReviewAttempt({
          userId: authUser.id,
          puzzleKey: puzzle.title,
          correct,
          intervalDays: updated.intervalDays,
          repetitions: updated.repetitions
        });
      }
      return next;
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">♞</div>
          <div>
            <div className="brand-name">Chess Tutor</div>
            <div className="brand-kicker">COACH-FIRST CHESS TRAINING</div>
          </div>
        </div>

        <div className="topbar-meta">
          <div className="streak"><span className="streak-dot" />{progress.streak ? progress.streak + " day streak" : "Start your streak"}</div>
          <button className="icon-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings size={17} />
          </button>
          <button className="profile-button" onClick={() => setAuthOpen(true)}>
            <span className="avatar">{(profile?.username?.[0] ?? authUser?.email?.[0] ?? "B").toUpperCase()}</span>
            <span className="profile-copy"><b>{profile?.username ?? (authUser ? "Account" : "Player")}</b><small>{profile ? String(profile.rating) : authUser?.email ?? "1765"}</small></span>
          </button>
          <button className="menu-button" aria-label="Menu" onClick={() => setMobileMenu(v => !v)}>
            {mobileMenu ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      {mobileMenu && (
        <div className="mobile-drawer">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "drawer-link active" : "drawer-link"} onClick={() => selectTab(id)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">CHESS TUTOR</div>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} className={tab === id ? "sidebar-link active" : "sidebar-link"} onClick={() => selectTab(id)}>
                <Icon size={18} /><span>{label}</span>{id === "review" && <em>{progress.reviewDue}</em>}
              </button>
            ))}
          </div>

          <div className="sidebar-section secondary">
            <div className="sidebar-label">YOUR WORK</div>
            <button className="sidebar-link" onClick={() => selectTab("review")}>
              <Brain size={18} /><span>Mistake patterns</span><em>{progress.recordedMistakes}</em>
            </button>
            <button className="sidebar-link" onClick={() => selectTab("review")}>
              <Target size={18} /><span>Review queue</span><em>{progress.reviewDue}</em>
            </button>
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-footer-card">
              <span className="mini-icon"><Trophy size={15} /></span>
              <div><b>{progress.weeklyAccuracy}%</b><small>weekly accuracy</small></div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          {tab === "train" && (
            <TrainView
              puzzle={trainingPuzzle}
              onHelp={() => setHelpOpen(true)}
              onResult={(correct, hintsUsed) => recordTrainingResult(correct, trainingPuzzle, trainingPuzzle.title, hintsUsed)}
              profile={profile}
              settings={settings}
            />
          )}
          {tab === "learn" && <LearnView onPractice={startLesson} completedLessons={progress.completedLessons} />}
          {tab === "play" && <PlayView authUser={authUser} cloudSyncedFor={cloudSyncedFor} onMistakesFound={mistakes => { saveGameMistakes(mistakes); setGameMistakes(current => { const byKey = new Map(current.map(item => [item.key, item])); mistakes.forEach(item => byKey.set(item.key, item)); return [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100); }); }} />}
          {tab === "review" && <ReviewView positions={[...reviewPositions, ...gameMistakes.map(puzzleFromGameMistake)]} due={progress.reviewDue} schedule={reviewSchedule} attemptHistory={attemptHistory} onComplete={completeReview} />}
        </main>
      </div>

      <nav className="bottom-nav">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "bottom-link active" : "bottom-link"} onClick={() => selectTab(id)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {authOpen && !authUser && <AuthModal onClose={() => setAuthOpen(false)} />}
      {authOpen && authUser && <AccountModal
        user={authUser}
        profile={profile}
        onProfileSaved={setProfile}
        onSignOut={() => { void signOut(); setAuthOpen(false); }}
        onClose={() => setAuthOpen(false)}
      />}

      {settingsOpen && <Modal title="Training settings" onClose={() => setSettingsOpen(false)}>
        <div className="settings-grid">
          <SettingToggle
            label="Coach explanations"
            value={settings.coachDetail === "detailed"}
            valueLabel={settings.coachDetail === "detailed" ? "Detailed" : "Concise"}
            onClick={() => setSettings(current => ({ ...current, coachDetail: current.coachDetail === "detailed" ? "concise" : "detailed" }))}
          />
          <SettingToggle
            label="Show legal moves"
            value={settings.showLegalMoves}
            valueLabel={settings.showLegalMoves ? "On" : "Off"}
            onClick={() => setSettings(current => ({ ...current, showLegalMoves: !current.showLegalMoves }))}
          />
          <SettingToggle
            label="Sound cues"
            value={settings.soundCues}
            valueLabel={settings.soundCues ? "On" : "Off"}
            onClick={() => setSettings(current => ({ ...current, soundCues: !current.soundCues }))}
          />
        </div>
        <p className="modal-note">Settings are stored on this device and apply immediately to training.</p>
      </Modal>}

      {helpOpen && <Modal title="How Chess Tutor works" onClose={() => setHelpOpen(false)}>
        <div className="help-list">
          <div><span>01</span><b>Find</b><p>Start with checks, captures and threats before searching for a clever move.</p></div>
          <div><span>02</span><b>Explain</b><p>Every training move is paired with a concrete chess reason you can verify on the board.</p></div>
          <div><span>03</span><b>Retry</b><p>Misses become review positions instead of disappearing from your training history.</p></div>
        </div>
      </Modal>}
    </div>
  );
}

function TrainView({
  puzzle,
  onHelp,
  onResult,
  profile,
  settings
}: {
  puzzle: Puzzle;
  onHelp: () => void;
  onResult: (correct: boolean, hintsUsed: number) => void;
  profile: TutorProfile | null;
  settings: TutorSettings;
}) {
  const [game, setGame] = useState(() => new Chess(puzzle.fen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("w");
  const [message, setMessage] = useState(puzzle.goal);
  const [hintLevel, setHintLevel] = useState(0);
  const [mistake, setMistake] = useState(false);
  const [solved, setSolved] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [engineEvaluation, setEngineEvaluation] = useState<EngineEvaluation | null>(null);
  const [engineThinking, setEngineThinking] = useState(true);

  useEffect(() => {
    setGame(new Chess(puzzle.fen));
    setSelected(null);
    setHintLevel(0);
    setMistake(false);
    setSolved(false);
    setLastMove(null);
    setMessage(puzzle.goal);
  }, [puzzle]);

  const coachMessage = settings.coachDetail === "detailed"
    ? message
    : message.split(/[.!?]/)[0] + (/[.!?]/.test(message) ? "." : "");

  useEffect(() => {
    let active = true;
    setEngineThinking(true);
    setEngineEvaluation(null);

    analysePosition(game.fen(), { depth: 11, skillLevel: 20 })
      .then(result => {
        if (!active) return;
        setEngineEvaluation(result);
        setEngineThinking(false);
      })
      .catch(() => {
        if (!active) return;
        setEngineThinking(false);
      });

    return () => {
      active = false;
    };
  }, [game]);
  const legalTargets = useMemo(
    () => selected
      ? new Set(game.moves({ square: selected, verbose: true }).map(move => move.to))
      : new Set<string>(),
    [game, selected]
  );

  function clickSquare(square: Square) {
    if (solved || mistake || game.turn() !== "w") return;

    if (selected && legalTargets.has(square)) {
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });
      if (!move) return;

      const isCorrect = move.from + move.to === puzzle.expected;
      setGame(next);
      setLastMove({ from: move.from, to: move.to });
      setSelected(null);

      if (isCorrect) {
        if (settings.soundCues) playCue("success");
        setSolved(true);
        setMessage(puzzle.success);
        onResult(true, hintLevel);
      } else {
        if (settings.soundCues) playCue("error");
        setMistake(true);
        setMessage("That move is legal, but it misses the training objective. Look at the coach note, then retry.");
        onResult(false, hintLevel);
      }
      return;
    }

    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  function reset() {
    setGame(new Chess(puzzle.fen));
    setSelected(null);
    setHintLevel(0);
    setMistake(false);
    setSolved(false);
    setLastMove(null);
    setMessage(puzzle.goal);
  }

  function hint() {
    const next = hintLevel + 1;
    setHintLevel(next);
    if (next === 1) setMessage(puzzle.hint);
    if (next === 2) setMessage("Hint 2 · The target move starts from " + puzzle.expected.slice(0, 2) + ". Inspect its legal destinations.");
    if (next >= 3) setMessage("Answer · " + puzzle.expected.slice(0, 2) + " → " + puzzle.expected.slice(2));
  }

  function nextDrill() {
    const nextIndex = (trainingPositions.findIndex(p => p.title === puzzle.title) + 1) % trainingPositions.length;
    const next = trainingPositions[nextIndex];
    setGame(new Chess(next.fen));
    setSelected(null);
    setHintLevel(0);
    setMistake(false);
    setSolved(false);
    setLastMove(null);
    setMessage(next.goal);
  }

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">TODAY'S FOCUS</span>
          <h1>{puzzle.title}</h1>
          <p>{puzzle.category} · Solve the position, then understand why it works.</p>
        </div>
        <button className="secondary-button" onClick={onHelp}><CircleHelp size={16} /> How it works</button>
      </section>

      <section className="training-grid">
        <div className="board-card">
          <div className="board-topline">
            <div><span className="surface-label">COACH BOARD</span><strong>{solved ? "Solved position" : "Training position"}</strong></div>
            <div className="board-tools">
              <button className="board-tool" onClick={() => setOrientation(v => v === "w" ? "b" : "w")} aria-label="Flip board"><ArrowLeftRight size={17} /></button>
              <button className="board-tool" onClick={reset} aria-label="Reset position"><RotateCcw size={16} /></button>
            </div>
          </div>

          <div className="board-wrap">
            <div className="eval-bar" aria-label="Stockfish evaluation">
              <span style={{ height: engineEvaluation?.mateIn !== null && engineEvaluation?.mateIn !== undefined && engineEvaluation.mateIn > 0 ? "100%" : String(Math.max(8, Math.min(92, 50 + ((engineEvaluation?.scoreCp ?? 0) / 1200) * 50))) + "%" }} />
              <b>{engineThinking ? "…" : formatEvaluation(engineEvaluation)}</b>
            </div>
            <ChessBoard game={game} orientation={orientation} selected={selected} targets={settings.showLegalMoves ? legalTargets : new Set<string>()} lastMove={lastMove} onSquare={clickSquare} />
          </div>

          <div className="board-bottom">
            <div className="player-row"><div className="player-avatar">{(profile?.username?.[0] ?? "B").toUpperCase()}</div><div><b>{profile?.username ?? "You"}</b><span>{profile?.rating ?? 1765} · White</span></div></div>
            <div className="move-state">{game.history().length ? game.history().slice(-8).join("  ") : "Choose a piece to begin"}</div>
            <button className="ghost-button" onClick={reset}><RotateCcw size={15} /> Retry</button>
          </div>
        </div>

        <aside className="coach-panel">
          <div className={solved ? "coach-card primary solved" : mistake ? "coach-card primary warning" : "coach-card primary"}>
            <div className="coach-icon">{solved ? <Shield size={18} /> : mistake ? <Zap size={18} /> : <Lightbulb size={18} />}</div>
            <div>
              <span className="surface-label">{solved ? "COACH FEEDBACK" : mistake ? "TRY AGAIN" : "COACH NOTE"}</span>
              <h2>{solved ? "Concrete reason first" : mistake ? "A legal move can still be a bad move" : "Calculate with a checklist"}</h2>
              <p>{coachMessage}</p>
            </div>
          </div>

          <div className="issue-card">
            <div className="issue-icon"><Gauge size={18} /></div>
            <div className="issue-copy">
              <span className="surface-label">POSITION SIGNAL</span>
              <strong>{solved ? "Training point secured" : mistake ? "Mistake recorded locally" : engineThinking ? "Stockfish is calculating" : engineEvaluation ? "Engine feedback ready" : "Scan checks, captures, threats"}</strong>
              <span>{engineThinking ? "Engine calculating…" : engineEvaluation?.principalVariation.length ? "Best line · " + formatPrincipalVariation(game.fen(), engineEvaluation.principalVariation) : (engineEvaluation ? "Stockfish depth " + engineEvaluation.depth : (hintLevel ? "Hint level " + hintLevel + " / 3" : "Engine unavailable"))}</span>
            </div>
          </div>

          <div className="coach-actions">
            <button className="brass-button" onClick={hint} disabled={solved}><Lightbulb size={16} /> {hintLevel ? "Next hint" : "Give me a hint"}</button>
            {mistake && <button className="secondary-button full" onClick={reset}><RotateCcw size={16} /> Retry the mistake</button>}
            <button className="secondary-button full" onClick={nextDrill}><Play size={16} /> Next focused drill</button>
          </div>

          <div className="progress-card">
            <div className="progress-head"><span>SESSION</span><strong>{solved ? "1 of 1 position" : mistake ? "Retry available" : "1 position active"}</strong></div>
            <div className="progress-track"><span style={{ width: solved ? "100%" : mistake ? "55%" : "18%" }} /></div>
            <div className="progress-foot"><span>Today</span><b>{solved ? "Complete" : "Keep thinking"}</b></div>
          </div>
        </aside>
      </section>
    </>
  );
}

function formatPrincipalVariation(fen: string, principalVariation: string[]) {
  if (!principalVariation.length) return "No principal variation yet";
  const line = new Chess(fen);
  return principalVariation.slice(0, 5).map(uci => {
    const legal = line.moves({ verbose: true }).find(move =>
      move.from + move.to + (move.promotion ?? "") === uci
    );
    if (!legal) return uci;
    const played = line.move({
      from: legal.from,
      to: legal.to,
      promotion: legal.promotion || "q"
    });
    return played?.san ?? uci;
  }).join(" ");
}

function formatEvaluation(evaluation: EngineEvaluation | null) {
  if (!evaluation) return "—";
  if (evaluation.mateIn !== null) {
    return (evaluation.mateIn > 0 ? "M" : "-M") + Math.abs(evaluation.mateIn);
  }
  if (evaluation.scoreCp === null) return "0.0";
  const pawns = evaluation.scoreCp / 100;
  return (pawns >= 0 ? "+" : "") + pawns.toFixed(1);
}

function ChessBoard({
  game,
  orientation,
  selected,
  targets,
  lastMove,
  onSquare
}: {
  game: Chess;
  orientation: Orientation;
  selected: Square | null;
  targets: Set<string>;
  lastMove: { from: Square; to: Square } | null;
  onSquare: (square: Square) => void;
}) {
  const displayFiles = orientation === "w" ? [...files] : [...files].reverse();
  const displayRanks = orientation === "w" ? [...ranks] : [...ranks].reverse();

  return (
    <div className="board-shell">
      <div className="board">
        {displayRanks.flatMap(rank => displayFiles.map(file => {
          const square = (file + rank) as Square;
          const piece = game.get(square);
          const fileIndex = files.indexOf(file);
          const rankIndex = ranks.indexOf(rank);
          const light = (fileIndex + rankIndex) % 2 === 0;
          const isLastMove = lastMove?.from === square || lastMove?.to === square;
          const target = targets.has(square);
          const showFile = rank === (orientation === "w" ? 1 : 8);
          const showRank = file === (orientation === "w" ? "a" : "h");

          return (
            <button
              key={square}
              className={[
                "square",
                light ? "light" : "dark",
                square === selected ? "selected" : "",
                isLastMove ? "last-move" : ""
              ].join(" ")}
              onClick={() => onSquare(square)}
              aria-label={square}
            >
              <span className="square-shine" />
              {showFile && <span className="coord file-coord">{file}</span>}
              {showRank && <span className="coord rank-coord">{rank}</span>}
              {piece && <ChessPiece color={piece.color} type={piece.type} />}
              {target && <span className={piece ? "capture-ring" : "target-dot"} />}
            </button>
          );
        }))}
      </div>
      <div className="board-caption"><span>{orientation === "w" ? "White" : "Black"} perspective</span><span>Click a piece, then a highlighted square</span></div>
    </div>
  );
}

function ChessPiece({ color, type }: { color: "w" | "b"; type: string }) {
  const light = color === "w";
  const fill = light ? "#F7F1E5" : "#20272D";
  const stroke = light ? "#2C343B" : "#11161A";

  return (
    <svg className="svg-piece" viewBox="0 0 64 64" aria-hidden="true">
      {type === "p" && <>
        <circle cx="32" cy="17" r="7" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M21 52h22l-4-7c-1-2-3-3-3-7v-2c4-2 6-6 6-11 0-2-1-3-2-5H24c-1 2-2 3-2 5 0 5 2 9 6 11v2c0 4-2 5-3 7l-4 7z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 53h28" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </>}
      {type === "r" && <>
        <path d="M18 15h7v6h5v-6h4v6h5v-6h7v14H44l-2 17H22l-2-17h-2z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 47h28v6H18z" fill={fill} stroke={stroke} strokeWidth="2" />
      </>}
      {type === "n" && <>
        <path d="M21 50h25l-3-7c-3-6-7-9-11-12 3-4 7-8 6-15l-5-7-5 4-6-2 2 8-5 5 4 7c-2 5-4 9-5 19z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="35" cy="15" r="1.8" fill={stroke} stroke="none" />
        <path d="M18 53h29" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </>}
      {type === "b" && <>
        <circle cx="32" cy="15" r="7" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M32 15l-4 5 7 2 2-5z" fill={stroke} stroke="none" />
        <path d="M25 23c0 7 2 10 6 13-1 4-3 6-6 10h14c-3-4-5-6-6-10 4-3 6-6 6-13z" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M18 53h28" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </>}
      {type === "q" && <>
        <circle cx="20" cy="15" r="4" fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx="32" cy="11" r="4" fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx="44" cy="15" r="4" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M18 17l4 27h20l4-27-9 7-5-10-5 10z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 53h28" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </>}
      {type === "k" && <>
        <path d="M27 10h10v6h6v8h-6v7c4 3 6 8 7 13H20c1-5 3-10 7-13v-7h-6v-8h6z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M32 3v13M26 9h12" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <path d="M18 53h28" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </>}
    </svg>
  );
}

function LearnView({
  onPractice,
  completedLessons
}: {
  onPractice: (lesson: Lesson) => void;
  completedLessons: string[];
}) {
  const [filter, setFilter] = useState("All");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const filters = ["All", "Openings", "Tactics", "Middlegame", "Endgame", "Blunder Patterns"];
  const visibleLessons = lessonCatalog.filter(item => filter === "All" || item.category === filter);

  return (
    <>
      <section className="hero-row">
        <div><span className="eyebrow">LEARN</span><h1>Build chess knowledge you can actually use</h1><p>Learn a concept, see the position, then move it straight into your training queue.</p></div>
        <button className="secondary-button" onClick={() => setFilter("Openings")}><BookOpen size={16} /> Curriculum</button>
      </section>

      <div className="filter-row">{filters.map(f => <button key={f} className={filter === f ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(f)}>{f}</button>)}</div>

      <section className="lesson-grid">
        {visibleLessons.map((lesson, i) => (
          <article className="lesson-card" key={lesson.title}>
            <div className="lesson-number">{String(i + 1).padStart(2, "0")}</div>
            <span className="rank-pill">{lesson.category}</span>
            <h3>{lesson.title}</h3>
            <div className="mono lesson-subtitle">{lesson.subtitle}</div>
            <p>{lesson.copy}</p>
            <div className="lesson-actions">
              <button className="text-action" onClick={() => setSelectedLesson(lesson)}>Read lesson <ChevronRight size={14} /></button>
              {lesson.fen && lesson.move
                ? <button className="text-action secondary-action" onClick={() => onPractice(lesson)}>Practise <Play size={13} /></button>
                : <span className="lesson-status">Read first</span>}
              {completedLessons.includes(lesson.title) && <span className="lesson-complete">Completed</span>}
            </div>
          </article>
        ))}
      </section>

      <section className="repertoire-strip">
        <div><span className="eyebrow">OPENING COURSES</span><h2>Repertoire in progress</h2><p>Course progress is seeded locally until the shared backend is connected.</p></div>
        <div className="repertoire-pills">{openingCourses.slice(0, 4).map(c => {
          const completed = completedLessons.includes(c.name) || completedLessons.includes("The " + c.name);
          return <button key={c.name} className="repertoire-pill" onClick={() => setFilter("Openings")}>{c.name}<b>{completed ? "Complete" : "Open"}</b></button>;
        })}</div>
      </section>

      {selectedLesson && <Modal title={selectedLesson.title} onClose={() => setSelectedLesson(null)}>
        <div className="lesson-modal">
          <div className="lesson-modal-meta"><span className="rank-pill">{selectedLesson.category}</span><span className="mono">{selectedLesson.subtitle}</span></div>
          <p>{selectedLesson.copy}</p>
          <div className="lesson-why"><span className="surface-label">WHY IT MATTERS</span><p>{selectedLesson.explanation}</p></div>
          {selectedLesson.fen && selectedLesson.move && <button className="brass-button" onClick={() => { onPractice(selectedLesson); setSelectedLesson(null); }}><Play size={16} /> Train this position</button>}
        </div>
      </Modal>}
    </>
  );
}

function PlayView({
  authUser,
  cloudSyncedFor,
  onMistakesFound
}: {
  authUser: AuthUser | null;
  cloudSyncedFor: string | null;
  onMistakesFound: (mistakes: TutorGameMistake[]) => void;
}) {
  const [localGames, setLocalGames] = useState<TutorGameRecord[]>(() => loadGameHistory());
  
  useEffect(() => {
    if (!authUser || cloudSyncedFor !== authUser.id) return;

    let active = true;
    loadCloudGames(authUser.id).then(cloudGames => {
      if (!active || !cloudGames.length) return;

      setLocalGames(current => {
        const merged = [...cloudGames, ...current];
        const seen = new Set<string>();
        return merged.filter(game => {
          const key = [game.opponent, game.date, game.result, game.moves].join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 20);
      });
    });

    return () => {
      active = false;
    };
  }, [authUser, cloudSyncedFor]);
  const [game, setGame] = useState(() => new Chess());
  const [orientation, setOrientation] = useState<Orientation>("w");
  const [selected, setSelected] = useState<Square | null>(null);
  const [started, setStarted] = useState(false);
  const [botName, setBotName] = useState("Wayne");
  const [botElo, setBotElo] = useState(600);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [status, setStatus] = useState("Choose an opponent and start a game.");
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [recordedGame, setRecordedGame] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "complete" | "failed">("idle");
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, label: "" });
  const [analysisMistakes, setAnalysisMistakes] = useState<TutorGameMistake[]>([]);

  const legalTargets = useMemo(
    () => selected
      ? new Set(game.moves({ square: selected, verbose: true }).map(move => move.to))
      : new Set<string>(),
    [game, selected]
  );

  useEffect(() => {
    if (!started || game.turn() !== "b" || game.isGameOver()) return;

    let active = true;
    const fen = game.fen();
    const delay = botElo >= 1400 ? 450 : botElo >= 1000 ? 300 : 200;

    const timer = window.setTimeout(async () => {
      const bestMove = await findBestMove(fen, {
        depth: botElo >= 1400 ? 10 : botElo >= 1000 ? 9 : 7,
        skillLevel: botElo >= 1400 ? 12 : botElo >= 1000 ? 7 : 3
      });

      if (!active) return;

      const next = new Chess(fen);
      const legal = next.moves({ verbose: true });
      const engineMove = bestMove
        ? legal.find(move => move.from + move.to === bestMove || move.from + move.to + (move.promotion ?? "") === bestMove)
        : undefined;
      const selectedMove = engineMove ?? [...legal].sort((a, b) => fallbackBotScore(b) - fallbackBotScore(a))[0];
      if (!selectedMove) return;

      const played = next.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion || "q"
      });
      if (!played) return;

      setGame(next);
      setLastMove({ from: played.from, to: played.to });
      setSelected(null);
      setStatus(next.isCheckmate() ? "Checkmate. Game finished." : next.isCheck() ? botName + " found check. Your turn." : "Your turn.");
    }, delay);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [started, game, botElo, botName]);
  useEffect(() => {
    if (!started || !game.isGameOver() || recordedGame) return;

    setRecordedGame(true);
    setAnalysisStatus("analyzing");
    setAnalysisProgress({ current: 0, total: 0, label: "Preparing game analysis…" });
    setAnalysisMistakes([]);

    const result = game.isCheckmate()
      ? (game.turn() === "b" ? "win" : "loss")
      : "draw";
    const gameId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "game-" + Date.now();

    const pgn = game.pgn();
    const localRecord: TutorGameRecord = {
      id: gameId,
      pgn,
      opponent: botName,
      rating: botElo,
      result: result === "win" ? "W" : result === "loss" ? "L" : "D",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      opening: "Local game",
      moves: Math.ceil(game.history().length / 2)
    };
    saveGameRecord(localRecord);
    setLocalGames(current => [localRecord, ...current].slice(0, 20));

    if (authUser && cloudSyncedFor === authUser.id) {
      void recordGame({
        userId: authUser.id,
        opponentName: botName,
        opponentElo: botElo,
        playerColor: "white",
        result,
        pgn
      });
    }

    let active = true;
    analyseGame(pgn, {
      gameId,
      opponent: botName,
      playerColor: "w",
      maxPlayerMoves: 18,
      depth: 8,
      onProgress: next => {
        if (active) setAnalysisProgress(next);
      }
    }).then(analysis => {
      if (!active) return;
      setAnalysisMistakes(analysis.mistakes);
      setAnalysisStatus("complete");
      onMistakesFound(analysis.mistakes);
    }).catch(() => {
      if (!active) return;
      setAnalysisStatus("failed");
      setAnalysisProgress(current => ({ ...current, label: "Analysis could not finish. The game is still saved." }));
    });

    return () => {
      active = false;
    };
  }, [started, game, recordedGame, authUser, cloudSyncedFor, botName, botElo, onMistakesFound]);
  function startGame() {
    setGame(new Chess());
    setSelected(null);
    setLastMove(null);
    setRecordedGame(false);
    setAnalysisStatus("idle");
    setAnalysisProgress({ current: 0, total: 0, label: "" });
    setAnalysisMistakes([]);
    setStarted(true);
    setStatus("Your turn. Build a position before hunting tactics.");
  }

  function clickSquare(square: Square) {
    if (!started || game.turn() !== "w" || game.isGameOver()) return;

    if (selected && legalTargets.has(square)) {
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });
      if (!move) return;
      setGame(next);
      setSelected(null);
      setLastMove({ from: move.from, to: move.to });
      setStatus(next.isCheckmate() ? "Checkmate. Game finished." : next.isCheck() ? "Check. Wayne is responding." : "Wayne is thinking.");
      return;
    }

    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  return (
    <>
      <section className="hero-row">
        <div><span className="eyebrow">PLAY</span><h1>Play with a purpose</h1><p>This is a local training game: you play White, and Stockfish replies in your browser while the board follows real chess rules.</p></div>
        <button className="brass-button" onClick={startGame}><Play size={16} /> {started ? "New game" : "Start game"}</button>
      </section>

      <div className="play-workspace">
        {started ? (
          <div className="game-card">
            <div className="game-card-head">
              <div><span className="surface-label">LIVE GAME</span><h2>You vs {botName}</h2><p>{botElo} Elo · Stockfish browser engine</p></div>
              <div className="board-tools"><button className="board-tool" onClick={() => setOrientation(v => v === "w" ? "b" : "w")}><ArrowLeftRight size={17} /></button><button className="board-tool" onClick={startGame}><RotateCcw size={16} /></button></div>
            </div>
            <div className="board-wrap centered-board"><ChessBoard game={game} orientation={orientation} selected={selected} targets={legalTargets} lastMove={lastMove} onSquare={clickSquare} /></div>
            <div className="game-status"><span className={game.turn() === "w" ? "status-dot active" : "status-dot"} /><b>{status}</b><span className="mono">{game.history().length} ply</span></div>
            {game.isGameOver() && <div className="game-analysis-card">
              <div className="game-card-head">
                <div><span className="surface-label">COACH REVIEW</span><h3>{analysisStatus === "analyzing" ? "Reviewing your game" : analysisStatus === "failed" ? "Analysis unavailable" : analysisMistakes.length ? `${analysisMistakes.length} review-ready mistake${analysisMistakes.length === 1 ? "" : "s"}` : "No review-worthy mistakes"}</h3></div>
                {analysisStatus === "analyzing" && <span className="analysis-spinner">ANALYZING</span>}
              </div>
              {analysisStatus === "analyzing" && <><div className="analysis-track"><span style={{ width: analysisProgress.total ? String(Math.round((analysisProgress.current / analysisProgress.total) * 100)) + "%" : "8%" }} /></div><p>{analysisProgress.label}</p></>}
              {analysisStatus === "complete" && !analysisMistakes.length && <p>Your key moves held up at the current analysis depth. Keep using Review to reinforce your existing work.</p>}
              {analysisStatus === "complete" && analysisMistakes.length > 0 && <div className="analysis-mistakes">
                {analysisMistakes.slice(0, 4).map(mistake => <div className="analysis-mistake" key={mistake.key}><span>{mistake.severity}</span><div><b>Move {mistake.moveNumber}: {mistake.san}</b><small>{mistake.category} · best {mistake.expected.slice(0, 2)} → {mistake.expected.slice(2)}</small></div></div>)}
                <p className="analysis-note">These positions were added to Review automatically.</p>
              </div>}
              {analysisStatus === "failed" && <p>{analysisProgress.label}</p>}
            </div>}
          </div>
        ) : (
          <article className="arena-card large-arena">
            <div className="arena-bot"><div className="bot-avatar">W</div><div><span className="surface-label">CURRENT OPPONENT</span><h2>{botName} <small>{botElo} Elo</small></h2><p>Local training bot · no network service required</p></div></div>
            <div className="arena-copy"><h3>Start with a real position</h3><p>The board, legal moves, captures, checks and bot replies are all handled in the browser.</p></div>
            <div className="arena-buttons"><button className="brass-button" onClick={startGame}>Play white</button><button className="secondary-button" onClick={() => setChooserOpen(true)}>Choose opponent</button></div>
          </article>
        )}

        <article className="recent-card">
          <div className="card-head"><div><span className="surface-label">RECENT GAMES</span><h3>Past games</h3></div><History size={16} /></div>
          {localGames.length ? localGames.map(gameRow => (

            <button className="game-row game-row-button" key={gameRow.opponent + gameRow.date} onClick={startGame}>
              <span className="result-badge">{gameRow.result}</span>
              <div className="game-opponent"><b>{gameRow.opponent}</b><span>{gameRow.rating} · {gameRow.opening}</span></div>
              <span className="mono">{gameRow.moves} moves</span>
              <span className="date-label">{gameRow.date}</span>
            </button>
          )) : <div className="empty-history"><span className="surface-label">NO GAMES YET</span><p>Finish a local game and it will appear here.</p></div>}
        </article>
      </div>

      {chooserOpen && <Modal title="Choose opponent" onClose={() => setChooserOpen(false)}>
        <div className="opponent-grid">
          {[["Wayne","600","Casual"],["Coach Bot","1000","Developing"],["Training Bot","1400","Calculation"]].map(([name, elo, desc]) => (
            <button key={name} className={botName === name ? "opponent-option active" : "opponent-option"} onClick={() => { setBotName(name); setBotElo(Number(elo)); setChooserOpen(false); setStarted(false); setStatus("Choose an opponent and start a game."); }}>
              <span className="bot-avatar">{name[0]}</span>
              <span><b>{name}</b><small>{elo} Elo · {desc}</small></span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </Modal>}
    </>
  );
}


function fallbackBotScore(move: { captured?: string; san: string; to: string }) {
  let score = 0;
  if (move.captured) score += 40;
  if (move.san.includes("#")) score += 1000;
  if (move.san.includes("+")) score += 30;
  if (["d4", "e4", "d5", "e5"].includes(move.to)) score += 8;
  return score;
}

function ReviewView({
  positions,
  due,
  schedule,
  attemptHistory,
  onComplete
}: {
  positions: Puzzle[];
  due: number;
  schedule: TutorReviewItem[];
  attemptHistory: TutorAttemptRecord[];
  onComplete: (puzzle: Puzzle, correct: boolean) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const now = Date.now();
  const dueIndexes = positions
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const scheduled = schedule.find(entry => entry.puzzleKey === item.title);
      return !scheduled || new Date(scheduled.dueAt).getTime() <= now;
    })
    .map(({ index }) => index);

  return (
    <>
      <section className="hero-row">
        <div><span className="eyebrow">REVIEW</span><h1>Turn yesterday's mistakes into today's skill</h1><p>Recall the reason, make the move, then schedule the position forward.</p></div>
        <div className="metric-chip"><Target size={14} /> {due} due</div>
      </section>

      <section className="review-layout">
        <div className="review-summary">
          <span className="surface-label">MISTAKE PATTERNS</span>
          <div className="pattern-list">
            {Object.entries(
              attemptHistory.reduce<Record<string, number>>((counts, attempt) => {
                if (!attempt.correct) counts[attempt.category] = (counts[attempt.category] ?? 0) + 1;
                return counts;
              }, {})
            ).sort(([, a], [, b]) => b - a).slice(0, 4).map(([category, count]) => (
              <div className="pattern-row" key={category}><span>{category}</span><b>{count}</b></div>
            ))}
            {!attemptHistory.some(attempt => !attempt.correct) && <p className="pattern-empty">No mistakes recorded yet. Your misses will appear here as useful coaching signals.</p>}
          </div>
        </div>

        <div className="review-summary">
          <span className="surface-label">TODAY</span>
          <strong>{due} positions</strong>
          <p>1 day · 3 days · 7 days · 14 days · 30 days</p>
          <div className="review-progress"><span style={{ width: String(Math.max(0, 100 - due * 12)) + "%" }} /></div>
          <button className="brass-button" onClick={() => setActiveIndex(dueIndexes[0] ?? 0)} disabled={due === 0}><Play size={16} /> {due === 0 ? "Queue complete" : "Start review"}</button>
        </div>

        <div className="review-list">
          {positions.map((item, i) => {
            const scheduled = schedule.find(entry => entry.puzzleKey === item.title);
            const isDue = !scheduled || new Date(scheduled.dueAt).getTime() <= now;
            const daysAway = scheduled ? Math.max(1, Math.ceil((new Date(scheduled.dueAt).getTime() - now) / 86400000)) : 0;
            return (
              <button className="review-item review-item-button" key={item.title} onClick={() => setActiveIndex(i)}>
                <span className="review-index">{i + 1}</span>
                <div><b>{item.title}</b><p>{item.goal}</p></div>
                <span className="review-stage">{isDue ? "Due today" : `In ${daysAway}d`}</span>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
      </section>

      {activeIndex !== null && <ReviewSession positions={positions} initialIndex={activeIndex} onComplete={onComplete} onClose={() => setActiveIndex(null)} />}
    </>
  );
}

function ReviewSession({
  positions,
  initialIndex,
  onComplete,
  onClose
}: {
  positions: Puzzle[];
  initialIndex: number;
  onComplete: (puzzle: Puzzle, correct: boolean) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [game, setGame] = useState(() => new Chess(positions[initialIndex].fen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const puzzle = positions[index];

  const targets = useMemo(
    () => selected
      ? new Set(game.moves({ square: selected, verbose: true }).map(move => move.to))
      : new Set<string>(),
    [game, selected]
  );

  function resetSession() {
    setGame(new Chess(puzzle.fen));
    setSelected(null);
    setRevealed(false);
    setResult("idle");
  }

  function choose(square: Square) {
    if (result !== "idle") return;
    if (selected && targets.has(square)) {
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });
      if (!move) return;
      setGame(next);
      setSelected(null);
      setResult(move.from + move.to === puzzle.expected ? "correct" : "wrong");
      return;
    }
    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  function nextCard() {
    onComplete(puzzle, result === "correct");
    if (index >= positions.length - 1) {
      onClose();
      return;
    }
    const next = index + 1;
    setIndex(next);
    setGame(new Chess(positions[next].fen));
    setSelected(null);
    setRevealed(false);
    setResult("idle");
  }

  return (
    <div className="session-overlay">
      <div className="session-panel">
        <div className="session-head">
          <div><span className="eyebrow">REVIEW {index + 1} / {positions.length}</span><h2>{puzzle.title}</h2><p>{puzzle.goal}</p></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="session-grid">
          <div className="board-wrap"><ChessBoard game={game} orientation="w" selected={selected} targets={targets} lastMove={null} onSquare={choose} /></div>
          <div className="session-coach">
            <div className={result === "correct" ? "coach-card solved" : result === "wrong" ? "coach-card warning" : "coach-card"}>
              <span className="surface-label">{result === "correct" ? "CORRECT" : result === "wrong" ? "NOT YET" : "RECALL"}</span>
              <h3>{result === "correct" ? "The reason is secured." : result === "wrong" ? "Reset and look again." : "Can you find the move?"}</h3>
              <p>{result === "correct" ? puzzle.success : result === "wrong" ? "The move is legal, but it does not answer the training objective." : "Use the board first. The reveal is there to support recall, not replace it."}</p>
            </div>
            {!revealed && result === "idle" && <button className="secondary-button full" onClick={() => setRevealed(true)}><Lightbulb size={16} /> Reveal hint</button>}
            {revealed && result === "idle" && <div className="revealed-answer"><span className="surface-label">HINT</span><b>{puzzle.hint}</b><small>Target move: {puzzle.expected.slice(0, 2)} → {puzzle.expected.slice(2)}</small></div>}
            {result === "wrong" && <button className="secondary-button full" onClick={resetSession}><RotateCcw size={16} /> Retry position</button>}
            {result === "correct" && <button className="brass-button full" onClick={nextCard}><ChevronRight size={16} /> Next review</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountModal({
  user,
  profile,
  onProfileSaved,
  onSignOut,
  onClose
}: {
  user: AuthUser;
  profile: TutorProfile | null;
  onProfileSaved: (profile: TutorProfile) => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setMessage("");
    setBusy(true);
    const result = await updateCloudProfile(user.id, { username });
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    onProfileSaved(profile
      ? { ...profile, username: username.trim() }
      : { username: username.trim(), title: "Novice", rating: 1200, puzzleRating: 700 }
    );
    setMessage("Profile saved.");
  }

  return (
    <Modal title="Your account" onClose={onClose}>
      <div className="account-summary">
        <span className="surface-label">SIGNED IN</span>
        <h3>{user.email}</h3>
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={event => setUsername(event.target.value)} maxLength={24} />
        </label>
        {profile && <div className="account-stats"><span>{profile.title}</span><span>{profile.rating} rating</span><span>{profile.puzzleRating} puzzle</span></div>}
        {message && <div className="auth-message">{message}</div>}
        <button className="brass-button full" onClick={save} disabled={busy || !username.trim()}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button className="secondary-button full" onClick={onSignOut}><X size={16} /> Sign out</button>
      </div>
    </Modal>
  );
}

function SettingToggle({
  label,
  value,
  valueLabel,
  onClick
}: {
  label: string;
  value: boolean;
  valueLabel: string;
  onClick: () => void;
}) {
  return (
    <button className="setting-row setting-toggle" onClick={onClick} aria-pressed={value}>
      <span>{label}</span>
      <b>{valueLabel}<span className={value ? "toggle-dot on" : "toggle-dot"} /></b>
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head"><div><span className="surface-label">CHESS TUTOR</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div>
        {children}
      </div>
    </div>
  );
}

export default App;
