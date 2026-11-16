import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, PieceSymbol, Square } from "chess.js";
import {
  BOARD_MARK_COLORS,
  BoardColorsId,
  PieceSetId,
  getBoardColors
} from "../domain/theme";
import { whiteBarFraction } from "../domain/account";
import { ChessPiece } from "./ChessPiece";
import { PromotionModal } from "./PromotionModal";

export interface BoardArrow {
  from: string;
  to: string;
  kind?: "best" | "hint" | "user" | "alternative" | "idea" | "bad";
}

export interface BoardHighlight {
  square: string;
  kind?: "good" | "bad" | "idea" | "mistake";
}

export interface BoardPlayerStrip {
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  clockMs?: number | null;
  active?: boolean;
  captured?: PieceSymbol[];
  capturedColor?: "w" | "b";
  materialAdvantage?: number; // positive means ahead
}

export interface BoardHostProps {
  fen: string;
  orientation: "w" | "b";
  interactive?: boolean;
  allowAllColors?: boolean;
  allowedSide?: "w" | "b";
  boardColorsId?: BoardColorsId;
  pieceSetId?: PieceSetId;
  showCoordinates?: boolean;
  showLegalDots?: boolean;
  autoQueen?: boolean;
  reduceMotion?: boolean;
  lastMove?: string | null; // UCI e.g. "e2e4"
  arrows?: BoardArrow[];
  highlights?: BoardHighlight[];
  allowUserArrows?: boolean;
  showEvalBar?: boolean;
  evalCp?: number | null;
  evalMate?: number | null;
  mistakeFlashSquare?: string | null;
  badgeOverlay?: { square: string; symbol: string; color: string } | null;
  topPlayer?: BoardPlayerStrip;
  bottomPlayer?: BoardPlayerStrip;
  onMove?: (uci: string) => void;
  maxBoardPx?: number;
  /** Moves chess.js does not know, offered as well (Chess960 castling: the king onto its own rook). */
  extraMoves?: string[];
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function formatClockMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function squareToGridPercent(sq: string, orientation: "w" | "b"): { x: number; y: number } {
  const fileIdx = sq.charCodeAt(0) - 97;
  const rankIdx = Number(sq[1]) - 1;
  const col = orientation === "w" ? fileIdx : 7 - fileIdx;
  const row = orientation === "w" ? 7 - rankIdx : rankIdx;
  return { x: col * 12.5 + 6.25, y: row * 12.5 + 6.25 };
}

function arrowColorFor(kind: BoardArrow["kind"]): string {
  switch (kind) {
    case "best":
      return BOARD_MARK_COLORS.arrowBest;
    case "hint":
      return BOARD_MARK_COLORS.arrowHint;
    case "user":
      return BOARD_MARK_COLORS.arrowUser;
    case "alternative":
      return BOARD_MARK_COLORS.arrowAlternative;
    case "bad":
      return BOARD_MARK_COLORS.arrowBad;
    default:
      return BOARD_MARK_COLORS.arrowIdea;
  }
}

export function BoardHost({
  fen,
  orientation,
  interactive = true,
  allowAllColors = false,
  allowedSide,
  boardColorsId = "slate",
  pieceSetId = "cburnett",
  showCoordinates = true,
  showLegalDots = true,
  autoQueen = false,
  reduceMotion = false,
  lastMove = null,
  arrows = [],
  highlights = [],
  allowUserArrows = false,
  showEvalBar = false,
  evalCp = null,
  evalMate = null,
  mistakeFlashSquare = null,
  badgeOverlay = null,
  topPlayer,
  bottomPlayer,
  onMove,
  maxBoardPx = 560,
  extraMoves = []
}: BoardHostProps) {
  const boardColors = getBoardColors(boardColorsId);
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square; color: "w" | "b" } | null>(null);
  const [userArrows, setUserArrows] = useState<BoardArrow[]>([]);
  const [userMarks, setUserMarks] = useState<string[]>([]);
  const [rightDragFrom, setRightDragFrom] = useState<string | null>(null);

  // Fade-through orientation swap (D2: ~250ms fade down -> swap -> fade up)
  const [renderedOrientation, setRenderedOrientation] = useState<"w" | "b">(orientation);
  const [flippingPhase, setFlippingPhase] = useState(false);

