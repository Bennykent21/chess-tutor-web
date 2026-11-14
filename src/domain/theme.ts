export type AppThemeId = "slate" | "parchment" | "baize" | "mono";
export type AppearanceMode = "system" | "light" | "dark";
export type BoardOrientationPref = "follow-side" | "white-always-bottom";
export type PieceSetId = "cburnett" | "merida" | "chessnut" | "fantasy";
export type BoardColorsId =
  | "slate"
  | "classic"
  | "meadow"
  | "lagoon"
  | "walnut"
  | "ice"
  | "neon"
  | "marble"
  | "parchment"
  | "baize"
  | "mono";

export type MascotId = "pip" | "rookie" | "sage";
export type MascotMood = "ready" | "thinking" | "kind" | "proud";

export interface PieceSetMeta {
  id: PieceSetId;
  displayName: string;
  credit: string;
  license: string;
}

export const PIECE_SETS: PieceSetMeta[] = [
  { id: "cburnett", displayName: "Classic", credit: "Colin M.L. Burnett", license: "GPLv2+" },
  { id: "merida", displayName: "Merida", credit: "Armando Hernandez Marroquin", license: "GPLv2+" },
  { id: "chessnut", displayName: "Chessnut", credit: "Alexis Luengas", license: "Apache 2.0" },
  { id: "fantasy", displayName: "Fantasy", credit: "Maurizio Monge", license: "MIT" }
];

export interface BoardColorTheme {
  id: BoardColorsId;
  displayName: string;
  light: string;
  dark: string;
  coordinateOnLight: string;
  coordinateOnDark: string;
  sheen?: boolean;
}

export const BOARD_COLORS: BoardColorTheme[] = [
  { id: "slate", displayName: "Slate", light: "#E8E0D1", dark: "#58707E", coordinateOnLight: "#3A4F5C", coordinateOnDark: "#FFFFFF" },
  { id: "classic", displayName: "Classic Wood", light: "#EFDAB8", dark: "#B5835A", coordinateOnLight: "#5A3418", coordinateOnDark: "#2A1708", sheen: true },
  { id: "meadow", displayName: "Meadow", light: "#E9EDCF", dark: "#6E9A55", coordinateOnLight: "#3C5A2A", coordinateOnDark: "#0F2209" },
  { id: "lagoon", displayName: "Lagoon", light: "#DCE8F2", dark: "#6690BA", coordinateOnLight: "#2B4C6E", coordinateOnDark: "#061525" },
  { id: "walnut", displayName: "Walnut", light: "#E3C29C", dark: "#A26E44", coordinateOnLight: "#4A2A12", coordinateOnDark: "#0D0500", sheen: true },
  { id: "ice", displayName: "Ice", light: "#F2F7FB", dark: "#A9C7DD", coordinateOnLight: "#4F6F86", coordinateOnDark: "#1C3346" },
  { id: "neon", displayName: "Neon", light: "#C9F7F2", dark: "#7B6CF0", coordinateOnLight: "#3A2F96", coordinateOnDark: "#0E0838" },
  { id: "marble", displayName: "Marble", light: "#ECEAE6", dark: "#A7A39C", coordinateOnLight: "#55514B", coordinateOnDark: "#1F1D1A", sheen: true },
  { id: "parchment", displayName: "Parchment", light: "#ECDDC2", dark: "#B8956A", coordinateOnLight: "#5A3418", coordinateOnDark: "#2A1708" },
  { id: "baize", displayName: "Baize", light: "#E6EBDD", dark: "#7C9D84", coordinateOnLight: "#3C5A2A", coordinateOnDark: "#0F2209" },
  { id: "mono", displayName: "Mono", light: "#EAD3AF", dark: "#B3825A", coordinateOnLight: "#5A3418", coordinateOnDark: "#2A1708" }
];

export const APP_THEMES: { id: AppThemeId; label: string; defaultBoard: BoardColorsId; swatchBg: string; swatchAccent: string }[] = [
  { id: "slate", label: "Slate", defaultBoard: "slate", swatchBg: "#0E1216", swatchAccent: "#D4A24C" },
  { id: "parchment", label: "Parchment", defaultBoard: "parchment", swatchBg: "#F4EFE6", swatchAccent: "#7D6035" },
  { id: "baize", label: "Baize", defaultBoard: "baize", swatchBg: "#0D1210", swatchAccent: "#7CC19B" },
  { id: "mono", label: "Mono", defaultBoard: "mono", swatchBg: "#000000", swatchAccent: "#F5F5F5" }
];

