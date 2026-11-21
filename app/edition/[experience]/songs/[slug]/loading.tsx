import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonBar, SkeletonRows } from "@/app/_components/skeleton";

/** Ledger skeleton for a song page: title, fact-ribbon ghosts, history rows. */
export default function SongLoading() {
  return (
    <SkeletonPage label="Loading song">
      <Container className="py-7">
        <SkeletonBar className="h-3 w-44" />
        <SkeletonBar className="mt-4 h-9 w-64 max-w-full" />
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <SkeletonBar className="h-4 w-12" />
              <SkeletonBar className="mt-2 h-2.5 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-8">
          <SkeletonRows rows={8} />
        </div>
      </Container>
    </SkeletonPage>
  );
}
