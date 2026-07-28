import { useCallback, useEffect, useState } from "react";

// Admin-only "Sandbox / MOCK mode" toggle.
// - Default ON (sandbox): server-side Replicate calls are short-circuited;
//   the input image is echoed back, no credits or $ burned.
// - When admin flips "Live AI", real provider calls run for that session.
// Persisted in localStorage so it survives reloads but stays per-device.

const KEY = "bgr-admin-live-test-v1";

export function useAdminSandbox() {
  // Default OFF for real AI: admin sessions start in mock mode so accidental
  // page refreshes/tests cannot burn external AI budget or workspace credits.
  const [liveTest, setLiveTestState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(KEY);
      // Treat missing value as Sandbox. Only explicit "1" enables Live AI.
      setLiveTestState(v === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setLiveTest = useCallback((next: boolean) => {
    setLiveTestState(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Sandbox is ON whenever live-test is OFF.
  return { sandbox: !liveTest, liveTest, setLiveTest };
}
