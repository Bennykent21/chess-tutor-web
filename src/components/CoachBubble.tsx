import { MascotId, MascotMood, getMascot, mascotAssetUrl } from "../domain/theme";

export function CoachBubble({
  mascotId,
  mood = "ready",
  sideLabel,
  message,
  tone = "default",
  children
}: {
  mascotId: MascotId;
  mood?: MascotMood;
  sideLabel?: string;
  message: string;
  tone?: "default" | "success" | "warning";
  children?: React.ReactNode;
}) {
  const mascot = getMascot(mascotId);

  return (
    <div className={`ct-coach-bubble tone-${tone}`} role="status" aria-live="polite">
      <img
        src={mascotAssetUrl(mascotId, mood)}
        alt={`${mascot.displayName} (${mood})`}
        className="ct-coach-avatar"
      />
      <div className="ct-coach-body">
        <div className="ct-coach-header">
          <strong className="ct-coach-name">{mascot.displayName}</strong>
          {sideLabel && <span className="ct-coach-side">{sideLabel}</span>}
        </div>
        <p className="ct-coach-text">{message}</p>
        {children}
      </div>
    </div>
  );
}
