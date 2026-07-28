import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCredits(userId: string | null | undefined) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error) setCredits(data?.credits ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [userId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh is stable per userId

  // realtime is optional; just refetch on auth change
  const consume = useCallback(async (): Promise<{ ok: boolean; remaining?: number; reason?: string }> => {
    if (!userId) return { ok: false, reason: "not_authenticated" };
    const { data, error } = await supabase.rpc("consume_credit");
    if (error) {
      if (error.message?.includes("no_credits")) {
        setCredits(0);
        return { ok: false, reason: "no_credits" };
      }
      return { ok: false, reason: error.message };
    }
    const remaining = typeof data === "number" ? data : Number(data);
    setCredits(remaining);
    return { ok: true, remaining };
  }, [userId]);

  return { credits, loading, refresh, consume };
}
