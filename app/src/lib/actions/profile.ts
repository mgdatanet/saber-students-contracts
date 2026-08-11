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
