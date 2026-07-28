import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { SessionPill } from "@/components/SessionPill";
import { LanguageSelector } from "@/components/LanguageSelector";

import { TopNav } from "@/components/TopNav";
import { useActiveMarketplace } from "@/components/MarketplaceFilterBar";
import { marketplaceById, MARKETPLACES, setMarketplace } from "@/lib/marketplaces";
import { listGallery, type GalleryCategory, type GalleryItem } from "@/lib/gallery.functions";
import { upscaleImage } from "@/lib/upscale.functions";
import { virtualTryOn } from "@/lib/try-on.functions";
import { runAIPhotoshoot, PHOTOSHOOT_COST_PER_IMAGE } from "@/lib/ai-photoshoot.functions";
import {
  listUserTemplates,
  upsertUserTemplate,
  deleteUserTemplate,
} from "@/lib/user-templates.functions";
import { VirtualTryOnModal, type TryOnRequest } from "@/components/VirtualTryOnModal";
import { GhostMannequinModal, GHOST_PRESETS, type GhostPreset } from "@/components/GhostMannequinModal";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";
import {
  SNAP_TEMPLATES,
  TEMPLATE_CATEGORIES,
  FASHION_MODEL_TINT_PARTS,
  fitInsideSlot,
  type SnapTemplate,
  type TemplateCategory,
  type TintPartId,
  type TintPartRegion,
} from "@/lib/snap-templates";
import { TEMPLATE_THUMBS } from "@/lib/template-thumbs";

import {
  Upload,
  Sparkles,
  Wand2,
  Eraser,
  Type as TypeIcon,
  Square,
  Circle,
  Minus,
  MoveRight,
  Star,
  BadgeCheck,
  Image as ImageIcon,
  Layers as LayersIcon,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  MousePointer2,
  Download,
  Undo2,
  Redo2,
  Loader2,
  Info,
  Shirt,
  Footprints,
  ShoppingBag,
  HardHat,
  CheckCircle2,
  FolderOpen,
  PanelLeftClose,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  ChevronLeft,
  Camera,
  Brush,
  SlidersHorizontal,
  Crop,
  Droplets,
  Users,
  Sun,
  ArrowUpRight,
  Lock,
  X,
} from "lucide-react";
import {
  UpscalePanel,
  EraseBrushPanel,
  AIEditPanel,
  ShadowsPanel,
  LightFixPanel,
  ResizeExpandPanel,
  BlurBackgroundPanel,
  TextPresetsPanel,
  type BadgePresetSpec,
  type TextPresetSpec,
  PanelIcon,
  PANEL_TITLES,
} from "@/components/studio-panels";
import watchShowcase from "@/assets/showcase/watch.jpg.asset.json";
import perfumeShowcase from "@/assets/showcase/perfume.jpg.asset.json";
import sneakerShowcase from "@/assets/showcase/sneaker.jpg.asset.json";
import handbagShowcase from "@/assets/showcase/handbag.jpg.asset.json";
import cosmeticShowcase from "@/assets/showcase/cosmetic.jpg.asset.json";
import sunglassesShowcase from "@/assets/showcase/sunglasses.jpg.asset.json";

const QUICK_ASSETS: Array<{ id: string; label: string; url: string }> = [
  { id: "qa-watch", label: "Watch", url: watchShowcase.url },
  { id: "qa-perfume", label: "Perfume", url: perfumeShowcase.url },
  { id: "qa-sneaker", label: "Sneaker", url: sneakerShowcase.url },
  { id: "qa-handbag", label: "Handbag", url: handbagShowcase.url },
  { id: "qa-cosmetic", label: "Cosmetic", url: cosmeticShowcase.url },
  { id: "qa-sunglasses", label: "Sunglasses", url: sunglassesShowcase.url },
];

type StudioTool =
  | "bg-remove"
  | "ai-enhance"
  | "upscale"
  | "virtual-tryon"
  | "ai-photoshoot"
  | "ai-background"
  | "erase-brush"
  | "ai-edit"
  | "shadows"
  | "light-fix"
  | "resize-expand"
  | "blur-bg"
  | "add-text"
  | "select";
type StudioPanel = "samples" | "brand" | "pricing" | "templates";
type IndustryKey = "fashion" | "marketplace" | "beauty" | "home" | "food" | "tech";
const INDUSTRY_KEYS: IndustryKey[] = ["fashion", "marketplace", "beauty", "home", "food", "tech"];

/** Predicates that pick which gallery categories belong to each Industries menu entry. */
const INDUSTRY_MATCHERS: Record<IndustryKey, (c: { label: string; group_id: string }) => boolean> = {
  fashion: (c) =>
    /fashion|footwear|athletic|retro|dating|travel.*wedding|magazine|women|autumn|spring/i.test(c.label),
  marketplace: (c) =>
    c.group_id === "marketplaces" ||
    /marketplace|multi-angle|multi-product|flatlays|eshop|promo|black friday/i.test(c.label),
  beauty: (c) => /cosmetic|perfume|skincare|beauty/i.test(c.label),
  home: (c) => /home decor|marble|wood|industrial|nature/i.test(c.label),
  food: (c) => /food|bakery|beverage|menu/i.test(c.label),
  tech: (c) => /industrial|logo mockups|corporate|avatars|classic photo|basic core/i.test(c.label),
};

/** Strict per-industry template allowlist — 4-6 hand-picked scenes per sector.
 *  Prevents cross-category bleed (e.g. desert/dune showing up under Home). */
const INDUSTRY_TEMPLATE_IDS: Record<IndustryKey, ReadonlyArray<string>> = {
  fashion: [
    "pro-full-adult_female-light",
    "pro-full-adult_male-light",
    "fashion-hanger",
    "fashion-flatlay",
    "pop-airy-arch",
    "walls-plaster-white",
  ],
  marketplace: [
    "min-white",
    "min-cream",
    "min-charcoal",
    "pop-white-podium",
    "flatlay-white-linen",
    "flatlay-marble-top",
  ],
  beauty: [
    "cosmetics-floral-podium",
    "cosmetics-marble-bouquet",
    "cosmetics-marble",
    "cosmetics-stand",
    "spa-white-sand",
    "spa-eucalyptus",
  ],
  home: [
    "home-armchair",
    "home-sofa-set",
    "home-dining-table",
    "home-shelf-unit",
    "walls-plaster-white",
    "walls-sage",
  ],
  food: [
    "food-plate",
    "food-teacup",
    "food-serving-tray",
    "food-marble-serving",
    "kitchen-butcher",
    "kitchen-bamboo",
  ],
  tech: [
    "office-marble-desk",
    "office-oak-desk",
    "min-charcoal",
    "min-white",
    "city-glass-tower",
    "city-loft-window",
  ],
};


function isIndustry(v: unknown): v is IndustryKey {
  return typeof v === "string" && (INDUSTRY_KEYS as string[]).includes(v);
}

