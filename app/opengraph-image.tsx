import { ImageResponse } from "next/og";

// Default social card: the Feather mark and wordmark in snow on Yeti's night,
// with the snow glow from the top edge (3.0 is the default edition, so this is
// the site's face). Uses next/og's bundled font only — no network fetch at
// render time (it can't use the system rounded face).
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
          backgroundColor: "#0F1424",
          backgroundImage:
            "radial-gradient(120% 70% at 50% -10%, rgba(233, 238, 247, 0.12), rgba(233, 238, 247, 0) 70%)",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <svg
          width="132"
          height="132"
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
        <div
          style={{
            marginTop: 34,
            fontSize: 104,
            letterSpacing: "-0.02em",
            color: "#E9EEF7",
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
          <div style={{ width: 64, height: 1, backgroundColor: "#2E3A5C" }} />
          <div
            style={{
              fontSize: 30,
              color: "#9FABCE",
            }}
          >
            Every show, indexed.
          </div>
          <div style={{ width: 64, height: 1, backgroundColor: "#2E3A5C" }} />
        </div>
      </div>
    ),
    size,
  );
}
