import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { getMemberProfile } from "@/lib/queries/forum";
import { BBCodeInline } from "@/lib/forum/bbcode-render";
import { Avatar } from "@/lib/forum/avatar";
import { threadPath } from "@/lib/forum/urls";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  return { title: `${decodeURIComponent(username)} — Forum member`, robots: { index: false } };
}

export default async function MemberPage({ params }: { params: Params }) {
  const { username } = await params;
  const profile = await getMemberProfile(decodeURIComponent(username).toLowerCase());
  if (!profile) notFound();
  const experience = await getExperience();

  const facts = (
    <dl className="mt-2 text-sm">
      <div className="flex gap-2"><dt className="text-muted">Joined</dt><dd className="font-mono">{profile.joined}</dd></div>
      <div className="flex gap-2"><dt className="text-muted">Posts</dt><dd className="font-mono">{profile.postCount}</dd></div>
      {profile.role === "admin" && <div className="flex gap-2"><dt className="text-muted">Role</dt><dd>Admin</dd></div>}
      {profile.signature && (
        <div className="flex gap-2"><dt className="text-muted">Signature</dt><dd><BBCodeInline source={profile.signature} /></dd></div>
      )}
    </dl>
  );
  const recent = (
    <section className="mt-8">
      <h2 className={experience === "fancy" ? "font-display text-xl" : "font-bold"}>Recent posts</h2>
      {profile.recent.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No posts yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {profile.recent.map((p) => (
            <li key={p.postId}>
              <Link href={`${threadPath(p.threadId, p.threadSlug)}#post-${p.postId}`} className="underline">{p.threadTitle}</Link>
              <span className="text-muted"> · {p.at}</span>
              <p className="text-muted">{p.snippet}{p.snippet.length === 200 ? "…" : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/forum", label: "Forum" }, { label: profile.username }]} />
          <div className="flex items-center gap-4">
            <Avatar username={profile.username} size={64} />
            <h1>{profile.username}</h1>
          </div>
          {facts}
          {recent}
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <div className="flex items-center gap-4">
        <Avatar username={profile.username} size={64} />
        <h1 className={experience === "fancy" ? "font-display text-3xl tracking-tight" : "text-2xl font-bold"}>{profile.username}</h1>
      </div>
      {facts}
      {recent}
    </Container>
  );
}
