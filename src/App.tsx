import { useMemo, useState } from "react";
import { Chess, Square } from "chess.js";
import {
  ArrowLeftRight, BookOpen, Brain, ChevronRight, CircleHelp, Crosshair,
  Gauge, History, Lightbulb, Menu, Play, RotateCcw, Settings, Swords,
  Target, Trophy, X
} from "lucide-react";
import { openingCourses, puzzleThemes, pastGames } from "./data/content";

type Tab = "train" | "learn" | "play" | "review";

const tabs = [
  { id: "train" as const, label: "Train", icon: Target },
  { id: "learn" as const, label: "Learn", icon: BookOpen },
  { id: "play" as const, label: "Play", icon: Swords },
  { id: "review" as const, label: "Review", icon: History }
];

const glyph: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚"
};

const files = ["a","b","c","d","e","f","g","h"];
const ranks = [8,7,6,5,4,3,2,1];

function App() {
  const [tab, setTab] = useState<Tab>("train");
  const [mobileMenu, setMobileMenu] = useState(false);

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
          <button className="profile-button"><span className="avatar">B</span><span className="profile-copy"><b>Player</b><small>1765</small></span></button>
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
                <Icon size={18} /><span>{label}</span>{id === "review" && <em>4</em>}
              </button>
            ))}
          </div>
          <div className="sidebar-section secondary">
            <div className="sidebar-label">YOUR WORK</div>
            <button className="sidebar-link"><Brain size={18} /><span>Mistake patterns</span><em>8</em></button>
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
          {tab === "train" && <TrainView />}
          {tab === "learn" && <LearnView />}
          {tab === "play" && <PlayView />}
          {tab === "review" && <ReviewView />}
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

function TrainView() {
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [chess, setChess] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [message, setMessage] = useState("Every mistake is backed by a concrete, checkable fact.");
  const displayFiles = boardFlipped ? [...files].reverse() : files;
  const displayRanks = boardFlipped ? [...ranks].reverse() : ranks;

  const legalTargets = useMemo(() => selected
    ? new Set(chess.moves({ square: selected, verbose: true }).map(move => move.to))
    : new Set<string>(), [chess, selected]);

  function clickSquare(square: Square) {
    if (selected && legalTargets.has(square)) {
      const next = new Chess(chess.fen());
      next.move({ from: selected, to: square, promotion: "q" });
      setChess(next);
      setSelected(null);
      setMessage(next.isCheck() ? "Check delivered. Calculate the opponent's forcing replies." : "Good. Name the threat you created before moving again.");
      return;
    }
    const piece = chess.get(square);
    setSelected(piece && piece.color === chess.turn() ? square : null);
  }

  function reset() {
    setChess(new Chess());
    setSelected(null);
    setMessage("Fresh position. Scan checks, captures and threats first.");
  }

  return (
    <>
      <section className="hero-row">
        <div><span className="eyebrow">TODAY'S FOCUS</span><h1>Forced mate & consequence retry</h1><p>Every mistake is backed by a concrete, checkable fact.</p></div>
        <button className="secondary-button"><CircleHelp size={16} /> How it works</button>
      </section>

      <section className="training-grid">
        <div className="board-card">
          <div className="board-topline"><div><span className="surface-label">COACH BOARD</span><strong>Training position</strong></div><button className="board-tool" onClick={() => setBoardFlipped(v => !v)}><ArrowLeftRight size={17} /></button></div>
          <div className="board-wrap">
            <div className="eval-bar"><span style={{ height: "62%" }} /><b>+0.7</b></div>
            <div className="board">
              {displayRanks.flatMap(rank => displayFiles.map(file => {
                const square = (file + rank) as Square;
                const piece = chess.get(square);
                const light = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
                const target = legalTargets.has(square);
                return (
                  <button key={square} className={["square", light ? "light" : "dark", square === selected ? "selected" : ""].join(" ")} onClick={() => clickSquare(square)} aria-label={square}>
                    {piece && <span className={piece.color === "w" ? "piece white-piece" : "piece black-piece"}>{glyph[piece.color + piece.type]}</span>}
                    {target && <span className={piece ? "capture-ring" : "target-dot"} />}
                  </button>
                );
              }))}
            </div>
          </div>
          <div className="board-bottom">
            <div className="player-row"><div className="player-avatar">B</div><div><b>You</b><span>1765 · White</span></div></div>
            <div className="move-state">{chess.history().length ? chess.history().slice(-8).join("  ") : "Your move"}</div>
            <button className="ghost-button" onClick={reset}><RotateCcw size={15} /> Reset</button>
          </div>
        </div>

        <aside className="coach-panel">
          <div className="coach-card primary"><div className="coach-icon"><Lightbulb size={18} /></div><div><span className="surface-label">COACH NOTE</span><h2>Think before you calculate</h2><p>{message}</p></div></div>
          <div className="issue-card"><div className="issue-icon"><Gauge size={18} /></div><div className="issue-copy"><span className="surface-label">POSITION SIGNAL</span><strong>{chess.isCheck() ? "Check delivered" : "Scan forcing moves"}</strong><span>{chess.history().length ? "Position updated locally" : "No mistake recorded yet"}</span></div><button className="icon-button dark"><ChevronRight size={16} /></button></div>
          <div className="coach-actions"><button className="brass-button" onClick={() => setMessage("Hint 1 · Ask what your opponent is threatening before searching for your own move.")}><Lightbulb size={16} /> Give me a hint</button><button className="secondary-button full"><Play size={16} /> Start focused drill</button></div>
          <div className="progress-card"><div className="progress-head"><span>SESSION</span><strong>3 of 8 positions</strong></div><div className="progress-track"><span style={{ width:"38%" }} /></div><div className="progress-foot"><span>Today</span><b>14 min</b></div></div>
        </aside>
      </section>
    </>
  );
}

