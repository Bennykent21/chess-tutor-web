/**
 * The opening trainer's repertoires (ported from the Android app's domain/repertoire package):
 * the book of positions, the cards the learner recalls on a spaced schedule, the learn planner,
 * the learn and review runs, the opening's variations and how ready the learner is.
 *
 * Pure (no React, no storage) so it is unit tested; the Train screens save what the runs return.
 */
import { Chess } from "chess.js";

export type Side = "w" | "b";
/** Core, Standard, Deep: a level opens only when the one before it is mastered. */
export type RepertoireLevel = 0 | 1 | 2;
export const LEVEL_NAMES = ["Core", "Standard", "Deep"] as const;

export type MoveVerdict = "sound" | "inaccuracy" | "mistake" | "blunder";
export type NoteKind = "branch" | "plan" | "trap";

export interface RepertoireNote {
  kind: NoteKind;
  text: string;
}

export interface RatingBand {
  id: string;
  chessComFrom: number;
  chessComTo: number | null;
}

export interface RepertoireReply {
  uci: string;
  games: number[];
  share: number;
  bandShares: (number | null)[];
  dataBacked: boolean;
  verdict: MoveVerdict | null;
  loss: number | null;
  punish: boolean;
  level: RepertoireLevel;
}

export interface Pitfall {
  uci: string;
  share: number;
  verdict: MoveVerdict;
  loss: number;
}

export interface RepertoireNode {
  key: string;
  ply: number;
  own: boolean;
  games: number[];
  dataBacked: boolean;
  level: RepertoireLevel;
  reach: number;
  evalCp: number | null;
  mate: number | null;
  move: string | null;
  also: string[];
  moveShare: number | null;
  pitfall: Pitfall | null;
  replies: RepertoireReply[];
  note: RepertoireNote | null;
  name: string | null;
}

export interface RepertoireBook {
  id: string;
  title: string;
  side: Side;
  start: string[];
  bands: RatingBand[];
  nodes: Map<string, RepertoireNode>;
}

export function shareFor(reply: RepertoireReply, band: number | null): number {
  if (band === null) return reply.share;
  return reply.bandShares[band] ?? reply.share;
}

/* Positions ---------------------------------------------------------------- */

/**
 * The app's repetition key: board, side, castling, and the en-passant square only when a
 * legal en-passant capture exists. Matches the keys written by the book builder.
 */
export function positionKey(chess: Chess): string {
  const [board, turn, castling, ep] = chess.fen().split(" ");
  let effectiveEp = "-";
  if (ep && ep !== "-" && chess.moves({ verbose: true }).some(m => m.isEnPassant())) effectiveEp = ep;
  return `${board} ${turn} ${castling} ${effectiveEp}`;
}

export function chessFromKey(key: string): Chess {
  return new Chess(`${key} 0 1`);
}

/** The position after [uci] from [fen], or null when the move is not legal. */
export function playUci(fen: string, uci: string): Chess | null {
  try {
    const chess = new Chess(fen);
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return chess;
  } catch {
    return null;
  }
}

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function fenAfter(moves: string[], from = START_FEN): string {
  let fen = from;
  for (const uci of moves) {
    const next = playUci(fen, uci);
    if (!next) break;
    fen = next.fen();
  }
  return fen;
}

export function sanOf(fen: string, uci: string): string {
  const after = playUci(fen, uci);
  if (!after) return uci;
  const history = after.history();
  return history[history.length - 1] ?? uci;
}

/** "3...Nf6" or "4.c3" for the move at [plyIndex] (0 is White's first). */
export function numberedSan(fen: string, uci: string, plyIndex: number): string {
  const number = Math.floor(plyIndex / 2) + 1;
  return `${number}${plyIndex % 2 === 0 ? "." : "..."}${sanOf(fen, uci)}`;
}

/* Reading a book ----------------------------------------------------------- */

const VERDICTS: MoveVerdict[] = ["sound", "inaccuracy", "mistake", "blunder"];

function level(value: unknown): RepertoireLevel {
  return value === 0 || value === 1 || value === 2 ? value : 2;
}

function verdict(value: unknown): MoveVerdict | null {
  return typeof value === "string" && (VERDICTS as string[]).includes(value.toLowerCase())
    ? (value.toLowerCase() as MoveVerdict)
    : null;
}

