import { describe, it, expect, afterAll } from "vitest";
import { makeTestDb } from "./testing";
import * as schema from "./schema";
import {
  upsertArtists, upsertVenues, upsertTours, upsertSongs, upsertShows, upsertPerformances,
} from "./repository";

const ctx = await makeTestDb();
afterAll(() => ctx.close());

async function seedGraph() {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [{ venueId: 290, name: "Radio City Music Hall", slug: "rcmh",
    city: "New York", state: "NY", country: "USA", zip: null, capacity: 6000 }]);
  await upsertTours(ctx.db, [{ tourId: 29, name: "Dripfield Summer Tour 2022", year: 2022 }]);
  await upsertSongs(ctx.db, [{ songId: 735, name: "California Magic", slug: "california-magic",
    isOriginal: true, originalArtist: null }]);
  await upsertShows(ctx.db, [{ showId: 1, showDate: "2022-06-24", artistId: 1, venueId: 290,
    tourId: 29, title: null, permalink: "p", showOrder: 1, notes: "acoustic",
    createdAt: null, updatedAt: null }]);
  await upsertPerformances(ctx.db, [{ uniqueId: "12301", showId: 1, songId: 735, setType: "Set",
    setNumber: "1", position: 1, trackTime: "8:46", transition: ", ", transitionId: 1,
    isJamchart: false, jamchartNotes: null, isReprise: false, isJam: false, isVerified: true,
    footnote: null }]);
}

describe("repository upserts are idempotent", () => {
  it("running the same seed twice yields one row per table and updates content", async () => {
    await seedGraph();
    // second run with a changed value (capacity) must update, not duplicate
    await upsertVenues(ctx.db, [{ venueId: 290, name: "Radio City Music Hall", slug: "rcmh",
      city: "New York", state: "NY", country: "USA", zip: null, capacity: 5960 }]);
    await seedGraph();

    expect((await ctx.db.select().from(schema.venues)).length).toBe(1);
    expect((await ctx.db.select().from(schema.shows)).length).toBe(1);
    expect((await ctx.db.select().from(schema.performances)).length).toBe(1);

    const venue = (await ctx.db.select().from(schema.venues))[0];
    expect(venue.capacity).toBe(6000); // last seedGraph re-set it to 6000
  });
});
