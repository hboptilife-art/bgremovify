import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      setCheckedUserId(undefined);
      return;
    }
    let cancelled = false;
    setCheckedUserId(userId);
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin(!!data);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isCurrentUserChecked = !!userId && checkedUserId === userId;

  return {
    isAdmin: isCurrentUserChecked ? isAdmin : false,
    loading: !!userId && (!isCurrentUserChecked || loading),
  };
}
