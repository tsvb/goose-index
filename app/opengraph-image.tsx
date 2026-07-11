import { ImageResponse } from "next/og";

// Default social card: the Feather mark and wordmark on the almanac dark
// ground. Uses next/og's bundled font only — no network fetch at render time.
export const alt = "Goose Index — every show, indexed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#15110c",
          backgroundImage:
            "radial-gradient(circle at 50% 36%, rgba(237, 171, 68, 0.16), rgba(21, 17, 12, 0) 58%)",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <svg
          width="132"
          height="132"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#edab44"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <path d="M16 8 2 22" />
          <path d="M17.5 15H9" />
        </svg>
        <div
          style={{
            marginTop: 34,
            fontSize: 104,
            letterSpacing: "-0.02em",
            color: "#f3ead9",
          }}
        >
          Goose Index
        </div>
        <div
          style={{
            marginTop: 26,
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div style={{ width: 64, height: 1, backgroundColor: "rgba(237, 171, 68, 0.4)" }} />
          <div
            style={{
              fontSize: 27,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#edab44",
            }}
          >
            Every show, indexed.
          </div>
          <div style={{ width: 64, height: 1, backgroundColor: "rgba(237, 171, 68, 0.4)" }} />
        </div>
      </div>
    ),
    size,
  );
}
