import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import {
  ArrowLeftRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  Flag,
  Gauge,
  History,
  Layers,
  Lightbulb,
  Menu,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Undo2,
  X,
  Zap
} from "lucide-react";
import { curriculumLessons, openingCourses, trainingPuzzles } from "./data/content";
import {
  applyReviewResult,
  clearLocalData,
  countDueReviews,
  defaultProgress,
  generateUuid,
  loadAttemptHistory,
  loadGameHistory,
  loadGameMistakes,
  loadProgress,
  loadReviewSchedule,
  mergeProgress,
  saveAttempt,
  saveGameMistakes,
  saveGameRecord,
  saveProgress,
  saveReviewSchedule,
  touchActivity,
  loadSettings,
  saveSettings,
  TutorAttemptRecord,
  TutorGameMistake,
  TutorGameRecord,
  TutorProgress,
  TutorReviewItem,
  TutorSettings
} from "./lib/storage";
import { AuthUser, getAuthUser, loadCloudGameMistakes, loadCloudGames, loadCloudProfile, loadCloudProgress, loadCloudReviewItems, loadCloudSettings, recordGame, recordGameMistake, recordReviewAttempt, recordTrainingAttempt, saveCloudProgress, saveCloudSettings, signOut, subscribeToAuthChanges, TutorProfile, updateCloudProfile } from "./lib/cloud";
import { AuthModal } from "./components/AuthModal";
import { ChessPiece } from "./components/ChessPiece";
import { PromotionModal } from "./components/PromotionModal";
import { LichessExplorerView } from "./components/LichessExplorerView";
import { AccountReviewer } from "./components/AccountReviewer";
import { AccountGameSummary } from "./lib/accountStats";
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
  rank?: string;
};

const tabs = [
  { id: "train" as const, label: "Train", icon: Target },
  { id: "learn" as const, label: "Learn", icon: BookOpen },
  { id: "play" as const, label: "Play", icon: Swords },
  { id: "review" as const, label: "Review", icon: History }
];

const trainingPositions: Puzzle[] = trainingPuzzles;

const lessonCatalog: Lesson[] = curriculumLessons.map(item => ({
  title: item.title,
  subtitle: item.subtitle,
  category: item.category,
  copy: item.copy,
  fen: item.fen,
  move: item.move,
  explanation: item.explanation,
  rank: item.rank
}));

const reviewPositions: Puzzle[] = trainingPuzzles.slice(0, 10);

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

