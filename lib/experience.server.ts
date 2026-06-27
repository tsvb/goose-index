import { cookies } from "next/headers";
import { resolveExperience, EXPERIENCE_COOKIE, type Experience } from "./experience";

export async function getExperience(): Promise<Experience> {
  const store = await cookies();
  return resolveExperience(store.get(EXPERIENCE_COOKIE)?.value);
}
