"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * The signed-in staff member and their ERP role.
 *
 * This is presentation-level access control only. The site is a static export, so there is
 * no server to gate a route — a determined visitor can always load the ERP bundle. What
 * actually protects the data is Supabase RLS (staff-only select policies on every meta_*
 * table) and the role checks inside the edge functions, both of which this hook cannot
 * influence. Treat it as "show the right screen", never as the security boundary.
 */
export function useErpSession() {
  // "loading" until Supabase has restored the session from storage; rendering a guard
  // decision before that point flashes the sign-in prompt at people who are signed in.
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;

    async function resolve(session) {
      if (!session?.user) {
        if (active) {
          setProfile(null);
          setStatus("signed-out");
        }
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", session.user.id)
        .single();

      if (!active) return;
      if (error || !data) {
        setProfile(null);
        setStatus("no-profile");
        return;
      }
      setProfile(data);
      setStatus(data.role === "employee" || data.role === "admin" ? "staff" : "forbidden");
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    // Keeps the shell honest when a token expires or the operator signs out in another tab.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => resolve(session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    status,
    profile,
    isStaff: status === "staff",
    isAdmin: profile?.role === "admin",
  };
}

/** The user's access token, needed to call the edge functions. */
export async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
