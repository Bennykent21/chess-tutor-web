import { Chess } from "chess.js";
import { parseUci } from "../lib/chessUtils";

export type LessonCategoryId = "basics" | "openings" | "tactics" | "middlegame" | "endgames" | "blunders";
export type LessonDifficulty = "beginner" | "intermediate" | "advanced";

export interface LessonCategoryMeta {
  id: LessonCategoryId;
  title: string;
  subtitle: string;
  artDay: string;
  artNight: string;
}

export const LESSON_CATEGORIES: LessonCategoryMeta[] = [
  { id: "basics", title: "Basics", subtitle: "How pieces move, check and mate", artDay: "/assets/art/art_basics_day.webp", artNight: "/assets/art/art_basics_night.webp" },
  { id: "openings", title: "Openings", subtitle: "Start every game well", artDay: "/assets/art/art_openings_day.webp", artNight: "/assets/art/art_openings_night.webp" },
  { id: "tactics", title: "Tactics", subtitle: "Forks, pins and combinations", artDay: "/assets/art/art_tactics_day.webp", artNight: "/assets/art/art_tactics_night.webp" },
  { id: "middlegame", title: "Middlegame", subtitle: "Plans and piece activity", artDay: "/assets/art/art_middlegame_day.webp", artNight: "/assets/art/art_middlegame_night.webp" },
  { id: "endgames", title: "Endgames", subtitle: "Turn advantages into wins", artDay: "/assets/art/art_endgames_day.webp", artNight: "/assets/art/art_endgames_night.webp" },
  { id: "blunders", title: "Blunders", subtitle: "Spot the traps before they spring", artDay: "/assets/art/art_blunders_day.webp", artNight: "/assets/art/art_blunders_night.webp" }
];

export interface LessonArrow {
  from: string;
  to: string;
  kind: "best" | "idea" | "bad" | "hint";
}

export interface LessonHighlight {
  square: string;
  kind: "good" | "bad" | "idea";
}

export interface LessonStep {
  type: "explain" | "play" | "quiz";
  text: string;
  fen?: string;
  move?: string;
  line?: string[];
  expect?: string[];
  hint?: string;
  ifWrong?: string;
  ifRight?: string;
  feedback?: Record<string, string>;
  arrows?: LessonArrow[];
  highlights?: LessonHighlight[];
  rule?: boolean;
}

export interface LessonItem {
  id: string;
  title: string;
  summary: string;
  steps: LessonStep[];
}

export interface LessonCourse {
  id: string;
  category: LessonCategoryId;
  title: string;
  intro: string;
  level: LessonDifficulty;
  order: number;
  side?: "white" | "black";
  battleLine?: string;
  puzzleThemes?: string[];
  lessons: LessonItem[];
}

export interface LessonProgressRecord {
  lessonId: string;
  stepIndex: number;
  completed: boolean;
  completedAt?: number;
}

function parseArrowToken(raw: string): LessonArrow | null {
  const [uci, tag] = raw.split(":");
  if (!uci || uci.length < 4) return null;
  const kind = tag === "idea" ? "idea" : tag === "bad" ? "bad" : tag === "hint" ? "hint" : "best";
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), kind };
}

function parseHighlightToken(raw: string): LessonHighlight | null {
  const [sq, tag] = raw.split(":");
  if (!sq || sq.length !== 2) return null;
  const kind = tag === "bad" ? "bad" : tag === "good" ? "good" : "idea";
  return { square: sq, kind };
}

function normalizeStep(raw: any): LessonStep {
  return {
    type: raw.type === "play" || raw.type === "quiz" ? raw.type : "explain",
    text: String(raw.text ?? ""),
    fen: typeof raw.fen === "string" ? raw.fen : undefined,
    move: typeof raw.move === "string" ? raw.move.toLowerCase() : undefined,
    line: Array.isArray(raw.line) ? raw.line.map((m: string) => m.toLowerCase()) : undefined,
    expect: Array.isArray(raw.expect) ? raw.expect.map((m: string) => m.toLowerCase()) : undefined,
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
    ifWrong: typeof raw.ifWrong === "string" ? raw.ifWrong : undefined,
    ifRight: typeof raw.ifRight === "string" ? raw.ifRight : undefined,
    feedback: raw.feedback && typeof raw.feedback === "object" ? raw.feedback : undefined,
    arrows: Array.isArray(raw.arrows) ? raw.arrows.map(parseArrowToken).filter(Boolean) as LessonArrow[] : undefined,
    highlights: Array.isArray(raw.highlights) ? raw.highlights.map(parseHighlightToken).filter(Boolean) as LessonHighlight[] : undefined,
    rule: Boolean(raw.rule)
  };
}

