import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2 } from "lucide-react";
import { listGallery, type GalleryCategory, type GalleryItem } from "@/lib/gallery.functions";

export type StudioBg = {
  id: string;
  emoji: string;
  label: string;
  url: string;
};

export type StudioLang = "tr" | "en" | "es" | "de" | "ru" | "ar";

type GroupStrings = Record<string, string>;
const GROUP_TITLES: Record<StudioLang, GroupStrings> = {
  tr: {
    natural: "Doğanın Harikaları",
    capitals: "Dünya Başkentleri & İkonik Mekanlar",
    studios: "Premium E-Ticaret Stüdyoları",
    masculine: "Erkek / Loft & Endüstriyel",
    pets: "Evcil Hayvanlar",
    baby: "Bebek & Çocuk",
    special: "Özel Koleksiyon",
  },
  en: {
    natural: "Natural Wonders",
    capitals: "World Capitals & Iconic Locations",
    studios: "Premium E-Commerce Studios",
    masculine: "Masculine / Loft & Industrial",
    pets: "Pets",
    baby: "Baby & Kids",
    special: "Special Collection",
  },
  es: {
    natural: "Maravillas Naturales",
    capitals: "Capitales del Mundo",
    studios: "Estudios E-Commerce Premium",
    masculine: "Masculino / Loft & Industrial",
    pets: "Mascotas",
    baby: "Bebé y Niños",
    special: "Colección Especial",
  },
  de: {
    natural: "Naturwunder",
    capitals: "Weltstädte & ikonische Orte",
    studios: "Premium E-Commerce-Studios",
    masculine: "Masculin / Loft & Industrial",
    pets: "Haustiere",
    baby: "Baby & Kinder",
    special: "Spezielle Kollektion",
  },
  ru: {
    natural: "Чудеса природы",
    capitals: "Столицы мира",
    studios: "Премиум студии",
    masculine: "Лофт и индустриальный",
    pets: "Питомцы",
    baby: "Малыши и дети",
    special: "Особая коллекция",
  },
  ar: {
    natural: "عجائب الطبيعة",
    capitals: "عواصم العالم",
    studios: "استوديوهات مميزة",
    masculine: "لوفت وصناعي",
    pets: "الحيوانات الأليفة",
    baby: "الأطفال والرضع",
    special: "مجموعة خاصة",
  },
};

type HeroStrings = { badge: string; title1: string; title2: string; subtitle: string; browse: string; empty: string; loading: string; photoBy: string; on: string; useThis: string; step1: string; step2: string; step3: string };
const HERO: Record<StudioLang, HeroStrings> = {
  tr: { badge: "✨ AI STÜDYO ARKAPLANLARI", title1: "Ürününü", title2: "ikonik mekanlara", subtitle: "Kategoriye tıkla, 20-30 yüksek kalite arka plan arasından seç. Gezmek ücretsiz — uygulamak/indirmek için üyelik gerekir.", browse: "Galeriyi Gez", empty: "Bu kategori için henüz görsel yok.", loading: "Yükleniyor…", photoBy: "Fotoğraf:", on: "Unsplash", useThis: "Bu arka planı kullan", step1: "Ürününü yükle", step2: "Arka plan seç", step3: "İndir" },
  en: { badge: "✨ AI STUDIO BACKGROUNDS", title1: "Teleport your product to", title2: "iconic locations", subtitle: "Tap any category to browse 20-30 premium backdrops. Browsing is free — sign up to apply or download.", browse: "Browse Gallery", empty: "No images yet for this category.", loading: "Loading…", photoBy: "Photo by", on: "Unsplash", useThis: "Use this background", step1: "Upload your product", step2: "Pick a background", step3: "Download" },
  es: { badge: "✨ FONDOS DE ESTUDIO IA", title1: "Lleva tu producto a", title2: "lugares icónicos", subtitle: "Explora 20-30 fondos premium por categoría. Gratis para navegar — regístrate para aplicar o descargar.", browse: "Explorar galería", empty: "Aún no hay imágenes para esta categoría.", loading: "Cargando…", photoBy: "Foto de", on: "Unsplash", useThis: "Usar este fondo", step1: "Sube tu producto", step2: "Elige un fondo", step3: "Descarga" },
  de: { badge: "✨ KI-STUDIO-HINTERGRÜNDE", title1: "Beam dein Produkt an", title2: "ikonische Orte", subtitle: "Pro Kategorie 20-30 Premium-Hintergründe. Stöbern ist gratis — anwenden/herunterladen erfordert Anmeldung.", browse: "Galerie öffnen", empty: "Noch keine Bilder in dieser Kategorie.", loading: "Lädt…", photoBy: "Foto von", on: "Unsplash", useThis: "Diesen Hintergrund nutzen", step1: "Produkt hochladen", step2: "Hintergrund wählen", step3: "Herunterladen" },
  ru: { badge: "✨ AI СТУДИЙНЫЕ ФОНЫ", title1: "Перенеси продукт в", title2: "знаковые места", subtitle: "20-30 премиум-фонов в каждой категории. Просмотр бесплатный — для применения/скачивания нужна регистрация.", browse: "Открыть галерею", empty: "В этой категории пока нет изображений.", loading: "Загрузка…", photoBy: "Фото:", on: "Unsplash", useThis: "Использовать этот фон", step1: "Загрузите товар", step2: "Выберите фон", step3: "Скачайте" },
  ar: { badge: "✨ خلفيات الاستوديو", title1: "انقل منتجك إلى", title2: "مواقع شهيرة", subtitle: "20-30 خلفية مميزة لكل فئة. التصفح مجاني — التسجيل مطلوب للتطبيق/التنزيل.", browse: "تصفح المعرض", empty: "لا توجد صور في هذه الفئة بعد.", loading: "جارٍ التحميل…", photoBy: "صورة من", on: "Unsplash", useThis: "استخدم هذه الخلفية", step1: "ارفع منتجك", step2: "اختر خلفية", step3: "نزّل" },
};

