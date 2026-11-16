/**
 * The Train tab (the app's Phase 12): today's mixed review of every opening, the openings as
 * White and as Black, the opening page with its levels and variations, learn and review runs,
 * and endgames to win and middlegames to convert against Stockfish.
 */
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ArrowLeft, Eye, Flag, Lightbulb, Lock, RotateCcw, SkipForward } from "lucide-react";
import {
  CardAnswer,
  CardReview,
  CardState,
  DueCard,
  LEVEL_NAMES,
  LearnRun,
  LevelProgress,
  RepertoireBook,
  RepertoireIndex,
  RepertoireLevel,
  ReviewSession,
  bandFor,
  bookIntro,
  buildReviewQueue,
  cardId,
  cardsOf,
  fenAfter,
  isDue,
  isTricky,
  loadRepertoires,
  masteryOf,
  nodeAt,
  planLearn,
  readiness,
  sanOf,
  segmentVariation,
  trickyQueue,
  updateLevels,
  variationLabel,
  variationsOf
} from "../domain/repertoire";
import {
  PositionKind,
  PositionRecord,
  PositionSet,
  TrainPosition,
  endedOutcome,
  epochDay,
  learnerScore,
  loadPositionSets,
  positionQueue,
  scoredOutcome,
  sideOf
} from "../domain/trainPositions";
import { analysePosition } from "../lib/engine";
import { MyLine, endFen, freeName, lineBook, myLineBookId, sanLine } from "../domain/myLines";
import { OpeningLine, OpeningTree } from "../domain/openings";
import { generateUuid } from "../lib/storage";
import type { GameReviewReport } from "../domain/account";
import { ENDINGS, FindingGame, GameFinding, findingGameOf, gameFindings } from "../domain/gameFindings";

/** A saved or imported game, as "From your games" reads it. */
type FindingSource = Parameters<typeof findingGameOf>[0];
import { playCue, triggerHaptic } from "../lib/audio";
import { AppSettings, TrainStore } from "../lib/storage";
import { BoardArrow, BoardHighlight, BoardHost } from "../components/BoardHost";
import { ArtTile, BoardPicture, ListRow, MetalIcon, PrimaryButton, ScreenTitle } from "../components/ct";

export type TrainRunSpec =
  | { kind: "learn"; bookId: string; within: string[] | null }
  | { kind: "review"; bookId: string | null }
  | { kind: "tricky"; bookId: string }
  | { kind: "drill"; bookId: string; moves: string[] };

export type TrainSubRoute =
  | { view: "hub" }
  | { view: "side"; side: "w" | "b" }
  | { view: "opening"; bookId: string }
  | { view: "run"; spec: TrainRunSpec; back: TrainSubRoute }
  | { view: "positions"; kind: PositionKind }
  | { view: "position-run"; setId: string }
  | { view: "from-games" }
  | { view: "lines" }
  | { view: "line"; lineId: string }
  | { view: "line-new" };

export function isTrainFocus(route: TrainSubRoute): boolean {
  return route.view === "run" || route.view === "position-run" || route.view === "line-new";
}

interface BookUi {
  index: RepertoireIndex;
  book: RepertoireBook;
  levels: LevelProgress;
  due: number;
  fresh: number;
  tricky: number;
  readiness: number;
  introduced: number;
}

function levelsOf(store: TrainStore, bookId: string): LevelProgress {
  return store.levels[bookId] ?? { bookId, unlocked: 0, masteredAt: {} };
}

