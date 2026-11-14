import { ChessPiece } from "./ChessPiece";
import { PieceSetId } from "../domain/theme";

export function PromotionModal({
  color,
  pieceSet = "cburnett",
  onSelect,
  onCancel
}: {
  color: "w" | "b";
  pieceSet?: PieceSetId | string;
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}) {
  const pieces = [
    { type: "q" as const, label: "Queen" },
    { type: "n" as const, label: "Knight" },
    { type: "r" as const, label: "Rook" },
    { type: "b" as const, label: "Bishop" }
  ];

  return (
    <div className="ct-modal-overlay" role="dialog" aria-modal="true" aria-label="Pawn Promotion">
      <div className="ct-promotion-card">
        <div className="ct-promotion-title">Promote Pawn</div>
        <div className="ct-promotion-choices">
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              className="ct-promotion-option"
              onClick={() => onSelect(type)}
              aria-label={`Promote to ${label}`}
            >
              <div className="ct-promotion-piece">
                <ChessPiece color={color} type={type} pieceSet={pieceSet} />
              </div>
              <span className="ct-promotion-label">{label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="ct-btn ct-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