interface Props {
  isPremium?: boolean;
  activeId?: string | null;
  hasOriginal?: boolean;
  onSelect: (bg: StudioBg) => void;
  onLockedClick: () => void;
  onNeedUpload?: () => void;
  lang?: StudioLang;
}

export function AIStudioBackgrounds({ activeId, onSelect, hasOriginal = false, onNeedUpload, lang = "tr" }: Props) {
  const h = HERO[lang] ?? HERO.tr;
  const groupTitles = GROUP_TITLES[lang] ?? GROUP_TITLES.tr;
  const fetchGallery = useServerFn(listGallery);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, GalleryItem[]>>({});
  const [openCategory, setOpenCategory] = useState<GalleryCategory | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGallery()
      .then((res) => {
        if (cancelled) return;
        setCategories(res.categories);
        setItemsByCategory(res.itemsByCategory);
      })
      .catch((e) => console.error("[gallery] load failed", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchGallery]);

  // Group categories
  const grouped = useMemo(() => {
    const map = new Map<string, GalleryCategory[]>();
    for (const c of categories) {
      const arr = map.get(c.group_id) ?? [];
      arr.push(c);
      map.set(c.group_id, arr);
    }
    return Array.from(map.entries());
  }, [categories]);

  return (
    <section className="max-w-6xl mx-auto mt-12 sm:mt-16">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-3">
          {h.badge}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {h.title1}{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
            {h.title2}
          </span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">{h.subtitle}</p>
      </div>

      {/* 3-step mini stepper */}
      <ol className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-2 sm:gap-3 px-2 text-xs sm:text-sm">
        {[
          { n: 1, label: h.step1, done: hasOriginal },
          { n: 2, label: h.step2, done: false },
          { n: 3, label: h.step3, done: false },
        ].map((s, i) => (
          <li key={s.n} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1 font-semibold transition-colors ${
                s.done
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-card text-foreground/80"
              }`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  s.done ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                }`}
              >
                {s.done ? "✓" : s.n}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </span>
            {i < 2 && <span className="h-px w-4 sm:w-8 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> {h.loading}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([groupId, cats]) => (
            <div key={groupId}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-base sm:text-lg font-semibold">
                  {groupTitles[groupId] ?? groupId}
                </h3>
                <span className="h-px flex-1 bg-border ml-2" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {cats.map((cat) => {
                  const items = itemsByCategory[cat.id] ?? [];
                  const preview = items[0];
                  const count = items.length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        // Always allow browsing. If no original yet, the parent
                        // will scroll the user to the dropzone and show a
                        // "Selected Background" preview thumbnail until they upload.
                        setOpenCategory(cat);
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary/60 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-muted"
                      aria-label={`${cat.label} — ${count} ${h.browse}`}
                    >
                      {preview ? (
                        <img
                          src={preview.thumb_url ?? preview.image_url}
                          alt={cat.label}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">
                          {cat.emoji}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/0" />
                      {count > 0 && (
                        <div className="absolute top-1.5 right-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/20">
                          {count}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                        <div className="text-base leading-none mb-1">{cat.emoji}</div>
                        <div className="text-[11px] sm:text-xs font-semibold text-white leading-tight drop-shadow">
                          {cat.label}
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/0 group-hover:bg-primary/25 transition-colors">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-wider text-white bg-primary px-2.5 py-1 rounded-full shadow-lg text-center max-w-[90%]">
                          {hasOriginal ? h.browse : h.useThis}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {openCategory && (
        <GalleryModal
          category={openCategory}
          items={itemsByCategory[openCategory.id] ?? []}
          activeId={activeId ?? null}
          hero={h}
          onClose={() => setOpenCategory(null)}
          onPick={(item) => {
            onSelect({
              id: `${openCategory.id}:${item.id}`,
              emoji: openCategory.emoji,
              label: openCategory.label,
              url: item.image_url,
            });
            setOpenCategory(null);
          }}
        />
      )}
    </section>
  );
}

function GalleryModal({
  category,
  items,
  activeId,
  hero,
  onClose,
  onPick,
}: {
  category: GalleryCategory;
  items: GalleryItem[];
  activeId: string | null;
  hero: HeroStrings;
  onClose: () => void;
  onPick: (item: GalleryItem) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.emoji}</span>
            <div>
              <h3 className="text-lg font-bold leading-tight">{category.label}</h3>
              <p className="text-xs text-muted-foreground">{items.length} {hero.browse.toLowerCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{hero.empty}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((it) => {
                const isActive = activeId === `${category.id}:${it.id}`;
                return (
                  <div key={it.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => onPick(it)}
                      className={`group relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-all hover:shadow-lg ${isActive ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/60"}`}
                    >
                      <img
                        src={it.thumb_url ?? it.image_url}
                        alt={category.label}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                    {it.photographer_name && it.photographer_url && (
                      <a
                        href={it.photographer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] text-muted-foreground hover:text-foreground truncate px-0.5"
                      >
                        {hero.photoBy} {it.photographer_name} / {hero.on}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
