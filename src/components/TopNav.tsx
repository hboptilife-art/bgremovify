import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MEGA_MENUS, type MegaMenu } from "@/lib/navigation-taxonomy";
import { usePreferredLanguage, type AppLang } from "@/lib/language";

type NavKey =
  | "solutions"
  | "industries"
  | "developers"
  | "studio"
  | "bulk"
  | "api"
  | "pricing"
  | "searchPlaceholder"
  | "toggleMenu"
  | "home";

const NAV_STRINGS: Record<NavKey, Record<AppLang, string>> = {
  solutions:         { tr:"Çözümler",    en:"Solutions",   es:"Soluciones",  de:"Lösungen",     ru:"Решения",       ar:"الحلول" },
  industries:        { tr:"Sektörler",   en:"Industries",  es:"Sectores",    de:"Branchen",     ru:"Отрасли",       ar:"القطاعات" },
  developers:        { tr:"Geliştiriciler", en:"Developers", es:"Desarrolladores", de:"Entwickler", ru:"Разработчикам", ar:"المطورون" },
  studio:            { tr:"Stüdyo",      en:"Studio",      es:"Estudio",     de:"Studio",       ru:"Студия",        ar:"الاستوديو" },
  bulk:              { tr:"Toplu",       en:"Bulk",        es:"Lotes",       de:"Bulk",         ru:"Пакет",         ar:"دفعات" },
  api:               { tr:"API",         en:"API",         es:"API",         de:"API",          ru:"API",           ar:"واجهة API" },
  pricing:           { tr:"Fiyatlandırma", en:"Pricing",   es:"Precios",     de:"Preise",       ru:"Тарифы",        ar:"الأسعار" },
  searchPlaceholder: { tr:"Sektör, ekip, şablon ara…", en:"Search industries, teams, templates…", es:"Buscar sectores, equipos, plantillas…", de:"Branchen, Teams, Vorlagen suchen…", ru:"Поиск отраслей, команд, шаблонов…", ar:"ابحث في القطاعات والفرق والقوالب…" },
  toggleMenu:        { tr:"Menüyü aç/kapat", en:"Toggle menu", es:"Alternar menú", de:"Menü umschalten", ru:"Открыть меню", ar:"تبديل القائمة" },
  home:              { tr:"BgRemovify ana sayfa", en:"BgRemovify home", es:"Inicio BgRemovify", de:"BgRemovify Start", ru:"Главная BgRemovify", ar:"الصفحة الرئيسية BgRemovify" },
};

function useNavT() {
  const lang = usePreferredLanguage("en");
  return (k: NavKey) => NAV_STRINGS[k][lang] ?? NAV_STRINGS[k].en;
}

const MENU_LABEL_KEY: Record<string, NavKey> = {
  solutions: "solutions",
  industries: "industries",
  developers: "developers",
};

