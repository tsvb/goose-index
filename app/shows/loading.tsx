import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonHeader, SkeletonPills, SkeletonRows } from "@/app/_components/skeleton";

/** Ledger skeleton while /shows blocks on Postgres. */
export default function ShowsLoading() {
  return (
    <SkeletonPage label="Loading shows">
      <SkeletonHeader />
      <Container className="py-10">
        <SkeletonPills count={11} />
        <div className="mt-6">
          <SkeletonRows rows={10} />
        </div>
      </Container>
    </SkeletonPage>
  );
}
