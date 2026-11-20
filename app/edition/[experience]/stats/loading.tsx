import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonBar } from "@/app/_components/skeleton";
import { CUTS } from "./cuts";

/** Skeleton for the stats hub — a ghost of its title, the profile, and the
 * two-column contents beneath it. */
export default function StatsLoading() {
  return (
    <SkeletonPage label="Loading stats">
      <Container>
        <div className="pt-10 pb-6 sm:pt-14">
          <SkeletonBar className="h-9 w-24" />
          <SkeletonBar className="mt-3 h-3 w-80 max-w-full" />
        </div>
        <SkeletonBar className="h-36 w-full sm:h-44" />
        <SkeletonBar className="mt-4 h-3 w-64 max-w-full" />
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {CUTS.map((c) => (
            <div key={c.slug}>
              <SkeletonBar className="h-3 w-28" />
              <SkeletonBar className="mt-3 h-3 w-56 max-w-full" />
              <SkeletonBar className="mt-4 h-3 w-full max-w-sm" />
              <SkeletonBar className="mt-2 h-3 w-full max-w-xs" />
              <SkeletonBar className="mt-2 h-3 w-full max-w-[14rem]" />
            </div>
          ))}
        </div>
      </Container>
    </SkeletonPage>
  );
}