export interface MascotInfo {
  id: MascotId;
  displayName: string;
  tagline: string;
}

export const MASCOTS: MascotInfo[] = [
  { id: "pip", displayName: "Pip", tagline: "An eager pawn who grows with you" },
  { id: "rookie", displayName: "Rookie", tagline: "A steady rook with a brass band, calm under pressure" },
  { id: "sage", displayName: "Sage", tagline: "A patient turtle with a chessboard shell" }
];

export function getBoardColors(id: string | undefined): BoardColorTheme {
  return BOARD_COLORS.find(b => b.id === id) ?? BOARD_COLORS[0];
}

export function getPieceSet(id: string | undefined): PieceSetMeta {
  return PIECE_SETS.find(p => p.id === id) ?? PIECE_SETS[0];
}

export function getMascot(id: string | undefined): MascotInfo {
  return MASCOTS.find(m => m.id === id) ?? MASCOTS[0];
}

export function mascotAssetUrl(id: MascotId, mood: MascotMood = "ready"): string {
  return `/assets/mascot/${id}_${mood}.svg`;
}

export function botAssetUrl(faceId: string): string {
  return `/assets/bots/${faceId}.svg`;
}

export function pieceAssetUrl(setId: PieceSetId, color: "w" | "b", pieceType: "p" | "n" | "b" | "r" | "q" | "k"): string {
  return `/assets/pieces/${setId}/${color}${pieceType.toUpperCase()}.svg`;
}

export function whiteAtBottom(orientation: BoardOrientationPref, playerSide: "w" | "b"): boolean {
  if (orientation === "white-always-bottom") return true;
  return playerSide === "w";
}

export const BOARD_MARK_COLORS = {
  lastMove: "rgba(214, 170, 74, 0.45)",
  selected: "rgba(214, 170, 74, 0.66)",
  legalDot: "rgba(40, 28, 10, 0.28)",
  check: "rgba(217, 71, 59, 0.85)",
  arrowBest: "rgba(46, 134, 80, 0.82)",
  arrowHint: "rgba(214, 170, 74, 0.85)",
  arrowUser: "rgba(28, 138, 163, 0.82)",
  arrowAlternative: "rgba(71, 105, 204, 0.72)",
  arrowIdea: "rgba(214, 170, 74, 0.75)",
  arrowBad: "rgba(191, 55, 40, 0.82)",
  mistake: "rgba(191, 55, 40, 0.72)"
};

export interface RatingRankInfo {
  id: "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
  label: string;
  from: number;
  artDay: string;
  artNight: string;
}

export const RATING_RANKS: RatingRankInfo[] = [
  { id: "pawn", label: "Pawn", from: 0, artDay: "/assets/art/art_rank_pawn_day.webp", artNight: "/assets/art/art_rank_pawn_night.webp" },
  { id: "knight", label: "Knight", from: 800, artDay: "/assets/art/art_rank_knight_day.webp", artNight: "/assets/art/art_rank_knight_night.webp" },
  { id: "bishop", label: "Bishop", from: 1200, artDay: "/assets/art/art_rank_bishop_day.webp", artNight: "/assets/art/art_rank_bishop_night.webp" },
  { id: "rook", label: "Rook", from: 1500, artDay: "/assets/art/art_rank_rook_day.webp", artNight: "/assets/art/art_rank_rook_night.webp" },
  { id: "queen", label: "Queen", from: 1800, artDay: "/assets/art/art_rank_queen_day.webp", artNight: "/assets/art/art_rank_queen_night.webp" },
  { id: "king", label: "King", from: 2200, artDay: "/assets/art/art_rank_king_day.webp", artNight: "/assets/art/art_rank_king_night.webp" }
];

export function ratingRankOf(rating: number): RatingRankInfo {
  for (let i = RATING_RANKS.length - 1; i >= 0; i--) {
    if (rating >= RATING_RANKS[i].from) return RATING_RANKS[i];
  }
  return RATING_RANKS[0];
}
