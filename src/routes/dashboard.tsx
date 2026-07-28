import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Search,
  Upload,
  ShoppingBag,
  Camera,
  Palette,
  Layers as LayersIcon,
  Cpu,
  Zap,
  Wand2,
  LayoutGrid,
  LifeBuoy,
  Settings,
  ImageIcon,
} from "lucide-react";
import { SessionPill } from "@/components/SessionPill";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  MarketplaceFilterBar,
  useActiveMarketplace,
} from "@/components/MarketplaceFilterBar";
import { marketplaceById } from "@/lib/marketplaces";
import { useSession } from "@/hooks/use-session";
import { TopNav } from "@/components/TopNav";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Start — BGRemovify" },
      {
        name: "description",
        content:
          "Upload a product photo — BGRemovify removes the background automatically and drops it straight into the studio.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

/* -------------------------------------------------------------------------- */
/*  Static skeleton data (no API yet)                                         */
/* -------------------------------------------------------------------------- */

type Category = {
  id: string;
  label: string;
  icon: typeof ShoppingBag;
  accent: string;
};

const CATEGORIES: Category[] = [
  {
    id: "ecommerce",
    label: "E-Commerce & Marketplaces",
    icon: ShoppingBag,
    accent: "from-[#1d6bff] to-[#4f8cff]",
  },
  {
    id: "product",
    label: "Product Presentations",
    icon: Camera,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "creative",
    label: "Creative & Social Media",
    icon: Palette,
    accent: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "basics",
    label: "Basic Layers",
    icon: LayersIcon,
    accent: "from-slate-500 to-slate-700",
  },
];

type Engine = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Cpu;
};