/** Reads one repertoire file (format 1, written by the app's tools/build_repertoire.py). */
export function parseRepertoire(raw: any): RepertoireBook {
  if (!raw || raw.format !== 1) throw new Error("Repertoire: unsupported format");
  const side: Side = raw.side === "black" ? "b" : "w";
  const bands: RatingBand[] = (raw.source?.bands ?? []).map((b: any) => ({
    id: String(b.id),
    chessComFrom: Number(b.chesscom?.[0] ?? 0),
    chessComTo: b.chesscom?.[1] ?? null
  }));
  const nodes = new Map<string, RepertoireNode>();
  for (const n of raw.nodes ?? []) {
    const own = n.turn === "own";
    const replies: RepertoireReply[] = own
      ? []
      : (n.replies ?? []).map((r: any) => {
          const shares: (number | null)[] = (r.share ?? []).map((v: any) => (typeof v === "number" ? v : null));
          return {
            uci: String(r.uci),
            games: (r.games ?? []).map(Number),
            share: shares[0] ?? 0,
            bandShares: shares.slice(1),
            dataBacked: Boolean(r.data),
            verdict: verdict(r.verdict),
            loss: typeof r.loss === "number" ? r.loss : null,
            punish: r.trap === "punish",
            level: level(r.level)
          };
        });
    nodes.set(n.key, {
      key: String(n.key),
      ply: Number(n.ply),
      own,
      games: (n.games ?? []).map(Number),
      dataBacked: Boolean(n.data),
      level: level(n.level),
      reach: Number(n.reach ?? 0),
      evalCp: typeof n.eval === "number" ? n.eval : null,
      mate: typeof n.mate === "number" ? n.mate : null,
      move: own ? String(n.move) : null,
      also: own ? (n.also ?? []).map(String) : [],
      moveShare: typeof n.moveShare === "number" ? n.moveShare : null,
      pitfall:
        n.pitfall && verdict(n.pitfall.verdict)
          ? { uci: n.pitfall.uci, share: n.pitfall.share, verdict: verdict(n.pitfall.verdict)!, loss: n.pitfall.loss }
          : null,
      replies,
      note: n.note && typeof n.note.text === "string" ? { kind: n.note.kind, text: n.note.text } : null,
      name: typeof n.name === "string" ? n.name : null
    });
  }
  return { id: String(raw.id), title: String(raw.title), side, start: (raw.start ?? []).map(String), bands, nodes };
}

export const REPERTOIRE_IDS = ["italian", "caro-kann"] as const;

let cachedBooks: Promise<RepertoireBook[]> | null = null;

export function loadRepertoires(): Promise<RepertoireBook[]> {
  if (!cachedBooks) {
    cachedBooks = Promise.all(
      REPERTOIRE_IDS.map(id =>
        fetch(`/data/repertoire/${id}.json`)
          .then(r => (r.ok ? r.json() : null))
          .then(raw => (raw ? parseRepertoire(raw) : null))
          .catch(() => null)
      )
    ).then(books => books.filter((b): b is RepertoireBook => b !== null));
  }
  return cachedBooks;
}

/* The book's shape ----------------------------------------------------------- */

/** A card: the learner's turn after the opening's defining moves. */
export function isCard(book: RepertoireBook, node: RepertoireNode): boolean {
  return node.own && node.ply >= book.start.length;
}

