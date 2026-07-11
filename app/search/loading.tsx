import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonHeader, SkeletonBar, SkeletonRows } from "@/app/_components/skeleton";

/** Ledger skeleton while search queries every corner of the index. */
export default function SearchLoading() {
  return (
    <SkeletonPage label="Searching the index">
      <SkeletonHeader />
      <Container className="py-8">
        <SkeletonBar className="h-10 w-full max-w-xl rounded-full" />
        <SkeletonBar className="mt-8 h-3 w-32" />
        <div className="mt-3">
          <SkeletonRows rows={6} />
        </div>
      </Container>
    </SkeletonPage>
  );
}
