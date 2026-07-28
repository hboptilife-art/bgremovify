import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * useAuth — kimlik değişikliğine hassas oturum kancası.
 *
 * Supabase `onAuthStateChange` olayları `INITIAL_SESSION` ve saatlik
 * `TOKEN_REFRESHED` dahil çok sık tetiklenir. Her seferinde `setUser`
 * çağırırsak `useCredits`, `useAdmin`, admin panel state'i vb. gereksiz
 * yere yeniden koşar ve UI, paywall/checkout ortasında kullanıcıyı
 * "düşmüş" gibi gösterebilir. Kimlik gerçekten değişmediyse state'i
 * güncellemiyoruz — böylece token yenilemeleri sessizce geçiyor.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentId: string | null = null;

    const applySession = (s: Session | null) => {
      const nextId = s?.user?.id ?? null;
      if (nextId === currentId) {
        // Aynı kimlik — token yenilendi, oturum düşmedi. State'e dokunma.
        // Session referansını yalnızca varsa güncelle (access_token vb. için).
        if (s) setSession(s);
        return;
      }
      currentId = nextId;
      setSession(s);
      setUser(s?.user ?? null);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Kimlik geçişleriyle ilgilenen olaylar dışındakileri es geç.
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED" &&
        event !== "INITIAL_SESSION"
      ) {
        // TOKEN_REFRESHED, PASSWORD_RECOVERY vb.
        if (s) setSession(s);
        return;
      }
      applySession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading, signOut: () => supabase.auth.signOut() };
}
