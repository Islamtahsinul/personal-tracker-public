// Shared visual for every generated app icon (favicon, apple-touch-icon, PWA
// manifest icons). One definition keeps all sizes visually consistent and
// avoids drifting from the app's actual theme tokens (see globals.css).
const BACKGROUND = "linear-gradient(135deg, #0d0c14 0%, #17141f 100%)";
const ACCENT = "linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)";
const CHECK_STROKE = "#f8f9ff";

export function AppIconMark({
  size,
  bleed = false,
  safeZone = false,
}: {
  size: number;
  /** Fill the full square with no rounded corners — for icons the OS masks itself (iOS, Android maskable). */
  bleed?: boolean;
  /** Shrink the glyph to Android's maskable safe zone (inner ~80% diameter) so adaptive-icon crops don't clip it. */
  safeZone?: boolean;
}) {
  const radius = bleed ? 0 : Math.round(size * 0.22);
  const circle = Math.round(size * (safeZone ? 0.46 : 0.6));
  const check = Math.round(circle * 0.56);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
        borderRadius: radius,
      }}
    >
      <div
        style={{
          width: circle,
          height: circle,
          borderRadius: circle,
          background: ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={check} height={check} viewBox="0 0 100 100" fill="none">
          <path
            d="M24 54 L42 71 L78 30"
            stroke={CHECK_STROKE}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
