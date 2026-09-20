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
  Swords,
  Target,
  Trophy,
  X
} from "lucide-react";

type Tab = "openings" | "puzzles" | "games" | "stats";
type CoachState = {
  title: string;
  subtitle: string;
  issue: string;
  bestMove: string;
};

const tabs: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
  { id: "openings", label: "Openings", icon: BookOpen },
  { id: "puzzles", label: "Puzzles", icon: Crosshair },
  { id: "games", label: "VS Games", icon: Swords },
  { id: "stats", label: "Stats", icon: BarChart3 }
];

const pieceGlyphs: Record<string, string> = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
  P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔"
};

const squareNames: Square[] = [
  "a8","b8","c8","d8","e8","f8","g8","h8",
  "a7","b7","c7","d7","e7","f7","g7","h7",
  "a6","b6","c6","d6","e6","f6","g6","h6",
  "a5","b5","c5","d5","e5","f5","g5","h5",
  "a4","b4","c4","d4","e4","f4","g4","h4",
  "a3","b3","c3","d3","e3","f3","g3","h3",
  "a2","b2","c2","d2","e2","f2","g2","h2",
  "a1","b1","c1","d1","e1","f1","g1","h1"
];

function App() {
  const [tab, setTab] = useState<Tab>("games");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [chess, setChess] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [coachState, setCoachState] = useState<CoachState>({
    title: "Forced mate & consequence retry",
    subtitle: "Every mistake is backed by a concrete, checkable fact.",
    issue: "You missed mate in one",
    bestMove: "Qh7+"
  });

  const files = boardFlipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];
  const ranks = boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).map(move => move.to));
  }, [chess, selected]);

  function resetBoard() {
    setChess(new Chess());
    setSelected(null);
    setCoachState(prev => ({ ...prev, title: "A clean position starts here", issue: "Ready for your move", bestMove: "Find the principled move." }));
  }

  function handleSquareClick(square: Square) {
    if (selected && legalTargets.has(square)) {
      const next = new Chess(chess.fen());
      next.move({ from: selected, to: square, promotion: "q" });
      setChess(next);
      setSelected(null);
      setCoachState({
        title: "Good. Now explain the consequence.",
        subtitle: "The web coach will connect moves to tactical facts as the engine layer comes online.",
        issue: next.isCheck() ? "Check delivered" : "Position updated",
        bestMove: next.isCheck() ? "Keep calculating." : "Look for forcing moves first."
      });
      return;
    }
    const piece = chess.get(square);
    setSelected(piece && piece.color === chess.turn() ? square : null);
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
          <div className="streak">
            <span className="streak-dot" />
            <span>7 day streak</span>
          </div>
          <button className="icon-button" aria-label="Settings"><Settings size={17} /></button>
          <button className="profile-button"><span className="avatar">B</span><span className="profile-copy"><b>Player</b><small>1500</small></span></button>
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
                <Icon size={18} />
                <span>{label}</span>
                {id === "puzzles" && <em>12</em>}
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
              <h1>{coachState.title}</h1>
              <p>{coachState.subtitle}</p>
            </div>
            <button className="secondary-button"><CircleHelp size={16} /> How it works</button>
          </section>

          {tab === "games" && (
            <section className="training-grid">
              <div className="board-card">
                <div className="board-topline">
                  <div>
                    <span className="surface-label">COACH BOARD</span>
                    <strong>Practice position</strong>
                  </div>
                  <button className="board-tool" onClick={() => setBoardFlipped(v => !v)} title="Flip board"><ArrowLeftRight size={17} /></button>
                </div>

                <div className="board-wrap">
                  <div className="eval-bar"><span style={{ height: "62%" }} /><b>+0.7</b></div>
                  <div className="board">
                    {ranks.flatMap(rank => files.map(file => {
                      const square = (file + rank) as Square;
                      const piece = chess.get(square);
                      const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
                      const isSelected = square === selected;
                      const isTarget = legalTargets.has(square);
                      return (
                        <button
                          key={square}
                          className={[
                            "square",
                            isLight ? "light" : "dark",
                            isSelected ? "selected" : "",
                            isTarget ? "target" : ""
                          ].join(" ")}
                          onClick={() => handleSquareClick(square)}
                          aria-label={square}
                        >
                          {piece && <span className={piece.color === "w" ? "piece white-piece" : "piece black-piece"}>{pieceGlyphs[piece.type === "p" ? (piece.color === "w" ? "P" : "p") : piece.type === "n" ? (piece.color === "w" ? "N" : "n") : piece.type === "b" ? (piece.color === "w" ? "B" : "b") : piece.type === "r" ? (piece.color === "w" ? "R" : "r") : piece.type === "q" ? (piece.color === "w" ? "Q" : "q") : (piece.color === "w" ? "K" : "k")]}</span>}
                          {isTarget && <span className={piece ? "capture-ring" : "target-dot"} />}
                        </button>
                      );
                    }))}
                  </div>
                </div>

                <div className="board-bottom">
                  <div className="player-row">
                    <div className="player-avatar">B</div>
                    <div><b>You</b><span>1500 · White</span></div>
                  </div>
                  <div className="move-state">{chess.history().length ? chess.history().slice(-6).join("  ") : "Your move"}</div>
                  <button className="ghost-button" onClick={resetBoard}><RotateCcw size={15} /> Reset</button>
                </div>
              </div>

              <aside className="coach-panel">
                <div className="coach-card primary">
                  <div className="coach-icon"><Lightbulb size={18} /></div>
                  <div>
                    <span className="surface-label">COACH NOTE</span>
                    <h2>Think before you calculate</h2>
                    <p>Start with checks, captures and threats. The goal is not to guess the engine move; it is to explain why the move works.</p>
                  </div>
                </div>

                <div className="issue-card">
                  <div className="issue-icon"><Gauge size={18} /></div>
                  <div className="issue-copy">
                    <span className="surface-label">POSITION SIGNAL</span>
                    <strong>{coachState.issue}</strong>
                    <span>{coachState.bestMove}</span>
                  </div>
                  <button className="icon-button dark"><ChevronRight size={16} /></button>
                </div>

                <div className="coach-actions">
                  <button className="brass-button" onClick={() => setCoachState(prev => ({ ...prev, title: "Hint 1: name the tactical idea", subtitle: "A useful hint narrows the search without giving the move away." }))}><Lightbulb size={16} /> Give me a hint</button>
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

          {tab === "openings" && <SectionPanel title="Build your repertoire" eyebrow="OPENINGS" icon={<BookOpen size={18} />} description="Study the lines you actually play. The web client will turn your saved repertoire into focused, explainable training." cards={["King's Indian Defence", "Italian Game", "Queen's Gambit"]} />}
          {tab === "puzzles" && <SectionPanel title="Train the pattern, not the answer" eyebrow="PUZZLES" icon={<Crosshair size={18} />} description="Work through tactical motifs, record the moments you fail, and feed them back into your review queue." cards={["Mate in 2", "Deflection", "Discovered attack"]} />}
          {tab === "stats" && <SectionPanel title="See what is actually improving" eyebrow="STATS" icon={<BarChart3 size={18} />} description="Your dashboard should connect accuracy to repeatable weaknesses rather than bury you in generic rating charts." cards={["82% tactical accuracy", "+124 opening rating", "8 mistakes to review"]} />}
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

function SectionPanel(props: { title: string; eyebrow: string; icon: React.ReactNode; description: string; cards: string[] }) {
  return (
    <section className="section-panel">
      <div className="section-panel-head">
        <div className="panel-icon">{props.icon}</div>
        <div><span className="eyebrow">{props.eyebrow}</span><h2>{props.title}</h2><p>{props.description}</p></div>
      </div>
      <div className="feature-list">
        {props.cards.map((card, index) => (
          <button key={card} className="feature-card">
            <span className="feature-index">0{index + 1}</span>
            <span className="feature-copy"><b>{card}</b><small>Open module <ChevronRight size={13} /></small></span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default App;
