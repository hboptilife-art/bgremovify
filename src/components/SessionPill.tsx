import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/use-session";

/**
 * Header session badge shared by /dashboard and /studio.
 * - Guest → "Guest • Sign in" button that routes to /auth?redirect=<current>
 * - Signed-in → avatar with popover (email + Dashboard + Sign out)
 * Never blocks the page. UI-only reflection of session state.
 */
export function SessionPill({
  variant = "light",
  currentPath = "/",
}: {
  variant?: "light" | "dark";
  currentPath?: string;
}) {
  const { user, isGuest, email, displayName, initials, signOut, loading } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const dark = variant === "dark";
  const border = dark ? "border-white/15" : "border-slate-200";
  const bg = dark ? "bg-white/5 hover:bg-white/10" : "bg-white hover:bg-slate-50";
  const text = dark ? "text-white" : "text-slate-700";
  const subText = dark ? "text-white/60" : "text-slate-500";

  if (loading) {
    return (
      <div
        className={`h-9 w-24 animate-pulse rounded-full border ${border} ${dark ? "bg-white/5" : "bg-slate-100"}`}
      />
    );
  }

  if (isGuest || !user) {
    return (
      <Link
        to="/auth"
        search={{ redirect: currentPath, mode: "signup" } as never}
        className={`inline-flex items-center gap-2 rounded-full border ${border} ${bg} px-3 py-1.5 text-[12.5px] font-medium ${text} transition`}
      >
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${dark ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          G
        </span>
        <span className="hidden sm:inline">Guest ·</span>
        <span className="text-[#1d6bff]">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full border ${border} ${bg} py-1.5 pl-1.5 pr-3 text-[12.5px] font-medium ${text} transition`}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#1d6bff] to-[#4f8cff] text-[10px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{displayName}</span>
      </button>
      {open && (
        <div
          className={`absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border shadow-xl ${
            dark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800"
          }`}
        >
          <div className={`px-3 py-3 border-b ${dark ? "border-white/10" : "border-slate-100"}`}>
            <div className="text-[13px] font-semibold truncate">{displayName}</div>
            {email && <div className={`text-[11.5px] truncate ${subText}`}>{email}</div>}
          </div>
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] ${
              dark ? "hover:bg-white/5" : "hover:bg-slate-50"
            }`}
          >
            <UserIcon className="h-4 w-4" /> Dashboard
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate({ to: "/" });
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] ${
              dark ? "hover:bg-white/5" : "hover:bg-slate-50"
            }`}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
