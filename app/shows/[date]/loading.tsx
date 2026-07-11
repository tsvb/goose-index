import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonHeader, SkeletonBar } from "@/app/_components/skeleton";

/** Ledger skeleton for a show page: hero ghost, then setlist-shaped lines. */
export default function ShowLoading() {
  return (
    <SkeletonPage label="Loading show">
      <SkeletonHeader />
      <Container className="py-10">
        <SkeletonBar className="h-5 w-24" />
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBar className="h-3 w-5 shrink-0" />
              <SkeletonBar className="h-3 w-full max-w-64" />
              <SkeletonBar className="ml-auto h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </Container>
    </SkeletonPage>
  );
}
