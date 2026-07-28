import { Link } from "@tanstack/react-router";
import { Layers, Terminal, Workflow, ShieldCheck, ArrowRight, CheckCircle2, Zap } from "lucide-react";

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

const COPY: Record<Lang, {
  badge: string;
  title: string;
  subtitle: string;
  bulkTitle: string;
  bulkDesc: string;
  bulkStats: [string, string, string];
  apiTitle: string;
  apiDesc: string;
  apiBullets: [string, string, string];
  ctaBulk: string;
  ctaApi: string;
  queue: string;
  processing: string;
  done: string;
}> = {
  tr: {
    badge: "Enterprise Workflow",
    title: "Toplu İşlem, API ve Otomasyon Hattı",
    subtitle: "Tek preset ile yüzlerce SKU, doğrudan katalog sisteminize akan API çıktısı.",
    bulkTitle: "Bulk Processing",
    bulkDesc: "ZIP veya CSV yükle — arka plan silme, sahne yerleştirme ve pazaryeri boyutları tek geçişte.",
    bulkStats: ["500+ görsel / batch", "Ortalama 42 sn/SKU", "Marketplace-ready export"],
    apiTitle: "Developer API",
    apiDesc: "Shopify, Trendyol, Magento ve özel PIM sistemleri için REST + webhook entegrasyonu.",
    apiBullets: ["Async job queue + webhook callback", "S3 / CDN direct delivery", "Rate-limit: 10K req/dk"],
    ctaBulk: "Bulk Studio'yu aç",
    ctaApi: "API dokümantasyonu",
    queue: "Kuyruk",
    processing: "İşleniyor",
    done: "Tamamlandı",
  },
  en: {
    badge: "Enterprise Workflow",
    title: "Bulk Processing, API & Automation Pipeline",
    subtitle: "One preset, hundreds of SKUs — outputs streamed directly into your catalog stack.",
    bulkTitle: "Bulk Processing",
    bulkDesc: "Drop a ZIP or CSV — background removal, scene placement and marketplace sizing in one pass.",
    bulkStats: ["500+ images / batch", "Avg 42s per SKU", "Marketplace-ready export"],
    apiTitle: "Developer API",
    apiDesc: "REST + webhook integration for Shopify, Trendyol, Magento and custom PIM stacks.",
    apiBullets: ["Async job queue + webhook callback", "S3 / CDN direct delivery", "Rate-limit: 10K req/min"],
    ctaBulk: "Open Bulk Studio",
    ctaApi: "API documentation",
    queue: "Queue",
    processing: "Processing",
    done: "Done",
  },
  es: {
    badge: "Flujo Enterprise",
    title: "Procesamiento masivo, API y automatización",
    subtitle: "Un preset, cientos de SKUs — salidas directamente a tu catálogo.",
    bulkTitle: "Procesamiento masivo",
    bulkDesc: "Sube ZIP o CSV — fondo, escena y tamaños de marketplace en una pasada.",
    bulkStats: ["500+ imágenes / lote", "42s por SKU", "Export listo para marketplace"],
    apiTitle: "API para desarrolladores",
    apiDesc: "REST + webhooks para Shopify, Trendyol, Magento y PIM personalizados.",
    apiBullets: ["Cola async + webhook", "Entrega directa S3 / CDN", "Límite: 10K req/min"],
    ctaBulk: "Abrir Bulk Studio",
    ctaApi: "Documentación API",
    queue: "Cola",
    processing: "Procesando",
    done: "Listo",
  },
  de: {
    badge: "Enterprise Workflow",
    title: "Bulk-Verarbeitung, API & Automation",
    subtitle: "Ein Preset, hunderte SKUs — Ergebnisse fließen direkt in deinen Katalog.",
    bulkTitle: "Bulk-Verarbeitung",
    bulkDesc: "ZIP oder CSV hochladen — Hintergrund, Szene, Marktplatzformate in einem Lauf.",
    bulkStats: ["500+ Bilder / Batch", "Ø 42s pro SKU", "Marketplace-ready Export"],
    apiTitle: "Developer API",
    apiDesc: "REST + Webhooks für Shopify, Trendyol, Magento und eigene PIMs.",
    apiBullets: ["Async Queue + Webhook", "S3 / CDN Direktauslieferung", "Limit: 10K req/min"],
    ctaBulk: "Bulk Studio öffnen",
    ctaApi: "API-Dokumentation",
    queue: "Warteschlange",
    processing: "Verarbeitung",
    done: "Fertig",
  },
  ru: {
    badge: "Enterprise Workflow",
    title: "Массовая обработка, API и автоматизация",
    subtitle: "Один пресет, сотни SKU — результаты сразу в вашем каталоге.",
    bulkTitle: "Массовая обработка",
    bulkDesc: "Загрузите ZIP или CSV — фон, сцена, форматы маркетплейсов за один проход.",
    bulkStats: ["500+ изображений / батч", "42с на SKU", "Готово для маркетплейса"],
    apiTitle: "API для разработчиков",
    apiDesc: "REST + вебхуки для Shopify, Trendyol, Magento и кастомных PIM.",
    apiBullets: ["Async очередь + webhook", "S3 / CDN доставка", "Лимит: 10K req/мин"],
    ctaBulk: "Открыть Bulk Studio",
    ctaApi: "Документация API",
    queue: "Очередь",
    processing: "Обработка",
    done: "Готово",
  },
  ar: {
    badge: "سير عمل المؤسسات",
    title: "المعالجة المجمعة و API والأتمتة",
    subtitle: "إعداد واحد ومئات المنتجات — النتائج مباشرة إلى كتالوجك.",
    bulkTitle: "المعالجة المجمعة",
    bulkDesc: "ارفع ZIP أو CSV — إزالة الخلفية والمشهد والأحجام في مرة واحدة.",
    bulkStats: ["500+ صورة / دفعة", "42 ثانية لكل SKU", "جاهز للأسواق"],
    apiTitle: "API للمطورين",
    apiDesc: "REST + webhooks لـ Shopify و Trendyol و Magento و PIM مخصص.",
    apiBullets: ["طابور Async + webhook", "توصيل S3 / CDN", "الحد: 10K/دقيقة"],
    ctaBulk: "افتح Bulk Studio",
    ctaApi: "وثائق API",
    queue: "الطابور",
    processing: "قيد المعالجة",
    done: "تم",
  },
};

