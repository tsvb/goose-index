import { ImageResponse } from "next/og";

// The Feather mark (app/_components/marks.tsx) in snow on Yeti's night, the
// 3.0 edition's ground (the default edition, so the site's face).
// iOS applies its own corner mask, so the background stays solid and square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F1424",
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E9EEF7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <path d="M16 8 2 22" />
          <path d="M17.5 15H9" />
        </svg>
      </div>
    ),
    size,
  );
}
