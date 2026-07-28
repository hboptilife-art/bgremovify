import { useCallback, useMemo, useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
  Square,
  Palette,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BulkItemStatus = "queued" | "processing" | "done" | "error";

export interface BulkItem {
  id: string;
  file: File;
  previewUrl: string;
  status: BulkItemStatus;
  progress: number;
  resultUrl?: string;
}

interface Props {
  isPremium: boolean;
  onUnlockRequest: () => void;
  onAddMore: () => void;
  items: BulkItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onProcessAll: () => Promise<void> | void;
  processing: boolean;
  lang?: "tr" | "en" | "es" | "de" | "ru" | "ar";
}

export const BULK_MAX = 100;

type Mode = "transparent" | "color" | "template";
type Shadow = "none" | "soft" | "hard" | "auto";

const COLOR_SWATCHES = [
  "#FFFFFF",
  "#F4F4F5",
  "#0F172A",
  "#FDE68A",
  "#FCA5A5",
  "#A7F3D0",
  "#BFDBFE",
  "#E9D5FF",
];

type BulkStrings = {
  title: string; subtitle: string; addMore: string; clear: string; remove: string;
  waiting: string; error: string; addMoreCell: string;
  creditLine1: string; creditLine2: string; zipBtn: string; premiumTag: string;
  processing: string; done: string; processAll: (n: number) => string;
  changeTo: string; transparent: string; colored: string; template: string;
  templateSoon: string; shadow: string;
  shadowNone: string; shadowSoft: string; shadowHard: string; shadowAuto: string;
  pickColor: string;
};
const T: Record<NonNullable<Props["lang"]>, BulkStrings> = {
  tr: { title: "Toplu Yükleme", subtitle: "100 fotoğrafa kadar tek seferde işle. Her birine ayrı durum çubuğu.", addMore: "Daha Ekle", clear: "Temizle", remove: "Kaldır", waiting: "Bekliyor", error: "Hata", addMoreCell: "Daha Ekle", creditLine1: "1 Kredi = 1 İşlenmiş Görsel. Gizli ücret veya sürpriz kesinti yok.", creditLine2: "", zipBtn: "ZIP olarak indir", premiumTag: "(Premium)", processing: "İşleniyor...", done: "Tamamlandı", processAll: (n) => `Tümünü İşle (${n})`, changeTo: "Çıktı türü:", transparent: "Şeffaf arka plan", colored: "Renkli arka plan", template: "Hazır Şablon", templateSoon: "Yakında", shadow: "Gölge", shadowNone: "Yok", shadowSoft: "Yumuşak", shadowHard: "Sert", shadowAuto: "Otomatik", pickColor: "Renk seç" },
  en: { title: "Bulk Upload", subtitle: "Process up to 100 photos at once. Each gets its own status bar.", addMore: "Add More", clear: "Clear", remove: "Remove", waiting: "Waiting", error: "Error", addMoreCell: "Add More", creditLine1: "1 Credit = 1 Fully Processed Image. No hidden fees.", creditLine2: "", zipBtn: "Download as ZIP", premiumTag: "(Premium)", processing: "Processing...", done: "Done", processAll: (n) => `Process All (${n})`, changeTo: "Change to:", transparent: "Transparent background", colored: "Colored background", template: "Design Template", templateSoon: "Soon", shadow: "Shadow", shadowNone: "None", shadowSoft: "Soft", shadowHard: "Hard", shadowAuto: "Auto", pickColor: "Pick color" },
  es: { title: "Carga masiva", subtitle: "Procesa hasta 100 fotos a la vez. Cada una con su propia barra de estado.", addMore: "Agregar más", clear: "Limpiar", remove: "Quitar", waiting: "Esperando", error: "Error", addMoreCell: "Agregar más", creditLine1: "1 Crédito = 1 imagen procesada. Sin tarifas ocultas.", creditLine2: "", zipBtn: "Descargar como ZIP", premiumTag: "(Premium)", processing: "Procesando...", done: "Listo", processAll: (n) => `Procesar todo (${n})`, changeTo: "Cambiar a:", transparent: "Fondo transparente", colored: "Fondo de color", template: "Plantilla", templateSoon: "Pronto", shadow: "Sombra", shadowNone: "Ninguna", shadowSoft: "Suave", shadowHard: "Fuerte", shadowAuto: "Auto", pickColor: "Elegir color" },
  de: { title: "Stapel-Upload", subtitle: "Bis zu 100 Fotos auf einmal verarbeiten. Jedes mit eigener Statusleiste.", addMore: "Mehr hinzufügen", clear: "Leeren", remove: "Entfernen", waiting: "Wartet", error: "Fehler", addMoreCell: "Mehr hinzufügen", creditLine1: "1 Credit = 1 fertig bearbeitetes Bild. Keine versteckten Gebühren.", creditLine2: "", zipBtn: "Als ZIP herunterladen", premiumTag: "(Premium)", processing: "Wird verarbeitet...", done: "Fertig", processAll: (n) => `Alle verarbeiten (${n})`, changeTo: "Ändern zu:", transparent: "Transparenter Hintergrund", colored: "Farbiger Hintergrund", template: "Design-Vorlage", templateSoon: "Bald", shadow: "Schatten", shadowNone: "Keiner", shadowSoft: "Weich", shadowHard: "Hart", shadowAuto: "Auto", pickColor: "Farbe wählen" },
  ru: { title: "Массовая загрузка", subtitle: "Обработка до 100 фото за раз. У каждого свой индикатор.", addMore: "Добавить ещё", clear: "Очистить", remove: "Удалить", waiting: "Ожидает", error: "Ошибка", addMoreCell: "Добавить ещё", creditLine1: "1 Кредит = 1 полностью обработанное изображение. Без скрытых комиссий.", creditLine2: "", zipBtn: "Скачать ZIP", premiumTag: "(Premium)", processing: "Обработка...", done: "Готово", processAll: (n) => `Обработать всё (${n})`, changeTo: "Изменить на:", transparent: "Прозрачный фон", colored: "Цветной фон", template: "Шаблон", templateSoon: "Скоро", shadow: "Тень", shadowNone: "Нет", shadowSoft: "Мягкая", shadowHard: "Жёсткая", shadowAuto: "Авто", pickColor: "Выбрать цвет" },
  ar: { title: "تحميل جماعي", subtitle: "عالج حتى 100 صورة دفعة واحدة. لكل منها شريط حالة خاص.", addMore: "أضف المزيد", clear: "مسح", remove: "إزالة", waiting: "بالانتظار", error: "خطأ", addMoreCell: "أضف المزيد", creditLine1: "1 رصيد = صورة واحدة معالجة بالكامل. بدون رسوم خفية.", creditLine2: "", zipBtn: "تنزيل كملف ZIP", premiumTag: "(Premium)", processing: "جارٍ المعالجة...", done: "تم", processAll: (n) => `معالجة الكل (${n})`, changeTo: "تحويل إلى:", transparent: "خلفية شفافة", colored: "خلفية ملونة", template: "قالب جاهز", templateSoon: "قريباً", shadow: "ظل", shadowNone: "لا شيء", shadowSoft: "ناعم", shadowHard: "قوي", shadowAuto: "تلقائي", pickColor: "اختر اللون" },
};

async function flattenWithBackground(
  pngBlob: Blob,
  bgColor: string,
  shadow: Shadow,
): Promise<Blob> {
  const url = URL.createObjectURL(pngBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return pngBlob;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (shadow !== "none") {
      const blur = shadow === "soft" ? Math.max(canvas.width, canvas.height) * 0.04
                  : shadow === "hard" ? Math.max(canvas.width, canvas.height) * 0.015
                  : Math.max(canvas.width, canvas.height) * 0.025;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = blur;
      ctx.shadowOffsetY = blur * 0.4;
    }
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? pngBlob), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BulkUploadGrid({
  isPremium,
  onUnlockRequest,
  onAddMore,
  items,
  onRemoveItem,
  onClearAll,
  onProcessAll,
  processing,
  lang = "tr",
}: Props) {
  const s = T[lang] ?? T.tr;
  const allDone = items.length > 0 && items.every((i) => i.status === "done");
  const anyDone = items.some((i) => i.status === "done");
  const total = items.length;

  const [mode, setMode] = useState<Mode>("transparent");
  const [bgColor, setBgColor] = useState<string>("#FFFFFF");
  const [shadow, setShadow] = useState<Shadow>("none");

  const previewBg = useMemo(() => (mode === "color" ? bgColor : undefined), [mode, bgColor]);

  const handleDownloadZip = useCallback(async () => {
    if (!anyDone) return;
    if (!isPremium) {
      onUnlockRequest();
      return;
    }
    const zip = new JSZip();
    const folder = zip.folder("bgremovify-batch") ?? zip;
    for (const item of items) {
      if (item.status !== "done" || !item.resultUrl) continue;
      try {
        let blob = await (await fetch(item.resultUrl)).blob();
        if (mode === "color") {
          blob = await flattenWithBackground(blob, bgColor, shadow);
        }
        const base = item.file.name.replace(/\.[^.]+$/, "");
        const suffix = mode === "color" ? "_bg" : "_nobg";
        folder.file(`${base}${suffix}.png`, blob);
      } catch {
        /* skip broken */
      }
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bgremovify-batch-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [items, isPremium, onUnlockRequest, anyDone, mode, bgColor, shadow]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {s.title} · <span className="text-primary">{total}/{BULK_MAX}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{s.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddMore} disabled={total >= BULK_MAX || processing}>
            <Plus className="size-4" /> {s.addMore}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll} disabled={processing || total === 0} className="text-muted-foreground">
            <Trash2 className="size-4" /> {s.clear}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-xl overflow-hidden border bg-card aspect-square shadow-sm"
            style={{
              ...(item.status === "processing" ? { boxShadow: "var(--shadow-glow)" } : null),
              ...(item.status === "done" && previewBg ? { backgroundColor: previewBg } : null),
            }}
          >
            <img
              src={item.status === "done" && item.resultUrl ? item.resultUrl : item.previewUrl}
              alt={item.file.name}
              className={cn(
                "absolute inset-0 w-full h-full",
                item.status === "done" && previewBg ? "object-contain p-1" : "object-cover",
              )}
            />
            {(item.status !== "done" || !previewBg) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            )}

            {!processing && item.status === "queued" && (
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="absolute top-1.5 right-1.5 z-10 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                aria-label={s.remove}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}

            <div className={cn(
              "absolute inset-x-0 bottom-0 p-2",
              item.status === "done" && previewBg ? "text-foreground bg-background/80 backdrop-blur-sm" : "text-white",
            )}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium mb-1 truncate">
                {item.status === "done" && <Check className="size-3 text-green-500 shrink-0" />}
                {item.status === "processing" && <Loader2 className="size-3 animate-spin text-primary shrink-0" />}
                {item.status === "error" && <AlertCircle className="size-3 text-destructive shrink-0" />}
                <span className="truncate">{item.file.name}</span>
              </div>
              {(item.status === "processing" || item.status === "done") && (
                <Progress value={item.progress} className="h-1" />
              )}
              {item.status === "queued" && (
                <div className="text-[10px] uppercase tracking-wider opacity-70">{s.waiting}</div>
              )}
              {item.status === "error" && (
                <div className="text-[10px] text-destructive-foreground">{s.error}</div>
              )}
            </div>
          </div>
        ))}

        {total < BULK_MAX && !processing && (
          <button
            type="button"
            onClick={onAddMore}
            className="rounded-xl border-2 border-dashed border-border hover:border-primary/60 aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors bg-card/30"
          >
            <Plus className="size-6" />
            <span className="text-xs font-medium">{s.addMoreCell}</span>
          </button>
        )}
      </div>

      {/* Output toolbar — remove.bg style */}
      <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-4 mb-4 shadow-sm">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {s.changeTo}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMode("transparent")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all",
              mode === "transparent"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="size-8 rounded-md bg-[conic-gradient(at_50%_50%,#ddd_0_25%,#fff_0_50%,#ddd_0_75%,#fff_0)] [background-size:8px_8px] shrink-0 border" />
            <span className="text-xs sm:text-sm font-medium leading-tight">{s.transparent}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("color")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all",
              mode === "color"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="size-8 rounded-md shrink-0 border bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400" />
            <span className="text-xs sm:text-sm font-medium leading-tight">{s.colored}</span>
          </button>
          <button
            type="button"
            disabled
            onClick={() => setMode("template")}
            className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left opacity-60 cursor-not-allowed relative"
          >
            <div className="size-8 rounded-md shrink-0 border bg-muted flex items-center justify-center">
              <LayoutTemplate className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs sm:text-sm font-medium">{s.template}</span>
              <span className="text-[10px] text-muted-foreground">{s.templateSoon}</span>
            </div>
          </button>
        </div>

        {mode === "color" && (
          <div className="flex items-center gap-3 pt-3 border-t border-border mb-3">
            <div className="flex items-center gap-1.5">
              <Palette className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{s.pickColor}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBgColor(c)}
                  aria-label={c}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    bgColor === c ? "border-primary scale-110" : "border-border hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="size-7 rounded-full border-2 border-dashed border-border hover:border-primary/60 cursor-pointer overflow-hidden relative">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">+</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Square className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{s.shadow}</span>
          </div>
          <Select value={shadow} onValueChange={(v) => setShadow(v as Shadow)} disabled={mode === "transparent"}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{s.shadowNone}</SelectItem>
              <SelectItem value="soft">{s.shadowSoft}</SelectItem>
              <SelectItem value="hard">{s.shadowHard}</SelectItem>
              <SelectItem value="auto">{s.shadowAuto}</SelectItem>
            </SelectContent>
          </Select>
          {mode === "transparent" && (
            <span className="text-[10px] text-muted-foreground">
              ({s.colored} →)
            </span>
          )}
        </div>
      </div>

      <div className="text-center mb-3">
        <p className="text-[11px] sm:text-xs font-medium text-primary/90 leading-snug tracking-wide">
          {s.creditLine1}
        </p>
        {s.creditLine2 && (
          <p className="text-[11px] sm:text-xs font-medium text-primary/75 leading-snug tracking-wide mt-0.5">
            {s.creditLine2}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 sm:static z-30 -mx-6 sm:mx-0 px-6 py-3 sm:p-0 bg-background/95 sm:bg-transparent backdrop-blur sm:backdrop-blur-none border-t sm:border-0 border-border flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button size="lg" variant="outline" onClick={handleDownloadZip} disabled={!anyDone || processing} className="w-full sm:w-auto">
          <Download className="size-4" /> {s.zipBtn}
          {!isPremium && anyDone && <span className="ml-1 text-[10px] opacity-70">{s.premiumTag}</span>}
        </Button>
        <Button size="lg" onClick={onProcessAll} disabled={processing || total === 0 || allDone} className="w-full sm:w-auto">
          {processing ? (
            <><Loader2 className="size-4 animate-spin" /> {s.processing}</>
          ) : allDone ? (
            <><Check className="size-4" /> {s.done}</>
          ) : (
            <><Sparkles className="size-4" /> {s.processAll(total)}</>
          )}
        </Button>
      </div>
    </div>
  );
}
