import type { SetlistEntry } from "@/lib/queries/shows";
import type { Experience } from "@/lib/experience";
import { SetlistFancy } from "./fancy";
import { SetlistFunctional } from "./functional";
import { SetlistMinimal } from "./minimal";

export function Setlist({
  entries, experience, showDate, venue, containerId = null,
}: {
  entries: SetlistEntry[];
  experience: Experience;
  showDate: string;
  venue: string | null;
  containerId?: number | null;
}) {
  if (experience === "functional") return <SetlistFunctional entries={entries} showDate={showDate} venue={venue} containerId={containerId} />;
  if (experience === "minimal") return <SetlistMinimal entries={entries} showDate={showDate} venue={venue} containerId={containerId} />;
  return <SetlistFancy entries={entries} showDate={showDate} venue={venue} containerId={containerId} />;
}
