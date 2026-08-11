"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/classes");
}

const ALLOWED_SIGNUP_DOMAIN = "sabercollege.edu";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  if (!email.toLowerCase().endsWith(`@${ALLOWED_SIGNUP_DOMAIN}`)) {
    redirect(`/login?error=${encodeURIComponent(`Only @${ALLOWED_SIGNUP_DOMAIN} email addresses can sign up.`)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // The handle_new_user trigger seeds new profiles as approved = false — an
  // admin must approve from /users before this account can sign in and use
  // the app (see requireProfile()). Self-signup is otherwise wide open, which
  // the client explicitly wanted locked down.
  redirect(
    "/login?message=Check your email to confirm your account. An admin must also approve your account before you can sign in."
  );
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;

  if (email) {
    // Always redirect to the same generic message regardless of whether the
    // email matches an account — avoids leaking which addresses have accounts.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
  }

  redirect("/login?message=If that email has an account, a password reset link is on its way.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
