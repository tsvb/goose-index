#!/usr/bin/env python3
"""
goose_bandcamp_scrape.py
========================
Scrape the full Goose (goosetheband.bandcamp.com) catalog into structured data
ready for import into a website database.

What it produces
----------------
For every release it captures album metadata, the full track list with exact
durations, the parsed setlist (with segue notation and footnote refs), the
Coach's Notes footnotes, and the Show Notes block.

Outputs (into --out, default ./data):
    albums.jsonl              one nested JSON object per album  (best for a JS/TS import script)
    albums.csv                flat album table
    tracks.csv                flat track table   (album_id, track_num, title, duration_sec)
    setlist.csv               flat setlist table (album_id, set_name, position, song, segue, footnotes)
    coach_notes.csv           flat notes table   (album_id, marker, note)
    goose_bandcamp.sqlite     ready-to-query relational DB of all of the above
    schema.sql                DDL, if you'd rather load into Postgres/MySQL
    types.ts                  TypeScript interfaces matching albums.jsonl
    report.txt                parse-coverage + anomaly report

How it behaves
--------------
* Serial + polite. Default 1.5s between requests, exponential backoff on 429/5xx,
  honours Retry-After.
* Caches every raw HTML page under <out>/cache/. Re-runs are free and resumable;
  kill it and restart any time. Use --refresh to force re-fetch.
* Only touches /music and /album/* — both allowed by Bandcamp's robots.txt.
  (It deliberately does NOT use bandcamp.com/api/*, which robots.txt disallows.)

Usage
-----
    python3 goose_bandcamp_scrape.py                    # full run (~510 releases)
    python3 goose_bandcamp_scrape.py --limit 15         # smoke test
    python3 goose_bandcamp_scrape.py --live-only        # skip studio LPs/EPs
    python3 goose_bandcamp_scrape.py --refresh          # ignore cache
    python3 goose_bandcamp_scrape.py --delay 3.0        # be extra gentle
"""

from __future__ import annotations

import argparse
import csv
import html as htmllib
import json
import os
import re
import sqlite3
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://goosetheband.bandcamp.com"
MUSIC_URL = f"{BASE}/music"

# Put a real contact address here. Bandcamp is a small company; identifying
# yourself is the difference between "a fan indexing shows" and "a bot".
USER_AGENT = (
    "GooseIndexBot/1.0 (+https://gooseindex.com; contact: you@example.com) "
    "python-urllib"
)

ART_TMPL = "https://f4.bcbits.com/img/a{art_id}_{size}.jpg"
ART_SIZES = {"large": 10, "medium": 16, "thumb": 7}


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------
class Fetcher:
    def __init__(self, cache_dir: Path, delay: float = 1.5, refresh: bool = False):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay = delay
        self.refresh = refresh
        self._last = 0.0
        self.hits = 0
        self.misses = 0

    def _throttle(self):
        wait = self.delay - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.time()

    def get(self, url: str, cache_key: str) -> str:
        path = self.cache_dir / f"{cache_key}.html"
        if path.exists() and not self.refresh:
            self.hits += 1
            return path.read_text(encoding="utf-8")

        backoff = 5.0
        for attempt in range(1, 6):
            self._throttle()
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            })
            try:
                with urllib.request.urlopen(req, timeout=45) as resp:
                    body = resp.read().decode("utf-8", "replace")
                path.write_text(body, encoding="utf-8")
                self.misses += 1
                return body
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    retry_after = e.headers.get("Retry-After")
                    sleep_for = float(retry_after) if (retry_after or "").isdigit() else backoff
                    print(f"    ! HTTP {e.code} on {url} — sleeping {sleep_for:.0f}s "
                          f"(attempt {attempt}/5)", file=sys.stderr)
                    time.sleep(sleep_for)
                    backoff *= 2
                    continue
                raise
            except (urllib.error.URLError, TimeoutError) as e:
                print(f"    ! {e} on {url} — retrying in {backoff:.0f}s "
                      f"(attempt {attempt}/5)", file=sys.stderr)
                time.sleep(backoff)
                backoff *= 2
        raise RuntimeError(f"gave up on {url}")


