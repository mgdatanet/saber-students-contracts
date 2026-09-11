import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");
  if (!profile.approved) redirect("/pending-approval");

  return { user, profile };
}

/** Like requireProfile(), but financial_aid only ever needs the pending-
 *  signatures queue — everywhere else in the app bounces them there. */
export async function requireStaffProfile() {
  const result = await requireProfile();
  if (result.profile.role === "financial_aid") redirect("/pending-signatures");
  return result;
}