/** The learner's positions up to [upTo], shallowest first. */
export function cardsOf(book: RepertoireBook, upTo: RepertoireLevel = 2): RepertoireNode[] {
  return [...book.nodes.values()]
    .filter(n => isCard(book, n) && n.level <= upTo)
    .sort((a, b) => a.ply - b.ply || b.reach - a.reach || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function startPlies(book: RepertoireBook, path: string[]): number {
  return book.start.every((m, i) => path[i] === m) && path.length >= book.start.length ? book.start.length : 0;
}

export function nodeAt(book: RepertoireBook, fen: string): RepertoireNode | undefined {
  try {
    return book.nodes.get(positionKey(new Chess(fen)));
  } catch {
    return undefined;
  }
}

/** The opening's intro: the note where its defining moves end. */
export function bookIntro(book: RepertoireBook): RepertoireNote | null {
  return nodeAt(book, fenAfter(book.start))?.note ?? null;
}

/** The data band for a player of [chessComRating], or null when unknown. */
export function bandFor(book: RepertoireBook, chessComRating: number | null): number | null {
  if (chessComRating === null) return null;
  const i = book.bands.findIndex(b => chessComRating >= b.chessComFrom && (b.chessComTo === null || chessComRating < b.chessComTo));
  return i >= 0 ? i : null;
}

/**
 * How to reach each position from the start: the likeliest move order, so a card can show the
 * moves that led to it. Built once per book.
 */
export class RepertoireIndex {
  private paths = new Map<string, string[]>();

  constructor(public book: RepertoireBook) {
    let level: { fen: string; path: string[] }[] = [{ fen: START_FEN, path: [] }];
    while (level.length) {
      const next: { fen: string; path: string[]; reach: number }[] = [];
      for (const { fen, path } of level) {
        const chess = new Chess(fen);
        const key = positionKey(chess);
        if (this.paths.has(key)) continue;
        const node = book.nodes.get(key);
        if (!node) continue;
        this.paths.set(key, path);
        const moves = node.own ? (node.move ? [node.move] : []) : node.replies.map(r => r.uci);
        for (const uci of moves) {
          const child = playUci(fen, uci);
          if (!child) continue;
          next.push({ fen: child.fen(), path: [...path, uci], reach: book.nodes.get(positionKey(child))?.reach ?? 0 });
        }
      }
      level = next.sort((a, b) => b.reach - a.reach).map(({ fen, path }) => ({ fen, path }));
    }
  }

  pathTo(key: string): string[] | undefined {
    return this.paths.get(key);
  }

  get size(): number {
    return this.paths.size;
  }
}

/* Cards and their schedule ---------------------------------------------------- */

/** One card's schedule: stage -1 is Learning, then 1, 3, 7, 14, 30 days (the app's ReviewScheduler). */
export interface CardState {
  bookId: string;
  key: string;
  level: RepertoireLevel;
  stage: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: number;
  attempts: number;
  introducedAt: number;
  lastReviewedAt: number | null;
  lapses: number;
  streak: number;
}

export interface CardReview {
  cardId: string;
  bookId: string;
  level: RepertoireLevel;
  at: number;
  firstTryRight: boolean;
  hinted: boolean;
}

export type CardAnswer = "right" | "also" | "wrong";

export const TRICKY_LAPSES = 2;
export const TRICKY_CLEAR = 3;
const TRICKY_MAX_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVALS = [1, 3, 7, 14, 30];

export function cardId(bookId: string, key: string): string {
  return `${bookId}|${key}`;
}

export function isTricky(card: CardState): boolean {
  return card.lapses >= TRICKY_LAPSES && card.streak < TRICKY_CLEAR;
}

export function isDue(card: CardState, now: number): boolean {
  return card.dueAt <= now;
}

export function judgeCard(node: RepertoireNode, uci: string): CardAnswer {
  if (uci === node.move) return "right";
  if (node.also.includes(uci)) return "also";
  return "wrong";
}

export function introduceCard(bookId: string, node: RepertoireNode, now: number): CardState {
  return {
    bookId,
    key: node.key,
    level: node.level,
    stage: -1,
    easeFactor: 2.5,
    intervalDays: 0,
    dueAt: now,
    attempts: 0,
    introducedAt: now,
    lastReviewedAt: null,
    lapses: 0,
    streak: 0
  };
}

/** The first try at a card decides its schedule (the app's RepertoireCards.afterRecall). */
export function afterRecall(card: CardState, right: boolean, hinted: boolean, now: number): [CardState, CardReview] {
  const attempts = card.attempts + 1;
  let stage: number;
  let intervalDays: number;
  let easeFactor: number;
  let dueAt: number;
  if (!right) {
    easeFactor = Math.min(3, Math.max(1.3, card.easeFactor - 0.2));
    stage = -1;
    intervalDays = 0;
    dueAt = now;
  } else {
    const quality = hinted ? 3 : 5;
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.min(3, Math.max(1.3, card.easeFactor + delta));
    stage = hinted ? 0 : Math.min(INTERVALS.length - 1, Math.max(0, card.stage + 1));
    const base = INTERVALS[stage];
    intervalDays = stage <= 1 || hinted ? base : Math.max(base, Math.round(base * (easeFactor / 2.5)));
    dueAt = now + intervalDays * DAY_MS;
  }
  let updated: CardState = {
    ...card,
    stage,
    easeFactor,
    intervalDays,
    dueAt,
    attempts,
    lastReviewedAt: now,
    lapses: card.lapses + (!right && card.attempts > 0 ? 1 : 0),
    streak: right && !hinted ? card.streak + 1 : 0
  };
  const soonest = now + TRICKY_MAX_DAYS * DAY_MS;
  if (isTricky(updated) && updated.dueAt > soonest) updated = { ...updated, dueAt: soonest };
  return [
    updated,
    { cardId: cardId(card.bookId, card.key), bookId: card.bookId, level: card.level, at: now, firstTryRight: right && !hinted, hinted }
  ];
}

/* Mastery and levels ----------------------------------------------------------- */

export interface MasteryProgress {
  total: number;
  introduced: number;
  settled: number;
  learning: number;
  recentReviews: number;
  recentAccuracy: number | null;
  recentDays: number;
  mastered: boolean;
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * A level is mastered when every card in it has been introduced, at least 90% are at stage 1 or
 * more, none is in Learning, and the first try was right in at least 90% of the level's last 50
 * reviews, spread over 3 or more days.
 */
export function masteryOf(
  book: RepertoireBook,
  lvl: RepertoireLevel,
  states: Record<string, CardState>,
  reviews: CardReview[]
): MasteryProgress {
  const ids = new Set(
    [...book.nodes.values()].filter(n => isCard(book, n) && n.level === lvl).map(n => cardId(book.id, n.key))
  );
  const cards = [...ids].map(id => states[id]).filter(Boolean);
  const recent = reviews.filter(r => ids.has(r.cardId)).sort((a, b) => a.at - b.at).slice(-50);
  const total = ids.size;
  const introduced = cards.length;
  const settled = cards.filter(c => c.stage >= 1).length;
  const learning = cards.filter(c => c.stage < 0).length;
  const recentAccuracy = recent.length ? recent.filter(r => r.firstTryRight).length / recent.length : null;
  const recentDays = new Set(recent.map(r => dayKey(r.at))).size;
  return {
    total,
    introduced,
    settled,
    learning,
    recentReviews: recent.length,
    recentAccuracy,
    recentDays,
    mastered:
      total > 0 &&
      introduced === total &&
      settled >= Math.ceil(0.9 * total) &&
      learning === 0 &&
      recent.length > 0 &&
      (recentAccuracy ?? 0) >= 0.9 &&
      recentDays >= 3
  };
}

export interface LevelProgress {
  bookId: string;
  unlocked: RepertoireLevel;
  masteredAt: Partial<Record<RepertoireLevel, number>>;
}

/** Opens the next level once the highest open one is mastered. One level at a time. */
export function updateLevels(
  book: RepertoireBook,
  progress: LevelProgress,
  states: Record<string, CardState>,
  reviews: CardReview[],
  now: number
): LevelProgress {
  const lvl = progress.unlocked;
  if (progress.masteredAt[lvl] !== undefined || !masteryOf(book, lvl, states, reviews).mastered) return progress;
  const next = (lvl < 2 ? lvl + 1 : lvl) as RepertoireLevel;
  return { ...progress, unlocked: next, masteredAt: { ...progress.masteredAt, [lvl]: now } };
}

/* Learning new lines -------------------------------------------------------------- */

export interface LearnSegment {
  moves: string[];
  newCards: string[];
  name: string | null;
}

export function segmentVariation(segment: LearnSegment): string | null {
  if (!segment.name) return null;
  const i = segment.name.indexOf(":");
  const part = (i >= 0 ? segment.name.slice(i + 1) : segment.name).trim();
  return part || null;
}

export const MAX_NEW = 8;

/**
 * What to learn next: the open card met most often that is not introduced yet, reached by its
 * likeliest move order, then on down the most common replies, at most [maxNew] new cards.
 * [within] keeps it inside one variation.
 */
export function planLearn(
  index: RepertoireIndex,
  open: RepertoireLevel,
  introduced: Set<string>,
  maxNew = MAX_NEW,
  within: string[] | null = null
): LearnSegment | null {
  const book = index.book;
  const candidates = cardsOf(book, open).filter(n => {
    if (introduced.has(n.key)) return false;
    const path = index.pathTo(n.key);
    return path !== undefined && (within === null || within.every((m, i) => path[i] === m));
  });
  if (!candidates.length) return null;
  const target = candidates.reduce((best, n) =>
    n.reach > best.reach || (n.reach === best.reach && (n.ply < best.ply || (n.ply === best.ply && n.key < best.key)))
      ? n
      : best
  );
  const moves = [...index.pathTo(target.key)!];
  const fresh: string[] = [];
  let fen = START_FEN;
  let name: string | null = null;
  const fresher = (n: RepertoireNode | undefined) => n && isCard(book, n) && !introduced.has(n.key) && n.level <= open;
  for (const uci of moves) {
    const here = nodeAt(book, fen);
    if (fresher(here)) fresh.push(here!.key);
    fen = playUci(fen, uci)!.fen();
    const after = nodeAt(book, fen);
    if (after?.name) name = after.name;
  }
  let node: RepertoireNode = target;
  while (fresh.length < maxNew) {
    fresh.push(node.key);
    moves.push(node.move!);
    fen = playUci(fen, node.move!)!.fen();
    const opponent = nodeAt(book, fen);
    if (!opponent) break;
    if (opponent.name) name = opponent.name;
    const replies = opponent.replies.filter(r => r.level <= open);
    if (!replies.length) break;
    const reply = replies.reduce((a, b) => (b.share > a.share ? b : a));
    const after = playUci(fen, reply.uci)!.fen();
    const card = nodeAt(book, after);
    if (!fresher(card)) break;
    moves.push(reply.uci);
    fen = after;
    if (card!.name) name = card!.name;
    node = card!;
  }
  return { moves, newCards: [...new Set(fresh)], name };
}

/**
 * One learn run over a segment: first the watch pass, where the line plays itself, then the
 * play-back pass from where the opening's defining moves end, the first real recall. Mutable,
 * like the app's LearnRun; the screen re-renders from a version counter.
 */
export class LearnRun {
  pass: "watch" | "recall" | "done" = "watch";
  readonly startPly: number;
  private readonly startFen: string;
  ply: number;
  fen: string;
  shown: string | null = null;
  private hinted = false;
  private missed = new Set<string>();
  private results = new Map<string, [CardState, CardReview]>();

  constructor(public index: RepertoireIndex, public segment: LearnSegment, private now: () => number = Date.now) {
    this.startPly = startPlies(index.book, segment.moves);
    this.startFen = fenAfter(segment.moves.slice(0, this.startPly));
    this.ply = this.startPly;
    this.fen = this.startFen;
  }

  get book(): RepertoireBook {
    return this.index.book;
  }

  get node(): RepertoireNode | undefined {
    return nodeAt(this.book, this.fen);
  }

  private get sideToMove(): Side {
    return this.fen.split(" ")[1] as Side;
  }

  get isOwnTurn(): boolean {
    return this.pass === "recall" && this.ply < this.segment.moves.length && this.sideToMove === this.book.side;
  }

  get isNewCard(): boolean {
    const key = this.node?.key;
    return this.isOwnTurn && key !== undefined && this.segment.newCards.includes(key);
  }

  get nextWatched(): string | null {
    return this.pass === "watch" ? this.segment.moves[this.ply] ?? null : null;
  }

  get outcome(): [CardState, CardReview][] {
    return this.pass === "done" ? [...this.results.values()] : [];
  }

  /** The move just played, for the board's last-move mark. */
  get lastMove(): string | null {
    return this.ply > this.startPly ? this.segment.moves[this.ply - 1] : null;
  }

  watchNext(): string | null {
    const uci = this.nextWatched;
    if (!uci) return null;
    this.advance(uci);
    return uci;
  }

  skipWatch() {
    if (this.pass === "watch") this.startRecall();
  }

  watchAgain() {
    if (this.pass !== "watch") return;
    this.ply = this.startPly;
    this.fen = this.startFen;
  }

  submit(uci: string): CardAnswer | null {
    if (!this.isOwnTurn) return null;
    const card = this.node;
    if (!card || !playUci(this.fen, uci)) return null;
    const expected = this.segment.moves[this.ply];
    const answer = judgeCard(card, uci);
    if (answer === "right") {
      if (this.isNewCard) this.record(card, !this.missed.has(card.key));
      this.advance(expected);
    } else if (answer === "wrong") {
      if (this.isNewCard) this.missed.add(card.key);
      this.shown = expected;
    }
    return answer;
  }

  showAnswer(): string | null {
    if (!this.isOwnTurn) return null;
    if (this.isNewCard) this.missed.add(this.node!.key);
    this.shown = this.segment.moves[this.ply];
    return this.shown;
  }

  hint(): string | null {
    if (!this.isOwnTurn) return null;
    if (this.isNewCard) this.hinted = true;
    return this.segment.moves[this.ply].slice(0, 2);
  }

  playOpponent(): boolean {
    if (this.pass !== "recall" || this.ply >= this.segment.moves.length || this.sideToMove === this.book.side) return false;
    this.advance(this.segment.moves[this.ply]);
    return true;
  }

  private record(card: RepertoireNode, right: boolean) {
    const fresh = introduceCard(this.book.id, card, this.now());
    this.results.set(card.key, afterRecall(fresh, right, this.hinted, this.now()));
    this.hinted = false;
  }

  private startRecall() {
    this.pass = "recall";
    this.ply = this.startPly;
    this.fen = this.startFen;
    this.shown = null;
  }

  private advance(uci: string) {
    this.fen = playUci(this.fen, uci)!.fen();
    this.ply++;
    this.shown = null;
    if (this.ply >= this.segment.moves.length) {
      if (this.pass === "watch") this.startRecall();
      else this.pass = "done";
    }
  }
}

/* Reviewing what is due ---------------------------------------------------------------- */

export interface DueCard {
  index: RepertoireIndex;
  node: RepertoireNode;
  state: CardState;
  path: string[];
  fromStart: boolean;
}

export const REVIEW_LIMIT = 30;

function dueCardsOf(indexes: RepertoireIndex[], states: CardState[]): DueCard[] {
  const byBook = new Map(indexes.map(i => [i.book.id, i]));
  const out: DueCard[] = [];
  for (const state of states) {
    const index = byBook.get(state.bookId);
    if (!index) continue;
    const node = index.book.nodes.get(state.key);
    if (!node || !isCard(index.book, node)) continue;
    const path = index.pathTo(state.key);
    if (!path) continue;
    out.push({ index, node, state, path, fromStart: isTricky(state) });
  }
  return out;
}

/** Due cards from every opening, oldest due first, mixed so two from one opening do not follow each other. */
export function buildReviewQueue(indexes: RepertoireIndex[], states: CardState[], now: number, limit = REVIEW_LIMIT): DueCard[] {
  const due = dueCardsOf(
    indexes,
    states.filter(s => isDue(s, now)).sort((a, b) => a.dueAt - b.dueAt || (cardId(a.bookId, a.key) < cardId(b.bookId, b.key) ? -1 : 1))
  );
  const waiting = [...due];
  const out: DueCard[] = [];
  while (waiting.length && out.length < limit) {
    const last = out[out.length - 1]?.index.book.id;
    const i = waiting.findIndex(c => c.index.book.id !== last);
    out.push(waiting.splice(i >= 0 ? i : 0, 1)[0]);
  }
  return out;
}

/** Every tricky card, the most often missed first, each from the start of its line. */
export function trickyQueue(indexes: RepertoireIndex[], states: CardState[], limit = REVIEW_LIMIT): DueCard[] {
  return dueCardsOf(
    indexes,
    states.filter(isTricky).sort((a, b) => b.lapses - a.lapses || a.dueAt - b.dueAt)
  ).slice(0, limit);
}

/**
 * One review run: one scored move per card, only the first try counts. A fromStart card first
 * walks its line, where the learner's earlier moves are practice.
 */
export class ReviewSession {
  index = 0;
  done = false;
  shown: string | null = null;
  fen = START_FEN;
  ply = 0;
  private hinted = false;
  private missed = false;
  private results: [CardState, CardReview][] = [];

  constructor(public cards: DueCard[], private now: () => number = Date.now) {
    this.startCard();
  }

  get current(): DueCard | undefined {
    return this.cards[this.index];
  }

  get finished(): boolean {
    return this.index >= this.cards.length;
  }

  get outcome(): [CardState, CardReview][] {
    return [...this.results];
  }

  get rightFirstTime(): number {
    return this.results.filter(r => r[1].firstTryRight).length;
  }

  get atCard(): boolean {
    const c = this.current;
    return c ? this.ply >= c.path.length : false;
  }

  get isOwnTurn(): boolean {
    const c = this.current;
    return !this.done && c !== undefined && this.fen.split(" ")[1] === c.index.book.side;
  }

  get lastMove(): string | null {
    const c = this.current;
    return c && this.ply > 0 ? c.path[this.ply - 1] ?? null : null;
  }

  private get expected(): string | null {
    const c = this.current;
    if (!c) return null;
    return this.atCard ? c.node.move : c.path[this.ply] ?? null;
  }

  submit(uci: string): CardAnswer | null {
    const card = this.current;
    if (!card || this.done || !this.isOwnTurn || !playUci(this.fen, uci)) return null;
    if (!this.atCard) {
      const node = nodeAt(card.index.book, this.fen);
      if (!node) return null;
      const answer = uci === this.expected ? "right" : judgeCard(node, uci);
      if (answer === "right") this.advance(this.expected!);
      else if (answer === "wrong") this.shown = this.expected;
      return answer;
    }
    const answer = judgeCard(card.node, uci);
    if (answer === "right") this.finish(card, !this.missed);
    else if (answer === "wrong") {
      this.missed = true;
      this.shown = card.node.move;
    }
    return answer;
  }

  playOpponent(): boolean {
    const card = this.current;
    if (!card || this.done || this.atCard || this.isOwnTurn) return false;
    this.advance(card.path[this.ply]);
    return true;
  }

  hint(): string | null {
    if (this.done || !this.isOwnTurn) return null;
    if (this.atCard) this.hinted = true;
    return this.expected?.slice(0, 2) ?? null;
  }

  showAnswer(): string | null {
    const card = this.current;
    if (!card || this.done || !this.isOwnTurn) return null;
    this.shown = this.expected;
    if (this.atCard) {
      this.missed = true;
      this.finish(card, false);
    }
    return this.shown;
  }

  next() {
    if (!this.done) return;
    this.index++;
    this.startCard();
  }

  private startCard() {
    this.done = false;
    this.shown = null;
    this.hinted = false;
    this.missed = false;
    const card = this.current;
    if (!card) return;
    if (card.fromStart) {
      this.ply = startPlies(card.index.book, card.path);
      this.fen = fenAfter(card.path.slice(0, this.ply));
    } else {
      this.ply = card.path.length;
      this.fen = fenAfter(card.path);
    }
  }

  private advance(uci: string) {
    this.fen = playUci(this.fen, uci)!.fen();
    this.ply++;
    this.shown = null;
  }

  private finish(card: DueCard, right: boolean) {
    this.results.push(afterRecall(card.state, right, this.hinted, this.now()));
    this.done = true;
  }
}

/* The opening page ---------------------------------------------------------------- */

export interface Variation {
  path: string[];
  move: string;
  name: string | null;
  share: number;
  cards: number;
  introduced: number;
  solid: number;
}

export function variationLabel(v: Variation): string {
  return v.name ?? v.move;
}

const SPLIT_SHARE = 0.4;

function variationName(name: string | null | undefined): string | null {
  if (!name) return null;
  const i = name.indexOf(":");
  if (i < 0) return null;
  const part = name.slice(i + 1).trim();
  return part || null;
}

function branchFrom(book: RepertoireBook, fen: string, path: string[]): { fen: string; path: string[] } | null {
  let at = fen;
  let moves = path;
  for (let i = 0; i < 12; i++) {
    const node = nodeAt(book, at);
    if (!node) return null;
    if (!node.own && node.replies.length >= 2) return { fen: at, path: moves };
    const next = node.own ? node.move : node.replies.length === 1 ? node.replies[0].uci : null;
    if (!next) return null;
    const after = playUci(at, next);
    if (!after) return null;
    at = after.fen();
    moves = [...moves, next];
  }
  return null;
}

interface Choice {
  path: string[];
  after: string;
  move: string;
  share: number;
}

function choicesAt(book: RepertoireBook, fen: string, path: string[], band: number | null, weight: number): Choice[] {
  const node = nodeAt(book, fen);
  if (!node) return [];
  const out: Choice[] = [];
  for (const reply of node.replies) {
    const after = playUci(fen, reply.uci);
    if (!after) continue;
    out.push({ path: [...path, reply.uci], after: after.fen(), move: numberedSan(fen, reply.uci, path.length), share: shareFor(reply, band) * weight });
  }
  return out;
}

function cardsUnder(book: RepertoireBook, fen: string, open: RepertoireLevel): Set<string> {
  const found = new Set<string>();
  const seen = new Set<string>();
  const queue = [fen];
  while (queue.length) {
    const at = queue.shift()!;
    const node = nodeAt(book, at);
    if (!node || seen.has(node.key)) continue;
    seen.add(node.key);
    if (node.own) {
      if (isCard(book, node) && node.level <= open) found.add(node.key);
      const next = node.move ? playUci(at, node.move) : null;
      if (next) queue.push(next.fen());
    } else {
      for (const r of node.replies) {
        if (r.level > open) continue;
        const next = playUci(at, r.uci);
        if (next) queue.push(next.fen());
      }
    }
  }
  return found;
}

function nameOf(book: RepertoireBook, fen: string): string | null {
  let at = fen;
  for (let i = 0; i < 4; i++) {
    const node = nodeAt(book, at);
    if (!node) return null;
    const v = variationName(node.name);
    if (v) return v;
    const next = node.own
      ? node.move
      : node.replies.length
      ? node.replies.reduce((a, b) => (b.share > a.share ? b : a)).uci
      : null;
    if (!next) return null;
    const after = playUci(at, next);
    if (!after) return null;
    at = after.fen();
  }
  return null;
}

/**
 * The opponent's choices at the first branch after the defining moves, a choice most games take
 * and without a name of its own split into the choices after it (the Caro-Kann's 2.d4).
 */
export function variationsOf(
  index: RepertoireIndex,
  band: number | null,
  open: RepertoireLevel,
  states: Record<string, CardState>
): Variation[] {
  const book = index.book;
  const first = branchFrom(book, fenAfter(book.start), book.start);
  if (!first) return [];
  const row = (choice: Choice): Variation => {
    const keys = cardsUnder(book, choice.after, open);
    const ids = [...keys].map(k => cardId(book.id, k));
    return {
      path: choice.path,
      move: choice.move,
      name: nameOf(book, choice.after),
      share: choice.share,
      cards: keys.size,
      introduced: ids.filter(id => states[id]).length,
      solid: ids.filter(id => (states[id]?.stage ?? -1) >= 1).length
    };
  };
  const rows: Variation[] = [];
  for (const choice of choicesAt(book, first.fen, first.path, band, 1)) {
    const named = variationName(nodeAt(book, choice.after)?.name) !== null;
    const deeper = choice.share > SPLIT_SHARE && !named ? branchFrom(book, choice.after, choice.path) : null;
    const parts = deeper ? choicesAt(book, deeper.fen, deeper.path, band, choice.share) : [];
    if (parts.length >= 2) rows.push(...parts.map(row));
    else rows.push(row(choice));
  }
  return rows.sort((a, b) => b.share - a.share);
}

/** How ready the learner is: open cards weighted by how often they are met, the share known solidly. */
export function readiness(book: RepertoireBook, open: RepertoireLevel, states: Record<string, CardState>): number {
  const cards = cardsOf(book, open);
  const total = cards.reduce((s, c) => s + c.reach, 0);
  if (total <= 0) return 0;
  return cards.filter(c => (states[cardId(book.id, c.key)]?.stage ?? -1) >= 1).reduce((s, c) => s + c.reach, 0) / total;
}