function LearnView() {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Openings", "Tactics", "Middlegame", "Endgame", "Blunder Patterns"];
  const lessons = [
    { title: "The Golden Rules of Opening", subtitle: "Center Control & Rapid Development", category: "Openings", copy: "Control the center, develop pieces, and castle early." },
    { title: "The Italian Game", subtitle: "1. e4 e5 2. Nf3 Nc6 3. Bc4", category: "Openings", copy: "Target f7 and prepare the central c3–d4 break." },
    { title: "The Royal Knight Fork", subtitle: "Simultaneous Multi-Square Strikes", category: "Tactics", copy: "Find the knight move that attacks two critical targets." },
    { title: "Outposts & Knight Strongholds", subtitle: "Dominating the 5th and 6th Ranks", category: "Middlegame", copy: "Occupy pawn-proof squares and support your outpost." },
    { title: "The Opposition & Key Squares", subtitle: "The Universal King & Pawn Blueprint", category: "Endgame", copy: "Use king opposition to force the opponent to yield ground." },
    { title: "Missed Mate in 1", subtitle: "Decisive Tactical Blindness", category: "Blunder Patterns", copy: "Train the habit of scanning every legal check before moving." }
  ].filter(item => filter === "All" || item.category === filter);

  return (
    <>
      <section className="hero-row"><div><span className="eyebrow">LEARN</span><h1>Build chess knowledge you can actually use</h1><p>Lessons lead directly back into practice, just like the foundation branch: learn a concept, practise it on the board, then review the mistake.</p></div><button className="secondary-button"><BookOpen size={16} /> Curriculum</button></section>
      <div className="filter-row">{filters.map(f => <button key={f} className={filter===f ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(f)}>{f}</button>)}</div>
      <section className="lesson-grid">{lessons.map((lesson, i) => <article className="lesson-card" key={lesson.title}><div className="lesson-number">0{i+1}</div><span className="rank-pill">{lesson.category}</span><h3>{lesson.title}</h3><div className="mono lesson-subtitle">{lesson.subtitle}</div><p>{lesson.copy}</p><button className="text-action">Practise this <ChevronRight size={14} /></button></article>)}</section>
      <section className="repertoire-strip"><div><span className="eyebrow">OPENING COURSES</span><h2>Repertoire in progress</h2></div><div className="repertoire-pills">{openingCourses.slice(0,4).map(c => <span key={c.name} className="repertoire-pill">{c.name}<b>{c.progress}%</b></span>)}</div></section>
    </>
  );
}

function PlayView() {
  return (
    <>
      <section className="hero-row"><div><span className="eyebrow">PLAY</span><h1>Play with a purpose</h1><p>Keep the arena focused on practice: choose an opponent, play the position, and turn important moments into training material.</p></div><button className="brass-button"><Play size={16} /> New game</button></section>
      <div className="play-grid">
        <article className="arena-card"><div className="arena-bot"><div className="bot-avatar">W</div><div><span className="surface-label">CURRENT OPPONENT</span><h2>Wayne <small>600 Elo</small></h2><p>Casual · tuned below your current rating</p></div></div><div className="arena-buttons"><button className="brass-button">Play white</button><button className="secondary-button">Choose opponent</button></div></article>
        <article className="recent-card"><div className="card-head"><div><span className="surface-label">RECENT GAMES</span><h3>Past games</h3></div><History size={16} /></div>{pastGames.map(game => <div className="game-row" key={game.opponent + game.date}><span className="result-badge">{game.result}</span><div className="game-opponent"><b>{game.opponent}</b><span>{game.rating} · {game.opening}</span></div><span className="mono">{game.moves}</span><span className="date-label">{game.date}</span></div>)}</article>
      </div>
    </>
  );
}

function ReviewView() {
  const items = [
    { title: "Missed Mate in 1", stage: "Due today", detail: "Recall the decisive move without the hint." },
    { title: "Hanging Major Pieces", stage: "Due today", detail: "Count attackers and defenders before you commit." },
    { title: "Back-Rank Checkmate & Luft", stage: "1 day", detail: "Spot the escape-square failure before the rook arrives." },
    { title: "Royal Knight Fork", stage: "3 days", detail: "Find king + rook forks from the center." }
  ];
  return (
    <>
      <section className="hero-row"><div><span className="eyebrow">REVIEW</span><h1>Turn yesterday's mistakes into today's skill</h1><p>The review queue follows the foundation scheduler: successful recalls move forward through spaced intervals; failures return immediately.</p></div><div className="metric-chip"><Target size={14} /> 4 due</div></section>
      <section className="review-layout"><div className="review-summary"><span className="surface-label">TODAY</span><strong>4 positions</strong><p>1 day · 3 days · 7 days · 14 days · 30 days</p><div className="review-progress"><span style={{ width:"35%" }} /></div><button className="brass-button"><Play size={16} /> Start review</button></div><div className="review-list">{items.map((item, i) => <article className="review-item" key={item.title}><span className="review-index">{i+1}</span><div><b>{item.title}</b><p>{item.detail}</p></div><span className="review-stage">{item.stage}</span><ChevronRight size={15} /></article>)}</div></section>
    </>
  );
}

export default App;
