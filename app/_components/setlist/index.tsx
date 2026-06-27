import type { SetlistEntry } from "@/lib/queries/shows";
import type { Experience } from "@/lib/experience";
import { SetlistFancy } from "./fancy";
import { SetlistFunctional } from "./functional";
import { SetlistMinimal } from "./minimal";

export function Setlist({
  entries,
  experience,
}: {
  entries: SetlistEntry[];
  experience: Experience;
}) {
  if (experience === "functional") return <SetlistFunctional entries={entries} />;
  if (experience === "minimal") return <SetlistMinimal entries={entries} />;
  return <SetlistFancy entries={entries} />;
}