// i18n dictionary for mega-menu items. Keyed by MegaLink.id.
// Falls back to English `label` / `description` from navigation-taxonomy.ts.
type MegaI18n = Record<string, Partial<Record<AppLang, { label: string; description: string }>>>;
const MEGA_ITEM_I18N: MegaI18n = {
  growing: {
    tr: { label: "Büyüyen markalar", description: "Foto ekibi olmadan stüdyo kalitesinde ürün çekimleri yayınla." },
    de: { label: "Wachsende Marken", description: "Studioqualität ohne eigenes Fotoshooting-Team." },
    es: { label: "Marcas en crecimiento", description: "Fotos de producto de estudio sin equipo fotográfico." },
    ru: { label: "Растущие бренды", description: "Студийные снимки товаров без своей фотокоманды." },
    ar: { label: "العلامات الناشئة", description: "صور منتجات باحترافية استوديو دون فريق تصوير." },
  },
  scaling: {
    tr: { label: "Ölçeklenen işletmeler", description: "Kataloğunu tek akışta 6+ pazaryerine çoğalt." },
    de: { label: "Skalierende Unternehmen", description: "Kataloge in einem Flow auf 6+ Marktplätzen ausspielen." },
    es: { label: "Negocios en escala", description: "Multiplica catálogos en 6+ marketplaces en un solo flujo." },
    ru: { label: "Масштабирование бизнеса", description: "Каталоги на 6+ маркетплейсах в одном потоке." },
    ar: { label: "الأعمال المتنامية", description: "انسخ الكتالوجات إلى أكثر من 6 أسواق في تدفق واحد." },
  },
  enterprise: {
    tr: { label: "Kurumsal", description: "Kurumsal API, SLA'lar ve özel başarı ekibi." },
    de: { label: "Enterprise", description: "Enterprise-API, SLAs und dediziertes Success-Team." },
    es: { label: "Enterprise", description: "API empresarial, SLAs y equipo de éxito dedicado." },
    ru: { label: "Enterprise", description: "Корпоративный API, SLA и выделенная команда." },
    ar: { label: "المؤسسات", description: "واجهة برمجية للمؤسسات وفريق نجاح مخصص." },
  },
  eng: {
    tr: { label: "Ürün & Mühendislik", description: "Toplu boru hatları, PIM ve headless commerce için görsel API." },
    de: { label: "Produkt & Engineering", description: "Bild-API für Bulk-Pipelines, PIM und Headless-Commerce." },
    es: { label: "Producto e Ingeniería", description: "API de imágenes para pipelines masivos y comercio headless." },
    ru: { label: "Продукт и разработка", description: "Image API для массовых пайплайнов и headless-коммерции." },
    ar: { label: "المنتج والهندسة", description: "واجهة API للصور لخطوط الإنتاج وHeadless commerce." },
  },
  ops: {
    tr: { label: "Operasyon & Katalog", description: "SKU'ları toplu düzenle, pazaryeri kurallarına uyum sağla, CSV çıkar." },
    de: { label: "Ops & Katalog", description: "SKUs bulk-editieren, Marktplatz-Vorgaben durchsetzen, CSV exportieren." },
    es: { label: "Ops y Catálogo", description: "Edita SKUs en lote, cumple specs de marketplace, exporta CSV." },
    ru: { label: "Операции и каталог", description: "Пакетное редактирование SKU, спецификации и экспорт CSV." },
    ar: { label: "العمليات والكتالوج", description: "تحرير مجمّع للـSKUs وتصدير CSV بمواصفات الأسواق." },
  },
  creative: {
    tr: { label: "Kreatif & Foto Stüdyo", description: "Snap şablonlar ve sanal deneme ile lookbook üret." },
    de: { label: "Kreativ & Foto-Studio", description: "Snap-Vorlagen und Virtual Try-On für Lookbooks." },
    es: { label: "Creativo y Foto Estudio", description: "Plantillas Snap y prueba virtual para lookbooks." },
    ru: { label: "Креатив и фото-студия", description: "Snap-шаблоны и Virtual Try-On для лукбуков." },
    ar: { label: "الإبداع واستوديو الصور", description: "قوالب فورية وتجربة افتراضية لأدلة الأزياء." },
  },
  marketing: {
    tr: { label: "Pazarlama", description: "Marka tonunda hero görselleri ve kampanya varyantları — dakikalar içinde." },
    de: { label: "Marketing", description: "Markenkonforme Hero-Visuals und Kampagnenvarianten in Minuten." },
    es: { label: "Marketing", description: "Visuales hero de marca y variantes de campaña en minutos." },
    ru: { label: "Маркетинг", description: "Hero-визуалы и варианты кампаний за минуты." },
    ar: { label: "التسويق", description: "صور رئيسية بهوية العلامة وتباينات حملات في دقائق." },
  },
  fashion: {
    tr: { label: "Moda & Giyim", description: "Sanal deneme, manken üstü çekimler, editoryal lookbook'lar." },
    de: { label: "Mode & Bekleidung", description: "Virtual Try-On, On-Model-Shots, Editorial-Lookbooks." },
    es: { label: "Moda y Ropa", description: "Prueba virtual, fotos on-model y lookbooks editoriales." },
    ru: { label: "Мода и одежда", description: "Virtual Try-On, съёмки на модели и лукбуки." },
    ar: { label: "الأزياء والملابس", description: "تجربة افتراضية وصور على الموديل ولوكبوكات." },
  },
  marketplace: {
    tr: { label: "Pazaryeri & Retail", description: "Amazon, Trendyol, Hepsiburada için ölçü-tam çıktı." },
    de: { label: "Marktplatz & Retail", description: "Amazon, Trendyol, Hepsiburada — größengenaue Exporte." },
    es: { label: "Marketplace y Retail", description: "Exportes exactos para Amazon, Trendyol y más." },
    ru: { label: "Маркетплейсы и ретейл", description: "Точные экспорты для Amazon, Trendyol и других." },
    ar: { label: "الأسواق والتجزئة", description: "تصدير بمقاسات دقيقة لـAmazon وTrendyol والمزيد." },
  },
  beauty: {
    tr: { label: "Güzellik & Cilt", description: "Marka tonlu arka planlarda pırıl pırıl packshot'lar." },
    de: { label: "Beauty & Skincare", description: "Kristallklare Packshots mit markengerechten Hintergründen." },
    es: { label: "Belleza y Skincare", description: "Packshots impecables con fondos de marca." },
    ru: { label: "Красота и уход", description: "Идеальные packshot с фирменными фонами." },
    ar: { label: "الجمال والعناية", description: "صور منتجات نقيّة بخلفيات تناسب هوية العلامة." },
  },
  home: {
    tr: { label: "Ev & Mobilya", description: "Yaşam alanı sahneleri, ölçekli sahneleme, gerçek gölgeler." },
    de: { label: "Zuhause & Möbel", description: "Lifestyle-Räume, maßstabsgetreues Staging, echte Schatten." },
    es: { label: "Hogar y Muebles", description: "Escenas lifestyle a escala real con sombras precisas." },
    ru: { label: "Дом и мебель", description: "Lifestyle-сцены с точным масштабом и тенями." },
    ar: { label: "المنزل والأثاث", description: "مشاهد لايف ستايل بمقاييس دقيقة وظلال طبيعية." },
  },
  food: {
    tr: { label: "Yemek & Teslimat", description: "Menü hero kartları, teslimat uygulamalarına uygun oranlar." },
    de: { label: "Essen & Lieferung", description: "Menü-Hero-Karten in Delivery-App-Formaten." },
    es: { label: "Comida y Delivery", description: "Cartas hero de menú listas para apps de delivery." },
    ru: { label: "Еда и доставка", description: "Hero-карточки меню в форматах доставки." },
    ar: { label: "الطعام والتوصيل", description: "بطاقات قوائم طعام بمقاسات تطبيقات التوصيل." },
  },
  tech: {
    tr: { label: "Teknoloji & SaaS", description: "Cihaz maketleri, premium sahnelerde uygulama ekranları." },
    de: { label: "Tech & SaaS", description: "Device-Mockups, App-Screens auf Premium-Szenen." },
    es: { label: "Tech y SaaS", description: "Mockups de dispositivos y screens en escenas premium." },
    ru: { label: "Технологии и SaaS", description: "Мокапы устройств и app-скрины на премиум-сценах." },
    ar: { label: "التكنولوجيا وSaaS", description: "نماذج أجهزة ولقطات تطبيقات على مشاهد بريميوم." },
  },
  api: {
    tr: { label: "Görsel API", description: "Arka plan silme, Try-On ve toplu boru hatları için REST uçları." },
    de: { label: "Bild-API", description: "REST-Endpoints für BG-Entfernung, Try-On und Bulk-Pipelines." },
    es: { label: "API de imágenes", description: "Endpoints REST para eliminar fondo, try-on y pipelines masivos." },
    ru: { label: "Image API", description: "REST-эндпоинты для удаления фона, Try-On и bulk-обработки." },
    ar: { label: "واجهة الصور", description: "نقاط REST لإزالة الخلفية والتجربة والمعالجة المجمّعة." },
  },
  bulk: {
    tr: { label: "Toplu Düzenleme", description: "Yüzlerce SKU'yu bırak, ön ayar uygula, CSV çıkar." },
    de: { label: "Bulk-Edit", description: "Hunderte SKUs ablegen, Presets anwenden, CSV exportieren." },
    es: { label: "Edición en lote", description: "Suelta cientos de SKUs, aplica presets y exporta CSV." },
    ru: { label: "Пакетная правка", description: "Сотни SKU, пресеты и экспорт CSV." },
    ar: { label: "التحرير المجمّع", description: "أفلت مئات المنتجات وطبّق إعدادات وصدّر CSV." },
  },
};