  // Pointer drag state for smooth drag-and-drop on desktop & mobile
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromo(null);
    setUserArrows([]);
    setUserMarks([]);
  }, [fen]);

  useEffect(() => {
    if (orientation === renderedOrientation) return;
    if (reduceMotion) {
      setRenderedOrientation(orientation);
      return;
    }
    setFlippingPhase(true);
    const t1 = setTimeout(() => {
      setRenderedOrientation(orientation);
    }, 115);
    const t2 = setTimeout(() => {
      setFlippingPhase(false);
    }, 240);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [orientation, renderedOrientation, reduceMotion]);

  const turn = chess.turn();
  const canInteractTurn = interactive && (allowAllColors || !allowedSide || turn === allowedSide);

  const legalMovesFromSelected = useMemo(() => {
    if (!selectedSquare || !canInteractTurn) return [];
    return chess.moves({ square: selectedSquare, verbose: true });
  }, [chess, selectedSquare, canInteractTurn]);

  const legalTargetMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of legalMovesFromSelected) {
      map.set(m.to, Boolean(m.captured));
    }
    if (selectedSquare && canInteractTurn) {
      for (const uci of extraMoves) if (uci.slice(0, 2) === selectedSquare) map.set(uci.slice(2, 4), false);
    }
    return map;
  }, [legalMovesFromSelected, extraMoves, selectedSquare, canInteractTurn]);

  const kingInCheckSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const b = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === "k" && p.color === turn) return p.square;
      }
    }
    return null;
  }, [chess, turn]);

  const attemptMove = (from: Square, to: Square) => {
    const candidates = chess.moves({ square: from, verbose: true }).filter(m => m.to === to);
    if (!candidates.length) {
      if (!extraMoves.includes(`${from}${to}`)) return false;
      setSelectedSquare(null);
      onMove?.(`${from}${to}`);
      return true;
    }
    const isPromo = candidates.some(m => m.promotion);
    if (isPromo && !autoQueen) {
      setPendingPromo({ from, to, color: turn });
      return true;
    }
    const promo = isPromo ? "q" : "";
    setSelectedSquare(null);
    onMove?.(`${from}${to}${promo}`);
    return true;
  };

  const handleSquareClick = (sq: Square) => {
    if (!canInteractTurn) return;
    if (userArrows.length || userMarks.length) {
      setUserArrows([]);
      setUserMarks([]);
    }
    if (selectedSquare === sq) {
      setSelectedSquare(null);
      return;
    }
    if (selectedSquare && legalTargetMap.has(sq)) {
      attemptMove(selectedSquare, sq);
      return;
    }
    const piece = chess.get(sq);
    if (piece && piece.color === turn) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, sq: Square) => {
    if (e.button === 2 && allowUserArrows) {
      e.preventDefault();
      setRightDragFrom(sq);
      return;
    }
    if (e.button !== 0 || !canInteractTurn) return;
    const piece = chess.get(sq);
    if (piece && piece.color === turn) {
      if (selectedSquare && selectedSquare !== sq && legalTargetMap.has(sq)) {
        return; // let click handler handle capture if already selected
      }
      setSelectedSquare(sq);
      setDragFrom(sq);
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  useEffect(() => {
    if (!dragFrom) return;
    const onMoveWin = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };
    const onUpWin = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const sqEl = el?.closest?.("[data-square]") as HTMLElement | null;
      const targetSq = sqEl?.dataset?.square as Square | undefined;
      if (targetSq && targetSq !== dragFrom) {
        attemptMove(dragFrom, targetSq);
      }
      setDragFrom(null);
      setDragPos(null);
    };
    window.addEventListener("pointermove", onMoveWin);
    window.addEventListener("pointerup", onUpWin, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMoveWin);
      window.removeEventListener("pointerup", onUpWin);
    };
  });

  const handleSquareContextUp = (e: React.MouseEvent, sq: Square) => {
    if (!allowUserArrows) return;
    e.preventDefault();
    if (!rightDragFrom) return;
    if (rightDragFrom === sq) {
      setUserMarks(prev => (prev.includes(sq) ? prev.filter(s => s !== sq) : [...prev, sq]));
    } else {
      setUserArrows(prev => {
        const exists = prev.some(a => a.from === rightDragFrom && a.to === sq);
        return exists
          ? prev.filter(a => !(a.from === rightDragFrom && a.to === sq))
          : [...prev, { from: rightDragFrom, to: sq, kind: "user" }];
      });
    }
    setRightDragFrom(null);
  };

  const displayRanks = renderedOrientation === "w" ? RANKS : [...RANKS].reverse();
  const displayFiles = renderedOrientation === "w" ? FILES : [...FILES].reverse();

  const lastFrom = lastMove && lastMove.length >= 4 ? lastMove.slice(0, 2) : null;
  const lastTo = lastMove && lastMove.length >= 4 ? lastMove.slice(2, 4) : null;

  const allArrows = [...arrows, ...userArrows];
  const highlightMap = new Map(highlights.map(h => [h.square, h.kind ?? "idea"]));

  const whiteFraction = whiteBarFraction(evalCp, evalMate);
  const evalLabel =
    evalMate !== null
      ? `${evalMate > 0 ? "+" : "-"}M${Math.abs(evalMate)}`
      : evalCp !== null
      ? `${evalCp >= 0 ? "+" : ""}${(evalCp / 100).toFixed(1)}`
      : "0.0";

  const draggedPiece = dragFrom ? chess.get(dragFrom) : null;

  return (
    <div className="ct-board-host" style={{ maxWidth: showEvalBar ? maxBoardPx + 36 : maxBoardPx }}>
      {topPlayer && <PlayerBar strip={topPlayer} pieceSetId={pieceSetId} />}

      <div className="ct-board-eval-row">
        {showEvalBar && (
          <div className="ct-eval-bar" aria-label={`Evaluation ${evalLabel}`}>
            <div
              className="ct-eval-fill-white"
              style={{
                height: `${Math.round(whiteFraction * 100)}%`,
                transition: reduceMotion ? "none" : "height 260ms ease"
              }}
            />
            <span className="ct-eval-text mono-num">{evalLabel}</span>
          </div>
        )}

        <div
          ref={boardRef}
          className={`ct-board-frame ${flippingPhase ? "is-flipping" : ""}`}
          onContextMenu={e => {
            if (allowUserArrows) e.preventDefault();
          }}
        >
          <div className={`ct-board-grid ${boardColors.sheen ? "has-sheen" : ""}`}>
            {displayRanks.map((rank, rIdx) =>
              displayFiles.map((file, fIdx) => {
                const sq = `${file}${rank}` as Square;
                const fileIndex = FILES.indexOf(file);
                const isLight = (fileIndex + rank) % 2 === 1;
                const piece = chess.get(sq);
                const isSelected = selectedSquare === sq;
                const isLastMove = sq === lastFrom || sq === lastTo;
                const isLegalTarget = legalTargetMap.has(sq);
                const isCaptureTarget = legalTargetMap.get(sq) === true;
                const isCheck = sq === kingInCheckSquare;
                const isMistakeFlash = sq === mistakeFlashSquare;
                const markKind = highlightMap.get(sq);
                const userMarked = userMarks.includes(sq);
                const showFileCoord = showCoordinates && rIdx === 7;
                const showRankCoord = showCoordinates && fIdx === 0;
                const isDraggingThis = dragFrom === sq && dragPos !== null;

                let overlayBg = "";
                if (isMistakeFlash) overlayBg = BOARD_MARK_COLORS.mistake;
                else if (isSelected) overlayBg = BOARD_MARK_COLORS.selected;
                else if (isLastMove) overlayBg = BOARD_MARK_COLORS.lastMove;
                else if (userMarked) overlayBg = "rgba(217, 71, 59, 0.45)";
                else if (markKind === "bad") overlayBg = "rgba(191, 55, 40, 0.42)";
                else if (markKind === "good") overlayBg = "rgba(46, 134, 80, 0.42)";
                else if (markKind === "idea") overlayBg = "rgba(214, 170, 74, 0.36)";

                return (
                  <button
                    key={sq}
                    type="button"
                    data-square={sq}
                    className="ct-square"
                    style={{
                      backgroundColor: isLight ? boardColors.light : boardColors.dark,
                      color: isLight ? boardColors.coordinateOnLight : boardColors.coordinateOnDark
                    }}
                    onClick={() => handleSquareClick(sq)}
                    onPointerDown={e => handlePointerDown(e, sq)}
                    onMouseUp={e => handleSquareContextUp(e, sq)}
                    aria-label={piece ? `${sq} ${piece.color === "w" ? "white" : "black"} ${piece.type}` : sq}
                  >
                    {overlayBg && <span className="ct-sq-mark" style={{ background: overlayBg }} />}
                    {isCheck && <span className="ct-sq-check" />}

                    {piece && (
                      <div className={`ct-piece-wrap ${isDraggingThis ? "is-ghost" : ""}`}>
                        <ChessPiece color={piece.color} type={piece.type} pieceSet={pieceSetId} />
                      </div>
                    )}

                    {showLegalDots && isLegalTarget && !isCaptureTarget && <span className="ct-legal-dot" />}
                    {showLegalDots && isLegalTarget && isCaptureTarget && <span className="ct-capture-ring" />}

                    {badgeOverlay && badgeOverlay.square === sq && (
                      <span
                        className="ct-sq-badge"
                        style={{ backgroundColor: badgeOverlay.color }}
                      >
                        {badgeOverlay.symbol}
                      </span>
                    )}

                    {showRankCoord && <span className="ct-coord ct-coord-rank">{rank}</span>}
                    {showFileCoord && <span className="ct-coord ct-coord-file">{file}</span>}
                  </button>
                );
              })
            )}

            {allArrows.length > 0 && (
              <svg className="ct-arrow-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  {["best", "hint", "user", "alternative", "idea", "bad"].map(kind => (
                    <marker
                      key={kind}
                      id={`ct-head-${kind}`}
                      markerWidth="3.5"
                      markerHeight="3.5"
                      refX="2.3"
                      refY="1.75"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 3.5 1.75, 0 3.5"
                        fill={arrowColorFor(kind as BoardArrow["kind"])}
                      />
                    </marker>
                  ))}
                </defs>
                {allArrows.map((arrow, i) => {
                  const p1 = squareToGridPercent(arrow.from, renderedOrientation);
                  const p2 = squareToGridPercent(arrow.to, renderedOrientation);
                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  const len = Math.hypot(dx, dy) || 1;
                  const shorten = 2.4;
                  const x2 = p2.x - (dx / len) * shorten;
                  const y2 = p2.y - (dy / len) * shorten;
                  const kind = arrow.kind ?? "idea";
                  return (
                    <line
                      key={`${arrow.from}-${arrow.to}-${i}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={x2}
                      y2={y2}
                      stroke={arrowColorFor(kind)}
                      strokeWidth="2.1"
                      strokeLinecap="round"
                      markerEnd={`url(#ct-head-${kind})`}
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {bottomPlayer && <PlayerBar strip={bottomPlayer} pieceSetId={pieceSetId} />}

      {dragFrom && dragPos && draggedPiece && (
        <div
          className="ct-drag-floating"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <ChessPiece color={draggedPiece.color} type={draggedPiece.type} pieceSet={pieceSetId} />
        </div>
      )}

      {pendingPromo && (
        <PromotionModal
          color={pendingPromo.color}
          pieceSet={pieceSetId}
          onSelect={promo => {
            const { from, to } = pendingPromo;
            setPendingPromo(null);
            setSelectedSquare(null);
            onMove?.(`${from}${to}${promo}`);
          }}
          onCancel={() => {
            setPendingPromo(null);
            setSelectedSquare(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerBar({ strip, pieceSetId }: { strip: BoardPlayerStrip; pieceSetId: PieceSetId }) {
  return (
    <div className={`ct-player-strip ${strip.active ? "is-active" : ""}`}>
      <div className="ct-player-id">
        {strip.avatarUrl ? (
          <img src={strip.avatarUrl} alt={strip.name} className="ct-player-pic" />
        ) : (
          <span className="ct-player-initial">{strip.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="ct-player-meta">
          <strong>{strip.name}</strong>
          {strip.subtitle && <small>{strip.subtitle}</small>}
        </div>
      </div>

      <div className="ct-player-captures">
        {strip.captured && strip.captured.length > 0 && (
          <div className="ct-cap-row">
            {strip.captured.slice(0, 8).map((t, idx) => (
              <span key={idx} className="ct-cap-piece">
                <ChessPiece color={strip.capturedColor ?? "w"} type={t} pieceSet={pieceSetId} />
              </span>
            ))}
          </div>
        )}
        {typeof strip.materialAdvantage === "number" && strip.materialAdvantage > 0 && (
          <span className="ct-mat-adv mono-num">+{strip.materialAdvantage}</span>
        )}
      </div>

      {strip.clockMs !== null && strip.clockMs !== undefined && (
        <div className={`ct-clock mono-num ${strip.active ? "is-ticking" : ""}`}>
          {formatClockMs(strip.clockMs)}
        </div>
      )}
    </div>
  );
}
