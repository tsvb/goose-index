import { toBool, emptyToNull } from "../util";
import type {
  RawVenue, RawSong, RawShow, RawSetlistRow,
  VenueRow, SongRow, ShowRow, TourRow, PerformanceRow,
} from "./types";

export function mapVenue(r: RawVenue): VenueRow {
  return {
    venueId: r.venue_id,
    name: r.venuename,
    slug: emptyToNull(r.slug),
    city: emptyToNull(r.city),
    state: emptyToNull(r.state),
    country: emptyToNull(r.country),
    zip: emptyToNull(r.zip),
    capacity: r.capacity ?? null,
  };
}

export function mapSong(r: RawSong): SongRow {
  return {
    songId: r.id,
    name: r.name,
    slug: emptyToNull(r.slug),
    isOriginal: toBool(r.isoriginal),
    originalArtist: emptyToNull(r.original_artist),
  };
}

export function mapTour(r: {
  tour_id: number; tourname: string; show_year?: number; showyear?: number;
}): TourRow {
  return { tourId: r.tour_id, name: r.tourname, year: r.show_year ?? r.showyear ?? null };
}

export function mapShow(r: RawShow, notes: string | null): ShowRow {
  return {
    showId: r.show_id,
    showDate: r.showdate,
    artistId: r.artist_id,
    venueId: r.venue_id || null,
    tourId: r.tour_id || null,
    title: emptyToNull(r.showtitle),
    permalink: emptyToNull(r.permalink),
    showOrder: r.showorder ?? null,
    notes,
    createdAt: emptyToNull(r.created_at),
    updatedAt: emptyToNull(r.updated_at),
  };
}

export function mapPerformance(r: RawSetlistRow): PerformanceRow {
  return {
    uniqueId: r.uniqueid,
    showId: r.show_id,
    songId: r.song_id,
    setType: emptyToNull(r.settype),
    setNumber: emptyToNull(r.setnumber),
    position: r.position ?? null,
    trackTime: emptyToNull(r.tracktime),
    transition: emptyToNull(r.transition),
    transitionId: r.transition_id ?? null,
    isJamchart: toBool(r.isjamchart),
    jamchartNotes: emptyToNull(r.jamchart_notes),
    isReprise: toBool(r.isreprise),
    isJam: toBool(r.isjam),
    isVerified: toBool(r.isverified),
    footnote: emptyToNull(r.footnote),
  };
}
