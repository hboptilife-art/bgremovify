import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, ImageIcon, RotateCcw, Globe, Check, Share2, ShieldCheck, Sparkles, LogOut, User as UserIcon, Eraser, Wand2, X } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { removeBackground, type RemoveBgStage } from "@/lib/remove-bg";
import { upscaleImage, type UpscaleTier } from "@/lib/upscale.functions";

import { HeroShowcaseLoop } from "@/components/HeroShowcaseLoop";
import { HeroCapabilityCards } from "@/components/HeroCapabilityCards";
import { ToolCatalog } from "@/components/ToolCatalog";
import { BulkApiShowcase } from "@/components/BulkApiShowcase";

import { TopNav } from "@/components/TopNav";
import { useT as useDict } from "@/i18n/useT";
import { fetchPlatformSettingsCached } from "@/lib/platform-settings.cache";

// Re-apply the alpha mask from a transparent cutout PNG onto an upscaled RGB
// image. Replicate upscalers (Real-ESRGAN, Clarity) drop the alpha channel and
// bake the original background back in — without this step, Ultra HD output
// loses transparency. Runs entirely in the browser via canvas; no extra cost.
async function reapplyAlphaMask(upscaledDataUrl: string, cutoutDataUrl: string): Promise<string> {
  if (typeof window === "undefined") return upscaledDataUrl;

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });

  const [upscaled, cutout] = await Promise.all([
    loadImage(upscaledDataUrl),
    loadImage(cutoutDataUrl),
  ]);

  const W = upscaled.naturalWidth;
  const H = upscaled.naturalHeight;

  // Draw upscaled RGB.
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const outCtx = out.getContext("2d");
  if (!outCtx) return upscaledDataUrl;
  outCtx.drawImage(upscaled, 0, 0, W, H);

  // Draw cutout alpha scaled to the upscaled dimensions, then use it as a mask.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = W;
  maskCanvas.height = H;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return upscaledDataUrl;
  maskCtx.imageSmoothingEnabled = true;
  maskCtx.imageSmoothingQuality = "high";
  maskCtx.drawImage(cutout, 0, 0, W, H);

  // Keep only pixels where the original cutout had non-zero alpha.
  outCtx.globalCompositeOperation = "destination-in";
  outCtx.drawImage(maskCanvas, 0, 0);
  outCtx.globalCompositeOperation = "source-over";

  return out.toDataURL("image/png");
}

// Ultra HD upscale labels — kept outside the main translations dict to avoid
// touching every language block and to keep the v2 cache key stable for
// existing translation flows.
const UPSCALE_LABELS: Record<"tr" | "en" | "es" | "de" | "ru" | "ar", {
  cta: string;
  pickTitle: string;
  fastLabel: string;
  fastDesc: string;
  studioLabel: string;
  studioDesc: string;
  working: string;
  success: (n: number) => string;
  errGeneric: string;
}> = {
  tr: {
    cta: "Ultra HD Yap ✨",
    pickTitle: "Hangi kaliteyi istersin?",
    fastLabel: "Hızlı HD",
    fastDesc: "1 kredi · 4× büyütme",
    studioLabel: "Studio Ultra HD",
    studioDesc: "2 kredi · E-ticaret kalitesi",
    working: "Ultra HD'ye çıkarılıyor...",
    success: (n) => `Görsel Ultra HD'ye çıkarıldı (${n} kredi kaldı)`,
    errGeneric: "Ultra HD işlemi başarısız oldu.",
  },
  en: {
    cta: "Make Ultra HD ✨",
    pickTitle: "Which quality do you want?",
    fastLabel: "Fast HD",
    fastDesc: "1 credit · 4× upscale",
    studioLabel: "Studio Ultra HD",
    studioDesc: "2 credits · E-commerce quality",
    working: "Upscaling to Ultra HD...",
    success: (n) => `Image upscaled to Ultra HD (${n} credits left)`,
    errGeneric: "Ultra HD upscaling failed.",
  },
  es: {
    cta: "Hacer Ultra HD ✨",
    pickTitle: "¿Qué calidad quieres?",
    fastLabel: "HD Rápido",
    fastDesc: "1 crédito · 4× ampliación",
    studioLabel: "Studio Ultra HD",
    studioDesc: "2 créditos · Calidad e-commerce",
    working: "Ampliando a Ultra HD...",
    success: (n) => `Imagen ampliada a Ultra HD (${n} créditos restantes)`,
    errGeneric: "Falló la ampliación Ultra HD.",
  },
  de: {
    cta: "Ultra HD machen ✨",
    pickTitle: "Welche Qualität möchten Sie?",
    fastLabel: "Schnell HD",
    fastDesc: "1 Kredit · 4× Vergrößerung",
    studioLabel: "Studio Ultra HD",
    studioDesc: "2 Kredits · E-Commerce-Qualität",
    working: "Wird auf Ultra HD hochskaliert...",
    success: (n) => `Bild auf Ultra HD hochskaliert (${n} Kredits übrig)`,
    errGeneric: "Ultra-HD-Upscaling fehlgeschlagen.",
  },
  ru: {
    cta: "Сделать Ultra HD ✨",
    pickTitle: "Какое качество хотите?",
    fastLabel: "Быстрый HD",
    fastDesc: "1 кредит · 4× увеличение",
    studioLabel: "Studio Ultra HD",
    studioDesc: "2 кредита · Качество для e-commerce",
    working: "Увеличение до Ultra HD...",
    success: (n) => `Изображение увеличено до Ultra HD (осталось ${n} кр.)`,
    errGeneric: "Не удалось выполнить Ultra HD.",
  },
  ar: {
    cta: "تحويل إلى Ultra HD ✨",
    pickTitle: "ما الجودة التي تريدها؟",
    fastLabel: "HD سريع",
    fastDesc: "1 رصيد · تكبير 4×",
    studioLabel: "Studio Ultra HD",
    studioDesc: "2 رصيد · جودة التجارة الإلكترونية",
    working: "جارٍ التحويل إلى Ultra HD...",
    success: (n) => `تم تحويل الصورة إلى Ultra HD (تبقى ${n} رصيد)`,
    errGeneric: "فشل تحويل Ultra HD.",
  },
};


import { ClickToSelectModal } from "@/components/ClickToSelectModal";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import sampleProduct from "@/assets/sample-product.webp";
import sampleProductRemoved from "@/assets/sample-product-removed.webp";
import sampleModel from "@/assets/sample-model.webp";
import sampleModelRemoved from "@/assets/sample-model-removed.webp";
import sampleCar from "@/assets/sample-car.webp";
import sampleCarRemoved from "@/assets/sample-car-removed.webp";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useHasPaid } from "@/hooks/use-has-paid";

import { useAdminSandbox } from "@/hooks/use-admin-sandbox";

import { PricingSection, type PricingRegion } from "@/components/PricingSection";
import { PaywallModal } from "@/components/PaywallModal";
import { AIStudioBackgrounds, type StudioBg } from "@/components/AIStudioBackgrounds";
import { BulkUploadGrid, BULK_MAX, type BulkItem } from "@/components/BulkUploadGrid";
import { detectGeo } from "@/lib/geo";
import { readStoredLanguage, setStoredLanguage } from "@/lib/language";

const SAMPLES: { id: "product" | "model" | "car"; src: string; removedSrc: string }[] = [
  { id: "product", src: sampleProduct, removedSrc: sampleProductRemoved },
  { id: "model", src: sampleModel, removedSrc: sampleModelRemoved },
  { id: "car", src: sampleCar, removedSrc: sampleCarRemoved },
];

const SAMPLE_PRELOAD_URLS = SAMPLES.flatMap((sample) => [sample.src, sample.removedSrc]);

import { track as trackEvent, initAnalytics } from "@/lib/analytics";



function isImageUpload(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
}

function isHeicUpload(file: File) {
  return /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function fileToDataUrl(file: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function normalizeUpload(file: File): Promise<string> {
  let sourceBlob: Blob = file;

  if (isHeicUpload(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  const image = await loadImageFromBlob(sourceBlob);
  const maxEdge = 1280;
  const longestEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;
  const targetWidth = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const targetHeight = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx) throw new Error("canvas init failed");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const normalizedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas export failed"));
      },
      "image/jpeg",
      0.9,
    );
  });

  return fileToDataUrl(normalizedBlob);
}

