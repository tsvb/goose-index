import Link from "next/link";
import { currentUser } from "@/lib/auth/session.server";
import { logoutAction } from "../auth-actions";

/** The classic "Signed in as …" strip shown at the top of every forum page. */
export async function UserStrip() {
  const user = await currentUser();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      {user ? (
        <>
          <span>Signed in as <Link href={`/forum/members/${user.username}`} className="underline">{user.username}</Link></span>
          <Link href="/forum/settings" className="underline">Settings</Link>
          {user.role === "admin" && <Link href="/forum/admin" className="underline">Admin</Link>}
          <form action={logoutAction}><button type="submit" className="underline">Log out</button></form>
        </>
      ) : (
        <>
          <Link href="/forum/login" className="underline">Log in</Link>
          <Link href="/forum/join" className="underline">Join</Link>
        </>
      )}
    </div>
  );
}
