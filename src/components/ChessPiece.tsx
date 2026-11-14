import { PieceSetId, pieceAssetUrl } from "../domain/theme";

export function ChessPiece({
  color,
  type,
  pieceSet = "cburnett",
  className = ""
}: {
  color: "w" | "b";
  type: "p" | "n" | "b" | "r" | "q" | "k";
  pieceSet?: PieceSetId | string;
  className?: string;
}) {
  const safeSet: PieceSetId =
    pieceSet === "merida" || pieceSet === "chessnut" || pieceSet === "fantasy"
      ? pieceSet
      : "cburnett";

  return (
    <img
      src={pieceAssetUrl(safeSet, color, type)}
      alt={`${color === "w" ? "White" : "Black"} ${type.toUpperCase()}`}
      className={`ct-piece-svg ${className}`.trim()}
      draggable={false}
    />
  );
}
