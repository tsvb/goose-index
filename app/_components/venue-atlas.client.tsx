"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { US_STATE_PATHS, US_VIEWBOX } from "@/lib/us-states";
import type { StateShows, CountryShows } from "@/lib/queries/dimensions";
import type { StateRoster } from "./venue-atlas";

// ── geometry constants (module scope: pure, only depend on the country box) ──
const W = 959,
  H = 593,
  A = W / H; // ≈ 1.6172; H*A === W exactly → the aspect-ratio pin never letterboxes.
const V0: View = { x: 0, y: 0, w: W, h: H };
const MAX_ZOOM = 8,
  MIN_W = W / MAX_ZOOM; // ≈ 119.875 — magnification floor for tiny states.
const PAD = 0.16; // padding fraction around a focused state's bbox.
const ZOOM_SENS = 0.0015,
  DRAG_PX = 4,
  ANIM_MS = 480;

type View = { x: number; y: number; w: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Never larger than the country; centred when fully out; otherwise strictly inside. */
function clampPan(v: View): View {
  const w = Math.min(v.w, W);
  const h = Math.min(v.h, H);
  const x = w >= W ? (W - w) / 2 : clamp(v.x, 0, W - w);
  const y = h >= H ? (H - h) / 2 : clamp(v.y, 0, H - h);
  return { x, y, w, h };
}

/** A state's bbox → aspect-correct, padded, magnification-capped, clamped view. */
function frame(b: { x: number; y: number; width: number; height: number }): View {
  let w = b.width * (1 + 2 * PAD);
  let h = b.height * (1 + 2 * PAD);
  if (w / h < A) w = h * A;
  else h = w / A; // grow the short axis to the screen aspect → contains b, no distortion.
  if (w < MIN_W) {
    w = MIN_W;
    h = w / A;
  }
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  return clampPan({ x: cx - w / 2, y: cy - h / 2, w, h });
}

function zoomAboutCenter(v: View, k: number): View {
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const nw = clamp(v.w * k, MIN_W, W);
  const nh = nw / A;
  return clampPan({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
}

const MIN_OPACITY = 0.14;

/**
 * The interactive atlas.
 *
 * Colour means exactly one thing — number of shows — encoded as the same log-
 * scaled fill VenueMap uses, computed here as a pure function of props so SSR and
 * hydration are byte-identical. Focus uses two DIFFERENT channels: the others dim
 * (CSS opacity) and the focused state gets a stroke ring — never a new fill hue.
 *
 * With JS off the server-rendered SVG is the whole product: every state drawn,
 * played states linking to their ledger group. Zoom controls, the roster panel
 * and the live region appear only once hydrated, so no-JS users meet zero dead
 * buttons.
 */
export function VenueAtlasClient(props: {
  states: StateShows[];
  countries: CountryShows[];
  rosters: Record<string, StateRoster>;
}) {
  // `countries` is part of the island contract but the server renders the
  // "Beyond the US" block as text — the client only draws US states.
  const { states, rosters } = props;
  // ── choropleth encoding — pure fn of props (SSR === hydration) ──
  const byState = new Map(states.map((s) => [s.state, s]));
  const most = Math.max(1, ...states.map((s) => s.shows));
  const hottest = states.reduce<StateShows | null>((a, b) => (!a || b.shows > a.shows ? b : a), null);
  const shade = (shows: number) => MIN_OPACITY + (Math.log(shows) / Math.log(most)) * (1 - MIN_OPACITY);

  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [live, setLive] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);
  const view = useRef<View>({ ...V0 }); // source of truth for pan/zoom — NOT React state.
  const bbox = useRef<Record<string, DOMRect>>({});
  const rafId = useRef(0);
  const reduce = useRef(false);
  const suppressClick = useRef(false);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const apply = useCallback((v: View) => {
    svgRef.current?.setAttribute(
      "viewBox",
      `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`,
    );
  }, []);

  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(rafId.current);
      const from = view.current;
      const commit = () => {
        view.current = target;
        apply(target);
      };
      if (reduce.current) return commit();
      const t0 = performance.now();
      const fCx = from.x + from.w / 2,
        fCy = from.y + from.h / 2;
      const tCx = target.x + target.w / 2,
        tCy = target.y + target.h / 2;
      const step = (now: number) => {
        const e = easeInOutCubic(Math.min(1, (now - t0) / ANIM_MS));
        const w = from.w * Math.pow(target.w / from.w, e); // geometric zoom → uniform perceived scale.
        const h = w / A;
        const cx = fCx + (tCx - fCx) * e;
        const cy = fCy + (tCy - fCy) * e;
        apply({ x: cx - w / 2, y: cy - h / 2, w, h });
        if (e < 1) rafId.current = requestAnimationFrame(step);
        else commit();
      };
      rafId.current = requestAnimationFrame(step);
    },
    [apply],
  );

  const reset = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    animateTo({ ...V0 });
    setFocused(null);
    setLive("Showing all states.");
    lastTrigger.current?.focus();
  }, [animateTo]);

  const focusState = useCallback(
    (code: string, triggerEl: HTMLElement | null) => {
      const el = svgRef.current?.querySelector<SVGPathElement>(`path[data-state="${code}"]`);
      if (!el) return;
      const b = (bbox.current[code] ??= el.getBBox());
      if (!b || b.width === 0) return animateTo({ ...V0 }); // hidden/unrendered → whole country.
      lastTrigger.current = triggerEl ?? null;
      setFocused(code);
      const r = rosters[code];
      setLive(
        r
          ? `Focused ${r.state} — ${r.shows} shows across ${r.venueCount} venues.`
          : `Focused ${code} — never played.`,
      );
      animateTo(frame(b));
    },
    [animateTo, rosters],
  );

  // Mount flag → controls/panel/live render only after hydration.
  useEffect(() => setMounted(true), []);

  // prefers-reduced-motion, kept live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce.current = mq.matches;
    const on = () => (reduce.current = mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Wheel zoom-to-cursor. Native listener (passive:false) — React onWheel is
  // passive, so its preventDefault would be ignored and the page would scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !mounted) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const v = view.current;
      const fx = (p.x - v.x) / v.w,
        fy = (p.y - v.y) / v.h;
      const nw = clamp(v.w * Math.exp(e.deltaY * ZOOM_SENS), MIN_W, W);
      const nh = nw / A;
      const nv = clampPan({ x: p.x - fx * nw, y: p.y - fy * nh, w: nw, h: nh });
      view.current = nv;
      apply(nv);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [mounted, apply]);

  // After mount, make unplayed states keyboard-reachable and clickable — they
  // have no ledger anchor, so no-JS leaves them as plain drawn shapes.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !mounted) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path[data-state]")).filter(
      (p) => !byState.has(p.getAttribute("data-state") || ""),
    );
    const cleanups: (() => void)[] = [];
    for (const p of paths) {
      const code = p.getAttribute("data-state") || "";
      p.setAttribute("tabindex", "0");
      p.setAttribute("role", "button");
      p.setAttribute("aria-label", `${code} — never played`);
      const onClick = () => focusState(code, null);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          focusState(code, null);
        }
      };
      p.addEventListener("click", onClick);
      p.addEventListener("keydown", onKey);
      cleanups.push(() => {
        p.removeEventListener("click", onClick);
        p.removeEventListener("keydown", onKey);
      });
    }
    return () => cleanups.forEach((c) => c());
    // byState is derived fresh each render from the same props; focusState is stable.
  }, [mounted, focusState, byState]);

  // Move DOM focus to the roster heading after it paints.
  useEffect(() => {
    if (!focused) return;
    const id = requestAnimationFrame(() => titleRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [focused]);

  // ── pointer pan ──
  const drag = useRef<{ id: number; sx: number; sy: number; start: View; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!mounted) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, start: { ...view.current }, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx,
      dy = e.clientY - d.sy;
    if (Math.hypot(dx, dy) > DRAG_PX) d.moved = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / view.current.w, rect.height / view.current.h); // uniform (meet).
    const nv = clampPan({ x: d.start.x - dx / scale, y: d.start.y - dy / scale, w: d.start.w, h: d.start.h });
    view.current = nv;
    apply(nv);
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
    if (d.moved) suppressClick.current = true; // a pan over a state must not focus it.
    drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && focused) {
      e.preventDefault();
      reset();
    }
  };

  // Cancel any in-flight animation on unmount.
  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const onStateClick = (code: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!mounted) return; // no-JS/SSR: let the anchor jump to the ledger.
    e.preventDefault();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    focusState(code, e.currentTarget);
  };
  const onStateKey = (code: string) => (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (!mounted) return;
    if (e.key === " ") {
      e.preventDefault();
      focusState(code, e.currentTarget);
    }
  };

  const roster = focused ? rosters[focused] : null;

  return (
    <figure className={`atlas${focused ? " has-focus" : ""}`} data-focus={focused ?? undefined} onKeyDown={onKeyDown}>
      <svg
        ref={svgRef}
        className="atlas-svg"
        viewBox={US_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Goose shows by US state. ${states.length} states played; most in ${hottest?.state ?? "—"} with ${hottest?.shows ?? 0}.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {Object.entries(US_STATE_PATHS).map(([code, d]) => {
          const hit = byState.get(code);
          const top = hit && hottest && code === hottest.state;
          const path = (
            <path
              key="p"
              d={d}
              data-state={code}
              className={`atlas-state${focused === code ? " is-focused" : ""}`}
              fill={hit ? (top ? "var(--ember)" : "var(--gold)") : "var(--surface-2)"}
              fillOpacity={hit ? shade(hit.shows) : 1}
              stroke="var(--bg)"
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
            >
              <title>
                {hit
                  ? `${code} — ${hit.shows} ${hit.shows === 1 ? "show" : "shows"} at ${hit.venues} ${hit.venues === 1 ? "venue" : "venues"}`
                  : `${code} — never played`}
              </title>
            </path>
          );
          return hit ? (
            <a key={code} href={`#g-${code.toLowerCase()}`} onClick={onStateClick(code)} onKeyDown={onStateKey(code)}>
              {path}
            </a>
          ) : (
            <g key={code}>{path}</g>
          );
        })}
      </svg>

      {mounted && (
        <div className="atlas-controls">
          <button
            type="button"
            className="atlas-btn"
            aria-label="Zoom in"
            onClick={() => animateTo(zoomAboutCenter(view.current, 1 / 1.5))}
          >
            +
          </button>
          <button
            type="button"
            className="atlas-btn"
            aria-label="Zoom out"
            onClick={() => animateTo(zoomAboutCenter(view.current, 1.5))}
          >
            −
          </button>
          <button
            type="button"
            className="atlas-btn"
            aria-label="Reset view to the whole country"
            onClick={reset}
          >
            ⤾
          </button>
        </div>
      )}

      {mounted && (
        <aside className="atlas-roster" aria-live="off">
          {focused && roster && (
            <>
              <h3 className="atlas-roster-title" tabIndex={-1} ref={titleRef}>
                {roster.state} — {roster.shows} {roster.shows === 1 ? "show" : "shows"} · {roster.venueCount}{" "}
                {roster.venueCount === 1 ? "venue" : "venues"}
              </h3>
              <p className="atlas-roster-caption">
                The rooms, by show count — the archive has no position within a state.
              </p>
              <div className="atlas-roster-actions">
                <button type="button" className="atlas-btn" onClick={reset}>
                  ← All states
                </button>
                <a className="atlas-roster-jump" href={`#g-${focused.toLowerCase()}`}>
                  Jump to the {focused} ledger →
                </a>
              </div>
              <div className="atlas-roster-cities">
                {roster.cities.map((c) => (
                  <div key={c.city || "__unlisted"} className="atlas-roster-city">
                    <h4>{c.city || "City unlisted"}</h4>
                    <ul>
                      {c.venues.map((v) => (
                        <li key={v.id}>
                          <a href={`/venues/${v.id}`}>{v.name}</a>{" "}
                          <span className="atlas-roster-count">{v.shows}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
          {focused && !roster && (
            <>
              <h3 className="atlas-roster-title" tabIndex={-1} ref={titleRef}>
                {focused} — never played
              </h3>
              <p className="atlas-roster-caption">
                Goose has not played {focused}. Absence is a fact, not empty space.
              </p>
              <div className="atlas-roster-actions">
                <button type="button" className="atlas-btn" onClick={reset}>
                  ← All states
                </button>
              </div>
            </>
          )}
        </aside>
      )}

      {mounted && (
        <div className="atlas-live" aria-live="polite" aria-atomic="true">
          {live}
        </div>
      )}
    </figure>
  );
}