export const Route = createFileRoute("/studio")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tool?: StudioTool; panel?: StudioPanel; industry?: IndustryKey; track?: "business" | "personal" } => {
    const tool = search.tool;
    const panel = search.panel;
    const industry = search.industry;
    const track = search.track;
    const VALID_TOOLS: StudioTool[] = [
      "bg-remove","ai-enhance","upscale","virtual-tryon","ai-photoshoot",
      "ai-background","erase-brush","ai-edit","shadows","light-fix",
      "resize-expand","blur-bg","add-text",
    ];
    return {
      tool: typeof tool === "string" && (VALID_TOOLS as string[]).includes(tool) ? (tool as StudioTool) : undefined,
      panel: panel === "samples" || panel === "brand" || panel === "pricing" || panel === "templates" ? panel : undefined,
      industry: isIndustry(industry) ? industry : undefined,
      track: track === "business" || track === "personal" ? track : undefined,
    };

  },
  head: () => ({
    meta: [
      { title: "Design Studio — BGRemovify" },
      { name: "description", content: "Fast product scene studio for e-commerce visuals, previews, backgrounds, and exports." },
      { property: "og:title", content: "BGRemovify Studio" },
      { property: "og:description", content: "Create product previews with ready-made scenes, color controls, and final export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});

/* ---------- Localized strings (studio chrome) ---------- */
import type { AppLang } from "@/lib/language";
import { usePreferredLanguage } from "@/lib/language";

type StudioStringKey =
  | "uploadImage" | "export" | "guestMode" | "aiEngines" | "tools"
  | "tabUploads" | "tabSamples" | "tabTemplates"
  | "select" | "text" | "shape" | "media"
  | "smartSel" | "retouch" | "tryOn"
  | "layers" | "properties" | "noLayers"
  | "dropHere" | "dropSub" | "noUploads"
  | "loadingGallery" | "showAll" | "showLess"
  | "format" | "industryFilter" | "clearFilter" | "categoryChangeConfirm"
  | "sceneReadyBanner" | "sceneReadyToast" | "snappedToast"
  | "pickSceneFirst" | "previewReady" | "cutoutDone" | "preparingPreview"
  | "canvasStep" | "createBtn" | "createTitle" | "sceneFirstToast"
  | "mobUpload" | "mobLibrary" | "mobLayers" | "mobEdit" | "clickToUpload"
  | "removeProduct" | "replaceProduct" | "removeTemplate" | "removeTemplateTitle"
  | "bgTitle" | "bgSubtitle" | "bgMode" | "bgModeGeneral" | "bgModeGeneralDesc"
  | "bgModePrompted" | "bgModePromptedDesc" | "bgModeInteractive" | "bgModeInteractiveDesc"
  | "bgBackground" | "bgTransparent" | "bgColor" | "bgNoColor" | "bgAdvanced"
  | "bgClipping" | "bgClippingTip" | "bgCar" | "bgCarTip"
  | "bgPadding" | "bgPaddingEnabled" | "bgPaddingDisabled"
  | "bgApply" | "bgSelectFirst"
  | "railEnhance" | "railBgRemove" | "railBackground" | "railPhotoshoot" | "railTryOn"
  | "tabClaid" | "tabMine" | "myEmpty" | "myChoose" | "catAll"
  | "tplTabClaid" | "tplTabMine" | "tplChooseFile" | "tplCatAll"
  | "tplCat_humans" | "tplCat_bust" | "tplCat_popular" | "tplCat_nature" | "tplCat_flatlays"
  | "tplCat_minimal" | "tplCat_platforms" | "tplCat_stones" | "tplCat_kitchen"
  | "tplCat_spa" | "tplCat_fabric" | "tplCat_walls" | "tplCat_city"
  | "tplCat_office" | "tplCat_kids"
  | "psTitle" | "psSubtitle" | "psAspect" | "psMode"
  | "psModePrecise" | "psModePreciseDesc" | "psModeCreative" | "psModeCreativeDesc"
  | "psModeInspiration" | "psModeInspirationDesc"
  | "psPrompt" | "psPromptPlaceholder" | "psCount" | "psApply" | "psCredits" | "psComingSoon";


const STUDIO_STR: Record<StudioStringKey, Record<AppLang, string>> = {
  uploadImage: { tr:"Görsel yükle", en:"Upload image", es:"Subir imagen", de:"Bild hochladen", ru:"Загрузить изображение", ar:"رفع صورة" },
  export: { tr:"Dışa aktar", en:"Export", es:"Exportar", de:"Export", ru:"Экспорт", ar:"تصدير" },
  guestMode: { tr:"Misafir mod · çalışman cihazda saklanıyor", en:"Guest mode · work saved locally", es:"Modo invitado · guardado local", de:"Gastmodus · lokal gespeichert", ru:"Гостевой режим · сохранено локально", ar:"وضع الضيف · محفوظ محلياً" },
  aiEngines: { tr:"Akıllı araçlar", en:"Smart tools", es:"Herramientas", de:"Smart-Tools", ru:"Умные инструменты", ar:"أدوات ذكية" },
  tools: { tr:"Araçlar", en:"Tools", es:"Herramientas", de:"Werkzeuge", ru:"Инструменты", ar:"أدوات" },
  tabUploads: { tr:"Yüklenenler", en:"Uploads", es:"Subidos", de:"Uploads", ru:"Загрузки", ar:"الرفعات" },
  tabSamples: { tr:"Örnekler", en:"Samples", es:"Muestras", de:"Beispiele", ru:"Примеры", ar:"عينات" },
  tabTemplates: { tr:"Şablonlar", en:"Templates", es:"Plantillas", de:"Vorlagen", ru:"Шаблоны", ar:"قوالب" },
  select: { tr:"Seç", en:"Select", es:"Seleccionar", de:"Auswahl", ru:"Выбор", ar:"تحديد" },
  text: { tr:"Metin", en:"Text", es:"Texto", de:"Text", ru:"Текст", ar:"نص" },
  shape: { tr:"Şekil", en:"Shape", es:"Forma", de:"Form", ru:"Фигура", ar:"شكل" },
  media: { tr:"Medya", en:"Media", es:"Medios", de:"Medien", ru:"Медиа", ar:"وسائط" },
  smartSel: { tr:"Kes", en:"Cutout", es:"Recorte", de:"Freistellen", ru:"Вырезать", ar:"قص" },
  retouch: { tr:"HD", en:"HD", es:"HD", de:"HD", ru:"HD", ar:"HD" },
  tryOn: { tr:"Model", en:"Model", es:"Modelo", de:"Model", ru:"Модель", ar:"نموذج" },
  layers: { tr:"Katmanlar", en:"Layers", es:"Capas", de:"Ebenen", ru:"Слои", ar:"طبقات" },
  properties: { tr:"Özellikler", en:"Properties", es:"Propiedades", de:"Eigenschaften", ru:"Свойства", ar:"خصائص" },
  noLayers: { tr:"Henüz katman yok. Görsel yükle veya metin ekle.", en:"No layers yet. Upload an image or add text to begin.", es:"Sin capas. Sube una imagen o agrega texto.", de:"Noch keine Ebenen. Bild hochladen oder Text hinzufügen.", ru:"Пока нет слоёв. Загрузите изображение или добавьте текст.", ar:"لا توجد طبقات بعد. ارفع صورة أو أضف نصاً." },
  dropHere: { tr:'Buraya görsel bırak veya "Görsel yükle"ye tıkla', en:'Drop an image here or click "Upload image"', es:'Suelta una imagen o pulsa "Subir imagen"', de:'Bild hier ablegen oder auf "Bild hochladen" klicken', ru:'Перетащите изображение или нажмите «Загрузить»', ar:'أفلت صورة هنا أو انقر "رفع صورة"' },
  dropSub: { tr:"Kompozisyonun bu tuvalde görünecek.", en:"Your composition will appear on this canvas.", es:"Tu composición aparecerá aquí.", de:"Deine Komposition erscheint auf dieser Leinwand.", ru:"Ваша композиция появится на холсте.", ar:"سيظهر تصميمك على هذه اللوحة." },
  noUploads: { tr:"Henüz yükleme yok. Aşağıdan Yükle'ye dokun.", en:"No uploads yet. Tap Upload below.", es:"Sin subidas. Toca Subir abajo.", de:"Noch keine Uploads. Unten auf Upload tippen.", ru:"Пока нет загрузок. Нажмите «Загрузить» ниже.", ar:"لا رفعات. اضغط رفع بالأسفل." },
  loadingGallery: { tr:"Galeri yükleniyor…", en:"Loading gallery…", es:"Cargando galería…", de:"Galerie wird geladen…", ru:"Загрузка галереи…", ar:"جارٍ تحميل المعرض…" },
  showAll: { tr:"Tüm kategorileri göster", en:"Show all categories", es:"Ver todas", de:"Alle anzeigen", ru:"Показать все", ar:"عرض الكل" },
  showLess: { tr:"Daha az göster", en:"Show less", es:"Ver menos", de:"Weniger anzeigen", ru:"Скрыть", ar:"عرض أقل" },
  format: { tr:"Format", en:"Format", es:"Formato", de:"Format", ru:"Формат", ar:"تنسيق" },
  industryFilter: { tr:"Sektör filtresi", en:"Industry filter", es:"Filtro de sector", de:"Branchenfilter", ru:"Фильтр отрасли", ar:"تصفية القطاع" },
  clearFilter: { tr:"Filtreyi temizle", en:"Clear filter", es:"Quitar filtro", de:"Filter entfernen", ru:"Сбросить фильтр", ar:"مسح التصفية" },
  categoryChangeConfirm: { tr:"Kategoriyi değiştirirsen mevcut şablon ve ürün sıfırlanır. Devam edilsin mi?", en:"Changing the category will reset the current template and product. Continue?", es:"Cambiar la categoría restablecerá la plantilla y el producto actuales. ¿Continuar?", de:"Beim Kategoriewechsel werden Vorlage und Produkt zurückgesetzt. Fortfahren?", ru:"Смена категории сбросит текущий шаблон и товар. Продолжить?", ar:"سيؤدي تغيير الفئة إلى إعادة تعيين القالب والمنتج الحاليين. هل تريد المتابعة؟" },
  sceneReadyBanner: { tr:"Sahne hazır · şimdi ürününü yükle → otomatik yerleşir", en:"Scene ready · upload your product → it snaps in automatically", es:"Escena lista · sube tu producto → encajará automáticamente", de:"Szene bereit · lade dein Produkt hoch → es rastet automatisch ein", ru:"Сцена готова · загрузите товар → он встанет автоматически", ar:"المشهد جاهز · ارفع منتجك → سيتم تثبيته تلقائياً" },
  sceneReadyToast: { tr:"Sahne hazır — şimdi ürününü yükle", en:"Scene ready — now upload your product", es:"Escena lista — ahora sube tu producto", de:"Szene bereit — jetzt Produkt hochladen", ru:"Сцена готова — загрузите товар", ar:"المشهد جاهز — ارفع منتجك الآن" },
  snappedToast: { tr:"Sahneye oturdu ✓", en:"Snapped into scene ✓", es:"Encajado ✓", de:"Eingerastet ✓", ru:"Встало в сцену ✓", ar:"تم التثبيت ✓" },
  pickSceneFirst: { tr:"Önce bir sahne seç — sonra ürününü yükle", en:"Pick a scene first — then upload your product", es:"Elige una escena primero — luego sube tu producto", de:"Zuerst eine Szene wählen — dann Produkt hochladen", ru:"Сначала выберите сцену — затем загрузите товар", ar:"اختر مشهداً أولاً — ثم ارفع منتجك" },
  previewReady: { tr:"Ön izleme hazır ✓", en:"Preview ready ✓", es:"Vista previa lista ✓", de:"Vorschau bereit ✓", ru:"Предпросмотр готов ✓", ar:"المعاينة جاهزة ✓" },
  cutoutDone: { tr:"Arka plan temizlendi ✓", en:"Background removed ✓", es:"Fondo eliminado ✓", de:"Hintergrund entfernt ✓", ru:"Фон удалён ✓", ar:"تمت إزالة الخلفية ✓" },
  preparingPreview: { tr:"Ön izleme hazırlanıyor…", en:"Preparing preview…", es:"Preparando vista previa…", de:"Vorschau wird vorbereitet…", ru:"Готовим предпросмотр…", ar:"جارٍ إعداد المعاينة…" },
  canvasStep: { tr:"1. Bir sahne / şablon seç · 2. Ürününü yükle · 3. Oluştur", en:"1. Pick a scene / template · 2. Upload your product · 3. Create", es:"1. Elige una escena · 2. Sube tu producto · 3. Crear", de:"1. Szene wählen · 2. Produkt hochladen · 3. Erstellen", ru:"1. Выберите сцену · 2. Загрузите товар · 3. Создать", ar:"1. اختر مشهداً · 2. ارفع منتجك · 3. إنشاء" },
  createBtn: { tr:"Oluştur", en:"Create", es:"Crear", de:"Erstellen", ru:"Создать", ar:"إنشاء" },
  createTitle: { tr:"Kredi sadece Oluştur'da düşer", en:"Credit is only used on Create", es:"El crédito solo se usa al crear", de:"Kredit wird nur beim Erstellen abgezogen", ru:"Кредит списывается только при создании", ar:"يُخصم الرصيد فقط عند الإنشاء" },
  sceneFirstToast: { tr:"Önce bir sahne seç", en:"Pick a scene first", es:"Elige una escena primero", de:"Zuerst eine Szene wählen", ru:"Сначала выберите сцену", ar:"اختر مشهداً أولاً" },
  mobUpload: { tr:"Yükle", en:"Upload", es:"Subir", de:"Hochladen", ru:"Загрузить", ar:"رفع" },
  mobLibrary: { tr:"Kütüphane", en:"Library", es:"Librería", de:"Bibliothek", ru:"Библиотека", ar:"مكتبة" },
  mobLayers: { tr:"Katmanlar", en:"Layers", es:"Capas", de:"Ebenen", ru:"Слои", ar:"طبقات" },
  mobEdit: { tr:"Düzenle", en:"Edit", es:"Editar", de:"Bearbeiten", ru:"Правка", ar:"تحرير" },
  clickToUpload: { tr:"Ürününü yüklemek için dokun", en:"Tap to upload your product", es:"Toca para subir tu producto", de:"Zum Hochladen tippen", ru:"Нажмите, чтобы загрузить", ar:"انقر لرفع منتجك" },
  removeProduct: { tr:"Ürünü kaldır", en:"Remove product", es:"Quitar producto", de:"Produkt entfernen", ru:"Убрать товар", ar:"إزالة المنتج" },
  replaceProduct: { tr:"Ürünü değiştir", en:"Replace product", es:"Reemplazar producto", de:"Produkt ersetzen", ru:"Заменить товар", ar:"استبدال المنتج" },
  removeTemplate: { tr:"Şablonu sil", en:"Delete template", es:"Eliminar plantilla", de:"Vorlage löschen", ru:"Удалить шаблон", ar:"حذف القالب" },
  removeTemplateTitle: { tr:"Sahneyi kaldır — tuval tamamen boşalır", en:"Remove scene — canvas becomes fully blank", es:"Eliminar escena — el lienzo queda vacío", de:"Szene entfernen — Leinwand wird geleert", ru:"Убрать сцену — холст станет пустым", ar:"إزالة المشهد — سيصبح اللوحة فارغة" },
  bgTitle: { tr:"Arka planı kaldır", en:"Remove background", es:"Quitar fondo", de:"Hintergrund entfernen", ru:"Удалить фон", ar:"إزالة الخلفية" },
  bgSubtitle: { tr:"Bir ürün seç, parametreleri ayarla, Uygula'ya bas.", en:"Pick a product, tune parameters, hit Apply.", es:"Elige un producto, ajusta y pulsa Aplicar.", de:"Produkt wählen, Parameter setzen, Anwenden.", ru:"Выберите товар, настройте параметры, нажмите «Применить».", ar:"اختر منتجاً، اضبط الإعدادات، ثم اضغط تطبيق." },
  bgMode: { tr:"Mod", en:"Mode", es:"Modo", de:"Modus", ru:"Режим", ar:"الوضع" },
  bgModeGeneral: { tr:"Genel", en:"General", es:"General", de:"Allgemein", ru:"Общий", ar:"عام" },
  bgModeGeneralDesc: { tr:"Otomatik — çoğu ürün için", en:"Automatic — works for most products", es:"Automático — para la mayoría", de:"Automatisch — für die meisten Produkte", ru:"Автоматически — для большинства товаров", ar:"تلقائي — لمعظم المنتجات" },
  bgModePrompted: { tr:"Yönlendirmeli", en:"Prompted", es:"Con prompt", de:"Mit Prompt", ru:"По подсказке", ar:"موجّه" },
  bgModePromptedDesc: { tr:"Metinle yönlendir (yakında)", en:"Guide with text (soon)", es:"Guiar con texto (pronto)", de:"Mit Text steuern (bald)", ru:"Управление текстом (скоро)", ar:"توجيه بالنص (قريباً)" },
  bgModeInteractive: { tr:"Etkileşimli", en:"Interactive", es:"Interactivo", de:"Interaktiv", ru:"Интерактивно", ar:"تفاعلي" },
  bgModeInteractiveDesc: { tr:"Fırça ile düzelt (yakında)", en:"Refine with brush (soon)", es:"Refinar con pincel (pronto)", de:"Mit Pinsel verfeinern (bald)", ru:"Кисть для правок (скоро)", ar:"تحرير بالفرشاة (قريباً)" },
  bgBackground: { tr:"Arka plan", en:"Background", es:"Fondo", de:"Hintergrund", ru:"Фон", ar:"الخلفية" },
  bgTransparent: { tr:"Şeffaf", en:"Transparent", es:"Transparente", de:"Transparent", ru:"Прозрачный", ar:"شفاف" },
  bgColor: { tr:"Renk", en:"Color", es:"Color", de:"Farbe", ru:"Цвет", ar:"لون" },
  bgNoColor: { tr:"Renk yok", en:"No color", es:"Sin color", de:"Keine Farbe", ru:"Без цвета", ar:"بدون لون" },
  bgAdvanced: { tr:"Gelişmiş", en:"Advanced", es:"Avanzado", de:"Erweitert", ru:"Дополнительно", ar:"متقدم" },
  bgClipping: { tr:"Clipping", en:"Clipping", es:"Recorte fino", de:"Clipping", ru:"Клиппинг", ar:"قص حاد" },
  bgClippingTip: { tr:"Sert kenarları düzeltir — logolar ve etiketler için idealdir.", en:"Sharpens hard edges — ideal for logos and labels.", es:"Afila bordes — ideal para logos y etiquetas.", de:"Schärft harte Kanten — ideal für Logos und Etiketten.", ru:"Уточняет резкие края — идеально для логотипов.", ar:"يشحذ الحواف الحادة — مثالي للشعارات." },
  bgCar: { tr:"Araç", en:"Car", es:"Auto", de:"Auto", ru:"Авто", ar:"سيارة" },
  bgCarTip: { tr:"Araç fotoğrafları için özel arka plan temizliği (cam yansımaları korunur).", en:"Special background clean-up for cars (keeps glass reflections).", es:"Limpieza especial para autos (conserva reflejos).", de:"Spezielle Freistellung für Autos (Glasreflexe bleiben).", ru:"Специальная очистка для авто (сохраняет отражения).", ar:"إزالة خاصة لخلفية السيارات (تحافظ على انعكاسات الزجاج)." },
  bgPadding: { tr:"Boşluk", en:"Padding", es:"Relleno", de:"Abstand", ru:"Отступ", ar:"حشو" },
  bgPaddingEnabled: { tr:"Etkin", en:"Enabled", es:"Activo", de:"Aktiv", ru:"Включено", ar:"مفعّل" },
  bgPaddingDisabled: { tr:"Boşluk yok", en:"No paddings", es:"Sin relleno", de:"Kein Abstand", ru:"Без отступов", ar:"بدون حشو" },
  bgApply: { tr:"Uygula (1 kredi)", en:"Apply operation (1 credit)", es:"Aplicar (1 crédito)", de:"Anwenden (1 Kredit)", ru:"Применить (1 кредит)", ar:"تطبيق (رصيد واحد)" },
  bgSelectFirst: { tr:"Önce bir görsel seç veya yükle.", en:"Select or upload an image first.", es:"Selecciona o sube una imagen primero.", de:"Zuerst ein Bild wählen oder hochladen.", ru:"Сначала выберите или загрузите изображение.", ar:"اختر أو ارفع صورة أولاً." },
  railEnhance: { tr:"Kalite & büyütme", en:"Improve quality & Upscale", es:"Mejorar calidad", de:"Qualität & Upscale", ru:"Качество и апскейл", ar:"تحسين الجودة" },
  railBgRemove: { tr:"Arka planı kaldır", en:"Remove background", es:"Quitar fondo", de:"Hintergrund entfernen", ru:"Удалить фон", ar:"إزالة الخلفية" },
  railBackground: { tr:"AI Arka Plan", en:"AI Background", es:"Fondo IA", de:"KI-Hintergrund", ru:"AI фон", ar:"خلفية بالذكاء الاصطناعي" },
  railPhotoshoot: { tr:"AI Fotoğraf Çekimi", en:"AI Photoshoot", es:"Sesión IA", de:"KI-Fotoshoot", ru:"AI фотосессия", ar:"جلسة تصوير AI" },
  railTryOn: { tr:"AI Manken", en:"AI Fashion Models", es:"Modelos IA", de:"KI-Models", ru:"AI модели", ar:"عارضات AI" },
  tabClaid: { tr:"Hazır şablonlar", en:"Claid templates", es:"Plantillas Claid", de:"Claid-Vorlagen", ru:"Готовые шаблоны", ar:"قوالب جاهزة" },
  tabMine: { tr:"Şablonlarım", en:"My templates", es:"Mis plantillas", de:"Meine Vorlagen", ru:"Мои шаблоны", ar:"قوالبي" },
  myEmpty: { tr:"Henüz kendi şablonun yok. Bir arka plan görseli yükle.", en:"No custom templates yet. Upload a background image.", es:"Sin plantillas propias. Sube una imagen de fondo.", de:"Noch keine eigenen Vorlagen. Lade ein Hintergrundbild hoch.", ru:"Своих шаблонов пока нет. Загрузите фон.", ar:"لا توجد قوالب مخصصة بعد. ارفع صورة خلفية." },
  myChoose: { tr:"Dosya seç", en:"Choose file", es:"Elegir archivo", de:"Datei wählen", ru:"Выбрать файл", ar:"اختر ملفاً" },
  catAll: { tr:"Tümü", en:"All", es:"Todas", de:"Alle", ru:"Все", ar:"الكل" },
  psTitle: { tr:"AI Fotoğraf Çekimi", en:"AI Photoshoot", es:"Sesión IA", de:"KI-Fotoshoot", ru:"AI фотосессия", ar:"جلسة تصوير AI" },
  psSubtitle: { tr:"Ürününü yükle, promptla — dakikalar içinde stüdyo kalitesi.", en:"Upload your product, describe the scene — studio quality in minutes.", es:"Sube tu producto, describe la escena — calidad estudio en minutos.", de:"Produkt hochladen, Szene beschreiben — Studio-Qualität in Minuten.", ru:"Загрузите товар, опишите сцену — качество студии за минуты.", ar:"ارفع منتجك، اوصف المشهد — جودة استوديو خلال دقائق." },
  psAspect: { tr:"En/boy", en:"Aspect ratio", es:"Proporción", de:"Seitenverhältnis", ru:"Пропорции", ar:"النسبة" },
  psMode: { tr:"Üretim modu", en:"Generation mode", es:"Modo", de:"Modus", ru:"Режим генерации", ar:"وضع التوليد" },
  psModePrecise: { tr:"Hassas", en:"Precise", es:"Preciso", de:"Präzise", ru:"Точный", ar:"دقيق" },
  psModePreciseDesc: { tr:"Ürünü sadıkça korur", en:"Preserves the product tightly", es:"Conserva el producto", de:"Behält Produkt exakt", ru:"Точно сохраняет продукт", ar:"يحافظ على المنتج بدقة" },
  psModeCreative: { tr:"Yaratıcı", en:"Creative", es:"Creativo", de:"Kreativ", ru:"Креативный", ar:"إبداعي" },
  psModeCreativeDesc: { tr:"Sahneye özgürlük tanır", en:"Gives the scene freedom", es:"Más libertad", de:"Mehr Freiheit", ru:"Больше свободы", ar:"حرية أكبر للمشهد" },
  psModeInspiration: { tr:"İlham", en:"Inspiration", es:"Inspiración", de:"Inspiration", ru:"Вдохновение", ar:"إلهام" },
  psModeInspirationDesc: { tr:"Cesur, yeni fikirler", en:"Bold, new ideas", es:"Ideas atrevidas", de:"Mutige neue Ideen", ru:"Смелые идеи", ar:"أفكار جريئة" },
  psPrompt: { tr:"Prompt", en:"Prompt", es:"Prompt", de:"Prompt", ru:"Промпт", ar:"وصف" },
  psPromptPlaceholder: { tr:"Örn: mermer tezgahta, yumuşak sabah ışığı, minimal gölge", en:"e.g. on marble counter, soft morning light, minimal shadow", es:"ej. mostrador de mármol, luz suave", de:"z. B. Marmortheke, weiches Morgenlicht", ru:"напр. мраморная стойка, мягкий свет", ar:"مثال: طاولة رخام، إضاءة صباحية ناعمة" },
  psCount: { tr:"Adet", en:"Variations", es:"Variaciones", de:"Anzahl", ru:"Варианты", ar:"العدد" },
  psApply: { tr:"Uygula", en:"Apply operation", es:"Aplicar", de:"Anwenden", ru:"Применить", ar:"تطبيق" },
  psCredits: { tr:"kredi", en:"credits", es:"créditos", de:"Credits", ru:"кредитов", ar:"رصيد" },
  psComingSoon: { tr:"AI Fotoğraf Çekimi çok yakında — panel hazır, motor son testte.", en:"AI Photoshoot is coming very soon — panel is ready, engine in final QA.", es:"Sesión IA muy pronto — panel listo, motor en pruebas.", de:"KI-Fotoshoot bald — Panel bereit, Engine im Test.", ru:"AI фотосессия скоро — панель готова, движок на тестах.", ar:"جلسة التصوير قريباً — الواجهة جاهزة، المحرك في الاختبار." },
  tplTabClaid: { tr:"Bgremovify şablonları", en:"Claid templates", es:"Plantillas", de:"Vorlagen", ru:"Шаблоны", ar:"القوالب" },
  tplTabMine: { tr:"Şablonlarım", en:"My templates", es:"Mis plantillas", de:"Meine Vorlagen", ru:"Мои шаблоны", ar:"قوالبي" },
  tplChooseFile: { tr:"Dosya seç", en:"Choose file", es:"Elegir archivo", de:"Datei wählen", ru:"Выбрать файл", ar:"اختر ملف" },
  tplCatAll: { tr:"Tümü", en:"All", es:"Todos", de:"Alle", ru:"Все", ar:"الكل" },
  tplCat_humans: { tr:"İnsan", en:"Humans", es:"Humanos", de:"Menschen", ru:"Люди", ar:"بشر" },
  tplCat_bust: { tr:"Büst Çekim", en:"Bust Shots", es:"Bustos", de:"Büsten", ru:"Бюсты", ar:"لقطات نصفية" },
  tplCat_popular: { tr:"Popüler", en:"Popular", es:"Popular", de:"Beliebt", ru:"Популярное", ar:"شائع" },
  tplCat_nature: { tr:"Doğa", en:"Nature", es:"Naturaleza", de:"Natur", ru:"Природа", ar:"طبيعة" },
  tplCat_flatlays: { tr:"Üstten Çekim", en:"Flatlays", es:"Flatlays", de:"Flatlays", ru:"Flatlay", ar:"فلات لي" },
  tplCat_minimal: { tr:"Minimal", en:"Minimal", es:"Mínimo", de:"Minimal", ru:"Минимал", ar:"بسيط" },
  tplCat_platforms: { tr:"Platformlar", en:"Platforms", es:"Plataformas", de:"Podeste", ru:"Подиумы", ar:"منصات" },
  tplCat_stones: { tr:"Taş & Mermer", en:"Stones", es:"Piedras", de:"Steine", ru:"Камень", ar:"حجارة" },
  tplCat_kitchen: { tr:"Mutfak", en:"Kitchen", es:"Cocina", de:"Küche", ru:"Кухня", ar:"مطبخ" },
  tplCat_spa: { tr:"Spa", en:"Spa", es:"Spa", de:"Spa", ru:"Спа", ar:"سبا" },
  tplCat_fabric: { tr:"Kumaş", en:"Fabric", es:"Tela", de:"Stoff", ru:"Ткань", ar:"قماش" },
  tplCat_walls: { tr:"Duvarlar", en:"Walls", es:"Paredes", de:"Wände", ru:"Стены", ar:"جدران" },
  tplCat_city: { tr:"Şehir", en:"City", es:"Ciudad", de:"Stadt", ru:"Город", ar:"مدينة" },
  tplCat_office: { tr:"Ofis", en:"Office", es:"Oficina", de:"Büro", ru:"Офис", ar:"مكتب" },
  tplCat_kids: { tr:"Çocuk", en:"Kids", es:"Niños", de:"Kinder", ru:"Дети", ar:"أطفال" },
};


const INDUSTRY_LABELS: Record<IndustryKey, Record<AppLang, string>> = {
  fashion:     { tr:"Moda & Giyim",       en:"Fashion & Apparel",     es:"Moda y ropa",         de:"Mode & Bekleidung",   ru:"Мода и одежда",   ar:"الأزياء والملابس" },
  marketplace: { tr:"Pazaryeri & Retail", en:"Marketplace & Retail",  es:"Marketplace y retail",de:"Marktplatz & Retail", ru:"Маркетплейсы",     ar:"الأسواق والتجزئة" },
  beauty:      { tr:"Güzellik & Cilt",    en:"Beauty & Skincare",     es:"Belleza y skincare",  de:"Beauty & Skincare",   ru:"Красота и уход",  ar:"الجمال والعناية" },
  home:        { tr:"Ev & Mobilya",       en:"Home & Furniture",      es:"Hogar y muebles",     de:"Zuhause & Möbel",     ru:"Дом и мебель",    ar:"المنزل والأثاث" },
  food:        { tr:"Yemek & Teslimat",   en:"Food & Delivery",       es:"Comida y entrega",    de:"Essen & Lieferung",   ru:"Еда и доставка",  ar:"الطعام والتوصيل" },
  tech:        { tr:"Teknoloji & SaaS",   en:"Tech & SaaS",           es:"Tech y SaaS",         de:"Tech & SaaS",         ru:"Технологии и SaaS",ar:"التكنولوجيا" },
};

// Localized template display names — keyed by SnapTemplate.id.
// Falls back to the raw English `tpl.name` when a translation isn't present.
const TEMPLATE_NAMES: Record<string, Partial<Record<AppLang, string>>> = {
  "fashion-bust-soft":    { tr:"Büst Manken",       de:"Büsten-Mannequin",  es:"Maniquí busto",     ru:"Манекен-бюст",    ar:"مانيكان نصفي" },
  "fashion-full-model":   { tr:"Tam Boy Model",     de:"Ganzkörper-Model",  es:"Modelo completo",   ru:"Полный рост",      ar:"موديل كامل" },
  "fashion-flatlay":      { tr:"Keten Flatlay",     de:"Leinen-Flatlay",    es:"Flatlay lino",      ru:"Раскладка лён",    ar:"عرض مسطح كتان" },
  "fashion-hanger":       { tr:"Askı & Dolap",      de:"Kleiderbügel",      es:"Percha",            ru:"Вешалка",          ar:"شماعة الخزانة" },
  "jewelry-neck-bust":    { tr:"Kolye Büstü",       de:"Halsketten-Büste",  es:"Busto collar",      ru:"Бюст для колье",   ar:"بوست للعقد" },
  "jewelry-earlobe":      { tr:"Küpe Modeli",       de:"Ohrring-Model",     es:"Modelo aretes",     ru:"Модель для серёг", ar:"موديل الأقراط" },
  "jewelry-velvet":       { tr:"Kadife Tepsi",      de:"Samt-Tablett",      es:"Bandeja terciopelo",ru:"Бархатный поднос", ar:"صينية مخملية" },
  "jewelry-marble-shelf": { tr:"Mermer Raf",        de:"Marmorregal",       es:"Estante mármol",    ru:"Мраморная полка",  ar:"رف رخام" },
  "cosmetics-marble":     { tr:"Mermer Blok",       de:"Marmorblock",       es:"Bloque mármol",     ru:"Мраморный блок",   ar:"كتلة رخام" },
  "cosmetics-wood":       { tr:"Sıcak Ahşap",       de:"Warmer Holztisch",  es:"Mesa madera",       ru:"Тёплое дерево",    ar:"طاولة خشب" },
  "cosmetics-stand":      { tr:"Stüdyo Standı",     de:"Studio-Stand",      es:"Soporte estudio",   ru:"Студийная стойка", ar:"حامل استوديو" },
  "cosmetics-spotlight":  { tr:"Spot Işığı",        de:"Spotlight",         es:"Foco",              ru:"Прожектор",        ar:"إضاءة موجهة" },
  "watch-wrist":          { tr:"Bilek Silüeti",     de:"Handgelenk-Silhouette", es:"Silueta muñeca",ru:"Силуэт запястья", ar:"صورة معصم" },
  "watch-display":        { tr:"Vitrin Kutusu",     de:"Vitrine",           es:"Vitrina",           ru:"Витрина",          ar:"صندوق العرض" },
  "watch-dark-luxe":      { tr:"Karanlık Lüks",     de:"Dark Luxe",         es:"Lujo oscuro",       ru:"Тёмный люкс",      ar:"فخامة داكنة" },
  "acc-podium-duo":                { tr:"İkiz Podyum",       de:"Doppel-Podest",     es:"Podios gemelos",    ru:"Двойные подиумы",  ar:"منصتان" },
  "acc-glass-shelf":                { tr:"Cam Raf",           de:"Glasregal",         es:"Estante cristal",   ru:"Стеклянная полка", ar:"رف زجاجي" },
  "acc-sand-dune":                  { tr:"Kum Tepesi",        de:"Sanddüne",          es:"Duna",              ru:"Дюна",             ar:"كثيب رملي" },
  "acc-stone-plinth":             { tr:"Taş Kaide",         de:"Steinsockel",       es:"Pedestal piedra",   ru:"Каменный постамент",ar:"قاعدة حجرية" },
  "life-sunset":          { tr:"Gün Batımı Stüdyo", de:"Sonnenuntergang",   es:"Estudio atardecer", ru:"Закатная студия",  ar:"استوديو الغروب" },
  "life-cafe":            { tr:"Kafe Ahşap",        de:"Café-Holz",         es:"Mesa café",         ru:"Кафе-дерево",      ar:"خشب المقهى" },
  "life-tropical":        { tr:"Tropikal Yaprak",   de:"Tropenblatt",       es:"Hoja tropical",     ru:"Тропический лист", ar:"ورقة استوائية" },
  "life-linen-flat":              { tr:"Keten Flatlay",     de:"Leinen-Flatlay",    es:"Flatlay lino",      ru:"Льняная раскладка",ar:"عرض مسطح كتان" },
  "min-white":            { tr:"Saf Beyaz",         de:"Reines Weiß",       es:"Blanco puro",       ru:"Чистый белый",     ar:"أبيض نقي" },
  "min-cream":            { tr:"Sıcak Krem",        de:"Warmes Creme",      es:"Crema cálido",      ru:"Тёплый кремовый",  ar:"كريمي دافئ" },
  "min-charcoal":         { tr:"Antrasit",          de:"Anthrazit",         es:"Carbón",            ru:"Антрацит",         ar:"فحمي" },
  "min-pastel-pink":               { tr:"Pastel Pembe",      de:"Pastellrosa",       es:"Rosa pastel",       ru:"Пастельно-розовый",ar:"وردي باستيل" },
  "min-sky":              { tr:"Yumuşak Gök",       de:"Sanftes Himmelblau",es:"Cielo suave",       ru:"Мягкое небо",      ar:"سماوي ناعم" },
  "min-mint":             { tr:"Nane Ferahlığı",    de:"Frisches Minz",     es:"Menta fresca",      ru:"Мятная свежесть",  ar:"نعناع منعش" },
  "tech-neon-grid":               { tr:"Neon Izgara",       de:"Neon-Raster",       es:"Rejilla neón",      ru:"Неоновая сетка",   ar:"شبكة نيون" },
  "tech-holo":            { tr:"Holografik",        de:"Holo-Verlauf",      es:"Degradado holo",    ru:"Голо-градиент",    ar:"تدرج هولوغرافي" },
  "tech-carbon":          { tr:"Karbon Dokusu",     de:"Karbongewebe",      es:"Fibra carbono",     ru:"Карбон",           ar:"نسيج كربوني" },
  "tech-studio-cyan":             { tr:"Stüdyo Camgöbeği",  de:"Studio-Cyan",       es:"Cian estudio",      ru:"Студийный циан",   ar:"سماوي استوديو" },
};

function useStudioT() {
  const lang = usePreferredLanguage("en");
  return {
    lang,
    t: (k: StudioStringKey) => STUDIO_STR[k][lang] ?? STUDIO_STR[k].en,
    industryLabel: (k: IndustryKey) => INDUSTRY_LABELS[k][lang] ?? INDUSTRY_LABELS[k].en,
    templateName: (id: string, fallback: string) =>
      TEMPLATE_NAMES[id]?.[lang] ?? TEMPLATE_NAMES[id]?.en ?? fallback,
  };
}


/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type AssetId = string;

type MediaAsset = {
  id: AssetId;
  name: string;
  url: string;         // immutable original upload/source. Never replace with a cutout.
  processedUrl?: string; // transparent preview generated from `url`.
  createdAt: number;
};

type LayerBase = {
  id: string;
  name: string;
  groupId?: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
};

type ImageLayer = LayerBase & {
  kind: "image";
  assetId: AssetId;
  useProcessed: boolean;
  /** Horizontal skew in degrees (-45..45). Used for Try-On warp. */
  skewX?: number;
  /** Vertical skew in degrees (-45..45). Used for Try-On warp. */
  skewY?: number;
  /** Mirror flip along the X axis. */
  flipH?: boolean;
  /** Mirror flip along the Y axis. */
  flipV?: boolean;
  /** Perspective bend (-60..60). Simulates tilt/wrap on curved surfaces. */
  bend?: number;
  /** Flags layers created via the Virtual Try-On flow so the studio shows dedicated transform tools. */
  isTryOn?: boolean;
};

type TextLayer = LayerBase & {
  kind: "text";
  text: string;
  fontSize: number;
  color: string;
  weight: number;
  fontFamily?: string;
  /** -100..100 arc curvature. 0 = straight text, +=arc up, -=arc down. */
  curve?: number;
  /** When true, effective font size follows the layer height on resize. */
  autoScale?: boolean;
  letterSpacing?: number;
  italic?: boolean;
};

/** Curated web font stack rendered in the studio text panel. */
const STUDIO_FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Inter", value: "'Inter', system-ui, sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Playfair", value: "'Playfair Display', serif" },
  { label: "Roboto Slab", value: "'Roboto Slab', serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', 'Impact', sans-serif" },
  { label: "Anton", value: "'Anton', 'Impact', sans-serif" },
  { label: "Oswald", value: "'Oswald', sans-serif" },
  { label: "Lobster", value: "'Lobster', cursive" },
  { label: "Pacifico", value: "'Pacifico', cursive" },
  { label: "Dancing", value: "'Dancing Script', cursive" },
];
const DEFAULT_FONT_FAMILY = STUDIO_FONT_FAMILIES[0].value;

type ShapeKind = "rect" | "ellipse" | "line" | "arrow" | "star" | "badge";
type ShapeShadow = 0 | 1 | 2 | 3;
type ShapeLayer = LayerBase & {
  kind: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  shadow: ShapeShadow;
};

type SceneSlot = SnapTemplate["slot"];

type ActiveScene = {
  id: string;
  name: string;
  slot: SceneSlot;
};

const DEFAULT_SCENE_SLOT: SceneSlot = {
  xPct: 15,
  yPct: 14,
  wPct: 70,
  hPct: 70,
  rotation: 0,
};

const SHAPE_SHADOW_CSS: Record<ShapeShadow, string> = {
  0: "none",
  1: "0 2px 6px rgba(15,23,42,0.18)",
  2: "0 8px 22px rgba(15,23,42,0.28)",
  3: "0 18px 40px rgba(15,23,42,0.4)",
};
const SHAPE_SHADOW_FILTER: Record<ShapeShadow, string> = {
  0: "none",
  1: "drop-shadow(0 2px 4px rgba(15,23,42,0.22))",
  2: "drop-shadow(0 6px 12px rgba(15,23,42,0.3))",
  3: "drop-shadow(0 12px 24px rgba(15,23,42,0.4))",
};

const SHAPE_PRESETS: Array<{
  id: ShapeKind;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  defaults: () => Partial<ShapeLayer> & { w: number; h: number };
}> = [
  { id: "rect", name: "Rectangle", icon: Square, defaults: () => ({ w: 240, h: 160, fill: "#2563eb", stroke: "#0f172a", strokeWidth: 0, radius: 12, shadow: 1 }) },
  { id: "ellipse", name: "Ellipse", icon: Circle, defaults: () => ({ w: 200, h: 200, fill: "#10b981", stroke: "#0f172a", strokeWidth: 0, radius: 0, shadow: 1 }) },
  { id: "line", name: "Line", icon: Minus, defaults: () => ({ w: 260, h: 8, fill: "#0f172a", stroke: "#0f172a", strokeWidth: 4, radius: 0, shadow: 0 }) },
  { id: "arrow", name: "Arrow", icon: MoveRight, defaults: () => ({ w: 260, h: 40, fill: "#111827", stroke: "#111827", strokeWidth: 5, radius: 0, shadow: 0 }) },
  { id: "star", name: "Star", icon: Star, defaults: () => ({ w: 180, h: 180, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 0, radius: 0, shadow: 2 }) },
  { id: "badge", name: "Badge", icon: BadgeCheck, defaults: () => ({ w: 200, h: 200, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 3, radius: 0, shadow: 2 }) },
];

type TextPreset = {
  id: string;
  label: string;
  text: string;
  fontSize: number;
  color: string;
  weight: number;
  w: number;
  h: number;
};

const TEXT_PRESETS: TextPreset[] = [
  { id: "headline", label: "Headline", text: "Your bold headline", fontSize: 56, color: "#0f172a", weight: 800, w: 520, h: 96 },
  { id: "subhead", label: "Subhead", text: "A supporting subheadline", fontSize: 24, color: "#334155", weight: 500, w: 420, h: 56 },
  { id: "body", label: "Body", text: "Short descriptive copy goes here.", fontSize: 16, color: "#475569", weight: 400, w: 340, h: 60 },
  { id: "new", label: "New Arrival", text: "NEW ARRIVAL", fontSize: 22, color: "#ffffff", weight: 800, w: 240, h: 44 },
  { id: "best", label: "Best Seller", text: "BEST SELLER", fontSize: 22, color: "#111827", weight: 800, w: 240, h: 44 },
  { id: "limited", label: "Limited Edition", text: "LIMITED EDITION", fontSize: 20, color: "#7c2d12", weight: 700, w: 260, h: 40 },
  { id: "sale", label: "Sale", text: "-%50 İNDİRİM", fontSize: 40, color: "#dc2626", weight: 900, w: 320, h: 64 },
  { id: "special", label: "Özel İndirim", text: "ÖZEL İNDİRİM", fontSize: 26, color: "#be185d", weight: 800, w: 280, h: 48 },
  { id: "free", label: "Kargo Bedava", text: "KARGO BEDAVA", fontSize: 22, color: "#047857", weight: 800, w: 260, h: 44 },
  { id: "hot", label: "Hot Deal", text: "🔥 HOT DEAL", fontSize: 24, color: "#ea580c", weight: 800, w: 240, h: 44 },
  { id: "premium", label: "Premium", text: "PREMIUM", fontSize: 28, color: "#a16207", weight: 700, w: 220, h: 48 },
  { id: "new-tr", label: "Yeni", text: "YENİ SEZON", fontSize: 24, color: "#1e40af", weight: 800, w: 260, h: 44 },
];


type TintMode = "multiply" | "color" | "screen" | "hue" | "overlay";
type BgLayer = LayerBase & {
  kind: "bg";
  background: string;
  tint?: string;
  tintOpacity?: number;
  tintMode?: TintMode;
  blur?: number;
  templateId?: string;
  sceneId: string;
  slot: SceneSlot;
  sourceUrl?: string;
  /** Sub-part regions eligible for scoped tint (mannequin templates). */
  tintParts?: TintPartRegion[];
  /** Currently selected part id; when set, tint is clipped to that region. */
  activeTintPartId?: TintPartId;
};

type Layer = ImageLayer | TextLayer | ShapeLayer | BgLayer;

const GROUP_TRANSFORM_KEYS = ["x", "y", "w", "h", "rotation", "opacity", "visible", "locked"] as const;

function isGroupTransformPatch(patch: Partial<Layer>) {
  return GROUP_TRANSFORM_KEYS.some((key) => patch[key] !== undefined);
}

function layerGeometryIsClose(a: LayerBase, b: LayerBase) {
  return (
    Math.abs(a.x - b.x) <= 8 &&
    Math.abs(a.y - b.y) <= 8 &&
    Math.abs(a.w - b.w) <= 16 &&
    Math.abs(a.h - b.h) <= 16
  );
}

function normalizeBadgeGroups(input: Layer[]) {
  const next = input.map((layer) => ({ ...layer }) as Layer);
  for (const shape of next) {
    if (shape.kind !== "shape" || shape.groupId || !/\s+bg$/i.test(shape.name)) continue;
    const baseName = shape.name.replace(/\s+bg$/i, "");
    const label = next.find(
      (layer): layer is TextLayer =>
        layer.kind === "text" &&
        !layer.groupId &&
        layer.name === baseName &&
        layerGeometryIsClose(layer, shape),
    );
    if (!label) continue;
    const groupId = `badge-${stableCacheHash(`${baseName}-${shape.x}-${shape.y}-${shape.w}-${shape.h}`)}`;
    shape.groupId = groupId;
    label.groupId = groupId;
  }
  return next;
}

function removeTemplatePlaceholderFromBackground(background: string) {
  // Background silhouettes (wrist, model bust, ear, marble stand, etc.) are the
  // scene reference — they must stay locked behind any uploaded product so the
  // user can position the item over the silhouette. Historically we stripped
  // the SVG portion when a product landed on the canvas which made the whole
  // scene disappear. Keep the template bg intact; the product sits on top as
  // an independent, movable layer.
  return background;
}


const BACKGROUND_SWATCHES = [
  { label: "Clear", color: "" },
  { label: "White", color: "#ffffff" },
  { label: "Marble", color: "#e9e2d5" },
  { label: "Sky", color: "#5ab8cc" },
  { label: "Blush", color: "#f6b7c6" },
  { label: "Mint", color: "#98d7b5" },
  { label: "Sand", color: "#d8b47a" },
  { label: "Charcoal", color: "#1f2937" },
  { label: "Gold", color: "#e8c26a" },
  { label: "Lavender", color: "#a78bfa" },
  { label: "Rose", color: "#e05273" },
  { label: "Teal", color: "#2f9b8f" },
] as const;

const MIN_CUTOUT_ALPHA_COVERAGE = 0.015;
const MAX_CUTOUT_ALPHA_COVERAGE = 0.985;

async function validateCutoutDataUrl(dataUrl: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const sampleMax = 220;
        const scale = Math.min(1, sampleMax / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let visible = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 24) visible++;
        }
        const coverage = visible / Math.max(1, pixels.length / 4);
        resolve(coverage >= MIN_CUTOUT_ALPHA_COVERAGE && coverage <= MAX_CUTOUT_ALPHA_COVERAGE);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer);
  });
}

