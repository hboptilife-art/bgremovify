import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const GUEST_KEY = "bgr-guest-id";

function ensureGuestId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    let g = localStorage.getItem(GUEST_KEY);
    if (!g) {
      g = "g_" + crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, g);
    }
    return g;
  } catch {
    return "guest";
  }
}

/**
 * Unified session hook shared across / /dashboard /studio.
 * - Signed-in user → { user, isGuest:false, sessionId:user.id }
 * - Guest visitor → { user:null, isGuest:true, sessionId:guestId }
 *
 * IMPORTANT: /studio and /dashboard MUST NOT hard-gate on auth.
 * Guests get instant access ("fast-path") and their local work persists
 * under sessionId so a later sign-in can migrate it.
 */
export function useSession() {
  const { user, loading, signOut } = useAuth();
  const [guestId, setGuestId] = useState<string>("guest");

  useEffect(() => {
    setGuestId(ensureGuestId());
  }, []);

  const isGuest = !loading && !user;
  const sessionId = user?.id ?? guestId;
  const email = user?.email ?? null;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    email?.split("@")[0] ??
    (isGuest ? "Guest" : "");
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : isGuest
      ? "G"
      : "";

  return {
    user,
    loading,
    signOut,
    guestId,
    isGuest,
    sessionId,
    email,
    displayName,
    initials,
  };
}
