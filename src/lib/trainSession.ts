import { Chess } from "chess.js";
import {
  CuratedPuzzle,
  Lesson,
  LessonStep,
  courses,
  curatedPuzzles,
  getLessonById,
  getPuzzleById,
  lessons
} from "../data/courses";
import { TutorGameMistake, TutorReviewItem } from "./storage";
import { isUciLegalInFen } from "./chessUtils";

export type SessionSource =
  | { kind: "lesson"; lessonId: string; courseId: string }
  | { kind: "review_due" }
  | { kind: "theme"; category: string; title: string }
  | { kind: "mistakes" }
  | { kind: "daily" }
  | { kind: "custom_fen"; title: string; fen: string; goal: string };

export type SessionItem =
  | { id: string; kind: "explain"; step: Extract<LessonStep, { type: "explain" }> }
  | { id: string; kind: "demo"; step: Extract<LessonStep, { type: "demo" }> }
  | { id: "string" | string; kind: "try"; step: Extract<LessonStep, { type: "try" }> }
  | { id: string; kind: "puzzle"; puzzle: CuratedPuzzle }
  | { id: string; kind: "recap"; step: Extract<LessonStep, { type: "recap" }> };

export type SessionResultEntry = {
  itemId: string;
  title: string;
  category: string;
  correct: boolean;
  hintsUsed: number;
};

export type TrainSession = {
  id: string;
  title: string;
  subtitle: string;
  source: SessionSource;
  items: SessionItem[];
  index: number;
  results: SessionResultEntry[];
  completed: boolean;
};

export type TrainLaunchRequest =
  | { kind: "lesson"; lessonId: string }
  | { kind: "review_due" }
  | { kind: "theme"; category: string; puzzleIds?: string[] }
  | { kind: "mistake"; mistake: TutorGameMistake }
  | { kind: "daily"; puzzle?: CuratedPuzzle }
  | { kind: "custom_fen"; fen: string; title: string; goal?: string };

export function buildLessonSession(lessonId: string): TrainSession | null {
  const lesson: Lesson | undefined = getLessonById(lessonId);
  if (!lesson) return null;

  const items: SessionItem[] = [];
  lesson.steps.forEach((step, idx) => {
    if (step.type === "explain") {
      items.push({ id: `${lesson.id}:explain:${idx}`, kind: "explain", step });
    } else if (step.type === "demo") {
      items.push({ id: `${lesson.id}:demo:${idx}`, kind: "demo", step });
    } else if (step.type === "try") {
      items.push({ id: `${lesson.id}:try:${idx}`, kind: "try", step });
    } else if (step.type === "practice") {
      step.puzzleIds.forEach(pid => {
        const pz = getPuzzleById(pid);
        if (pz && isUciLegalInFen(pz.fen, pz.moves[0])) {
          items.push({ id: `${lesson.id}:puzzle:${pz.id}`, kind: "puzzle", puzzle: pz });
        }
      });
    } else if (step.type === "recap") {
      items.push({ id: `${lesson.id}:recap:${idx}`, kind: "recap", step });
    }
  });

  if (items.length === 0) return null;

  return {
    id: `session:${lesson.id}:${Date.now()}`,
    title: lesson.title,
    subtitle: `${lesson.unit} · ${lesson.level}`,
    source: { kind: "lesson", lessonId: lesson.id, courseId: lesson.courseId },
    items,
    index: 0,
    results: [],
    completed: false
  };
}

export function buildThemeSession(category: string, puzzleIds?: string[]): TrainSession {
  const pool = puzzleIds && puzzleIds.length > 0
    ? puzzleIds.map(getPuzzleById).filter((p): p is CuratedPuzzle => Boolean(p))
    : category === "All"
    ? curatedPuzzles.slice(0, 6)
    : curatedPuzzles.filter(p => p.category === category).slice(0, 6);

  const valid = (pool.length ? pool : curatedPuzzles.slice(0, 5)).filter(p => isUciLegalInFen(p.fen, p.moves[0]));

  return {
    id: `session:theme:${category}:${Date.now()}`,
    title: category === "All" ? "Mixed Tactical Practice" : `${category} Practice`,
    subtitle: `${valid.length} curated position${valid.length === 1 ? "" : "s"}`,
    source: { kind: "theme", category, title: `${category} Practice` },
    items: valid.map(puzzle => ({ id: `theme:${puzzle.id}`, kind: "puzzle", puzzle })),
    index: 0,
    results: [],
    completed: false
  };
}

