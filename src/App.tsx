import { useMemo, useState } from "react";
import { Chess, Square } from "chess.js";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Gauge,
  Lightbulb,
  Menu,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Swords,
  Target,
  Trophy,
  X
} from "lucide-react";
import { openingCourses, openingWinRates, pastGames, puzzleThemes, ratingHistory } from "./data/content";

type Tab = "openings" | "puzzles" | "games" | "stats";

const tabs: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
  { id: "openings", label: "Openings", icon: BookOpen },
  { id: "puzzles", label: "Puzzles", icon: Crosshair },
  { id: "games", label: "VS Games", icon: Swords },
  { id: "stats", label: "Stats", icon: BarChart3 }
];

const glyph: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚"
};

const files = ["a","b","c","d","e","f","g","h"];
const ranks = [8,7,6,5,4,3,2,1];

function glyphFor(type: string, color: "w" | "b") {
  return glyph[color + type];
}

function App() {
  const [tab, setTab] = useState<Tab>("games");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [chess, setChess] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [coachMessage, setCoachMessage] = useState("Start with checks, captures and threats. Explain the move before you trust it.");

  const displayFiles = boardFlipped ? [...files].reverse() : files;
  const displayRanks = boardFlipped ? [...ranks].reverse() : ranks;
  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).map(move => move.to));
  }, [chess, selected]);

  function handleSquareClick(square: Square) {
    if (selected && legalTargets.has(square)) {
      const next = new Chess(chess.fen());
      next.move({ from: selected, to: square, promotion: "q" });
      setChess(next);
      setSelected(null);
      setCoachMessage(next.isCheck()
        ? "Check delivered. Now calculate the opponent's forcing replies."
        : "Good. Before the next move, name the threat you are creating.");
      return;
    }

    const piece = chess.get(square);
    setSelected(piece && piece.color === chess.turn() ? square : null);
  }

  function resetBoard() {
    setChess(new Chess());
    setSelected(null);
    setCoachMessage("Fresh position. Begin with forcing moves, then look for the opponent's reply.");
  }

  function giveHint() {
    setCoachMessage("Hint 1 · Ask what your opponent is threatening before searching for your own move.");
  }

  function selectTab(next: Tab) {
    setTab(next);
    setMobileMenu(false);
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
          <div className="streak"><span className="streak-dot" />7 day streak</div>
          <button className="icon-button" aria-label="Settings"><Settings size={17} /></button>
          <button className="profile-button">
            <span className="avatar">B</span>
            <span className="profile-copy"><b>Player</b><small>1765</small></span>
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
            <div className="sidebar-label">TRAIN</div>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} className={tab === id ? "sidebar-link active" : "sidebar-link"} onClick={() => selectTab(id)}>
                <Icon size={18} /><span>{label}</span>{id === "puzzles" && <em>7</em>}
              </button>
            ))}
          </div>

          <div className="sidebar-section secondary">
            <div className="sidebar-label">YOUR WORK</div>
            <button className="sidebar-link"><Brain size={18} /><span>Mistake book</span><em>8</em></button>
            <button className="sidebar-link"><Target size={18} /><span>Review queue</span><em>4</em></button>
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-footer-card">
              <span className="mini-icon"><Trophy size={15} /></span>
              <div><b>82%</b><small>weekly accuracy</small></div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <section className="hero-row">
            <div>
              <span className="eyebrow">TODAY'S FOCUS</span>
              <h1>{tab === "games" ? "Forced mate & consequence retry" : pageHeading(tab)}</h1>
              <p>{tab === "games" ? "Every mistake is backed by a concrete, checkable fact." : pageDescription(tab)}</p>
            </div>
            <button className="secondary-button"><CircleHelp size={16} /> How it works</button>
          </section>

          {tab === "games" && (
            <section className="training-grid">
              <div className="board-card">
                <div className="board-topline">
                  <div><span className="surface-label">COACH BOARD</span><strong>Practice position</strong></div>
                  <button className="board-tool" onClick={() => setBoardFlipped(v => !v)} title="Flip board"><ArrowLeftRight size={17} /></button>
                </div>

                <div className="board-wrap">
                  <div className="eval-bar"><span style={{ height: "62%" }} /><b>+0.7</b></div>
                  <div className="board">
                    {displayRanks.flatMap(rank => displayFiles.map(file => {
                      const square = (file + rank) as Square;
                      const piece = chess.get(square);
                      const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
                      const isTarget = legalTargets.has(square);
                      return (
                        <button key={square} className={["square", isLight ? "light" : "dark", square === selected ? "selected" : ""].join(" ")} onClick={() => handleSquareClick(square)} aria-label={square}>
                          {piece && <span className={piece.color === "w" ? "piece white-piece" : "piece black-piece"}>{glyphFor(piece.type, piece.color)}</span>}
                          {isTarget && <span className={piece ? "capture-ring" : "target-dot"} />}
                        </button>
                      );
                    }))}
                  </div>
                </div>

                <div className="board-bottom">
                  <div className="player-row">
                    <div className="player-avatar">B</div>
                    <div><b>You</b><span>1765 · White</span></div>
                  </div>
                  <div className="move-state">{chess.history().length ? chess.history().slice(-8).join("  ") : "Your move"}</div>
                  <button className="ghost-button" onClick={resetBoard}><RotateCcw size={15} /> Reset</button>
                </div>
              </div>

              <aside className="coach-panel">
                <div className="coach-card primary">
                  <div className="coach-icon"><Lightbulb size={18} /></div>
                  <div>
                    <span className="surface-label">COACH NOTE</span>
                    <h2>Think before you calculate</h2>
                    <p>{coachMessage}</p>
                  </div>
                </div>

                <div className="issue-card">
                  <div className="issue-icon"><Gauge size={18} /></div>
                  <div className="issue-copy"><span className="surface-label">POSITION SIGNAL</span><strong>{chess.isCheck() ? "Check delivered" : "Ready for your move"}</strong><span>{chess.history().length ? "Position updated locally" : "No mistake recorded yet"}</span></div>
                  <button className="icon-button dark"><ChevronRight size={16} /></button>
                </div>

                <div className="coach-actions">
                  <button className="brass-button" onClick={giveHint}><Lightbulb size={16} /> Give me a hint</button>
                  <button className="secondary-button full"><Play size={16} /> Start focused drill</button>
                </div>

                <div className="progress-card">
                  <div className="progress-head"><span>SESSION</span><strong>3 of 8 positions</strong></div>
                  <div className="progress-track"><span style={{ width: "38%" }} /></div>
                  <div className="progress-foot"><span>Today</span><b>14 min</b></div>
                </div>
              </aside>
            </section>
          )}

          {tab === "openings" && <OpeningsView />}
          {tab === "puzzles" && <PuzzlesView />}
          {tab === "stats" && <StatsView />}
        </main>
      </div>

      <nav className="bottom-nav">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "bottom-link active" : "bottom-link"} onClick={() => selectTab(id)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function OpeningsView() {
  return (
    <section className="content-stack">
      <div className="content-toolbar">
        <div><span className="eyebrow">REPERTOIRE</span><h2>Build the lines you actually play</h2></div>
        <button className="secondary-button"><Sparkles size={15} /> Continue study</button>
      </div>
      <div className="course-grid">
        {openingCourses.map(course => (
          <article key={course.name} className="course-card">
            <div className="course-card-top">
              <span className="rank-pill">{course.rank}</span>
              <span className="mono">{course.mastery}</span>
            </div>
            <h3>{course.name}</h3>
            <p>{course.subtitle}</p>
            <div className="progress-track"><span style={{ width: course.progress + "%" }} /></div>
            <div className="course-foot"><span>{course.progress}% mastered</span><ChevronRight size={15} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PuzzlesView() {
  return (
    <section className="content-stack">
      <div className="content-toolbar">
        <div><span className="eyebrow">TACTICAL TRAINING</span><h2>Train the pattern, not the answer</h2></div>
        <div className="metric-chip"><Crosshair size={14} /><b>7</b> drills queued</div>
      </div>
      <div className="puzzle-grid">
        {puzzleThemes.map(theme => (
          <article key={theme.title} className="puzzle-card">
            <div className="puzzle-card-top"><span className="rank-pill">{theme.badge}</span><span className="mono">{theme.count} drills</span></div>
            <h3>{theme.title}</h3>
            <p>{theme.description}</p>
            <button className="text-action">Open theme <ChevronRight size={14} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatsView() {
  const min = Math.min(...ratingHistory);
  const max = Math.max(...ratingHistory);
  const points = ratingHistory.map((value, i) => {
    const x = (i / (ratingHistory.length - 1)) * 100;
    const y = 88 - ((value - min) / Math.max(1, max - min)) * 66;
    return (x + "," + y);
  }).join(" ");

  return (
    <section className="content-stack">
      <div className="stats-overview">
        <div><span className="eyebrow">PERFORMANCE</span><h2>1765 <small>-7 this month</small></h2><p>Your current rating profile, drawn from the same concepts used by the Android stats screen.</p></div>
        <div className="stat-grid">
          <div><span>PUZZLE RATING</span><b>700</b></div>
          <div><span>PUZZLES SOLVED</span><b>0</b></div>
          <div><span>STREAK</span><b>7d</b></div>
          <div><span>WEEKLY ACCURACY</span><b>82%</b></div>
        </div>
      </div>

      <div className="stats-grid">
        <article className="chart-card">
          <div className="card-head"><div><span className="surface-label">RATING</span><h3>Last 1 month</h3></div><span className="mono">1765</span></div>
          <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Rating history chart">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="chart-labels"><span>22.8</span><span>21.9</span></div>
        </article>

        <article className="chart-card">
          <div className="card-head"><div><span className="surface-label">OPENING PERFORMANCE</span><h3>Win rate by repertoire</h3></div><BarChart3 size={16} /></div>
          <div className="rate-list">
            {openingWinRates.map(row => (
              <div className="rate-row" key={row.name}>
                <div><b>{row.name}</b><span>{row.games} games</span></div>
                <strong>{row.winRate}%</strong>
                <span className="delta">{row.delta}%</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="games-card">
        <div className="card-head"><div><span className="surface-label">RECENT GAMES</span><h3>What you have actually played</h3></div><button className="text-action">Open games <ChevronRight size={14} /></button></div>
        {pastGames.map(game => (
          <div className="game-row" key={game.opponent + game.date}>
            <span className="result-badge">{game.result}</span>
            <div className="game-opponent"><b>{game.opponent}</b><span>{game.rating} · {game.opening}</span></div>
            <span className="mono">{game.moves} moves</span>
            <span className="date-label">{game.date}</span>
          </div>
        ))}
      </article>
    </section>
  );
}

function pageHeading(tab: Tab) {
  return {
    openings: "Build your repertoire",
    puzzles: "Train the tactical pattern",
    games: "Review and play with purpose",
    stats: "See what is actually improving"
  }[tab];
}

function pageDescription(tab: Tab) {
  return {
    openings: "Learn the top positions, practice your variations, and keep your repertoire connected to real games.",
    puzzles: "Work through tactical motifs and feed failed positions into a repeatable review loop.",
    games: "Play, inspect, and turn the moments that matter into future training.",
    stats: "Connect performance numbers to repeatable weaknesses instead of generic rating noise."
  }[tab];
}

export default App;
