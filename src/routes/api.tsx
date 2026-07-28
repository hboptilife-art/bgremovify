import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Code2, Key, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "Image API — Neural Core™ for developers" },
      {
        name: "description",
        content:
          "REST endpoints for background removal, virtual try-on and bulk pipelines. OpenAPI-compatible.",
      },
      { property: "og:title", content: "Image API — BgRemovify" },
      {
        property: "og:description",
        content: "REST endpoints for background removal, virtual try-on and bulk pipelines.",
      },
    ],
  }),
  component: ApiPage,
});

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/remove-bg",
    desc: "Neural Core™ background removal. Returns a transparent PNG.",
    cost: "1 credit / image",
  },
  {
    method: "POST",
    path: "/v1/tryon",
    desc: "Virtual Try-On composition with Gemini 3 Pro Image.",
    cost: "5 credits / image",
  },
  {
    method: "POST",
    path: "/v1/bulk",
    desc: "Batch pipeline. Accepts a manifest of jobs, streams results.",
    cost: "Per-job billing",
  },
];

const CURL = `curl -X POST https://api.bgremovify.com/v1/remove-bg \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "image_url": "https://cdn.example.com/sku-1234.jpg" }'`;

function ApiPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <TopNav rightSlot={<LanguageSelector />} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
            <Code2 className="h-3 w-3" /> Image API
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Neural Core™ for your product pipeline
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-slate-500">
            One REST surface for background removal, Virtual Try-On and bulk workflows.
            OpenAPI-compatible, priced per image, no monthly minimum.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={Zap} title="Millisecond latency" text="Edge-served inference across 3 regions." />
          <Feature icon={Key} title="Scoped API keys" text="Per-project keys with rate limits and IP allow-lists." />
          <Feature icon={ShieldCheck} title="SOC-2 posture" text="Zero image retention by default. GDPR-ready." />
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Endpoints
          </div>
          <div className="divide-y divide-slate-100">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[100px_1fr_140px] md:items-center">
                <span className="inline-flex w-fit rounded-md bg-slate-900 px-2 py-1 text-[10.5px] font-semibold text-white">
                  {e.method}
                </span>
                <div>
                  <div className="font-mono text-[13px] font-semibold text-slate-800">{e.path}</div>
                  <div className="text-[12px] text-slate-500">{e.desc}</div>
                </div>
                <div className="text-[11.5px] font-medium text-slate-500 md:text-right">{e.cost}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
          <div className="border-b border-slate-800 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Quick start · curl
          </div>
          <pre className="overflow-x-auto p-5 text-[12px] leading-relaxed text-emerald-200">
{CURL}
          </pre>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-[14px] font-semibold text-slate-900">API keys are in staged rollout.</div>
          <p className="max-w-md text-[12.5px] text-slate-500">
            Enterprise customers get scoped keys, dashboard usage graphs and SLA. Get in touch to enable your project.
          </p>
          <div className="mt-2 flex gap-2">
            <Link
              to="/contact"
              className="rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
            >
              Request API access
            </Link>
            <Link
              to="/bulk"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
            >
              See Bulk Edit
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({
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
