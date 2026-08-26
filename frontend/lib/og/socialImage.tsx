/**
 * socialImage.tsx
 *
 * Shared JSX used to render the site's Open Graph / Twitter Card share image
 * via `next/og`'s ImageResponse (Satori). Kept outside `app/` so it isn't
 * itself picked up as a route.
 */

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export interface SocialImageProps {
  title?: string;
  subtitle?: string;
}

export function SocialImage({
  title = "StellarVeriphy",
  subtitle = "Decentralized Content Verification on Stellar",
}: SocialImageProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          fontSize: 88,
          fontWeight: 700,
        }}
      >
        <span>⭐</span>
        <span style={{ color: "#93c5fd" }}>{title}</span>
      </div>
      <div style={{ marginTop: 28, fontSize: 32, color: "#cbd5e1" }}>{subtitle}</div>
    </div>
  );
}
