import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonHeader, SkeletonBar } from "@/app/_components/skeleton";

/** Ledger skeleton for the stats hub — a ghost of its card grid. */
export default function StatsLoading() {
  return (
    <SkeletonPage label="Loading stats">
      <SkeletonHeader />
      <Container className="py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="surface-card p-5">
              <SkeletonBar className="h-4 w-32" />
              <SkeletonBar className="mt-3 h-3 w-48 max-w-full" />
            </div>
          ))}
        </div>
      </Container>
    </SkeletonPage>
  );
}
