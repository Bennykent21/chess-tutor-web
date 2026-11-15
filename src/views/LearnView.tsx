import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Swords,
  Video
} from "lucide-react";
import {
  LESSON_CATEGORIES,
  LessonCategoryId,
  LessonCourse,
  LessonDifficulty,
  LessonItem,
  LessonProgressRecord,
  computeStepInitialState,
  continueLessonFromLibrary
} from "../domain/lessons";
import { playCue, triggerHaptic } from "../lib/audio";
import { parseUci, uciToSan } from "../lib/chessUtils";
import { AppSettings } from "../lib/storage";
import { BoardArrow, BoardHighlight, BoardHost } from "../components/BoardHost";
import { CoachBubble } from "../components/CoachBubble";
import { ArtTile, PlayMark, ScreenTitle, SectionHeader } from "../components/ct";

export type LearnSubRoute =
  | { view: "hub" }
  | { view: "category"; categoryId: LessonCategoryId }
  | { view: "course"; course: LessonCourse }
  | { view: "lesson"; course: LessonCourse; lessonId: string };

export function LearnView({
  route,
  setRoute,
  settings,
  isDarkAppearance,
  courses,
  lessonProgress,
  onUpdateLessonProgress,
  onAwardXp,
  onOpenBattle,
  onOpenRelatedPuzzles
}: {
  route: LearnSubRoute;
  setRoute: (r: LearnSubRoute) => void;
  settings: AppSettings;
  isDarkAppearance: boolean;
  courses: LessonCourse[];
  lessonProgress: Record<string, LessonProgressRecord>;
  onUpdateLessonProgress: (lessonId: string, stepIndex: number, completed: boolean) => void;
  onAwardXp: (xp: number) => void;
  onOpenBattle: (openingName: string) => void;
  onOpenRelatedPuzzles: (themes: string[], title: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<"all" | LessonDifficulty>("all");
  const [sideFilter, setSideFilter] = useState<"all" | "white" | "black">("all");

  const { totalLessons, completedLessons } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const c of courses) {
      for (const l of c.lessons) {
        total++;
        if (lessonProgress[l.id]?.completed) done++;
      }
    }
    return { totalLessons: total, completedLessons: done };
  }, [courses, lessonProgress]);

  const continueInfo = useMemo(
    () => continueLessonFromLibrary(courses, lessonProgress),
    [courses, lessonProgress]
  );

  if (route.view === "lesson") {
    const lessonIndex = route.course.lessons.findIndex(l => l.id === route.lessonId);
    const lesson = route.course.lessons[lessonIndex] ?? route.course.lessons[0];
    if (!lesson) {
      return (
        <div className="ct-page">
          <button type="button" className="ct-icon-btn" onClick={() => setRoute({ view: "course", course: route.course })}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <p className="ct-muted">Lesson not found.</p>
        </div>
      );
    }
    const nextLesson = route.course.lessons[lessonIndex + 1] ?? null;

    return (
      <LessonPlayer
        course={route.course}
        lesson={lesson}
        nextLesson={nextLesson}
        initialRecord={lessonProgress[lesson.id]}
        settings={settings}
        onBack={() => setRoute({ view: "course", course: route.course })}
        onProgress={(stepIdx, done) => onUpdateLessonProgress(lesson.id, stepIdx, done)}
        onAwardXp={onAwardXp}
        onOpenLesson={nextId => setRoute({ view: "lesson", course: route.course, lessonId: nextId })}
        onOpenRelatedPuzzles={onOpenRelatedPuzzles}
      />
    );
  }

  if (route.view === "course") {
    const course = route.course;
    const catMeta = LESSON_CATEGORIES.find(c => c.id === course.category);
    const courseDone = course.lessons.filter(l => lessonProgress[l.id]?.completed).length;

    return (
      <div className="ct-page">
        <div className="ct-subpage-bar">
          <button
            type="button"
            className="ct-icon-btn"
            onClick={() => setRoute({ view: "category", categoryId: course.category })}
          >
            <ArrowLeft size={18} /> <span>{catMeta?.title ?? "Back"}</span>
          </button>
          <h1>{course.title}</h1>
        </div>

        <div className="ct-setup-card">
          <div className="ct-course-hero-row">
            <div className="ct-course-hero-copy">
              <div className="ct-badge-row">
                <span className="ct-pill-tag">{course.level}</span>
                {course.side && <span className="ct-pill-tag">As {course.side}</span>}
                <span className="ct-pill-tag mono-num">
                  {courseDone}/{course.lessons.length} complete
                </span>
              </div>
              <p className="ct-muted">{course.intro}</p>
            </div>
          </div>

          <div className="ct-progress-track">
            <div
              className="ct-progress-fill"
              style={{ width: `${course.lessons.length ? Math.round((courseDone / course.lessons.length) * 100) : 0}%` }}
            />
          </div>

          {(course.battleLine || (course.puzzleThemes && course.puzzleThemes.length > 0)) && (
            <div className="ct-btn-row">
              {course.battleLine && (
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  onClick={() => onOpenBattle(course.battleLine!)}
                >
                  <Swords size={16} /> Practise in Opening Battle
                </button>
              )}
              {course.puzzleThemes && course.puzzleThemes.length > 0 && (
                <button
                  type="button"
                  className="ct-btn ct-btn-secondary"
                  onClick={() => onOpenRelatedPuzzles(course.puzzleThemes!, `${course.title} puzzles`)}
                >
                  <Sparkles size={16} /> Related Puzzles
                </button>
              )}
            </div>
          )}
        </div>

        <section className="ct-section">
          <h2>Lessons</h2>
          <div className="ct-lesson-list">
            {course.lessons.map((lesson, idx) => {
              const rec = lessonProgress[lesson.id];
              const isDone = Boolean(rec?.completed);
              const isStarted = !isDone && Boolean(rec && rec.stepIndex > 0);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className={`ct-lesson-row ${isDone ? "is-done" : ""}`}
                  onClick={() => setRoute({ view: "lesson", course, lessonId: lesson.id })}
                >
                  <div className={`ct-lesson-num ${isDone ? "is-done" : ""}`}>
                    {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <div className="ct-lesson-row-body">
                    <div className="ct-lesson-row-top">
                      <strong>{lesson.title}</strong>
                      <span className={`ct-status-pill ${isDone ? "is-done" : isStarted ? "is-started" : ""}`}>
                        {isDone ? "DONE" : isStarted ? `STEP ${(rec?.stepIndex ?? 0) + 1}` : "NEW"}
                      </span>
                    </div>
                    <small className="ct-muted">
                      {lesson.summary} · {lesson.steps.length} steps
                    </small>
                  </div>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  if (route.view === "category") {
    const meta = LESSON_CATEGORIES.find(c => c.id === route.categoryId) ?? LESSON_CATEGORIES[0];
    const catCourses = courses.filter(c => {
      if (c.category !== route.categoryId) return false;
      if (diffFilter !== "all" && c.level !== diffFilter) return false;
      if (route.categoryId === "openings" && sideFilter !== "all" && c.side && c.side !== sideFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return c.title.toLowerCase().includes(q) || c.intro.toLowerCase().includes(q);
      }
      return true;
    });

    return (
      <div className="ct-page">
        <div className="ct-subpage-bar">
          <button type="button" className="ct-icon-btn" onClick={() => setRoute({ view: "hub" })}>
            <ArrowLeft size={18} /> <span>Learn</span>
          </button>
          <h1>{meta.title}</h1>
        </div>

        <div className="ct-filter-toolbar">
          <div className="ct-search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder={`Search ${meta.title.toLowerCase()} courses…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="ct-chip-wrap">
            {(["all", "beginner", "intermediate", "advanced"] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                className={`ct-chip-btn ${diffFilter === lvl ? "is-active" : ""}`}
                onClick={() => setDiffFilter(lvl)}
              >
                {lvl === "all" ? "All levels" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
            {route.categoryId === "openings" &&
              (["all", "white", "black"] as const).map(sd => (
                <button
                  key={sd}
                  type="button"
                  className={`ct-chip-btn ${sideFilter === sd ? "is-active" : ""}`}
                  onClick={() => setSideFilter(sd)}
                >
                  {sd === "all" ? "Both sides" : `As ${sd}`}
                </button>
              ))}
          </div>
        </div>

        <div className="ct-course-grid">
          {catCourses.length === 0 ? (
            <div className="ct-card">
              <p className="ct-muted">No courses match your filters.</p>
            </div>
          ) : (
            catCourses.map(course => {
              const done = course.lessons.filter(l => lessonProgress[l.id]?.completed).length;
              const pct = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
              return (
                <button
                  key={course.id}
                  type="button"
                  className="ct-course-card"
                  onClick={() => setRoute({ view: "course", course })}
                >
                  <div className="ct-course-card-head">
                    <span className="ct-pill-tag">{course.level}</span>
                    {course.side && <span className="ct-pill-tag">{course.side}</span>}
                    <span className="mono-num ct-muted">
                      {done}/{course.lessons.length}
                    </span>
                  </div>
                  <strong>{course.title}</strong>
                  <p className="ct-muted">{course.intro}</p>
                  <div className="ct-progress-track">
                    <div className="ct-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Learn hub (the app's LearnScreen): how far you are, the lesson to continue, the topics.
  const openCategory = (id: LessonCategoryId) => {
    setSearch("");
    setDiffFilter("all");
    setSideFilter("all");
    setRoute({ view: "category", categoryId: id });
  };
  const continueCourseDone = continueInfo
    ? continueInfo.course.lessons.filter(l => lessonProgress[l.id]?.completed).length
    : 0;

  return (
    <div className="ct2-page" style={{ gap: 0 }}>
      <ScreenTitle title="Learn" />
      <p className="ct2-caption ct2-gutter">
        {completedLessons} of {totalLessons} lessons
      </p>
      <div className="ct2-gutter">
        {continueInfo ? (
          <div className="ct2-enter" style={{ marginTop: 16 }}>
            <ArtTile
              dark={isDarkAppearance}
              scene={continueInfo.course.category}
              className="ct2-hero"
              kicker={continueInfo.course.title}
              title={continueInfo.lesson.title}
              big
              subtitle={`Lesson ${continueInfo.number} of ${continueInfo.total}`}
              progress={continueCourseDone / Math.max(1, continueInfo.course.lessons.length)}
              lift={0.3}
              ariaLabel={`${continueInfo.started ? "Continue" : "Start"} ${continueInfo.lesson.title}`}
              onClick={() => setRoute({ view: "lesson", course: continueInfo.course, lessonId: continueInfo.lesson.id })}
              trailing={<PlayMark onArt />}
            />
          </div>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <SectionHeader title="Topics" />
        </div>
        <div className="ct2-topic-grid ct2-enter" style={{ animationDelay: "60ms" }}>
          {LESSON_CATEGORIES.map(cat => {
            let catTotal = 0;
            let catDone = 0;
            for (const c of courses) {
              if (c.category !== cat.id) continue;
              for (const l of c.lessons) {
                catTotal++;
                if (lessonProgress[l.id]?.completed) catDone++;
              }
            }
            const available = catTotal > 0;
            return (
              <ArtTile
                key={cat.id}
                dark={isDarkAppearance}
                scene={cat.id}
                title={cat.title}
                subtitle={available ? `${catDone} of ${catTotal}` : "Lessons on the way"}
                progress={available ? catDone / catTotal : undefined}
                ariaLabel={`Open ${cat.title}`}
                onClick={available ? () => openCategory(cat.id) : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Interactive Lesson Player
   ========================================================================== */

function LessonPlayer({
  course,
  lesson,
  nextLesson,
  initialRecord,
  settings,
  onBack,
  onProgress,
  onAwardXp,
  onOpenLesson,
  onOpenRelatedPuzzles
}: {
  course: LessonCourse;
  lesson: LessonItem;
  nextLesson: LessonItem | null;
  initialRecord?: LessonProgressRecord;
  settings: AppSettings;
  onBack: () => void;
  onProgress: (stepIndex: number, completed: boolean) => void;
  onAwardXp: (xp: number) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenRelatedPuzzles: (themes: string[], title: string) => void;
}) {
  const startStep =
    initialRecord && !initialRecord.completed && initialRecord.stepIndex < lesson.steps.length
      ? initialRecord.stepIndex
      : 0;

  const [stepIdx, setStepIdx] = useState(startStep);
  const step = lesson.steps[stepIdx] ?? lesson.steps[0];
  const preferredSide: "w" | "b" | undefined =
    course.side === "white" ? "w" : course.side === "black" ? "b" : undefined;

  const initState = useMemo(
    () => computeStepInitialState(lesson, stepIdx, undefined, preferredSide),
    [lesson, stepIdx, preferredSide]
  );

  const [fen, setFen] = useState(initState.fen);
  const [lastMove, setLastMove] = useState<string | null>(initState.lastMove);
  const [orientation, setOrientation] = useState<"w" | "b">(initState.playerColor);
  const [lineProgress, setLineProgress] = useState(0);
  const [solvedStep, setSolvedStep] = useState(initState.solvedStep);
  const [coachText, setCoachText] = useState(step?.text ?? "");
  const [coachMood, setCoachMood] = useState<"ready" | "thinking" | "kind" | "proud">("ready");
  const [coachTone, setCoachTone] = useState<"default" | "success" | "warning">("default");
  const [hintShown, setHintShown] = useState(false);
  const [mistakeSquare, setMistakeSquare] = useState<string | null>(null);
  const [lessonFinished, setLessonFinished] = useState(false);
  const xpAwardedRef = useRef(Boolean(initialRecord?.completed));
  const replyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const loadStep = (targetIdx: number, carryFen?: string) => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    const targetStep = lesson.steps[targetIdx];
    const nextInit = computeStepInitialState(lesson, targetIdx, carryFen, preferredSide);
    setStepIdx(targetIdx);
    setFen(nextInit.fen);
    setLastMove(nextInit.lastMove);
    setOrientation(nextInit.playerColor);
    setLineProgress(0);
    setSolvedStep(nextInit.solvedStep);
    setCoachText(targetStep?.text ?? "");
    setCoachMood("ready");
    setCoachTone("default");
    setHintShown(false);
    setMistakeSquare(null);
    onProgress(targetIdx, false);
  };

  useEffect(() => {
    xpAwardedRef.current = Boolean(initialRecord?.completed);
    setLessonFinished(false);
    loadStep(startStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const finishLesson = () => {
    setLessonFinished(true);
    onProgress(lesson.steps.length - 1, true);
    if (!xpAwardedRef.current) {
      xpAwardedRef.current = true;
      onAwardXp(15);
    }
    playCue("win", settings.soundEnabled);
    setCoachMood("proud");
    setCoachTone("success");
    setCoachText("Lesson complete! Ready for the next challenge.");
  };

  const handleMove = (uci: string) => {
    if (!step || solvedStep || lessonFinished) return;
    if (step.type === "explain") return;

    const clean = uci.toLowerCase();
    const expectedLine = step.line ?? [];
    const expectedSet = step.expect ?? (expectedLine.length ? [expectedLine[lineProgress]] : []);

    const chess = new Chess(fen);
    const parsed = parseUci(clean);
    if (!parsed) return;

    // Check custom quiz feedback or correctness
    const isLineStep = expectedLine.length > 0 && !step.expect;
    const isCorrect = isLineStep
      ? clean === expectedLine[lineProgress]
      : expectedSet.includes(clean) ||
        (() => {
          // Also accept direct checkmate if it's a checkmate exercise
          try {
            const trial = new Chess(fen);
            trial.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
            return trial.isCheckmate();
          } catch {
            return false;
          }
        })();

    if (!isCorrect) {
      playCue("wrong", settings.soundEnabled);
      triggerHaptic("wrong", settings.hapticsEnabled);
      setMistakeSquare(parsed.to);
      setTimeout(() => setMistakeSquare(null), 500);
      setCoachMood("kind");
      setCoachTone("warning");
      const customFeedback = step.feedback?.[clean];
      setCoachText(
        customFeedback ??
          step.ifWrong ??
          `Not ${uciToSan(fen, clean)}. Look at the board cues or tap Hint.`
      );
      return;
    }

    // Play the correct move
    const moved = chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
    if (!moved) return;

    const afterFen = chess.fen();
    setFen(afterFen);
    setLastMove(clean);
    playCue(chess.inCheck() ? "check" : moved.captured ? "capture" : "move", settings.soundEnabled);

    if (isLineStep) {
      const nextProgress = lineProgress + 1;
      if (nextProgress >= expectedLine.length) {
        setSolvedStep(true);
        setCoachMood("proud");
        setCoachTone("success");
        setCoachText(step.ifRight ?? "Well played! You completed the sequence.");
        playCue("correct", settings.soundEnabled);
      } else {
        setLineProgress(nextProgress);
        setCoachMood("thinking");
        setCoachTone("default");
        setCoachText("Good move — watch the reply…");
        const replyUci = expectedLine[nextProgress];
        replyTimerRef.current = window.setTimeout(() => {
          const replyParsed = parseUci(replyUci);
          const replyChess = new Chess(afterFen);
          if (replyParsed) {
            const rm = replyChess.move({
              from: replyParsed.from,
              to: replyParsed.to,
              promotion: replyParsed.promotion ?? "q"
            });
            if (rm) {
              setFen(replyChess.fen());
              setLastMove(replyUci);
              playCue(replyChess.inCheck() ? "check" : rm.captured ? "capture" : "move", settings.soundEnabled);
            }
          }
          const afterReplyIdx = nextProgress + 1;
          setLineProgress(afterReplyIdx);
          if (afterReplyIdx >= expectedLine.length) {
            setSolvedStep(true);
            setCoachMood("proud");
            setCoachTone("success");
            setCoachText(step.ifRight ?? "Well played! You completed the sequence.");
            playCue("correct", settings.soundEnabled);
          } else {
            setCoachMood("ready");
            setCoachText("Your turn — keep the line going.");
          }
        }, 380);
      }
      return;
    }

    // Single move play or quiz step
    setSolvedStep(true);
    setCoachMood("proud");
    setCoachTone("success");
    const rightText = step.feedback?.[clean] ?? step.ifRight ?? "Spot on!";
    setCoachText(rightText);
    playCue("correct", settings.soundEnabled);
  };

  const hintArrow: BoardArrow | null = useMemo(() => {
    if (!hintShown || !step || solvedStep) return null;
    const expected = step.line?.[lineProgress] ?? step.expect?.[0];
    if (!expected || expected.length < 4) return null;
    return { from: expected.slice(0, 2), to: expected.slice(2, 4), kind: "hint" };
  }, [hintShown, step, solvedStep, lineProgress]);

  const stepArrows: BoardArrow[] = [
    ...(step?.arrows ?? []).map(a => ({ from: a.from, to: a.to, kind: a.kind })),
    ...(hintArrow ? [hintArrow] : [])
  ];
  const stepHighlights: BoardHighlight[] = (step?.highlights ?? []).map(h => ({
    square: h.square,
    kind: h.kind
  }));

  const isLastStep = stepIdx >= lesson.steps.length - 1;
  const pct = lesson.steps.length ? Math.round(((stepIdx + (solvedStep ? 1 : 0)) / lesson.steps.length) * 100) : 100;

  return (
    <div className="ct-focus-shell">
      <header className="ct-focus-topbar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Course</span>
        </button>
        <div className="ct-focus-title">
          <strong>{lesson.title}</strong>
          <small className="mono-num">
            {course.title} · Step {stepIdx + 1} of {lesson.steps.length}
          </small>
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
        </div>
      </header>

      <div className="ct-board-workspace">
        <div className="ct-board-column">
          <BoardHost
            fen={fen}
            orientation={orientation}
            interactive={!solvedStep && step?.type !== "explain" && !lessonFinished}
            boardColorsId={settings.boardThemeId}
            pieceSetId={settings.pieceSetId}
            showCoordinates={settings.showCoordinates}
            showLegalDots={settings.showLegalDots}
            autoQueen={settings.autoQueen}
            reduceMotion={settings.reduceMotion}
            lastMove={lastMove}
            arrows={stepArrows}
            highlights={stepHighlights}
            mistakeFlashSquare={mistakeSquare}
            onMove={handleMove}
          />
        </div>

        <aside className="ct-side-panel">
          <div className="ct-progress-track">
            <div className="ct-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <CoachBubble
            mascotId={settings.mascotId}
            mood={coachMood}
            tone={coachTone}
            sideLabel={step?.type === "quiz" ? "Challenge" : step?.type === "play" ? "Your Turn" : "Coach"}
            message={coachText}
          >
            {hintShown && step?.hint && <p className="ct-hint-box">{step.hint}</p>}
          </CoachBubble>

          {/* Optional video walkthrough slot (D8 placeholder until hosted videos exist) */}
          {stepIdx === 0 && (
            <div className="ct-card ct-video-slot">
              <Video size={16} className="ct-muted" />
              <small className="ct-muted">Interactive walkthrough ready · Offline lesson</small>
            </div>
          )}

          {lessonFinished && (
            <div className="ct-card ct-result-banner is-win">
              <div className="ct-badge-row">
                <Award size={18} className="ct-accent-text" />
                <strong>+15 XP Earned</strong>
              </div>
              <p className="ct-muted">Great work finishing &ldquo;{lesson.title}&rdquo;.</p>
              <div className="ct-btn-row">
                {nextLesson ? (
                  <button
                    type="button"
                    className="ct-btn ct-btn-primary"
                    onClick={() => onOpenLesson(nextLesson.id)}
                  >
                    <Play size={16} /> Next: {nextLesson.title}
                  </button>
                ) : (
                  <button type="button" className="ct-btn ct-btn-primary" onClick={onBack}>
                    Back to Course
                  </button>
                )}
                {course.puzzleThemes && course.puzzleThemes.length > 0 && (
                  <button
                    type="button"
                    className="ct-btn ct-btn-secondary"
                    onClick={() => onOpenRelatedPuzzles(course.puzzleThemes!, `${course.title} puzzles`)}
                  >
                    <Sparkles size={16} /> Practise Puzzles
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="ct-thumb-bar">
            <button
              type="button"
              className="ct-btn ct-btn-ghost"
              disabled={stepIdx === 0}
              onClick={() => loadStep(Math.max(0, stepIdx - 1))}
            >
              <ArrowLeft size={16} /> Prev
            </button>

            {!solvedStep && step?.type !== "explain" && (
              <>
                <button
                  type="button"
                  className="ct-btn ct-btn-secondary"
                  onClick={() => setHintShown(true)}
                >
                  <Lightbulb size={16} /> Hint
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn-ghost"
                  onClick={() => loadStep(stepIdx)}
                >
                  <RotateCcw size={16} /> Reset
                </button>
              </>
            )}

            {solvedStep && !lessonFinished && (
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={() => {
                  if (isLastStep) finishLesson();
                  else loadStep(stepIdx + 1, fen);
                }}
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 size={16} /> Finish Lesson
                  </>
                ) : (
                  <>
                    Continue <ChevronRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