const MEGA_HEADING_I18N: Record<string, Partial<Record<AppLang, string>>> = {
  "By scale":                { tr: "Ölçeğe göre", de: "Nach Größe", es: "Por escala", ru: "По масштабу", ar: "حسب الحجم" },
  "By team":                 { tr: "Ekibe göre", de: "Nach Team", es: "Por equipo", ru: "По команде", ar: "حسب الفريق" },
  "Retail & lifestyle":      { tr: "Perakende & yaşam", de: "Retail & Lifestyle", es: "Retail y lifestyle", ru: "Ретейл и лайфстайл", ar: "التجزئة ونمط الحياة" },
  "Home, food & tech":       { tr: "Ev, yemek & teknoloji", de: "Zuhause, Essen & Tech", es: "Hogar, comida y tech", ru: "Дом, еда и техно", ar: "المنزل والطعام والتكنولوجيا" },
  "Build with Neural Core™": { tr: "Neural Core™ ile inşa et", de: "Mit Neural Core™ bauen", es: "Construye con Neural Core™", ru: "Стройте на Neural Core™", ar: "ابنِ مع Neural Core™" },
};

const MEGA_CTA_I18N: Record<string, Partial<Record<AppLang, string>>> = {
  "Explore Studio":            { tr: "Stüdyoyu keşfet", de: "Studio entdecken", es: "Explorar el Estudio", ru: "Открыть Студию", ar: "اكتشف الاستوديو" },
  "Browse 900+ templates":     { tr: "900+ şablonu keşfet", de: "900+ Vorlagen entdecken", es: "Ver 900+ plantillas", ru: "900+ шаблонов", ar: "تصفح أكثر من 900 قالب" },
  "Read the API docs":         { tr: "API dokümanını oku", de: "API-Dokumentation lesen", es: "Leer los docs de la API", ru: "Открыть документацию API", ar: "اقرأ توثيق API" },
};

