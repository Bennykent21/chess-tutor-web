import { ChessPiece } from "./ChessPiece";

export function PromotionModal({
  color,
  onSelect,
  onCancel
}: {
  color: "w" | "b";
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
    <div className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Pawn Promotion">
      <div className="promotion-card">
        <div className="promotion-title">Promote Pawn</div>
        <div className="promotion-choices">
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              className="promotion-option"
              onClick={() => onSelect(type)}
              title={label}
              aria-label={`Promote to ${label}`}
            >
              <div className="promotion-piece-wrap">
                <ChessPiece color={color} type={type} />
              </div>
              <span className="promotion-label">{label}</span>
            </button>
          ))}
        </div>
        <button className="promotion-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
