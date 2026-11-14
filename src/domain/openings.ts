import { Chess } from "chess.js";
import { parseUci, toUci } from "../lib/chessUtils";

export interface OpeningLine {
  eco: string;
  name: string;
  moves: string[]; // UCI moves
  family: string;
  variation: string;
}

export interface BookMove {
  uci: string;
  weight: number;
}

export interface OpeningFamily {
  name: string;
  lines: OpeningLine[];
}

export interface OpeningGroup {
  name: string;
  lines: OpeningLine[];
}

export interface OpeningMatch {
  opening: OpeningLine | null;
  bookPlies: number;
  leftBookAt: number | null;
}

export type BattleMode = "play" | "drill" | "surprise";

export interface BattleChoice {
  line: OpeningLine;
  playerColor: "w" | "b";
  mode: BattleMode;
  exactReplies: boolean;
}

export interface BattlePlan {
  choice: BattleChoice;
  target: OpeningLine;
  repertoire: Repertoire;
}

/** Position key matching Kotlin's repetitionKey: placement + side + castling + en-passant (no clocks). */
export function repetitionKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

export function isWithinSelection(name: string, selection: string): boolean {
  return (
    name === selection ||
    name.startsWith(`${selection}:`) ||
    name.startsWith(`${selection},`) ||
    name.startsWith(`${selection} `)
  );
}

function makeChessMoveFromUci(chess: Chess, uci: string): boolean {
  const parsed = parseUci(uci);
  if (!parsed) return false;
  try {
    const moved = chess.move({
      from: parsed.from,
      to: parsed.to,
      promotion: parsed.promotion ?? "q"
    });
    return Boolean(moved);
  } catch {
    return false;
  }
}

export function buildEdgesForLines(lines: OpeningLine[]): Map<string, Map<string, number>> {
  const edges = new Map<string, Map<string, number>>();
  for (const line of lines) {
    const chess = new Chess();
    for (const uci of line.moves) {
      const key = repetitionKey(chess.fen());
      if (!makeChessMoveFromUci(chess, uci)) break;
      let moveCounts = edges.get(key);
      if (!moveCounts) {
        moveCounts = new Map();
        edges.set(key, moveCounts);
      }
      moveCounts.set(uci, (moveCounts.get(uci) ?? 0) + 1);
    }
  }
  return edges;
}

export function sortBookMoves(counts: Map<string, number> | undefined): BookMove[] {
  if (!counts) return [];
  return Array.from(counts.entries())
    .map(([uci, weight]) => ({ uci, weight }))
    .sort((a, b) => b.weight - a.weight || a.uci.localeCompare(b.uci));
}

export class Repertoire {
  private readonly white: Map<string, Map<string, number>>;
  private readonly black: Map<string, Map<string, number>>;

  constructor(white: Map<string, Map<string, number>>, black: Map<string, Map<string, number>>) {
    this.white = white;
    this.black = black;
  }

  static readonly NONE = new Repertoire(new Map(), new Map());

  static of(tree: OpeningTree, whiteOpenings: string[], blackOpenings: string[]): Repertoire {
    return new Repertoire(
      buildEdgesForLines(tree.linesWithin(whiteOpenings)),
      buildEdgesForLines(tree.linesWithin(blackOpenings))
    );
  }

  static line(moves: string[]): Repertoire {
    const edges = buildEdgesForLines([{ eco: "", name: "line", moves, family: "line", variation: "" }]);
    return new Repertoire(edges, edges);
  }

  movesFor(side: "w" | "b", key: string): BookMove[] {
    const table = side === "w" ? this.white : this.black;
    return sortBookMoves(table.get(key));
  }

  covers(side: "w" | "b"): boolean {
    const table = side === "w" ? this.white : this.black;
    return table.size > 0;
  }
}

export class OpeningTree {
  readonly openings: OpeningLine[];
  readonly families: OpeningFamily[];
  private readonly edges: Map<string, Map<string, number>>;
  private readonly named: Map<string, OpeningLine>;

  constructor(openings: OpeningLine[]) {
    this.openings = openings;
    const edges = new Map<string, Map<string, number>>();
    const named = new Map<string, OpeningLine>();
    const familyMap = new Map<string, OpeningLine[]>();

    for (const line of openings) {
      const fam = familyMap.get(line.family);
      if (fam) fam.push(line);
      else familyMap.set(line.family, [line]);

      const chess = new Chess();
      let ok = true;
      for (const uci of line.moves) {
        const key = repetitionKey(chess.fen());
        if (!makeChessMoveFromUci(chess, uci)) {
          ok = false;
          break;
        }
        let map = edges.get(key);
        if (!map) {
          map = new Map();
          edges.set(key, map);
        }
        map.set(uci, (map.get(uci) ?? 0) + 1);
      }
      if (ok) {
        const finalKey = repetitionKey(chess.fen());
        if (!named.has(finalKey)) named.set(finalKey, line);
      }
    }

    this.edges = edges;
    this.named = named;
    this.families = Array.from(familyMap.entries())
      .map(([name, lines]) => ({ name, lines }))
      .sort((a, b) => b.lines.length - a.lines.length || a.name.localeCompare(b.name));
  }

