import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonHeader, SkeletonBar } from "@/app/_components/skeleton";

/** Ledger skeleton for the stats hub — a ghost of its row list. */
export default function StatsLoading() {
  return (
    <SkeletonPage label="Loading stats">
      <SkeletonHeader />
      <Container className="py-8">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
            <SkeletonBar className="h-4 w-32" />
            <SkeletonBar className="h-3 w-24" />
          </div>
        ))}
      </Container>
    </SkeletonPage>
  );
}
