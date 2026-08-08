import Image from "next/image";
import Link from "next/link";
import { requireProfile } from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/classes" className="flex items-center gap-2 font-semibold text-slate-900">
              <Image src="/logo.png" alt="SABER College" width={32} height={32} className="h-8 w-auto" priority />
              SABER College
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/classes" className="text-slate-600 hover:text-slate-900">
                Classes
              </Link>
              <Link href="/reports" className="text-slate-600 hover:text-slate-900">
                Reports
              </Link>
              {profile.role === "admin" && (
                <>
                  <Link href="/programs" className="text-slate-600 hover:text-slate-900">
                    Programs
                  </Link>
                  <Link href="/signers" className="text-slate-600 hover:text-slate-900">
                    Signers
                  </Link>
                  <Link href="/contract-editor" className="text-slate-600 hover:text-slate-900">
                    Contract Editor
                  </Link>
                  <Link href="/users" className="text-slate-600 hover:text-slate-900">
                    Users
                  </Link>
                </>
              )}
              <Link href="/history" className="text-slate-600 hover:text-slate-900">
                History
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {profile.full_name} · <span className="uppercase text-xs">{profile.role}</span>
            </span>
            <form action={signOut}>
              <button className="text-slate-600 hover:text-slate-900">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