const CUTOUT_CACHE_VERSION = "v4";
const CUTOUT_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function stableCacheHash(input: string) {
  let hash = 2166136261;
  const step = Math.max(1, Math.floor(input.length / 14_000));
  for (let i = 0; i < input.length; i += step) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${input.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

function cutoutCacheKey(originalUrl: string) {
  return `bgr-cutout-${CUTOUT_CACHE_VERSION}-${stableCacheHash(originalUrl)}`;
}

function readCachedCutout(originalUrl?: string): string | null {
  if (!originalUrl || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cutoutCacheKey(originalUrl));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { processedUrl?: string; createdAt?: number };
    if (!parsed.processedUrl || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > CUTOUT_CACHE_TTL_MS) {
      localStorage.removeItem(cutoutCacheKey(originalUrl));
      return null;
    }
    return parsed.processedUrl;
  } catch {
    return null;
  }
}

function writeCachedCutout(originalUrl: string, processedUrl: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      cutoutCacheKey(originalUrl),
      JSON.stringify({ processedUrl, createdAt: Date.now() }),
    );
  } catch {
    // Browser storage can be small on mobile; in-memory React state is still authoritative.
  }
}

function clearCachedCutout(originalUrl?: string) {
  if (!originalUrl || typeof window === "undefined") return;
  try {
    localStorage.removeItem(cutoutCacheKey(originalUrl));
  } catch { /* ignore */ }
}

function paidExportStorageKey(sessionId: string) {
  return `bgr-paid-exports-${sessionId}`;
}

