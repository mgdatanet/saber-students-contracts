"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/actions/profile";

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "staff";
  approved: boolean;
  createdAt: string;
}

async function requireAdmin() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") throw new Error("Only admins can manage users");
  return profile;
}

export async function listUsers(): Promise<UserRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: authUsers }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from("profiles").select("id, full_name, role, approved, created_at"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (authUsers?.users ?? [])
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        fullName: profile?.full_name ?? (u.user_metadata?.full_name as string) ?? "",
        role: (profile?.role ?? "staff") as "admin" | "staff",
        approved: profile?.approved ?? true,
        createdAt: profile?.created_at ?? u.created_at,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function createUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff") as "admin" | "staff";

  if (!email || !password || !fullName) {
    redirect(`/users?error=${encodeURIComponent("Name, email, and password are required")}`);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    redirect(`/users?error=${encodeURIComponent(error?.message ?? "Could not create user")}`);
  }

  // The handle_new_user trigger creates the profile row as 'staff' and
  // approved:false (the default for public self-signups). Admin-created
  // accounts are trusted immediately, so flip both here.
  await admin.from("profiles").update({ role, approved: true }).eq("id", data.user.id);

  revalidatePath("/users");
}

export async function approveUser(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ approved: true }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

export async function updateUserRole(userId: string, role: "admin" | "staff"): Promise<{ error?: string }> {
  const actingProfile = await requireAdmin();
  if (userId === actingProfile.id && role !== "admin") {
    return { error: "You can't remove your own admin access" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const actingProfile = await requireAdmin();
  if (userId === actingProfile.id) return { error: "You can't delete your own account" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}
