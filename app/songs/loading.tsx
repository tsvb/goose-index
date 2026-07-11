import { Container } from "@/app/_components/container";
import { SkeletonPage, SkeletonHeader, SkeletonPills, SkeletonRows } from "@/app/_components/skeleton";

/** Ledger skeleton while the /songs catalog blocks on Postgres. */
export default function SongsLoading() {
  return (
    <SkeletonPage label="Loading songs">
      <SkeletonHeader />
      <Container className="py-8">
        <SkeletonPills count={6} />
        <div className="mt-6">
          <SkeletonRows rows={12} />
        </div>
      </Container>
    </SkeletonPage>
  );
}
