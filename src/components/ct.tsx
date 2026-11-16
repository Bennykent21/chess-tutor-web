/**
 * The app's design system for the web (ported from the Android app's `design/` package):
 * screen titles, section headers, picture tiles, art tiles, the hero card, list rows, the
 * streak flame and a board picture. Hub screens build from these so they look like the app.
 */
import { ReactNode, useMemo } from "react";
import { Chess } from "chess.js";
import { Check, ChevronRight, Play } from "lucide-react";
import { getBoardColors, pieceAssetUrl, PieceSetId } from "../domain/theme";

/** Positions the app uses for decorative board pictures (BoardScenes in the app). */
export const BOARD_SCENES = {
  OPENING: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
  MIDDLEGAME: "2rq1rk1/pp1bppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/2KR1B1R b - - 0 11",
  ATTACK: "r1b2rk1/ppq2ppp/2p5/4n3/4P3/2N1BP2/PPP3PP/R2Q1RK1 w - - 0 14",
  SETUP: "2r3k1/pp3ppp/2n1b3/3p4/3P4/2N1B3/PP3PPP/2R3K1 w - - 0 20",
  ENDGAME: "8/5pk1/6p1/3R4/8/6P1/r4PK1/8 w - - 0 40",
  TRAP: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
} as const;

export type CtScene =
  | "basics"
  | "openings"
  | "tactics"
  | "middlegame"
  | "endgames"
  | "blunders"
  | "battle"
  | "explore"
  | "position"
  | "rank_pawn"
  | "rank_knight"
  | "rank_bishop"
  | "rank_rook"
  | "rank_queen"
  | "rank_king";

export function sceneUrl(scene: CtScene, dark: boolean): string {
  return `/assets/art/art_${scene}_${dark ? "night" : "day"}.webp`;
}

export type MetalIconId =
  | "analytics" | "auto_stories" | "bolt" | "bug_report" | "check_circle" | "cloud_sync" | "code"
  | "delete_forever" | "description" | "download" | "emoji_events" | "extension" | "favorite" | "flag"
  | "grid_on" | "history" | "image" | "info" | "link" | "map" | "memory" | "palette" | "person"
  | "psychology" | "refresh" | "school" | "shield" | "sports_esports" | "star" | "storage" | "tune"
  | "volume_up" | "warning";

/** An icon as a polished metal object (the app's CtMetalIcon). */
export function MetalIcon({ icon, size = 32 }: { icon: MetalIconId; size?: number }) {
  return <img src={`/assets/art/icon_${icon}.webp`} alt="" width={size} height={size} className="ct2-metal" draggable={false} />;
}