function introducedSet(store: TrainStore, bookId: string): Set<string> {
  const out = new Set<string>();
  for (const c of Object.values(store.cards)) if (c.bookId === bookId) out.add(c.key);
  return out;
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function TrainView({
  route,
  setRoute,
  settings,
  isDark,
  store,
  onUpdateStore,
  effectiveRating,
  onOpenBattle,
  games,
  reviews,
  openingTree
}: {
  route: TrainSubRoute;
  setRoute: (r: TrainSubRoute) => void;
  settings: AppSettings;
  isDark: boolean;
  store: TrainStore;
  onUpdateStore: (change: (prev: TrainStore) => TrainStore) => void;
  effectiveRating: number;
  onOpenBattle: (openingName?: string, line?: OpeningLine, side?: "w" | "b") => void;
  openingTree: OpeningTree;
  /** Every saved and imported game, for "From your games". */
  games: FindingSource[];
  reviews: Record<string, GameReviewReport>;
}) {
  const [books, setBooks] = useState<RepertoireBook[] | null>(null);
  const [sets, setSets] = useState<PositionSet[] | null>(null);
  useEffect(() => {
    void loadRepertoires().then(setBooks);
    void loadPositionSets().then(setSets);
  }, []);

  const indexes = useMemo(() => (books ?? []).map(b => new RepertoireIndex(b)), [books]);
  /** The taught openings and the player's own lines, which share the review. */
  const lineIndexes = useMemo(() => store.lines.map(l => new RepertoireIndex(lineBook(l))), [store.lines]);
  const allIndexes = useMemo(() => [...indexes, ...lineIndexes], [indexes, lineIndexes]);
  const now = Date.now();

  // "From your games" is worked out after the page has drawn, and again when games change.
  const [findings, setFindings] = useState<{ games: number; reviewed: number; list: GameFinding[] } | null>(null);
  useEffect(() => {
    if (!books) return;
    const timer = window.setTimeout(() => {
      const list = games.map(findingGameOf).filter((g): g is FindingGame => g !== null);
      setFindings({
        games: list.length,
        reviewed: list.filter(g => reviews[g.id]).length,
        list: gameFindings(list, books, reviews)
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [books, games, reviews]);

  const bookUis: BookUi[] = useMemo(() => {
    const cards = Object.values(store.cards);
    return indexes.map(index => {
      const book = index.book;
      const levels = levelsOf(store, book.id);
      const own = cards.filter(c => c.bookId === book.id && book.nodes.has(c.key));
      const statesByCard = Object.fromEntries(own.map(c => [cardId(book.id, c.key), c]));
      const introduced = new Set(own.map(c => c.key));
      return {
        index,
        book,
        levels,
        due: own.filter(c => isDue(c, now)).length,
        fresh: cardsOf(book, levels.unlocked).filter(n => !introduced.has(n.key)).length,
        tricky: own.filter(isTricky).length,
        readiness: readiness(book, levels.unlocked, statesByCard),
        introduced: own.length
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexes, store]);

  const band = (book: RepertoireBook) => bandFor(book, effectiveRating);

  /** Saves a run's cards and reviews; returns the level it mastered, if one. */
  const saveOutcome = useCallback(
    (outcome: [CardState, CardReview][]): { book: RepertoireBook; level: RepertoireLevel } | null => {
      if (!outcome.length) return null;
      let mastered: { book: RepertoireBook; level: RepertoireLevel } | null = null;
      onUpdateStore(prev => {
        const cards = { ...prev.cards };
        for (const [state] of outcome) cards[cardId(state.bookId, state.key)] = state;
        const reviews = [...prev.reviews, ...outcome.map(o => o[1])];
        const levels = { ...prev.levels };
        for (const bookId of new Set(outcome.map(o => o[0].bookId))) {
          const book = books?.find(b => b.id === bookId);
          if (!book) continue;
          const before = prev.levels[bookId] ?? { bookId, unlocked: 0 as RepertoireLevel, masteredAt: {} };
          const after = updateLevels(book, before, cards, reviews, Date.now());
          if (after !== before) {
            levels[bookId] = after;
            const won = (Object.keys(after.masteredAt).map(Number) as RepertoireLevel[]).find(
              l => before.masteredAt[l] === undefined
            );
            if (won !== undefined) mastered = { book, level: won };
          }
        }
        return { ...prev, cards, reviews, levels };
      });
      return mastered;
    },
    [books, onUpdateStore]
  );

  if (route.view === "run") {
    return (
      <RepertoireRun
        key={JSON.stringify(route.spec)}
        spec={route.spec}
        indexes={allIndexes}
        store={store}
        settings={settings}
        onSave={saveOutcome}
        onLearnMore={spec => setRoute({ ...route, spec })}
        onBack={() => setRoute(route.back)}
      />
    );
  }

  if (route.view === "position-run") {
    const set = sets?.find(s => s.id === route.setId);
    if (!set) return null;
    return (
      <PositionRun
        set={set}
        records={store.positions}
        settings={settings}
        onSave={(id, record) => onUpdateStore(prev => ({ ...prev, positions: { ...prev.positions, [id]: record } }))}
        onBack={() => setRoute({ view: "positions", kind: set.kind })}
      />
    );
  }

  if (route.view === "lines") {
    return (
      <MyLinesPage
        lines={store.lines}
        settings={settings}
        onBack={() => setRoute({ view: "hub" })}
        onNew={() => setRoute({ view: "line-new" })}
        onOpen={id => setRoute({ view: "line", lineId: id })}
        onAnyOpening={() => onOpenBattle()}
      />
    );
  }

  if (route.view === "line") {
    const line = store.lines.find(l => l.id === route.lineId);
    if (!line) return <BackOnly onBack={() => setRoute({ view: "lines" })} />;
    return (
      <MyLinePage
        line={line}
        settings={settings}
        onBack={() => setRoute({ view: "lines" })}
        onDrill={() =>
          setRoute({ view: "run", spec: { kind: "drill", bookId: myLineBookId(line), moves: line.moves }, back: route })
        }
        onPlay={() =>
          onOpenBattle(undefined, { eco: "", name: line.name, moves: line.moves, family: line.name, variation: "" }, line.side)
        }
        onDelete={() => {
          const bookId = myLineBookId(line);
          onUpdateStore(prev => ({
            ...prev,
            lines: prev.lines.filter(l => l.id !== line.id),
            cards: Object.fromEntries(Object.entries(prev.cards).filter(([, c]) => c.bookId !== bookId)),
            reviews: prev.reviews.filter(r => r.bookId !== bookId)
          }));
          setRoute({ view: "lines" });
        }}
      />
    );
  }

  if (route.view === "line-new") {
    return (
      <LineBuilder
        settings={settings}
        openingTree={openingTree}
        onBack={() => setRoute({ view: "lines" })}
        onSave={(name, side, moves) => {
          const id = generateUuid();
          onUpdateStore(prev => ({
            ...prev,
            lines: [...prev.lines, { id, name: freeName(name, prev.lines.map(l => l.name)), side, moves }]
          }));
          setRoute({ view: "line", lineId: id });
        }}
      />
    );
  }

  if (route.view === "from-games") {
    return (
      <FromYourGamesPage
        findings={findings}
        settings={settings}
        onBack={() => setRoute({ view: "hub" })}
        onTrainLine={(bookId, path) => {
          const ui = bookUis.find(b => b.book.id === bookId);
          if (ui && ui.fresh > 0) {
            setRoute({ view: "run", spec: { kind: "learn", bookId, within: path }, back: { view: "from-games" } });
          } else {
            setRoute({ view: "opening", bookId });
          }
        }}
        onTrainEnding={setId => setRoute({ view: "position-run", setId })}
      />
    );
  }

  if (route.view === "positions") {
    return (
      <PositionSetsPage
        kind={route.kind}
        sets={(sets ?? []).filter(s => s.kind === route.kind)}
        records={store.positions}
        settings={settings}
        onOpen={id => setRoute({ view: "position-run", setId: id })}
        onBack={() => setRoute({ view: "hub" })}
      />
    );
  }

  if (route.view === "opening") {
    const ui = bookUis.find(b => b.book.id === route.bookId);
    if (!ui) return <BackOnly onBack={() => setRoute({ view: "hub" })} />;
    return (
      <OpeningPage
        ui={ui}
        store={store}
        band={band(ui.book)}
        isDark={isDark}
        onBack={() => setRoute({ view: "side", side: ui.book.side })}
        onRun={spec => setRoute({ view: "run", spec, back: route })}
        onPlayOut={() => onOpenBattle(nodeAt(ui.book, fenAfter(ui.book.start))?.name ?? ui.book.title)}
      />
    );
  }

  if (route.view === "side") {
    const mine = bookUis.filter(b => b.book.side === route.side);
    const due = mine.reduce((s, b) => s + b.due, 0);
    return (
      <div className="ct2-page" style={{ gap: 0 }}>
        <BackBar onBack={() => setRoute({ view: "hub" })} />
        <ScreenTitle title={route.side === "w" ? "As White" : "As Black"} />
        <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {due > 0 ? (
            <PrimaryButton onClick={() => setRoute({ view: "run", spec: { kind: "review", bookId: null }, back: route })}>
              Review {due}
            </PrimaryButton>
          ) : null}
          <div>
            {mine.map(ui => (
              <button
                key={ui.book.id}
                type="button"
                className="ct2-list-row"
                onClick={() => setRoute({ view: "opening", bookId: ui.book.id })}
              >
                <span className="ct2-thumb">
                  <BoardPicture
                    fen={fenAfter(ui.book.start)}
                    boardThemeId={settings.boardThemeId}
                    pieceSet={settings.pieceSetId}
                    whiteAtBottom={ui.book.side === "w"}
                    aspect={1}
                    zoom={1}
                  />
                </span>
                <span className="ct2-list-text">
                  <strong>{ui.book.title}</strong>
                  <small>
                    {ui.due > 0 ? `${ui.due} due · ` : ""}
                    {ui.introduced ? `${percent(ui.readiness)} ready` : "Not started"}
                  </small>
                </span>
                <Ring share={ui.readiness} size={40} />
              </button>
            ))}
            {books && mine.length === 0 ? <p className="ct2-caption">No openings for this side yet.</p> : null}
            <ListRow
              title="Any opening vs Stockfish"
              subtitle="Opening battle, from 3,865 lines"
              icon="sports_esports"
              onClick={() => onOpenBattle()}
            />
          </div>
        </div>
      </div>
    );
  }

  // Train home
  const allQueue = buildReviewQueue(allIndexes, Object.values(store.cards), now, 1000);
  const dueTotal = allQueue.length;
  const dueSamples = allQueue.slice(0, 3);
  const minutes = Math.max(1, Math.floor((dueTotal + 1) / 2));
  return (
    <div className="ct2-page">
      <ScreenTitle title="Train" />
      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ct2-card ct2-today ct2-enter">
          <div className="ct2-today-top">
            <div style={{ flex: 1 }}>
              <div className="ct2-label-muted">Today</div>
              {dueTotal > 0 ? (
                <>
                  <div className="ct2-huge">{dueTotal}</div>
                  <div className="ct2-caption">
                    About {minutes} minute{minutes === 1 ? "" : "s"}
                  </div>
                </>
              ) : (
                <div className="ct2-today-none">Nothing due</div>
              )}
            </div>
            <div className="ct2-today-boards">
              {dueSamples.map(card => (
                <span key={card.state.key + card.index.book.id} className="ct2-mini-board">
                  <BoardPicture
                    fen={fenAfter(card.path)}
                    boardThemeId={settings.boardThemeId}
                    pieceSet={settings.pieceSetId}
                    whiteAtBottom={card.index.book.side === "w"}
                    aspect={1}
                    zoom={1}
                  />
                </span>
              ))}
            </div>
          </div>
          {dueTotal > 0 ? (
            <PrimaryButton onClick={() => setRoute({ view: "run", spec: { kind: "review", bookId: null }, back: { view: "hub" } })}>
              Start
            </PrimaryButton>
          ) : null}
        </div>

        <div className="ct2-label-muted" style={{ marginTop: 4 }}>
          Openings
        </div>
        <div className="ct2-pair ct2-enter" style={{ animationDelay: "60ms" }}>
          {(["w", "b"] as const).map(side => {
            const mine = bookUis.filter(b => b.book.side === side);
            const started = mine.filter(b => b.introduced > 0);
            return (
              <ArtTile
                key={side}
                dark={isDark}
                scene={side === "w" ? "openings" : "position"}
                title={side === "w" ? "As White" : "As Black"}
                subtitle={mine.map(b => b.book.title).join(", ") || "Loading…"}
                progress={started.length ? started.reduce((s, b) => s + b.readiness, 0) / started.length : undefined}
                ariaLabel={`Openings as ${side === "w" ? "White" : "Black"}`}
                onClick={() => setRoute({ view: "side", side })}
              />
            );
          })}
        </div>
        <div className="ct2-pair ct2-enter" style={{ animationDelay: "120ms" }}>
          <ArtTile
            dark={isDark}
            scene="endgames"
            title="Endgames"
            subtitle="Win this"
            onClick={() => setRoute({ view: "positions", kind: "endgame" })}
          />
          <ArtTile
            dark={isDark}
            scene="middlegame"
            title="Middlegames"
            subtitle="Convert this"
            onClick={() => setRoute({ view: "positions", kind: "middlegame" })}
          />
        </div>
        <ListRow
          title="Openings vs Stockfish"
          leading={
            <span className="ct2-list-icon">
              <MetalIcon icon="sports_esports" size={36} />
            </span>
          }
          onClick={() => setRoute({ view: "lines" })}
        />
        <ListRow
          title="From your games"
          subtitle={findings && findings.games === 0 ? "Play or import games to see your patterns" : undefined}
          leading={
            <span className="ct2-list-icon">
              <MetalIcon icon="analytics" size={36} />
            </span>
          }
          trailing={findings && findings.list.length > 0 ? <strong className="ct2-count">{findings.list.length}</strong> : undefined}
          onClick={() => setRoute({ view: "from-games" })}
        />
      </div>
    </div>
  );
}

/* From your games ------------------------------------------------------------------ */

function FromYourGamesPage({
  findings,
  settings,
  onBack,
  onTrainLine,
  onTrainEnding
}: {
  findings: { games: number; reviewed: number; list: GameFinding[] } | null;
  settings: AppSettings;
  onBack: () => void;
  onTrainLine: (bookId: string, path: string[]) => void;
  onTrainEnding: (setId: string) => void;
}) {
  return (
    <div className="ct2-page" style={{ gap: 0 }}>
      <BackBar onBack={onBack} />
      <ScreenTitle title="From your games" />
      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {findings ? (
          <p className="ct2-caption">
            {findings.games} game{findings.games === 1 ? "" : "s"}
            {findings.reviewed > 0 ? ` · ${findings.reviewed} reviewed` : ""}
          </p>
        ) : (
          <p className="ct2-caption">Looking through your games…</p>
        )}
        {findings && findings.list.length === 0 ? (
          <p className="ct2-body-muted">
            {findings.games === 0
              ? "Import your games in Account, or play a few here."
              : "Nothing comes back yet. A slip shows here once it repeats."}
          </p>
        ) : null}
        {findings?.list.map((f, i) => {
          if (f.kind === "line-slip") {
            return (
              <div key={`s${i}`} className="ct2-card ct2-finding">
                <div className="ct2-finding-top">
                  <span className="ct2-thumb ct2-thumb-big">
                    <BoardPicture
                      fen={f.fen}
                      boardThemeId={settings.boardThemeId}
                      pieceSet={settings.pieceSetId}
                      whiteAtBottom={f.side === "w"}
                      aspect={1}
                      zoom={1}
                    />
                  </span>
                  <div>
                    <div className="ct2-caption">
                      {f.bookTitle}
                      {f.after ? ` · after ${f.after}` : ""}
                    </div>
                    <div className="ct2-finding-figure">
                      <span className="ct2-huge">
                        {f.misses}/{f.reached}
                      </span>
                      <span className="ct2-caption">
                        you played <strong className="ct2-error-word">{f.played}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <p className="ct2-finding-text">
                  {f.note ? `${f.note} ` : ""}
                  <strong>{f.right}</strong> is the line.
                </p>
                <PrimaryButton onClick={() => onTrainLine(f.bookId, f.path)}>Train it</PrimaryButton>
              </div>
            );
          }
          if (f.kind === "ending") {
            const meta = ENDINGS[f.ending];
            return (
              <button key={`e${i}`} type="button" className="ct2-card ct2-finding is-button" onClick={() => onTrainEnding(meta.setId)}>
                <strong className="ct2-finding-title">{meta.title}</strong>
                <span className="ct2-caption">
                  Won {f.won} of {f.reached} a pawn or more up
                </span>
                <span className="ct2-thin-track ct2-success-track">
                  <span style={{ width: `${(f.won / f.reached) * 100}%` }} />
                </span>
              </button>
            );
          }
          return (
            <div key={`m${i}`} className="ct2-card ct2-finding">
              <div className="ct2-finding-row">
                <strong className="ct2-finding-title">{[f.opening, f.after].filter(Boolean).join(" · ") || f.played}</strong>
                <span className="ct2-caption">
                  {f.times} of {f.reached} games
                </span>
              </div>
              <span className="ct2-caption">
                You played {f.played}.{f.better ? ` ${f.better} was better.` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Shared bits ----------------------------------------------------------------- */

function BackBar({ onBack, children }: { onBack: () => void; children?: ReactNode }) {
  return (
    <div className="ct2-back-bar">
      <button type="button" className="ct2-icon-btn" aria-label="Back" onClick={onBack}>
        <ArrowLeft size={22} />
      </button>
      {children}
    </div>
  );
}

function BackOnly({ onBack }: { onBack: () => void }) {
  return (
    <div className="ct2-page">
      <BackBar onBack={onBack} />
    </div>
  );
}

function Ring({ share, size = 60, label }: { share: number; size?: number; label?: string }) {
  const stroke = size >= 56 ? 5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, share));
  return (
    <span className="ct2-ring" style={{ width: size, height: size }} aria-label={`${percent(v)} ready`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {v > 0 ? <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--text)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        /> : null}
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}

const CUPS = ["/assets/art/medal_cup_bronze.webp", "/assets/art/medal_cup_silver.webp", "/assets/art/medal_cup_gold.webp"];

/* The opening page -------------------------------------------------------------- */

function OpeningPage({
  ui,
  store,
  band,
  isDark,
  onBack,
  onRun,
  onPlayOut
}: {
  ui: BookUi;
  store: TrainStore;
  band: number | null;
  isDark: boolean;
  onBack: () => void;
  onRun: (spec: TrainRunSpec) => void;
  onPlayOut: () => void;
}) {
  const { book, index, levels } = ui;
  const states = useMemo(() => {
    const out: Record<string, CardState> = {};
    for (const c of Object.values(store.cards)) if (c.bookId === book.id) out[cardId(book.id, c.key)] = c;
    return out;
  }, [store.cards, book.id]);
  const variations = useMemo(() => variationsOf(index, band, levels.unlocked, states), [index, band, levels.unlocked, states]);
  const mastery = ([0, 1, 2] as RepertoireLevel[]).map(l => masteryOf(book, l, states, store.reviews));
  const next = useMemo(
    () => planLearn(index, levels.unlocked, introducedSet(store, book.id)),
    [index, levels.unlocked, store, book.id]
  );
  const nextName = next ? segmentVariation(next) : null;
  const intro = bookIntro(book);
  const open = levels.unlocked;
  const within = mastery[open].total ? mastery[open].settled / mastery[open].total : 0;
  const filled = Math.max(0, Math.min(1, (open + (levels.masteredAt[open] !== undefined ? 1 : within)) / 2));
  const longest = Math.max(0.01, ...variations.map(v => v.share));

  return (
    <div className="ct2-page" style={{ gap: 0, paddingTop: 0 }}>
      <div className="ct2-opening-hero">
        <img
          src={`/assets/art/art_openings_${isDark ? "night" : "day"}.webp`}
          alt=""
          className={`ct2-account-hero-art ${isDark ? "is-night" : "is-day"}`}
        />
        <div className="ct2-account-hero-fade" />
        <button type="button" className="ct2-icon-btn ct2-hero-back" aria-label="Back" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <div className="ct2-opening-hero-words">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="ct2-display">{book.title}</h1>
            <p className="ct2-caption">{book.side === "w" ? "As White" : "As Black"}</p>
          </div>
          <Ring share={ui.readiness} label={percent(ui.readiness)} />
        </div>
      </div>

      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <div className="ct2-cup-rail">
          <div className="ct2-cup-line">
            <div style={{ width: `${filled * 100}%` }} />
          </div>
          {([0, 1, 2] as RepertoireLevel[]).map(l => {
            const won = levels.masteredAt[l] !== undefined;
            const isOpen = l <= open;
            return (
              <div key={l} className={`ct2-cup ${won ? "is-won" : l === open ? "is-open" : ""}`}>
                <img src={CUPS[l]} alt="" />
                <strong className={isOpen ? "" : "is-muted"}>{LEVEL_NAMES[l]}</strong>
                <small>
                  {!isOpen ? <Lock size={11} /> : null}
                  {isOpen && !won ? `${mastery[l].settled} / ${mastery[l].total}` : mastery[l].total}
                </small>
              </div>
            );
          })}
        </div>
        {intro && !ui.introduced ? <p className="ct2-caption">{intro.text}</p> : null}
        {ui.due > 0 ? (
          <PrimaryButton onClick={() => onRun({ kind: "review", bookId: book.id })}>Review {ui.due}</PrimaryButton>
        ) : null}
        {ui.fresh > 0 ? (
          ui.due > 0 ? (
            <button type="button" className="ct2-secondary" onClick={() => onRun({ kind: "learn", bookId: book.id, within: null })}>
              {nextName ? `New line · ${nextName}` : "New line"}
            </button>
          ) : (
            <PrimaryButton onClick={() => onRun({ kind: "learn", bookId: book.id, within: null })}>
              {nextName ? `New line · ${nextName}` : "New line"}
            </PrimaryButton>
          )
        ) : null}
      </div>

      {variations.length ? (
        <div className="ct2-gutter" style={{ marginTop: 20 }}>
          <h3 className="ct2-small-title">Variations</h3>
          {variations.map(v => {
            const isOpen = v.cards > 0;
            const fresh = isOpen && v.cards > v.introduced;
            return (
              <button
                key={v.path.join(" ")}
                type="button"
                className="ct2-variation"
                disabled={!fresh}
                onClick={() => onRun({ kind: "learn", bookId: book.id, within: v.path })}
                aria-label={`${variationLabel(v)}, ${percent(v.share)} of games, ${v.solid} of ${v.cards} solid`}
              >
                <span className="ct2-variation-top">
                  <strong className={isOpen ? "" : "is-muted"}>{variationLabel(v)}</strong>
                  {v.name ? <small>{v.move}</small> : null}
                  <span style={{ flex: 1 }} />
                  {!isOpen ? <Lock size={13} /> : null}
                  <small>{percent(v.share)}</small>
                </span>
                <span className="ct2-variation-bar" style={{ width: `${Math.max(4, (v.share / longest) * 100)}%` }}>
                  {v.cards ? (
                    <>
                      <span className="is-met" style={{ width: `${(v.introduced / v.cards) * 100}%` }} />
                      <span className="is-solid" style={{ width: `${(v.solid / v.cards) * 100}%` }} />
                    </>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="ct2-gutter" style={{ marginTop: 8 }}>
        {ui.tricky > 0 ? (
          <ListRow
            title="Tricky lines"
            leading={
              <span className="ct2-list-icon">
                <MetalIcon icon="history" size={36} />
              </span>
            }
            trailing={<small className="ct2-caption">{ui.tricky}</small>}
            onClick={() => onRun({ kind: "tricky", bookId: book.id })}
          />
        ) : null}
        <ListRow
          title="Play it out"
          subtitle="Against a bot, from the opening's moves"
          leading={
            <span className="ct2-list-icon">
              <MetalIcon icon="flag" size={36} />
            </span>
          }
          onClick={onPlayOut}
        />
      </div>
    </div>
  );
}

/* A learn, review or tricky-lines run ------------------------------------------------ */

type RunState =
  | { kind: "learn"; run: LearnRun }
  | { kind: "review"; session: ReviewSession; tricky: boolean }
  | { kind: "empty" };

function RepertoireRun({
  spec,
  indexes,
  store,
  settings,
  onSave,
  onLearnMore,
  onBack
}: {
  spec: TrainRunSpec;
  indexes: RepertoireIndex[];
  store: TrainStore;
  settings: AppSettings;
  onSave: (outcome: [CardState, CardReview][]) => { book: RepertoireBook; level: RepertoireLevel } | null;
  onLearnMore: (spec: TrainRunSpec) => void;
  onBack: () => void;
}) {
  // The run is built once, from the store as it was when the run opened.
  const [state] = useState<RunState>(() => {
    if (!indexes.length) return { kind: "empty" };
    if (spec.kind === "learn") {
      const index = indexes.find(i => i.book.id === spec.bookId);
      if (!index) return { kind: "empty" };
      const segment = planLearn(index, levelsOf(store, index.book.id).unlocked, introducedSet(store, index.book.id), undefined, spec.within);
      return segment ? { kind: "learn", run: new LearnRun(index, segment) } : { kind: "empty" };
    }
    if (spec.kind === "drill") {
      const index = indexes.find(i => i.book.id === spec.bookId);
      if (!index) return { kind: "empty" };
      const known = introducedSet(store, index.book.id);
      const own = cardsOf(index.book).map(n => n.key).filter(k => !known.has(k));
      return { kind: "learn", run: new LearnRun(index, { moves: spec.moves, newCards: own, name: index.book.title }) };
    }
    const scope = spec.bookId ? indexes.filter(i => i.book.id === spec.bookId) : indexes;
    const cards = Object.values(store.cards);
    const queue: DueCard[] = spec.kind === "tricky" ? trickyQueue(scope, cards) : buildReviewQueue(scope, cards, Date.now());
    return queue.length ? { kind: "review", session: new ReviewSession(queue), tricky: spec.kind === "tricky" } : { kind: "empty" };
  });
  const [, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);
  const [ring, setRing] = useState<{ square: string; right: boolean } | null>(null);
  const [answer, setAnswer] = useState<CardAnswer | null>(null);
  const [hintFrom, setHintFrom] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [mastered, setMastered] = useState<{ book: RepertoireBook; level: RepertoireLevel } | null>(null);
  const saved = useRef(false);

  const book = state.kind === "learn" ? state.run.book : state.kind === "review" ? state.session.current?.index.book ?? state.session.cards[0]?.index.book : undefined;
  const fen = state.kind === "learn" ? state.run.fen : state.kind === "review" ? state.session.fen : fenAfter([]);
  const finished = state.kind === "learn" ? state.run.pass === "done" : state.kind === "review" ? state.session.finished : true;
  const watching = state.kind === "learn" && state.run.pass === "watch";

  // The line plays itself while watching, and the opponent's moves come by themselves.
  useEffect(() => {
    if (finished) return;
    let timer: number | undefined;
    if (state.kind === "learn") {
      const run = state.run;
      if (run.pass === "watch") {
        timer = window.setTimeout(() => {
          if (run.watchNext()) {
            playCue("move", settings.soundEnabled);
            bump();
          }
        }, run.ply === run.startPly ? 700 : 950);
      } else if (run.pass === "recall" && !run.isOwnTurn) {
        timer = window.setTimeout(() => {
          if (run.playOpponent()) {
            playCue("move", settings.soundEnabled);
            setRing(null);
            bump();
          }
        }, 450);
      }
    } else if (state.kind === "review") {
      const s = state.session;
      if (s.done) {
        timer = window.setTimeout(() => {
          s.next();
          setRing(null);
          setAnswer(null);
          setHintFrom(null);
          setWhy(null);
          setStep(x => x + 1);
          bump();
        }, s.shown ? 1600 : 900);
      } else if (!s.isOwnTurn && !s.atCard) {
        timer = window.setTimeout(() => {
          if (s.playOpponent()) {
            playCue("move", settings.soundEnabled);
            setRing(null);
            bump();
          }
        }, 450);
      }
    }
    return () => window.clearTimeout(timer);
  });

  // Save once the run is over.
  useEffect(() => {
    if (!finished || saved.current || state.kind === "empty") return;
    saved.current = true;
    const outcome = state.kind === "learn" ? state.run.outcome : state.session.outcome;
    const won = onSave(outcome);
    if (won) setMastered(won);
    playCue("success", settings.soundEnabled);
  }, [finished, state, onSave, settings.soundEnabled]);

  if (state.kind === "empty" || !book) {
    return (
      <div className="ct2-board-screen">
        <BoardTopBar title="Train" onBack={onBack} />
        <div className="ct2-board-zone">
          <h2 className="ct2-run-line">{indexes.length ? "Nothing to do here" : "Loading…"}</h2>
          <p className="ct2-caption">{indexes.length ? "Everything in this opening is learnt or not due yet." : ""}</p>
        </div>
        <div className="ct2-board-controls">
          <PrimaryButton onClick={onBack}>Done</PrimaryButton>
        </div>
      </div>
    );
  }

  const ownTurn = state.kind === "learn" ? state.run.isOwnTurn : state.session.isOwnTurn;
  const shown = state.kind === "learn" ? state.run.shown : state.session.shown;
  const lastMove = state.kind === "learn" ? state.run.lastMove : state.session.lastMove;

  const handleMove = (uci: string) => {
    if (!ownTurn) return;
    const to = uci.slice(2, 4);
    let result: CardAnswer | null;
    if (state.kind === "learn") {
      const wasNew = state.run.isNewCard;
      result = state.run.submit(uci);
      if (result === "right" && wasNew) setStep(x => x + 1);
    } else {
      result = state.session.submit(uci);
    }
    if (!result) return;
    setAnswer(result);
    setHintFrom(null);
    setWhy(null);
    if (result === "right") {
      setRing({ square: to, right: true });
      playCue("correct", settings.soundEnabled);
    } else if (result === "wrong") {
      setRing({ square: to, right: false });
      playCue("wrong", settings.soundEnabled);
      triggerHaptic("wrong", settings.hapticsEnabled);
    } else {
      setRing(null);
    }
    bump();
  };

  const onHint = () => {
    const from = state.kind === "learn" ? state.run.hint() : state.session.hint();
    if (from) {
      setHintFrom(from);
      bump();
    }
  };

  const onShow = () => {
    if (state.kind === "learn") state.run.showAnswer();
    else state.session.showAnswer();
    setRing(null);
    setAnswer("wrong");
    bump();
  };

  const node = nodeAt(book, fen);
  const noteHere = node?.note ?? null;

  // The words above the board.
  let line: string | null = null;
  let quiet: string | null = null;
  if (finished) {
    if (state.kind === "learn") {
      const out = state.run.outcome;
      line = "Line learnt";
      quiet = `${out.filter(o => o[1].firstTryRight).length} of ${out.length} first try. Back tomorrow.`;
    } else {
      const total = state.session.outcome.length;
      line = `${total} position${total === 1 ? "" : "s"}`;
      quiet = `${state.session.rightFirstTime} of ${total} first try.`;
    }
  } else if (watching) {
    line = noteHere?.kind === "branch" || noteHere?.kind === "trap" ? firstSentence(noteHere.text) : "Watch the line";
  } else if (shown) {
    line = `Play ${sanOf(fen, shown)}`;
    quiet = state.kind === "learn" ? null : "This position comes back sooner.";
  } else if (answer === "also" && node?.move) {
    line = "Also good";
    quiet = `Your move here is ${sanOf(fen, node.move)}.`;
  } else if (state.kind === "review" && state.session.done) {
    line = answer === "right" && !state.session.shown ? null : "Comes back today";
  } else if (state.kind === "learn" && state.run.ply === state.run.startPly && ownTurn) {
    line = "Your turn";
    quiet = "Play the line back.";
  } else if (ownTurn) {
    line = "Your move";
    if (state.kind === "review" && state.session.current?.fromStart) quiet = "A tricky line, from the start.";
    else if (state.kind === "review" && state.session.atCard && state.session.current?.path.length) {
      const path = state.session.current.path;
      const before = fenAfter(path.slice(0, -1));
      quiet = `What do you play against ${numbered(before, path[path.length - 1], path.length - 1)}?`;
    }
  }

  const arrows: BoardArrow[] = [];
  if (shown) arrows.push({ from: shown.slice(0, 2), to: shown.slice(2, 4), kind: "hint" });
  else if (answer === "also" && node?.move) arrows.push({ from: node.move.slice(0, 2), to: node.move.slice(2, 4), kind: "hint" });
  else if (watching && state.kind === "learn" && state.run.nextWatched) {
    const n = state.run.nextWatched;
    arrows.push({ from: n.slice(0, 2), to: n.slice(2, 4), kind: "idea" });
  }
  const highlights: BoardHighlight[] = [];
  if (hintFrom) highlights.push({ square: hintFrom, kind: "idea" });
  if (ring) highlights.push({ square: ring.square, kind: ring.right ? "good" : "bad" });

  const steps = state.kind === "learn" ? state.run.segment.newCards.length : state.session.cards.length;
  const title =
    state.kind === "learn"
      ? segmentVariation(state.run.segment) ?? book.title
      : state.tricky
      ? "Tricky lines"
      : spec.kind === "review" && spec.bookId === null
      ? "Today"
      : book.title;
  const moreToLearn =
    state.kind === "learn" &&
    spec.kind === "learn" &&
    finished &&
    planLearn(state.run.index, levelsOf(store, book.id).unlocked, new Set([...introducedSet(store, book.id), ...state.run.segment.newCards])) !== null;

  return (
    <div className="ct2-board-screen">
      <BoardTopBar title={title} onBack={onBack} />
      <div className="ct2-board-zone" aria-live="polite">
        {watching ? (
          <div className="ct2-watch-label">WATCH</div>
        ) : (
          <div className="ct2-run-progress">
            {state.kind === "learn" || steps <= 12 ? (
              <span className="ct2-dots">
                {Array.from({ length: steps }, (_, i) => (
                  <span key={i} className={i < step ? "is-done" : i === step && !finished ? "is-now" : ""} />
                ))}
              </span>
            ) : (
              <span className="ct2-thin-track" style={{ flex: 1 }}>
                <span style={{ display: "block", height: "100%", width: `${(step / steps) * 100}%`, background: "var(--accent)" }} />
              </span>
            )}
            {state.kind === "review" ? (
              <small className="ct2-caption">
                {Math.min(step + 1, steps)} / {steps}
              </small>
            ) : null}
          </div>
        )}
        <div className="ct2-run-words">
          {line ? <h2 className="ct2-run-line">{line}</h2> : null}
          {why ? <p className="ct2-run-why">{why}</p> : quiet ? <p className="ct2-caption">{quiet}</p> : null}
        </div>
      </div>
      <div className="ct2-board-area">
        <BoardHost
          fen={fen}
          orientation={book.side}
          interactive={ownTurn && !finished}
          allowedSide={book.side}
          boardColorsId={settings.boardThemeId}
          pieceSetId={settings.pieceSetId}
          showCoordinates={settings.showCoordinates}
          showLegalDots={settings.showLegalDots}
          autoQueen={settings.autoQueen}
          reduceMotion={settings.reduceMotion}
          lastMove={lastMove}
          arrows={arrows}
          highlights={highlights}
          onMove={handleMove}
        />
      </div>
      <div className="ct2-board-controls">
        {watching && state.kind === "learn" ? (
          <>
            <Control icon={<RotateCcw size={20} />} label="Again" onClick={() => { state.run.watchAgain(); bump(); }} />
            <Control icon={<SkipForward size={20} />} label="Skip" onClick={() => { state.run.skipWatch(); bump(); }} />
          </>
        ) : finished ? (
          moreToLearn ? (
            <>
              <button type="button" className="ct2-ghost" onClick={onBack}>
                Done
              </button>
              <PrimaryButton onClick={() => onLearnMore({ kind: "learn", bookId: book.id, within: spec.kind === "learn" ? spec.within : null })}>
                Next line
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton onClick={onBack}>Done</PrimaryButton>
          )
        ) : (
          <>
            <Control icon={<Lightbulb size={20} />} label="Hint" disabled={!ownTurn || Boolean(shown)} onClick={onHint} />
            <Control icon={<Eye size={20} />} label="Show me" disabled={!ownTurn || Boolean(shown)} onClick={onShow} />
            <Control
              icon={<span className="ct2-why-mark">?</span>}
              label="Why"
              disabled={!noteHere}
              onClick={() => setWhy(noteHere?.text ?? null)}
            />
          </>
        )}
      </div>
      {mastered ? (
        <div className="ct2-sheet-scrim" onClick={() => setMastered(null)}>
          <div className="ct2-sheet" role="dialog" aria-label="Level mastered" onClick={e => e.stopPropagation()}>
            <div className="ct2-sheet-handle" aria-hidden="true" />
            <div className="ct2-mastered">
              <img src={CUPS[mastered.level]} alt="" />
              <h2 className="ct2-display">
                {mastered.level === 2 ? `${mastered.book.title} mastered` : `${LEVEL_NAMES[mastered.level]} mastered`}
              </h2>
              <p className="ct2-caption">
                {mastered.level === 2
                  ? "Every line, every level."
                  : `${LEVEL_NAMES[mastered.level + 1]} is open: ${
                      cardsOf(mastered.book, (mastered.level + 1) as RepertoireLevel).length - cardsOf(mastered.book, mastered.level).length
                    } new positions.`}
              </p>
              <PrimaryButton onClick={() => setMastered(null)}>
                {mastered.level === 2 ? "Done" : `Start ${LEVEL_NAMES[mastered.level + 1]}`}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

function numbered(fen: string, uci: string, plyIndex: number): string {
  const number = Math.floor(plyIndex / 2) + 1;
  return `${number}${plyIndex % 2 === 0 ? "." : "..."}${sanOf(fen, uci)}`;
}

function BoardTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="ct2-board-topbar">
      <button type="button" className="ct2-icon-btn" aria-label="Back" onClick={onBack}>
        <ArrowLeft size={22} />
      </button>
      <h1>{title}</h1>
      <span style={{ width: 40 }} />
    </header>
  );
}

function Control({
  icon,
  label,
  onClick,
  disabled
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="ct2-control" onClick={onClick} disabled={disabled}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* Endgames and middlegames -------------------------------------------------------------- */

function PositionSetsPage({
  kind,
  sets,
  records,
  settings,
  onOpen,
  onBack
}: {
  kind: PositionKind;
  sets: PositionSet[];
  records: Record<string, PositionRecord>;
  settings: AppSettings;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="ct2-page" style={{ gap: 0 }}>
      <BackBar onBack={onBack} />
      <ScreenTitle title={kind === "endgame" ? "Endgames" : "Middlegames"} />
      <div className="ct2-gutter" style={{ marginTop: 8 }}>
        {sets.map(set => {
          const first = set.positions[0];
          const won = set.positions.filter(p => records[p.id]?.won).length;
          return (
            <button key={set.id} type="button" className="ct2-list-row" onClick={() => onOpen(set.id)} aria-label={`Play ${set.title}`}>
              <span className="ct2-thumb">
                <BoardPicture
                  fen={first.fen}
                  boardThemeId={settings.boardThemeId}
                  pieceSet={settings.pieceSetId}
                  whiteAtBottom={sideOf(first) === "w"}
                  aspect={1}
                  zoom={1}
                />
              </span>
              <span className="ct2-list-text">
                <strong>{set.title}</strong>
                <small>
                  {set.positions.length} position{set.positions.length === 1 ? "" : "s"} · {first.aim}
                </small>
              </span>
              <Ring share={won / set.positions.length} size={40} label={`${won}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

type PositionEnd = "mated" | "promoted" | "converted" | "held" | "drawn" | "lost" | "gave-up";

interface PositionRunState {
  index: number;
  fen: string;
  lastMove: string | null;
  outcome: "playing" | "won" | "held" | "slipped";
  end: PositionEnd | null;
  learnerMoves: number;
  promoted: boolean;
  thinking: boolean;
  hintFrom: string | null;
  hintTo: string | null;
  slip: string | null;
  better: string | null;
}

const THINK_MS = 800;

function PositionRun({
  set,
  records,
  settings,
  onSave,
  onBack
}: {
  set: PositionSet;
  records: Record<string, PositionRecord>;
  settings: AppSettings;
  onSave: (id: string, record: PositionRecord) => void;
  onBack: () => void;
}) {
  const [queue] = useState<TrainPosition[]>(() => positionQueue(set, records, epochDay()));
  const game = useRef<Chess>(new Chess(queue[0].fen));
  const best = useRef<string | null>(null);
  const token = useRef(0);
  const [run, setRun] = useState<PositionRunState>(() => fresh(0));

  function fresh(index: number): PositionRunState {
    return {
      index,
      fen: queue[index].fen,
      lastMove: null,
      outcome: "playing",
      end: null,
      learnerMoves: 0,
      promoted: false,
      thinking: true,
      hintFrom: null,
      hintTo: null,
      slip: null,
      better: null
    };
  }

  const position = queue[run.index];
  const side = sideOf(position);
  const ended = run.outcome !== "playing";

  const evaluate = async (fen: string) => {
    try {
      return await analysePosition(fen, { movetimeMs: THINK_MS });
    } catch {
      return null;
    }
  };

  const open = useCallback(
    (index: number) => {
      const my = ++token.current;
      game.current = new Chess(queue[index].fen);
      best.current = null;
      setRun(fresh(index));
      void evaluate(queue[index].fen).then(e => {
        if (token.current !== my) return;
        best.current = e?.bestMove ?? null;
        setRun(r => ({ ...r, thinking: false }));
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue]
  );

  useEffect(() => {
    open(0);
    return () => {
      token.current++;
    };
  }, [open]);

  const finish = (outcome: PositionRunState["outcome"], end: PositionEnd) => {
    const keep = outcome === "slipped";
    setRun(r => ({
      ...r,
      outcome,
      end,
      thinking: false,
      hintFrom: null,
      hintTo: null,
      slip: keep && end !== "gave-up" ? r.slip : null,
      better: keep && end !== "gave-up" ? r.better : null
    }));
    const before = records[position.id] ?? { won: false, dueDay: null };
    onSave(position.id, keep ? { ...before, dueDay: epochDay() + 1 } : { won: true, dueDay: null });
    playCue(keep ? "error" : "success", settings.soundEnabled);
  };

  const endOf = (outcome: PositionRunState["outcome"], promoted: boolean, mated: boolean, lost = false): PositionEnd => {
    if (outcome === "won") return mated ? "mated" : position.goal === "convert" ? "converted" : promoted ? "promoted" : "mated";
    if (outcome === "held") return "held";
    return lost || position.goal === "hold" ? "lost" : "drawn";
  };

  const onMove = (uci: string) => {
    if (ended || run.thinking) return;
    const chess = game.current;
    const before = chess.fen();
    let moved;
    try {
      moved = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    } catch {
      return;
    }
    playCue(moved.captured ? "capture" : "move", settings.soundEnabled);
    const promoted = run.promoted || Boolean(moved.promotion);
    const moves = run.learnerMoves + 1;
    const ply = (Number(before.split(" ")[5]) - 1) * 2 + (before.split(" ")[1] === "b" ? 1 : 0);
    const slip = numbered(before, uci, ply);
    const better = best.current && best.current !== uci ? sanOf(before, best.current) : null;
    setRun(r => ({
      ...r,
      fen: chess.fen(),
      lastMove: uci,
      learnerMoves: moves,
      promoted,
      hintFrom: null,
      hintTo: null,
      thinking: true,
      slip,
      better
    }));
    const done = endedOutcome(position.goal, chess, side);
    if (done) {
      finish(done, endOf(done, promoted, done === "won"));
      return;
    }
    const my = token.current;
    void (async () => {
      const search = await evaluate(chess.fen());
      if (token.current !== my) return;
      const score = search ? learnerScore(search.scoreCp, search.mateIn, side) : null;
      const outcome = score ? scoredOutcome(position.goal, score, promoted, moves) : "playing";
      if (outcome !== "playing") {
        const lost = Boolean(score && ((score.mate !== null && score.mate < 0) || (score.mate === null && (score.cp ?? 0) <= -300)));
        finish(outcome, endOf(outcome, promoted, false, lost));
        return;
      }
      const legal = chess.moves({ verbose: true });
      const reply = (search?.bestMove && legal.find(m => m.lan === search.bestMove)) || legal[0];
      if (!reply) return;
      await new Promise(r => setTimeout(r, 350));
      if (token.current !== my) return;
      chess.move(reply);
      playCue(reply.captured ? "capture" : "move", settings.soundEnabled);
      const after = endedOutcome(position.goal, chess, side);
      setRun(r => ({ ...r, fen: chess.fen(), lastMove: reply.lan, thinking: after ? r.thinking : false }));
      if (after) {
        finish(after, endOf(after, promoted, false, after === "slipped" && chess.isCheckmate()));
        return;
      }
      best.current = search?.principalVariation?.[1] ?? null;
    })();
  };

  const hint = () => {
    const move = best.current;
    if (!move || ended || run.thinking) return;
    setRun(r => (r.hintFrom === null ? { ...r, hintFrom: move.slice(0, 2) } : { ...r, hintTo: move.slice(2, 4) }));
  };

  const giveUp = () => {
    if (ended) return;
    token.current++;
    finish("slipped", "gave-up");
  };

  const goalWord = position.goal === "win" ? "Win" : position.goal === "hold" ? "Hold" : "Convert";
  const plural = `${run.learnerMoves} move${run.learnerMoves === 1 ? "" : "s"}`;
  const words: [string, string | null, boolean] = (() => {
    switch (run.end) {
      case null:
        return [goalWord, null, true];
      case "mated":
        return ["Won", `Mate in ${plural}`, true];
      case "promoted":
        return ["Won", `Promoted in ${plural}`, true];
      case "converted":
        return ["Won", `Converted in ${plural}`, true];
      case "held":
        return ["Held", `Held for ${plural}`, true];
      case "drawn":
        return ["Only a draw", run.slip ? `${run.slip} let it slip` : null, false];
      case "lost":
        return ["Lost", run.slip ? `${run.slip} let it slip` : null, false];
      case "gave-up":
        return ["Given up", null, false];
    }
  })();
  const next = queue[run.index + 1];
  const under = !ended
    ? position.aim
    : run.outcome === "slipped"
    ? `Back tomorrow.${run.better ? ` ${run.better} was the move.` : ""}`
    : next
    ? `${queue.length - run.index - 1} more to go`
    : "Set done";

  const arrows: BoardArrow[] = run.hintFrom && run.hintTo ? [{ from: run.hintFrom, to: run.hintTo, kind: "hint" }] : [];
  const highlights: BoardHighlight[] = run.hintFrom && !run.hintTo ? [{ square: run.hintFrom, kind: "idea" }] : [];

  return (
    <div className="ct2-board-screen">
      <BoardTopBar title={set.title} onBack={() => { token.current++; onBack(); }} />
      <div className="ct2-board-zone" aria-live="polite">
        <div className="ct2-run-progress">
          <span className="ct2-dots">
            {queue.slice(0, 16).map((p, i) => (
              <span key={p.id} className={i < run.index ? "is-done" : i === run.index ? "is-now" : ""} />
            ))}
          </span>
          <small className="ct2-caption">
            {run.index + 1} of {queue.length}
          </small>
        </div>
        <div className="ct2-run-words">
          <h2 className="ct2-display">{words[0]}</h2>
          <div className="ct2-chips">
            {ended ? (
              words[1] ? <span className={`ct2-chip ${words[2] ? "is-good" : "is-bad"}`}>{words[1]}</span> : null
            ) : (
              <>
                <span className="ct2-chip">{side === "w" ? "White to move" : "Black to move"}</span>
                <span className="ct2-chip">{run.thinking && run.learnerMoves > 0 ? "Stockfish is thinking" : "Stockfish defends"}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="ct2-board-area">
        <BoardHost
          fen={run.fen}
          orientation={side}
          interactive={!ended && !run.thinking}
          allowedSide={side}
          boardColorsId={settings.boardThemeId}
          pieceSetId={settings.pieceSetId}
          showCoordinates={settings.showCoordinates}
          showLegalDots={settings.showLegalDots}
          autoQueen={settings.autoQueen}
          reduceMotion={settings.reduceMotion}
          lastMove={run.lastMove}
          arrows={arrows}
          highlights={highlights}
          onMove={onMove}
        />
        <p className="ct2-caption ct2-under">{under}</p>
      </div>
      <div className="ct2-board-controls">
        {ended ? (
          <>
            <button type="button" className="ct2-ghost" onClick={() => open(run.index)}>
              Again
            </button>
            {next ? (
              <PrimaryButton onClick={() => open(run.index + 1)}>Next position</PrimaryButton>
            ) : (
              <PrimaryButton onClick={onBack}>Done</PrimaryButton>
            )}
          </>
        ) : (
          <>
            <Control icon={<Lightbulb size={20} />} label="Hint" disabled={run.thinking} onClick={hint} />
            <Control icon={<RotateCcw size={20} />} label="Restart" onClick={() => open(run.index)} />
            <Control icon={<Flag size={20} />} label="Give up" onClick={giveUp} />
          </>
        )}
      </div>
    </div>
  );
}

/* Your openings --------------------------------------------------------------------- */

function MyLinesPage({
  lines,
  settings,
  onBack,
  onNew,
  onOpen,
  onAnyOpening
}: {
  lines: MyLine[];
  settings: AppSettings;
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onAnyOpening: () => void;
}) {
  return (
    <div className="ct2-page" style={{ gap: 0 }}>
      <BackBar onBack={onBack} />
      <ScreenTitle title="Your openings" />
      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
        {lines.length === 0 ? (
          <p className="ct2-body-muted">Build a line move by move, drill it, then play it out against Stockfish.</p>
        ) : (
          <div>
            {lines.map(line => (
              <button key={line.id} type="button" className="ct2-list-row" onClick={() => onOpen(line.id)} aria-label={`Open ${line.name}`}>
                <span className="ct2-thumb">
                  <BoardPicture
                    fen={endFen(line.moves)}
                    boardThemeId={settings.boardThemeId}
                    pieceSet={settings.pieceSetId}
                    whiteAtBottom={line.side === "w"}
                    aspect={1}
                    zoom={1}
                  />
                </span>
                <span className="ct2-list-text">
                  <strong>{line.name}</strong>
                  <small>
                    {line.side === "w" ? "As White" : "As Black"} · {Math.ceil(line.moves.length / 2)} moves
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
        <PrimaryButton onClick={onNew}>New line</PrimaryButton>
        <ListRow
          title="Any opening from the book"
          subtitle="Opening battle, from 3,865 lines"
          leading={
            <span className="ct2-list-icon">
              <MetalIcon icon="auto_stories" size={36} />
            </span>
          }
          onClick={onAnyOpening}
        />
      </div>
    </div>
  );
}

function MyLinePage({
  line,
  settings,
  onBack,
  onDrill,
  onPlay,
  onDelete
}: {
  line: MyLine;
  settings: AppSettings;
  onBack: () => void;
  onDrill: () => void;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="ct2-page" style={{ gap: 0 }}>
      <BackBar onBack={onBack} />
      <ScreenTitle title={line.name} />
      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="ct2-caption">{line.side === "w" ? "As White" : "As Black"}</p>
        <div className="ct2-line-board">
          <BoardPicture
            fen={endFen(line.moves)}
            boardThemeId={settings.boardThemeId}
            pieceSet={settings.pieceSetId}
            whiteAtBottom={line.side === "w"}
            aspect={1}
            zoom={1}
          />
        </div>
        <p className="ct2-body">{sanLine(line.moves)}</p>
        <PrimaryButton onClick={onDrill}>Drill it</PrimaryButton>
        <button type="button" className="ct2-secondary" onClick={onPlay}>
          Play it out vs Stockfish
        </button>
        <button type="button" className="ct2-ghost" style={{ width: "100%" }} onClick={() => setDeleting(true)}>
          Delete
        </button>
      </div>
      {deleting ? (
        <div className="ct2-sheet-scrim" onClick={() => setDeleting(false)}>
          <div className="ct2-sheet" role="dialog" aria-label={`Delete ${line.name}?`} onClick={e => e.stopPropagation()}>
            <div className="ct2-sheet-handle" aria-hidden="true" />
            <h2>Delete {line.name}?</h2>
            <p className="ct2-caption">The line and how well you know it are gone for good.</p>
            <div className="ct2-pair-buttons" style={{ marginTop: 16 }}>
              <button type="button" className="ct2-secondary" onClick={() => setDeleting(false)}>
                Cancel
              </button>
              <button type="button" className="ct2-danger" onClick={onDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A new line on the board: both sides' moves, the side you will play, and its name. */
function LineBuilder({
  settings,
  openingTree,
  onBack,
  onSave
}: {
  settings: AppSettings;
  openingTree: OpeningTree;
  onBack: () => void;
  onSave: (name: string, side: "w" | "b", moves: string[]) => void;
}) {
  const [moves, setMoves] = useState<string[]>([]);
  const [side, setSide] = useState<"w" | "b">("w");
  const [naming, setNaming] = useState<string | null>(null);
  const fen = useMemo(() => endFen(moves), [moves]);
  const bookName = useMemo(() => (moves.length ? openingTree.match(moves).opening?.name ?? null : null), [moves, openingTree]);

  return (
    <div className="ct2-board-screen">
      <BoardTopBar title="New line" onBack={onBack} />
      <div className="ct2-board-zone">
        <div className="ct2-segmented" role="radiogroup" aria-label="Your side">
          {(["w", "b"] as const).map(s => (
            <button key={s} type="button" role="radio" aria-checked={side === s} className={side === s ? "is-on" : ""} onClick={() => setSide(s)}>
              {s === "w" ? "As White" : "As Black"}
            </button>
          ))}
        </div>
        <p className="ct2-caption" style={{ minHeight: 20 }}>
          {bookName ?? (moves.length ? "Your own line" : "Play the moves of both sides.")}
        </p>
      </div>
      <div className="ct2-board-area">
        <BoardHost
          fen={fen}
          orientation={side}
          interactive
          allowAllColors
          boardColorsId={settings.boardThemeId}
          pieceSetId={settings.pieceSetId}
          showCoordinates={settings.showCoordinates}
          showLegalDots={settings.showLegalDots}
          autoQueen={settings.autoQueen}
          reduceMotion={settings.reduceMotion}
          lastMove={moves[moves.length - 1] ?? null}
          onMove={uci => {
            playCue("move", settings.soundEnabled);
            setMoves(m => [...m, uci]);
          }}
        />
        <p className="ct2-caption ct2-under">{sanLine(moves)}</p>
      </div>
      <div className="ct2-board-controls">
        <Control icon={<RotateCcw size={20} />} label="Undo" disabled={!moves.length} onClick={() => setMoves(m => m.slice(0, -1))} />
        <PrimaryButton
          disabled={!moves.length}
          onClick={() => setNaming(bookName ? bookName.slice(bookName.indexOf(":") + 1).trim() : "")}
        >
          Save
        </PrimaryButton>
      </div>
      {naming !== null ? (
        <div className="ct2-sheet-scrim" onClick={() => setNaming(null)}>
          <div className="ct2-sheet" role="dialog" aria-label="Name this line" onClick={e => e.stopPropagation()}>
            <div className="ct2-sheet-handle" aria-hidden="true" />
            <h2>Name this line</h2>
            <input
              className="ct2-input"
              autoFocus
              maxLength={40}
              placeholder="My line"
              value={naming}
              onChange={e => setNaming(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") onSave(naming, side, moves);
              }}
            />
            <div className="ct2-pair-buttons" style={{ marginTop: 16 }}>
              <button type="button" className="ct2-secondary" onClick={() => setNaming(null)}>
                Cancel
              </button>
              <PrimaryButton onClick={() => onSave(naming, side, moves)}>Save</PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