async function applyWatermark(blob: Blob): Promise<Blob> {
  const image = await loadImageFromBlob(blob);
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(image, 0, 0, w, h);

  const text = "bgremovify.com";
  const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.035));
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "right";
  const padding = Math.round(fontSize * 0.8);
  const x = w - padding;
  const y = h - padding;

  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.18));
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(text, x, y);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, fontSize * 0.06);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeText(text, x, y);

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? blob), "image/png");
  });
}

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const T = {
  tr: {
    tagline: "Stüdyo kalitesinde arka plan",
    title1: "Arkaplanı", title2: "saniyeler içinde", title3: "kaldır",
    subtitle: "Fotoğrafını sürükle bırak, biz kalanını hallederiz. Şeffaf PNG olarak indir.",
    drop: "Fotoğrafı buraya bırak",
    dropHint: "veya tıklayarak seç • PNG, JPG, WEBP • Maks 10MB",
    selectFile: "Dosya Seç",
    samples: "Veya örnek fotoğraflardan birini dene",
    original: "Orijinal", removed: "Arkaplansız",
    working: "Hazırlanıyor...", modelHint: "İlk seferde model indirilir (~45MB)",
    freezeHint: "Animasyon donmuş görünebilir — bu normaldir, lütfen bekleyin (10-15 sn).",
    waiting: "Bekleniyor",
    newPhoto: "Yeni Fotoğraf", download: "PNG İndir", downloadComposite: "Arka Planla İndir", share: "Paylaş",
    starting: "Başlatılıyor...",
    errImg: "Lütfen bir görsel dosyası seçin.", errSize: "Dosya çok büyük (maks 10MB).", errGeneric: "Bir hata oluştu", errProcess: "İşlem bu cihazda başlatılamadı. Lütfen tekrar deneyin.", errDecode: "Bu telefon formatını dönüştüremedik. Lütfen galeriden JPG olarak paylaşmayı deneyin.",
    privacyGuarantee: "Fotoğrafınız asla sunucularımıza gitmez — %100 cihaz içi işlem, %100 gizlilik garantisi.",
    demoBefore: "Önce", demoAfter: "Sonra", demoCaption: "Çubuğu sürükle — saniyeler içinde böyle oluyor.",
    bulkHint: "Toplu Yükleme — tek seferde 100 fotoğrafa kadar",
    livePreview: "Canlı Önizleme", vsTitle1: "Önce", vsTitle2: "ve Sonra", vsCaption: "Çubuğu sürükle — sonucu kendi gözünle gör.",
    freeCreditBadge: "Ücretsiz hızlı ön izleme",
    creditsTitle: "Kredi al",
    creditUnit: "kredi",
    account: "Hesap",
    signedInAs: "Giriş yapan",
    buyCredits: "Kredi al",
    signOut: "Çıkış yap",
    login: "Giriş yap",
    adLeaderboard: "Reklam · 728×90 / Responsive",
    adSquare: "Reklam · 300×100",
    sampleLabels: { product: "Ürün", model: "Model", car: "Araba" },
    sampleAlts: { product: "Ürün örneği", model: "Model örneği", car: "Araba örneği" },
    sampleTry: "Dene",
    sampleAria: (label: string) => `${label} örneğini dene`,
    freeAccountHint: "ℹ️ Test için ücretsiz hesap aç — 1 kredi hediye",
    freeTierLabel: "Ücretsiz Plan:",
    freeTierText: "Standart çözünürlük ve watermark.",
    freeTierCta: "Premium'a yükselt",
    freeTierTail: "4K HD, kusursuz kenarlar ve watermarksız indirme için.",
    clickErase: "Tıkla & Sil",
    clickEraseLabels: { title: "Silgi", hint: "Parmağını/faresini kalıntının üzerinde gezdir — sadece dokunduğun pikseller şeffaflaşır. Fırça boyutunu aşağıdan ayarla.", close: "Kapat", undo: "Geri al", apply: "Uygula", cancel: "İptal", brushSize: "Fırça" },
    compareAria: "Karşılaştırmak için sürükle",
    shareFallbackText: "BgRemovify ile arkaplanı kaldırdım!",
    freeTryHint: "1 fotoğrafı ücretsiz dene – kayıt olmak zorunlu değil!",
    objectRemovalCta: { title: "Yeni stüdyomuza hoş geldiniz!", badge: "", desc: "Arka planı koruyun veya değiştirin, silmek istediğiniz nesneye dokunun — sonucu birlikte ince ayarlayın.", open: "Stüdyoyu Aç" },
    studioComingSoon: { title: "İkonik Mekanlar — Yakında", desc: "Stüdyo sahneleri şu an perspektif ve ölçek uyumu üzerinde çalışılıyor. Üyelere açıldığında burada görünecek." },
    helpQuick: { badge: "💡 YARDIM MERKEZİ", title: "Hızlı Kullanım Kılavuzu", subtitle: "Fırça araçları, nesne silme ve estetik rötuş için ipuçları.", cards: [{ title: "🔴 Nesne Silme (Kırmızı Fırça)", desc: "Silmek istediğin kişi/nesnenin üzerinden tek bir kalın çizgi geçmen yeterli — sistem otomatik olarak tüm objeyi algılayıp temizler." }, { title: "🔵 Estetik Rötuş (Mavi Fırça)", desc: "Sadece pürüzsüzleştirilecek küçük bölgeleri boya. Yüz kimliği korunur, cilt yumuşatılır." }, { title: "📐 Mobil Kullanım", desc: "Parmakla çiziminde kenarlar otomatik genişletilir, milimetrik hassasiyete gerek yok." }, { title: "💎 Kredi Kullanımı", desc: "Her başarılı işlem kredi düşer. Başarısız denemelerde kredi iade edilir." }], fullFaq: "Tam SSS Sayfasına Git →" },
    nav: { studio: "Stüdyo / Yükle", backgrounds: "İkonik Mekanlar", pricing: "Fiyatlandırma", help: "Yardım Merkezi / SSS", objectRemoval: "Kişi / Nesne Sil", more: "Daha fazla", fullFaq: "Tam SSS Sayfası", brandKit: "Marka Kiti" },
  },
  en: {
    tagline: "Studio-grade background",
    title1: "Remove backgrounds", title2: "in seconds", title3: "",
    subtitle: "Drag & drop your photo, we handle the rest. Download as a transparent PNG.",
    drop: "Drop your photo here",
    dropHint: "or click to select • PNG, JPG, WEBP • Max 10MB",
    selectFile: "Select File",
    samples: "Or try one of the sample photos",
    original: "Original", removed: "Background removed",
    working: "Working...", modelHint: "First run downloads the model (~45MB)",
    freezeHint: "The spinner may look frozen — that's normal, please wait (10-15 sec).",
    waiting: "Waiting",
    newPhoto: "New Photo", download: "Download PNG", downloadComposite: "Download with BG", share: "Share",
    starting: "Starting...",
    errImg: "Please select an image file.", errSize: "File too large (max 10MB).", errGeneric: "Something went wrong", errProcess: "Processing could not start on this device. Please try again.", errDecode: "This phone photo format could not be converted. Please try sharing the image as JPG from the gallery.",
    privacyGuarantee: "Your photo never reaches our servers — 100% on-device processing, 100% privacy guaranteed.",
    demoBefore: "Before", demoAfter: "After", demoCaption: "Drag the slider — this is what happens in seconds.",
    bulkHint: "Bulk Upload — up to 100 photos at once",
    livePreview: "Live Preview", vsTitle1: "Before", vsTitle2: "vs After", vsCaption: "Drag the slider — see the real result with your own eyes.",
    freeCreditBadge: "Free fast preview",
    creditsTitle: "Get credits",
    creditUnit: "credits",
    account: "Account",
    signedInAs: "Signed in as",
    buyCredits: "Get credits",
    signOut: "Sign out",
    login: "Sign in",
    adLeaderboard: "Ad · 728×90 / Responsive",
    adSquare: "Ad · 300×100",
    sampleLabels: { product: "Product", model: "Model", car: "Car" },
    sampleAlts: { product: "Product sample", model: "Model sample", car: "Car sample" },
    sampleTry: "Try",
    sampleAria: (label: string) => `Try ${label} sample`,
    freeAccountHint: "ℹ️ Create a free account to test — 1 credit included",
    freeTierLabel: "Free Tier:",
    freeTierText: "Standard resolution & watermarked.",
    freeTierCta: "Upgrade to Premium",
    freeTierTail: "for 4K HD, flawless edges, and no watermark.",
    clickErase: "Click & Erase",
    clickEraseLabels: { title: "Eraser", hint: "Drag your finger/mouse over the leftover — only the pixels you touch become transparent. Adjust brush size below.", close: "Close", undo: "Undo", apply: "Apply", cancel: "Cancel", brushSize: "Brush" },
    compareAria: "Drag to compare",
    shareFallbackText: "I removed the background with BgRemovify!",
    freeTryHint: "Try 1 photo for free – no registration required!",
    objectRemovalCta: { title: "Welcome to our new studio!", badge: "", desc: "Keep or replace the background, tap the object you want to remove — refine the result together.", open: "Open Studio" },
    studioComingSoon: { title: "Iconic Locations — Coming Soon", desc: "Studio scenes are being tuned for perspective and scale matching. They will appear here when opened to members." },
    helpQuick: { badge: "💡 HELP CENTER", title: "Quick Usage Guide", subtitle: "Tips for brush tools, object removal, and aesthetic retouch.", cards: [{ title: "🔴 Object Removal (Red Brush)", desc: "One thick stroke over the person/object is enough — the system detects the full target and cleans it automatically." }, { title: "🔵 Aesthetic Retouch (Blue Brush)", desc: "Paint only the small areas you want to smooth. Facial identity is preserved while skin is softened." }, { title: "📐 Mobile Use", desc: "Finger strokes are expanded automatically, so pixel-perfect painting is not required." }, { title: "💎 Credit Use", desc: "Credits are used only after a successful result. Failed attempts are not charged." }], fullFaq: "Go to Full FAQ →" },
    nav: { studio: "Studio / Upload", backgrounds: "Iconic Locations", pricing: "Pricing", help: "Help Center / FAQ", objectRemoval: "Remove Person / Object", more: "More", fullFaq: "Full FAQ Page", brandKit: "Brand Kit" },
  },
  es: {
    tagline: "Fondo con calidad de estudio",
    title1: "Elimina fondos", title2: "en segundos", title3: "",
    subtitle: "Arrastra tu foto y nosotros hacemos el resto. Descarga como PNG transparente.",
    drop: "Suelta tu foto aquí",
    dropHint: "o haz clic para seleccionar • PNG, JPG, WEBP • Máx 10MB",
    selectFile: "Elegir archivo",
    samples: "O prueba con una foto de ejemplo",
    original: "Original", removed: "Sin fondo",
    working: "Trabajando...", modelHint: "La primera vez descarga el modelo (~45MB)",
    freezeHint: "El icono puede parecer congelado — es normal, espera (10-15 seg).",
    waiting: "Esperando",
    newPhoto: "Nueva foto", download: "Descargar PNG", downloadComposite: "Descargar con fondo", share: "Compartir",
    starting: "Iniciando...",
    errImg: "Selecciona un archivo de imagen.", errSize: "Archivo demasiado grande (máx 10MB).", errGeneric: "Ocurrió un error", errProcess: "No se pudo iniciar el procesamiento en este dispositivo. Inténtalo de nuevo.", errDecode: "No se pudo convertir este formato de foto del teléfono. Intenta compartirla como JPG desde la galería.",
    privacyGuarantee: "Tu foto nunca llega a nuestros servidores — 100% procesamiento local, 100% privacidad garantizada.",
    demoBefore: "Antes", demoAfter: "Después", demoCaption: "Arrastra el control — así queda en segundos.",
    bulkHint: "Carga masiva — hasta 100 fotos a la vez",
    livePreview: "Vista previa", vsTitle1: "Antes", vsTitle2: "vs Después", vsCaption: "Arrastra el control — ve el resultado real con tus propios ojos.",
    freeCreditBadge: "1 crédito gratis al registrarte",
    creditsTitle: "Comprar créditos",
    creditUnit: "créditos",
    account: "Cuenta",
    signedInAs: "Sesión iniciada como",
    buyCredits: "Comprar créditos",
    signOut: "Cerrar sesión",
    login: "Iniciar sesión",
    adLeaderboard: "Anuncio · 728×90 / Responsive",
    adSquare: "Anuncio · 300×100",
    sampleLabels: { product: "Producto", model: "Modelo", car: "Coche" },
    sampleAlts: { product: "Ejemplo de producto", model: "Ejemplo de modelo", car: "Ejemplo de coche" },
    sampleTry: "Probar",
    sampleAria: (label: string) => `Probar ejemplo de ${label}`,
    freeAccountHint: "ℹ️ Crea una cuenta gratis para probar — incluye 1 crédito",
    freeTierLabel: "Plan gratis:",
    freeTierText: "Resolución estándar y marca de agua.",
    freeTierCta: "Mejorar a Premium",
    freeTierTail: "para 4K HD, bordes perfectos y sin marca de agua.",
    clickErase: "Clic y borrar",
    clickEraseLabels: { title: "Borrador", hint: "Desliza el dedo/ratón sobre el residuo — solo los píxeles que tocas se vuelven transparentes. Ajusta el tamaño del pincel abajo.", close: "Cerrar", undo: "Deshacer", apply: "Aplicar", cancel: "Cancelar", brushSize: "Pincel" },
    compareAria: "Arrastra para comparar",
    shareFallbackText: "¡Eliminé el fondo con BgRemovify!",
    freeTryHint: "Prueba 1 foto gratis – ¡sin registro!",
    objectRemovalCta: { title: "¡Bienvenido a nuestro nuevo estudio!", badge: "", desc: "Conserva o cambia el fondo, toca el objeto que quieras eliminar — refina el resultado a tu gusto.", open: "Abrir Estudio" },
    studioComingSoon: { title: "Lugares Icónicos — Próximamente", desc: "Las escenas del estudio se están ajustando para perspectiva y escala. Aparecerán aquí cuando se abran a miembros." },
    helpQuick: { badge: "💡 CENTRO DE AYUDA", title: "Guía rápida", subtitle: "Consejos para pinceles, eliminación de objetos y retoque estético.", cards: [{ title: "🔴 Eliminación de objetos (Pincel rojo)", desc: "Una línea gruesa sobre la persona/objeto es suficiente — el sistema detecta el objetivo completo y lo limpia automáticamente." }, { title: "🔵 Retoque estético (Pincel azul)", desc: "Pinta solo pequeñas zonas para suavizar. La identidad facial se conserva." }, { title: "📐 Uso móvil", desc: "Los trazos con el dedo se expanden automáticamente, no hace falta precisión milimétrica." }, { title: "💎 Uso de créditos", desc: "Los créditos se descuentan solo con un resultado exitoso. Los fallos no se cobran." }], fullFaq: "Ir a FAQ completa →" },
    nav: { studio: "Estudio / Subir", backgrounds: "Lugares Icónicos", pricing: "Precios", help: "Centro de Ayuda / FAQ", objectRemoval: "Eliminar Persona / Objeto", more: "Más", fullFaq: "Página Completa de FAQ", brandKit: "Kit de Marca" },
  },
  de: {
    tagline: "Hintergrund in Studioqualität",
    title1: "Entferne Hintergründe", title2: "in Sekunden", title3: "",
    subtitle: "Foto per Drag & Drop ablegen, wir erledigen den Rest. Als transparentes PNG laden.",
    drop: "Foto hier ablegen",
    dropHint: "oder klicken zum Auswählen • PNG, JPG, WEBP • Max 10MB",
    selectFile: "Datei wählen",
    samples: "Oder probiere ein Beispielbild",
    original: "Original", removed: "Ohne Hintergrund",
    working: "In Arbeit...", modelHint: "Beim ersten Mal wird das Modell geladen (~45MB)",
    freezeHint: "Das Symbol kann eingefroren wirken — das ist normal, bitte warten (10-15 Sek.).",
    waiting: "Warten",
    newPhoto: "Neues Foto", download: "PNG laden", downloadComposite: "Mit Hintergrund laden", share: "Teilen",
    starting: "Startet...",
    errImg: "Bitte eine Bilddatei wählen.", errSize: "Datei zu groß (max 10MB).", errGeneric: "Ein Fehler ist aufgetreten", errProcess: "Die Verarbeitung konnte auf diesem Gerät nicht gestartet werden. Bitte erneut versuchen.", errDecode: "Dieses Handyfoto-Format konnte nicht umgewandelt werden. Bitte als JPG aus der Galerie teilen.",
    privacyGuarantee: "Ihr Foto erreicht nie unsere Server — 100% Verarbeitung auf dem Gerät, 100% Datenschutz garantiert.",
    demoBefore: "Vorher", demoAfter: "Nachher", demoCaption: "Schieberegler ziehen — so sieht's in Sekunden aus.",
    bulkHint: "Stapel-Upload — bis zu 100 Fotos gleichzeitig",
    livePreview: "Live-Vorschau", vsTitle1: "Vorher", vsTitle2: "vs Nachher", vsCaption: "Schieberegler ziehen — sieh das echte Ergebnis mit eigenen Augen.",
    freeCreditBadge: "1 kostenloses Credit bei Anmeldung",
    creditsTitle: "Credits kaufen",
    creditUnit: "Credits",
    account: "Konto",
    signedInAs: "Angemeldet als",
    buyCredits: "Credits kaufen",
    signOut: "Abmelden",
    login: "Anmelden",
    adLeaderboard: "Anzeige · 728×90 / Responsive",
    adSquare: "Anzeige · 300×100",
    sampleLabels: { product: "Produkt", model: "Model", car: "Auto" },
    sampleAlts: { product: "Produktbeispiel", model: "Model-Beispiel", car: "Autobeispiel" },
    sampleTry: "Testen",
    sampleAria: (label: string) => `${label}-Beispiel testen`,
    freeAccountHint: "ℹ️ Kostenloses Konto zum Testen erstellen — 1 Credit inklusive",
    freeTierLabel: "Gratis-Version:",
    freeTierText: "Standardauflösung mit Wasserzeichen.",
    freeTierCta: "Auf Premium upgraden",
    freeTierTail: "für 4K HD, saubere Kanten und ohne Wasserzeichen.",
    clickErase: "Klicken & löschen",
    clickEraseLabels: { title: "Radierer", hint: "Fahre mit Finger/Maus über den Rest — nur die berührten Pixel werden transparent. Passe die Pinselgröße unten an.", close: "Schließen", undo: "Rückgängig", apply: "Anwenden", cancel: "Abbrechen", brushSize: "Pinsel" },
    compareAria: "Zum Vergleichen ziehen",
    shareFallbackText: "Ich habe den Hintergrund mit BgRemovify entfernt!",
    freeTryHint: "1 Foto kostenlos testen – ohne Anmeldung!",
    objectRemovalCta: { title: "Willkommen in unserem neuen Studio!", badge: "", desc: "Hintergrund behalten oder ändern, tippe auf das Objekt, das entfernt werden soll — Ergebnis fein abstimmen.", open: "Studio öffnen" },
    studioComingSoon: { title: "Ikonische Orte — Bald", desc: "AI-Studio-Hintergründe werden aktuell auf Perspektive und Skalierung abgestimmt. Sie erscheinen hier, sobald sie für Mitglieder geöffnet sind." },
    helpQuick: { badge: "💡 HILFEBEREICH", title: "Kurzanleitung", subtitle: "Tipps für Pinselwerkzeuge, Objektentfernung und Retusche.", cards: [{ title: "🔴 Objekt entfernen (Roter Pinsel)", desc: "Ein dicker Strich über Person/Objekt genügt — das System erkennt das Ziel vollständig und reinigt automatisch." }, { title: "🔵 Retusche (Blauer Pinsel)", desc: "Male nur kleine Bereiche zum Glätten. Die Gesichtsidentität bleibt erhalten." }, { title: "📐 Mobile Nutzung", desc: "Fingerstriche werden automatisch erweitert, pixelgenaues Malen ist nicht nötig." }, { title: "💎 Credit-Nutzung", desc: "Credits werden nur bei erfolgreichem Ergebnis abgezogen. Fehlversuche kosten nichts." }], fullFaq: "Zur vollständigen FAQ →" },
    nav: { studio: "Studio / Upload", backgrounds: "Ikonische Orte", pricing: "Preise", help: "Hilfebereich / FAQ", objectRemoval: "Person / Objekt entfernen", more: "Mehr", fullFaq: "Vollständige FAQ-Seite", brandKit: "Marken-Kit" },
  },
  ru: {
    tagline: "Удаление фона с помощью ИИ",
    title1: "Удаляйте фоны", title2: "за секунды", title3: "",
    subtitle: "Перетащите фото — ИИ сделает всё остальное. Скачайте прозрачный PNG.",
    drop: "Перетащите фото сюда",
    dropHint: "или нажмите для выбора • PNG, JPG, WEBP • Макс 10 МБ",
    selectFile: "Выбрать файл",
    samples: "Или попробуйте пример",
    original: "Оригинал", removed: "Без фона",
    working: "ИИ работает...", modelHint: "При первом запуске загружается модель (~45 МБ)",
    freezeHint: "Значок может казаться замершим — это нормально, подождите (10-15 сек).",
    waiting: "Ожидание",
    newPhoto: "Новое фото", download: "Скачать PNG", downloadComposite: "Скачать с фоном", share: "Поделиться",
    starting: "Запуск...",
    errImg: "Пожалуйста, выберите файл изображения.", errSize: "Файл слишком большой (макс 10 МБ).", errGeneric: "Ошибка", errProcess: "Не удалось запустить обработку на этом устройстве. Попробуйте ещё раз.", errDecode: "Не удалось преобразовать формат фото с телефона. Попробуйте сохранить и отправить JPG из галереи.",
    privacyGuarantee: "Ваше фото никогда не попадает на наши серверы — 100% обработка на устройстве, 100% конфиденциальность.",
    demoBefore: "До", demoAfter: "После", demoCaption: "Двигайте ползунок — вот так за секунды.",
    bulkHint: "Массовая загрузка — до 100 фото за раз",
    livePreview: "Живой предпросмотр", vsTitle1: "До", vsTitle2: "и После", vsCaption: "Двигайте ползунок — увидите реальный результат ИИ своими глазами.",
    freeCreditBadge: "1 бесплатный кредит при регистрации",
    creditsTitle: "Купить кредиты",
    creditUnit: "кредитов",
    account: "Аккаунт",
    signedInAs: "Вы вошли как",
    buyCredits: "Купить кредиты",
    signOut: "Выйти",
    login: "Войти",
    adLeaderboard: "Реклама · 728×90 / Responsive",
    adSquare: "Реклама · 300×100",
    sampleLabels: { product: "Товар", model: "Модель", car: "Авто" },
    sampleAlts: { product: "Пример товара", model: "Пример модели", car: "Пример авто" },
    sampleTry: "Попробовать",
    sampleAria: (label: string) => `Попробовать пример: ${label}`,
    freeAccountHint: "ℹ️ Создайте бесплатный аккаунт для теста — 1 кредит в подарок",
    freeTierLabel: "Бесплатный план:",
    freeTierText: "Стандартное разрешение и водяной знак.",
    freeTierCta: "Перейти на Premium",
    freeTierTail: "для 4K HD, аккуратных краёв и скачивания без водяного знака.",
    clickErase: "Кликнуть и стереть",
    clickEraseLabels: { title: "Ластик", hint: "Проведите пальцем/мышью по остаткам — прозрачными станут только те пиксели, которых вы коснулись. Размер кисти настраивается ниже.", close: "Закрыть", undo: "Отменить", apply: "Применить", cancel: "Отмена", brushSize: "Кисть" },
    compareAria: "Перетащите для сравнения",
    shareFallbackText: "Я удалил фон с помощью BgRemovify!",
    freeTryHint: "Попробуйте 1 фото бесплатно — без регистрации!",
    objectRemovalCta: { title: "Добро пожаловать в нашу новую студию!", badge: "", desc: "Сохраните или замените фон, коснитесь объекта, который нужно удалить — доведите результат до совершенства.", open: "Открыть студию" },
    studioComingSoon: { title: "Знаковые места — скоро", desc: "Студийные сцены сейчас настраиваются по перспективе и масштабу. Они появятся здесь после открытия для участников." },
    helpQuick: { badge: "💡 ЦЕНТР ПОМОЩИ", title: "Краткое руководство", subtitle: "Советы по кистям, удалению объектов и AI-ретуши.", cards: [{ title: "🔴 Удаление объектов (красная кисть)", desc: "Достаточно одного толстого штриха по человеку/объекту — система сама распознает цель и очистит её." }, { title: "🔵 AI-ретушь (синяя кисть)", desc: "Закрасьте только небольшие зоны для сглаживания. Личность лица сохраняется." }, { title: "📐 Мобильное использование", desc: "Штрихи пальцем расширяются автоматически, пиксельная точность не нужна." }, { title: "💎 Использование кредитов", desc: "Кредиты списываются только при успешном результате. Неудачные попытки не оплачиваются." }], fullFaq: "Перейти к полной FAQ →" },
    nav: { studio: "Студия / Загрузка", backgrounds: "Знаковые места", pricing: "Тарифы", help: "Центр помощи / FAQ", objectRemoval: "Удалить человека / объект", more: "Ещё", fullFaq: "Полная страница FAQ", brandKit: "Бренд-кит" },
  },
  ar: {
    tagline: "إزالة الخلفية بالذكاء الاصطناعي",
    title1: "أزل الخلفيات", title2: "في ثوانٍ", title3: "",
    subtitle: "اسحب صورتك وأفلتها، والذكاء الاصطناعي يتولى الباقي. حمّلها كـ PNG شفاف.",
    drop: "أسقط صورتك هنا",
    dropHint: "أو انقر للتحديد • PNG, JPG, WEBP • بحد أقصى 10 ميجابايت",
    selectFile: "اختر ملفاً",
    samples: "أو جرّب إحدى الصور التجريبية",
    original: "الأصلية", removed: "بدون خلفية",
    working: "جارٍ المعالجة...", modelHint: "يتم تنزيل النموذج في المرة الأولى (~45 ميجابايت)",
    freezeHint: "قد تبدو الأيقونة متجمدة — هذا طبيعي، يرجى الانتظار (10-15 ثانية).",
    waiting: "في الانتظار",
    newPhoto: "صورة جديدة", download: "تحميل PNG", downloadComposite: "تحميل مع الخلفية", share: "مشاركة",
    starting: "جارٍ البدء...",
    errImg: "يرجى اختيار ملف صورة.", errSize: "الملف كبير جداً (بحد أقصى 10 ميجابايت).", errGeneric: "حدث خطأ ما", errProcess: "تعذر بدء المعالجة على هذا الجهاز. يرجى المحاولة مرة أخرى.", errDecode: "تعذر تحويل صيغة صورة الهاتف هذه. جرّب مشاركتها كملف JPG من المعرض.",
    privacyGuarantee: "صورتك لا تصل أبدًا إلى خوادمنا — 100% معالجة على الجهاز، 100% خصوصية مضمونة.",
    demoBefore: "قبل", demoAfter: "بعد", demoCaption: "اسحب الشريط — هكذا في ثوانٍ.",
    bulkHint: "تحميل جماعي — حتى 100 صورة دفعة واحدة",
    livePreview: "معاينة مباشرة", vsTitle1: "قبل", vsTitle2: "vs بعد", vsCaption: "اسحب الشريط — شاهد نتيجة الذكاء الاصطناعي الحقيقية بعينيك.",
    freeCreditBadge: "رصيد مجاني واحد عند التسجيل",
    creditsTitle: "شراء أرصدة",
    creditUnit: "رصيد",
    account: "الحساب",
    signedInAs: "تم تسجيل الدخول باسم",
    buyCredits: "شراء أرصدة",
    signOut: "تسجيل الخروج",
    login: "تسجيل الدخول",
    adLeaderboard: "إعلان · 728×90 / Responsive",
    adSquare: "إعلان · 300×100",
    sampleLabels: { product: "منتج", model: "عارض", car: "سيارة" },
    sampleAlts: { product: "مثال منتج", model: "مثال عارض", car: "مثال سيارة" },
    sampleTry: "جرّب",
    sampleAria: (label: string) => `جرّب مثال ${label}`,
    freeAccountHint: "ℹ️ أنشئ حسابًا مجانيًا للتجربة — رصيد مجاني واحد هدية",
    freeTierLabel: "الخطة المجانية:",
    freeTierText: "دقة قياسية مع علامة مائية.",
    freeTierCta: "الترقية إلى Premium",
    freeTierTail: "للحصول على 4K HD وحواف نظيفة وبدون علامة مائية.",
    clickErase: "انقر وامسح",
    clickEraseLabels: { title: "الممحاة", hint: "مرّر إصبعك/الفأرة فوق البقايا — تصبح شفافة فقط البكسلات التي تلمسها. اضبط حجم الفرشاة من الأسفل.", close: "إغلاق", undo: "تراجع", apply: "تطبيق", cancel: "إلغاء", brushSize: "الفرشاة" },
    compareAria: "اسحب للمقارنة",
    shareFallbackText: "أزلت الخلفية باستخدام BgRemovify!",
    freeTryHint: "جرب صورة واحدة مجاناً — بدون تسجيل!",
    objectRemovalCta: { title: "مرحباً بك في استوديونا الجديد!", badge: "", desc: "احتفظ بالخلفية أو غيّرها، وانقر على العنصر الذي تريد إزالته — واضبط النتيجة كما تحب.", open: "افتح الاستوديو" },
    studioComingSoon: { title: "أماكن مميزة — قريبًا", desc: "يتم ضبط مشاهد الاستوديو حاليًا لتطابق المنظور والحجم. ستظهر هنا عند فتحها للأعضاء." },
    helpQuick: { badge: "💡 مركز المساعدة", title: "دليل استخدام سريع", subtitle: "نصائح لأدوات الفرشاة وإزالة الكائنات والتنقيح الجمالي.", cards: [{ title: "🔴 إزالة الكائنات (الفرشاة الحمراء)", desc: "يكفي خط سميك واحد فوق الشخص/الكائن — يكتشف النظام الهدف كاملًا وينظفه تلقائيًا." }, { title: "🔵 تنقيح جمالي (الفرشاة الزرقاء)", desc: "لوّن المناطق الصغيرة فقط للتنعيم. يتم الحفاظ على هوية الوجه." }, { title: "📐 استخدام الهاتف", desc: "يتم توسيع ضربات الإصبع تلقائيًا، ولا تحتاج إلى دقة بكسل مثالية." }, { title: "💎 استخدام الرصيد", desc: "يُخصم الرصيد فقط عند نجاح النتيجة. المحاولات الفاشلة لا تُحتسب." }], fullFaq: "اذهب إلى الأسئلة الكاملة →" },
    nav: { studio: "الاستوديو / رفع", backgrounds: "أماكن مميزة", pricing: "الأسعار", help: "مركز المساعدة / الأسئلة", objectRemoval: "إزالة شخص / كائن", more: "المزيد", fullFaq: "صفحة الأسئلة الكاملة", brandKit: "حزمة العلامة" },
  },
} as const;

type ClientExperienceCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  showAll: string;
  showLess: string;
  verified: string;
  ratingLabel: string;
};

const CLIENT_EXPERIENCE_COPY: Record<Lang, ClientExperienceCopy> = {
  tr: {
    eyebrow: "Client Experiences",
    title: "Gerçek kullanıcı deneyimleri",
    summary: "E-ticaret, içerik üretimi ve stüdyo hazırlığında bgremovify kullanan ekiplerden kısa notlar.",
    showAll: "Tümünü gör",
    showLess: "Daha az göster",
    verified: "Doğrulandı",
    ratingLabel: "5 üzerinden 5 yıldız",
  },
  en: {
    eyebrow: "Client Experiences",
    title: "Real user experiences",
    summary: "Short notes from teams using bgremovify for e-commerce, content production, and studio prep.",
    showAll: "See all reviews",
    showLess: "Show fewer",
    verified: "Verified",
    ratingLabel: "5 out of 5 stars",
  },
  es: {
    eyebrow: "Client Experiences",
    title: "Experiencias reales de usuarios",
    summary: "Notas breves de equipos que usan bgremovify para e-commerce, contenido y preparación de estudio.",
    showAll: "Ver todas las reseñas",
    showLess: "Mostrar menos",
    verified: "Verificado",
    ratingLabel: "5 de 5 estrellas",
  },
  de: {
    eyebrow: "Client Experiences",
    title: "Echte Nutzererfahrungen",
    summary: "Kurze Stimmen von Teams, die bgremovify für E-Commerce, Content-Produktion und Studio-Vorbereitung nutzen.",
    showAll: "Alle Bewertungen ansehen",
    showLess: "Weniger anzeigen",
    verified: "Verifiziert",
    ratingLabel: "5 von 5 Sternen",
  },
  ru: {
    eyebrow: "Client Experiences",
    title: "Реальный опыт пользователей",
    summary: "Короткие отзывы команд, использующих bgremovify для e-commerce, контента и подготовки студийных фото.",
    showAll: "Показать все отзывы",
    showLess: "Скрыть часть",
    verified: "Подтверждено",
    ratingLabel: "5 из 5 звёзд",
  },
  ar: {
    eyebrow: "Client Experiences",
    title: "تجارب مستخدمين حقيقية",
    summary: "ملاحظات قصيرة من فرق تستخدم bgremovify للتجارة الإلكترونية وصناعة المحتوى وتجهيز صور الاستوديو.",
    showAll: "عرض كل المراجعات",
    showLess: "عرض أقل",
    verified: "موثّق",
    ratingLabel: "5 من 5 نجوم",
  },
};