/** The big title at the top of a tab (30px Grotesk) with small items on the right. */
export function ScreenTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="ct2-screen-title">
      <h1>{title}</h1>
      {children ? <div className="ct2-screen-title-trailing">{children}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="ct2-section-header">
      <h2>{title}</h2>
      {actionLabel && onAction ? (
        <button type="button" className="ct2-text-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/** The day streak: a real flame while it lives, a cold outline once it is lost. */
export function Streak({ days }: { days: number }) {
  const lit = days > 0;
  const path =
    "M12,2c0.6,3.4 -1,5.1 -2.6,6.9C7.7,10.8 6,12.7 6,15.5 6,19.1 8.7,22 12,22s6,-2.9 6,-6.5c0,-2.6 -1.2,-4.5 -2.4,-5.7 -0.2,1.3 -0.9,2.2 -1.9,2.6 0.4,-3.6 -0.6,-7.8 -1.7,-10.4z";
  return (
    <span className={`ct2-streak ${lit ? "is-lit" : ""}`} aria-label={`${days}-day streak`}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className={lit ? "ct2-breathe" : ""}>
        {lit ? (
          <>
            <defs>
              <linearGradient id="ct2-flame" x1="12" y1="22" x2="12" y2="2" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#E8441A" />
                <stop offset="1" stopColor="#F9A825" />
              </linearGradient>
            </defs>
            <path d={path} fill="url(#ct2-flame)" />
            <path
              fill="#FFD54F"
              d="M12.2,12.2c0.2,1.7 -0.7,2.6 -1.5,3.4 -0.7,0.7 -1.3,1.4 -1.3,2.6 0,1.9 1.2,3.3 2.7,3.3s2.8,-1.4 2.8,-3.2c0,-2.3 -1.5,-3.9 -2.7,-6.1z"
            />
          </>
        ) : (
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        )}
      </svg>
      <span>{days}</span>
    </span>
  );
}

/** A round glass mark on a picture. */
function GlassMark({ size, children, onArt }: { size: number; children: ReactNode; onArt?: boolean }) {
  return (
    <span className={`ct2-glass ${onArt ? "on-art" : ""}`} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

export function PlayMark({ onArt }: { onArt?: boolean }) {
  return (
    <GlassMark size={40} onArt={onArt}>
      <Play size={20} fill="currentColor" />
    </GlassMark>
  );
}

export function TickMark() {
  return (
    <GlassMark size={28}>
      <Check size={16} strokeWidth={3} />
    </GlassMark>
  );
}

interface TileWordsProps {
  title: string;
  kicker?: string;
  subtitle?: string;
  progress?: number;
  compact?: boolean;
  big?: boolean;
  trailing?: ReactNode;
}

function TileWords({ title, kicker, subtitle, progress, compact, big, trailing }: TileWordsProps) {
  return (
    <div className={`ct2-tile-words ${compact ? "is-compact" : ""}`}>
      <div className="ct2-tile-text">
        {kicker ? <div className="ct2-tile-kicker">{kicker}</div> : null}
        <div className={`ct2-tile-title ${big ? "is-big" : ""} ${compact ? "is-compact" : ""}`}>{title}</div>
        {subtitle ? <div className="ct2-tile-sub">{subtitle}</div> : null}
        {progress !== undefined ? (
          <div className="ct2-tile-track">
            <div style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
          </div>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

/**
 * A tile the picture fills; words sit on a dark fade at its foot, always white
 * (the app's CtPictureTile). Give it its size with `className` or `style`.
 */
export function PictureTile({
  picture,
  onClick,
  ariaLabel,
  fade = "strong",
  alive,
  className = "",
  style,
  ...words
}: TileWordsProps & {
  picture: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  fade?: "soft" | "strong";
  alive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`ct2-picture-tile ${words.compact ? "is-compact" : ""} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      style={style}
    >
      <div className={`ct2-tile-picture ${alive ? "ct2-swell" : ""}`} aria-hidden="true">
        {picture}
      </div>
      <div className={`ct2-fade ct2-fade-${fade}`} aria-hidden="true" />
      <TileWords {...words} />
    </Tag>
  );
}

/** The one big "continue" card at the top of Home and Puzzles. */
export function HeroCard(props: Omit<Parameters<typeof PictureTile>[0], "big" | "alive">) {
  return <PictureTile {...props} big alive className={`ct2-hero ${props.className ?? ""}`} trailing={props.trailing ?? <PlayMark />} />;
}

/**
 * A tile a rendered scene fills, melted into the theme (black or white becomes the surface),
 * with its words in the theme's own colours (the app's CtArtTile).
 */
export function ArtTile({
  scene,
  dark,
  onClick,
  ariaLabel,
  lift = 0.2,
  className = "",
  style,
  ...words
}: TileWordsProps & {
  scene: CtScene;
  dark: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  lift?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`ct2-art-tile ${words.compact ? "is-compact" : ""} ${onClick ? "" : "is-disabled"} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      style={style}
    >
      <img
        src={sceneUrl(scene, dark)}
        alt=""
        aria-hidden="true"
        className={`ct2-art-img ${dark ? "is-night" : "is-day"}`}
        style={{ transform: `translateY(${-lift * 100}%)` }}
        draggable={false}
      />
      <div className="ct2-art-fade" aria-hidden="true" />
      <TileWords {...words} />
    </Tag>
  );
}

/** A settings-style row: a metal icon, a title and a line, and a chevron. */
export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  trailing,
  onClick
}: {
  title: string;
  subtitle?: string;
  icon?: MetalIconId;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ct2-list-row" onClick={onClick}>
      {leading ?? (icon ? <span className="ct2-list-icon"><MetalIcon icon={icon} /></span> : null)}
      <span className="ct2-list-text">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      {trailing}
      <ChevronRight size={20} className="ct2-list-chevron" />
    </button>
  );
}

/** The main button of a page: solid, glossy, full width. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  big
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <button type="button" className={`ct2-primary ${big ? "is-big" : ""}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

type Grid = (null | { color: "w" | "b"; type: "p" | "n" | "b" | "r" | "q" | "k" })[][];

function gridOf(fen: string | null | undefined): Grid {
  try {
    return new Chess(fen ?? undefined).board().map(row => row.map(sq => (sq ? { color: sq.color, type: sq.type } : null)));
  } catch {
    return new Chess().board().map(row => row.map(sq => (sq ? { color: sq.color, type: sq.type } : null)));
  }
}

/**
 * The window of a [rows] x [cols] crop to show: the one nearest the middle with at least four
 * pieces (or as many as any window has). Same rule as the app's pictureWindow.
 */
function pictureWindow(grid: Grid, whiteAtBottom: boolean, rows: number, cols: number): [number, number] {
  const has = (r: number, c: number) => (whiteAtBottom ? grid[r][c] : grid[7 - r][7 - c]) !== null;
  const pieces = (wr: number, wc: number) => {
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (has(wr + r, wc + c)) n++;
    return n;
  };
  const windows: [number, number][] = [];
  for (let r = 0; r <= 8 - rows; r++) for (let c = 0; c <= 8 - cols; c++) windows.push([r, c]);
  const most = Math.max(...windows.map(([r, c]) => pieces(r, c)));
  const enough = Math.min(4, most);
  const off = ([r, c]: [number, number]) => Math.abs(2 * r + rows - 8) + Math.abs(2 * c + cols - 8);
  return windows.filter(([r, c]) => pieces(r, c) >= enough).sort((a, b) => off(a) - off(b))[0] ?? [0, 0];
}

/**
 * A board filling its box, zoomed in on the action: a picture with no coordinates and nothing to tap.
 * The box's aspect ratio is passed in so the crop can be worked out without measuring.
 */
export function BoardPicture({
  fen,
  boardThemeId,
  pieceSet,
  whiteAtBottom = true,
  aspect = 1.6,
  zoom = 1.5
}: {
  fen?: string | null;
  boardThemeId: string;
  pieceSet: PieceSetId;
  whiteAtBottom?: boolean;
  /** Width over height of the box. */
  aspect?: number;
  zoom?: number;
}) {
  const colors = getBoardColors(boardThemeId);
  const grid = useMemo(() => gridOf(fen), [fen]);
  // In units of the box width: the board is zoom * max(w, h).
  const w = 1;
  const h = 1 / aspect;
  const board = Math.max(w, h) * zoom;
  const sq = board / 8;
  const rows = Math.min(8, Math.max(1, Math.ceil((h / sq) * 0.6)));
  const cols = Math.min(8, Math.max(1, Math.floor(w / sq)));
  const [row, col] = useMemo(() => pictureWindow(grid, whiteAtBottom, rows, cols), [grid, whiteAtBottom, rows, cols]);
  const clamp = (lowest: number, v: number) => Math.min(0, Math.max(lowest, v));
  const left = clamp(w - board, (w - sq * cols) / 2 - sq * col);
  const top = clamp(h - board, -(sq * row));
  const cells = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = whiteAtBottom ? grid[r][c] : grid[7 - r][7 - c];
      const light = (r + c) % 2 === 0;
      cells.push(
        <div key={`${r}-${c}`} style={{ background: light ? colors.light : colors.dark }}>
          {piece ? <img src={pieceAssetUrl(pieceSet, piece.color, piece.type)} alt="" draggable={false} /> : null}
        </div>
      );
    }
  }
  return (
    <div className="ct2-board-picture" style={{ aspectRatio: undefined }}>
      <div
        className="ct2-board-picture-grid"
        style={{
          width: `${board * 100}%`,
          left: `${left * 100}%`,
          // top is in box-width units; convert to a share of box height.
          top: `${(top / h) * 100}%`
        }}
      >
        {cells}
      </div>
    </div>
  );
}

/** A bot's sharp face standing in a blurred wash of its own colours (the app's BotPicture). */
export function BotPicture({ src }: { src: string }) {
  return (
    <div className="ct2-bot-picture">
      <img src={src} alt="" className="ct2-bot-wash" draggable={false} />
      <img src={src} alt="" className="ct2-bot-face" draggable={false} />
    </div>
  );
}

/**
 * The coach above a board (the app's CtTutor): a mascot in a mood and a tailed bubble standing on
 * the board. Long text scrolls inside the bubble.
 */
export function Tutor({
  mascotId,
  mood = "ready",
  children
}: {
  mascotId: string;
  mood?: "ready" | "thinking" | "kind" | "proud";
  children: ReactNode;
}) {
  return (
    <div className="ct2-tutor">
      <img src={`/assets/mascot/${mascotId}_${mood}.svg`} alt="" className="ct2-tutor-mascot" />
      <div className="ct2-bubble" aria-live="polite">
        {children}
      </div>
    </div>
  );
}