export function buildDueReviewsSession(
  schedule: TutorReviewItem[],
  gameMistakes: TutorGameMistake[]
): TrainSession | null {
  const now = Date.now();
  const dueKeys = new Set(
    schedule.filter(item => new Date(item.dueAt).getTime() <= now).map(item => item.puzzleKey)
  );

  const items: SessionItem[] = [];

  // 1. Game mistakes that are due or unscheduled
  for (const m of gameMistakes) {
    const key = `mistake:${m.key}`;
    const sched = schedule.find(s => s.puzzleKey === key || s.puzzleKey === m.key);
    const isDue = !sched || new Date(sched.dueAt).getTime() <= now;
    if (isDue && isUciLegalInFen(m.fen, m.expected)) {
      items.push({
        id: key,
        kind: "puzzle",
        puzzle: {
          id: key,
          title: `Game Review · vs ${m.opponent} (Move ${m.moveNumber})`,
          theme: m.category,
          category: "Tactics",
          rating: 1100,
          fen: m.fen,
          moves: [m.expected],
          goal: m.goal,
          hints: [
            `Your move ${m.san} lost ~${Math.round(m.lossCp / 10) / 10} pawns.`,
            m.hint,
            `Look at moving from ${m.expected.slice(0, 2)} to ${m.expected.slice(2, 4)}.`
          ],
          success: m.success
        }
      });
    }
    if (items.length >= 8) break;
  }

  // 2. Curated puzzles that are due
  for (const pz of curatedPuzzles) {
    if (items.length >= 8) break;
    if ((dueKeys.has(pz.id) || dueKeys.has(pz.title)) && isUciLegalInFen(pz.fen, pz.moves[0])) {
      items.push({ id: `due:${pz.id}`, kind: "puzzle", puzzle: pz });
    }
  }

  if (items.length === 0) return null;

  return {
    id: `session:due:${Date.now()}`,
    title: "Due Spaced Reviews",
    subtitle: `${items.length} position${items.length === 1 ? "" : "s"} due for reinforcement`,
    source: { kind: "review_due" },
    items,
    index: 0,
    results: [],
    completed: false
  };
}

export function buildMistakeSession(mistake: TutorGameMistake): TrainSession | null {
  if (!isUciLegalInFen(mistake.fen, mistake.expected)) return null;
  const puzzle: CuratedPuzzle = {
    id: `mistake:${mistake.key}`,
    title: `Game Moment · vs ${mistake.opponent} (Move ${mistake.moveNumber})`,
    theme: mistake.category,
    category: "Tactics",
    rating: 1100,
    fen: mistake.fen,
    moves: [mistake.expected],
    goal: mistake.goal,
    hints: [
      `In the game you played ${mistake.san} (${mistake.severity}).`,
      mistake.hint,
      `Consider moving from ${mistake.expected.slice(0, 2)} to ${mistake.expected.slice(2, 4)}.`
    ],
    success: mistake.success
  };

  return {
    id: `session:mistake:${Date.now()}`,
    title: `Retry Move ${mistake.moveNumber} vs ${mistake.opponent}`,
    subtitle: `${mistake.severity} · ${mistake.category}`,
    source: { kind: "mistakes" },
    items: [{ id: puzzle.id, kind: "puzzle", puzzle }],
    index: 0,
    results: [],
    completed: false
  };
}

export function buildCustomPositionSession(fen: string, title: string, expectedUci: string, goal: string): TrainSession | null {
  try {
    new Chess(fen);
  } catch {
    return null;
  }

  const validSolution = isUciLegalInFen(fen, expectedUci);
  if (!validSolution) return null;

  const puzzle: CuratedPuzzle = {
    id: `custom:${Date.now()}`,
    title,
    theme: "Position Drill",
    category: "Openings",
    rating: 1200,
    fen,
    moves: [expectedUci],
    goal,
    hints: [
      "Evaluate king safety, central control, and loose enemy pieces.",
      "Look at active piece development or forcing checks/captures.",
      `Inspect the piece on ${expectedUci.slice(0, 2)}.`
    ],
    success: `Strong continuation! ${expectedUci.slice(0, 2)} → ${expectedUci.slice(2, 4)} follows top theory.`
  };

  return {
    id: `session:custom:${Date.now()}`,
    title,
    subtitle: "Opening & Engine Position Drill",
    source: { kind: "custom_fen", title, fen, goal },
    items: [{ id: puzzle.id, kind: "puzzle", puzzle }],
    index: 0,
    results: [],
    completed: false
  };
}

export function getNextLessonId(currentLessonId: string): string | null {
  const idx = lessons.findIndex(l => l.id === currentLessonId);
  if (idx === -1 || idx + 1 >= lessons.length) return null;
  return lessons[idx + 1].id;
}

export function getRecommendedLesson(completedLessons: string[], goal?: string): Lesson {
  const preferredCourse =
    goal === "tactics" ? "tactics" : goal === "openings" ? "openings" : goal === "endgames" ? "endgame" : "basics";
  const incompletePreferred = lessons.find(l => l.courseId === preferredCourse && !completedLessons.includes(l.id));
  if (incompletePreferred) return incompletePreferred;
  const firstIncomplete = lessons.find(l => !completedLessons.includes(l.id));
  return firstIncomplete ?? lessons[0];
}

export function getCourseProgress(courseId: string, completedLessons: string[]) {
  const courseLessons = lessons.filter(l => l.courseId === courseId);
  const done = courseLessons.filter(l => completedLessons.includes(l.id)).length;
  return {
    total: courseLessons.length,
    done,
    pct: courseLessons.length ? Math.round((done / courseLessons.length) * 100) : 0,
    course: courses.find(c => c.id === courseId)
  };
}