// Convert an ISO 3166-1 alpha-2 country code (e.g. "TR", "MA") into its
// regional-indicator flag emoji. Falls back to an empty string for invalid input,
// so future reviews from any country render the correct flag automatically.
function getFlagEmoji(countryCode: string): string {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65);
}

const GLOBAL_CLIENT_EXPERIENCES = [
  {
    name: "Muammer Polat",
    role: "E-commerce seller",
    country: "Türkiye",
    countryCode: "TR",
    quote: "Product photos are ready much faster now. Clean cutouts, no studio setup, no extra back-and-forth.",
  },
  {
    name: "Maga Volkov",
    role: "Marketplace operator",
    country: "Kazakhstan",
    countryCode: "KZ",
    quote: "Bulk product visuals feel consistent across listings. The fast lane saves real time before publishing campaigns.",
  },
  {
    name: "M. Kadaoui",
    role: "Content creator",
    country: "Morocco",
    countryCode: "MA",
    quote: "I can remove backgrounds, test studio looks, and download assets without switching between multiple tools.",
  },
  {
    name: "Asajful Malik",
    role: "Online catalog editor",
    country: "UAE",
    countryCode: "AE",
    quote: "The transparent PNG output is reliable for catalog work and social media creatives.",
  },
  {
    name: "M. Begimberdiqulova",
    role: "Small business owner",
    country: "Uzbekistan",
    countryCode: "UZ",
    quote: "It is simple enough for daily use and the before/after result is easy to trust before download.",
  },
] as const;


function getClientExperienceCopy(lang: Lang): ClientExperienceCopy {
  return { ...CLIENT_EXPERIENCE_COPY.en, ...(CLIENT_EXPERIENCE_COPY[lang] ?? {}) };
}