# --------------------------------------------------------------------------
# Parsing helpers
# --------------------------------------------------------------------------
def _embedded_json(html: str, attr: str) -> dict | list | None:
    """Bandcamp hangs its page state off HTML-escaped attributes."""
    m = re.search(rf'{attr}="([^"]*)"', html)
    if not m:
        return None
    return json.loads(htmllib.unescape(m.group(1)))


def parse_bc_date(s: str | None) -> str | None:
    """'28 Sep 2025 06:40:45 GMT' -> '2025-09-28T06:40:45+00:00'"""
    if not s:
        return None
    try:
        dt = datetime.strptime(s, "%d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except ValueError:
        return None


TITLE_RE = re.compile(r"^(\d{4})/(\d{2})/(\d{2})\s+(.*)$")


def parse_title(title: str) -> dict:
    """
    '2025/06/21 CMAC, Canandaigua, NY' ->
        show_date=2025-06-21, venue='CMAC', city='Canandaigua', region='NY'

    Older entries omit the venue: '2018/02/15 Covington, KY'
    """
    out = {"is_live": False, "show_date": None, "venue": None,
           "city": None, "region": None, "location_raw": None}
    m = TITLE_RE.match(title.strip())
    if not m:
        return out  # studio album / EP / single

    y, mo, d, loc = m.groups()
    out["is_live"] = True
    out["show_date"] = f"{y}-{mo}-{d}"
    out["location_raw"] = loc.strip()

    parts = [p.strip() for p in loc.split(",") if p.strip()]
    if len(parts) >= 3:
        out["venue"] = ", ".join(parts[:-2])
        out["city"] = parts[-2]
        out["region"] = parts[-1]
    elif len(parts) == 2:
        out["city"], out["region"] = parts          # no venue recorded
    elif len(parts) == 1:
        out["venue"] = parts[0]
    return out


# Section headers inside the `about` blob.
COACH_HDR_RE = re.compile(r"^\s*(?:coach(?:[\u2019']s|es|'s)?\s*)?notes\s*:\s*(.*)$", re.I)
SHOW_HDR_RE = re.compile(r"^\s*show\s*notes\s*:\s*(.*)$", re.I)
# Set headers are wildly inconsistent across the catalogue:
#   'Set 1:'  'Set:'  'Set One:'  'Set I:'  'Encore:'  'E:'
_SET_WORDS = r"one|two|three|four|1|2|3|4|i{1,3}|iv"
SET_HDR_RE = re.compile(rf"^\s*(set(?:\s*(?:{_SET_WORDS}))?|encore\s*\d*|enc|e)\s*:\s*(.+)$", re.I)
# Footnote markers appear as BOTH [1] and {1} depending on who typed the notes.
FOOTNOTE_RE = re.compile(r"^\s*[\[{](\d+)[\]}]\s*(.*)$")
REF_RE = re.compile(r"[\[{](\d+)[\]}]")
# Goose's notes use several segue glyphs interchangeably. Longest match first.
SEP_RE = re.compile(r"(->|\u2192|\u21d2|>>|>|,)")
SEGUE_TOKENS = {">", "->", "\u2192", "\u21d2", ">>"}
_MASK = "\x00"  # sentinel used to protect separators inside song titles

_SET_NUM = {"one": "1", "two": "2", "three": "3", "four": "4",
            "i": "1", "ii": "2", "iii": "3", "iv": "4"}


def normalize_set_name(raw: str) -> str:
    r = raw.strip().lower()
    if r.startswith("set"):
        rest = r[3:].strip()
        if not rest:
            return "Set 1"                       # bare 'Set:' == a single-set show
        return f"Set {_SET_NUM.get(rest, rest)}"  # 'Set One' / 'Set II' / 'Set 2'
    if r in ("e", "enc") or r.startswith("encore"):
        n = re.sub(r"\D", "", r)
        return f"Encore {n}".strip() if n else "Encore"
    return raw.strip()


def mask_titles(text: str, known_titles: list[str]) -> str:
    """
    Protect separators that live *inside* a song title before we split on them.
    'One In, One Out' and 'Don't Think Twice, It's Alright' are songs, not two
    songs. We use the album's own track list as the vocabulary, so this needs no
    hand-maintained list.
    """
    for title in sorted(known_titles, key=len, reverse=True):
        t = title.strip()
        if not t or not SEP_RE.search(t):
            continue
        masked = SEP_RE.sub(lambda m: _MASK + str(ord(m.group(1)[0])) + _MASK, t)
        text = re.sub(re.escape(t), masked.replace("\\", "\\\\"), text, flags=re.I)
    return text


def unmask(text: str) -> str:
    return re.sub(_MASK + r"(\d+)" + _MASK, lambda m: chr(int(m.group(1))), text)


def parse_setlist_line(text: str, known_titles: list[str] | None = None) -> list[dict]:
    """
    'Song A > Song B[1], Song C' ->
      [{position, song, transition:'segue'|'next'|None, footnotes:[...]}, ...]
    """
    if known_titles:
        text = mask_titles(text, known_titles)

    tokens = SEP_RE.split(text)
    songs = [t.strip() for t in tokens[0::2]]
    seps = [t.strip() for t in tokens[1::2]]

    entries = []
    pos = 0
    for i, raw in enumerate(songs):
        if not raw:
            continue
        pos += 1
        refs = [int(n) for n in REF_RE.findall(raw)]
        clean = unmask(REF_RE.sub("", raw)).strip(" .*")
        sep = seps[i] if i < len(seps) else None
        if sep in SEGUE_TOKENS:
            transition = "segue"
        elif sep == ",":
            transition = "next"
        else:
            transition = None
        entries.append({
            "position": pos,
            "song": clean,
            "transition": transition,
            "footnotes": refs,
        })
    return entries


def parse_about(about: str, known_titles: list[str] | None = None) -> dict:
    """Split the `about` blob into setlist / coach's notes / show notes."""
    result = {
        "sets": [],            # [{set_name, songs:[...]}]
        "coach_notes": {},     # {"1": "text", ...}
        "show_notes": None,
        "notes_raw": about or None,
    }
    if not about:
        return result

    mode = "head"
    current_marker = None
    coach_lines: dict[str, list[str]] = {}
    coach_preamble: list[str] = []
    show_lines: list[str] = []

    for raw_line in about.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        # 'Show Notes:' must be tested first — COACH_HDR_RE also accepts a bare 'Notes:'.
        m = SHOW_HDR_RE.match(stripped)
        if m:
            mode = "show"
            if m.group(1).strip():
                show_lines.append(m.group(1).strip())
            continue

        m = COACH_HDR_RE.match(stripped)
        if m:
            mode = "coach"
            current_marker = None
            if m.group(1).strip():
                coach_preamble.append(m.group(1).strip())
            continue

        if mode in ("head", "coach"):
            m = SET_HDR_RE.match(stripped)
            # A set header only counts before we've entered the notes sections.
            if m and mode == "head":
                result["sets"].append({
                    "set_name": normalize_set_name(m.group(1)),
                    "songs": parse_setlist_line(m.group(2), known_titles),
                })
                continue

        if mode == "coach":
            m = FOOTNOTE_RE.match(stripped)
            if m:
                current_marker = m.group(1)
                coach_lines.setdefault(current_marker, []).append(m.group(2).strip())
            elif stripped:
                # continuation of the previous footnote, or free-floating prose
                if current_marker:
                    coach_lines[current_marker].append(stripped)
                else:
                    coach_preamble.append(stripped)
            continue

        if mode == "show" and stripped:
            show_lines.append(stripped)

    result["coach_notes"] = {
        k: " ".join(v).strip() for k, v in sorted(coach_lines.items(), key=lambda kv: int(kv[0]))
    }
    if coach_preamble:
        result["coach_notes_preamble"] = " ".join(coach_preamble).strip()
    if show_lines:
        result["show_notes"] = " ".join(show_lines).strip()
    return result


def norm_song(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_song_loose(s: str) -> str:
    """Same, but drops parentheticals: 'Movin' Out (Anthony's Song)' -> 'movin out'."""
    s = re.sub(r"\([^)]*\)", " ", s or "")
    return norm_song(s)


def hms(seconds: float | None) -> str | None:
    if seconds is None:
        return None
    total = int(round(seconds))
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


# --------------------------------------------------------------------------
# Album parsing
# --------------------------------------------------------------------------
@dataclass
class Album:
    album_id: int
    slug: str
    url: str
    title: str
    is_live: bool
    show_date: str | None
    venue: str | None
    city: str | None
    region: str | None
    location_raw: str | None
    release_date: str | None
    publish_date: str | None
    art_id: int | None
    artwork: dict = field(default_factory=dict)
    num_tracks: int = 0
    total_duration_sec: float = 0.0
    total_duration_hms: str | None = None
    credits: str | None = None
    tags: list = field(default_factory=list)
    tracks: list = field(default_factory=list)
    sets: list = field(default_factory=list)
    coach_notes: dict = field(default_factory=dict)
    show_notes: str | None = None
    notes_raw: str | None = None
    scraped_at: str = ""


def parse_album(html: str, page_url: str, include_audio: bool = False) -> Album:
    tralbum = _embedded_json(html, "data-tralbum")
    if not tralbum:
        raise ValueError(f"no data-tralbum on {page_url}")
    cur = tralbum.get("current", {})

    title = (cur.get("title") or "").strip()
    meta = parse_title(title)

    tracks = []
    total = 0.0
    for t in tralbum.get("trackinfo") or []:
        dur = t.get("duration")
        dur = float(dur) if dur else None
        if dur:
            total += dur
        row = {
            "track_num": t.get("track_num"),
            "track_id": t.get("track_id") or t.get("id"),
            "title": (t.get("title") or "").strip(),
            "duration_sec": round(dur, 2) if dur else None,
            "duration_hms": hms(dur),
        }
        if include_audio:
            row["stream_url"] = (t.get("file") or {}).get("mp3-128")
        tracks.append(row)

    # The album's own track list is the vocabulary that lets us split the setlist
    # without shredding titles that contain a comma or an arrow.
    known_titles = [t["title"] for t in tracks if t["title"]]
    about = parse_about(cur.get("about") or "", known_titles)

    art_id = cur.get("art_id") or tralbum.get("art_id")
    artwork = {k: ART_TMPL.format(art_id=art_id, size=v)
               for k, v in ART_SIZES.items()} if art_id else {}

    tags = re.findall(r'<a class="tag" href="[^"]*">([^<]+)</a>', html)

    slug = page_url.rstrip("/").split("/")[-1]

    return Album(
        album_id=cur.get("id") or tralbum.get("id"),
        slug=slug,
        url=page_url,
        title=title,
        is_live=meta["is_live"],
        show_date=meta["show_date"],
        venue=meta["venue"],
        city=meta["city"],
        region=meta["region"],
        location_raw=meta["location_raw"],
        release_date=parse_bc_date(cur.get("release_date")),
        publish_date=parse_bc_date(cur.get("publish_date")),
        art_id=art_id,
        artwork=artwork,
        num_tracks=len(tracks),
        total_duration_sec=round(total, 2),
        total_duration_hms=hms(total) if total else None,
        credits=(cur.get("credits") or None),
        tags=[t.strip() for t in tags],
        tracks=tracks,
        sets=about["sets"],
        coach_notes=about["coach_notes"],
        show_notes=about["show_notes"],
        notes_raw=about["notes_raw"],
        scraped_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )


def link_setlist_to_tracks(album: Album) -> tuple[list[str], list[tuple]]:
    """
    Attach duration_sec / track_num to each setlist song by aligning the setlist
    against the track list in order.

    Returns (warnings, aliases). An "alias" is a song that aligned positionally
    but whose Bandcamp track title differs from the setlist name — e.g.
    'Same Old Shenanigans' listed as track 'SOS'. Those are worth collecting:
    they're exactly what you need to canonicalise song names across shows.
    """
    warnings: list[str] = []
    aliases: list[tuple] = []
    flat = [s for st in album.sets for s in st["songs"]]
    if not flat or not album.tracks:
        return warnings, aliases

    ti = 0
    for song in flat:
        matched = None
        # look ahead a couple of slots to survive the odd merged/split track
        for offset in range(0, min(3, len(album.tracks) - ti)):
            cand = album.tracks[ti + offset]
            if (norm_song(cand["title"]) == norm_song(song["song"])
                    or norm_song_loose(cand["title"]) == norm_song_loose(song["song"])):
                matched = cand
                ti += offset + 1
                break

        if matched is None and ti < len(album.tracks):
            matched = album.tracks[ti]          # positional fallback
            ti += 1
            if norm_song_loose(matched["title"]) != norm_song_loose(song["song"]):
                aliases.append((album.album_id, album.slug, song["song"], matched["title"]))

        if matched:
            song["track_num"] = matched["track_num"]
            song["duration_sec"] = matched["duration_sec"]
            song["duration_hms"] = matched["duration_hms"]
        else:
            warnings.append(f"{album.slug}: no track for setlist song '{song['song']}'")

    if len(flat) != len(album.tracks):
        warnings.append(
            f"{album.slug}: {len(flat)} setlist songs vs {len(album.tracks)} tracks"
        )
    return warnings, aliases


# --------------------------------------------------------------------------
# Discovery
# --------------------------------------------------------------------------
def discover(fetcher: Fetcher) -> list[dict]:
    html = fetcher.get(MUSIC_URL, "_music_index")
    items = _embedded_json(html, "data-client-items") or []
    out = []
    for it in items:
        if it.get("type") != "album":
            continue
        out.append({
            "id": it["id"],
            "title": it.get("title", ""),
            "url": BASE + it["page_url"],
            "slug": it["page_url"].rstrip("/").split("/")[-1],
            "art_id": it.get("art_id"),
        })
    return out


# --------------------------------------------------------------------------
# Writers
# --------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS albums (
    album_id            INTEGER PRIMARY KEY,
    slug                TEXT NOT NULL UNIQUE,
    url                 TEXT NOT NULL,
    title               TEXT NOT NULL,
    is_live             INTEGER NOT NULL DEFAULT 0,
    show_date           TEXT,
    venue               TEXT,
    city                TEXT,
    region              TEXT,
    location_raw        TEXT,
    release_date        TEXT,
    publish_date        TEXT,
    art_id              INTEGER,
    artwork_large       TEXT,
    num_tracks          INTEGER,
    total_duration_sec  REAL,
    total_duration_hms  TEXT,
    credits             TEXT,
    tags                TEXT,
    show_notes          TEXT,
    notes_raw           TEXT,
    scraped_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_albums_show_date ON albums(show_date);
CREATE INDEX IF NOT EXISTS idx_albums_live      ON albums(is_live);

CREATE TABLE IF NOT EXISTS tracks (
    album_id      INTEGER NOT NULL REFERENCES albums(album_id) ON DELETE CASCADE,
    track_num     INTEGER NOT NULL,
    track_id      INTEGER,
    title         TEXT NOT NULL,
    duration_sec  REAL,
    duration_hms  TEXT,
    PRIMARY KEY (album_id, track_num)
);

CREATE TABLE IF NOT EXISTS setlist (
    album_id      INTEGER NOT NULL REFERENCES albums(album_id) ON DELETE CASCADE,
    set_name      TEXT NOT NULL,
    set_index     INTEGER NOT NULL,
    position      INTEGER NOT NULL,
    song          TEXT NOT NULL,
    transition    TEXT,          -- 'segue' (>) | 'next' (,) | NULL (set close)
    footnotes     TEXT,          -- e.g. '1,3'
    track_num     INTEGER,
    duration_sec  REAL,
    duration_hms  TEXT,
    PRIMARY KEY (album_id, set_index, position)
);
CREATE INDEX IF NOT EXISTS idx_setlist_song ON setlist(song);

CREATE TABLE IF NOT EXISTS coach_notes (
    album_id  INTEGER NOT NULL REFERENCES albums(album_id) ON DELETE CASCADE,
    marker    INTEGER NOT NULL,   -- the [n] in the setlist
    note      TEXT NOT NULL,
    PRIMARY KEY (album_id, marker)
);
"""


def write_outputs(albums: list[Album], out: Path, warnings: list[str], aliases: list[tuple]):
    out.mkdir(parents=True, exist_ok=True)

    # ---- albums.jsonl (nested; easiest to feed a Next.js import script) ----
    with (out / "albums.jsonl").open("w", encoding="utf-8") as f:
        for a in albums:
            f.write(json.dumps(asdict(a), ensure_ascii=False) + "\n")

    # ---- flat CSVs ----
    with (out / "albums.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["album_id", "slug", "url", "title", "is_live", "show_date", "venue",
                    "city", "region", "release_date", "art_id", "artwork_large",
                    "num_tracks", "total_duration_sec", "total_duration_hms",
                    "tags", "show_notes", "notes_raw"])
        for a in albums:
            w.writerow([a.album_id, a.slug, a.url, a.title, int(a.is_live), a.show_date,
                        a.venue, a.city, a.region, a.release_date, a.art_id,
                        a.artwork.get("large"), a.num_tracks, a.total_duration_sec,
                        a.total_duration_hms, "|".join(a.tags), a.show_notes, a.notes_raw])

    with (out / "tracks.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["album_id", "track_num", "track_id", "title", "duration_sec", "duration_hms"])
        for a in albums:
            for t in a.tracks:
                w.writerow([a.album_id, t["track_num"], t["track_id"], t["title"],
                            t["duration_sec"], t["duration_hms"]])

    with (out / "setlist.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["album_id", "set_name", "set_index", "position", "song",
                    "transition", "footnotes", "track_num", "duration_sec", "duration_hms"])
        for a in albums:
            for si, st in enumerate(a.sets, 1):
                for s in st["songs"]:
                    w.writerow([a.album_id, st["set_name"], si, s["position"], s["song"],
                                s.get("transition"), ",".join(str(n) for n in s["footnotes"]),
                                s.get("track_num"), s.get("duration_sec"), s.get("duration_hms")])

    with (out / "coach_notes.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["album_id", "marker", "note"])
        for a in albums:
            for marker, note in a.coach_notes.items():
                w.writerow([a.album_id, marker, note])

    # Bandcamp track title != setlist song name. Use this to build a canonical
    # song table for the site (e.g. 'SOS' -> 'Same Old Shenanigans').
    with (out / "aliases.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["album_id", "slug", "setlist_song", "track_title"])
        for row in aliases:
            w.writerow(row)

    # ---- SQLite ----
    db_path = out / "goose_bandcamp.sqlite"
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA_SQL)
    for a in albums:
        con.execute(
            "INSERT INTO albums VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (a.album_id, a.slug, a.url, a.title, int(a.is_live), a.show_date, a.venue,
             a.city, a.region, a.location_raw, a.release_date, a.publish_date, a.art_id,
             a.artwork.get("large"), a.num_tracks, a.total_duration_sec,
             a.total_duration_hms, a.credits, "|".join(a.tags), a.show_notes,
             a.notes_raw, a.scraped_at))
        for t in a.tracks:
            con.execute("INSERT OR IGNORE INTO tracks VALUES (?,?,?,?,?,?)",
                        (a.album_id, t["track_num"], t["track_id"], t["title"],
                         t["duration_sec"], t["duration_hms"]))
        for si, st in enumerate(a.sets, 1):
            for s in st["songs"]:
                con.execute("INSERT OR IGNORE INTO setlist VALUES (?,?,?,?,?,?,?,?,?,?)",
                            (a.album_id, st["set_name"], si, s["position"], s["song"],
                             s.get("transition"), ",".join(str(n) for n in s["footnotes"]) or None,
                             s.get("track_num"), s.get("duration_sec"), s.get("duration_hms")))
        for marker, note in a.coach_notes.items():
            con.execute("INSERT OR IGNORE INTO coach_notes VALUES (?,?,?)",
                        (a.album_id, int(marker), note))
    con.commit()
    con.close()

    (out / "schema.sql").write_text(SCHEMA_SQL.strip() + "\n", encoding="utf-8")
    (out / "types.ts").write_text(TYPES_TS, encoding="utf-8")

    # ---- report ----
    live = [a for a in albums if a.is_live]
    studio = [a for a in albums if not a.is_live]
    with_coach = [a for a in live if a.coach_notes]
    with_sets = [a for a in live if a.sets]
    with_show = [a for a in live if a.show_notes]
    lines = [
        "GOOSE BANDCAMP SCRAPE — REPORT",
        f"generated: {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        "",
        f"albums scraped ............ {len(albums)}",
        f"  live shows .............. {len(live)}",
        f"  studio / non-dated ...... {len(studio)}",
        f"tracks .................... {sum(a.num_tracks for a in albums)}",
        f"setlist songs parsed ...... {sum(len(s['songs']) for a in albums for s in a.sets)}",
        f"coach's notes footnotes ... {sum(len(a.coach_notes) for a in albums)}",
        "",
        f"live shows with a setlist ....... {len(with_sets)}/{len(live)}",
        f"live shows with coach's notes ... {len(with_coach)}/{len(live)}",
        f"live shows with show notes ...... {len(with_show)}/{len(live)}",
        "",
        f"title aliases collected ......... {len(aliases)}  (see aliases.csv)",
        "",
        f"anomalies ({len(warnings)}):",
    ]
    lines += [f"  - {w}" for w in warnings[:200]]
    if len(warnings) > 200:
        lines.append(f"  ... and {len(warnings) - 200} more")
    if studio:
        lines += ["", "non-live releases (no date in title):"]
        lines += [f"  - {a.title}" for a in studio]
    (out / "report.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:20]))


TYPES_TS = """// Generated by goose_bandcamp_scrape.py — shape of each line in albums.jsonl

export type Transition = "segue" | "next" | null;

export interface SetlistSong {
  position: number;
  song: string;
  transition: Transition;   // "segue" = ">", "next" = ",", null = end of set
  footnotes: number[];      // markers referencing coachNotes
  track_num?: number;
  duration_sec?: number | null;
  duration_hms?: string | null;
}

export interface AlbumSet {
  set_name: string;         // "Set 1" | "Set 2" | "Encore"
  songs: SetlistSong[];
}

export interface Track {
  track_num: number;
  track_id: number;
  title: string;
  duration_sec: number | null;
  duration_hms: string | null;
}

export interface BandcampAlbum {
  album_id: number;
  slug: string;
  url: string;
  title: string;
  is_live: boolean;
  show_date: string | null;      // YYYY-MM-DD
  venue: string | null;
  city: string | null;
  region: string | null;
  location_raw: string | null;
  release_date: string | null;   // ISO 8601
  publish_date: string | null;
  art_id: number | null;
  artwork: { large?: string; medium?: string; thumb?: string };
  num_tracks: number;
  total_duration_sec: number;
  total_duration_hms: string | null;
  credits: string | null;
  tags: string[];
  tracks: Track[];
  sets: AlbumSet[];
  coach_notes: Record<string, string>;  // { "1": "...", "2": "..." }
  show_notes: string | null;
  notes_raw: string | null;              // the untouched `about` blob
  scraped_at: string;
}
"""


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=Path("./data"))
    ap.add_argument("--delay", type=float, default=1.5, help="seconds between requests")
    ap.add_argument("--limit", type=int, help="only scrape the first N albums (smoke test)")
    ap.add_argument("--refresh", action="store_true", help="ignore the HTML cache")
    ap.add_argument("--live-only", action="store_true", help="skip studio releases")
    ap.add_argument("--include-audio-urls", action="store_true",
                    help="capture mp3-128 stream URLs (they are session-scoped and expire — "
                         "do not persist or hotlink them)")
    args = ap.parse_args()

    fetcher = Fetcher(args.out / "cache", delay=args.delay, refresh=args.refresh)

    print("discovering releases…")
    items = discover(fetcher)
    print(f"  found {len(items)} albums")

    if args.limit:
        items = items[: args.limit]

    albums: list[Album] = []
    warnings: list[str] = []
    aliases: list[tuple] = []
    for i, it in enumerate(items, 1):
        try:
            html = fetcher.get(it["url"], it["slug"])
            album = parse_album(html, it["url"], include_audio=args.include_audio_urls)
        except Exception as e:  # keep going; log it
            warnings.append(f"{it['slug']}: FAILED — {e}")
            print(f"  [{i}/{len(items)}] !! {it['slug']}: {e}", file=sys.stderr)
            continue

        if args.live_only and not album.is_live:
            continue

        w, al = link_setlist_to_tracks(album)
        warnings += w
        aliases += al
        albums.append(album)

        flag = "live " if album.is_live else "studio"
        print(f"  [{i}/{len(items)}] {flag} {album.slug[:52]:52} "
              f"{album.num_tracks:2} trk  {len(album.coach_notes)} notes")

    print(f"\ncache: {fetcher.hits} hits, {fetcher.misses} fetches")
    print(f"writing to {args.out.resolve()}\n")
    write_outputs(albums, args.out, warnings, aliases)


if __name__ == "__main__":
    main()
