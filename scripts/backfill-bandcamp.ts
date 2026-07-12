import { db } from '../db/client';
import { shows } from '../db/schema';
import { eq, isNull } from 'drizzle-orm';

async function fetchBandcampMusicPage() {
  console.log("Fetching bandcamp music page...");
  const res = await fetch('https://goosetheband.bandcamp.com/music');
  if (!res.ok) throw new Error("Failed to fetch bandcamp");
  return await res.text();
}

async function scrapeAlbumPage(url: string) {
  console.log(`Scraping album: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`Failed to fetch ${url}`);
    return null;
  }
  const html = await res.text();
  
  // Find the JSON-LD script
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (!match) return null;
  
  try {
    const jsonLd = JSON.parse(match[1]);
    // It's usually an array or a single object.
    const albumData = Array.isArray(jsonLd) ? jsonLd.find(x => x['@type'] === 'MusicAlbum') : jsonLd;
    
    if (albumData && albumData.description) {
      return albumData.description; // This contains the coach's notes
    }
  } catch (err) {
    console.error(`Error parsing JSON-LD for ${url}:`, err);
  }
  return null;
}

async function run() {
  const html = await fetchBandcampMusicPage();
  
  // Extract all album links
  // <a href="/album/2026-07-04-spac-saratoga-springs-ny-2">
  const albumRegex = /href="(\/album\/([0-9]{4}-[0-9]{2}-[0-9]{2})-[^"]+)"/g;
  
  const albums: { date: string, url: string }[] = [];
  let match;
  while ((match = albumRegex.exec(html)) !== null) {
    albums.push({
      url: `https://goosetheband.bandcamp.com${match[1]}`,
      date: match[2]
    });
  }
  
  console.log(`Found ${albums.length} albums with dates on bandcamp.`);

  // Get all shows that don't have coach notes yet
  const showsToUpdate = await db.select().from(shows).where(isNull(shows.coachNotes));
  console.log(`Found ${showsToUpdate.length} shows missing coachNotes in DB.`);
  
  for (const show of showsToUpdate) {
    if (!show.showDate) continue;
    
    // show.showDate is likely a Date object or string 'YYYY-MM-DD'
    const showDateStr = typeof show.showDate === 'string' ? show.showDate : new Date(show.showDate).toISOString().split('T')[0];
    
    const album = albums.find(a => a.date === showDateStr);
    if (album) {
      const description = await scrapeAlbumPage(album.url);
      if (description) {
        // Find Coach's Notes specifically
        let coachNotes = null;
        const notesMatch = description.match(/Coach's Notes:\s*([\s\S]*)$/i) || description.match(/Coachs Notes:\s*([\s\S]*)$/i);
        if (notesMatch) {
          coachNotes = notesMatch[1].trim();
        } else {
          // Sometimes it's just the description itself if it doesn't explicitly say "Coach's Notes:"
          // We can just store the full description if we want, or look for footnotes like [1]
          if (description.includes('[1]')) {
             coachNotes = description;
          }
        }
        
        if (coachNotes || description) {
          console.log(`Updating show ${showDateStr} with notes`);
          await db.update(shows)
            .set({ 
              bandcampUrl: album.url,
              coachNotes: coachNotes || description // Fallback to full description if format differs
            })
            .where(eq(shows.showId, show.showId));
        }
      }
      
      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log("Done backfilling bandcamp data!");
  process.exit(0);
}

run().catch(console.error);