function readPaidExportKeys(sessionId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(paidExportStorageKey(sessionId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function rememberPaidExportKey(sessionId: string, key: string) {
  if (typeof window === "undefined") return;
  try {
    const next = [key, ...readPaidExportKeys(sessionId).filter((v) => v !== key)].slice(0, 80);
    localStorage.setItem(paidExportStorageKey(sessionId), JSON.stringify(next));
  } catch { /* ignore */ }
}

function normalizeSceneFirstLayers(input: Layer[]) {
  const groupedInput = normalizeBadgeGroups(input);
  const bgCandidates = groupedInput.filter((l): l is BgLayer => l.kind === "bg");
  const imageCandidates = groupedInput.filter((l): l is ImageLayer => l.kind === "image");
  const firstProduct = imageCandidates.at(-1) ?? null;
  const activeBgRaw = bgCandidates.at(-1) ?? null;
  const activeBg = activeBgRaw && firstProduct
    ? ({ ...activeBgRaw, background: removeTemplatePlaceholderFromBackground(activeBgRaw.background) } as BgLayer)
    : activeBgRaw;

  if (!activeBg) {
    const layers = groupedInput.filter((l) => l.kind !== "image" && l.kind !== "bg");
    return {
      layers,
      selectedSceneId: null,
      changed: layers.length !== groupedInput.length || layers.length !== input.length,
    };
  }

  const decorativeLayers = groupedInput.filter((l) => l.kind !== "image" && l.kind !== "bg");
  const productLayer = firstProduct
    ? [{ ...firstProduct, name: "Product" } as ImageLayer]
    : [];
  const layers = [...decorativeLayers, ...productLayer, activeBg];
  const changed =
    layers.length !== input.length ||
    groupedInput.filter((l) => l.kind === "image").length > 1 ||
    bgCandidates.length > 1 ||
    groupedInput.at(-1)?.id !== activeBg.id;

  return {
    layers,
    selectedSceneId: activeBg.sceneId ?? activeBg.templateId ?? activeBg.id,
    changed,
  };
}

function buildExportSignature(layers: Layer[], assets: MediaAsset[]) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const normalized = normalizeSceneFirstLayers(layers).layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const base = {
        kind: layer.kind,
        x: Math.round(layer.x),
        y: Math.round(layer.y),
        w: Math.round(layer.w),
        h: Math.round(layer.h),
        rotation: Math.round(layer.rotation * 100) / 100,
        opacity: Math.round(layer.opacity * 100) / 100,
      };
      if (layer.kind === "image") {
        const asset = assetById.get(layer.assetId);
        const source = layer.useProcessed && asset?.processedUrl ? asset.processedUrl : asset?.url;
        return { ...base, assetId: layer.assetId, sourceHash: stableCacheHash(source ?? "") };
      }
      if (layer.kind === "bg") {
        return {
          ...base,
          sceneId: layer.sceneId,
          templateId: layer.templateId,
          sourceUrl: layer.sourceUrl,
          background: layer.background,
          tint: layer.tint,
          tintOpacity: layer.tintOpacity,
          tintMode: layer.tintMode,
          blur: layer.blur,
        };
      }
      if (layer.kind === "text") {
        return { ...base, text: layer.text, fontSize: layer.fontSize, color: layer.color, weight: layer.weight, fontFamily: layer.fontFamily, curve: layer.curve, autoScale: layer.autoScale, letterSpacing: layer.letterSpacing, italic: layer.italic };
      }
      return {
        ...base,
        shape: layer.shape,
        fill: layer.fill,
        stroke: layer.stroke,
        strokeWidth: layer.strokeWidth,
        radius: layer.radius,
        shadow: layer.shadow,
      };
    });
  return `export-${CUTOUT_CACHE_VERSION}-${stableCacheHash(JSON.stringify(normalized))}`;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

// SAMPLE_ASSETS removed — Samples tab now streams the real 46-category /
// ~940-photo gallery via `listGallery` (see the useEffect in StudioPage).

type MobileSheet = "library" | "layers" | "properties" | null;

function StudioPage() {
  const { t, industryLabel, templateName } = useStudioT();
  const { sessionId, isGuest } = useSession();
  const { user } = useAuth();
  const { credits, consume } = useCredits(user?.id);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  useEffect(() => {
    if (search.track && typeof window !== "undefined") {
      try { localStorage.setItem("bgr-studio-track", search.track); } catch { /* ignore */ }
    }
  }, [search.track]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  // Undo/redo history (snapshots of layers, debounced 300ms).
  const historyRef = useRef<{ past: Layer[][]; future: Layer[][]; skip: boolean }>({
    past: [],
    future: [],
    skip: false,
  });
  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    if (historyRef.current.skip) {
      historyRef.current.skip = false;
      return;
    }
    const snap = layers;
    const timer = setTimeout(() => {
      const past = historyRef.current.past;
      const last = past[past.length - 1];
      try {
        if (last && JSON.stringify(last) === JSON.stringify(snap)) return;
      } catch { /* fall through */ }
      past.push(snap);
      if (past.length > 80) past.shift();
      historyRef.current.future = [];
      setHistoryTick((n) => n + 1);
    }, 250);
    return () => clearTimeout(timer);
  }, [layers]);
  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length < 2) return;
    const current = h.past.pop()!;
    h.future.push(current);
    const prev = h.past[h.past.length - 1];
    h.skip = true;
    layersRef.current = prev;
    setLayers(prev);
    setSelectedId(null);
    setHistoryTick((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    const h = historyRef.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(next);
    h.skip = true;
    layersRef.current = next;
    setLayers(next);
    setSelectedId(null);
    setHistoryTick((n) => n + 1);
  }, []);
  const canUndo = historyRef.current.past.length > 1;
  const canRedo = historyRef.current.future.length > 0;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | { label: string }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState<"uploads" | "samples" | "templates">("templates");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState<IndustryKey | null>(null);
  const [pendingIndustryAutoScene, setPendingIndustryAutoScene] = useState<IndustryKey | null>(null);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeTool, setActiveTool] = useState<StudioTool | "select">("select");
  const [tryOnOpen, setTryOnOpen] = useState(false);
  
  const virtualTryOnFn = useServerFn(virtualTryOn);
  const isProUser = Boolean(user) && (credits ?? 0) > 0;
  const [gallery, setGallery] = useState<{
    categories: GalleryCategory[];
    itemsByCategory: Record<string, GalleryItem[]>;
  } | null>(null);
  const [showAllSamples, setShowAllSamples] = useState(false);
  const [mobileSampleCatId, setMobileSampleCatId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  
  // Claid-style Remove Background parameter panel
  const [bgMode, setBgMode] = useState<"general" | "prompted" | "interactive">("general");
  const [bgBackground, setBgBackground] = useState<"transparent" | "color">("transparent");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [bgClipping, setBgClipping] = useState(false);
  const [bgCar, setBgCar] = useState(false);
  const [bgPaddingEnabled, setBgPaddingEnabled] = useState(false);
  const [bgPaddingUnit, setBgPaddingUnit] = useState<"percent" | "px">("percent");
  const [bgPaddingValue, setBgPaddingValue] = useState<number>(20);
  // AI Background templates drawer: tabs + category chip
  const [templatesTab, setTemplatesTab] = useState<"claid" | "mine">("claid");
  const [templatesCategory, setTemplatesCategory] = useState<TemplateCategory | "all">("all");
  // AI Photoshoot panel state
  const [psAspect, setPsAspect] = useState<"1:1" | "4:5" | "3:2" | "16:9" | "9:16">("1:1");
  const [psMode, setPsMode] = useState<"precise" | "creative" | "inspiration">("precise");
  const [psPrompt, setPsPrompt] = useState<string>("");
  const [psCount, setPsCount] = useState<1 | 2 | 3 | 4>(1);
  const listGalleryFn = useServerFn(listGallery);
  const upscaleFn = useServerFn(upscaleImage);
  const marketplaceId = useActiveMarketplace();
  const marketplace = marketplaceById(marketplaceId);

  // Lazy-load the 46 categories / ~940 sample photos when the user opens
  // the Samples tab (desktop or mobile sheet). Cached in memory once fetched.
  useEffect(() => {
    if (libraryTab !== "samples" || gallery) return;
    let cancelled = false;
    listGalleryFn()
      .then((data) => {
        if (!cancelled) setGallery(data);
      })
      .catch((err) => console.warn("[studio] gallery load failed", err));
    return () => {
      cancelled = true;
    };
  }, [libraryTab, gallery, listGalleryFn]);




  const fileInputRef = useRef<HTMLInputElement>(null);
  const customTplInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------
  // Custom (user-uploaded) templates
  // - Guests: localStorage only (best-effort, lost when browser cleared)
  // - Signed-in users: synced to Lovable Cloud (user_templates table).
  //   Free users' cloud rows auto-purge after 5 days via pg_cron; paid
  //   users' rows persist indefinitely. Manual delete button always works.
  // ------------------------------------------------------------------
  type CustomTemplate = {
    id: string;
    name: string;
    url: string; // data URL
    category: TemplateCategory;
    createdAt: number;
    remote?: boolean; // true if backed by a Cloud row (id matches)
  };
  const CUSTOM_TPL_LS_KEY = "bgr.customTemplates.v1";
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [customTplCategory, setCustomTplCategory] = useState<TemplateCategory>("minimal");
  const fetchCloudTemplates = useServerFn(listUserTemplates);
  const upsertCloudTemplate = useServerFn(upsertUserTemplate);
  const deleteCloudTemplate = useServerFn(deleteUserTemplate);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TPL_LS_KEY);
      if (raw) setCustomTemplates(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_TPL_LS_KEY, JSON.stringify(customTemplates));
    } catch { /* quota — ignore */ }
  }, [customTemplates]);

  // When signed in, pull cloud library and merge in.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchCloudTemplates();
        if (cancelled) return;
        setCustomTemplates((prev) => {
          const cloud: CustomTemplate[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            url: r.dataUrl,
            category: (r.category as TemplateCategory) ?? "minimal",
            createdAt: new Date(r.createdAt).getTime(),
            remote: true,
          }));
          // Upload local-only guest templates to cloud (fire-and-forget)
          const localOnly = prev.filter(
            (p) => !p.remote && !cloud.some((c) => c.id === p.id),
          );
          for (const p of localOnly) {
            upsertCloudTemplate({
              data: { name: p.name, category: p.category, dataUrl: p.url },
            })
              .then(({ id }) => {
                setCustomTemplates((cur) =>
                  cur.map((c) => (c.id === p.id ? { ...c, id, remote: true } : c)),
                );
              })
              .catch(() => { /* ignore */ });
          }
          const byId = new Map<string, CustomTemplate>();
          for (const c of cloud) byId.set(c.id, c);
          for (const l of localOnly) byId.set(l.id, l);
          return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
        });
      } catch { /* offline or unauth — silent */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id, fetchCloudTemplates, upsertCloudTemplate]);

  const addCustomTemplateFromFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      setToast("Şablon 8MB'den küçük olmalı");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (!url) return;
      const localId = `custom-${crypto.randomUUID()}`;
      const tpl: CustomTemplate = {
        id: localId,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Custom",
        url,
        category: customTplCategory,
        createdAt: Date.now(),
      };
      setCustomTemplates((prev) => [tpl, ...prev].slice(0, 40));
      // Push to cloud if signed in — swap local id for cloud id on success
      if (user?.id && url.length < 6_500_000) {
        upsertCloudTemplate({
          data: { name: tpl.name, category: tpl.category, dataUrl: url },
        })
          .then(({ id }) => {
            setCustomTemplates((cur) =>
              cur.map((c) => (c.id === localId ? { ...c, id, remote: true } : c)),
            );
          })
          .catch(() => { /* keep local-only copy */ });
      }
    };
    reader.readAsDataURL(file);
  }, [customTplCategory, user?.id, upsertCloudTemplate]);

  const deleteCustomTemplate = useCallback((id: string) => {
    setCustomTemplates((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target?.remote && user?.id) {
        deleteCloudTemplate({ data: { id } }).catch(() => { /* ignore */ });
      }
      return prev.filter((c) => c.id !== id);
    });
  }, [user?.id, deleteCloudTemplate]);


  /**
   * Add a custom template as a FLEXIBLE (movable/resizable/rotatable) image
   * layer instead of a locked background. The user asked for full freedom on
   * their own uploads — no forced background lock.
   */
  const pickCustomTemplateAsLayer = useCallback((c: CustomTemplate) => {
    const asset: MediaAsset = {
      id: `custom-asset-${c.id}`,
      name: c.name,
      url: c.url,
      createdAt: Date.now(),
    };
    setAssets((prev) => (prev.some((a) => a.id === asset.id) ? prev : [asset, ...prev]));
    const img = new Image();
    img.onload = () => {
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const cw = canvasBounds?.width ?? 900;
      const ch = canvasBounds?.height ?? 640;
      const maxW = Math.min(560, cw * 0.7);
      const maxH = ch * 0.75;
      let w = img.width || 480;
      let h = img.height || 480;
      const scale = Math.min(1, maxW / w, maxH / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const layer: ImageLayer = {
        id: crypto.randomUUID(),
        kind: "image",
        assetId: asset.id,
        useProcessed: false,
        name: c.name,
        visible: true,
        locked: false,
        x: Math.max(20, (cw - w) / 2),
        y: Math.max(20, (ch - h) / 2),
        w,
        h,
        rotation: 0,
        opacity: 1,
      };
      setLayers((prev) => [layer, ...prev]);
      setSelectedId(layer.id);
    };
    img.onerror = () => {
      setToast("Şablon yüklenemedi");
    };
    img.src = c.url;
  }, []);


  const canvasRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Layer[]>([]);
  const assetsRef = useRef<MediaAsset[]>([]);
  const selectedSceneIdRef = useRef<string | null>(null);
  const snapRequestRef = useRef(0);
  const sceneChangeRef = useRef(0);
  const cutoutInFlightRef = useRef<Map<string, Promise<string>>>(new Map());
  const exportInFlightRef = useRef(false);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    selectedSceneIdRef.current = selectedSceneId;
  }, [selectedSceneId]);

  // Persist studio work per-session (guest UUID or user.id) so it survives
  // navigation between / /dashboard /studio and browser reloads.
  // On sign-in, migrate the guest bucket into the user bucket so the
  // canvas/asset/selection state the anonymous visitor built up (their
  // uploaded product + chosen template) survives the auth wall.
  useEffect(() => {
    if (!sessionId || sessionId === "guest") return;
    try {
      let raw = localStorage.getItem(`bgr-studio-${sessionId}`);
      // Guest → user migration: if this is a signed-in user with no saved
      // state yet, pull whatever the guest bucket has and promote it.
      if (!raw && user) {
        const guestId = localStorage.getItem("bgr-guest-id");
        if (guestId && guestId !== sessionId) {
          const guestRaw = localStorage.getItem(`bgr-studio-${guestId}`);
          if (guestRaw) {
            localStorage.setItem(`bgr-studio-${sessionId}`, guestRaw);
            localStorage.removeItem(`bgr-studio-${guestId}`);
            raw = guestRaw;
          }
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw) as {
          assets?: MediaAsset[];
          layers?: Layer[];
          selectedId?: string | null;
        };
        if (parsed.assets) {
          const restoredAssets = parsed.assets.map((asset) => ({
            ...asset,
            processedUrl: asset.processedUrl ?? readCachedCutout(asset.url) ?? undefined,
          }));
          setAssets(restoredAssets);
        }
        if (parsed.layers) {
          const safeLayers = parsed.layers.map((layer) =>
            layer.kind === "image"
              ? ({
                  ...layer,
                  useProcessed: Boolean(
                    parsed.assets?.find((asset) => asset.id === layer.assetId)?.processedUrl ??
                    readCachedCutout(parsed.assets?.find((asset) => asset.id === layer.assetId)?.url),
                  ),
                } as ImageLayer)
              : layer,
          );
          const normalized = normalizeSceneFirstLayers(safeLayers);
          setLayers(normalized.layers);
          setSelectedSceneId(normalized.selectedSceneId);
          const selectedStillExists = normalized.layers.some((l) => l.id === parsed.selectedId);
          setSelectedId(selectedStillExists ? (parsed.selectedId ?? null) : null);
        } else if (parsed.selectedId !== undefined) {
          setSelectedId(parsed.selectedId);
        }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [sessionId, user]);

  useEffect(() => {
    if (!hydrated || !sessionId || sessionId === "guest") return;
    try {
      localStorage.setItem(
        `bgr-studio-${sessionId}`,
        JSON.stringify({ assets, layers: normalizeSceneFirstLayers(layers).layers, selectedId }),
      );
    } catch { /* ignore quota */ }
  }, [hydrated, sessionId, assets, layers, selectedId]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const selectedImageLayer = selected?.kind === "image" ? (selected as ImageLayer) : null;
  const activeBgLayer = layers.find((l): l is BgLayer => l.kind === "bg") ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const resetTransientStudioState = useCallback(() => {
    setBusy(null);
    setExporting(false);
    setToast(null);
    setEditingTextId(null);
    setShapePickerOpen(false);
    
    transformState.current = null;
  }, []);

  const sceneFromBg = useCallback((bg: BgLayer): ActiveScene => ({
    id: bg.sceneId ?? bg.templateId ?? bg.id,
    name: bg.name,
    slot: bg.slot ?? DEFAULT_SCENE_SLOT,
  }), []);

  /** Scene-first flow: the active locked bg layer owns the snap slot. */
  const activeScene = (() => {
    const bg = layers.find((l) => l.kind === "bg") as BgLayer | undefined;
    if (!bg) return null;
    return sceneFromBg(bg);
  })();
  const hasScene = Boolean(activeScene);

  useEffect(() => {
    if (typeof credits !== "number" || credits <= 0) return;
    // A previous no-credit/export attempt can leave transient UI in a blocked
    // visual state on mobile. Credits are never a gate for category selection,
    // so clear only temporary work/overlay state and keep the user's scene.
    resetTransientStudioState();
    snapRequestRef.current++;
  }, [credits, resetTransientStudioState]);

  const getActiveSceneSnapshot = useCallback((): ActiveScene | null => {
    const bg = layersRef.current.find((l) => l.kind === "bg") as BgLayer | undefined;
    if (!bg) return null;
    return sceneFromBg(bg);
  }, [sceneFromBg]);

  const blobToDataUrl = useCallback(
    (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read_failed"));
        r.readAsDataURL(blob);
      }),
    [],
  );

  const readImageNaturalSize = useCallback((src: string, fallback?: { w: number; h: number }) =>
    new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || fallback?.w || 400, h: img.naturalHeight || fallback?.h || 400 });
      img.onerror = () => resolve(fallback ?? { w: 400, h: 400 });
      img.src = src;
    }), []);

  const createSnappedProductLayer = useCallback(
    async (asset: MediaAsset, imageUrl: string, scene: ActiveScene, useProcessed: boolean): Promise<ImageLayer> => {
      const natural = await readImageNaturalSize(imageUrl);
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const cw = canvasBounds?.width ?? 900;
      const ch = canvasBounds?.height ?? 900;
      const slotPx = {
        x: (scene.slot.xPct / 100) * cw,
        y: (scene.slot.yPct / 100) * ch,
        w: (scene.slot.wPct / 100) * cw,
        h: (scene.slot.hPct / 100) * ch,
      };
      const fitted = fitInsideSlot(natural, slotPx);
      return {
        id: crypto.randomUUID(),
        kind: "image",
        assetId: asset.id,
        useProcessed,
        name: "Product",
        visible: true,
        locked: false,
        x: fitted.x,
        y: fitted.y,
        w: fitted.w,
        h: fitted.h,
        rotation: scene.slot.rotation,
        opacity: 1,
      };
    },
    [readImageNaturalSize],
  );

  const replaceProductLayer = useCallback((layer: ImageLayer) => {
    setLayers((prev) => {
      const kept = normalizeSceneFirstLayers(prev).layers
        .filter((l) => l.kind !== "image")
        .map((l) =>
          l.kind === "bg"
            ? ({ ...l, background: removeTemplatePlaceholderFromBackground(l.background) } as BgLayer)
            : l,
        );
      const next = normalizeSceneFirstLayers([layer, ...kept]).layers;
      layersRef.current = next;
      return next;
    });
    setSelectedId(layer.id);
  }, []);

  const updateActiveBackground = useCallback((patch: Partial<BgLayer>) => {
    setLayers((prev) => {
      const next = prev.map((l) => (l.kind === "bg" ? ({ ...l, ...patch } as BgLayer) : l));
      layersRef.current = next;
      return next;
    });
  }, []);

  const removeBackgroundForPreview = useCallback(
    async (src: string) => {
      const finalizeCutout = async (blob: Blob) => {
        const dataUrl = await blobToDataUrl(blob);
        if (!(await validateCutoutDataUrl(dataUrl))) {
          throw new Error("invalid_cutout_mask");
        }
        return dataUrl;
      };
      try {
        const { removeBackground } = await import("@/lib/remove-bg");
        // Production safety: previews never call paid/server AI providers and
        // never drop to the destructive flat-fill fallback. Use the same stable
        // RMBG path customers expect from the main flow.
        const localBlob = await removeBackground(src);
        return await finalizeCutout(localBlob);
      } catch (clientError) {
        console.warn("[studio] local preview cutout failed", clientError);
        throw new Error("preview_cutout_failed:local_only");
      }
    },
    [blobToDataUrl],
  );

  // Ensures a given uploaded asset has a background-removed variant. Safe to
  // call multiple times: no-ops if the asset already has `processedUrl`.
  const ensureAssetCutout = useCallback(
    async (assetId: string) => {
      const asset = assetsRef.current.find((a) => a.id === assetId);
      if (!asset) return;

      const cachedProcessedUrl = asset.processedUrl ?? readCachedCutout(asset.url) ?? undefined;
      if (cachedProcessedUrl) {
        const validCachedCutout = await validateCutoutDataUrl(cachedProcessedUrl);
        if (validCachedCutout) {
          if (!asset.processedUrl) {
            setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, processedUrl: cachedProcessedUrl } : a)));
          }
          setLayers((prev) => {
            const next = prev.map((l) =>
              l.kind === "image" && l.assetId === assetId && !l.useProcessed
                ? ({ ...l, useProcessed: true } as ImageLayer)
                : l,
            );
            layersRef.current = next;
            return next;
          });
          return;
        }

        // Never let a cached bad mask hide the product. Clear it and continue
        // with the immutable original upload.
        clearCachedCutout(asset.url);
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, processedUrl: undefined } : a)));
        setLayers((prev) => {
          const next = prev.map((l) =>
            l.kind === "image" && l.assetId === assetId ? ({ ...l, useProcessed: false } as ImageLayer) : l,
          );
          layersRef.current = next;
          return next;
        });
      }
      const requestId = ++snapRequestRef.current;
      const sceneVersion = sceneChangeRef.current;
      setBusy({ label: "Arka plan temizleniyor…" });
      try {
        const cacheKey = cutoutCacheKey(asset.url);
        const existingRequest = cutoutInFlightRef.current.get(cacheKey);
        const processedUrl = existingRequest
          ? await existingRequest
          : await (async () => {
              const src = asset.url.startsWith("data:")
                ? asset.url
                : await (async () => {
                    const res = await fetch(asset.url, { mode: "cors" });
                    return await blobToDataUrl(await res.blob());
                  })();
              const request = removeBackgroundForPreview(src);
              cutoutInFlightRef.current.set(cacheKey, request);
              try {
                return await request;
              } finally {
                cutoutInFlightRef.current.delete(cacheKey);
              }
            })();
        if (!(await validateCutoutDataUrl(processedUrl))) throw new Error("invalid_cutout_mask");
        writeCachedCutout(asset.url, processedUrl);
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, processedUrl } : a)),
        );
        setLayers((prev) => {
          const next = prev.map((l) =>
            l.kind === "image" && l.assetId === assetId
              ? ({ ...l, useProcessed: true } as ImageLayer)
              : l,
          );
          layersRef.current = next;
          return next;
        });
        if (requestId !== snapRequestRef.current || sceneVersion !== sceneChangeRef.current) return;
        showToast("Arka plan temizlendi ✓");
      } catch (err) {
        console.warn("[studio] ensureAssetCutout failed; keeping original product", err);
      } finally {
        if (requestId === snapRequestRef.current && sceneVersion === sceneChangeRef.current) setBusy(null);
      }
    },
    [blobToDataUrl, removeBackgroundForPreview, showToast],
  );

  const autoSnapIntoScene = useCallback(
    async (asset: MediaAsset, scene: ActiveScene) => {
      const requestId = ++snapRequestRef.current;
      const sceneVersion = sceneChangeRef.current;
      setBusy({ label: "Ön izleme hazırlanıyor…" });
      try {
        const cachedProcessedUrl = asset.processedUrl ?? readCachedCutout(asset.url) ?? undefined;
        const validCachedCutout = cachedProcessedUrl ? await validateCutoutDataUrl(cachedProcessedUrl) : false;
        if (validCachedCutout && !asset.processedUrl) {
          setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, processedUrl: cachedProcessedUrl } : a)));
        }
        if (validCachedCutout && cachedProcessedUrl) {
          const instantLayer = await createSnappedProductLayer(asset, cachedProcessedUrl, scene, true);
          if (requestId !== snapRequestRef.current || sceneVersion !== sceneChangeRef.current) return;
          replaceProductLayer(instantLayer);
          setBusy(null);
          showToast("Ön izleme hazır ✓");
          return;
        }

        const src = asset.url.startsWith("data:")
          ? asset.url
          : await (async () => {
              const res = await fetch(asset.url, { mode: "cors" });
              return await blobToDataUrl(await res.blob());
            })();
        // Never place the raw upload into the scene before cutout finishes — if
        // the model stalls, that is what created the white rectangle over faces.
        setBusy({ label: "Ürün izole ediliyor…" });
        const cacheKey = cutoutCacheKey(asset.url);
        const existingRequest = cutoutInFlightRef.current.get(cacheKey);
        const processedUrl = existingRequest
          ? await existingRequest
          : await (async () => {
              const request = removeBackgroundForPreview(src);
              cutoutInFlightRef.current.set(cacheKey, request);
              try {
                return await request;
              } finally {
                cutoutInFlightRef.current.delete(cacheKey);
              }
            })();
        if (!(await validateCutoutDataUrl(processedUrl))) throw new Error("invalid_cutout_mask");
        writeCachedCutout(asset.url, processedUrl);
        setAssets((prev) =>
          prev.map((a) => (a.id === asset.id ? { ...a, processedUrl } : a)),
        );
        setLayers((prev) => {
          const next = prev.map((l) =>
            l.kind === "image" && l.assetId === asset.id
              ? ({ ...l, useProcessed: true } as ImageLayer)
              : l,
          );
          layersRef.current = next;
          return next;
        });
        if (requestId !== snapRequestRef.current || sceneVersion !== sceneChangeRef.current) return;
        const processedLayer = await createSnappedProductLayer(asset, processedUrl, scene, true);
        if (requestId !== snapRequestRef.current || sceneVersion !== sceneChangeRef.current) return;
        replaceProductLayer(processedLayer);
        showToast("Arka plan temizlendi ✓");
      } catch (err) {
        console.warn("[studio] background cutout failed; raw product was not placed", err);
        showToast("Ürün izolasyonu tamamlanamadı — beyaz kutu sahneye eklenmedi");
      } finally {
        if (requestId === snapRequestRef.current && sceneVersion === sceneChangeRef.current) setBusy(null);
      }
    },
    [blobToDataUrl, createSnappedProductLayer, removeBackgroundForPreview, replaceProductLayer, showToast],
  );

  /* ---------- Upload ---------- */
  const handleFiles = useCallback((files: FileList | File[]) => {
    const scene = getActiveSceneSnapshot();
    if (!scene) {
      showToast("Önce bir sahne seç — sonra ürününü yükle");
      setLibraryTab("templates");
      return;
    }
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    const queue = list.slice(0, 1);
    const created: MediaAsset[] = [];
    let pending = queue.length;
    queue.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        const id = crypto.randomUUID();
        created.push({ id, name: f.name || "Product", url, createdAt: Date.now() });
        pending -= 1;
        if (pending === 0) {
          setAssets((prev) => [...created, ...prev]);
          if (created[0]) void autoSnapIntoScene(created[0], scene);
        }
      };
      reader.readAsDataURL(f);
    });
  }, [autoSnapIntoScene, getActiveSceneSnapshot, showToast]);

  const addImageToCanvasRaw = useCallback((asset: MediaAsset) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 520;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const cw = canvasBounds?.width ?? 900;
      const ch = canvasBounds?.height ?? 640;
      const layer: ImageLayer = {
        id: crypto.randomUUID(),
        kind: "image",
        assetId: asset.id,
        useProcessed: false,
        name: asset.name,
        visible: true,
        locked: false,
        x: Math.max(20, (cw - w) / 2),
        y: Math.max(20, (ch - h) / 2),
        w,
        h,
        rotation: 0,
        opacity: 1,
      };
      setLayers((prev) => [layer, ...prev]);
      setSelectedId(layer.id);
    };
    img.src = asset.url;
  }, []);

  const addImageToCanvas = useCallback(
    (asset: MediaAsset) => {
      const scene = getActiveSceneSnapshot();
      if (scene) {
        void autoSnapIntoScene(asset, scene);
        return;
      }
      showToast("Önce bir sahne seç — ürün otomatik slot'a otursun");
      setLibraryTab("templates");
    },
    [autoSnapIntoScene, getActiveSceneSnapshot, showToast],
  );

  /* ---------- Drag & drop onto canvas ---------- */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  /* ---------- Real AI actions ---------- */
  // Cross-origin sample photos need to be converted to a data URL before we
  // can hand them off to the on-device RMBG worker or a server function.
  const urlToDataUrl = useCallback(async (url: string): Promise<string> => {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read_failed"));
      r.readAsDataURL(blob);
    });
  }, []);


  // Remove background rail button → just opens the parameter drawer
  // (Claid-style). Actual processing runs from the Apply button inside the
  // panel via applyBgRemoval below.
  const removeBgAI = useCallback(() => {
    setActiveTool("bg-remove");
    setDrawerOpen(true);
  }, []);

  // Post-process a cutout PNG: add padding around the subject and optionally
  // composite onto a solid color background.
  const postProcessCutout = useCallback(
    async (
      cutoutDataUrl: string,
      opts: {
        paddingEnabled: boolean;
        paddingUnit: "percent" | "px";
        paddingValue: number;
        background: "transparent" | "color";
        color: string;
      },
    ): Promise<string> => {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("post_process_load_failed"));
        el.src = cutoutDataUrl;
      });
      const pad = opts.paddingEnabled
        ? opts.paddingUnit === "percent"
          ? Math.round(Math.min(img.width, img.height) * (opts.paddingValue / 100))
          : Math.max(0, Math.round(opts.paddingValue))
        : 0;
      const w = img.width + pad * 2;
      const h = img.height + pad * 2;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return cutoutDataUrl;
      if (opts.background === "color") {
        ctx.fillStyle = opts.color;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, pad, pad);
      return canvas.toDataURL("image/png");
    },
    [],
  );

  // Executes background removal against the currently-selected image layer
  // (or the first image layer if nothing is explicitly selected) using the
  // parameters from the BG panel.
  const applyBgRemoval = useCallback(async () => {
    const layer =
      selected && selected.kind === "image"
        ? (selected as ImageLayer)
        : (layers.find((l) => l.kind === "image") as ImageLayer | undefined);
    if (!layer) {
      showToast(t("bgSelectFirst"));
      return;
    }
    const asset = assets.find((a) => a.id === layer.assetId);
    if (!asset) return;
    setBusy({ label: "Arka plan temizleniyor" });
    try {
      const src = await urlToDataUrl(asset.url);
      const { removeBackground } = await import("@/lib/remove-bg");
      const blob = await removeBackground(src);
      const rawCutout = await blobToDataUrl(blob);
      if (!(await validateCutoutDataUrl(rawCutout))) {
        throw new Error("invalid_manual_cutout_mask");
      }
      const processedUrl = await postProcessCutout(rawCutout, {
        paddingEnabled: bgPaddingEnabled,
        paddingUnit: bgPaddingUnit,
        paddingValue: bgPaddingValue,
        background: bgBackground,
        color: bgColor,
      });
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, processedUrl } : a)));
      writeCachedCutout(asset.url, processedUrl);
      setLayers((prev) =>
        prev.map((l) => (l.id === layer.id && l.kind === "image" ? { ...l, useProcessed: true } : l)),
      );
      showToast("Arka plan temizlendi ✓");
    } catch (err) {
      console.error("[studio] bg removal failed", err);
      showToast("Temizleme başarısız — tekrar dene");
    } finally {
      setBusy(null);
    }
  }, [
    selected,
    layers,
    assets,
    urlToDataUrl,
    blobToDataUrl,
    showToast,
    postProcessCutout,
    bgPaddingEnabled,
    bgPaddingUnit,
    bgPaddingValue,
    bgBackground,
    bgColor,
  ]);

  // Neural Retouch → server-side 4× upscale (Real-ESRGAN via Replicate).
  const retouchAI = useCallback(async () => {
    setActiveTool("ai-enhance");
    if (isGuest) {
      showToast("HD çıktı için hızlıca kaydını tamamla");
      return;
    }
    if (!selected || selected.kind !== "image") {
      showToast("Önce bir ürün seç — sonra HD hazırla");
      return;
    }
    const asset = assets.find((a) => a.id === selected.assetId);
    if (!asset) return;
    setBusy({ label: "HD çıktı hazırlanıyor" });
    try {
      const src = await urlToDataUrl(asset.url);
      const res = await upscaleFn({
        data: { imageDataUrl: src, tier: "fast" as const },
      });
      if (!res.ok) {
        const msg =
          res.reason === "no_credits"
            ? "Kredi tükendi — yükleme yap"
            : res.reason === "provider_unavailable"
              ? "Servis yoğun — birazdan tekrar dene"
              : "HD hazırlama başarısız — tekrar dene";
        showToast(msg);
        return;
      }
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, url: res.resultDataUrl } : a)),
      );
      showToast("HD çıktı hazır ✓");
    } catch (err) {
      console.error("[studio] retouch failed", err);
      showToast("HD hazırlama başarısız — tekrar dene");
    } finally {
      setBusy(null);
    }
  }, [isGuest, selected, assets, urlToDataUrl, upscaleFn, showToast]);

  // AI Photoshoot (Gemini 3 Pro Image) — composites the current canvas
  // (scene + product + any user-added layers) into a single PNG frame and
  // hands it to Gemini as a reference so it can regenerate a photo-real
  // commercial shot. Cost: PHOTOSHOOT_COST_PER_IMAGE credits per output image.
  const runPhotoshootFn = useServerFn(runAIPhotoshoot);
  const applyAIPhotoshoot = useCallback(async () => {
    if (!canvasRef.current) return;
    if (layers.length === 0) {
      showToast(t("bgSelectFirst"));
      return;
    }
    if (!user) {
      showToast("AI Fotoğraf Çekimi için hızlıca kaydını tamamla");
      void navigate({ to: "/auth", search: { redirect: "/studio", mode: "signup" } as never });
      return;
    }
    setSelectedId(null);
    setBusy({ label: "AI Fotoğraf Çekimi hazırlanıyor" });
    try {
      // Give React one paint frame so the selection outline / handles are
      // removed from the DOM before we snapshot the canvas.
      await new Promise((r) => setTimeout(r, 60));
      const { toPng } = await import("html-to-image");
      const canvasDataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: (n) => !(n instanceof HTMLElement && n.dataset?.exportIgnore === "true"),
      });
      const res = await runPhotoshootFn({
        data: {
          canvasDataUrl,
          prompt: psPrompt || null,
          mode: psMode,
          aspect: psAspect,
          count: psCount,
        },
      });
      if (!res.ok) {
        const msg =
          res.reason === "no_credits"
            ? "Kredi tükendi — yükleme yap"
            : res.reason === "moderation"
              ? "Görsel güvenlik filtresine takıldı — farklı bir kare dene"
              : res.reason === "empty" || res.reason === "bad_input"
                ? "Önce sahne ve ürünü kanvasa yerleştir"
                : "AI Fotoğraf Çekimi başarısız — birazdan tekrar dene";
        showToast(msg);
        if (res.reason === "no_credits") void navigate({ to: "/pricing" });
        return;
      }
      const created: MediaAsset[] = res.images.map((url, idx) => ({
        id: crypto.randomUUID(),
        name: `photoshoot-${Date.now()}-${idx + 1}.png`,
        url,
        createdAt: Date.now(),
      }));
      setAssets((prev) => [...created, ...prev]);
      // Drop the freshly-generated hero shot straight onto the canvas so the
      // user sees the result immediately.
      if (created[0]) addImageToCanvas(created[0]);
      showToast(created.length > 1 ? `${created.length} AI çekim hazır ✓` : "AI çekim hazır ✓");
    } catch (err) {
      console.error("[studio] ai photoshoot failed", err);
      showToast("AI Fotoğraf Çekimi başarısız — tekrar dene");
    } finally {
      setBusy(null);
    }
  }, [layers, user, navigate, runPhotoshootFn, psPrompt, psMode, psAspect, psCount, addImageToCanvas, showToast, t]);


  // Virtual Try-On (Gemini 3 Pro Image) — Pro-only: paired-template composer
  // for jacket / watch / balloon categories. Opens a dedicated modal.
  const openVirtualTryOn = useCallback(() => {
    setActiveTool("virtual-tryon");
    if (!user) {
      showToast("Model ön izleme için hızlıca kaydını tamamla");
      void navigate({ to: "/auth", search: { redirect: "/studio", mode: "signup" } as never });
      return;
    }
    if (!isProUser) {
      showToast("Model ön izleme için kredi gerekiyor");
      void navigate({ to: "/pricing" });
      return;
    }
    setTryOnOpen(true);
  }, [user, isProUser, navigate, showToast]);

  const runVirtualTryOn = useCallback(
    async (req: TryOnRequest) => {
      setBusy({ label: "Model ön izleme hazırlanıyor" });
      try {
        const res = await virtualTryOnFn({
          data: {
            sceneUrl: req.sceneUrl,
            scenePrompt: req.scenePrompt,
            productDataUrl: req.productDataUrl,
            wearableAnchor: req.wearableAnchor ?? null,
          },
        });
        if (!res.ok) {
          const msg =
            res.reason === "moderation"
              ? "Image blocked by safety filter — try a different photo"
              : res.reason === "empty"
                ? "Please upload a product photo first"
                : "Model ön izleme başarısız — birazdan tekrar dene";
          showToast(msg);
          return null;
        }
        showToast("Model ön izleme hazır ✓");
        return res.imageBase64;
      } catch (err) {
        console.error("[studio] try-on failed", err);
        showToast("Model ön izleme başarısız — tekrar dene");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [virtualTryOnFn, showToast],
  );

  const addTryOnToCanvas = useCallback(
    (dataUrl: string) => {
      const id = crypto.randomUUID();
      const newAsset: MediaAsset = {
        id,
        name: `Try-On ${new Date().toLocaleTimeString()}`,
        url: dataUrl,
        createdAt: Date.now(),
      };
      setAssets((prev) => [newAsset, ...prev]);
      addImageToCanvas(newAsset);
      // Mark the newly added layer as a Try-On layer so the Inspector surfaces
      // dedicated Move / Rotate / Warp controls next tick.
      setTimeout(() => {
        setLayers((prev) =>
          prev.map((l) =>
            l.kind === "image" && l.assetId === id
              ? ({ ...l, isTryOn: true, name: "Try-On" } as ImageLayer)
              : l,
          ),
        );
      }, 60);
      showToast("Try-On added — use the Transform panel to fine-tune ✓");
    },
    [addImageToCanvas, showToast],
  );


  /* ---------- Export / Create (single credit gate) ---------- */
  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    if (exportInFlightRef.current) {
      showToast("Create zaten hazırlanıyor — lütfen bekle");
      return;
    }
    if (layers.length === 0) {
      showToast("Önce bir sahne seç ve ürününü ekle");
      return;
    }
    if (!user) {
      showToast("Create için hızlıca kaydını tamamla");
      void navigate({ to: "/auth", search: { redirect: "/studio", mode: "signup" } as never });
      return;
    }
    const exportSignature = buildExportSignature(layers, assets);
    const alreadyPaid = readPaidExportKeys(sessionId).includes(exportSignature);
    exportInFlightRef.current = true;
    setSelectedId(null);
    setExporting(true);
    setBusy({ label: "Create · yüksek çözünürlükte hazırlanıyor" });
    try {
      await new Promise((r) => setTimeout(r, 80));
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: (n) => !(n instanceof HTMLElement && n.dataset?.exportIgnore === "true"),
      });
      if (!alreadyPaid) {
        const res = await consume();
        if (!res.ok) {
          showToast(
            res.reason === "no_credits"
              ? "Kredi tükendi — yükleme yap"
              : "Create başarısız — tekrar dene",
          );
          if (res.reason === "no_credits") void navigate({ to: "/pricing" });
          return;
        }
        rememberPaidExportKey(sessionId, exportSignature);
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `bgremovify-${Date.now()}.png`;
      a.click();
      showToast(alreadyPaid ? "Hazır ✓ tekrar indirildi" : "Hazır ✓ görsel indirildi");
    } catch (err) {
      console.error("[studio] export failed", err);
      showToast("Dışa aktarım başarısız");
    } finally {
      exportInFlightRef.current = false;
      setExporting(false);
      setBusy(null);
    }
  }, [layers, assets, sessionId, user, consume, navigate, showToast]);

  /* ---------- Layer helpers ---------- */
  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setLayers((prev) => {
      const target = prev.find((l) => l.id === id);
      if (!target) return prev;
      if (!target.groupId || !isGroupTransformPatch(patch)) {
        const next = prev.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l));
        layersRef.current = next;
        return next;
      }

      const dx = patch.x !== undefined ? patch.x - target.x : 0;
      const dy = patch.y !== undefined ? patch.y - target.y : 0;
      const dw = patch.w !== undefined ? patch.w - target.w : 0;
      const dh = patch.h !== undefined ? patch.h - target.h : 0;
      const dr = patch.rotation !== undefined ? patch.rotation - target.rotation : 0;
      const next = prev.map((l) => {
        if (l.groupId !== target.groupId) return l;
        if (l.id === id) return { ...l, ...patch } as Layer;
        const siblingPatch: Partial<Layer> = {
          ...l,
          x: l.x + dx,
          y: l.y + dy,
          w: Math.max(20, l.w + dw),
          h: Math.max(20, l.h + dh),
          rotation: l.rotation + dr,
        } as Partial<Layer>;
        if (patch.opacity !== undefined) siblingPatch.opacity = patch.opacity;
        if (patch.visible !== undefined) siblingPatch.visible = patch.visible;
        if (patch.locked !== undefined) siblingPatch.locked = patch.locked;
        return siblingPatch as Layer;
      });
      layersRef.current = next;
      return next;
    });
  }, []);
  const deleteLayer = useCallback((id: string) => {
    const target = layersRef.current.find((l) => l.id === id);
    if (!target || target.locked) return;
    const deletedGroupId = target?.groupId;
    setLayers((prev) => {
      const next = target?.groupId
        ? prev.filter((l) => l.groupId !== target.groupId)
        : prev.filter((l) => l.id !== id);
      layersRef.current = next;
      return next;
    });
    setSelectedId((s) => (s === id || (deletedGroupId && layersRef.current.every((l) => l.id !== s)) ? null : s));
    showToast(target.groupId ? "Rozet grubu silindi" : "Katman silindi");
  }, [showToast]);
  const clearTemplate = useCallback(() => {
    setLayers((prev) => {
      const next = prev.filter((l) => l.kind !== "bg");
      layersRef.current = next;
      return next;
    });
    setSelectedId((s) => {
      const stillThere = layersRef.current.some((l) => l.id === s);
      return stillThere ? s : null;
    });
    showToast(t("removeTemplate") + " ✓");
  }, [showToast, t]);
  const requestIndustryChange = useCallback((next: IndustryKey | null): boolean => {
    const hasBg = layersRef.current.some((l) => l.kind === "bg");
    const hasProduct = layersRef.current.some((l) => l.kind !== "bg");
    if ((hasBg || hasProduct) && typeof window !== "undefined") {
      if (!window.confirm(t("categoryChangeConfirm"))) return false;
    }
    // Reset canvas state (locked template + product layers) so the new
    // category lands on a clean stage.
    setLayers(() => { layersRef.current = []; return []; });
    setSelectedId(null);
    setIndustryFilter(next);
    if (next) setPendingIndustryAutoScene(next);
    void navigate({
      to: "/studio",
      search: next ? { panel: search.panel, industry: next } : { panel: search.panel },
      replace: true,
    });
    return true;
  }, [navigate, search.panel, t]);
  const deleteSelectedLayer = useCallback(() => {
    if (!selectedId) return;
    const target = layersRef.current.find((l) => l.id === selectedId);
    if (!target || target.locked) return;
    deleteLayer(selectedId);
    setEditingTextId(null);
  }, [deleteLayer, selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelectedLayer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelectedLayer, selectedId]);
  const moveLayer = useCallback((id: string, dir: -1 | 1) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const swap = idx + dir;
      if (swap < 0 || swap >= prev.length) return prev;
      // Background layer is pinned to the bottom of the stack. Never let a
      // reorder click move it, or move a sibling past it.
      if (prev[idx].locked || prev[swap].locked) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);
  const addText = useCallback((preset?: Partial<TextLayer>) => {
    const l: TextLayer = {
      id: crypto.randomUUID(),
      kind: "text",
      name: preset?.text ? preset.text.slice(0, 24) : "Text",
      visible: true,
      locked: false,
      x: 120,
      y: 120,
      w: preset?.w ?? 320,
      h: preset?.h ?? 72,
      rotation: 0,
      opacity: 1,
      text: preset?.text ?? "Your headline",
      fontSize: preset?.fontSize ?? 42,
      color: preset?.color ?? "#0f172a",
      weight: preset?.weight ?? 700,
    };
    setLayers((p) => [l, ...p]);
    setSelectedId(l.id);
  }, []);
  const addBadge = useCallback((b: BadgePresetSpec) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const cw = canvasBounds?.width ?? 900;
    const ch = canvasBounds?.height ?? 900;
    const x = Math.max(24, Math.round(cw * 0.62));
    const y = Math.max(24, Math.round(ch * 0.08));
    const radius = b.shape === "circle" ? Math.round(Math.min(b.w, b.h) / 2) : b.shape === "pill" ? 999 : 12;
    const groupId = `badge-${crypto.randomUUID()}`;
    const bgShape: ShapeLayer = {
      id: crypto.randomUUID(),
      kind: "shape",
      groupId,
      name: `${b.label} bg`,
      visible: true,
      locked: false,
      x,
      y,
      w: b.w,
      h: b.h,
      rotation: 0,
      opacity: 1,
      shape: b.shape === "circle" ? "ellipse" : "rect",
      fill: b.fill,
      stroke: b.stroke ?? "#0f172a",
      strokeWidth: b.stroke ? 2 : 0,
      radius,
      shadow: 2,
    };
    const label: TextLayer = {
      id: crypto.randomUUID(),
      kind: "text",
      groupId,
      name: b.label,
      visible: true,
      locked: false,
      x,
      y,
      w: b.w,
      h: b.h,
      rotation: 0,
      opacity: 1,
      text: b.text,
      fontSize: b.fontSize,
      color: b.textColor,
      weight: b.weight,
    };
    setLayers((p) => [label, bgShape, ...p]);
    setSelectedId(label.id);
  }, []);
  const addShape = useCallback((kind: ShapeKind = "rect") => {
    const preset = SHAPE_PRESETS.find((p) => p.id === kind) ?? SHAPE_PRESETS[0];
    const d = preset.defaults();
    const l: ShapeLayer = {
      id: crypto.randomUUID(),
      kind: "shape",
      name: preset.name,
      visible: true,
      locked: false,
      x: 160,
      y: 160,
      w: d.w,
      h: d.h,
      rotation: 0,
      opacity: 1,
      shape: kind,
      fill: d.fill ?? "#2563eb",
      stroke: d.stroke ?? "#0f172a",
      strokeWidth: d.strokeWidth ?? 0,
      radius: d.radius ?? 0,
      shadow: (d.shadow ?? 0) as ShapeShadow,
    };
    setLayers((p) => [l, ...p]);
    setSelectedId(l.id);
  }, []);

  /* ---------- Snap template engine (zero AI cost) ---------- */
  const applyTemplate = useCallback(
    async (tpl: SnapTemplate) => {
      resetTransientStudioState();
      const sceneVersion = ++sceneChangeRef.current;
      snapRequestRef.current++;
      setMobileSheet(null);
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const cw = canvasBounds?.width ?? 900;
      const ch = canvasBounds?.height ?? 900;
      const currentLayers = layersRef.current;
      const currentAssets = assetsRef.current;

      // Scene-first: template can be applied without a product. If a product
      // image already exists on canvas, snap it into the slot; otherwise
      // just drop the bg and wait for the user's upload (auto-snap on upload).
      const productLayer =
        (selected && selected.kind === "image" ? selected : null) ??
        (currentLayers.find((l) => l.kind === "image") as ImageLayer | undefined) ??
        null;

      let fitted: { x: number; y: number; w: number; h: number } | null = null;
      if (productLayer) {
        const asset = currentAssets.find((a) => a.id === productLayer.assetId);
        if (asset) {
          const productSrc = asset.url;
          const natural = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
            img.onerror = () => resolve({ w: productLayer.w, h: productLayer.h });
            img.src = productSrc;
          });
          const slotPx = {
            x: (tpl.slot.xPct / 100) * cw,
            y: (tpl.slot.yPct / 100) * ch,
            w: (tpl.slot.wPct / 100) * cw,
            h: (tpl.slot.hPct / 100) * ch,
          };
          fitted = fitInsideSlot(natural, slotPx);
        }
      }

      if (sceneVersion !== sceneChangeRef.current) return;

      setLayers((prev) => {
        const withoutBg = prev.filter((l) => l.kind !== "bg");
        const bg: BgLayer = {
          id: crypto.randomUUID(),
          kind: "bg",
          templateId: tpl.id,
          sceneId: tpl.id,
          slot: tpl.slot,
          background: productLayer ? removeTemplatePlaceholderFromBackground(tpl.background) : tpl.background,
          name: tpl.name,
          visible: true,
          locked: true,
          x: 0,
          y: 0,
          w: cw,
          h: ch,
          rotation: 0,
          opacity: 1,
          tintParts: tpl.tintParts,

        };
        const snapped = withoutBg
          .filter((l) => !(l.kind === "text" && l.id.startsWith("tpl-txt-")))
          .filter((l) => !(productLayer && l.kind === "image" && l.id !== productLayer.id))
          .map((l) => {
            if (productLayer && fitted && l.id === productLayer.id && l.kind === "image") {
              const asset = assetsRef.current.find((a) => a.id === l.assetId);
              return {
                ...l,
                x: fitted.x,
                y: fitted.y,
                w: fitted.w,
                h: fitted.h,
                rotation: tpl.slot.rotation,
                useProcessed: Boolean(asset?.processedUrl ?? readCachedCutout(asset?.url)),
              } as Layer;
            }
            return l;
          });
        const overlayLayers: Layer[] = (tpl.textOverlays ?? []).map((o) => ({
          id: `tpl-txt-${tpl.id}-${o.key}-${crypto.randomUUID().slice(0, 6)}`,
          kind: "text",
          name: o.isPriceTag ? "Price" : o.text.slice(0, 16),
          visible: true,
          locked: false,
          x: (o.xPct / 100) * cw,
          y: (o.yPct / 100) * ch,
          w: (o.wPct / 100) * cw,
          h: (o.hPct / 100) * ch,
          rotation: o.rotation,
          opacity: 1,
          text: o.text,
          fontSize: o.fontSize,
          color: o.color,
          weight: o.weight,
        }));
        const next = normalizeSceneFirstLayers([...overlayLayers, ...snapped, bg]).layers;
        layersRef.current = next;
        return next;
      });
      setSelectedSceneId(tpl.id);
      selectedSceneIdRef.current = tpl.id;
      if (productLayer) setSelectedId(productLayer.id);
      const tplLabel = templateName(tpl.id, tpl.name);
      showToast(
        productLayer
          ? `${t("snappedToast")} — ${tplLabel}`
          : `${t("sceneReadyToast")} · ${tplLabel}`,
      );
      // Fire-and-forget: if the snapped product still shows a raw white bg,
      // run the cutout pipeline so it blends into the new scene automatically.
      if (productLayer) void ensureAssetCutout(productLayer.assetId);
    },
    [ensureAssetCutout, resetTransientStudioState, selected, showToast, t, templateName],
  );

  const applyGalleryScene = useCallback(
    async (category: GalleryCategory, item: GalleryItem) => {
      resetTransientStudioState();
      const sceneVersion = ++sceneChangeRef.current;
      snapRequestRef.current++;
      setMobileSheet(null);
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const cw = canvasBounds?.width ?? 900;
      const ch = canvasBounds?.height ?? 900;
      const currentLayers = layersRef.current;
      const currentAssets = assetsRef.current;
      const sceneId = `sample-${item.id}`;
      const sceneSlot = DEFAULT_SCENE_SLOT;
      const productLayer =
        (selected && selected.kind === "image" ? selected : null) ??
        (currentLayers.find((l) => l.kind === "image") as ImageLayer | undefined) ??
        null;

      let fitted: { x: number; y: number; w: number; h: number } | null = null;
      if (productLayer) {
        const asset = currentAssets.find((a) => a.id === productLayer.assetId);
        if (asset) {
          const productSrc = asset.url;
          const natural = await readImageNaturalSize(productSrc, { w: productLayer.w, h: productLayer.h });
          fitted = fitInsideSlot(natural, {
            x: (sceneSlot.xPct / 100) * cw,
            y: (sceneSlot.yPct / 100) * ch,
            w: (sceneSlot.wPct / 100) * cw,
            h: (sceneSlot.hPct / 100) * ch,
          });
        }
      }

      if (sceneVersion !== sceneChangeRef.current) return;

      setLayers((prev) => {
        const withoutBg = prev.filter((l) => l.kind !== "bg");
        const bg: BgLayer = {
          id: crypto.randomUUID(),
          kind: "bg",
          sceneId,
          slot: sceneSlot,
          sourceUrl: item.image_url,
          background: `url("${item.image_url.replace(/"/g, "%22")}") center / cover no-repeat`,
          name: category.label,
          visible: true,
          locked: true,
          x: 0,
          y: 0,
          w: cw,
          h: ch,
          rotation: 0,
          opacity: 1,
        };
        const snapped = withoutBg
          .filter((l) => !(productLayer && l.kind === "image" && l.id !== productLayer.id))
          .map((l) => {
            if (productLayer && fitted && l.id === productLayer.id && l.kind === "image") {
              const asset = assetsRef.current.find((a) => a.id === l.assetId);
              return {
                ...l,
                x: fitted.x,
                y: fitted.y,
                w: fitted.w,
                h: fitted.h,
                rotation: sceneSlot.rotation,
                useProcessed: Boolean(asset?.processedUrl ?? readCachedCutout(asset?.url)),
              } as Layer;
            }
            return l;
          });
        const next = normalizeSceneFirstLayers([...snapped, bg]).layers;
        layersRef.current = next;
        return next;
      });
      setSelectedSceneId(sceneId);
      selectedSceneIdRef.current = sceneId;
      if (productLayer) setSelectedId(productLayer.id);
      showToast(
        productLayer
          ? `${t("snappedToast")} — ${category.label}`
          : `${t("sceneReadyToast")} · ${category.label}`,
      );
      if (productLayer) void ensureAssetCutout(productLayer.assetId);
    },
    [ensureAssetCutout, readImageNaturalSize, resetTransientStudioState, selected, showToast, t],
  );

  // Industry deep-link: as soon as the gallery is loaded, auto-apply the first
  // sample from the matching category so the user lands with a live scene
  // (no more "pick a scene first" toast blocking their next click).
  useEffect(() => {
    if (!pendingIndustryAutoScene || !gallery) return;
    const matcher = INDUSTRY_MATCHERS[pendingIndustryAutoScene];
    const cat = gallery.categories.find(
      (c) => matcher(c) && (gallery.itemsByCategory[c.id]?.length ?? 0) > 0,
    );
    const item = cat ? gallery.itemsByCategory[cat.id]?.[0] : null;
    if (cat && item) {
      void applyGalleryScene(cat, item);
      setToast(null);
      setMobileSheet(null);
    }
    setPendingIndustryAutoScene(null);
  }, [pendingIndustryAutoScene, gallery, applyGalleryScene]);


  /* ---------- Canvas transforms: drag / resize / rotate ---------- */
  type TransformState =
    | {
        mode: "drag";
        id: string;
        startX: number;
        startY: number;
        layerX: number;
        layerY: number;
      }
    | {
        mode: "resize";
        id: string;
        corner: "nw" | "ne" | "sw" | "se";
        startX: number;
        startY: number;
        layerX: number;
        layerY: number;
        layerW: number;
        layerH: number;
        aspect: number;
        rotation: number;
      }
    | {
        mode: "rotate";
        id: string;
        centerX: number;
        centerY: number;
        startAngle: number;
        layerRotation: number;
      };
  const transformState = useRef<TransformState | null>(null);

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    if (layer.locked) return;
    e.preventDefault();
    setSelectedId(layer.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    transformState.current = {
      mode: "drag",
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      layerX: layer.x,
      layerY: layer.y,
    };
  };

  const onHandlePointerDown = (
    e: React.PointerEvent,
    layer: Layer,
    handle: "nw" | "ne" | "sw" | "se" | "rotate",
  ) => {
    if (layer.locked) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(layer.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (handle === "rotate") {
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const cx = (canvasBounds?.left ?? 0) + layer.x + layer.w / 2;
      const cy = (canvasBounds?.top ?? 0) + layer.y + layer.h / 2;
      const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
      transformState.current = {
        mode: "rotate",
        id: layer.id,
        centerX: cx,
        centerY: cy,
        startAngle,
        layerRotation: layer.rotation,
      };
    } else {
      transformState.current = {
        mode: "resize",
        id: layer.id,
        corner: handle,
        startX: e.clientX,
        startY: e.clientY,
        layerX: layer.x,
        layerY: layer.y,
        layerW: layer.w,
        layerH: layer.h,
        aspect: layer.w / Math.max(1, layer.h),
        rotation: layer.rotation,
      };
    }
  };

  const applyLayerTransform = useCallback((clientX: number, clientY: number) => {
    const s = transformState.current;
    if (!s) return;
    if (s.mode === "drag") {
      const dx = clientX - s.startX;
      const dy = clientY - s.startY;
      updateLayer(s.id, { x: s.layerX + dx, y: s.layerY + dy } as Partial<Layer>);
      return;
    }
    if (s.mode === "rotate") {
      const angle = (Math.atan2(clientY - s.centerY, clientX - s.centerX) * 180) / Math.PI;
      const next = s.layerRotation + (angle - s.startAngle);
      updateLayer(s.id, { rotation: next } as Partial<Layer>);
      return;
    }
    // resize — inverse-rotate the screen delta into the layer's local space so
    // corners feel natural even when the layer is rotated.
    const rad = (s.rotation * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const dxScreen = clientX - s.startX;
    const dyScreen = clientY - s.startY;
    const dxLocal = dxScreen * cos - dyScreen * sin;
    const dyLocal = dxScreen * sin + dyScreen * cos;

    const signX = s.corner === "ne" || s.corner === "se" ? 1 : -1;
    const signY = s.corner === "sw" || s.corner === "se" ? 1 : -1;

    // Maintain aspect ratio via the dominant axis.
    const propW = Math.max(20, s.layerW + signX * dxLocal);
    const propH = Math.max(20, s.layerH + signY * dyLocal);
    const scaleW = propW / s.layerW;
    const scaleH = propH / s.layerH;
    const scale = Math.max(scaleW, scaleH);
    const newW = Math.max(20, s.layerW * scale);
    const newH = Math.max(20, s.layerH * scale);

    // Keep the opposite corner anchored (in screen space) so resize feels stable.
    const dxAnchor = (newW - s.layerW) * (signX === -1 ? -1 : 0);
    const dyAnchor = (newH - s.layerH) * (signY === -1 ? -1 : 0);
    updateLayer(s.id, {
      w: newW,
      h: newH,
      x: s.layerX + dxAnchor,
      y: s.layerY + dyAnchor,
    } as Partial<Layer>);
  }, [updateLayer]);

  const onLayerPointerMove = (e: React.PointerEvent) => {
    if (!transformState.current) return;
    e.preventDefault();
    applyLayerTransform(e.clientX, e.clientY);
  };

  const onLayerPointerUp = () => {
    transformState.current = null;
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!transformState.current) return;
      event.preventDefault();
      applyLayerTransform(event.clientX, event.clientY);
    };
    const end = () => {
      transformState.current = null;
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [applyLayerTransform]);

  /* ---------- URL param bridge: /studio?tool=... or ?panel=... or ?industry=... ---------- */
  useEffect(() => {
    if (search.panel === "samples" || search.panel === "templates" || search.industry) {
      resetTransientStudioState();
      snapRequestRef.current++;
    }
    if (search.panel === "samples") {
      // Samples paneli tamamen kaldırıldı — kullanıcıyı doğrudan Templates'e yönlendir.
      setLibraryTab("templates");
      setMobileSheet("library");
    }
    if (search.panel === "templates") {
      setLibraryTab("templates");
      setMobileSheet("library");
    }
    if (search.industry) {
      // Industries menüsü de artık Templates üzerinden çalışıyor.
      setLibraryTab("templates");
      setMobileSheet("library");
      setIndustryFilter(search.industry);
      setPendingIndustryAutoScene(search.industry);
    }

    if (search.panel === "pricing") {
      // Route back to landing pricing anchor
      window.location.href = "/?view=pricing";
      return;
    }
    if (search.panel === "brand") {
      window.location.href = "/brand";
      return;
    }
    if (search.tool) {
      setActiveTool(search.tool);
      const label =
        search.tool === "bg-remove"
          ? "Ürün seç — arka planı temizle"
          : search.tool === "ai-enhance" || search.tool === "upscale"
            ? "Ürün seç — HD hazırla"
            : search.tool === "virtual-tryon"
              ? "Model ön izleme paneli hazır"
              : (PANEL_TITLES as Record<string,string>)[search.tool] ?? "Araç hazır";
      showToast(label);
      if (search.tool === "virtual-tryon") openVirtualTryOn();
      // Panel-tabanlı araçlar için sol drawer'ı aç
      const PANEL_TOOLS = ["ai-photoshoot","ai-background","upscale","erase-brush","ai-edit","shadows","light-fix","resize-expand","blur-bg","add-text"];
      if (PANEL_TOOLS.includes(search.tool)) setDrawerOpen(true);
      // clear tool query so re-visits don't re-trigger (keep industry/panel for filter chip)
      void navigate({
        to: "/studio",
        search: { panel: search.panel, industry: search.industry },
        replace: true,
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tool, search.panel, search.industry, resetTransientStudioState]);


  /* ---------- Render ---------- */
  return (
    <>
    <div
      className="studio-scope fixed inset-0 flex flex-col overflow-hidden bg-[#f5f7fa] text-slate-800"
      style={{ colorScheme: "light", height: "100dvh" }}
    >
      <TopNav />
      <StudioStyles />

      {/* Top bar — pinned on both desktop and mobile */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md md:px-5">
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900">BGRemovify <span className="font-normal text-slate-400">/ Studio</span></div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {isGuest && (
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 md:inline-flex">
              <Info className="h-3 w-3 text-slate-400" /> {t("guestMode")}
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!hasScene}
            title={hasScene ? t("uploadImage") : t("sceneFirstToast")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:gap-2 md:px-3 md:text-[12.5px]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("uploadImage")}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || layers.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1d6bff] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm shadow-[#1d6bff]/20 transition hover:bg-[#155ce8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            title={t("createTitle")}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{t("createBtn")}</span>
          </button>
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            title={rightPanelOpen ? "Katmanları gizle" : "Katmanları göster"}
            className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            {rightPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
          </button>
          <LanguageSelector />
          <SessionPill currentPath="/studio" />
        </div>
      </header>

      {/* Thin announcement strip (moved from mid-canvas) */}
      {hasScene && !layers.some((l) => l.kind === "image") && !busy && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-medium text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("sceneReadyBanner")}
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Hidden file input (always mounted) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        {/* Hidden input for custom template uploads (My templates) */}
        <input
          ref={customTplInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addCustomTemplateFromFile(f);
            e.currentTarget.value = "";
          }}
        />

        {/* Left icon rail — Claid 1:1 layout */}
        <nav className="hidden w-16 shrink-0 flex-col items-stretch gap-0.5 overflow-y-auto border-r border-slate-200/80 bg-white py-3 md:flex">
          <RailItem
            icon={Upload}
            label={t("uploadImage")}
            variant="primary"
            onClick={() => hasScene ? fileInputRef.current?.click() : showToast(t("sceneFirstToast"))}
            disabled={!hasScene}
          />
          <RailDivider />

          {/* Helper to toggle a parameter-drawer tool */}
          {(() => null)()}
          {/* 1. Improve quality & Upscale */}
          <RailItem
            icon={ArrowUpRight}
            label={t("railEnhance")}
            active={activeTool === "upscale"}
            onClick={() => {
              if (activeTool === "upscale" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("upscale"); setDrawerOpen(true); }
            }}
          />
          {/* 2. Remove background — opens Claid-style parameter drawer */}
          <RailItem icon={Eraser} label={t("railBgRemove")} active={activeTool === "bg-remove"} onClick={removeBgAI} />
          {/* 3. AI Photoshoot */}
          <RailItem
            icon={Camera}
            label={t("railPhotoshoot")}
            active={activeTool === "ai-photoshoot"}
            onClick={() => {
              if (activeTool === "ai-photoshoot" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("ai-photoshoot"); setDrawerOpen(true); }
            }}
          />
          {/* 4. AI Background (templates) */}
          <RailItem
            icon={LayersIcon}
            label={t("railBackground")}
            active={activeTool === "ai-background"}
            onClick={() => {
              if (activeTool === "ai-background" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("ai-background"); setLibraryTab("templates"); setDrawerOpen(true); }
            }}
          />
          {/* 5. AI Fashion Models → Virtual try-on (moved to top group) */}
          <RailItem icon={Users} label={t("railTryOn")} active={activeTool === "virtual-tryon"} onClick={openVirtualTryOn} />

          {/* 5. Erase brush */}
          <RailItem
            icon={Brush}
            label="Erase brush"
            active={activeTool === "erase-brush"}
            onClick={() => {
              if (activeTool === "erase-brush" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("erase-brush"); setDrawerOpen(true); }
            }}
          />
          {/* 6. AI Edit */}
          <RailItem
            icon={Wand2}
            label="AI Edit"
            active={activeTool === "ai-edit"}
            onClick={() => {
              if (activeTool === "ai-edit" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("ai-edit"); setDrawerOpen(true); }
            }}
          />
          {/* 7. Shadows */}
          <RailItem
            icon={Sun}
            label="Add shadows"
            active={activeTool === "shadows"}
            onClick={() => {
              if (activeTool === "shadows" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("shadows"); setDrawerOpen(true); }
            }}
          />
          {/* 8. Fix light & colors */}
          <RailItem
            icon={SlidersHorizontal}
            label="Fix light & colors"
            active={activeTool === "light-fix"}
            onClick={() => {
              if (activeTool === "light-fix" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("light-fix"); setDrawerOpen(true); }
            }}
          />
          {/* 9. Resize & Expand */}
          <RailItem
            icon={Crop}
            label="Resize & Expand"
            active={activeTool === "resize-expand"}
            onClick={() => {
              if (activeTool === "resize-expand" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("resize-expand"); setDrawerOpen(true); }
            }}
          />
          {/* 10. Blur background */}
          <RailItem
            icon={Droplets}
            label="Blur background"
            active={activeTool === "blur-bg"}
            onClick={() => {
              if (activeTool === "blur-bg" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("blur-bg"); setDrawerOpen(true); }
            }}
          />


          <RailDivider />
          {/* 11. Add text & badges */}
          <RailItem
            icon={TypeIcon}
            label="Add text"
            active={activeTool === "add-text"}
            onClick={() => {
              if (activeTool === "add-text" && drawerOpen) { setDrawerOpen(false); setActiveTool("select"); }
              else { setActiveTool("add-text"); setDrawerOpen(true); }
            }}
          />
          {/* 12. AI Fashion Models moved to top group */}


          <RailDivider />
          <div className="relative">
            <RailItem
              icon={Square}
              label={t("shape")}
              active={shapePickerOpen}
              onClick={() => setShapePickerOpen((v) => !v)}
            />
            {shapePickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShapePickerOpen(false)} />
                <div className="absolute left-full top-0 z-40 ml-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t("shape")}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {SHAPE_PRESETS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => { addShape(s.id); setShapePickerOpen(false); }}
                          className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-medium text-slate-600 transition hover:border-[#1d6bff] hover:bg-[#1d6bff]/[0.05] hover:text-[#1d6bff]"
                          title={s.name}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <RailItem icon={FolderOpen} label={t("tabUploads")}
            active={drawerOpen && libraryTab === "uploads"}
            onClick={() => {
              if (drawerOpen && libraryTab === "uploads") setDrawerOpen(false);
              else { setLibraryTab("uploads"); setDrawerOpen(true); }
            }}
          />
          <RailItem icon={MousePointer2} label={t("select")} active={activeTool === "select"} onClick={() => setActiveTool("select")} />
        </nav>


        {/* Contextual drawer */}
        {drawerOpen && (
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-slate-200/80 bg-white md:flex lg:w-[340px] xl:w-[360px] 2xl:w-[380px]">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {activeTool === "bg-remove" && (<><Eraser className="h-3.5 w-3.5" /> {t("railBgRemove")}</>)}
              {activeTool === "ai-photoshoot" && (<><Camera className="h-3.5 w-3.5" /> {t("railPhotoshoot")}</>)}
              {activeTool === "ai-background" && (<><LayersIcon className="h-3.5 w-3.5" /> {t("railBackground")}</>)}
              {PANEL_TITLES[activeTool] && (<><PanelIcon tool={activeTool} /> {PANEL_TITLES[activeTool]}</>)}
              {activeTool !== "bg-remove" && activeTool !== "ai-photoshoot" && activeTool !== "ai-background" && !PANEL_TITLES[activeTool] && libraryTab === "uploads" && (<><FolderOpen className="h-3.5 w-3.5" /> {t("tabUploads")}</>)}
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Collapse"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {activeTool === "bg-remove" ? (
              <BgRemovePanel
                mode={bgMode}
                setMode={setBgMode}
                background={bgBackground}
                setBackground={setBgBackground}
                color={bgColor}
                setColor={setBgColor}
                clipping={bgClipping}
                setClipping={setBgClipping}
                car={bgCar}
                setCar={setBgCar}
                paddingEnabled={bgPaddingEnabled}
                setPaddingEnabled={setBgPaddingEnabled}
                paddingUnit={bgPaddingUnit}
                setPaddingUnit={setBgPaddingUnit}
                paddingValue={bgPaddingValue}
                setPaddingValue={setBgPaddingValue}
                onApply={applyBgRemoval}
                canApply={
                  Boolean((selected && selected.kind === "image") || layers.some((l) => l.kind === "image"))
                }
                busy={Boolean(busy)}
                t={t}
              />
            ) : activeTool === "ai-photoshoot" ? (
              <AIPhotoshootPanel
                aspect={psAspect}
                setAspect={setPsAspect}
                mode={psMode}
                setMode={setPsMode}
                prompt={psPrompt}
                setPrompt={setPsPrompt}
                count={psCount}
                setCount={setPsCount}
                busy={Boolean(busy)}
                onApply={applyAIPhotoshoot}
                t={t}
              />
            ) : activeTool === "ai-background" ? (
              <TemplatesPanel
                tab={templatesTab}
                setTab={setTemplatesTab}
                category={templatesCategory}
                setCategory={setTemplatesCategory}
                templates={SNAP_TEMPLATES}
                assets={assets}
                onPickTemplate={(tpl, _cfg) => void applyTemplate(tpl)}
                onPickAsset={(a) => addImageToCanvas(a)}
                onChooseFile={() => fileInputRef.current?.click()}
                templateName={templateName}
                industryFilter={industryFilter}
                industryLabel={industryFilter ? industryLabel(industryFilter) : null}
                onClearIndustry={() => { requestIndustryChange(null); }}
                customTemplates={customTemplates}
                onUploadCustomTemplate={() => customTplInputRef.current?.click()}
                onPickCustomTemplate={(c) => pickCustomTemplateAsLayer(c)}
                onDeleteCustomTemplate={deleteCustomTemplate}
                customCategory={customTplCategory}
                setCustomCategory={setCustomTplCategory}
                t={t}
              />
            ) : activeTool === "upscale" ? (
              <UpscalePanel busy={Boolean(busy)} onApply={() => retouchAI()} />
            ) : activeTool === "erase-brush" ? (
              <EraseBrushPanel busy={Boolean(busy)} onApply={() => showToast("Erase brush — çok yakında aktif")} />
            ) : activeTool === "ai-edit" ? (
              <AIEditPanel busy={Boolean(busy)} onApply={() => showToast("AI Edit — çok yakında aktif")} />
            ) : activeTool === "shadows" ? (
              <ShadowsPanel busy={Boolean(busy)} onApply={() => showToast("Shadows — çok yakında aktif")} />
            ) : activeTool === "light-fix" ? (
              <LightFixPanel busy={Boolean(busy)} onApply={() => showToast("Light fix — çok yakında aktif")} />
            ) : activeTool === "resize-expand" ? (
              <ResizeExpandPanel busy={Boolean(busy)} onApply={() => showToast("Resize & Expand — çok yakında aktif")} />
            ) : activeTool === "blur-bg" ? (
              <BlurBackgroundPanel busy={Boolean(busy)} onApply={() => showToast("Blur background — çok yakında aktif")} />
            ) : activeTool === "add-text" ? (
              <TextPresetsPanel
                onAddBlank={() => addText()}
                onAddCustomText={(text, color) => addText({
                  text,
                  fontSize: text.length > 42 ? 26 : 38,
                  color: color ?? "#0f172a",
                  weight: 800,
                  w: Math.min(620, Math.max(260, text.length * 16)),
                  h: text.length > 42 ? 108 : 72,
                })}
                onAddText={(p: TextPresetSpec) => addText(p)}
                onAddBadge={(b: BadgePresetSpec) => addBadge(b)}
                mockupPresets={GHOST_PRESETS.map((p) => ({ id: p.id, label: p.label, emoji: p.emoji, thumbUrl: p.thumbUrl }))}
                mockupUploads={customTemplates.map((c) => ({ id: c.id, label: c.name, thumbUrl: c.url }))}
                onPickMockupPreset={(id) => {
                  const p = GHOST_PRESETS.find((x) => x.id === id);
                  if (!p) return;
                  void applyTemplate({
                    id: p.id,
                    name: p.label,
                    emoji: p.emoji,
                    category: "minimal",
                    background: `url("${p.url}") center/contain no-repeat, #ffffff`,
                    slot: { xPct: 22, yPct: 28, wPct: 56, hPct: 44, rotation: 0 },
                    swatch: `url("${p.thumbUrl}") center/cover`,
                  });
                }}
                onUploadMockup={(f) => addCustomTemplateFromFile(f)}
                onPickMockupUpload={(id) => {
                  const match = customTemplates.find((c) => c.id === id);
                  if (match) pickCustomTemplateAsLayer(match);
                }}
                onDeleteMockupUpload={(id) => deleteCustomTemplate(id)}
              />

            ) : libraryTab === "uploads" ? (
              assets.length === 0 ? (
                <EmptyUploads onClick={() => fileInputRef.current?.click()} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {assets.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => addImageToCanvas(a)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:border-[#1d6bff] hover:shadow-sm"
                      title={a.name}
                    >
                      <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-left text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                        {a.name}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <TemplatesPanel
                tab={templatesTab}
                setTab={setTemplatesTab}
                category={templatesCategory}
                setCategory={setTemplatesCategory}
                templates={SNAP_TEMPLATES}
                assets={assets}
                onPickTemplate={(tpl, _cfg) => void applyTemplate(tpl)}
                onPickAsset={(a) => addImageToCanvas(a)}
                onChooseFile={() => fileInputRef.current?.click()}
                templateName={templateName}
                industryFilter={industryFilter}
                industryLabel={industryFilter ? industryLabel(industryFilter) : null}
                onClearIndustry={() => { requestIndustryChange(null); }}
                customTemplates={customTemplates}
                onUploadCustomTemplate={() => customTplInputRef.current?.click()}
                onPickCustomTemplate={(c) => pickCustomTemplateAsLayer(c)}
                onDeleteCustomTemplate={deleteCustomTemplate}
                customCategory={customTplCategory}
                setCustomCategory={setCustomTplCategory}
                t={t}
              />
            )}



          </div>
        </aside>
        )}


        {/* Center canvas */}
        <main className="relative flex min-w-0 flex-1 flex-col items-stretch bg-[#eef2f6] px-3 py-3 md:px-6 md:py-4">
          {/* Toolbar row 1: Format (left) — Delete template (right) */}
          <div className="relative mb-2 flex items-center justify-between gap-3">
            <MarketplaceFormatMenu />
            <div className="flex items-center gap-1">
              {activeBgLayer && (
                <button
                  type="button"
                  onClick={clearTemplate}
                  title={t("removeTemplateTitle")}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("removeTemplate")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Toolbar row 2: color palette + product/layer controls + history */}
          <div className="relative mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                // Recolor pipeline only works reliably on isolated objects
                // (mug, bag, hoodie flatlay). Skin/face renders leak color,
                // so we hide the color palette + part selector for humans.
                const tpl = activeBgLayer
                  ? SNAP_TEMPLATES.find((t) => t.id === activeBgLayer.templateId)
                  : null;
                const isHumans = tpl?.category === "humans" || tpl?.category === "bust";
                if (!activeBgLayer || isHumans) return null;
                return (
                  <>
                    <ProductColorBar bg={activeBgLayer} onChange={updateActiveBackground} />
                    {activeBgLayer.tintParts?.length ? (
                      <PartSelector bg={activeBgLayer} onChange={updateActiveBackground} />
                    ) : null}
                  </>
                );
              })()}
            </div>


            <div className="flex items-center gap-1">
              {(() => {
                const productLayer = layers.find((l) => l.kind === "image") as ImageLayer | undefined;
                if (!productLayer) return null;
                const scaleProduct = (factor: number) => {
                  setLayers((prev) => prev.map((l) => {
                    if (l.kind !== "image" || l.id !== productLayer.id) return l;
                    const newW = Math.max(30, Math.min(4000, l.w * factor));
                    const newH = Math.max(30, Math.min(4000, l.h * factor));
                    return {
                      ...l,
                      w: newW,
                      h: newH,
                      x: l.x + (l.w - newW) / 2,
                      y: l.y + (l.h - newH) / 2,
                    };
                  }));
                };
                return (
                  <>
                    <div
                      className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white"
                      title="Resize product"
                    >
                      <button
                        type="button"
                        onClick={() => scaleProduct(0.9)}
                        className="px-2 py-1 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                        aria-label="Shrink product"
                      >
                        −
                      </button>
                      <span className="border-x border-slate-200 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Size
                      </span>
                      <button
                        type="button"
                        onClick={() => scaleProduct(1.1)}
                        className="px-2 py-1 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                        aria-label="Enlarge product"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title={t("replaceProduct")}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#1d6bff] hover:text-[#1d6bff]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("replaceProduct")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLayers((prev) => prev.filter((l) => l.kind !== "image"));
                        setSelectedId(null);
                      }}
                      title={t("removeProduct")}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-400 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("removeProduct")}</span>
                    </button>
                    <span className="mx-1 h-4 w-px bg-slate-200" />
                  </>
                );
              })()}
              {selectedImageLayer && (
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/90 px-1.5 py-1 shadow-sm">
                  <span className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                    Try-On Transform
                  </span>
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedImageLayer.id, { bend: Math.max(-60, (selectedImageLayer.bend ?? 0) - 10) } as Partial<Layer>)}
                    className="rounded-md bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                  >
                    Bend −
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedImageLayer.id, { bend: Math.min(60, (selectedImageLayer.bend ?? 0) + 10) } as Partial<Layer>)}
                    className="rounded-md bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                  >
                    Bend +
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedImageLayer.id, { skewX: Math.max(-45, (selectedImageLayer.skewX ?? 0) - 5) } as Partial<Layer>)}
                    className="rounded-md bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                  >
                    Skew X
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedImageLayer.id, { skewY: Math.min(45, (selectedImageLayer.skewY ?? 0) + 5) } as Partial<Layer>)}
                    className="rounded-md bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                  >
                    Skew Y
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedImageLayer.id, { flipH: !selectedImageLayer.flipH } as Partial<Layer>)}
                    className="rounded-md bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                  >
                    Flip H
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedImageLayer.id, { flipV: !selectedImageLayer.flipV } as Partial<Layer>)}
                    className="rounded-md bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                  >
                    Flip V
                  </button>
                </div>
              )}
              {selected && !selected.locked && (
                <IconChip
                  icon={Trash2}
                  onClick={deleteSelectedLayer}
                  tone="danger"
                  title={selected.groupId ? "Delete badge group" : "Delete selected layer"}
                />
              )}
              <IconChip icon={Undo2} onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" />
              <IconChip icon={Redo2} onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" />
            </div>
          </div>




          <div className="relative flex min-h-0 flex-1 items-center justify-center">


            <div
              ref={canvasRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onPointerMove={onLayerPointerMove}
              onPointerUp={onLayerPointerUp}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
              className="canvas-checker group/canvas relative max-h-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]"
              style={{
                aspectRatio: marketplace.aspect,
                // Fit inside the available area without stretching the image
                height: marketplace.ratio >= 1 ? "auto" : "100%",
                width: marketplace.ratio >= 1 ? "100%" : "auto",
                touchAction: "none",
              }}
            >


            {layers.length === 0 && !busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <button
                  type="button"
                  onClick={() => hasScene ? fileInputRef.current?.click() : showToast(t("sceneFirstToast"))}
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-xl px-6 py-4 text-slate-400 transition hover:bg-slate-50/70"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d6bff]/10 text-[#1d6bff]">
                    <ImageIcon className="h-7 w-7 stroke-[1.4]" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {t("canvasStep")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {hasScene ? t("clickToUpload") : <span className="font-semibold text-[#1d6bff]">{t("tabTemplates")}</span>}
                  </div>
                </button>
                {hasScene && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      or try a sample
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {QUICK_ASSETS.map((qa) => (
                        <button
                          key={qa.id}
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(qa.url);
                              const blob = await res.blob();
                              const file = new File([blob], `${qa.id}.jpg`, { type: blob.type || "image/jpeg" });
                              const dt = new DataTransfer();
                              dt.items.add(file);
                              handleFiles(dt.files);
                            } catch (e) {
                              console.error("[quick-asset] load failed", e);
                            }
                          }}
                          className="group flex flex-col items-center gap-1"
                          title={qa.label}
                        >
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition group-hover:border-[#1d6bff] group-hover:shadow-md">
                            <img src={qa.url} alt={qa.label} className="h-full w-full object-cover" />
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 group-hover:text-[#1d6bff]">{qa.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Layers rendered bottom→top means we reverse (first in array is top-most in the layers panel) */}
            {[...layers].reverse().map((layer) => (
              <LayerNode
                key={layer.id}
                layer={layer}
                asset={layer.kind === "image" ? assets.find((a) => a.id === layer.assetId) : undefined}
                selected={selectedId === layer.id}
                editing={editingTextId === layer.id}
                onPointerDown={onLayerPointerDown}
                onHandleDown={onHandlePointerDown}
                onDelete={deleteLayer}
                onStartEditText={(id) => {
                  setSelectedId(id);
                  setEditingTextId(id);
                }}
                onCommitText={(id, text) => {
                  updateLayer(id, { text } as Partial<Layer>);
                  setEditingTextId(null);
                }}
              />
            ))}

            {busy && <ScanLoader label={busy.label} />}
          </div>
          </div>
        </main>

        {/* Right panel (Layers + Properties) — hidden by default for a cleaner canvas */}
        {rightPanelOpen && (
        <aside className="hidden w-[280px] shrink-0 flex-col border-l border-slate-200/80 bg-white md:flex lg:w-[300px] xl:w-[320px]">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/70">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <LayersIcon className="h-3 w-3" /> {t("layers")}
            </div>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{layers.length}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {layers.length === 0 ? (
              <div className="mx-2 mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11.5px] leading-relaxed text-slate-400">
                {t("noLayers")}
              </div>
            ) : (
              <ul className="space-y-1">
                {layers.map((l, i) => (
                  <LayerRow
                    key={l.id}
                    layer={l}
                    asset={l.kind === "image" ? assets.find((a) => a.id === l.assetId) : undefined}
                    selected={selectedId === l.id}
                    canUp={i > 0}
                    canDown={i < layers.length - 1}
                    onSelect={() => setSelectedId(l.id)}
                    onToggleVisible={() => updateLayer(l.id, { visible: !l.visible })}
                    onDelete={() => deleteLayer(l.id)}
                    onUp={() => moveLayer(l.id, -1)}
                    onDown={() => moveLayer(l.id, 1)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200/70 p-3">
            <BackgroundPanel
              bg={activeBgLayer}
              onChange={updateActiveBackground}
            />
          </div>

          <div className="border-t border-slate-200/70 p-3">
            <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t("properties")}</div>
            <PropertiesPanel
              layer={selected}
              onChange={(patch) => selected && updateLayer(selected.id, patch)}
            />
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 text-[10.5px] font-medium text-slate-500">
          <button
            onClick={() => hasScene ? fileInputRef.current?.click() : showToast(t("sceneFirstToast"))}
            className={`flex flex-col items-center gap-1 py-2.5 ${hasScene ? "" : "text-slate-300"}`}
          >
            <Upload className="h-5 w-5" />
            {t("mobUpload")}
          </button>
          <button
            onClick={() => {
              resetTransientStudioState();
              setMobileSheet(mobileSheet === "library" ? null : "library");
            }}
            className={`flex flex-col items-center gap-1 py-2.5 ${mobileSheet === "library" ? "text-[#1d6bff]" : ""}`}
          >
            <ImageIcon className="h-5 w-5" />
            {t("mobLibrary")}
          </button>
          <button
            onClick={() => setMobileSheet(mobileSheet === "layers" ? null : "layers")}
            className={`flex flex-col items-center gap-1 py-2.5 ${mobileSheet === "layers" ? "text-[#1d6bff]" : ""}`}
          >
            <LayersIcon className="h-5 w-5" />
            {t("mobLayers")}
          </button>
          <button
            onClick={() => setMobileSheet(mobileSheet === "properties" ? null : "properties")}
            className={`flex flex-col items-center gap-1 py-2.5 ${mobileSheet === "properties" ? "text-[#1d6bff]" : ""}`}
          >
            <Wand2 className="h-5 w-5" />
            {t("mobEdit")}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Mobile bottom sheet */}
      {mobileSheet && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSheet(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-24 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            {mobileSheet === "library" && (
              <div>
                <div className="mb-3 flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["templates", "uploads"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLibraryTab(tab)}
                      className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] ${
                        libraryTab === tab ? "border-[#1d6bff] text-[#1d6bff]" : "border-transparent text-slate-500"
                      }`}
                    >
                      {tab === "templates" ? t("tabTemplates") : t("tabUploads")}
                    </button>
                  ))}
                </div>

                {libraryTab === "templates" ? (
                  <div className="space-y-3">
                    <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden px-1 pb-3 scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
                      {(industryFilter
                        ? SNAP_TEMPLATES.filter((tpl) => (INDUSTRY_TEMPLATE_IDS[industryFilter] as ReadonlyArray<string>).includes(tpl.id))
                        : SNAP_TEMPLATES
                      ).map((tpl) => (

                        <button
                          key={tpl.id}
                          onClick={() => {
                            void applyTemplate(tpl);
                            setMobileSheet(null);
                          }}
                          className="w-28 shrink-0 snap-start overflow-hidden rounded-lg border border-slate-200 bg-white text-left"
                        >
                          {TEMPLATE_THUMBS[tpl.id] ? (
                            <img
                              src={TEMPLATE_THUMBS[tpl.id]}
                              alt={tpl.name}
                              loading="lazy"
                              width={512}
                              height={512}
                              className="aspect-square h-full w-full object-cover"
                            />
                          ) : (
                            <div className="aspect-square" style={{ background: tpl.background }} />
                          )}

                          <div className="truncate px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                            {tpl.emoji} {templateName(tpl.id, tpl.name)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {assets.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            addImageToCanvas(a);
                            setMobileSheet(null);
                          }}
                          className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        >
                          <img src={a.url} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    {assets.length === 0 && (
                      <div className="py-6 text-center text-[12px] text-slate-400">
                        {t("noUploads")}
                      </div>
                    )}
                  </>
                )}

              </div>
            )}
            {mobileSheet === "layers" && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("layers")} ({layers.length})
                </div>
                {layers.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-slate-400">{t("noLayers")}</div>
                ) : (
                  <ul className="space-y-1">
                    {layers.map((l, i) => (
                      <LayerRow
                        key={l.id}
                        layer={l}
                        asset={l.kind === "image" ? assets.find((a) => a.id === l.assetId) : undefined}
                        selected={selectedId === l.id}
                        canUp={i > 0}
                        canDown={i < layers.length - 1}
                        onSelect={() => setSelectedId(l.id)}
                        onToggleVisible={() => updateLayer(l.id, { visible: !l.visible })}
                        onDelete={() => deleteLayer(l.id)}
                        onUp={() => moveLayer(l.id, -1)}
                        onDown={() => moveLayer(l.id, 1)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
            {mobileSheet === "properties" && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Properties
                </div>
                <BackgroundPanel bg={activeBgLayer} onChange={updateActiveBackground} />
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={removeBgAI}
                    className="rounded-lg border border-rose-200 bg-rose-50 py-2 text-[11px] font-semibold text-rose-700"
                  >
                    <Eraser className="mx-auto mb-1 h-4 w-4" /> Smart Sel.
                  </button>
                  <button
                    onClick={retouchAI}
                    className="rounded-lg border border-sky-200 bg-sky-50 py-2 text-[11px] font-semibold text-sky-700"
                  >
                    <Wand2 className="mx-auto mb-1 h-4 w-4" /> Retouch
                  </button>
                  <button
                    onClick={openVirtualTryOn}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-[11px] font-semibold text-emerald-700"
                  >
                    <Shirt className="mx-auto mb-1 h-4 w-4" /> Try-On
                  </button>

                </div>
                <PropertiesPanel
                  layer={selected}
                  onChange={(patch) => selected && updateLayer(selected.id, patch)}
                />
              </div>
            )}
          </div>
        </div>
      )}

        </aside>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      

      {tryOnOpen && (
        <VirtualTryOnModal
          onClose={() => setTryOnOpen(false)}
          onGenerate={runVirtualTryOn}
          onAddToCanvas={addTryOnToCanvas}
          busy={Boolean(busy && busy.label.startsWith("Virtual Try-On"))}
        />
      )}

    </div>
    </>
  );
}


/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function StudioStyles() {
  return (
    <style>{`
      .canvas-checker {
        background-image:
          linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
          linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
          linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0;
        background-color: #ffffff;
      }
      .studio-scope button:focus-visible {
        outline: 2px solid #1d6bff;
        outline-offset: 2px;
      }
    `}</style>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Upload;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-medium leading-none transition-all duration-150 ${
        active
          ? "border-[#1d6bff]/70 bg-[#1d6bff]/[0.06] text-[#1d6bff] shadow-[0_1px_2px_rgba(29,107,255,0.08)]"
          : "border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-900"
      }`}
    >
      <Icon className="h-[15px] w-[15px] stroke-[1.75]" />
      <span className="tracking-tight">{label}</span>
    </button>
  );
}

function RailItem({
  icon: Icon,
  label,
  active,
  disabled,
  variant,
  onClick,
}: {
  icon: typeof Upload;
  label: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "primary";
  onClick?: () => void;
}) {
  const primary = variant === "primary";
  const pointerActivatedRef = useRef(false);
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (disabled || !onClick) return;
        e.preventDefault();
        pointerActivatedRef.current = true;
        onClick();
      }}
      onClick={() => {
        if (pointerActivatedRef.current) {
          pointerActivatedRef.current = false;
          return;
        }
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (disabled || !onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`group relative mx-1.5 flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[9.5px] font-medium leading-tight transition ${
        disabled
          ? "cursor-not-allowed text-slate-300"
          : primary
          ? "bg-slate-900 text-white hover:bg-slate-700"
          : active
          ? "bg-[#1d6bff]/10 text-[#1d6bff]"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-[17px] w-[17px] stroke-[1.75] ${primary ? "text-white" : ""}`} />
      <span className="tracking-tight">{label}</span>
    </button>
  );
}

function RailDivider() {
  return <div className="mx-3 my-1.5 h-px bg-slate-200/70" aria-hidden />;
}

function IconChip({
  icon: Icon,
  onClick,
  disabled,
  title,
  tone = "default",
}: {
  icon: typeof Upload;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  tone?: "default" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:hover:bg-rose-50 disabled:hover:text-rose-600"
      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:hover:bg-white disabled:hover:text-slate-500";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function EmptyUploads({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center text-slate-400 transition hover:border-[#1d6bff]/60 hover:bg-[#1d6bff]/[0.03] hover:text-[#1d6bff]"
    >
      <ImageIcon className="h-5 w-5 stroke-[1.75]" />
      <div className="text-[11.5px] font-medium">—</div>
    </button>
  );
}

function BgRemovePanel(props: {
  mode: "general" | "prompted" | "interactive";
  setMode: (m: "general" | "prompted" | "interactive") => void;
  background: "transparent" | "color";
  setBackground: (b: "transparent" | "color") => void;
  color: string;
  setColor: (c: string) => void;
  clipping: boolean;
  setClipping: (v: boolean) => void;
  car: boolean;
  setCar: (v: boolean) => void;
  paddingEnabled: boolean;
  setPaddingEnabled: (v: boolean) => void;
  paddingUnit: "percent" | "px";
  setPaddingUnit: (u: "percent" | "px") => void;
  paddingValue: number;
  setPaddingValue: (n: number) => void;
  onApply: () => void;
  canApply: boolean;
  busy: boolean;
  t: (k: StudioStringKey) => string;
}) {
  const { t } = props;
  const modes: Array<{ id: "general" | "prompted" | "interactive"; label: string; desc: string }> = [
    { id: "general", label: t("bgModeGeneral"), desc: t("bgModeGeneralDesc") },
    { id: "prompted", label: t("bgModePrompted"), desc: t("bgModePromptedDesc") },
    { id: "interactive", label: t("bgModeInteractive"), desc: t("bgModeInteractiveDesc") },
  ];
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {t("bgTitle")}
        </div>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          {t("bgSubtitle")}
        </p>
      </div>

      {/* Mode cards */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{t("bgMode")}</div>
        <div className="grid grid-cols-3 gap-1.5">
          {modes.map((m) => {
            const active = props.mode === m.id;
            const disabled = m.id !== "general";
            return (
              <button
                key={m.id}
                onClick={() => !disabled && props.setMode(m.id)}
                disabled={disabled}
                title={m.desc}
                className={`rounded-lg border px-2 py-2 text-left transition ${
                  active
                    ? "border-[#1d6bff] bg-[#1d6bff]/[0.06]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div className={`text-[11px] font-semibold ${active ? "text-[#1d6bff]" : "text-slate-700"}`}>
                  {m.label}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[9.5px] leading-tight text-slate-500">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Background */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {t("bgBackground")}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => props.setBackground("transparent")}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
              props.background === "transparent"
                ? "border-[#1d6bff] bg-[#1d6bff] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {t("bgTransparent")}
          </button>
          <button
            onClick={() => props.setBackground("color")}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
              props.background === "color"
                ? "border-[#1d6bff] bg-[#1d6bff] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {t("bgColor")}
          </button>
        </div>
        {props.background === "color" && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => props.setColor("")}
              className={`rounded-md border px-2 py-1 text-[10.5px] font-medium ${
                props.color === ""
                  ? "border-[#1d6bff] text-[#1d6bff]"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {t("bgNoColor")}
            </button>
            <input
              type="color"
              value={props.color || "#ffffff"}
              onChange={(e) => props.setColor(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-slate-200"
              aria-label={t("bgColor")}
            />
            <input
              type="text"
              value={props.color}
              onChange={(e) => props.setColor(e.target.value)}
              placeholder="#ffffff"
              className="h-7 w-24 rounded border border-slate-200 px-1.5 text-[11px] font-mono text-slate-700 focus:border-[#1d6bff] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Advanced switches */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{t("bgAdvanced")}</div>
        <BgToggleRow
          label={t("bgClipping")}
          tip={t("bgClippingTip")}
          value={props.clipping}
          onChange={props.setClipping}
        />
        <BgToggleRow
          label={t("bgCar")}
          tip={t("bgCarTip")}
          value={props.car}
          onChange={props.setCar}
        />
      </div>

      {/* Padding */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{t("bgPadding")}</span>
          <button
            onClick={() => props.setPaddingEnabled(!props.paddingEnabled)}
            className={`text-[10.5px] font-medium ${
              props.paddingEnabled ? "text-[#1d6bff]" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {props.paddingEnabled ? t("bgPaddingEnabled") : t("bgPaddingDisabled")}
          </button>
        </div>
        {props.paddingEnabled && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={props.paddingUnit === "percent" ? 100 : 500}
              value={props.paddingValue}
              onChange={(e) => props.setPaddingValue(Math.max(0, Number(e.target.value) || 0))}
              className="h-7 w-20 rounded border border-slate-200 px-2 text-[11px] font-mono text-slate-700 focus:border-[#1d6bff] focus:outline-none"
            />
            <div className="flex overflow-hidden rounded-md border border-slate-200">
              {(["percent", "px"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => props.setPaddingUnit(u)}
                  className={`px-2 py-1 text-[10.5px] font-semibold ${
                    props.paddingUnit === u ? "bg-[#1d6bff] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {u === "percent" ? "%" : "px"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apply */}
      <button
        onClick={props.onApply}
        disabled={!props.canApply || props.busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d6bff] px-3 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#175bd7] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {props.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
        {t("bgApply")}
      </button>
      {!props.canApply && (
        <p className="text-center text-[10.5px] text-slate-400">{t("bgSelectFirst")}</p>
      )}
    </div>
  );
}


function BgToggleRow({
  label,
  tip,
  value,
  onChange,
}: {
  label: string;
  tip: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-700">{label}</span>
        <span title={tip} className="text-slate-400 hover:text-slate-600">
          <Info className="h-3 w-3" />
        </span>
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative h-4 w-7 rounded-full transition ${value ? "bg-[#1d6bff]" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${
            value ? "left-3.5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function LayerNode({
  layer,
  asset,
  selected,
  editing,
  onPointerDown,
  onHandleDown,
  onDelete,
  onStartEditText,
  onCommitText,
}: {
  layer: Layer;
  asset?: MediaAsset;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: React.PointerEvent, layer: Layer) => void;
  onHandleDown: (
    e: React.PointerEvent,
    layer: Layer,
    handle: "nw" | "ne" | "sw" | "se" | "rotate",
  ) => void;
  onDelete: (id: string) => void;
  onStartEditText: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
}) {
  if (!layer.visible) return null;
  const imgWarp = layer.kind === "image" ? (layer as ImageLayer) : null;
  const skewX = imgWarp?.skewX ?? 0;
  const skewY = imgWarp?.skewY ?? 0;
  const flipH = imgWarp?.flipH ? -1 : 1;
  const flipV = imgWarp?.flipV ? -1 : 1;
  const bend = imgWarp?.bend ?? 0;
  const warpTransform = imgWarp
    ? ` skew(${skewX}deg, ${skewY}deg) scale(${flipH}, ${flipV})`
    : "";
  // Bend simulates a soft perspective wrap for try-on items placed on curved surfaces
  // (heads, wrists, chests) — we tilt the image around the X axis in 3D.
  const perspectiveTransform = imgWarp && Math.abs(bend) > 0.5
    ? ` perspective(900px) rotateX(${bend}deg)`
    : "";
  const common: React.CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)${warpTransform}${perspectiveTransform}`,
    transformStyle: imgWarp ? "preserve-3d" : undefined,
    cursor: layer.locked ? "default" : "move",
    outline: selected && !layer.locked ? "2px solid #1d6bff" : "none",
    outlineOffset: 2,
    borderRadius: layer.kind === "bg" || layer.kind === "shape" ? 0 : 4,
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
  };

  const handleDown = (e: React.PointerEvent) => onPointerDown(e, layer);

  const showHandles = selected && !layer.locked && layer.kind !== "bg";
  const showTransformHandles = selected && !layer.locked && layer.kind !== "bg";
  const handles = showHandles ? (
    <>
      <button
        type="button"
        data-export-ignore="true"
        className={`absolute -right-3 -top-10 z-[4] inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-lg transition hover:bg-rose-50 hover:text-rose-700 ${selected ? "opacity-100" : "opacity-70"}`}
        title={layer.groupId ? "Delete badge group" : "Delete layer"}
        aria-label={layer.groupId ? "Delete badge group" : "Delete layer"}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(layer.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {showTransformHandles && (["nw", "ne", "sw", "se"] as const).map((corner) => {
        const pos: React.CSSProperties = {
          position: "absolute",
          width: 18,
          height: 18,
          background: "#fff",
          border: "2px solid #1d6bff",
          borderRadius: 4,
          cursor:
            corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
          zIndex: 3,
          touchAction: "none",
          [corner.includes("n") ? "top" : "bottom"]: -9,
          [corner.includes("w") ? "left" : "right"]: -9,
        };
        return (
          <div
            key={corner}
            style={pos}
            onPointerDown={(e) => onHandleDown(e, layer, corner)}
          />
        );
      })}
      {showTransformHandles && (
        <>
          {/* Rotate handle above top-center */}
          <div
            style={{
              position: "absolute",
              top: -32,
              left: "50%",
              width: 20,
              height: 20,
              marginLeft: -10,
              background: "#fff",
              border: "2px solid #1d6bff",
              borderRadius: 999,
              cursor: "grab",
              zIndex: 3,
              touchAction: "none",
            }}
            onPointerDown={(e) => onHandleDown(e, layer, "rotate")}
          />
          <div
            style={{
              position: "absolute",
              top: -18,
              left: "50%",
              width: 1,
              height: 14,
              marginLeft: -0.5,
              background: "#1d6bff",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </>
  ) : null;

  if (layer.kind === "bg") {
    const bg = layer as BgLayer;
    const blur = bg.blur ?? 0;
    const hasTint = Boolean(bg.tint);
    const activePart =
      bg.activeTintPartId && bg.tintParts
        ? bg.tintParts.find((p) => p.id === bg.activeTintPartId) ?? null
        : null;
    const tintStyle: React.CSSProperties = activePart
      ? {
          position: "absolute",
          left: `${activePart.xPct}%`,
          top: `${activePart.yPct}%`,
          width: `${activePart.wPct}%`,
          height: `${activePart.hPct}%`,
          background: bg.tint,
          opacity: bg.tintOpacity ?? 0.38,
          mixBlendMode: (bg.tintMode ?? "multiply") as React.CSSProperties["mixBlendMode"],
          pointerEvents: "none",
        }
      : {
          position: "absolute",
          inset: 0,
          background: bg.tint,
          opacity: bg.tintOpacity ?? 0.38,
          mixBlendMode: (bg.tintMode ?? "multiply") as React.CSSProperties["mixBlendMode"],
          pointerEvents: "none",
        };
    // When a part is targeted, don't paint the raw bg tint on the wrapper —
    // that would leak color across the whole scene.
    const wrapperBg = hasTint && !activePart ? bg.tint : "transparent";
    return (
      <div
        style={{ ...common, overflow: "hidden", background: wrapperBg }}
        onPointerDown={handleDown}
      >
        <div
          style={{
            position: "absolute",
            inset: blur > 0 ? -blur * 2 : 0,
            background: bg.background,
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
            transform: blur > 0 ? "scale(1.04)" : undefined,
          }}
        />
        {hasTint && <div style={tintStyle} />}
      </div>
    );
  }

  if (layer.kind === "image" && asset) {
    const src = layer.useProcessed && asset.processedUrl ? asset.processedUrl : asset.url;
    return (
      <div style={common} onPointerDown={handleDown}>
        <img src={src} alt={layer.name} draggable={false} className="pointer-events-none h-full w-full object-contain" />
        {handles}
      </div>
    );
  }
  if (layer.kind === "text") {
    const fontFamily = layer.fontFamily ?? DEFAULT_FONT_FAMILY;
    const effectiveFontSize = layer.autoScale
      ? Math.max(10, Math.min(layer.h * 0.72, layer.w * 0.6))
      : layer.fontSize;
    const curveAmt = Math.max(-100, Math.min(100, layer.curve ?? 0));
    const isCurved = Math.abs(curveAmt) > 1;
    const textStyle: React.CSSProperties = {
      ...common,
      color: layer.color,
      fontSize: effectiveFontSize,
      fontWeight: layer.weight,
      fontFamily,
      fontStyle: layer.italic ? "italic" : "normal",
      letterSpacing: layer.letterSpacing != null ? `${layer.letterSpacing}px` : undefined,
      lineHeight: 1.15,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "4px 6px",
      cursor: editing ? "text" : common.cursor,
      outline: editing ? "2px dashed #1d6bff" : common.outline,
      overflow: "visible",
    };
    // Curved text rendered via SVG textPath. Quadratic bezier gives a smooth arc.
    const arcPathId = `arc-${layer.id}`;
    const baseY = layer.h / 2;
    const bulgePx = (curveAmt / 100) * (layer.h * 0.5);
    // control point y is baseY - bulge for +curve to bow upward.
    const arcD = `M 0 ${baseY} Q ${layer.w / 2} ${baseY - bulgePx * 2} ${layer.w} ${baseY}`;
    return (
      <div
        style={textStyle}
        onPointerDown={editing ? undefined : handleDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!layer.locked) onStartEditText(layer.id);
        }}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={layer.text}
            onBlur={(e) => onCommitText(layer.id, e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              if (e.key === "Escape") onCommitText(layer.id, layer.text);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
              fontFamily: "inherit",
              fontStyle: "inherit",
              letterSpacing: "inherit",
              textAlign: "center",
              padding: 0,
            }}
          />
        ) : isCurved ? (
          <svg
            width={layer.w}
            height={layer.h}
            viewBox={`0 0 ${layer.w} ${layer.h}`}
            style={{ overflow: "visible", pointerEvents: "none" }}
          >
            <defs>
              <path id={arcPathId} d={arcD} fill="none" />
            </defs>
            <text
              fill={layer.color}
              fontSize={effectiveFontSize}
              fontWeight={layer.weight}
              fontFamily={fontFamily}
              fontStyle={layer.italic ? "italic" : "normal"}
              letterSpacing={layer.letterSpacing ?? 0}
              dominantBaseline="middle"
            >
              <textPath href={`#${arcPathId}`} startOffset="50%" textAnchor="middle">
                {layer.text}
              </textPath>
            </text>
          </svg>
        ) : (
          layer.text
        )}
        {!editing && handles}
      </div>
    );
  }
  const s = layer as ShapeLayer;
  const shapeKind: ShapeKind = s.shape ?? "rect";
  const shadowCss = SHAPE_SHADOW_CSS[s.shadow ?? 0];
  const shadowFilter = SHAPE_SHADOW_FILTER[s.shadow ?? 0];
  const stroke = s.stroke ?? "#0f172a";
  const sw = s.strokeWidth ?? 0;
  const fill = s.fill ?? "#2563eb";
  const radius = s.radius ?? 0;
  let shapeEl: React.ReactNode = null;
  if (shapeKind === "rect") {
    shapeEl = (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: fill,
          borderRadius: radius,
          border: sw > 0 ? `${sw}px solid ${stroke}` : "none",
          boxShadow: shadowCss,
        }}
      />
    );
  } else if (shapeKind === "ellipse") {
    shapeEl = (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: fill,
          borderRadius: "50%",
          border: sw > 0 ? `${sw}px solid ${stroke}` : "none",
          boxShadow: shadowCss,
        }}
      />
    );
  } else if (shapeKind === "line") {
    const lw = Math.max(1, sw || 4);
    shapeEl = (
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(layer.w, 1)} ${Math.max(layer.h, 1)}`} preserveAspectRatio="none" style={{ filter: shadowFilter, overflow: "visible" }}>
        <line x1={0} y1={layer.h / 2} x2={layer.w} y2={layer.h / 2} stroke={stroke || fill} strokeWidth={lw} strokeLinecap="round" />
      </svg>
    );
  } else if (shapeKind === "arrow") {
    const lw = Math.max(2, sw || 5);
    const markerId = `arr-${layer.id}`;
    shapeEl = (
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(layer.w, 1)} ${Math.max(layer.h, 1)}`} preserveAspectRatio="none" style={{ filter: shadowFilter, overflow: "visible" }}>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={stroke || fill} />
          </marker>
        </defs>
        <line x1={4} y1={layer.h / 2} x2={layer.w - lw * 2} y2={layer.h / 2} stroke={stroke || fill} strokeWidth={lw} strokeLinecap="round" markerEnd={`url(#${markerId})`} />
      </svg>
    );
  } else if (shapeKind === "star") {
    shapeEl = (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ filter: shadowFilter, overflow: "visible" }}>
        <polygon points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );
  } else if (shapeKind === "badge") {
    const pts = Array.from({ length: 32 }, (_, i) => {
      const r = i % 2 === 0 ? 48 : 36;
      const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
      return `${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`;
    }).join(" ");
    shapeEl = (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ filter: shadowFilter, overflow: "visible" }}>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <div style={common} onPointerDown={handleDown}>
      {shapeEl}
      {handles}
    </div>
  );
}

function LayerRow({
  layer,
  asset,
  selected,
  canUp,
  canDown,
  onSelect,
  onToggleVisible,
  onDelete,
  onUp,
  onDown,
}: {
  layer: Layer;
  asset?: MediaAsset;
  selected: boolean;
  canUp: boolean;
  canDown: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const thumb =
    layer.kind === "image" && asset ? (
      <img src={asset.url} alt="" className="h-8 w-8 rounded object-cover" />
    ) : layer.kind === "text" ? (
      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600">
        <TypeIcon className="h-4 w-4" />
      </div>
    ) : layer.kind === "bg" ? (
      <div className="h-8 w-8 rounded" style={{ background: (layer as BgLayer).background }} />
    ) : (
      <div className="h-8 w-8 rounded" style={{ background: (layer as ShapeLayer).fill }} />
    );

  const isLocked = layer.locked;
  return (
    <li
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
        selected
          ? "border-[#1d6bff] bg-[#1d6bff]/[0.05]"
          : isLocked
            ? "border-transparent bg-slate-50/60 hover:border-slate-200"
            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      {thumb}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-[12px] font-medium text-slate-700">
          <span className="truncate">{layer.name}</span>
          {isLocked && <Lock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">
          {isLocked ? `${layer.kind} · locked` : layer.kind}
        </div>
      </div>
      <div className="flex items-center gap-0.5 text-slate-400">
        {!isLocked && (
          <>
            <button
              className="rounded p-1 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              onClick={(e) => {
                e.stopPropagation();
                onUp();
              }}
              disabled={!canUp}
              title="Bring forward"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded p-1 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              onClick={(e) => {
                e.stopPropagation();
                onDown();
              }}
              disabled={!canDown}
              title="Send backward"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          className="rounded p-1 hover:bg-slate-100 hover:text-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          title={layer.visible ? "Hide" : "Show"}
        >
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        {!isLocked ? (
          <button
            className="rounded p-1 hover:bg-rose-50 hover:text-rose-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span
            className="flex h-6 w-6 items-center justify-center rounded text-slate-300"
            title="Background is locked — pick another template to change it"
          >
            <Lock className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </li>
  );
}

function ProductColorBar({
  bg,
  onChange,
}: {
  bg: BgLayer;
  onChange: (patch: Partial<BgLayer>) => void;
}) {
  const SWATCHES: { color: string | null; label: string }[] = [
    { color: null, label: "Reset" },
    { color: "#ffffff", label: "White" },
    { color: "#111827", label: "Black" },
    { color: "#ef4444", label: "Red" },
    { color: "#f59e0b", label: "Amber" },
    { color: "#22c55e", label: "Green" },
    { color: "#1d6bff", label: "Blue" },
    { color: "#8b5cf6", label: "Purple" },
    { color: "#ec4899", label: "Pink" },
    { color: "#78350f", label: "Brown" },
  ];
  const active = bg.tint ?? "";
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm"
      title="Product color"
    >
      <span className="pl-1 pr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Color
      </span>
      {SWATCHES.map((s) => {
        const isActive = s.color ? active.toLowerCase() === s.color.toLowerCase() : !bg.tint;
        if (!s.color) {
          return (
            <button
              key="reset"
              type="button"
              onClick={() =>
                onChange({ tint: undefined, tintOpacity: 0.38, tintMode: "multiply" })
              }
              title="Reset product color"
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold transition ${
                isActive
                  ? "border-[#1d6bff] bg-[#1d6bff]/10 text-[#1d6bff]"
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              ×
            </button>
          );
        }
        return (
          <button
            key={s.color}
            type="button"
            title={s.label}
            onClick={() =>
              onChange({
                tint: s.color!,
                tintOpacity: bg.tintOpacity && bg.tintOpacity > 0 ? bg.tintOpacity : 0.75,
                tintMode: bg.tintMode ?? "color",
              })
            }
            className={`h-5 w-5 rounded-full border transition ${
              isActive
                ? "border-[#1d6bff] ring-2 ring-[#1d6bff]/30"
                : "border-slate-200 hover:border-slate-400"
            }`}
            style={{ background: s.color }}
          />
        );
      })}
    </div>
  );
}

const PART_ICON: Record<TintPartId, React.ComponentType<{ className?: string }>> = {
  top: Shirt,
  bottom: PantsGlyph,
  shoes: Footprints,
  hat: HardHat,
  bag: ShoppingBag,
  accessory: Sparkles,
};

function PantsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l-1 8-1 10h-3l-1-9-1 9H8L7 11 6 3z" />
      <path d="M6 3h12" />
    </svg>
  );
}

function PartSelector({
  bg,
  onChange,
}: {
  bg: BgLayer;
  onChange: (patch: Partial<BgLayer>) => void;
}) {
  const parts = bg.tintParts ?? [];
  if (!parts.length) return null;
  const activeId = bg.activeTintPartId ?? null;
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm"
      title="Paint only this region"
    >
      <span className="pl-1 pr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Part
      </span>
      <button
        type="button"
        onClick={() => onChange({ activeTintPartId: undefined })}
        title="Paint whole scene"
        className={`flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold transition ${
          !activeId
            ? "border-[#1d6bff] bg-[#1d6bff]/10 text-[#1d6bff]"
            : "border-slate-200 text-slate-500 hover:border-slate-400"
        }`}
      >
        All
      </button>
      {parts.map((p) => {
        const Icon = PART_ICON[p.id] ?? Shirt;
        const isActive = activeId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            title={p.label}
            onClick={() =>
              onChange({
                activeTintPartId: isActive ? undefined : p.id,
              })
            }
            className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
              isActive
                ? "border-[#1d6bff] bg-[#1d6bff]/10 text-[#1d6bff]"
                : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}



function BackgroundPanel({
  bg,
  onChange,
}: {
  bg: BgLayer | null;
  onChange: (patch: Partial<BgLayer>) => void;
}) {
  if (!bg) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-[11px] text-slate-400">
        Önce bir sahne seç; renk ve blur burada açılır.
      </div>
    );
  }

  const activeTint = bg.tint ?? "";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Background
        </div>
        <button
          onClick={() => onChange({ tint: undefined, tintOpacity: 0.38, tintMode: "multiply", blur: 0 })}
          className="rounded-md px-2 py-1 text-[10.5px] font-semibold text-slate-500 hover:bg-slate-100"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {BACKGROUND_SWATCHES.map((swatch) => {
          const active = activeTint === swatch.color;
          return (
            <button
              key={swatch.label}
              title={swatch.label}
              onClick={() => onChange({ tint: swatch.color || undefined, tintOpacity: swatch.color ? (bg.tintOpacity ?? 0.38) : 0.38 })}
              className={`h-8 rounded-lg border p-1 transition ${
                active ? "border-[#1d6bff] ring-2 ring-[#1d6bff]/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span
                className="block h-full w-full rounded-md"
                style={{
                  background: swatch.color
                    ? swatch.color
                    : "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
                  backgroundSize: swatch.color ? undefined : "10px 10px",
                  backgroundPosition: swatch.color ? undefined : "0 0,0 5px,5px -5px,-5px 0",
                }}
              />
            </button>
          );
        })}
      </div>

      <ColorRow
        label="Tint"
        value={bg.tint ?? "#ffffff"}
        onChange={(v) => onChange({ tint: v, tintOpacity: bg.tintOpacity ?? 0.38 })}
      />
      <SliderRow
        label="Strength"
        value={Math.round((bg.tintOpacity ?? 0.38) * 100)}
        min={0}
        max={100}
        onChange={(v) => onChange({ tintOpacity: v / 100 })}
      />
      <div>
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Recolor mode
        </div>
        <div className="grid grid-cols-5 gap-1">
          {([
            { id: "multiply", label: "Light", hint: "Beyaz kupa / tişört" },
            { id: "color", label: "Full", hint: "Tüm kumaşı boya" },
            { id: "screen", label: "Dark", hint: "Siyah ürünü aç" },
            { id: "hue", label: "Hue", hint: "Ton kaydır" },
            { id: "overlay", label: "Pop", hint: "Kontrast + renk" },
          ] as { id: TintMode; label: string; hint: string }[]).map((m) => {
            const active = (bg.tintMode ?? "multiply") === m.id;
            return (
              <button
                key={m.id}
                title={m.hint}
                onClick={() => onChange({ tintMode: m.id, tint: bg.tint ?? "#ff3b30", tintOpacity: bg.tintOpacity ?? 0.6 })}
                className={`rounded-md border px-1 py-1 text-[10px] font-semibold transition ${
                  active
                    ? "border-[#1d6bff] bg-[#1d6bff]/10 text-[#1d6bff]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="mt-1 text-[10px] leading-tight text-slate-400">
          Ürün rengini değiştirmek için: beyaz mockup'ta <b>Light</b>, siyahta <b>Dark</b>, renkli kumaşta <b>Full</b> dene.
        </div>
      </div>
      <SliderRow
        label="Blur"
        value={bg.blur ?? 0}
        min={0}
        max={18}
        onChange={(v) => onChange({ blur: v })}
      />
    </div>
  );
}

function PropertiesPanel({
  layer,
  onChange,
}: {
  layer: Layer | null;
  onChange: (patch: Partial<Layer>) => void;
}) {
  if (!layer) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
        Select a layer to edit its properties.
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      <NumRow label="X" value={Math.round(layer.x)} onChange={(v) => onChange({ x: v } as Partial<Layer>)} />
      <NumRow label="Y" value={Math.round(layer.y)} onChange={(v) => onChange({ y: v } as Partial<Layer>)} />
      <NumRow label="W" value={Math.round(layer.w)} onChange={(v) => onChange({ w: Math.max(20, v) } as Partial<Layer>)} />
      <NumRow label="H" value={Math.round(layer.h)} onChange={(v) => onChange({ h: Math.max(20, v) } as Partial<Layer>)} />
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Opacity</span>
          <span className="tabular-nums">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 } as Partial<Layer>)}
          className="w-full accent-[#1d6bff]"
        />
      </div>
      {layer.kind === "image" && (
        <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {(layer as ImageLayer).isTryOn ? "Try-On Transform" : "Image Transform"}
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({ skewX: 0, skewY: 0, bend: 0, flipH: false, flipV: false, rotation: 0 } as Partial<Layer>)
              }
              className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:border-emerald-400"
            >
              Reset
            </button>
          </div>
          <SliderRow
            label="Rotate"
            value={Math.round(layer.rotation)}
            min={-180}
            max={180}
            onChange={(v) => onChange({ rotation: v } as Partial<Layer>)}
          />
          <SliderRow
            label="Skew X"
            value={Math.round((layer as ImageLayer).skewX ?? 0)}
            min={-45}
            max={45}
            onChange={(v) => onChange({ skewX: v } as Partial<Layer>)}
          />
          <SliderRow
            label="Skew Y"
            value={Math.round((layer as ImageLayer).skewY ?? 0)}
            min={-45}
            max={45}
            onChange={(v) => onChange({ skewY: v } as Partial<Layer>)}
          />
          <SliderRow
            label="Bend"
            value={Math.round((layer as ImageLayer).bend ?? 0)}
            min={-60}
            max={60}
            onChange={(v) => onChange({ bend: v } as Partial<Layer>)}
          />
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={Boolean((layer as ImageLayer).flipH)}
                onChange={(e) => onChange({ flipH: e.target.checked } as Partial<Layer>)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              Flip H
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={Boolean((layer as ImageLayer).flipV)}
                onChange={(e) => onChange({ flipV: e.target.checked } as Partial<Layer>)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              Flip V
            </label>
          </div>
          <div className="text-[10px] leading-tight text-emerald-700/70">
            Bend = eğik yüzeylere (şapka, kupa, bilek) oturtma · Skew = perspektif ince ayarı · Katman sırasını sağdaki panelden yukarı/aşağı taşıyabilirsin.
          </div>
        </div>
      )}
      {layer.kind === "text" && (
        <>
          <TextRow
            label="Text"
            value={layer.text}
            onChange={(v) => onChange({ text: v } as Partial<Layer>)}
          />
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">Font</div>
            <select
              value={layer.fontFamily ?? DEFAULT_FONT_FAMILY}
              onChange={(e) => onChange({ fontFamily: e.target.value } as Partial<Layer>)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 focus:border-[#1d6bff] focus:outline-none"
              style={{ fontFamily: layer.fontFamily ?? DEFAULT_FONT_FAMILY }}
            >
              {STUDIO_FONT_FAMILIES.map((f) => (
                <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <ColorRow label="Color" value={layer.color} onChange={(v) => onChange({ color: v } as Partial<Layer>)} />
          <SliderRow
            label={`Size${layer.autoScale ? " (auto)" : ""}`}
            value={layer.fontSize}
            min={8}
            max={220}
            onChange={(v) => onChange({ fontSize: Math.max(8, v) } as Partial<Layer>)}
          />
          <SliderRow
            label="Weight"
            value={layer.weight}
            min={100}
            max={900}
            onChange={(v) => onChange({ weight: Math.max(100, Math.min(900, Math.round(v / 100) * 100)) } as Partial<Layer>)}
          />
          <SliderRow
            label="Letter spacing"
            value={layer.letterSpacing ?? 0}
            min={-4}
            max={24}
            onChange={(v) => onChange({ letterSpacing: v } as Partial<Layer>)}
          />
          <SliderRow
            label="Curve / Arc"
            value={layer.curve ?? 0}
            min={-100}
            max={100}
            onChange={(v) => onChange({ curve: v } as Partial<Layer>)}
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(layer.autoScale)}
                onChange={(e) => onChange({ autoScale: e.target.checked } as Partial<Layer>)}
                className="h-3.5 w-3.5 accent-[#1d6bff]"
              />
              Fit to box
            </label>
            <label className="ml-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(layer.italic)}
                onChange={(e) => onChange({ italic: e.target.checked } as Partial<Layer>)}
                className="h-3.5 w-3.5 accent-[#1d6bff]"
              />
              Italic
            </label>
          </div>
        </>
      )}
      {layer.kind === "shape" && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <ColorRow
            label="Fill"
            value={(layer as ShapeLayer).fill}
            onChange={(v) => onChange({ fill: v } as Partial<Layer>)}
          />
          <ColorRow
            label="Stroke"
            value={(layer as ShapeLayer).stroke}
            onChange={(v) => onChange({ stroke: v } as Partial<Layer>)}
          />
          <SliderRow
            label="Border"
            value={(layer as ShapeLayer).strokeWidth}
            min={0}
            max={24}
            onChange={(v) => onChange({ strokeWidth: v } as Partial<Layer>)}
          />
          {((layer as ShapeLayer).shape ?? "rect") === "rect" && (
            <SliderRow
              label="Radius"
              value={(layer as ShapeLayer).radius}
              min={0}
              max={200}
              onChange={(v) => onChange({ radius: v } as Partial<Layer>)}
            />
          )}
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Shadow
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(["None", "Soft", "Med", "Strong"] as const).map((lbl, i) => {
                const active = ((layer as ShapeLayer).shadow ?? 0) === i;
                return (
                  <button
                    key={lbl}
                    onClick={() =>
                      onChange({ shadow: i as ShapeShadow } as Partial<Layer>)
                    }
                    className={`rounded-md border px-1.5 py-1 text-[10.5px] font-medium transition ${
                      active
                        ? "border-[#1d6bff] bg-[#1d6bff] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-500">
      <span className="w-6 shrink-0 font-medium uppercase tracking-wider">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 tabular-nums outline-none transition focus:border-[#1d6bff]"
      />
    </label>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[11px] text-slate-500">
      <span className="mb-1 block font-medium uppercase tracking-wider">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 outline-none transition focus:border-[#1d6bff]"
      />
    </label>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-500">
      <span className="w-12 shrink-0 font-medium uppercase tracking-wider">{label}</span>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 shrink-0 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 tabular-nums outline-none transition focus:border-[#1d6bff]"
      />
    </label>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-medium uppercase tracking-wider">{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#1d6bff]"
      />
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/*  Premium Scan Loader                                                       */
/* -------------------------------------------------------------------------- */

function ScanLoader({ label }: { label: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      // Ease toward 99% over ~4s; never reaches 100 (parent unmounts on done)
      const target = 99 * (1 - Math.exp(-elapsed / 1400));
      setPct(target);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-5">
      {/* Backdrop veil */}
      <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px]" />
      {/* Scan window fills canvas */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="laser-scan-line" />
      </div>
      {/* Counter */}
      <div className="relative flex flex-col items-center gap-2 text-white">
        <div
          className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/70"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {label}
        </div>
        <div
          className="tabular-nums text-4xl font-extralight tracking-tight text-white"
          style={{ fontFamily: "'Inter', system-ui, sans-serif", textShadow: "0 0 20px rgba(255,255,255,0.35)" }}
        >
          {pct.toFixed(1)}
          <span className="ml-0.5 text-xl text-white/60">%</span>
        </div>
      </div>
    </div>
  );
}

function MarketplaceFormatMenu() {
  const activeId = useActiveMarketplace();
  const active = marketplaceById(activeId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 shadow-sm hover:border-slate-300"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Format
        </span>
        <span className="h-2 w-2 rounded-full" style={{ background: active.accent }} aria-hidden />
        <span>{active.label}</span>
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">
          {active.short}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          {(["standard", "marketplace"] as const).map((group) => {
            const items = MARKETPLACES.filter((m) => m.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="px-2.5 pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {group === "standard" ? "Standard formats" : "Marketplaces"}
                </div>
                {items.map((m) => {
                  const isActive = m.id === activeId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setMarketplace(m.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition ${
                        isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: m.accent }}
                        aria-hidden
                      />
                      <span className="flex-1">{m.label}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                          isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {m.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Background (Templates) panel — Claid-style: tabs + category chips + grid
// ---------------------------------------------------------------------------
type CustomTemplateEntry = {
  id: string;
  name: string;
  url: string;
  category: TemplateCategory;
  createdAt: number;
};

function TemplatesPanel(props: {
  tab: "claid" | "mine";
  setTab: (v: "claid" | "mine") => void;
  category: TemplateCategory | "all";
  setCategory: (v: TemplateCategory | "all") => void;
  templates: SnapTemplate[];
  assets: MediaAsset[];
  onPickTemplate: (tpl: SnapTemplate, cfg: TemplateConfig) => void;
  onPickAsset: (a: MediaAsset) => void;
  onChooseFile: () => void;
  templateName: (id: string, fallback: string) => string;
  industryFilter?: IndustryKey | null;
  industryLabel?: string | null;
  onClearIndustry?: () => void;
  customTemplates: CustomTemplateEntry[];
  onUploadCustomTemplate: () => void;
  onPickCustomTemplate: (c: CustomTemplateEntry) => void;
  onDeleteCustomTemplate: (id: string) => void;
  customCategory: TemplateCategory;
  setCustomCategory: (c: TemplateCategory) => void;
  t: (k: StudioStringKey) => string;
}) {
  const {
    tab, setTab, category, setCategory, templates, assets, onPickTemplate, onPickAsset,
    onChooseFile, templateName, industryFilter, industryLabel, onClearIndustry,
    customTemplates, onUploadCustomTemplate, onPickCustomTemplate, onDeleteCustomTemplate,
    customCategory, setCustomCategory, t,
  } = props;
  void assets; void onPickAsset; void onChooseFile;
  const industryIds = industryFilter ? new Set(INDUSTRY_TEMPLATE_IDS[industryFilter]) : null;
  const industryScoped = industryIds
    ? templates.filter((tpl) => industryIds.has(tpl.id))
    : templates;
  // When an industry is active, the sidebar shows only its curated 4-6 scenes as
  // a single flat grid — hide category sub-chips so nothing bleeds in from other sectors.
  const filtered = industryIds
    ? industryScoped
    : category === "all"
      ? industryScoped
      : industryScoped.filter((tpl) => tpl.category === category);

  const [staged, setStaged] = useState<SnapTemplate | null>(null);
  const previewTemplate = (tpl: SnapTemplate) => {
    onPickTemplate(tpl, {
      model: "v2",
      creativity: "medium",
      count: 1,
      resolution: "1mp",
      prompt: "",
    });
    setStaged(tpl);
  };

  // Ghost sub-drawer — template configuration layer
  if (staged) {
    return (
      <TemplateConfigPanel
        template={staged}
        label={templateName(staged.id, staged.name)}
        onBack={() => setStaged(null)}
        onApply={(cfg) => {
          onPickTemplate(staged, cfg);
          setStaged(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
        <button
          onClick={() => setTab("claid")}
          className={`flex-1 rounded-md px-2 py-1.5 transition ${tab === "claid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {t("tplTabClaid")}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 rounded-md px-2 py-1.5 transition ${tab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {t("tplTabMine")}
        </button>
      </div>

      {industryFilter && industryLabel && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[#1d6bff]/30 bg-[#1d6bff]/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d6bff]">
          <span className="truncate">{t("industryFilter")}: {industryLabel}</span>
          {onClearIndustry && (
            <button
              type="button"
              onClick={onClearIndustry}
              className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
            >
              {t("clearFilter")}
            </button>
          )}
        </div>
      )}


      {tab === "claid" ? (
        <>
          {/* Category chips — hidden when an industry allowlist is active */}
          {!industryIds && (
            <div className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto px-1 pb-1">
              <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label={t("tplCatAll")} emoji="✨" />
              {TEMPLATE_CATEGORIES.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                  label={t(`tplCat_${c.id}` as StudioStringKey)}
                  emoji={c.emoji}
                />
              ))}
            </div>
          )}

          <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[10.5px] leading-snug text-slate-500">
            {t("pickSceneFirst")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((tpl) => {
              const label = templateName(tpl.id, tpl.name);
              return (
                <button
                  key={tpl.id}
                  onClick={() => previewTemplate(tpl)}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-[#1d6bff] hover:shadow-md"
                  title={label}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                    {TEMPLATE_THUMBS[tpl.id] ? (
                      <img
                        src={TEMPLATE_THUMBS[tpl.id]}
                        alt={label}
                        loading="lazy"
                        width={512}
                        height={512}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: tpl.background }} />
                    )}
                  </div>
                  <div className="border-t border-slate-100 px-2 py-1.5">
                    <span className="block truncate text-[11px] font-medium text-slate-700">
                      {tpl.emoji} {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[10.5px] leading-snug text-slate-500">
            Kendi sahne/arka plan görselini yükle. Yüklenen şablon büyük vitrine kilitli katman olarak yerleşir.
          </div>

          {/* Category selector for the next upload */}
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Kategori</div>
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as TemplateCategory)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] font-medium text-slate-700 outline-none focus:border-[#1d6bff]"
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {t(`tplCat_${c.id}` as StudioStringKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Upload button */}
          <button
            onClick={onUploadCustomTemplate}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-[11px] font-semibold text-slate-600 transition hover:border-[#1d6bff] hover:bg-[#1d6bff]/[0.04] hover:text-[#1d6bff]"
          >
            <FolderOpen className="h-5 w-5" />
            {t("tplChooseFile")}
          </button>

          {customTemplates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-[11px] text-slate-400">
              {t("myEmpty")}
            </div>
          ) : (
            <>
              {(() => {
                const grouped = new Map<TemplateCategory, CustomTemplateEntry[]>();
                for (const c of customTemplates) {
                  const arr = grouped.get(c.category) ?? [];
                  arr.push(c);
                  grouped.set(c.category, arr);
                }
                return Array.from(grouped.entries()).map(([cat, list]) => {
                  const catMeta = TEMPLATE_CATEGORIES.find((x) => x.id === cat);
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                        <span>{catMeta?.emoji ?? "🖼️"}</span>
                        <span>{t(`tplCat_${cat}` as StudioStringKey)}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-400">{list.length}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {list.map((c) => (
                          <div key={c.id} className="group relative">
                            <button
                              onClick={() => onPickCustomTemplate(c)}
                              className="block aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:border-[#1d6bff] hover:shadow-md"
                              title={c.name}
                            >
                              <img src={c.url} alt={c.name} className="h-full w-full object-cover" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDeleteCustomTemplate(c.id); }}
                              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
                              title="Sil"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
}

export type TemplateConfig = {
  model: "v1" | "v2";
  creativity: "low" | "medium" | "high";
  count: 1 | 2 | 3 | 4;
  resolution: "1mp" | "2mp";
  prompt: string;
};

function TemplateConfigPanel({
  template,
  label,
  onBack,
  onApply,
}: {
  template: SnapTemplate;
  label: string;
  onBack: () => void;
  onApply: (cfg: TemplateConfig) => void;
}) {
  const [model, setModel] = useState<TemplateConfig["model"]>("v2");
  const [creativity, setCreativity] = useState<TemplateConfig["creativity"]>("medium");
  const [count, setCount] = useState<TemplateConfig["count"]>(1);
  const [resolution, setResolution] = useState<TemplateConfig["resolution"]>("1mp");
  const [prompt, setPrompt] = useState("");
  const perImage = 2; // AI Background (Templates) — flat 2 credits per image
  const modelMult = 1;
  const cost = count * perImage * modelMult;

  const Segment = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-3.5 animate-in slide-in-from-right-4 fade-in duration-200">
      {/* Back header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to templates
      </button>

      {/* Selected template preview */}
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
          {TEMPLATE_THUMBS[template.id] ? (
            <img src={TEMPLATE_THUMBS[template.id]} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: template.background }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-slate-800">{template.emoji} {label}</div>
          <div className="text-[10px] text-slate-500">Scene selected</div>
        </div>
      </div>

      {/* Generation Model */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Generation model</div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <Segment active={model === "v1"} onClick={() => setModel("v1")}>v1 · Fast</Segment>
          <Segment active={model === "v2"} onClick={() => setModel("v2")}>v2 · HQ</Segment>
        </div>
      </div>

      {/* Creativity */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Creativity level</div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <Segment active={creativity === "low"} onClick={() => setCreativity("low")}>Low</Segment>
          <Segment active={creativity === "medium"} onClick={() => setCreativity("medium")}>Medium</Segment>
          <Segment active={creativity === "high"} onClick={() => setCreativity("high")}>High</Segment>
        </div>
      </div>

      {/* Images to generate */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Images to generate</div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {([1, 2, 3, 4] as const).map((n) => (
            <Segment key={n} active={count === n} onClick={() => setCount(n)}>{n}</Segment>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Resolution</div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <Segment active={resolution === "1mp"} onClick={() => setResolution("1mp")}>1 MP</Segment>
          <Segment active={resolution === "2mp"} onClick={() => setResolution("2mp")}>2 MP</Segment>
        </div>
      </div>

      {/* Prompt */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Prompt</div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe the scene around your product…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] leading-snug text-slate-800 placeholder:text-slate-400 focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
        />
      </div>

      {/* Apply */}
      <button
        onClick={() => onApply({ model, creativity, count, resolution, prompt })}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-slate-700"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Apply operation ({cost} {cost === 1 ? "credit" : "credits"})
      </button>
    </div>
  );
}

function CategoryChip({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition ${
        active
          ? "border-[#1d6bff] bg-[#1d6bff] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
      }`}
    >
      <span className="text-[11px] leading-none">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// AI Photoshoot panel — aspect ratio + generation mode + prompt + batch count
// ---------------------------------------------------------------------------
function AIPhotoshootPanel(props: {
  aspect: "1:1" | "4:5" | "3:2" | "16:9" | "9:16";
  setAspect: (v: "1:1" | "4:5" | "3:2" | "16:9" | "9:16") => void;
  mode: "precise" | "creative" | "inspiration";
  setMode: (v: "precise" | "creative" | "inspiration") => void;
  prompt: string;
  setPrompt: (v: string) => void;
  count: 1 | 2 | 3 | 4;
  setCount: (v: 1 | 2 | 3 | 4) => void;
  busy: boolean;
  onApply: () => void;
  t: (k: StudioStringKey) => string;
}) {
  const { aspect, setAspect, mode, setMode, prompt, setPrompt, count, setCount, busy, onApply, t } = props;
  const aspects: { id: "1:1" | "4:5" | "3:2" | "16:9" | "9:16"; ratio: string }[] = [
    { id: "1:1", ratio: "1 / 1" },
    { id: "4:5", ratio: "4 / 5" },
    { id: "3:2", ratio: "3 / 2" },
    { id: "16:9", ratio: "16 / 9" },
    { id: "9:16", ratio: "9 / 16" },
  ];
  const modes: { id: "precise" | "creative" | "inspiration"; label: string; desc: string }[] = [
    { id: "precise", label: t("psModePrecise"), desc: t("psModePreciseDesc") },
    { id: "creative", label: t("psModeCreative"), desc: t("psModeCreativeDesc") },
    { id: "inspiration", label: t("psModeInspiration"), desc: t("psModeInspirationDesc") },
  ];
  const creditCost = count * PHOTOSHOOT_COST_PER_IMAGE;
  return (
    <div className="space-y-4">
      {/* Aspect ratio */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{t("psAspect")}</div>
        <div className="flex flex-wrap gap-1.5">
          {aspects.map((a) => (
            <button
              key={a.id}
              onClick={() => setAspect(a.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
                aspect === a.id
                  ? "border-[#1d6bff] bg-[#1d6bff]/[0.08] text-[#1d6bff]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="block h-6 w-6 rounded border border-current opacity-70" style={{ aspectRatio: a.ratio, width: a.id === "9:16" ? 12 : a.id === "16:9" ? 24 : 20 }} />
              {a.id}
            </button>
          ))}
        </div>
      </div>

      {/* Generation mode */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{t("psMode")}</div>
        <div className="space-y-1.5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex w-full flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition ${
                mode === m.id
                  ? "border-[#1d6bff] bg-[#1d6bff]/[0.06]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-[11.5px] font-semibold text-slate-800">{m.label}</span>
              <span className="text-[10px] leading-snug text-slate-500">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{t("psPrompt")}</div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={t("psPromptPlaceholder")}
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] leading-snug text-slate-800 placeholder:text-slate-400 focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
        />
      </div>

      {/* Batch count */}
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{t("psCount")}</div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {([1, 2, 3, 4] as const).map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
                count === n ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={onApply}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        <Camera className="h-3.5 w-3.5" />
        {t("psApply")} ({creditCost} {t("psCredits")})
      </button>
    </div>
  );
}