export function BulkApiShowcase({ lang }: { lang: Lang }) {
  const t = COPY[lang] ?? COPY.en;

  return (
    <section className="mx-auto mt-20 w-full max-w-6xl px-2 sm:px-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
          <Workflow className="h-3 w-3 text-indigo-500" />
          {t.badge}
        </span>
        <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          {t.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Bulk Processing Panel */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{t.bulkTitle}</div>
              <div className="text-xs text-slate-500">{t.bulkDesc}</div>
            </div>
          </div>

          {/* Faux bulk queue UI */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <span>batch_2026_q3.zip</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Zap className="h-3 w-3" /> 512 SKU
              </span>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "SKU-1042 · sneaker_white.jpg", pct: 100, state: "done" },
                { name: "SKU-1043 · sneaker_black.jpg", pct: 100, state: "done" },
                { name: "SKU-1044 · watch_gold.jpg", pct: 72, state: "processing" },
                { name: "SKU-1045 · perfume_amber.jpg", pct: 34, state: "processing" },
                { name: "SKU-1046 · cap_navy.jpg", pct: 0, state: "queue" },
                { name: "SKU-1047 · dress_red.jpg", pct: 0, state: "queue" },
              ].map((row) => (
                <div key={row.name} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: row.state === "done" ? "#10b981" : row.state === "processing" ? "#6366f1" : "#cbd5e1",
                    }}
                  />
                  <span className="flex-1 truncate font-mono text-slate-700">{row.name}</span>
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${row.pct}%`,
                        background: row.state === "done" ? "#10b981" : "#6366f1",
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-slate-500 tabular-nums">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="mt-4 grid grid-cols-3 gap-2">
            {t.bulkStats.map((s) => (
              <li key={s} className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-medium text-slate-600">
                {s}
              </li>
            ))}
          </ul>

          <Link
            to="/bulk"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {t.ctaBulk} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* API Panel */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Terminal className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">{t.apiTitle}</div>
              <div className="text-xs text-slate-500">{t.apiDesc}</div>
            </div>
          </div>

          {/* Faux code block */}
          <div className="mt-4 box-border w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-[11px] leading-relaxed shadow-inner">
            <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400/70" />
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span className="ml-2 min-w-0 truncate font-mono text-[10px] text-slate-400">POST · /v1/photoshoot</span>
            </div>
            <div className="grid min-w-0 gap-1 px-3 py-2.5 font-mono text-slate-200">
              <div className="min-w-0 break-all"><span className="text-indigo-300">curl</span> -X POST /v1/photoshoot</div>
              <div className="min-w-0 break-all pl-3">-H <span className="text-emerald-300">&quot;Authorization: Bearer sk_live_***&quot;</span></div>
              <div className="min-w-0 break-all pl-3">-H <span className="text-emerald-300">&quot;Content-Type: application/json&quot;</span></div>
              <div className="min-w-0 break-all pl-3">-d <span className="text-amber-200">&#123;&quot;image_url&quot;:&quot;cdn.shop/sku-1042.jpg&quot;,&quot;preset&quot;:&quot;ghost_mannequin&quot;&#125;</span></div>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5">
            {t.apiBullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12.5px] text-slate-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              {t.ctaApi} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SOC2 · GDPR
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