const ENGINES: Engine[] = [
  { id: "engine-1", label: "AI Engine 1", hint: "Coming soon", icon: Cpu },
  { id: "engine-2", label: "AI Engine 2", hint: "Coming soon", icon: Zap },
  { id: "engine-3", label: "AI Engine 3", hint: "Coming soon", icon: Wand2 },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function DashboardPage() {
  const { isGuest, displayName } = useSession();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ecommerce");
  const [activeEngine, setActiveEngine] = useState<string>("engine-1");
  const [dragOver, setDragOver] = useState(false);
  const marketplaceId = useActiveMarketplace();
  const marketplace = marketplaceById(marketplaceId);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      // Skeleton stage: just forward to /studio. Auto BG-removal is wired there.
      navigate({ to: "/studio" });
    },
    [navigate],
  );

  return (
    <div
      className="min-h-screen w-full bg-[#f5f7fa] text-slate-800"
      style={{ colorScheme: "light" }}
    >
      <TopNav />
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d6bff] text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-slate-900">BGRemovify</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Start
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <SessionPill currentPath="/dashboard" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-10 md:pt-8">
        {/* Hero showcase loop + Start CTA */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 md:mb-8 md:p-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Neural Core™ · Live
            </div>
            <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-slate-900 md:text-[32px]">
              {isGuest ? "From raw photo to storefront-ready" : `Welcome back, ${displayName} 👋`}
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-slate-500 md:text-[14.5px]">
              Drop a product photo — we clean the background and generate on-model, studio-ready visuals in seconds.
            </p>

            <div className="mt-5 w-full">
              <HeroShowcaseLoop />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: "/studio" })}
                className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-black"
              >
                <Sparkles className="h-4 w-4" />
                Start creating
                <span className="ml-1 text-slate-300 transition group-hover:translate-x-0.5">→</span>
              </button>
              <span className="text-[12px] text-slate-400">Free plan · no card required</span>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mb-5 md:mb-6">

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-[#1d6bff] focus-within:ring-2 focus-within:ring-[#1d6bff]/15">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates, categories, tools…"
              className="w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 md:inline">
              Soon
            </span>
          </div>
        </section>

        {/* Desktop = sidebar + upload; Mobile = chips + upload */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
          {/* Categories — desktop vertical */}
          <aside className="hidden md:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-2">
              <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Categories
              </div>
              <ul className="space-y-1">
                {CATEGORIES.map((c) => {
                  const active = activeCategory === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(c.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition ${
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${c.accent} text-white shadow-sm`}
                        >
                          <c.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 truncate">{c.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 border-t border-slate-100 px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                AI Engines
              </div>
              <ul className="space-y-1">
                {ENGINES.map((e) => {
                  const active = activeEngine === e.id;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setActiveEngine(e.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                          active
                            ? "bg-[#1d6bff]/10 text-[#1d6bff]"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <e.icon className="h-3.5 w-3.5" />
                          <span className="font-medium">{e.label}</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          {e.hint}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Right column: chips (mobile) + upload zone */}
          <div className="min-w-0">
            {/* Mobile horizontal category chips */}
            <div className="md:hidden">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Categories
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((c) => {
                  const active = activeCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCategory(c.id)}
                      className={`flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <c.icon className="h-3.5 w-3.5" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Marketplace format filter — drives preview aspect ratio */}
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Marketplace format
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  <span className="text-slate-400">Preview:</span>{" "}
                  <span className="tabular-nums text-slate-700">{marketplace.short}</span>
                </div>
              </div>
              <MarketplaceFilterBar />
            </div>

            {/* Upload zone — aspect adapts to selected marketplace */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              style={{ aspectRatio: marketplace.aspect }}
              className={`mx-auto mt-3 flex w-full max-w-[520px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? "border-[#1d6bff] bg-[#1d6bff]/5"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d6bff] to-[#4f8cff] text-white shadow-md md:h-16 md:w-16">
                <Upload className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div className="mt-4 text-[16px] font-semibold text-slate-900 md:text-[18px]">
                Upload Image / Clean Up
              </div>
              <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-snug text-slate-500 md:text-[13px]">
                {marketplace.label} format · {marketplace.short}. Background removal starts automatically.
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1d6bff] px-4 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#1d6bff]/25 transition hover:brightness-105"
              >
                <ImageIcon className="h-4 w-4" />
                Choose file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Mobile AI Engines */}
            <div className="mt-6 md:hidden">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                AI Engines
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ENGINES.map((e) => {
                  const active = activeEngine === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setActiveEngine(e.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition ${
                        active
                          ? "border-[#1d6bff] bg-[#1d6bff]/5 text-[#1d6bff]"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <e.icon className="h-4 w-4" />
                      <span className="text-[12px] font-semibold">{e.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">
                        {e.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sponsored / promo slot to fill whitespace */}
        <div className="mt-8">
          <AdSlot label="Sponsored · 728×90 / Responsive" height="h-20 sm:h-24" />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 text-[10.5px]">
          <BottomTab to="/dashboard" icon={LayoutGrid} label="Home" active />
          <BottomTab to="/studio" icon={Sparkles} label="Studio" />
          <BottomTab to="/help" icon={LifeBuoy} label="Help" />
          <BottomTab to="/auth" icon={Settings} label="Account" />
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

function BottomTab({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: typeof Sparkles;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-2.5 font-medium ${
        active ? "text-[#1d6bff]" : "text-slate-500"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero showcase loop — Photoroom-style: raw photo + typing prompt →         */
/*  "Visuals ready" + 4 on-model variations. Loops through 2 samples.         */
/*  Pure client-side (static Unsplash URLs), zero AI cost.                    */
/* -------------------------------------------------------------------------- */

type ShowcaseSample = {
  id: string;
  label: string;
  raw: string;
  prompt: string;
  variations: [string, string, string, string];
};

const SHOWCASE_SAMPLES: ShowcaseSample[] = [
  {
    id: "suit",
    label: "Men's fashion",
    raw: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=520&q=70&auto=format&fit=crop",
    prompt: "Male model wearing this jacket, luxury studio loft, editorial lighting",
    variations: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=360&q=70&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=360&q=70&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=360&q=70&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=360&q=70&auto=format&fit=crop",
    ],
  },
  {
    id: "necklace",
    label: "Jewelry",
    raw: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=520&q=70&auto=format&fit=crop",
    prompt: "Female model wearing this necklace, close-up studio portrait, soft key light",
    variations: [
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=360&q=70&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=360&q=70&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=360&q=70&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=360&q=70&auto=format&fit=crop",
    ],
  },
];

const TYPING_MS = 1500;
const READY_MS = 3000;

function HeroShowcaseLoop() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "ready">("typing");
  const [typed, setTyped] = useState("");

  const sample = SHOWCASE_SAMPLES[sampleIdx];

  // Typing animation
  useEffect(() => {
    setTyped("");
    if (phase !== "typing") return;
    const full = sample.prompt;
    const stepMs = Math.max(15, Math.floor(TYPING_MS / full.length));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i >= full.length) window.clearInterval(id);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [phase, sample.prompt]);

  // Phase state machine: typing → ready → next sample
  useEffect(() => {
    if (phase === "typing") {
      const t = window.setTimeout(() => setPhase("ready"), TYPING_MS + 120);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setSampleIdx((i) => (i + 1) % SHOWCASE_SAMPLES.length);
      setPhase("typing");
    }, READY_MS);
    return () => window.clearTimeout(t);
  }, [phase, sampleIdx]);

  const ready = phase === "ready";

  return (
    <div className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 md:p-4">
      {/* Top row: raw + prompt */}
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 md:grid-cols-[128px_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          <img
            key={`raw-${sample.id}`}
            src={sample.raw}
            alt=""
            className="h-full w-full animate-[fade-in_0.35s_ease-out] object-cover"
            loading="lazy"
          />
          <div className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/95 backdrop-blur">
            Raw
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-between">
          <div className="text-left">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {sample.label}
            </div>
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left text-[12px] leading-snug text-slate-700 md:text-[12.5px]">
              <span>{typed}</span>
              {!ready && (
                <span className="ml-0.5 inline-block h-3 w-[6px] translate-y-0.5 animate-pulse bg-slate-400 align-baseline" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                ready
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald-500" : "animate-pulse bg-slate-400"}`}
              />
              {ready ? "Visuals ready" : "Generating…"}
            </div>
            <div className="text-[10px] font-medium tabular-nums text-slate-400">
              Neural Core™
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: 4 variations grid */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {sample.variations.map((url, i) => (
          <div
            key={`${sample.id}-${i}`}
            className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-slate-100 transition-all duration-500 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
            style={{ transitionDelay: ready ? `${i * 90}ms` : "0ms" }}
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/90">
              V{i + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {SHOWCASE_SAMPLES.map((s, i) => (
          <span
            key={s.id}
            className={`h-1 rounded-full transition-all ${
              i === sampleIdx ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