  get isEmpty(): boolean {
    return this.openings.length === 0;
  }

  isInBook(key: string): boolean {
    return this.edges.has(key) || this.named.has(key);
  }

  bookMoves(key: string): BookMove[] {
    return sortBookMoves(this.edges.get(key));
  }

  openingAt(key: string): OpeningLine | null {
    return this.named.get(key) ?? null;
  }

  linesWithin(selections: string[]): OpeningLine[] {
    if (!selections.length) return [];
    return this.openings.filter(o => selections.some(sel => isWithinSelection(o.name, sel)));
  }

  match(uciMoves: string[]): OpeningMatch {
    const chess = new Chess();
    let opening: OpeningLine | null = null;
    for (let ply = 0; ply < uciMoves.length; ply++) {
      if (!makeChessMoveFromUci(chess, uciMoves[ply])) {
        return { opening, bookPlies: ply, leftBookAt: ply };
      }
      const key = repetitionKey(chess.fen());
      if (!this.isInBook(key)) {
        return { opening, bookPlies: ply, leftBookAt: ply };
      }
      const exact = this.named.get(key);
      if (exact) opening = exact;
    }
    return { opening, bookPlies: uciMoves.length, leftBookAt: null };
  }

  presetLine(name: string): OpeningLine | null {
    const within = this.linesWithin([name]);
    if (!within.length) return null;
    const exact = within.filter(o => o.name === name);
    if (exact.length) {
      return exact.reduce((best, cur) => (cur.moves.length >= best.moves.length ? cur : best));
    }
    return within.reduce((best, cur) => (cur.moves.length <= best.moves.length ? cur : best));
  }

  searchFamilies(query: string, limit = 60): OpeningFamily[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.families.slice(0, limit);
    return this.families
      .filter(
        fam =>
          fam.name.toLowerCase().includes(q) ||
          fam.lines.some(l => l.name.toLowerCase().includes(q) || l.eco.toLowerCase().includes(q))
      )
      .slice(0, limit);
  }
}

export function groupFamilyLines(family: OpeningFamily): OpeningGroup[] {
  const map = new Map<string, OpeningLine[]>();
  for (const line of family.lines) {
    const groupName = line.variation.split(",")[0].trim() || "Main line";
    const bucket = map.get(groupName);
    if (bucket) bucket.push(line);
    else map.set(groupName, [line]);
  }
  return Array.from(map.entries())
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => {
      if (a.name === "Main line" && b.name !== "Main line") return -1;
      if (b.name === "Main line" && a.name !== "Main line") return 1;
      return b.lines.length - a.lines.length || a.name.localeCompare(b.name);
    });
}

export function parseOpeningsTsv(tsvText: string): OpeningTree {
  const openings: OpeningLine[] = [];
  for (const rawLine of tsvText.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const cols = rawLine.split("\t");
    if (cols.length < 3) continue;
    const eco = cols[0].trim();
    const name = cols[1].trim();
    const moves = cols[2]
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(m => m.toLowerCase());
    if (!name || !moves.length) continue;
    const colonIdx = name.indexOf(":");
    const family = (colonIdx >= 0 ? name.slice(0, colonIdx) : name).trim();
    const variation = (colonIdx >= 0 ? name.slice(colonIdx + 1) : "").trim();
    openings.push({ eco, name, moves, family, variation });
  }
  return new OpeningTree(openings);
}

export function createBattlePlan(tree: OpeningTree, choice: BattleChoice): BattlePlan {
  const family = tree.linesWithin([choice.line.family]);
  const pool = family.length ? family : [choice.line];
  if (choice.mode === "surprise") {
    const deeper = pool.filter(l => l.moves.length > choice.line.moves.length);
    const pickFrom = deeper.length ? deeper : pool;
    const target = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    return { choice, target, repertoire: Repertoire.line(target.moves) };
  }
  if (choice.exactReplies) {
    return { choice, target: choice.line, repertoire: Repertoire.line(choice.line.moves) };
  }
  return {
    choice,
    target: choice.line,
    repertoire: Repertoire.of(tree, [choice.line.family], [choice.line.family])
  };
}

let cachedTreePromise: Promise<OpeningTree> | null = null;

export async function loadOpeningTree(): Promise<OpeningTree> {
  if (!cachedTreePromise) {
    cachedTreePromise = fetch("/data/openings.tsv")
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return parseOpeningsTsv(text);
      })
      .catch(() => new OpeningTree([]));
  }
  return cachedTreePromise;
}

export function movesToUciList(chess: Chess): string[] {
  return chess.history({ verbose: true }).map(m => toUci(m));
}