function tItem(id: string, lang: AppLang, fallback: { label: string; description: string }) {
  const hit = MEGA_ITEM_I18N[id]?.[lang];
  return hit ?? fallback;
}
function tHeading(text: string, lang: AppLang) {
  return MEGA_HEADING_I18N[text]?.[lang] ?? text;
}
function tCta(text: string, lang: AppLang) {
  return MEGA_CTA_I18N[text]?.[lang] ?? text;
}


const QUICK_LINKS: { to: string; label: NavKey; search?: Record<string, string> }[] = [
  { to: "/studio", label: "studio" },
  { to: "/bulk", label: "bulk" },
  { to: "/api", label: "api" },
  { to: "/pricing", label: "pricing" },
];

/**
 * Enterprise mega-menu top navigation.
 * Desktop: hoverable panels for Solutions / Industries / Developers + global search.
 * Mobile: full-screen accordion drawer.
 */
export function TopNav({ rightSlot }: { rightSlot?: ReactNode } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const lang = usePreferredLanguage("en");
  const t = useNavT();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menu on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  const searchIndex = useMemo(() => {
    return MEGA_MENUS.flatMap((m) =>
      m.columns.flatMap((c) =>
        c.items.map((i) => ({ ...i, group: m.label, heading: c.heading })),
      ),
    );
  }, []);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.group.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query, searchIndex]);

  const openWithDelay = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (hits[0]) {
      navigate({ to: hits[0].to as never, search: (hits[0].search ?? {}) as never });
      setQuery("");
    } else if (query.trim()) {
      navigate({ to: "/studio", search: { panel: "samples", q: query.trim() } as never });
      setQuery("");
    }
  };

  return (
    <div className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2" aria-label={t("home")}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-slate-900">
            BgRemovify
          </span>
        </Link>

        {/* Desktop mega menus */}
        <nav
          className="ml-2 hidden flex-1 items-center gap-0.5 md:flex"
          onMouseLeave={scheduleClose}
        >
          {MEGA_MENUS.map((menu) => {
            const active = openMenu === menu.id;
            return (
              <div
                key={menu.id}
                className="relative"
                onMouseEnter={() => openWithDelay(menu.id)}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu(active ? null : menu.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {t(MENU_LABEL_KEY[menu.id] ?? "solutions")}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${active ? "rotate-180" : ""}`} />
                </button>
                {active && <MegaPanel menu={menu} lang={lang} onClose={() => setOpenMenu(null)} />}
              </div>
            );
          })}
          {QUICK_LINKS.map((q) => {
            const isActive =
              pathname === q.to || (q.to !== "/" && pathname.startsWith(q.to));
            return (
              <Link
                key={q.to}
                to={q.to as never}
                className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t(q.label)}
              </Link>
            );
          })}
        </nav>

        {/* Global search */}
        <form
          onSubmit={runSearch}
          className="relative ml-auto hidden w-[220px] lg:block"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12.5px] text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
          {hits.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-[110] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate({ to: h.to as never, search: (h.search ?? {}) as never });
                    setQuery("");
                  }}
                  className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold text-slate-800">{h.label}</div>
                    <div className="line-clamp-1 text-[11px] text-slate-500">{h.description}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-slate-500">
                    {h.group}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {rightSlot ? (
          <div className="ml-auto hidden items-center gap-2 md:ml-2 md:flex">{rightSlot}</div>
        ) : null}



        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-700 md:hidden"
          aria-label={t("toggleMenu")}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen && <MobileDrawer lang={lang} onClose={() => setMobileOpen(false)} />}
    </div>
  );
}

function MegaPanel({ menu, lang, onClose }: { menu: MegaMenu; lang: AppLang; onClose: () => void }) {
  return (
    <div className="absolute left-0 top-full z-[110] pt-2">
      <div className="w-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="grid grid-cols-2 gap-6 p-6">
          {menu.columns.map((col) => (
            <div key={col.heading}>
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {tHeading(col.heading, lang)}
              </div>
              <div className="space-y-1">
                {col.items.map((item) => {
                  const tr = tItem(item.id, lang, { label: item.label, description: item.description });
                  return (
                    <Link
                      key={item.id}
                      to={item.to as never}
                      search={(item.search ?? {}) as never}
                      onClick={onClose}
                      className="block rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
                    >
                      <div className="text-[13px] font-semibold text-slate-900">{tr.label}</div>
                      <div className="mt-0.5 text-[11.5px] text-slate-500">{tr.description}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {menu.cta && (
          <Link
            to={menu.cta.to as never}
            search={(menu.cta.search ?? {}) as never}
            onClick={onClose}
            className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-[12.5px] font-semibold text-slate-800 hover:bg-slate-100"
          >
            <span>{tCta(menu.cta.label, lang)}</span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function MobileDrawer({ lang, onClose }: { lang: AppLang; onClose: () => void }) {
  const t = useNavT();
  return (
    <div className="border-t border-slate-100 bg-white md:hidden">
      <div className="mx-auto max-w-7xl px-3 py-3">
        {MEGA_MENUS.map((menu) => (
          <details key={menu.id} className="group border-b border-slate-100 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-[13px] font-semibold text-slate-800">
              {t(MENU_LABEL_KEY[menu.id] ?? "solutions")}
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-1 grid grid-cols-1 gap-1 pb-2 sm:grid-cols-2">
              {menu.columns.flatMap((c) =>
                c.items.map((item) => {
                  const tr = tItem(item.id, lang, { label: item.label, description: item.description });
                  return (
                    <Link
                      key={item.id}
                      to={item.to as never}
                      search={(item.search ?? {}) as never}
                      onClick={onClose}
                      className="rounded-lg px-2 py-2 hover:bg-slate-50"
                    >
                      <div className="text-[12.5px] font-semibold text-slate-800">{tr.label}</div>
                      <div className="text-[11px] text-slate-500">{tr.description}</div>
                    </Link>
                  );
                }),
              )}
            </div>
          </details>
        ))}
        <div className="grid grid-cols-2 gap-1 pt-2 sm:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.to}
              to={q.to as never}
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-3 py-2 text-center text-[12.5px] font-semibold text-slate-800 hover:bg-slate-200"
            >
              {t(q.label)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
