import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Upload, Layers, FileSpreadsheet, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Edit — Neural Core™ for catalog teams" },
      {
        name: "description",
        content:
          "Drop hundreds of SKUs, apply presets, and export marketplace-ready visuals in one flow.",
      },
      { property: "og:title", content: "Bulk Edit — BgRemovify" },
      {
        property: "og:description",
        content: "Process hundreds of product photos in one flow with Neural Core™ presets.",
      },
    ],
  }),
  component: BulkPage,
});

function BulkPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <TopNav rightSlot={<LanguageSelector />} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
            <Layers className="h-3 w-3" /> Bulk Edit
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Hundreds of SKUs. One preset. Ship in minutes.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-slate-500">
            Drop your catalog, apply background removal, snap into a marketplace template,
            and download a ready-to-upload CSV + image pack.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Upload} title="Drag & drop 500+ images" text="ZIP, folder, or CSV upload. Auto-matched to SKU codes." />
          <FeatureCard icon={Zap} title="One preset, whole batch" text="BG remove + Snap Template + marketplace resize in a single pass." />
          <FeatureCard icon={FileSpreadsheet} title="Ready-to-upload export" text="Amazon, Trendyol, Hepsiburada folder structure + CSV." />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Enterprise preview</h2>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500">
            Bulk workflows are currently in staged rollout for enterprise plans.
            Start with the Studio to build a preset, then apply it to your full catalog.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              to="/studio"
              className="rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
            >
              Open Studio
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
            >
              Request enterprise access
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[14px] font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-[12.5px] text-slate-500">{text}</p>
    </div>
  );
}