function ClientExperiences({ lang }: { lang: Lang }) {
  const [expanded, setExpanded] = useState(false);
  const [dynamicReviews, setDynamicReviews] = useState<Array<{ name: string; role: string; country: string; countryCode: string; quote: string }>>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { listApprovedReviews } = await import("@/lib/reviews.functions");
        const r = await listApprovedReviews();
        if (mounted && Array.isArray(r)) setDynamicReviews(r);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);
  const copy = getClientExperienceCopy(lang);
  const allExperiences = [...dynamicReviews, ...GLOBAL_CLIENT_EXPERIENCES];
  const visibleExperiences = expanded ? allExperiences : allExperiences.slice(0, 3);

  return (
    <section className="max-w-5xl mx-auto mt-6 mb-6 sm:mt-8 sm:mb-8 px-2" aria-labelledby="client-experiences-title">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <span aria-hidden>★</span>
            {copy.eyebrow}
          </div>
          <h2 id="client-experiences-title" className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            {copy.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded((next) => !next);
            trackEvent("ClientExperiencesToggle", { expanded: !expanded, lang });
          }}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? copy.showLess : copy.showAll}
          <span aria-hidden className="ml-2">{expanded ? "↑" : "↓"}</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {visibleExperiences.map((item) => (
          <article key={item.name} className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-primary text-sm" aria-label={copy.ratingLabel}>★★★★★</div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {copy.verified}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">“{item.quote}”</p>
            <div className="mt-4 border-t border-border/70 pt-3">
              <div className="font-semibold text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.role} · {item.country} {getFlagEmoji(item.countryCode)}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type UiStage = "starting" | RemoveBgStage;

const STAGE_ORDER: RemoveBgStage[] = ["model", "prepare", "remove", "apply", "finalize"];
const STAGE_PROGRESS: Record<UiStage, number> = {
  starting: 8,
  model: 24,
  prepare: 44,
  remove: 68,
  apply: 88,
  finalize: 96,
};

const STAGE_LABELS: Record<Lang, Record<UiStage, string>> = {
  tr: {
    starting: "İş başlatılıyor",
    model: "Model yükleniyor",
    prepare: "Görsel hazırlanıyor",
    remove: "Arkaplan kaldırılıyor",
    apply: "Maske uygulanıyor",
    finalize: "PNG hazırlanıyor",
  },
  en: {
    starting: "Starting the job",
    model: "Loading the model",
    prepare: "Preparing the image",
    remove: "Removing the background",
    apply: "Applying the mask",
    finalize: "Preparing PNG",
  },
  es: {
    starting: "Iniciando el proceso",
    model: "Cargando el modelo",
    prepare: "Preparando la imagen",
    remove: "Eliminando el fondo",
    apply: "Aplicando la máscara",
    finalize: "Preparando el PNG",
  },
  de: {
    starting: "Vorgang startet",
    model: "Modell wird geladen",
    prepare: "Bild wird vorbereitet",
    remove: "Hintergrund wird entfernt",
    apply: "Maske wird angewendet",
    finalize: "PNG wird vorbereitet",
  },
  ru: {
    starting: "Запуск обработки",
    model: "Загрузка модели",
    prepare: "Подготовка изображения",
    remove: "Удаление фона",
    apply: "Применение маски",
    finalize: "Подготовка PNG",
  },
  ar: {
    starting: "بدء المعالجة",
    model: "جارٍ تحميل النموذج",
    prepare: "جارٍ تجهيز الصورة",
    remove: "جارٍ إزالة الخلفية",
    apply: "جارٍ تطبيق القناع",
    finalize: "جارٍ تجهيز PNG",
  },
};

const META: Record<Lang, { title: string; desc: string }> = {
  tr: { title: "BgRemovify — Stüdyo Kalitesinde Arka Plan", desc: "Fotoğrafını yükle, tarayıcıda arka planı temizleyelim. Ücretsiz, sunucusuz, gizli." },
  en: { title: "BgRemovify — Studio-Grade Background", desc: "Upload your photo, we remove the background in your browser. Free, serverless, private." },
  es: { title: "BgRemovify — Fondo con calidad de estudio", desc: "Sube tu foto y eliminamos el fondo en tu navegador. Gratis, sin servidor, privado." },
  de: { title: "BgRemovify — Hintergrund in Studioqualität", desc: "Foto hochladen, wir entfernen den Hintergrund im Browser. Kostenlos, serverlos, privat." },
  ru: { title: "BgRemovify — ИИ удаление фона", desc: "Загрузите фото — ИИ удалит фон прямо в браузере. Бесплатно, без сервера, приватно." },
  ar: { title: "BgRemovify — مزيل الخلفية بالذكاء الاصطناعي", desc: "ارفع صورتك ليقوم الذكاء الاصطناعي بإزالة الخلفية في متصفحك. مجاني وخاص." },
};

type IndexView = "studio" | "backgrounds" | "pricing" | "help";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { lang?: Lang; view?: IndexView } => {
    const out: { lang?: Lang; view?: IndexView } = {};
    const l = search.lang;
    if (typeof l === "string" && (l in META)) out.lang = l as Lang;
    const v = search.view;
    if (v === "studio" || v === "backgrounds" || v === "pricing" || v === "help") out.view = v;
    return out;
  },
  loaderDeps: ({ search }) => ({ lang: search.lang ?? "tr" as Lang }),
  loader: ({ deps }) => ({ lang: deps.lang as Lang }),
  head: ({ loaderData }) => {
    const lang: Lang = loaderData?.lang ?? "tr";
    const m = META[lang] ?? META.tr;
    const url = `https://www.bgremovify.com/${lang === "tr" ? "" : `?lang=${lang}`}`;
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.desc },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: m.title },
        { name: "twitter:description", content: m.desc },
      ],
      links: SAMPLE_PRELOAD_URLS.map((href) => ({ rel: "preload", as: "image", href })),
    };
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [lang, setLangState] = useState<Lang>(search.lang ?? "en");
  const t = T[lang];
  // Merkezi sözlük + IP/tarayıcı tabanlı otomatik dil tespiti (Tur 1 i18n).
  const { t: tr } = useDict(lang);
  const [signupCredits, setSignupCredits] = useState<number>(0);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await fetchPlatformSettingsCached();
        if (!mounted || !s) return;
        const c = Number(s.signup_credits);
        if (Number.isFinite(c) && c >= 0) setSignupCredits(Math.floor(c));
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  const freeCreditBadgeText = ((): string => {
    const n = signupCredits;
    switch (lang) {
      case "tr": return `Kayıt olunca ${n} ücretsiz kredi`;
      case "es": return n === 1 ? "1 crédito gratis al registrarte" : `${n} créditos gratis al registrarte`;
      case "de": return n === 1 ? "1 kostenloses Credit bei Anmeldung" : `${n} kostenlose Credits bei Anmeldung`;
      case "ru": return n === 1 ? "1 бесплатный кредит при регистрации" : `${n} бесплатных кредита при регистрации`;
      case "ar": return n === 1 ? "رصيد مجاني واحد عند التسجيل" : `${n} أرصدة مجانية عند التسجيل`;
      default: return n === 1 ? "1 free credit on sign-up" : `${n} free credits on sign-up`;
    }
  })();

  const setLang = (next: Lang) => {
    setLangState(next);
    setStoredLanguage(next);
    navigate({ search: { ...search, lang: next }, replace: true });
  };
  // Init analytics (UTM capture + session id + geo warmup) and admin keyboard shortcut.
  useEffect(() => {
    initAnalytics();
    void trackEvent("page_view", { path: "/" });
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        navigate({ to: "/admin" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    if (search.lang && search.lang !== lang) {
      setLangState(search.lang);
      setStoredLanguage(search.lang);
      return;
    }
    if (!search.lang) {
      const saved = readStoredLanguage() as Lang | null;
      if (saved && T[saved] && saved !== lang) setLangState(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.lang]);
  useEffect(() => {
    let cancelled = false;
    // IP → language mapping. URL param and localStorage take priority (handled above).
    const COUNTRY_TO_LANG: Record<string, Lang> = {
      // German
      DE: "de", AT: "de", CH: "de",
      // Russian (CIS)
      RU: "ru", KZ: "ru", UZ: "ru", KG: "ru", AZ: "ru", BY: "ru",
      // Spanish
      ES: "es", MX: "es", AR: "es", CL: "es", CO: "es",
      // Arabic
      SA: "ar", AE: "ar", EG: "ar", MA: "ar", QA: "ar", KW: "ar",
      // Turkish
      TR: "tr",
    };
    detectGeo().then((geo) => {
      if (cancelled) return;
      // Pricing region: KZ still gets local KZ pricing card
      if (geo.region === "KZ") {
        setGeoRegion("KZ");
        setPricingRegion("kz");
      }
      // Respect explicit URL param / saved choice
      if (search.lang) return;
      const saved = readStoredLanguage() as Lang | null;
      if (saved && T[saved]) return;
      const country = (geo.country ?? "").toUpperCase();
      // Fallback for unmapped countries (US, UK, NL, FR, IT, ...) → English
      const next: Lang = COUNTRY_TO_LANG[country] ?? "en";
      setLangState(next);
      setStoredLanguage(next);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [search.lang]);

  useEffect(() => {
    setStoredLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const META: Record<Lang, { title: string; desc: string }> = {
      tr: { title: "BgRemovify — Stüdyo Kalitesinde Arka Plan", desc: "Fotoğrafını yükle, tarayıcıda arka planı temizleyelim. Ücretsiz, sunucusuz, gizli." },
      en: { title: "BgRemovify — Studio-Grade Background", desc: "Upload your photo, we remove the background in your browser. Free, serverless, private." },
      es: { title: "BgRemovify — Fondo con calidad de estudio", desc: "Sube tu foto y eliminamos el fondo en tu navegador. Gratis, sin servidor, privado." },
      de: { title: "BgRemovify — Hintergrund in Studioqualität", desc: "Foto hochladen, wir entfernen den Hintergrund im Browser. Kostenlos, serverlos, privat." },
      ru: { title: "BgRemovify — ИИ удаление фона", desc: "Загрузите фото — ИИ удалит фон прямо в браузере. Бесплатно, без сервера, приватно." },
      ar: { title: "BgRemovify — مزيل الخلفية بالذكاء الاصطناعي", desc: "ارفع صورتك ليقوم الذكاء الاصطناعي بإزالة الخلفية في متصفحك. مجاني وخاص." },
    };
    const m = META[lang];
    document.title = m.title;
    const setMeta = (sel: string, attr: string, name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', "name", "description", m.desc);
    setMeta('meta[property="og:title"]', "property", "og:title", m.title);
    setMeta('meta[property="og:description"]', "property", "og:description", m.desc);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", m.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", m.desc);
  }, [lang]);

  const [original, setOriginal] = useState<string | null>(null);
  
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<UiStage>("starting");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultUrlRef = useRef<string | null>(null);
  const activeRunRef = useRef(0);
  const processingLockRef = useRef(false);

  // Auth + credits
  const { user, signOut, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading, consume, refresh: refreshCredits } = useCredits(user?.id);
  const { isAdmin, loading: adminLoading } = useIsAdmin(user?.id);
  const { hasPaid } = useHasPaid(user?.id);

  const { sandbox: adminSandbox, liveTest: adminLiveTest, setLiveTest: setAdminLiveTest } = useAdminSandbox();

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"no_credits" | "manual" | "premium_required" | "studio_locked" | "anon_quota">("manual");
  const [studioBg, setStudioBg] = useState<StudioBg | null>(null);
  const [activeView, setActiveView] = useState<"studio" | "backgrounds" | "pricing" | "help">(search.view ?? "studio");
  useEffect(() => {
    if (search.view && search.view !== activeView) setActiveView(search.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.view]);
  const [bgOffsetY, setBgOffsetY] = useState<number>(8); // % from bottom for product placement
  const [bgScale, setBgScale] = useState<number>(72); // % of canvas height for product max size
  const [shadowOpacity, setShadowOpacity] = useState<number>(45); // 0-100 (%)
  const [shadowSpread, setShadowSpread] = useState<number>(55); // 0-100 (% of width)

  const STUDIO_FREE_USED_KEY = "bgr-studio-free-used-v1";
  const [studioFreeUsed, setStudioFreeUsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(STUDIO_FREE_USED_KEY) === "1"; } catch { return false; }
  });
  const hasPaidCredits = typeof credits === "number" && credits > 0;
  const premiumAccessLoading = authLoading || (!!user && (credits === null || creditsLoading || adminLoading));
  const isPremium = !premiumAccessLoading && (isAdmin || hasPaidCredits);
  const [isFreeTierResult, setIsFreeTierResult] = useState(false);
  const [clickModeOpen, setClickModeOpen] = useState(false);
  // Ultra HD upscale state
  const [upscaling, setUpscaling] = useState(false);
  const [upscalePickerOpen, setUpscalePickerOpen] = useState(false);
  const [upscaleNotice, setUpscaleNotice] = useState<string | null>(null);
  const [isUpscaledResult, setIsUpscaledResult] = useState(false);
  const [pricingHighlight, setPricingHighlight] = useState(false);
  const [pricingRegion, setPricingRegion] = useState<PricingRegion>(() => {
    if (typeof window === "undefined") return "global";
    try { return (localStorage.getItem("bgr-region") as PricingRegion) ?? "global"; } catch { return "global"; }
  });
  const [geoRegion, setGeoRegion] = useState<"KZ" | "GLOBAL">("GLOBAL");
  useEffect(() => {
    try { localStorage.setItem("bgr-region", pricingRegion); } catch { /* ignore */ }
  }, [pricingRegion]);
  const navAuth = useNavigate();

  const goToSignup = useCallback(() => {
    trackEvent("VipCtaSignup");
    
    navAuth({ to: "/auth", search: { redirect: "/", mode: "signup" } as never });
  }, [navAuth]);

  // Bulk upload state
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const bulkTimersRef = useRef<number[]>([]);

  // Dropzone flash highlight when user picks a bg before uploading
  const [dropzoneFlash, setDropzoneFlash] = useState(false);
  const flashUploadDropzone = useCallback(() => {
    const el = typeof document !== "undefined" ? document.getElementById("upload-dropzone") : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setDropzoneFlash(true);
    window.setTimeout(() => setDropzoneFlash(false), 2400);
    const msgs: Record<string, string> = {
      tr: "Önce ürün fotoğrafını yükle, sonra bu arka planı uygulayalım 👇",
      en: "Upload your product photo first, then we'll apply this background 👇",
      es: "Primero sube tu foto de producto, luego aplicaremos este fondo 👇",
      de: "Lade zuerst dein Produktfoto hoch, dann wenden wir diesen Hintergrund an 👇",
      ru: "Сначала загрузите фото товара, затем применим этот фон 👇",
      ar: "ارفع صورة منتجك أولاً، ثم سنطبق هذه الخلفية 👇",
    };
    toast(msgs[lang] ?? msgs.tr, { duration: 4000 });
  }, [lang]);

  useEffect(() => {
    return () => {
      bulkTimersRef.current.forEach((t) => window.clearTimeout(t));
      bulkItems.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Free-tier Studio render hakkı: ancak gerçekten render tamamlandığında tüketilir.
  // Böylece kullanıcı önce arka plan seçip sonra fotoğraf yüklerse hakkı boşa gitmez.
  useEffect(() => {
    if (!result || !studioBg) return;
    if (isPremium || isAdmin) return;
    if (studioFreeUsed) return;
    setStudioFreeUsed(true);
    try { window.localStorage.setItem(STUDIO_FREE_USED_KEY, "1"); } catch { /* ignore */ }
    trackEvent("StudioFreeTrialConsumed", { bg: studioBg.id });
  }, [result, studioBg, isPremium, isAdmin, studioFreeUsed]);

  const addBulkFiles = useCallback((files: File[]) => {
    setBulkItems((prev) => {
      const room = BULK_MAX - prev.length;
      const accepted = files
        .filter(isImageUpload)
        .filter((f) => f.size <= 10 * 1024 * 1024)
        .slice(0, room);
      const newItems: BulkItem[] = accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        progress: 0,
      }));
      return [...prev, ...newItems];
    });
  }, []);

  const removeBulkItem = useCallback((id: string) => {
    setBulkItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearBulk = useCallback(() => {
    bulkTimersRef.current.forEach((t) => window.clearTimeout(t));
    bulkTimersRef.current = [];
    setBulkItems((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return [];
    });
    setBulkProcessing(false);
  }, []);

  const bulkFileInput = useRef<HTMLInputElement>(null);

  const clearResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearResultUrl();
  }, [clearResultUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    SAMPLE_PRELOAD_URLS.forEach((url) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      if (typeof image.decode === "function") {
        void image.decode().catch(() => undefined);
      }
    });
  }, []);

  useEffect(() => {
    if (!loading) return;

    const isFinalize = stage === "finalize";
    const intervalMs = isFinalize ? 1600 : 220;
    const target = isFinalize ? 99 : Math.min(STAGE_PROGRESS[stage] + 6, 99);

    const intervalId = window.setInterval(() => {
      setProgress((current) => {
        return current < target ? current + 1 : current;
      });
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [loading, stage]);

  const runUpscale = useServerFn(upscaleImage);

  const handleUpscale = useCallback(async (tier: UpscaleTier) => {
    if (!result || upscaling) return;
    const labels = UPSCALE_LABELS[lang];

    // Auth gate — upscale is a paid server-side feature.
    if (!user) {
      setUpscalePickerOpen(false);
      trackEvent("AuthGateHit", { reason: "upscale_anon" });
      navAuth({ to: "/auth", search: { redirect: "/" } });
      return;
    }

    const cost = tier === "studio" ? 2 : 1;
    if (!isAdmin && (credits ?? 0) < cost) {
      setUpscalePickerOpen(false);
      setPaywallReason("no_credits");
      setPaywallOpen(true);
      trackEvent("PaywallOpened", { reason: "upscale_no_credits", tier });
      return;
    }

    setUpscalePickerOpen(false);
    setUpscaling(true);
    setUpscaleNotice(null);
    setError(null);
    trackEvent("UpscaleStarted", { tier });

    try {
      const originalCutout = result;
      const res = await runUpscale({ data: { imageDataUrl: originalCutout, tier, mock: isAdmin && adminSandbox } });
      if (!res.ok) {
        if (res.reason === "no_credits") {
          setPaywallReason("no_credits");
          setPaywallOpen(true);
          trackEvent("PaywallOpened", { reason: "upscale_no_credits", tier });
          void refreshCredits();
          return;
        }
        setUpscaleNotice(labels.errGeneric);
        trackEvent("UpscaleFailed", { tier, reason: res.reason });
        return;
      }

      // Replicate upscalers (Real-ESRGAN / Clarity) flatten alpha channel and
      // bake the background back in. Re-apply the original cutout's alpha mask
      // onto the upscaled RGB so transparency survives Ultra HD.
      let finalDataUrl = res.resultDataUrl;
      try {
        finalDataUrl = await reapplyAlphaMask(res.resultDataUrl, originalCutout);
      } catch (maskErr) {
        console.error("[upscaleImage] alpha reapply failed, using raw upscaled", maskErr);
      }

      setResult(finalDataUrl);
      setIsUpscaledResult(true);
      setIsFreeTierResult(false);
      setUpscaleNotice(labels.success(res.remainingCredits));
      void refreshCredits();
      trackEvent("UpscaleSucceeded", { tier, remaining: res.remainingCredits });
    } catch (err) {
      console.error("[upscaleImage] client error", err);
      setUpscaleNotice(labels.errGeneric);
      trackEvent("UpscaleFailed", { tier, reason: "client_error" });
    } finally {
      setUpscaling(false);
    }
  }, [result, upscaling, user, isAdmin, adminSandbox, credits, lang, runUpscale, refreshCredits, navAuth]);


  const processDataUrl = useCallback(async (dataUrl: string) => {
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    const isCurrentRun = () => activeRunRef.current === runId;
    const ANON_USED_KEY = "anon_free_used_v1";
    const anonAlreadyUsed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(ANON_USED_KEY) === "1";

    // Free preview copy. No artificial slow lane, no paid/provider fallback.
    const VIP_TOAST: Record<string, string> = {
      tr: "Görseliniz temizleniyor — işlem cihazınızda güvenli şekilde çalışıyor.",
      en: "Cleaning your image — processing runs safely on your device.",
      es: "Limpiando tu imagen — el proceso se ejecuta de forma segura en tu dispositivo.",
      de: "Bild wird freigestellt — die Verarbeitung läuft sicher auf deinem Gerät.",
      ru: "Очищаем изображение — обработка безопасно выполняется на вашем устройстве.",
      ar: "جارٍ تنظيف الصورة — تتم المعالجة بأمان على جهازك.",
    };

    setError(null);
    clearResultUrl();
    setResult(null);
    setOriginal(dataUrl);
    setLoading(true);
    setStage("starting");
    setProgress(STAGE_PROGRESS.starting);
    trackEvent("ImageUploadStarted", { anonymous: !user });

    const runLocalCutout = async () => {
      return await removeBackground(dataUrl, (nextStage) => {
        if (!isCurrentRun()) return;
        setStage(nextStage);
        setProgress(STAGE_PROGRESS[nextStage]);
      });
    };

    const applyWatermarkIfFree = async (blob: Blob, isPaid: boolean) => {
      if (isPaid) return blob;
      const { watermarkPngBlob } = await import("@/lib/watermark");
      return await watermarkPngBlob(blob);
    };

    // Anonymous flow: production-safe local preview only. No server/provider call,
    // no credit consumption, no hidden VIP lane cost.
    if (!user) {
      try {
        toast(VIP_TOAST[lang] ?? VIP_TOAST.tr, { duration: 3500 });
        const rawBlob = await runLocalCutout();
        if (!isCurrentRun()) return;
        const fallbackBlob = await applyWatermarkIfFree(rawBlob, isAdmin || hasPaid);
        if (!isCurrentRun()) return;
        const fallbackDataUrl = await fileToDataUrl(fallbackBlob);
        if (!isCurrentRun()) return;
        // Guest en hızlı yolda — hiçbir gecikme uygulanmaz.
        setStage("finalize");
        setProgress(100);
        setResult(fallbackDataUrl);
        setIsFreeTierResult(true);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ANON_USED_KEY, "1");
        }
        trackEvent("ImageProcessedAnonymous", { server: false, lane: anonAlreadyUsed ? "local_repeat" : "local_first" });
      } catch (err) {
        if (!isCurrentRun()) return;
        console.error("[anonymous local cutout] failed", err);
        // Keep the uploaded original visible so the user isn't yanked back to
        // the upload screen mid-flow. They can retry or upload a new photo.
        setStage("finalize");
        setProgress(0);
        const message = err instanceof Error ? err.message : "unknown_error";
        const SLOW_ERR: Record<string, string> = {
          tr: "Arka plan temizleme tamamlanamadı. Aynı fotoğrafla tekrar deneyin.",
          en: "Background removal could not finish. Please retry with the same photo.",
          es: "No se pudo completar la eliminación de fondo. Reinténtalo con la misma foto.",
          de: "Freistellen konnte nicht abgeschlossen werden. Bitte mit demselben Foto erneut versuchen.",
          ru: "Не удалось удалить фон. Повторите попытку с тем же фото.",
          ar: "تعذرت إزالة الخلفية. أعد المحاولة بالصورة نفسها.",
        };
        const errorText = SLOW_ERR[lang] ?? SLOW_ERR.tr;
        setError(errorText);
        toast.error(errorText, { duration: 6000 });
        trackEvent("AnonymousLocalCutoutFailed", { message: message.slice(0, 120) });
      } finally {
        if (isCurrentRun()) setLoading(false);
      }
      return;
    }
    // Signed-in default: same stable local cutout path. No timers, throttles,
    // provider retries, or fallback loops.
    try {
      const rawCutout = await runLocalCutout();
      if (!isCurrentRun()) return;
      const isPaid = isAdmin || hasPaid;
      const cutoutBlob = await applyWatermarkIfFree(rawCutout, isPaid);
      if (!isCurrentRun()) return;
      const cutoutDataUrl = await fileToDataUrl(cutoutBlob);
      if (!isCurrentRun()) return;
      setStage("finalize");
      setProgress(100);
      setResult(cutoutDataUrl);
      setIsFreeTierResult(!isPaid);
      trackEvent("ImageProcessedPro", { server: false, throttled: false });

    } catch (err) {
      if (!isCurrentRun()) return;
      const message = err instanceof Error ? err.message : "unknown_error";
      console.error("[local background removal] client error", err);
      // Keep the uploaded original visible so a mid-flight failure never yanks
      // the user back to the upload screen. Surface a paywall or inline error
      // on top of the still-visible image instead.
      setStage("finalize");
      setProgress(0);
      if (message.includes("no_credits")) {
        setPaywallReason("no_credits");
        setPaywallOpen(true);
        trackEvent("PaywallOpened", { reason: "no_credits" });
        void refreshCredits();
      } else if (message.includes("image_too_large")) {
        setError(t.errSize);
      } else if (message.includes("invalid_image_payload")) {
        setError(t.errImg);
      } else {
        setError(t.errGeneric);
      }
    } finally {
      if (isCurrentRun()) setLoading(false);
    }
  }, [clearResultUrl, user, navAuth, credits, isAdmin, hasPaid, adminSandbox, refreshCredits, lang, t]);

  // Kept around for legacy client-side path / future hybrid integration.
  void removeBackground;
  void consume;
  


  const processSample = useCallback(async (sample: (typeof SAMPLES)[number]) => {
    if (loading || processingLockRef.current) return;
    activeRunRef.current += 1;
    clearResultUrl();
    setError(null);
    setLoading(false);
    setStage("finalize");
    setProgress(100);
    setOriginal(sample.src);
    setResult(sample.removedSrc);
    setIsFreeTierResult(false);
        trackEvent("SampleProcessedInstant", { sample: sample.id });
      }, [clearResultUrl, loading]);

  const processFile = useCallback(async (file: File) => {
    if (loading || processingLockRef.current) return;
    if (!isImageUpload(file)) {
      setError(t.errImg);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t.errSize);
      return;
    }

    try {
      processingLockRef.current = true;
      setLoading(true);
      const normalized = await normalizeUpload(file);
      await processDataUrl(normalized);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      setError(
        message.includes("decode") ||
          message.includes("heic") ||
          message.includes("heif") ||
          message.includes("canvas") ||
          message.includes("memory")
          ? t.errDecode
          : t.errGeneric,
      );
      setLoading(false);
    } finally {
      processingLockRef.current = false;
    }
  }, [loading, processDataUrl, t]);


  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (loading) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;
    if (files.length === 1 && bulkItems.length === 0) {
      processFile(files[0]);
    } else {
      if (!user) {
        trackEvent("AuthGateHit");
        navAuth({ to: "/auth" });
        return;
      }
      addBulkFiles(files);
    }
  };

  const processBulk = useCallback(async () => {
    if (!user) {
      trackEvent("AuthGateHit");
      navAuth({ to: "/auth" });
      return;
    }
    if (bulkItems.length === 0 || bulkProcessing) return;
    setBulkProcessing(true);
    trackEvent("BulkProcessStarted", { count: bulkItems.length });

    bulkTimersRef.current.forEach((t) => window.clearTimeout(t));
    bulkTimersRef.current = [];

    const PER_ITEM_MS = 2400;
    const STAGGER = 350;

    const queue = bulkItems.filter((i) => i.status !== "done");
    queue.forEach((item, idx) => {
      const startAt = idx * STAGGER;
      // start
      bulkTimersRef.current.push(
        window.setTimeout(() => {
          setBulkItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: "processing", progress: 8 } : p)),
          );
        }, startAt),
      );
      // progress ticks
      [25, 55, 80, 95].forEach((pct, j) => {
        bulkTimersRef.current.push(
          window.setTimeout(() => {
            setBulkItems((prev) =>
              prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)),
            );
          }, startAt + ((j + 1) * PER_ITEM_MS) / 5),
        );
      });
      // done
      bulkTimersRef.current.push(
        window.setTimeout(() => {
          setBulkItems((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, status: "done", progress: 100, resultUrl: p.previewUrl }
                : p,
            ),
          );
        }, startAt + PER_ITEM_MS),
      );
    });

    // finish: stop spinner state and (since user is free) push them to premium
    const totalMs = (queue.length - 1) * STAGGER + PER_ITEM_MS + 250;
    bulkTimersRef.current.push(
      window.setTimeout(() => {
        setBulkProcessing(false);
        trackEvent("BulkProcessCompleted", { count: queue.length });
        // Free users → premium gate for the final ZIP download
        setPaywallReason("premium_required");
        setPaywallOpen(true);
        trackEvent("PaywallOpened", { reason: "bulk_complete" });
      }, totalMs),
    );
  }, [bulkItems, bulkProcessing, user, navAuth]);


  const reset = () => {
    activeRunRef.current += 1;
    processingLockRef.current = false;
    clearResultUrl();
    setOriginal(null);
    setResult(null);
    setError(null);
    setStage("starting");
    setProgress(0);
    setIsFreeTierResult(false);
    setIsUpscaledResult(false);
    setLoading(false);
    setUpscaleNotice(null);
    setPricingHighlight(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const flashPricing = useCallback(() => {
    setPricingHighlight(true);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      window.setTimeout(() => setPricingHighlight(false), 2800);
    }
  }, []);

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  const handleDownload = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      trackEvent("ImageDownloaded", { free_tier: isFreeTierResult });
      if (!result) return;
      if (isFreeTierResult) flashPricing();
      // iOS Safari: <a download> on a blob URL navigates away and resets app state.
      // Use Web Share API with a File so the user can "Save Image" / "Save to Files"
      // without leaving the page.
      if (isIOS) {
        e.preventDefault();
        try {
          const blob = await (await fetch(result)).blob();
          const file = new File([blob], "bgremovify.png", { type: "image/png" });
          const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
          if (nav.canShare && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
            await nav.share({ files: [file], title: "BgRemovify" });
            return;
          }
          // Last resort: open the image in a new tab so user can long-press → Save.
          window.open(result, "_blank", "noopener,noreferrer");
        } catch (err) {
          console.error(err);
        }
      }
      // Other platforms: let the browser handle the <a download> normally.
    },
    [result, isIOS, isFreeTierResult, flashPricing],
  );

  const [downloadingComposite, setDownloadingComposite] = useState(false);
  const handleDownloadComposite = useCallback(async () => {
    if (!result || !studioBg) return;
    setDownloadingComposite(true);
    try {
      trackEvent("CompositeDownloaded", { bg: studioBg.id });
      const loadImg = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const [bgImg, fgImg] = await Promise.all([loadImg(studioBg.url), loadImg(result)]);
      // Output size: cap to 2048 on long edge to keep files lean
      const MAX = 2048;
      const bgW = bgImg.naturalWidth;
      const bgH = bgImg.naturalHeight;
      const scale = Math.min(1, MAX / Math.max(bgW, bgH));
      const W = Math.round(bgW * scale);
      const H = Math.round(bgH * scale);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      // Background
      ctx.drawImage(bgImg, 0, 0, W, H);

      // Contact shadow (radial ellipse, mirrors the DOM preview)
      const op = shadowOpacity / 100;
      if (op > 0) {
        const shadowW = Math.max(10, shadowSpread) / 100 * W;
        const shadowH = 0.05 * H;
        const shadowCX = W / 2;
        const shadowBottom = H - Math.max(0, bgOffsetY - 2) / 100 * H;
        const shadowCY = shadowBottom - shadowH / 2;
        ctx.save();
        ctx.filter = "blur(6px)";
        const grad = ctx.createRadialGradient(shadowCX, shadowCY, 0, shadowCX, shadowCY, Math.max(shadowW, shadowH) / 2);
        grad.addColorStop(0, `rgba(0,0,0,${op})`);
        grad.addColorStop(0.45, `rgba(0,0,0,${op * 0.4})`);
        grad.addColorStop(0.75, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.translate(shadowCX, shadowCY);
        ctx.scale(shadowW / Math.max(shadowW, shadowH), shadowH / Math.max(shadowW, shadowH));
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(shadowW, shadowH) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Product image — height = bgScale% of H, maxWidth 92% of W, bottom anchored at bgOffsetY%
      const targetH = (bgScale / 100) * H;
      const maxW = 0.92 * W;
      const aspect = fgImg.naturalWidth / fgImg.naturalHeight;
      let drawH = targetH;
      let drawW = drawH * aspect;
      if (drawW > maxW) {
        drawW = maxW;
        drawH = drawW / aspect;
      }
      const fgBottom = H - (bgOffsetY / 100) * H;
      const fgX = (W - drawW) / 2;
      const fgY = fgBottom - drawH;

      if (op > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${op * 0.62})`;
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 18;
        ctx.drawImage(fgImg, fgX, fgY, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(fgImg, fgX, fgY, drawW, drawH);
      }

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.95),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bgremovify-${studioBg.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      if (isFreeTierResult) flashPricing();
    } catch (err) {
      console.error("composite download failed", err);
    } finally {
      setDownloadingComposite(false);
    }
  }, [result, studioBg, bgOffsetY, bgScale, shadowOpacity, shadowSpread, isFreeTierResult, flashPricing]);


  const handleShare = useCallback(async () => {
    if (!result) return;
    try {
      const blob = await (await fetch(result)).blob();
      const file = new File([blob], "bgremovify.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "BgRemovify" });
        trackEvent("ImageShared");
        return;
      }
      await navigator.share({ title: "BgRemovify", text: t.shareFallbackText, url: "https://www.bgremovify.com" });
      trackEvent("ImageShared", { fallback: true });
    } catch (err) {
      console.error(err);
    }
  }, [result, t.shareFallbackText]);

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-800">
      <TopNav
        rightSlot={
          <>
            {user && credits !== null && (
              <button
                onClick={() => { setPaywallReason("manual"); setPaywallOpen(true); trackEvent("PaywallOpened", { reason: "manual_credit_chip" }); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                title={t.creditsTitle}
              >
                <Sparkles className="size-3.5" />
                <span className="tabular-nums">{credits}</span>
              </button>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                    aria-label={t.account}
                  >
                    <UserIcon className="size-3.5" />
                    <span className="hidden max-w-[140px] truncate lg:inline">{user.email}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem disabled className="opacity-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{t.signedInAs}</span>
                      <span className="truncate text-sm">{user.email}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setPaywallReason("manual"); setPaywallOpen(true); trackEvent("PaywallOpened", { reason: "manual_menu" }); }} className="cursor-pointer gap-2">
                    <Sparkles className="size-4" /> {t.buyCredits}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => { await signOut(); refreshCredits(); }} className="cursor-pointer gap-2">
                    <LogOut className="size-4" /> {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                {t.login}
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                  aria-label="Language"
                >
                  <Globe className="size-3.5" />
                  <span>{lang.toUpperCase()}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {LANGS.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className="cursor-pointer gap-2"
                  >
                    <span className="text-base">{l.flag}</span>
                    <span className="flex-1">{l.label}</span>
                    {lang === l.code && <Check className="size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      {/* Legacy sidebar removed — navigation lives in the top header */}
      <aside className="hidden">

        <div className="px-5 py-5 border-b border-border flex items-center gap-2">
          <img src={logoImg} alt="bgremovify" className="size-7 rounded-md" />
          <div className="font-semibold tracking-tight">bgremovify</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
          {/* Views that live on this page (scrolls the landing) */}
          {([
            { id: "pricing", icon: ShieldCheck, label: t.nav.pricing, color: "text-primary" },
            { id: "help", icon: Wand2, label: t.nav.help, color: "text-amber-600" },
          ] as const).map((it) => {
            const Icon = it.icon;
            const active = activeView === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  setActiveView(it.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"}`}
              >
                <Icon className={`size-4 ${active ? "text-primary" : it.color}`} /> {it.label}
              </button>
            );
          })}
          {/* Studio bridges — jump straight into the Studio with the right tool/panel */}
          <Link to="/studio" search={{ tool: "bg-remove" }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground">
            <Upload className="size-4 text-primary" /> {t.nav.studio}
          </Link>
          <Link to="/studio" search={{ panel: "samples" }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground">
            <Sparkles className="size-4 text-primary" /> {t.nav.backgrounds}
          </Link>
          <Link to="/studio" search={{ tool: "bg-remove" }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground">
            <Eraser className="size-4 text-rose-600" /> {t.nav.objectRemoval}
          </Link>
          <div className="pt-3 mt-3 border-t border-border">
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t.nav.more}</div>
            <Link to="/help" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground">
              <Wand2 className="size-4 text-amber-600" /> {t.nav.fullFaq}
            </Link>
            <Link to="/brand" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground">
              <ImageIcon className="size-4 text-muted-foreground" /> {t.nav.brandKit}
            </Link>
          </div>
        </nav>
        {isAdmin && (
          <div className="px-3 pb-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setAdminLiveTest(!adminLiveTest)}
              title={adminLiveTest
                ? "Live test ON — gerçek Replicate çağrısı yapılır. Admin kredisi düşmez; sadece API maliyeti oluşur. Kapatmak için tıkla."
                : "Sandbox ON — Replicate çağrılmaz, kredi yakılmaz. Live test için tıkla."}
              className={`w-full rounded-md px-2 py-1.5 text-[11px] font-medium border transition ${
                adminLiveTest
                  ? "bg-red-600/90 text-white border-red-700 hover:bg-red-700"
                  : "bg-emerald-600/90 text-white border-emerald-700 hover:bg-emerald-700"
              }`}
            >
              {adminLiveTest ? "🔥 Live (admin)" : "🧪 Sandbox (MOCK)"}
            </button>
          </div>
        )}
        <div className="p-3 text-[11px] text-muted-foreground border-t border-border">
          © bgremovify · SaaS panel
        </div>
      </aside>





      <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-20 pb-28 sm:pb-20">


        {activeView === "studio" && !original && bulkItems.length === 0 && (
          <div
            id="upload-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => {
              if (!loading) fileInput.current?.click();
            }}
            className={`group relative max-w-5xl mx-auto mt-2 mb-8 sm:mb-12 cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-12 sm:p-24 text-center bg-card/60 backdrop-blur-sm overflow-hidden dropzone-aurora ${
              dragOver
                ? "border-primary scale-[1.01] is-active"
                : dropzoneFlash
                ? "border-primary scale-[1.015] is-active animate-pulse"
                : "border-border/70 hover:border-primary/60 hover:bg-card hover:-translate-y-0.5"
            }`}
            style={dragOver || dropzoneFlash ? { boxShadow: "var(--shadow-glow)" } : undefined}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                dragOver ? "opacity-100" : "opacity-0 group-hover:opacity-60"
              }`}
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 40%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
              }}
            />

            <div className="relative">
              <div
                className={`size-16 sm:size-20 mx-auto rounded-2xl flex items-center justify-center text-primary-foreground mb-5 sm:mb-7 transition-transform duration-300 ${
                  dragOver ? "scale-110 rotate-3" : "group-hover:scale-105 group-hover:-translate-y-1"
                }`}
                style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
              >
                <Upload className="size-8 sm:size-10" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-3">{t.drop}</h2>
              <p className="text-sm sm:text-lg text-muted-foreground mb-3 max-w-xl mx-auto">{t.dropHint}</p>
              <p className="text-xs sm:text-sm text-primary font-medium mb-6 sm:mb-7 inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> {t.bulkHint}
              </p>
              <div>
                <Button size="lg" type="button" className="transition-transform hover:scale-105">
                  <ImageIcon className="size-4" /> {t.selectFile}
                </Button>
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground font-medium">
                  {t.freeTryHint}
                </p>
              </div>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              disabled={loading}
              className="hidden"
              onChange={(e) => {
                if (loading) return;
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                if (files.length === 1) {
                  processFile(files[0]);
                } else {
                  if (!user) {
                    trackEvent("AuthGateHit");
                    navAuth({ to: "/auth" });
                    return;
                  }
                  addBulkFiles(files);
                }
                e.target.value = "";
              }}
            />
            <input
              ref={bulkFileInput}
              type="file"
              accept="image/*"
              multiple
              disabled={loading}
              className="hidden"
              onChange={(e) => {
                if (loading) return;
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) addBulkFiles(files);
                e.target.value = "";
              }}
            />
          </div>
        )}


        {activeView === "studio" && (<>
        {(original || bulkItems.length > 0) && (
        <section className="relative text-center max-w-3xl mx-auto pt-2 sm:pt-4 pb-4 sm:pb-6">
          {/* ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 size-[520px] rounded-full blur-3xl opacity-30"
            style={{ background: "var(--gradient-hero)" }}
          />

          <div
            className="relative inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium tracking-wide text-primary backdrop-blur-sm opacity-0 animate-fade-in"
            style={{ animationDelay: "60ms", animationFillMode: "forwards" }}
          >
            <Sparkles className="size-3.5" />
            <span className="uppercase">{t.tagline}</span>
          </div>

          <h1
            className="relative mt-5 text-4xl sm:text-7xl font-semibold tracking-tight leading-[1.05] opacity-0 animate-fade-in"
            style={{ animationDelay: "160ms", animationFillMode: "forwards", fontFeatureSettings: '"ss01","cv11"' }}
          >
            {t.title1}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              {t.title2}
            </span>
            {t.title3 ? <> {t.title3}</> : null}
          </h1>

          <p
            className="relative mt-5 sm:mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "280ms", animationFillMode: "forwards" }}
          >
            {t.subtitle}
          </p>

          <div
            className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm text-primary opacity-0 animate-fade-in"
            style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
          >
            <ShieldCheck className="size-4 shrink-0" />
            <span>{t.privacyGuarantee}</span>
          </div>

          {(() => {
            const SLOGAN: Record<Lang, { line: string; sub: string }> = {
              tr: { line: "Satış getiren ürün görselleri, kişiselleştirilmiş stüdyo deneyimiyle.", sub: "Ekip, ekipman ve stüdyo kirası olmadan — kayıtsız keşfedin." },
              en: { line: "Product imagery that sells, delivered as a personal studio experience.", sub: "No crew, no gear, no studio rental — explore without signing up." },
              de: { line: "Verkaufsstarke Produktbilder als persönliches Studioerlebnis.", sub: "Ohne Team, ohne Equipment, ohne Studiomiete — ohne Anmeldung entdecken." },
              es: { line: "Imágenes de producto que venden, con una experiencia de estudio personal.", sub: "Sin equipo, sin material, sin alquilar estudio — explora sin registrarte." },
              ru: { line: "Продающие фотографии товара как персональный студийный сервис.", sub: "Без команды, без оборудования, без аренды — исследуйте без регистрации." },
              ar: { line: "صور منتجات تبيع، بتجربة استوديو شخصية.", sub: "بدون فريق أو معدّات أو استوديو — استكشف دون تسجيل." },
            };
            const s = SLOGAN[lang] ?? SLOGAN.en;
            return (
              <div
                className="relative mt-6 mx-auto max-w-2xl opacity-0 animate-fade-in"
                style={{ animationDelay: "520ms", animationFillMode: "forwards" }}
              >
                <p className="text-[15px] sm:text-[17px] font-medium tracking-tight text-slate-800">
                  {s.line}
                </p>
                <p className="mt-1 text-[12.5px] sm:text-[13.5px] text-slate-500">{s.sub}</p>
              </div>
            );
          })()}

        </section>
        )}




        {!original && bulkItems.length === 0 && (
          <section className="w-full mb-6 sm:mb-10">
            <div className="w-full">
              <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-center text-slate-900">
                {tr("hero.title")}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground text-center max-w-2xl mx-auto">
                {tr("hero.subtitle")}
              </p>

              <div className="mt-8 w-full">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
                  <div className="w-full">
                    <HeroShowcaseLoop />
                  </div>

                  <HeroCapabilityCards />




                </div>



                <ToolCatalog lang={lang} />
                <BulkApiShowcase lang={lang} />


              </div>
            </div>
          </section>
        )}




        {error && (
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {original && (
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Panel title={t.original}>
                <div className="relative w-full h-full overflow-hidden">
                  <img src={original} alt={t.original} className="w-full h-full object-contain" />
                  {loading && <div className="neon-scan-line" />}
                </div>
              </Panel>
              <Panel title={t.removed} checker>
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground px-4 py-6">
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <div className="w-full max-w-sm space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{STAGE_LABELS[lang][stage]}</span>
                          <span>%{Math.min(progress, 100)}</span>
                        </div>
                        <Progress value={progress} />
                      </div>

                      <div className="grid gap-2">
                        {STAGE_ORDER.map((item, index) => {
                          const currentIndex = stage === "starting" ? -1 : STAGE_ORDER.indexOf(stage);
                          const isDone = index < currentIndex;
                          const isActive = item === stage;

                          return (
                            <div
                              key={item}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all ${
                                isActive
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : isDone
                                    ? "border-border bg-muted/40 text-foreground"
                                    : "border-border/70 bg-background/40"
                              }`}
                            >
                              <div
                                className={`flex size-6 items-center justify-center rounded-full border ${
                                  isActive
                                    ? "border-primary bg-primary/15"
                                    : isDone
                                      ? "border-primary/50 bg-primary/10"
                                      : "border-border bg-background"
                                }`}
                              >
                                {isActive ? (
                                  <Loader2 className="size-3.5 animate-spin text-primary" />
                                ) : isDone ? (
                                  <Check className="size-3.5 text-primary" />
                                ) : (
                                  <span className="text-[11px]">{index + 1}</span>
                                )}
                              </div>
                              <span>{STAGE_LABELS[lang][item]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs opacity-80 text-center max-w-[320px]">{t.freezeHint}</p>
                    <p className="text-xs opacity-60 text-center">{t.modelHint}</p>
                  </div>

                ) : result ? (
                  <div
                    className="relative w-full h-full"
                    style={
                      studioBg
                        ? {
                            backgroundImage: `url(${studioBg.url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {studioBg ? (
                      <>
                        {/* Soft contact shadow under product (bottom-center grounding) */}
                        <div
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                          style={{
                            bottom: `${Math.max(0, bgOffsetY - 2)}%`,
                            width: `${Math.max(10, shadowSpread)}%`,
                            height: "5%",
                            background: `radial-gradient(ellipse at center, rgba(0,0,0,${(shadowOpacity / 100).toFixed(3)}) 0%, rgba(0,0,0,${(shadowOpacity / 100 * 0.4).toFixed(3)}) 45%, rgba(0,0,0,0) 75%)`,
                            filter: "blur(6px)",
                            opacity: shadowOpacity === 0 ? 0 : 1,
                          }}
                        />
                        <img
                          src={result}
                          alt={t.removed}
                          className="absolute left-1/2 -translate-x-1/2"
                          style={{
                            bottom: `${bgOffsetY}%`,
                            height: `${bgScale}%`,
                            maxWidth: "92%",
                            width: "auto",
                            objectFit: "contain",
                            objectPosition: "bottom",
                            filter: `drop-shadow(0 18px 22px rgba(0,0,0,${(shadowOpacity / 100 * 0.62).toFixed(3)}))`,
                          }}
                        />

                      </>
                    ) : (
                      <img src={result} alt={t.removed} className="relative w-full h-full object-contain" />
                    )}

                    {isFreeTierResult && !studioBg && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
                      >
                        <div
                          className="absolute inset-[-25%] flex flex-wrap content-around justify-around opacity-[0.16] text-foreground"
                          style={{ transform: "rotate(-30deg)" }}
                        >
                          {Array.from({ length: 32 }).map((_, i) => (
                            <span
                              key={i}
                              className="px-3 text-[11px] sm:text-sm font-semibold tracking-wider whitespace-nowrap"
                              style={{ textShadow: "0 1px 1px rgba(255,255,255,0.5)" }}
                            >
                              bgremovify.com
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`flex items-center justify-center h-full text-sm px-6 text-center ${error ? "text-destructive" : "text-muted-foreground"}`}>
                    {error ?? t.waiting}
                  </div>
                )}
              </Panel>
            </div>

            {result && isFreeTierResult && (
              <div className="mt-5 max-w-3xl mx-auto rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <span aria-hidden className="text-base leading-none mt-0.5">⚠️</span>
                <div className="flex-1">
                  <span className="font-semibold">{t.freeTierLabel}</span> {t.freeTierText}{" "}
                  <button
                    type="button"
                    onClick={() => { setPaywallReason("manual"); setPaywallOpen(true); trackEvent("PaywallOpened", { reason: "manual_inline" }); }}
                    className="underline font-semibold hover:text-primary"
                  >
                    {t.freeTierCta}
                  </button>{" "}
                  {t.freeTierTail}
                </div>
              </div>
            )}

            {result && studioBg && (
              <div className="mt-5 max-w-3xl mx-auto rounded-xl border border-border bg-card/60 backdrop-blur px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-semibold flex items-center gap-2">🎚️ Podyum İnce Ayarı</span>
                  <button
                    type="button"
                    onClick={() => { setBgOffsetY(8); setBgScale(72); setShadowOpacity(45); setShadowSpread(55); }}
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    Sıfırla
                  </button>
                </div>
                <label className="flex items-center gap-3 mb-2">
                  <span className="w-28 text-xs text-muted-foreground shrink-0">Dikey konum</span>
                  <input
                    type="range" min={-15} max={60} step={1}
                    value={bgOffsetY}
                    onChange={(e) => setBgOffsetY(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 text-right tabular-nums text-xs">{bgOffsetY}%</span>
                </label>
                <label className="flex items-center gap-3 mb-2">
                  <span className="w-28 text-xs text-muted-foreground shrink-0">Boyut</span>
                  <input
                    type="range" min={20} max={100} step={1}
                    value={bgScale}
                    onChange={(e) => setBgScale(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 text-right tabular-nums text-xs">{bgScale}%</span>
                </label>
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">🌑 Gölge İnce Ayarı</div>
                  <label className="flex items-center gap-3 mb-2">
                    <span className="w-28 text-xs text-muted-foreground shrink-0">Koyuluk</span>
                    <input
                      type="range" min={0} max={100} step={1}
                      value={shadowOpacity}
                      onChange={(e) => setShadowOpacity(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-10 text-right tabular-nums text-xs">{shadowOpacity}%</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <span className="w-28 text-xs text-muted-foreground shrink-0">Yayılım</span>
                    <input
                      type="range" min={10} max={100} step={1}
                      value={shadowSpread}
                      onChange={(e) => setShadowSpread(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-10 text-right tabular-nums text-xs">{shadowSpread}%</span>
                  </label>
                </div>
              </div>
            )}





            <div className="flex flex-wrap justify-center gap-3 mt-8 pb-24 sm:pb-0">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="size-4" /> {t.newPhoto}
              </Button>
              {result && (
                <>
                  <Button asChild size="lg">
                    <a href={result} download="bgremovify.png" onClick={handleDownload}>
                      <Download className="size-4" /> {t.download}
                    </a>
                  </Button>
                  {studioBg && (
                    <Button
                      size="lg"
                      onClick={handleDownloadComposite}
                      disabled={downloadingComposite}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
                    >
                      {downloadingComposite ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      {t.downloadComposite}
                    </Button>
                  )}

                  {canNativeShare && (
                    <Button variant="secondary" size="lg" onClick={handleShare}>
                      <Share2 className="size-4" /> {t.share}
                    </Button>
                  )}
                  {original && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setClickModeOpen(true);
                        trackEvent("ClickSelectOpened");
                      }}
                    >
                      <Eraser className="size-4" /> {t.clickErase}
                    </Button>
                  )}
                  {!isUpscaledResult && !isFreeTierResult && (
                    <Button
                      size="lg"
                      onClick={() => {
                        setUpscalePickerOpen((v) => !v);
                        trackEvent("UpscalePickerToggled");
                      }}
                      disabled={upscaling}
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
                    >
                      {upscaling ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                      {upscaling ? UPSCALE_LABELS[lang].working : UPSCALE_LABELS[lang].cta}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Ultra HD picker — opens inline under the action row */}
            {result && upscalePickerOpen && !upscaling && !isUpscaledResult && (
              <div className="mt-4 mx-auto max-w-xl rounded-2xl border border-violet-200 bg-violet-50/60 dark:bg-violet-950/20 dark:border-violet-900/40 p-4">
                <div className="text-sm font-semibold mb-3 text-center">
                  {UPSCALE_LABELS[lang].pickTitle}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpscale("fast")}
                    className="text-left rounded-xl border border-border bg-background hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors p-3"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Sparkles className="size-4 text-violet-600" />
                      {UPSCALE_LABELS[lang].fastLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {UPSCALE_LABELS[lang].fastDesc}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpscale("studio")}
                    className="text-left rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 hover:border-violet-500 transition-colors p-3 relative"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Wand2 className="size-4 text-fuchsia-600" />
                      {UPSCALE_LABELS[lang].studioLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {UPSCALE_LABELS[lang].studioDesc}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {upscaleNotice && (
              <div className="mt-3 mx-auto max-w-xl text-center text-sm text-muted-foreground">
                {upscaleNotice}
              </div>
            )}
          </div>
        )}

        </>)}

        {activeView === "backgrounds" && (
          <div id="studio" className="scroll-mt-24">
            {isAdmin ? (
              <AIStudioBackgrounds
                key={`studio-${lang}`}
                isPremium={isPremium}
                activeId={studioBg?.id ?? null}
                lang={lang}
                hasOriginal={!!original}
                onNeedUpload={() => {
                  setActiveView("studio");
                  setTimeout(flashUploadDropzone, 50);
                }}
                onSelect={(bg) => {
                  if (!isPremium && !isAdmin && studioFreeUsed) {
                    setPaywallReason("studio_locked");
                    setPaywallOpen(true);
                    trackEvent("PaywallOpened", { reason: "studio_locked_used" });
                    return;
                  }
                  setStudioBg(bg);
                  setIsFreeTierResult(false);
                  setActiveView("studio");
                  if (!original) {
                    setTimeout(flashUploadDropzone, 50);
                  }
                  trackEvent("StudioBgApplied", { bg: bg.id });
                }}
                onLockedClick={() => {
                  setPaywallReason("studio_locked");
                  setPaywallOpen(true);
                  trackEvent("PaywallOpened", { reason: "studio_locked" });
                }}
              />
            ) : (
              <div className="max-w-2xl mx-auto text-center py-16 px-6 rounded-2xl border border-border bg-card/60">
                <Sparkles className="size-10 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">{t.studioComingSoon.title}</h2>
                <p className="text-muted-foreground text-sm">
                  {t.studioComingSoon.desc}
                </p>
              </div>
            )}
          </div>
        )}

        {activeView === "pricing" && (
          <div id="pricing" className="scroll-mt-24">
            <PricingSection
              key={`pricing-${lang}`}
              defaultRegion={pricingRegion}
              highlight={pricingHighlight}
              lang={lang}
              market={geoRegion === "KZ" || lang === "ru" ? "kz" : lang === "tr" ? "tr" : "global"}
              onBuy={(region) => {
                setPricingRegion(region);
                setPaywallReason("manual");
                setPaywallOpen(true);
                trackEvent("PaywallOpened", { reason: "pricing_click", region });
              }}
            />
          </div>
        )}

        {activeView === "help" && (
          <div className="max-w-3xl mx-auto py-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-700 px-3 py-1 text-xs font-semibold mb-3">
                {t.helpQuick.badge}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.helpQuick.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.helpQuick.subtitle}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {t.helpQuick.cards.map((it) => (
                <div key={it.title} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="font-semibold mb-1">{it.title}</div>
                  <div className="text-sm text-muted-foreground">{it.desc}</div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link to="/help" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                {t.helpQuick.fullFaq}
              </Link>
            </div>
          </div>
        )}
      </main>


      <PaywallModal
        key={`paywall-${lang}`}
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason={paywallReason === "anon_quota" ? "no_credits" : paywallReason}
        defaultRegion={pricingRegion}
        lang={lang}
      />

      <ClickToSelectModal
        open={clickModeOpen}
        resultDataUrl={result}
        onClose={() => setClickModeOpen(false)}
          labels={t.clickEraseLabels}
        onResult={(newDataUrl) => {
          clearResultUrl();
          setResult(newDataUrl);
          setClickModeOpen(false);
          trackEvent("ClickEraseApplied");
        }}
      />


      {/* Sticky mobile CTA — sadece mobilde, sonuç yokken yukarı çağırır */}
      {!original && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-background/95 backdrop-blur border-t border-border">
          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold"
            onClick={() => fileInput.current?.click()}
          >
            <ImageIcon className="size-5" /> {t.selectFile}
          </Button>
        </div>
      )}

      {/* Sonuç varken mobilde indir/paylaş sticky */}
      {original && result && !loading && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-background/95 backdrop-blur border-t border-border flex gap-2">
          <Button asChild size="lg" className="flex-1 h-12 font-semibold">
            <a href={result} download="bgremovify.png" onClick={handleDownload}>
              <Download className="size-5" /> {t.download}
            </a>
          </Button>
          {studioBg && (
            <Button
              size="lg"
              onClick={handleDownloadComposite}
              disabled={downloadingComposite}
              className="flex-1 h-12 font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
              aria-label={t.downloadComposite}
            >
              {downloadingComposite ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
            </Button>
          )}
          {canNativeShare && (
            <Button variant="secondary" size="lg" className="h-12 px-4" onClick={handleShare} aria-label={t.share}>
              <Share2 className="size-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  checker,
}: {
  title: string;
  children: React.ReactNode;
  checker?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 text-sm font-medium border-b bg-muted/50">{title}</div>
      <div className={`aspect-square ${checker ? "checker-bg" : "bg-muted/30"}`}>{children}</div>
    </div>
  );
}