export function parseCourseJson(raw: any): LessonCourse | null {
  if (!raw || typeof raw !== "object" || !raw.id || !Array.isArray(raw.lessons)) return null;
  return {
    id: String(raw.id),
    category: raw.category as LessonCategoryId,
    title: String(raw.title ?? ""),
    intro: String(raw.intro ?? ""),
    level: (raw.level === "intermediate" || raw.level === "advanced" ? raw.level : "beginner") as LessonDifficulty,
    order: Number(raw.order ?? 100),
    side: raw.side === "white" || raw.side === "black" ? raw.side : undefined,
    battleLine: typeof raw.battleLine === "string" ? raw.battleLine : undefined,
    puzzleThemes: Array.isArray(raw.puzzleThemes) ? raw.puzzleThemes : undefined,
    lessons: raw.lessons.map((l: any) => ({
      id: String(l.id),
      title: String(l.title ?? ""),
      summary: String(l.summary ?? ""),
      steps: Array.isArray(l.steps) ? l.steps.map(normalizeStep) : []
    }))
  };
}

let cachedCoursesPromise: Promise<LessonCourse[]> | null = null;

export async function loadLessonLibrary(): Promise<LessonCourse[]> {
  if (!cachedCoursesPromise) {
    cachedCoursesPromise = fetch("/data/lessons/index.json")
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const files = (await res.json()) as string[];
        const courses = await Promise.all(
          files.map(file =>
            fetch(`/data/lessons/${file}`)
              .then(r => (r.ok ? r.json() : null))
              .then(parseCourseJson)
              .catch(() => null)
          )
        );
        return courses
          .filter((c): c is LessonCourse => c !== null)
          .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
      })
      .catch(() => []);
  }
  return cachedCoursesPromise;
}

export function firstFenOfCourse(course: LessonCourse): string | undefined {
  for (const l of course.lessons) {
    for (const s of l.steps) {
      if (s.fen) return s.fen;
    }
  }
  return undefined;
}

export function continueLessonFromLibrary(
  courses: LessonCourse[],
  progress: Record<string, LessonProgressRecord>
): { course: LessonCourse; lesson: LessonItem; number: number; total: number; started: boolean } | null {
  for (const course of courses) {
    for (let i = 0; i < course.lessons.length; i++) {
      const lesson = course.lessons[i];
      const rec = progress[lesson.id];
      if (rec && !rec.completed && rec.stepIndex > 0) {
        return { course, lesson, number: i + 1, total: course.lessons.length, started: true };
      }
    }
  }
  for (const course of courses) {
    for (let i = 0; i < course.lessons.length; i++) {
      const lesson = course.lessons[i];
      if (!progress[lesson.id]?.completed) {
        return { course, lesson, number: i + 1, total: course.lessons.length, started: false };
      }
    }
  }
  return null;
}

export interface StepBoardState {
  fen: string;
  lastMove: string | null;
  playerColor: "w" | "b";
  arrows: LessonArrow[];
  highlights: LessonHighlight[];
  lineProgress: number;
  lineTotal: number;
  solvedStep: boolean;
}

export function computeStepInitialState(
  lesson: LessonItem,
  stepIndex: number,
  prevFen?: string,
  preferredSide?: "w" | "b"
): StepBoardState {
  const step = lesson.steps[stepIndex];
  const baseFen = step?.fen ?? prevFen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const chess = new Chess(baseFen);
  let lastMove: string | null = null;
  const sideToMove = chess.turn();
  const playerColor = preferredSide ?? sideToMove;

  if (step?.type === "explain" && step.move) {
    const parsed = parseUci(step.move);
    if (parsed) {
      try {
        chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
        lastMove = step.move;
      } catch {
        // ignore invalid demo move
      }
    }
  }

  return {
    fen: chess.fen(),
    lastMove,
    playerColor,
    arrows: step?.arrows ?? [],
    highlights: step?.highlights ?? [],
    lineProgress: 0,
    lineTotal: step?.line?.length ?? 0,
    solvedStep: step?.type === "explain"
  };
}
