import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/actions/profile";

// Financial Aid's entire world. The countersigning workflow itself lands in
// a later phase — for now this just proves the role and route exist so
// financial_aid has somewhere to go that isn't a redirect loop.
export default async function PendingSignaturesPage() {
  const { profile } = await requireProfile();
  if (profile.role === "staff") redirect("/classes");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-brand-navy">Pending Signatures</h1>
      <p className="text-sm text-slate-500">
        Contracts signed by the student and waiting on your countersignature will show up here.
      </p>
    </div>
  );
}
