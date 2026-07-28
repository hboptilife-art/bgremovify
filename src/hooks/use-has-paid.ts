import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useHasPaid — Kullanıcının hiç ödemesi tamamlanmış mı?
 *
 * "Free tier" tanımı: Kayıtlı ama henüz hiçbir paket satın almamış kullanıcı.
 * Bu ayrımı iyzico_orders ve kaspi_orders tablolarındaki `status = 'completed'`
 * kayıtlarına bakarak yapıyoruz. Sonuç `false` dönerse UI o kullanıcıya
 * yavaş hat (throttle) uygular; admin panelinden bu davranış kapatılabilir.
 *
 * RLS: her iki tabloda da kullanıcı kendi siparişlerini okuyabiliyor.
 * Sonuçları client memoize etmeye gerek yok — tek satır probe sorgusu.
 */
export function useHasPaid(userId: string | null | undefined) {
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasPaid(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [iyz, kas] = await Promise.all([
        supabase
          .from("iyzico_orders")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("kaspi_orders")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setHasPaid(!!iyz.data || !!kas.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hasPaid, loading };
}