function playCue(kind: "move" | "capture" | "check" | "success" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const now = context.currentTime;

    if (kind === "move") {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      osc.onended = () => { void context.close(); };
    } else if (kind === "capture") {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      osc.onended = () => { void context.close(); };
    } else if (kind === "check") {
      [587, 880].forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.001, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.05, now + i * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.16);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.17);
      });
      setTimeout(() => { void context.close(); }, 300);
    } else if (kind === "success") {
      [523.25, 659.25].forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.001, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.06, now + i * 0.07 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.21);
      });
      setTimeout(() => { void context.close(); }, 400);
    } else {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.19);
      osc.onended = () => { void context.close(); };
    }
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
  const [activeLessonTitle, setActiveLessonTitle] = useState<string | null>(null);
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
        if (!user) {
          setCloudSyncedFor(null);
          setProfile(null);
          clearLocalData();
          setProgress(defaultProgress);
          setAttemptHistory([]);
          setGameMistakes([]);
          setReviewSchedule(loadReviewSchedule([...reviewPositions, ...trainingPositions].map(p => p.title)));
        }
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
      loadCloudReviewItems(authUser.id),
      loadCloudGameMistakes(authUser.id),
      loadCloudSettings(authUser.id)
    ]).then(([cloud, cloudReviews, cloudMistakes, cloudSettings]) => {
      if (!active) return;
      if (cloud) {
        setProgress(current => mergeProgress(current, cloud));
      }
      if (cloudSettings) setSettings(cloudSettings);
      if (cloudMistakes.length) {
        setGameMistakes(current => {
          const byKey = new Map(current.map(item => [item.key, item]));
          cloudMistakes.forEach(item => byKey.set(item.key, item));
          return [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
        });
      }
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
    if (authUser && cloudSyncedFor === authUser.id) {
      void saveCloudSettings(authUser.id, settings);
    }
  }, [settings, authUser, cloudSyncedFor]);

  useEffect(() => {
    saveProgress(progress);
    if (authUser && cloudSyncedFor === authUser.id) {
      void saveCloudProgress(authUser.id, progress);
    }
  }, [progress, authUser, cloudSyncedFor]);

  const [explorerFen, setExplorerFen] = useState<string | null>(null);
  const [learnSubTab, setLearnSubTab] = useState<"explorer" | "curriculum" | "repertoires">("explorer");

  function selectTab(next: Tab) {
    setTab(next);
    setMobileMenu(false);
  }

  function openInLichessExplorer(fen: string) {
    setExplorerFen(fen);
    setLearnSubTab("explorer");
    selectTab("learn");
  }

  function practiceOpeningPosition(fen: string, title: string, goal?: string) {
    setTrainingPuzzle({
      title,
      category: "Opening Practice",
      fen,
      goal: goal || `Find the strongest continuation for ${title} from master games`,
      hint: "Inspect central control, active pieces, and king safety.",
      expected: "",
      success: `Position analyzed and practiced! Engine and master database evaluated.`
    });
    setActiveLessonTitle(null);
    selectTab("train");
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
    setActiveLessonTitle(lesson.title);
    setTab("train");
  }

  function selectDrill(puzzle: Puzzle) {
    setTrainingPuzzle(puzzle);
    setActiveLessonTitle(null);
  }

  function prevFocusedDrill() {
    const currentIndex = trainingPositions.findIndex(item => item.title === trainingPuzzle.title);
    const prev = trainingPositions[(currentIndex - 1 + trainingPositions.length) % trainingPositions.length];
    setTrainingPuzzle(prev);
    setActiveLessonTitle(null);
  }

  function startFocusedDrill() {
    const currentIndex = trainingPositions.findIndex(item => item.title === trainingPuzzle.title);
    const next = trainingPositions[(currentIndex + 1 + trainingPositions.length) % trainingPositions.length];
    setTrainingPuzzle(next);
    setActiveLessonTitle(null);
  }

  function recordTrainingResult(correct: boolean, puzzle: Puzzle, lessonTitle: string | undefined, hintsUsed: number, playedMove?: string) {
    const known = reviewSchedule.some(item => item.puzzleKey === puzzle.title);
    let nextSchedule = reviewSchedule;

    if (!known && !correct) {
      const added: TutorReviewItem = {
        puzzleKey: puzzle.title,
        dueAt: new Date().toISOString(),
        intervalDays: 1,
        repetitions: 0,
        lastResult: "wrong"
      };
      nextSchedule = [...reviewSchedule, added];
      setReviewSchedule(nextSchedule);
      saveReviewSchedule(nextSchedule);
      if (authUser && cloudSyncedFor === authUser.id) {
        void recordReviewAttempt({
          userId: authUser.id,
          puzzleKey: puzzle.title,
          correct: false,
          intervalDays: 1,
          repetitions: 0
        });
      }
    } else if (known) {
      nextSchedule = applyReviewResult(reviewSchedule, puzzle.title, correct);
      setReviewSchedule(nextSchedule);
      saveReviewSchedule(nextSchedule);
    }

    const attempt: TutorAttemptRecord = {
      puzzleKey: puzzle.title,
      category: puzzle.category,
      correct,
      hintsUsed,
      createdAt: new Date().toISOString()
    };
    saveAttempt(attempt);
    setAttemptHistory(current => [attempt, ...current].slice(0, 100));

    const dueCount = countDueReviews(nextSchedule);
    setProgress(current => {
      const active = touchActivity(current);
      const solved = active.solvedPositions + (correct ? 1 : 0);
      const mistakes = active.recordedMistakes + (correct ? 0 : 1);
      const attempts = solved + mistakes;
      const next: TutorProgress = {
        ...active,
        weeklyAccuracy: attempts > 0 ? Math.round((solved / attempts) * 100) : active.weeklyAccuracy,
        reviewDue: dueCount,
        solvedPositions: solved,
        recordedMistakes: mistakes,
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
        playedMove,
        correct,
        hintsUsed
      });
    }
  }

  function completeReview(puzzle: Puzzle, correct: boolean) {
    const nextSchedule = applyReviewResult(reviewSchedule, puzzle.title, correct);
    setReviewSchedule(nextSchedule);
    saveReviewSchedule(nextSchedule);
    const due = countDueReviews(nextSchedule);

    const reviewAttempt: TutorAttemptRecord = {
      puzzleKey: puzzle.title,
      category: puzzle.category,
      correct,
      hintsUsed: 0,
      createdAt: new Date().toISOString()
    };
    saveAttempt(reviewAttempt);
    setAttemptHistory(history => [reviewAttempt, ...history].slice(0, 100));

    setProgress(progressCurrent => {
      const active = touchActivity(progressCurrent);
      const solved = active.solvedPositions + (correct ? 1 : 0);
      const mistakes = active.recordedMistakes + (correct ? 0 : 1);
      const attempts = solved + mistakes;
      return {
        ...active,
        reviewDue: due,
        solvedPositions: solved,
        recordedMistakes: mistakes,
        weeklyAccuracy: attempts > 0 ? Math.round((solved / attempts) * 100) : active.weeklyAccuracy
      };
    });

    const updated = nextSchedule.find(item => item.puzzleKey === puzzle.title);
    if (authUser && cloudSyncedFor === authUser.id && updated) {
      void recordReviewAttempt({
        userId: authUser.id,
        puzzleKey: puzzle.title,
        correct,
        intervalDays: updated.intervalDays,
        repetitions: updated.repetitions
      });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">♞</div>
          <div className="brand-name">Chess Tutor</div>
        </div>

        <div className="topbar-meta">
          <div className="streak-indicator">
            <span className="streak-dot" />
            {progress.streak ? `${progress.streak} day streak` : "Start streak"}
          </div>
          <button className="icon-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings size={17} />
          </button>
          <button className="profile-button" onClick={() => setAuthOpen(true)}>
            <span className="avatar">{(profile?.username?.[0] ?? authUser?.email?.[0] ?? "B").toUpperCase()}</span>
            <span className="profile-copy"><b>{profile?.username ?? (authUser ? "Account" : "Guest")}</b><small>{profile ? String(profile.rating) : authUser?.email ?? "Local progress"}</small></span>
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
              <div><b>{progress.weeklyAccuracy}%</b><small>overall accuracy</small></div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          {gameMistakes.length > 0 && tab === "review" && (
            <section className="coaching-insights">
              <div className="insights-head">
                <div>
                  <span className="eyebrow">COACHING SIGNALS</span>
                  <h2>Your game is teaching us what to practise</h2>
                </div>
              </div>
              <div className="insight-grid">
                {Object.entries(
                  gameMistakes.reduce<Record<string, number>>((counts, mistake) => {
                    counts[mistake.category] = (counts[mistake.category] ?? 0) + 1;
                    return counts;
                  }, {})
                ).sort(([, a], [, b]) => b - a).slice(0, 4).map(([category, count]) => (
                  <div className="insight-card" key={category}>
                    <span className="surface-label">{category}</span>
                    <strong>{count} {count === 1 ? "position" : "positions"}</strong>
                    <small>Engine-flagged for Review</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div style={{ display: tab === "train" ? "block" : "none" }}>
            <TrainView
              puzzle={trainingPuzzle}
              onHelp={() => setHelpOpen(true)}
              onResult={(correct, hintsUsed, playedMove) => recordTrainingResult(correct, trainingPuzzle, activeLessonTitle ?? undefined, hintsUsed, playedMove)}
              onNextDrill={startFocusedDrill}
              onPrevDrill={prevFocusedDrill}
              onSelectDrill={selectDrill}
              onExplorePosition={openInLichessExplorer}
              allPuzzles={trainingPositions}
              activeLessonTitle={activeLessonTitle}
              profile={profile}
              settings={settings}
            />
          </div>
          <div style={{ display: tab === "learn" ? "block" : "none" }}>
            <LearnView
              onPractice={startLesson}
              completedLessons={progress.completedLessons}
              initialExplorerFen={explorerFen ?? undefined}
              onPracticeOpening={practiceOpeningPosition}
              soundCues={settings.soundCues}
              activeSubTab={learnSubTab}
              onSubTabChange={setLearnSubTab}
            />
          </div>
          <div style={{ display: tab === "play" ? "block" : "none" }}>
            <PlayView
              authUser={authUser}
              cloudSyncedFor={cloudSyncedFor}
              gameMistakes={gameMistakes}
              settings={settings}
              onExplorePosition={openInLichessExplorer}
              onMistakesFound={mistakes => {
                saveGameMistakes(mistakes);
                setGameMistakes(current => {
                  const byKey = new Map(current.map(item => [item.key, item]));
                  mistakes.forEach(item => byKey.set(item.key, item));
                  return [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
                });
                if (authUser && cloudSyncedFor === authUser.id) {
                  void Promise.all(mistakes.map(mistake => recordGameMistake(authUser.id, mistake)));
                }
              }}
            />
          </div>
          <div style={{ display: tab === "review" ? "block" : "none" }}>
            <ReviewView
              positions={[...reviewPositions, ...gameMistakes.map(puzzleFromGameMistake)]}
              due={progress.reviewDue}
              schedule={reviewSchedule}
              attemptHistory={attemptHistory}
              onComplete={completeReview}
              onTrainOpening={practiceOpeningPosition}
              onStudyInLearn={openInLichessExplorer}
            />
          </div>
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
        onSignOut={() => {
          void signOut();
          setAuthUser(null);
          setCloudSyncedFor(null);
          setProfile(null);
          clearLocalData();
          setProgress(defaultProgress);
          setAttemptHistory([]);
          setGameMistakes([]);
          setReviewSchedule(loadReviewSchedule([...reviewPositions, ...trainingPositions].map(p => p.title)));
          setAuthOpen(false);
        }}
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
  settings,
  onNextDrill,
  onPrevDrill,
  onSelectDrill,
  allPuzzles,
  activeLessonTitle,
  onExplorePosition
}: {
  puzzle: Puzzle;
  onHelp: () => void;
  onResult: (correct: boolean, hintsUsed: number, playedMove?: string) => void;
  profile: TutorProfile | null;
  settings: TutorSettings;
  onNextDrill: () => void;
  onPrevDrill: () => void;
  onSelectDrill: (puzzle: Puzzle) => void;
  allPuzzles: Puzzle[];
  activeLessonTitle: string | null;
  onExplorePosition?: (fen: string, title?: string) => void;
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
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", "Tactics", "Openings", "Middlegame", "Endgame", "Blunder Patterns"];

  const filteredPuzzles = useMemo(() => {
    if (categoryFilter === "All") return allPuzzles;
    return allPuzzles.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
  }, [allPuzzles, categoryFilter]);

  const currentIndex = filteredPuzzles.findIndex(p => p.title === puzzle.title);

  useEffect(() => {
    try {
      const pGame = new Chess(puzzle.fen);
      setGame(pGame);
      setOrientation(pGame.turn());
    } catch (_e) {
      setGame(new Chess());
      setOrientation("w");
    }
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

  const showEngineDetails = solved || mistake || hintLevel >= 3;

  function clickSquare(square: Square) {
    if (solved || mistake || game.turn() !== orientation) return;

    if (selected && legalTargets.has(square)) {
      const movingPiece = game.get(selected);
      const isCapture = !!game.get(square) || (movingPiece?.type === "p" && selected[0] !== square[0]);
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });
      if (!move) return;

      const playedUci = move.from + move.to;
      const isExpected = puzzle.expected ? (playedUci === puzzle.expected || (playedUci + (move.promotion ?? "")) === puzzle.expected) : false;
      const isMatingMove = next.isCheckmate();
      const isEngineBest = !puzzle.expected && engineEvaluation?.bestMove ? (playedUci === engineEvaluation.bestMove || (playedUci + (move.promotion ?? "")) === engineEvaluation.bestMove) : false;
      const isOpenPractice = !puzzle.expected;
      const isCorrect = isExpected || isMatingMove || isEngineBest || isOpenPractice;

      setGame(next);
      setLastMove({ from: move.from, to: move.to });
      setSelected(null);

      if (isCorrect) {
        if (settings.soundCues) playCue("success");
        setSolved(true);
        const successMsg = isEngineBest
          ? `Excellent move (${move.san})! Stockfish confirms this as the strongest continuation.`
          : puzzle.success || `Solid move (${move.san})! Strategic plan executed successfully.`;
        setMessage(successMsg);
        onResult(true, hintLevel, playedUci);
      } else {
        if (settings.soundCues) {
          if (isCapture) playCue("capture");
          else if (next.isCheck()) playCue("check");
          else playCue("error");
        }
        setMistake(true);
        setMessage("That move is legal, but it misses the training objective. Look at the coach note, then retry.");
        onResult(false, hintLevel, playedUci);
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
    if (next >= 3) setMessage("Answer · " + puzzle.expected.slice(0, 2) + " → " + puzzle.expected.slice(2) + " delivers the tactical win.");
  }

  function handleFilterCategory(cat: string) {
    setCategoryFilter(cat);
    const inCat = cat === "All" ? allPuzzles : allPuzzles.filter(p => p.category.toLowerCase() === cat.toLowerCase());
    if (inCat.length && !inCat.some(p => p.title === puzzle.title)) {
      onSelectDrill(inCat[0]);
    }
  }

  function handlePrev() {
    if (!filteredPuzzles.length) return;
    const idx = filteredPuzzles.findIndex(p => p.title === puzzle.title);
    const prev = filteredPuzzles[(idx - 1 + filteredPuzzles.length) % filteredPuzzles.length];
    onSelectDrill(prev);
  }

  function handleNext() {
    if (!filteredPuzzles.length) return;
    const idx = filteredPuzzles.findIndex(p => p.title === puzzle.title);
    const next = filteredPuzzles[(idx + 1) % filteredPuzzles.length];
    onSelectDrill(next);
  }

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">{activeLessonTitle ? "LESSON DRILL" : "TACTICAL DRILL"}</span>
          <h1>{puzzle.title}</h1>
          <p>{puzzle.category} · Find the strongest move on the board, then understand why it works.</p>
        </div>
        <button className="secondary-button" onClick={onHelp}><CircleHelp size={16} /> How it works</button>
      </section>

      <div className="drill-toolbar">
        <div className="drill-filter-chips">
          {categories.map(c => (
            <button
              key={c}
              className={categoryFilter === c ? "drill-chip active" : "drill-chip"}
              onClick={() => handleFilterCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="drill-nav-actions">
          <span className="drill-counter">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${filteredPuzzles.length}` : `${allPuzzles.length} drills`}
          </span>
          <button className="drill-nav-btn" onClick={handlePrev} title="Previous drill" aria-label="Previous drill">
            <ChevronLeft size={16} />
          </button>
          <button className="drill-nav-btn" onClick={handleNext} title="Next drill" aria-label="Next drill">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <section className="training-grid">
        <div className="board-card">
          <div className="board-topline">
            <div>
              <span className="surface-label">COACH BOARD</span>
              <strong>{solved ? "Position Solved" : mistake ? "Mistake Detected" : "Find the Winning Move"}</strong>
            </div>
            <div className="board-tools">
              <button className="board-tool" onClick={() => setOrientation(v => v === "w" ? "b" : "w")} aria-label="Flip board" title="Flip board"><ArrowLeftRight size={17} /></button>
              <button className="board-tool" onClick={reset} aria-label="Reset position" title="Reset position"><RotateCcw size={16} /></button>
            </div>
          </div>

          <div className="board-wrap">
            <div className="eval-bar" aria-label="Stockfish evaluation">
              <span style={{
                height: !showEngineDetails
                  ? "50%"
                  : engineEvaluation?.mateIn !== null && engineEvaluation?.mateIn !== undefined && engineEvaluation.mateIn > 0
                  ? "100%"
                  : String(Math.max(8, Math.min(92, 50 + ((engineEvaluation?.scoreCp ?? 0) / 1200) * 50))) + "%"
              }} />
              <b>{!showEngineDetails ? "—" : engineThinking ? "…" : formatEvaluation(engineEvaluation)}</b>
            </div>
            <ChessBoard game={game} orientation={orientation} selected={selected} targets={settings.showLegalMoves ? legalTargets : new Set<string>()} lastMove={lastMove} onSquare={clickSquare} />
          </div>

          <div className="board-bottom">
            <div className="player-row"><div className="player-avatar">{(profile?.username?.[0] ?? "B").toUpperCase()}</div><div><b>{profile?.username ?? "You"}</b><span>{profile ? `${profile.rating} · White` : "Local progress · White"}</span></div></div>
            <div className="move-state">{game.history().length ? game.history().slice(-8).join("  ") : "White to move · Click a piece to begin"}</div>
            <button className="ghost-button" onClick={reset}><RotateCcw size={15} /> Retry</button>
          </div>
        </div>

        <aside className="coach-panel">
          <div className={solved ? "coach-card primary solved" : mistake ? "coach-card primary warning" : "coach-card primary"}>
            <div className="coach-icon">{solved ? <Shield size={18} /> : mistake ? <Zap size={18} /> : <Lightbulb size={18} />}</div>
            <div>
              <span className="surface-label">{solved ? "COACH FEEDBACK" : mistake ? "TRY AGAIN" : "COACH NOTE"}</span>
              <h2>{solved ? "Objective achieved!" : mistake ? "A legal move can still be a tactical blunder" : "Calculate with a checklist"}</h2>
              <p>{coachMessage}</p>
            </div>
          </div>

          <div className="issue-card">
            <div className="issue-icon"><Gauge size={18} /></div>
            <div className="issue-copy">
              <span className="surface-label">POSITION SIGNAL</span>
              <strong>
                {solved
                  ? "Training point secured"
                  : mistake
                  ? "Mistake recorded for Review"
                  : showEngineDetails
                  ? (engineThinking ? "Stockfish is calculating" : "Engine feedback ready")
                  : "Find the strongest move"}
              </strong>
              <span>
                {!showEngineDetails
                  ? "Scan checks, captures, and threats before deciding."
                  : engineThinking
                  ? "Engine calculating…"
                  : engineEvaluation?.principalVariation.length
                  ? (mistake ? "Refutation line · " : "Best line · ") + formatPrincipalVariation(game.fen(), engineEvaluation.principalVariation)
                  : (engineEvaluation ? "Stockfish depth " + engineEvaluation.depth : (hintLevel ? "Hint level " + hintLevel + " / 3" : "Engine ready"))}
              </span>
            </div>
          </div>

          <div className="coach-actions">
            <button className="brass-button" onClick={hint} disabled={solved}>
              <Lightbulb size={16} /> {hintLevel ? `Next hint (${hintLevel}/3)` : "Give me a hint"}
            </button>
            {mistake && (
              <button className="secondary-button full" onClick={reset}>
                <RotateCcw size={16} /> Retry the position
              </button>
            )}
            <button className="secondary-button full" onClick={handleNext}>
              <Play size={16} /> Next focused drill
            </button>
            {onExplorePosition && (
              <button
                className="secondary-button full"
                onClick={() => onExplorePosition(game.fen(), puzzle.title)}
                style={{ borderColor: "rgba(224, 171, 82, 0.4)", color: "var(--brass)" }}
              >
                <Database size={16} /> Explore in Lichess Database
              </button>
            )}
          </div>

          <div className="progress-card">
            <div className="progress-head">
              <span>ACTIVE CATEGORY</span>
              <strong>{categoryFilter} · {filteredPuzzles.length} positions</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: currentIndex >= 0 ? `${Math.round(((currentIndex + 1) / filteredPuzzles.length) * 100)}%` : "20%" }} />
            </div>
            <div className="progress-foot">
              <span>{puzzle.category}</span>
              <b>{solved ? "Solved" : mistake ? "Retry" : "In progress"}</b>
            </div>
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

  const inCheck = game.inCheck();
  const turn = game.turn();
  let kingSquare: Square | null = null;
  if (inCheck) {
    for (const r of ranks) {
      for (const f of files) {
        const sq = (f + r) as Square;
        const p = game.get(sq);
        if (p && p.type === "k" && p.color === turn) {
          kingSquare = sq;
          break;
        }
      }
      if (kingSquare) break;
    }
  }

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
          const isKingInCheck = square === kingSquare;
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
                isLastMove ? "last-move" : "",
                isKingInCheck ? "in-check" : ""
              ].filter(Boolean).join(" ")}
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
      <div className="board-caption">
        <span>{orientation === "w" ? "White" : "Black"} perspective</span>
        <span>Click a piece, then a destination square</span>
      </div>
    </div>
  );
}

function LearnView({
  onPractice,
  completedLessons,
  initialExplorerFen,
  onPracticeOpening,
  soundCues = true,
  activeSubTab = "explorer",
  onSubTabChange
}: {
  onPractice: (lesson: Lesson) => void;
  completedLessons: string[];
  initialExplorerFen?: string;
  onPracticeOpening: (fen: string, title: string, goal?: string) => void;
  soundCues?: boolean;
  activeSubTab?: "explorer" | "curriculum" | "repertoires";
  onSubTabChange?: (tab: "explorer" | "curriculum" | "repertoires") => void;
}) {
  const [internalSubTab, setInternalSubTab] = useState<"explorer" | "curriculum" | "repertoires">(activeSubTab);
  const currentSubTab = onSubTabChange ? activeSubTab : internalSubTab;

  function setSubTab(tab: "explorer" | "curriculum" | "repertoires") {
    if (onSubTabChange) onSubTabChange(tab);
    else setInternalSubTab(tab);
  }

  const [filter, setFilter] = useState("All");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const filters = ["All", "Openings", "Tactics", "Middlegame", "Endgame", "Blunder Patterns"];
  const visibleLessons = lessonCatalog.filter(item => filter === "All" || item.category === filter);
  const completionPercentage = Math.round((completedLessons.length / lessonCatalog.length) * 100);

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">CHESS MASTERY HUB</span>
          <h1>Learn openings, theory & master concepts</h1>
          <p>
            Connected to the comprehensive Lichess database: explore opening win rates, candidate moves, and master games, then drill them directly in Train mode.
          </p>
        </div>

        <div className="filter-chips-row">
          <button
            type="button"
            className={currentSubTab === "explorer" ? "filter-chip active" : "filter-chip"}
            onClick={() => setSubTab("explorer")}
          >
            <Database size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Opening Explorer & DB
          </button>
          <button
            type="button"
            className={currentSubTab === "curriculum" ? "filter-chip active" : "filter-chip"}
            onClick={() => setSubTab("curriculum")}
          >
            <BookOpen size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Curriculum Lessons
          </button>
          <button
            type="button"
            className={currentSubTab === "repertoires" ? "filter-chip active" : "filter-chip"}
            onClick={() => setSubTab("repertoires")}
          >
            <Layers size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Repertoires
          </button>
        </div>
      </section>

      {/* SubTab 1: Embedded Lichess Opening Explorer & Database */}
      {currentSubTab === "explorer" && (
        <div style={{ marginTop: "12px" }}>
          <LichessExplorerView
            initialFen={initialExplorerFen}
            onPracticePosition={(fen, title, goal) => {
              onPracticeOpening(
                fen,
                title,
                goal || `Practice the theoretical moves for ${title} from the master database.`
              );
            }}
            soundCues={soundCues}
          />
        </div>
      )}

      {/* SubTab 2: Curriculum Lessons */}
      {currentSubTab === "curriculum" && (
        <div style={{ marginTop: "12px" }}>
          <div className="learn-progress-banner">
            <div className="learn-progress-stats">
              <Award size={24} color="var(--brass)" />
              <div>
                <b>{completedLessons.length} of {lessonCatalog.length} lessons mastered</b>
                <span style={{ display: "block", color: "var(--text-3)", fontSize: "12px", marginTop: "2px" }}>
                  {completionPercentage}% complete · Solved in interactive training drills
                </span>
              </div>
            </div>
            <div className="learn-progress-bar-wrap">
              <div className="learn-progress-bar">
                <span style={{ width: `${Math.min(100, Math.max(4, completionPercentage))}%` }} />
              </div>
            </div>
            <span className="learn-progress-pct">{completionPercentage}%</span>
          </div>

          <div className="filter-row">
            {filters.map(f => (
              <button key={f} className={filter === f ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>

          <section className="lesson-grid">
            {visibleLessons.map((lesson, i) => {
              const isCompleted = completedLessons.includes(lesson.title);
              return (
                <article className="lesson-card" key={lesson.title}>
                  <div className="lesson-number">{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="rank-pill">{lesson.category}</span>
                    {lesson.rank && <span className="rank-pill mono">{lesson.rank}</span>}
                  </div>
                  <h3>{lesson.title}</h3>
                  <div className="mono lesson-subtitle">{lesson.subtitle}</div>
                  <p>{lesson.copy}</p>
                  <div className="lesson-actions">
                    <button className="text-action" onClick={() => setSelectedLesson(lesson)}>
                      Read lesson <ChevronRight size={14} />
                    </button>
                    {lesson.fen && lesson.move ? (
                      <button className="text-action secondary-action" onClick={() => onPractice(lesson)}>
                        Practise in Train <Play size={13} />
                      </button>
                    ) : (
                      <span className="lesson-status">Read first</span>
                    )}
                    {isCompleted && (
                      <span className="lesson-complete">
                        <CheckCircle2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                        Completed
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      )}

      {/* SubTab 3: Opening Repertoire Courses */}
      {currentSubTab === "repertoires" && (
        <div style={{ marginTop: "12px" }}>
          <section className="repertoire-strip" style={{ marginBottom: "20px" }}>
            <div>
              <span className="eyebrow">CURATED OPENING COURSES</span>
              <h2>Opening Repertoires</h2>
              <p>Study master lines, explore complete move trees in the Lichess database, or drill variations in Train mode.</p>
            </div>
          </section>

          <div className="lesson-grid">
            {openingCourses.map(course => (
              <article className="lesson-card" key={course.name}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="rank-pill">Opening Course</span>
                  <span className="rank-pill mono">{course.rank}</span>
                </div>
                <h3>{course.name}</h3>
                <div className="mono lesson-subtitle">{course.subtitle}</div>
                <div style={{ margin: "10px 0" }}>
                  <span className="text-xs text-zinc-400 font-medium">Mastery:</span>
                  <span className="mono text-xs text-amber-400 ml-1.5">{course.mastery} ({course.progress}%)</span>
                </div>
                <div className="lesson-actions">
                  <button
                    className="text-action secondary-action"
                    onClick={() => {
                      onPracticeOpening(
                        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                        course.name,
                        `Master the key responses and middlegame plans for ${course.name}.`
                      );
                    }}
                  >
                    Train in Train <Play size={13} />
                  </button>
                  <button
                    className="text-action"
                    onClick={() => {
                      setSubTab("explorer");
                    }}
                  >
                    Explore in DB <ChevronRight size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedLesson && (
        <Modal title={selectedLesson.title} onClose={() => setSelectedLesson(null)}>
          <div className="lesson-modal">
            <div className="lesson-modal-meta">
              <span className="rank-pill">{selectedLesson.category}</span>
              {selectedLesson.rank && <span className="rank-pill mono">{selectedLesson.rank}</span>}
              <span className="mono">{selectedLesson.subtitle}</span>
            </div>

            {selectedLesson.fen ? (
              <div className="lesson-preview-container">
                <div className="lesson-preview-board-wrap">
                  <ChessBoard
                    game={new Chess(selectedLesson.fen)}
                    orientation="w"
                    selected={null}
                    targets={new Set()}
                    lastMove={null}
                    onSquare={() => {}}
                  />
                </div>
                <div className="lesson-preview-info">
                  <p>{selectedLesson.copy}</p>
                  <div className="lesson-why">
                    <span className="surface-label">WHY IT MATTERS</span>
                    <p>{selectedLesson.explanation}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p>{selectedLesson.copy}</p>
                <div className="lesson-why">
                  <span className="surface-label">WHY IT MATTERS</span>
                  <p>{selectedLesson.explanation}</p>
                </div>
              </>
            )}

            {selectedLesson.fen && selectedLesson.move && (
              <button
                className="brass-button"
                onClick={() => {
                  onPractice(selectedLesson);
                  setSelectedLesson(null);
                }}
              >
                <Play size={16} /> Train this position in Train
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

interface PlayableOpening {
  id: string;
  name: string;
  eco: string;
  moves: string[];
  ideas: string;
}

const PLAYABLE_OPENINGS: PlayableOpening[] = [
  {
    id: "standard",
    name: "Standard Starting Position",
    eco: "A00",
    moves: [],
    ideas: "Fight for central control (e4, d4, e5, d5), develop minor pieces (knights before bishops), and castle early to ensure king safety."
  },
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    ideas: "Direct pressure against the vulnerable f7 square. White aims to control the center with c3 and d4, while Black counters with ...Bc5 or ...Nf6."
  },
  {
    id: "sicilian",
    name: "Sicilian Defense (Open)",
    eco: "B20",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3"],
    ideas: "Dynamic asymmetrical fight. Black exchanges a flank c-pawn for White's center d-pawn, creating a central pawn majority and sharp queenside play."
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez (Spanish Opening)",
    eco: "C60",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    ideas: "White pressures Black's knight on c6 to weaken defense of the central e5 square. Deep strategic maneuvering on both flanks."
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C00",
    moves: ["e4", "e6", "d4", "d5"],
    ideas: "Solid central chain. Black stakes a claim on d5. When White advances e5, Black relentlessly attacks the base of White's pawn chain with ...c5."
  },
  {
    id: "caro-kann",
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["e4", "c6", "d4", "d5"],
    ideas: "Ultra-solid pawn structure. Unlike the French, Black's light-squared bishop develops freely to f5 or g4 before playing ...e6."
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4", "d5", "c4"],
    ideas: "White offers a flank pawn on c4 to draw Black's d5 pawn away from the center and dominate the board with pawns on d4 and e4."
  },
  {
    id: "kings-indian",
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"],
    ideas: "Hypermodern defense. Black concedes initial space to build a king fortress, then counterattacks with ...e5 and kingside pawn storms."
  },
  {
    id: "english",
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    ideas: "Wing control over the central d5 square. Flexible setup often transposing into 1.d4 structures or fianchettoing on the long diagonal."
  },
  {
    id: "london",
    name: "London System",
    eco: "D00",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3"],
    ideas: "Solid universal system. White develops the dark-squared bishop outside the pawn chain before locking the center with e3 and c3."
  }
];

function PlayView({
  authUser,
  cloudSyncedFor,
  gameMistakes,
  settings,
  onExplorePosition,
  onMistakesFound
}: {
  authUser: AuthUser | null;
  cloudSyncedFor: string | null;
  gameMistakes: TutorGameMistake[];
  settings: TutorSettings;
  onExplorePosition?: (fen: string) => void;
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

  const [selectedOpeningId, setSelectedOpeningId] = useState<string>("standard");
  const [liveEngineScore, setLiveEngineScore] = useState<string>("0.0");
  const [engineHint, setEngineHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  const activeOpening = PLAYABLE_OPENINGS.find(o => o.id === selectedOpeningId) || PLAYABLE_OPENINGS[0];

  const [game, setGame] = useState(() => new Chess());
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [orientation, setOrientation] = useState<Orientation>("w");
  const [selected, setSelected] = useState<Square | null>(null);
  const [started, setStarted] = useState(false);
  const [botName, setBotName] = useState("Wayne");
  const [botElo, setBotElo] = useState(600);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [status, setStatus] = useState("Choose your color and start a game.");
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [recordedGame, setRecordedGame] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "complete" | "failed">("idle");
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, label: "" });
  const [analysisMistakes, setAnalysisMistakes] = useState<TutorGameMistake[]>([]);
  const [selectedGameForAnalysis, setSelectedGameForAnalysis] = useState<TutorGameRecord | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);

  const botColor = playerColor === "w" ? "b" : "w";

  const onMistakesFoundRef = useRef(onMistakesFound);
  useEffect(() => {
    onMistakesFoundRef.current = onMistakesFound;
  }, [onMistakesFound]);

  const analyzedGameKeyRef = useRef<string | null>(null);
  const activeAnalysisCancelRef = useRef<(() => void) | null>(null);

  const legalTargets = useMemo(
    () => selected
      ? new Set(game.moves({ square: selected, verbose: true }).map(move => move.to))
      : new Set<string>(),
    [game, selected]
  );

  const movePairs = useMemo(() => {
    const history = game.history();
    const pairs: { moveNum: number; white: string; black?: string }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        moveNum: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1]
      });
    }
    return pairs;
  }, [game]);

  useEffect(() => {
    if (!started || game.turn() !== botColor || game.isGameOver()) return;

    let active = true;
    const fen = game.fen();
    const delay = botElo >= 1500 ? 500 : botElo >= 1000 ? 350 : 220;

    const timer = window.setTimeout(async () => {
      const bestMove = await findBestMove(fen, {
        depth: botElo >= 1500 ? 11 : botElo >= 1000 ? 9 : 6,
        skillLevel: botElo >= 1500 ? 14 : botElo >= 1000 ? 7 : 3
      });

      if (!active) return;

      const next = new Chess(fen);
      const legal = next.moves({ verbose: true });
      const engineMove = bestMove
        ? legal.find(move => move.from + move.to === bestMove || move.from + move.to + (move.promotion ?? "") === bestMove)
        : undefined;
      const selectedMove = engineMove ?? [...legal].sort((a, b) => fallbackBotScore(b) - fallbackBotScore(a))[0];
      if (!selectedMove) return;

      const isCapture = !!next.get(selectedMove.to) || (selectedMove.piece === "p" && selectedMove.from[0] !== selectedMove.to[0]);

      const played = next.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion || "q"
      });
      if (!played) return;

      if (settings.soundCues) {
        if (isCapture) playCue("capture");
        else if (next.isCheck()) playCue("check");
        else playCue("move");
      }

      setGame(next);
      setLastMove({ from: played.from, to: played.to });
      setSelected(null);
      setStatus(
        next.isCheckmate()
          ? "Checkmate. Game finished."
          : next.isDraw()
          ? "Game drawn."
          : next.isCheck()
          ? `${botName} delivered check. Your turn.`
          : "Your turn."
      );
    }, delay);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [started, game, botElo, botName, botColor, settings.soundCues]);

  useEffect(() => {
    if (!started || !game.isGameOver()) return;

    const pgn = game.pgn();
    if (!pgn || analyzedGameKeyRef.current === pgn) return;
    analyzedGameKeyRef.current = pgn;

    setRecordedGame(true);
    setAnalysisStatus("analyzing");
    setAnalysisProgress({ current: 0, total: 0, label: "Preparing game analysis…" });
    setAnalysisMistakes([]);

    const result = game.isCheckmate()
      ? (game.turn() === botColor ? "win" : "loss")
      : "draw";
    const gameId = generateUuid();

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
    setLocalGames(current => [localRecord, ...current.filter(g => g.id !== gameId)].slice(0, 20));

    if (authUser && cloudSyncedFor === authUser.id) {
      void recordGame({
        userId: authUser.id,
        gameId,
        opponentName: botName,
        opponentElo: botElo,
        playerColor: playerColor === "w" ? "white" : "black",
        result,
        pgn
      });
    }

    let isCancelled = false;
    activeAnalysisCancelRef.current = () => {
      isCancelled = true;
    };

    analyseGame(pgn, {
      gameId,
      opponent: botName,
      playerColor,
      maxPlayerMoves: 60,
      depth: 8,
      onProgress: next => {
        if (!isCancelled) setAnalysisProgress(next);
      }
    }).then(analysis => {
      if (isCancelled) return;
      setAnalysisMistakes(analysis.mistakes);
      setAnalysisStatus("complete");
      onMistakesFoundRef.current(analysis.mistakes);
    }).catch(() => {
      if (isCancelled) return;
      setAnalysisStatus("failed");
      setAnalysisProgress(current => ({ ...current, label: "Analysis could not finish. The game is still saved." }));
    });
  }, [started, game, authUser, cloudSyncedFor, botName, botElo, botColor, playerColor]);

  useEffect(() => {
    if (!started || game.isGameOver()) return;
    let active = true;
    analysePosition(game.fen(), { depth: 9, skillLevel: 10 }).then(res => {
      if (!active || !res) return;
      if (res.scoreCp !== null) {
        const score = res.scoreCp / 100;
        setLiveEngineScore(score > 0 ? `+${score.toFixed(1)}` : `${score.toFixed(1)}`);
      } else if (res.mateIn !== null) {
        setLiveEngineScore(`M${res.mateIn}`);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [started, game]);

  async function handleGetHint() {
    if (!started || game.isGameOver() || game.turn() !== playerColor) return;
    setIsHintLoading(true);
    setEngineHint(null);
    try {
      const res = await analysePosition(game.fen(), { depth: 10, skillLevel: 20 });
      if (res?.bestMove) {
        const legal = game.moves({ verbose: true });
        const moveObj = legal.find(m => (m.from + m.to) === res.bestMove || (m.from + m.to + (m.promotion ?? "")) === res.bestMove);
        setEngineHint(moveObj ? `Stockfish top move: ${moveObj.san} (${moveObj.from} → ${moveObj.to})` : `Best move: ${res.bestMove}`);
      }
    } catch (_e) {
      setEngineHint("Could not calculate hint right now.");
    } finally {
      setIsHintLoading(false);
    }
  }

  function startWithColor(color: "w" | "b", opening = activeOpening) {
    activeAnalysisCancelRef.current?.();
    analyzedGameKeyRef.current = null;
    const newBoard = new Chess();
    for (const m of opening.moves) {
      try { newBoard.move(m); } catch (_e) { break; }
    }
    setGame(newBoard);
    setPlayerColor(color);
    setOrientation(color);
    setSelected(null);
    const hist = newBoard.history({ verbose: true });
    const last = hist.length ? hist[hist.length - 1] : null;
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setPendingPromotion(null);
    setRecordedGame(false);
    setConfirmResign(false);
    setAnalysisStatus("idle");
    setAnalysisProgress({ current: 0, total: 0, label: "" });
    setAnalysisMistakes([]);
    setEngineHint(null);
    setStarted(true);
    setStatus(
      newBoard.turn() === color
        ? `Your turn. Playing the ${opening.name}.`
        : `${botName} is responding in the ${opening.name}.`
    );
  }

  function undoMove() {
    if (!started || game.isGameOver()) return;
    const next = new Chess(game.fen());
    const histLen = next.history().length;
    if (histLen >= 2) {
      next.undo();
      next.undo();
    } else if (histLen === 1) {
      next.undo();
    }
    setGame(next);
    setSelected(null);
    const hist = next.history({ verbose: true });
    const last = hist.length ? hist[hist.length - 1] : null;
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setStatus(next.turn() === playerColor ? "Move taken back. Your turn." : `${botName} is thinking.`);
  }

  function handleResign() {
    if (!started || game.isGameOver()) return;
    setConfirmResign(false);
    const pgn = game.pgn() || `1. e4 { Resigned }`;
    const gameId = generateUuid();
    const localRecord: TutorGameRecord = {
      id: gameId,
      pgn,
      opponent: botName,
      rating: botElo,
      result: "L",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      opening: "Resigned",
      moves: Math.ceil(game.history().length / 2)
    };
    saveGameRecord(localRecord);
    setLocalGames(current => [localRecord, ...current.filter(g => g.id !== gameId)].slice(0, 20));
    setStatus("You resigned. Game saved for review.");
    setRecordedGame(true);

    if (game.history().length > 4) {
      setAnalysisStatus("analyzing");
      setAnalysisProgress({ current: 0, total: 0, label: "Analyzing resigned game…" });
      analyseGame(pgn, {
        gameId,
        opponent: botName,
        playerColor,
        maxPlayerMoves: 60,
        depth: 8,
        onProgress: next => setAnalysisProgress(next)
      }).then(analysis => {
        setAnalysisMistakes(analysis.mistakes);
        setAnalysisStatus("complete");
        onMistakesFoundRef.current(analysis.mistakes);
      }).catch(() => {
        setAnalysisStatus("failed");
      });
    }
  }

  function handlePromotion(pieceType: "q" | "r" | "b" | "n") {
    if (!pendingPromotion) return;
    const next = new Chess(game.fen());
    const move = next.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: pieceType });
    setPendingPromotion(null);
    if (!move) return;

    if (settings.soundCues) {
      if (move.captured) playCue("capture");
      else if (next.isCheck()) playCue("check");
      else playCue("move");
    }

    setGame(next);
    setSelected(null);
    setLastMove({ from: move.from, to: move.to });
    setStatus(
      next.isCheckmate()
        ? "Checkmate. Game finished."
        : next.isDraw()
        ? "Game drawn."
        : next.isCheck()
        ? `Check! ${botName} is responding.`
        : `${botName} is thinking.`
    );
  }

  function clickSquare(square: Square) {
    if (!started || game.turn() !== playerColor || game.isGameOver()) return;

    if (selected && legalTargets.has(square)) {
      const movingPiece = game.get(selected);
      const isPromotion = movingPiece?.type === "p" && (square.endsWith("8") || square.endsWith("1"));
      if (isPromotion) {
        setPendingPromotion({ from: selected, to: square });
        return;
      }
      const isCapture = !!game.get(square) || (movingPiece?.type === "p" && selected[0] !== square[0]);
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });
      if (!move) return;

      if (settings.soundCues) {
        if (isCapture) playCue("capture");
        else if (next.isCheck()) playCue("check");
        else playCue("move");
      }

      setGame(next);
      setSelected(null);
      setLastMove({ from: move.from, to: move.to });
      setStatus(
        next.isCheckmate()
          ? "Checkmate. You win!"
          : next.isDraw()
          ? "Game drawn."
          : next.isCheck()
          ? `Check. ${botName} is responding.`
          : `${botName} is thinking.`
      );
      return;
    }

    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  function copyPgnToClipboard() {
    const pgn = game.pgn();
    if (!pgn) return;
    navigator.clipboard.writeText(pgn).then(() => {
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2200);
    });
  }

  const botList = [
    { name: "Wayne", elo: 600, badge: "Casual", avatar: "W", desc: "Plays simple moves and makes occasional tactical errors." },
    { name: "Maya", elo: 900, badge: "Developing", avatar: "M", desc: "Solid developing moves; looks for basic forks and pins." },
    { name: "Elena", elo: 1200, badge: "Classical", avatar: "E", desc: "Disciplined opening repertoire and active piece placement." },
    { name: "Viktor", elo: 1500, badge: "Tactician", avatar: "V", desc: "Aggressive attacking player with sharp tactical calculation." },
    { name: "Stockfish GM", elo: 2000, badge: "Master", avatar: "S", desc: "Deep positional mastery and near-flawless calculation." }
  ];

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">PLAY</span>
          <h1>Play with a purpose</h1>
          <p>Test your skills against Stockfish browser bots at different Elo ratings. Every game is saved locally and analyzed for reviewable mistakes.</p>
        </div>
        <button className="brass-button" onClick={() => startWithColor(playerColor)}>
          <Play size={16} /> {started ? "New game" : "Start game"}
        </button>
      </section>

      <div className="play-workspace">
        {started ? (
          <div className="game-card">
            <div className="game-card-head">
              <div>
                <span className="surface-label">LIVE MATCH</span>
                <h2>You ({playerColor === "w" ? "White" : "Black"}) vs {botName}</h2>
                <p>{botElo} Elo · Stockfish Browser Engine</p>
              </div>
              <div className="board-tools">
                <button className="board-tool" onClick={() => setOrientation(v => v === "w" ? "b" : "w")} title="Flip board" aria-label="Flip board">
                  <ArrowLeftRight size={17} />
                </button>
                <button className="board-tool" onClick={() => startWithColor(playerColor)} title="Restart game" aria-label="Restart game">
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {activeOpening && (
              <div className="opening-understanding-card" style={{ marginBottom: "14px" }}>
                <div className="opening-understanding-top">
                  <span className="eco-badge">{activeOpening.eco}</span>
                  <b className="text-sm text-zinc-100">{activeOpening.name}</b>
                  <div className="opening-eval-meter ml-auto">
                    <Gauge size={13} className="text-amber-400" />
                    <span>Eval: <strong>{liveEngineScore}</strong></span>
                  </div>
                </div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  <strong>Key Idea:</strong> {activeOpening.ideas}
                </p>
                {engineHint && (
                  <div className="mt-2 text-xs text-amber-300 font-medium flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400 shrink-0" />
                    <span>{engineHint}</span>
                  </div>
                )}
              </div>
            )}

            <div className="board-wrap centered-board">
              <ChessBoard
                game={game}
                orientation={orientation}
                selected={selected}
                targets={legalTargets}
                lastMove={lastMove}
                onSquare={clickSquare}
              />
            </div>

            <div className="game-status">
              <span className={game.turn() === playerColor ? "status-dot active" : "status-dot"} />
              <b>{status}</b>
              <span className="mono">{game.history().length} ply · {Math.ceil(game.history().length / 2)} moves</span>
            </div>

            <div className="in-game-actions">
              <div className="in-game-actions-group">
                <button
                  className="in-game-action-btn"
                  onClick={undoMove}
                  disabled={game.history().length === 0 || game.isGameOver()}
                  title="Take back last move"
                >
                  <Undo2 size={14} /> Takeback
                </button>
                <button
                  className="in-game-action-btn"
                  onClick={handleGetHint}
                  disabled={isHintLoading || game.isGameOver() || game.turn() !== playerColor}
                  title="Ask Stockfish for the best theoretical move"
                >
                  <Lightbulb size={13} /> {isHintLoading ? "Calculating…" : "Engine Hint"}
                </button>
                {!confirmResign ? (
                  <button
                    className="in-game-action-btn danger"
                    onClick={() => setConfirmResign(true)}
                    disabled={game.isGameOver()}
                    title="Resign current game"
                  >
                    <Flag size={14} /> Resign
                  </button>
                ) : (
                  <div className="resign-confirm-bar">
                    <span>Resign?</span>
                    <button className="in-game-action-btn danger" onClick={handleResign}>Confirm</button>
                    <button className="in-game-action-btn" onClick={() => setConfirmResign(false)}>Cancel</button>
                  </div>
                )}
              </div>

              <div className="in-game-actions-group">
                <button
                  className="in-game-action-btn"
                  onClick={copyPgnToClipboard}
                  disabled={game.history().length === 0}
                  title="Copy PGN notation"
                >
                  <Sparkles size={13} /> {copiedPgn ? "Copied!" : "Copy PGN"}
                </button>
                {onExplorePosition && (
                  <button
                    className="in-game-action-btn"
                    onClick={() => onExplorePosition(game.fen())}
                    title="Explore current board in Lichess database"
                  >
                    <Database size={13} /> Lichess DB
                  </button>
                )}
              </div>
            </div>

            {movePairs.length > 0 && (
              <div className="move-history-strip">
                {movePairs.map(pair => (
                  <span className="move-history-step" key={pair.moveNum}>
                    <span className="move-num">{pair.moveNum}.</span>
                    <span className="move-san">{pair.white}</span>
                    {pair.black && <span className="move-san">{pair.black}</span>}
                  </span>
                ))}
              </div>
            )}

            {game.isGameOver() && (
              <div className="game-analysis-card">
                <div className="game-card-head">
                  <div>
                    <span className="surface-label">COACH REVIEW</span>
                    <h3>
                      {analysisStatus === "analyzing"
                        ? "Reviewing your game moves…"
                        : analysisStatus === "failed"
                        ? "Analysis unavailable"
                        : analysisMistakes.length
                        ? `${analysisMistakes.length} review-ready mistake${analysisMistakes.length === 1 ? "" : "s"}`
                        : "No critical blunders detected!"}
                    </h3>
                  </div>
                  {analysisStatus === "analyzing" && <span className="analysis-spinner">ANALYZING</span>}
                </div>
                {analysisStatus === "analyzing" && (
                  <>
                    <div className="analysis-track">
                      <span style={{ width: analysisProgress.total ? `${Math.round((analysisProgress.current / analysisProgress.total) * 100)}%` : "12%" }} />
                    </div>
                    <p>{analysisProgress.label}</p>
                  </>
                )}
                {analysisStatus === "complete" && !analysisMistakes.length && (
                  <p>Your moves held up at Stockfish depth. Excellent positional discipline.</p>
                )}
                {analysisStatus === "complete" && analysisMistakes.length > 0 && (
                  <div className="analysis-mistakes">
                    {analysisMistakes.slice(0, 4).map(mistake => (
                      <div className="analysis-mistake" key={mistake.key}>
                        <span>{mistake.severity}</span>
                        <div>
                          <b>Move {mistake.moveNumber}: {mistake.san}</b>
                          <small>{mistake.category} · best {mistake.expected.slice(0, 2)} → {mistake.expected.slice(2)}</small>
                        </div>
                      </div>
                    ))}
                    <p className="analysis-note">These blunders were added to your Review queue automatically.</p>
                  </div>
                )}
                {analysisStatus === "failed" && <p>{analysisProgress.label}</p>}
              </div>
            )}
          </div>
        ) : (
          <article className="arena-card large-arena">
            <div className="arena-bot">
              <div className="bot-avatar">{botName[0]}</div>
              <div>
                <span className="surface-label">CHOSEN OPPONENT</span>
                <h2>{botName} <small>{botElo} Elo</small></h2>
                <p>Browser Stockfish engine · No network latency</p>
              </div>
            </div>

            <div className="arena-copy">
              <div className="play-opening-picker-bar">
                <div className="play-opening-picker-head">
                  <div>
                    <span className="surface-label">OPENING PRACTICE</span>
                    <h3 className="text-sm font-semibold text-zinc-100">Select Opening to Play & Learn</h3>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    {activeOpening.eco}
                  </span>
                </div>
                <div className="opening-selection-pills">
                  {PLAYABLE_OPENINGS.map(op => (
                    <button
                      key={op.id}
                      type="button"
                      className={`opening-pill-btn ${selectedOpeningId === op.id ? "active" : ""}`}
                      onClick={() => setSelectedOpeningId(op.id)}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>
                <div className="opening-understanding-card mt-3">
                  <p className="text-xs text-zinc-300">
                    <strong>Strategic Goal:</strong> {activeOpening.ideas}
                  </p>
                </div>
              </div>

              <h3>Choose your side & start play</h3>
              <p>Play freely with real chess rules: legal highlights, check & checkmate detection, pawn promotion, takeback, engine hints, and automated blunder analysis.</p>

              <div className="side-picker-group">
                <button
                  className={playerColor === "w" ? "side-picker-btn active" : "side-picker-btn"}
                  onClick={() => setPlayerColor("w")}
                >
                  <span className="side-mark white" /> Play as White (You move first)
                </button>
                <button
                  className={playerColor === "b" ? "side-picker-btn active" : "side-picker-btn"}
                  onClick={() => setPlayerColor("b")}
                >
                  <span className="side-mark black" /> Play as Black ({botName} moves first)
                </button>
              </div>
            </div>

            <div className="arena-buttons">
              <button className="brass-button" onClick={() => startWithColor(playerColor, activeOpening)}>
                Start {activeOpening.id !== "standard" ? `(${activeOpening.name})` : ""} as {playerColor === "w" ? "White" : "Black"}
              </button>
              <button className="secondary-button" onClick={() => setChooserOpen(true)}>
                Change opponent
              </button>
            </div>
          </article>
        )}

        <article className="recent-card">
          <div className="card-head">
            <div>
              <span className="surface-label">MATCH HISTORY</span>
              <h3>Past games</h3>
            </div>
            <History size={16} />
          </div>
          {localGames.length ? localGames.map(gameRow => (
            <div className="game-row" key={(gameRow.id ?? "") + gameRow.opponent + gameRow.date}>
              <button className="game-row-button game-row-main" onClick={() => setSelectedGameForAnalysis(gameRow)}>
                <span className={gameRow.result === "W" ? "result-badge" : gameRow.result === "L" ? "result-badge loss" : "result-badge draw"}>
                  {gameRow.result}
                </span>
                <div className="game-opponent">
                  <b>{gameRow.opponent}</b>
                  <span>{gameRow.rating} Elo · {gameRow.opening}</span>
                </div>
                <span className="mono">{gameRow.moves} moves</span>
                <span className="date-label">{gameRow.date}</span>
              </button>
              {gameRow.pgn && (
                <button className="game-analysis-button" onClick={() => setSelectedGameForAnalysis(gameRow)}>
                  Analyse
                </button>
              )}
            </div>
          )) : (
            <div className="empty-history">
              <span className="surface-label">NO GAMES YET</span>
              <p>Finish a game against any bot and it will automatically appear here with full replay analysis.</p>
            </div>
          )}
        </article>
      </div>

      {selectedGameForAnalysis && (
        <GameAnalysisModal
          game={selectedGameForAnalysis}
          mistakes={gameMistakes.filter(mistake => selectedGameForAnalysis.id ? mistake.gameId === selectedGameForAnalysis.id : mistake.opponent === selectedGameForAnalysis.opponent)}
          onClose={() => setSelectedGameForAnalysis(null)}
        />
      )}

      {chooserOpen && (
        <Modal title="Choose your opponent" onClose={() => setChooserOpen(false)}>
          <div className="opponent-grid">
            {botList.map(bot => (
              <button
                key={bot.name}
                className={botName === bot.name ? "opponent-option active" : "opponent-option"}
                onClick={() => {
                  setBotName(bot.name);
                  setBotElo(bot.elo);
                  setChooserOpen(false);
                  setStarted(false);
                  setStatus("Choose your color and start a game.");
                }}
              >
                <span className="bot-avatar">{bot.avatar}</span>
                <span>
                  <b>{bot.name}</b>
                  <small>{bot.elo} Elo · {bot.badge} · {bot.desc}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </Modal>
      )}

      {pendingPromotion && (
        <PromotionModal
          color={playerColor}
          onSelect={handlePromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </>
  );
}


function GameAnalysisModal({
  game,
  mistakes,
  onClose
}: {
  game: TutorGameRecord;
  mistakes: TutorGameMistake[];
  onClose: () => void;
}) {
  const [selectedPly, setSelectedPly] = useState(0);
  const history = useMemo(() => {
    if (!game.pgn) return [];
    try {
      const replay = new Chess();
      replay.loadPgn(game.pgn);
      return replay.history({ verbose: true });
    } catch {
      return [];
    }
  }, [game.pgn]);

  const replay = useMemo(() => {
    const board = new Chess();
    for (const move of history.slice(0, selectedPly)) {
      board.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });
    }
    return board;
  }, [history, selectedPly]);

  const moveNumber = selectedPly ? Math.ceil(selectedPly / 2) : 0;
  const activeMistake = mistakes.find(mistake => mistake.key === `${game.id}:${selectedPly}`);
  const displayedMoves = history.map((move, index) => ({
    move,
    index: index + 1,
    label: move.color === "w" ? `${Math.ceil((index + 1) / 2)}. ${move.san}` : `${Math.ceil((index + 1) / 2)}... ${move.san}`
  }));

  return (
    <div className="session-overlay">
      <div className="analysis-panel">
        <div className="session-head">
          <div>
            <span className="eyebrow">GAME ANALYSIS</span>
            <h2>You vs {game.opponent}</h2>
            <p>{game.date} · {game.moves} moves · {mistakes.length} review-ready mistake{mistakes.length === 1 ? "" : "s"}</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="analysis-workspace">
          <div className="analysis-board-wrap">
            <div className="board-wrap">
              <ChessBoard
                game={replay}
                orientation="w"
                selected={null}
                targets={new Set<string>()}
                lastMove={selectedPly ? { from: history[selectedPly - 1].from, to: history[selectedPly - 1].to } : null}
                onSquare={() => undefined}
              />
            </div>
            <div className="analysis-nav">
              <button className="secondary-button" onClick={() => setSelectedPly(Math.max(0, selectedPly - 1))} disabled={selectedPly === 0}>Previous</button>
              <span>{moveNumber ? `After move ${moveNumber}` : "Starting position"}</span>
              <button className="secondary-button" onClick={() => setSelectedPly(Math.min(history.length, selectedPly + 1))} disabled={selectedPly >= history.length}>Next</button>
            </div>
          </div>

          <aside className="analysis-side">
            <div className="coach-card primary">
              <span className="surface-label">{activeMistake ? activeMistake.severity : "ENGINE REVIEW"}</span>
              <h2>{activeMistake ? `Move ${activeMistake.moveNumber}: ${activeMistake.san}` : "Replay your game"}</h2>
              <p>{activeMistake ? activeMistake.success : "Step through the move list. Mistake markers jump directly to positions that the engine found worth reviewing."}</p>
              {activeMistake && <div className="analysis-engine-line"><span>BEST LINE</span><b>{activeMistake.bestLine.join(" ") || activeMistake.expected}</b></div>}
            </div>

            <div className="analysis-move-list">
              {displayedMoves.length ? displayedMoves.map(item => {
                const itemMistake = mistakes.find(mistake => mistake.key === `${game.id}:${item.index}`);
                return (
                  <button key={item.index} className={selectedPly === item.index ? "analysis-move active" : "analysis-move"} onClick={() => setSelectedPly(item.index)}>
                    <span>{item.label}</span>
                    {itemMistake && <em>{itemMistake.severity}</em>}
                  </button>
                );
              }) : <p>No saved PGN is available for this game.</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
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
  onComplete,
  onTrainOpening,
  onStudyInLearn
}: {
  positions: Puzzle[];
  due: number;
  schedule: TutorReviewItem[];
  attemptHistory: TutorAttemptRecord[];
  onComplete: (puzzle: Puzzle, correct: boolean) => void;
  onTrainOpening?: (fen: string, title: string, goal?: string) => void;
  onStudyInLearn?: (fen: string, title: string) => void;
}) {
  const [reviewMode, setReviewMode] = useState<"account" | "spaced">("account");
  const [selectedAccountGame, setSelectedAccountGame] = useState<AccountGameSummary | null>(null);
  const [sessionPositions, setSessionPositions] = useState<{ list: Puzzle[]; initialIndex: number } | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "due" | "mistakes">("all");
  const now = Date.now();

  const duePositions = positions.filter(item => {
    const scheduled = schedule.find(entry => entry.puzzleKey === item.title);
    return !scheduled || new Date(scheduled.dueAt).getTime() <= now;
  });

  const mistakePositions = positions.filter(item => item.title.startsWith("Game review"));

  const filteredPositions = useMemo(() => {
    if (reviewFilter === "due") return duePositions;
    if (reviewFilter === "mistakes") return mistakePositions;
    return positions;
  }, [positions, duePositions, mistakePositions, reviewFilter]);

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">ACCOUNT & PERFORMANCE REVIEW</span>
          <h1>Analyze your account & master your weaknesses</h1>
          <p>
            Connect any Lichess or Chess.com account to review win/loss percentages, evaluate opening success rates, and identify areas to improve.
          </p>
        </div>

        <div className="filter-chips-row">
          <button
            type="button"
            className={reviewMode === "account" ? "filter-chip active" : "filter-chip"}
            onClick={() => setReviewMode("account")}
          >
            <History size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Account Review (Lichess & Chess.com)
          </button>
          <button
            type="button"
            className={reviewMode === "spaced" ? "filter-chip active" : "filter-chip"}
            onClick={() => setReviewMode("spaced")}
          >
            <Target size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Spaced Repetition ({due} due)
          </button>
        </div>
      </section>

      {reviewMode === "account" && (
        <div style={{ marginTop: "16px" }}>
          <AccountReviewer
            onTrainOpening={onTrainOpening}
            onStudyInLearn={onStudyInLearn}
            onAnalyzeGame={game => setSelectedAccountGame(game)}
          />

          {selectedAccountGame && (
            <GameAnalysisModal
              game={{
                id: selectedAccountGame.id,
                pgn: selectedAccountGame.pgn,
                opponent: selectedAccountGame.opponent,
                rating: selectedAccountGame.opponentRating,
                result: selectedAccountGame.result,
                date: selectedAccountGame.date,
                opening: selectedAccountGame.opening,
                moves: selectedAccountGame.movesCount
              }}
              mistakes={[]}
              onClose={() => setSelectedAccountGame(null)}
            />
          )}
        </div>
      )}

      {reviewMode === "spaced" && (
        <div style={{ marginTop: "16px" }}>
          <div className="filter-row" style={{ marginBottom: "16px" }}>
            <button
              className={reviewFilter === "all" ? "filter-chip active" : "filter-chip"}
              onClick={() => setReviewFilter("all")}
            >
              All Cards ({positions.length})
            </button>
            <button
              className={reviewFilter === "due" ? "filter-chip active" : "filter-chip"}
              onClick={() => setReviewFilter("due")}
            >
              Due Today ({duePositions.length})
            </button>
            <button
              className={reviewFilter === "mistakes" ? "filter-chip active" : "filter-chip"}
              onClick={() => setReviewFilter("mistakes")}
            >
              Game Blunders ({mistakePositions.length})
            </button>
          </div>

          <section className="review-layout">
            <div className="review-sidebar">
              <div className="review-summary">
                <span className="surface-label">SPACED REPETITION</span>
            <strong>{due} due today</strong>
            <p>Intervals: 1d · 3d · 7d · 14d · 30d</p>
            <div className="review-progress"><span style={{ width: String(Math.max(0, 100 - due * 12)) + "%" }} /></div>
            <button
              className="brass-button"
              onClick={() => setSessionPositions({ list: duePositions.length ? duePositions : filteredPositions, initialIndex: 0 })}
              disabled={filteredPositions.length === 0}
            >
              <Play size={16} /> {due === 0 ? "Review All Positions" : "Start Due Review"}
            </button>
          </div>

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
              {!attemptHistory.some(attempt => !attempt.correct) && <p className="pattern-empty">No misses recorded yet. Mistake patterns from drills and games appear here.</p>}
            </div>
          </div>
        </div>

        <div className="review-list">
          {filteredPositions.map((item, i) => {
            const scheduled = schedule.find(entry => entry.puzzleKey === item.title);
            const isDue = !scheduled || new Date(scheduled.dueAt).getTime() <= now;
            const daysAway = scheduled ? Math.max(1, Math.ceil((new Date(scheduled.dueAt).getTime() - now) / 86400000)) : 0;
            return (
              <button className="review-item review-item-button" key={item.title} onClick={() => setSessionPositions({ list: filteredPositions, initialIndex: i })}>
                <span className="review-index">{i + 1}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <b>{item.title}</b>
                    <span className="rank-pill mono" style={{ fontSize: "10px", padding: "1px 5px" }}>{item.category}</span>
                  </div>
                  <p>{item.goal}</p>
                </div>
                <span className="review-stage">{isDue ? "Due today" : `In ${daysAway}d`}</span>
                <ChevronRight size={15} />
              </button>
            );
          })}
          {filteredPositions.length === 0 && (
            <div className="empty-history" style={{ padding: "32px", textAlign: "center" }}>
              <span className="surface-label">NO POSITIONS IN FILTER</span>
              <p>Try switching to "All Cards" or finish more games to populate reviewable blunders.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )}

      {sessionPositions !== null && (
        <ReviewSession
          positions={sessionPositions.list}
          initialIndex={sessionPositions.initialIndex}
          onComplete={onComplete}
          onClose={() => setSessionPositions(null)}
        />
      )}
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
  const [orientation, setOrientation] = useState<Orientation>("w");
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

      const playedUci = move.from + move.to;
      const isExpected = playedUci === puzzle.expected || (playedUci + (move.promotion ?? "")) === puzzle.expected;
      const isMatingMove = next.isCheckmate();
      const isCorrect = isExpected || isMatingMove;

      if (isCorrect) {
        playCue("success");
        setResult("correct");
        onComplete(puzzle, true);
      } else {
        playCue("error");
        setResult("wrong");
        onComplete(puzzle, false);
      }
      return;
    }
    const piece = game.get(square);
    setSelected(piece?.color === game.turn() ? square : null);
  }

  function nextCard() {
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
          <div>
            <span className="eyebrow">REVIEW {index + 1} / {positions.length}</span>
            <h2>{puzzle.title}</h2>
            <p>{puzzle.goal}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button className="icon-button" onClick={() => setOrientation(v => v === "w" ? "b" : "w")} title="Flip board">
              <ArrowLeftRight size={16} />
            </button>
            <button className="icon-button" onClick={onClose} title="Close review">
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="session-grid">
          <div className="board-wrap">
            <ChessBoard game={game} orientation={orientation} selected={selected} targets={targets} lastMove={null} onSquare={choose} />
          </div>
          <div className="session-coach">
            <div className={result === "correct" ? "coach-card solved" : result === "wrong" ? "coach-card warning" : "coach-card"}>
              <span className="surface-label">{result === "correct" ? "CORRECT" : result === "wrong" ? "NOT YET" : "ACTIVE RECALL"}</span>
              <h3>{result === "correct" ? "The key move is reinforced!" : result === "wrong" ? "Reset and look again." : "Can you find the winning move?"}</h3>
              <p>{result === "correct" ? puzzle.success : result === "wrong" ? "The move missed the objective. This position has been rescheduled for tomorrow." : "Use the board first. The reveal hint is there to support recall, not replace it."}</p>
            </div>
            {!revealed && result === "idle" && (
              <button className="secondary-button full" onClick={() => setRevealed(true)}>
                <Lightbulb size={16} /> Reveal hint
              </button>
            )}
            {revealed && result === "idle" && (
              <div className="revealed-answer">
                <span className="surface-label">HINT</span>
                <b>{puzzle.hint}</b>
                <small>Target move: {puzzle.expected.slice(0, 2)} → {puzzle.expected.slice(2)}</small>
              </div>
            )}
            {result === "wrong" && (
              <div className="coach-actions" style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <button className="secondary-button full" onClick={resetSession}><RotateCcw size={16} /> Retry position</button>
                <button className="ghost-button full" onClick={nextCard}><ChevronRight size={16} /> Continue to next</button>
              </div>
            )}
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
