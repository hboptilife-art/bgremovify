import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePreferredLanguage } from "@/lib/language";

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — BgRemovify" },
      { name: "description", content: "Answers about background removal, credits, payments, formats and privacy on BgRemovify." },
      { property: "og:title", content: "Help Center — BgRemovify" },
      { property: "og:description", content: "FAQ and support for BgRemovify users — credits, payments, formats, privacy." },
    ],
  }),
  component: HelpPage,
});

type Section = { title: string; items: { q: string; a: string }[] };

const CONTENT: Record<Lang, { heading: string; intro: string; contactLine: string; emailLabel: string; sections: Section[] }> = {
  tr: {
    heading: "Yardım Merkezi",
    intro: "Sık sorulan sorular ve hızlı çözümler. Cevabını bulamazsan e-posta ile bize ulaş.",
    contactLine: "Hala takıldıysan bize e-posta gönder:",
    emailLabel: "E-posta gönder",
    sections: [
      {
        title: "Başlangıç",
        items: [
          { q: "Üyelik gerekiyor mu?", a: "Hayır. İlk fotoğrafını üye olmadan deneyebilirsin. Sonraki işlemler için ücretsiz hesap aç, 1 kredi hediye." },
          { q: "Hangi formatları destekliyorsunuz?", a: "PNG, JPG ve WEBP. iPhone HEIC fotoğrafları için galeriden JPG olarak paylaşmanı öneriyoruz." },
          { q: "Maksimum dosya boyutu nedir?", a: "Tek fotoğraf için 10 MB. Toplu yüklemede tek seferde 100 fotoğrafa kadar." },
        ],
      },
      {
        title: "Krediler & Ödeme",
        items: [
          { q: "1 kredi ne kadar işlem yapar?", a: "Arka plan silmek 1 kredi, Ultra HD upscale 2 kredi, Kişi/Nesne sil 1 kredi." },
          { q: "Nasıl ödeme yapabilirim?", a: "Sitemizden Kredi Kartı, Banka Kartı, Apple Pay ve Google Pay ile iyzico güvencesinde ödeme yapabilirsiniz. Ödeme sonrası krediniz anında yüklenir." },
          { q: "Kredilerim ne zaman yüklenir?", a: "Ödeme onayından sonra genellikle 5 dakika içinde hesabına otomatik olarak düşer." },
        ],
      },
      {
        title: "Özellikler",
        items: [
          { q: "🔵 Akıllı Seçim — Tıkla, Seç ve Uçur!", a: "İster tek nesne, ister fotoğraftaki 4-5 farklı kişi/obje: ardı ardına tıkla, sistem hepsini otomatik algılayıp boyar ve tek hamlede kusursuzca yok eder. Hızlı, pratik ve çoklu temizlikler için idealdir." },
          { q: "🔴 Manuel Fırça — Profesyonel Rötuş & Doku Tamiri", a: "Çok zorlu sahneler, el/parmak yansımaları veya karmaşık detaylar için fırçayı elinize alın. Panelden fırça kalınlığını dilediğiniz gibi ayarlayarak silmek istediğiniz alanı serbestçe boyayabilirsiniz. Arka plandaki taşları, çiçekleri ve dokuları kusursuz bir efektle yeniden örüyoruz." },
          { q: "HD/Ultra HD nedir?", a: "Hızlı HD pikselleri keskinleştirir (Real-ESRGAN). Studio Ultra HD ise marka metnini korumak için düşük kreatiflikle yeniden çizer." },
          { q: "Toplu yüklemede şablon arka plan kullanabilir miyim?", a: "Evet. Üst toolbar'dan Renkli veya Şablon modunu seç, sistem hepsine uygular ve ZIP olarak indirir." },
        ],
      },
      {
        title: "Gizlilik",
        items: [
          { q: "Fotoğraflarım saklanıyor mu?", a: "Hayır. Ücretsiz işlem tarayıcında çalışır. Ücretli işlemler sadece sonuç üretmek için işlenir, sunucuda tutulmaz." },
          { q: "GDPR / KVKK uyumlu mu?", a: "Evet. Detaylar Gizlilik Politikası sayfasında." },
        ],
      },
    ],
  },
  en: {
    heading: "Help Center",
    intro: "Frequently asked questions and quick fixes. Can't find your answer? Email us.",
    contactLine: "Still stuck? Email us:",
    emailLabel: "Send email",
    sections: [
      {
        title: "Getting started",
        items: [
          { q: "Do I need an account?", a: "No. You can try your first photo without signing up. Create a free account for the next runs — 1 credit on us." },
          { q: "Which formats are supported?", a: "PNG, JPG and WEBP. For iPhone HEIC photos, please share as JPG from your gallery." },
          { q: "What's the max file size?", a: "10 MB per photo. Bulk upload supports up to 100 photos at once." },
        ],
      },
      {
        title: "Credits & payment",
        items: [
          { q: "What does 1 credit cover?", a: "Background removal: 1 credit. Ultra HD upscale: 2. Object/Person removal: 1." },
          { q: "How can I pay?", a: "Pay directly on the site with Credit / Debit Card, Apple Pay or Google Pay via iyzico. Credits are applied instantly after checkout." },
          { q: "When do credits arrive?", a: "Usually within 5 minutes after payment confirmation, loaded automatically to your account." },
        ],
      },
      {
        title: "Features",
        items: [
          { q: "🔵 Smart Selection — Tap, Select & Vanish!", a: "Whether it's a single object or 4-5 different people/objects in the photo, tap them one after another and the system detects them all, paints them and wipes everything in a single clean pass. Fast, practical and ideal for multi-cleanups." },
          { q: "🔴 Manual Brush — Pro Retouch & Texture Repair", a: "For tough scenes, hand/finger reflections or complex details, grab the brush. Adjust the brush size from the panel and paint freely over the area you want to erase — we flawlessly rebuild the stones, flowers and textures in the background." },
          { q: "What is HD / Ultra HD?", a: "Fast HD sharpens existing pixels (Real-ESRGAN). Studio Ultra HD redraws at low creativity to preserve brand text." },
          { q: "Can I batch with a template background?", a: "Yes. Pick Color or Template mode in the bulk toolbar and download the whole batch as ZIP." },
        ],
      },
      {
        title: "Privacy",
        items: [
          { q: "Are my photos stored?", a: "No. Free runs are processed on-device. Paid runs are processed only to return the result — not stored on our servers." },
          { q: "Is it GDPR compliant?", a: "Yes — see the Privacy Policy for details." },
        ],
      },
    ],
  },
  es: {
    heading: "Centro de Ayuda",
    intro: "Preguntas frecuentes y soluciones rápidas. Si no encuentras la respuesta, escríbenos por email.",
    contactLine: "¿Sigues atascado? Escríbenos por email:",
    emailLabel: "Enviar email",
    sections: [
      {
        title: "Empezar",
        items: [
          { q: "¿Necesito cuenta?", a: "No. Puedes probar tu primera foto sin registrarte. Crea una cuenta gratis para más procesos — 1 crédito de regalo." },
          { q: "¿Qué formatos aceptan?", a: "PNG, JPG y WEBP. Para HEIC del iPhone, compártelo como JPG desde la galería." },
          { q: "¿Tamaño máximo?", a: "10 MB por foto. Carga masiva: hasta 100 fotos a la vez." },
        ],
      },
      {
        title: "Créditos y pago",
        items: [
          { q: "¿Qué cubre 1 crédito?", a: "Quitar fondo: 1. HD: 1. Studio Ultra HD: 2. Quitar persona/objeto: 1." },
          { q: "¿Cómo pago?", a: "Paga en el sitio con Tarjeta, Apple Pay o Google Pay mediante iyzico. Los créditos se acreditan al instante." },
          { q: "¿Cuándo llegan los créditos?", a: "Normalmente en 5 minutos tras la confirmación del pago, cargados automáticamente." },
        ],
      },
      {
        title: "Funciones",
        items: [
          { q: "🔵 Selección Inteligente — ¡Toca, Selecciona y Elimina!", a: "Ya sea un solo objeto o 4-5 personas/objetos distintos en la foto: tócalos uno tras otro y el sistema los detecta todos, los pinta y los borra en una única pasada limpia. Rápido, práctico e ideal para limpiezas múltiples." },
          { q: "🔴 Pincel Manual — Retoque Pro & Reparación de Texturas", a: "Para escenas complejas, reflejos de manos/dedos o detalles difíciles, toma el pincel. Ajusta el grosor desde el panel y pinta libremente el área a borrar; reconstruimos piedras, flores y texturas del fondo a la perfección." },
          { q: "¿Qué es HD / Ultra HD?", a: "Fast HD afila los píxeles (Real-ESRGAN). Studio Ultra HD redibuja con baja creatividad para preservar el texto de marca." },
          { q: "¿Puedo usar fondo plantilla en lote?", a: "Sí. Selecciona Color o Plantilla en la barra superior y descarga todo en ZIP." },
        ],
      },
      {
        title: "Privacidad",
        items: [
          { q: "¿Guardan mis fotos?", a: "No. Las gratis se procesan en tu dispositivo. Las de pago solo se procesan para devolverte el resultado." },
          { q: "¿Cumplen GDPR?", a: "Sí — más detalles en la Política de Privacidad." },
        ],
      },
    ],
  },
  de: {
    heading: "Hilfe-Center",
    intro: "Häufige Fragen und schnelle Lösungen. Antwort nicht dabei? Schreib uns per E-Mail.",
    contactLine: "Noch Fragen? Schreib uns per E-Mail:",
    emailLabel: "E-Mail senden",
    sections: [
      {
        title: "Erste Schritte",
        items: [
          { q: "Brauche ich ein Konto?", a: "Nein. Du kannst dein erstes Foto ohne Anmeldung testen. Für weitere Durchläufe lege ein kostenloses Konto an — 1 Credit geschenkt." },
          { q: "Welche Formate?", a: "PNG, JPG, WEBP. Für iPhone-HEIC bitte als JPG aus der Galerie teilen." },
          { q: "Maximale Dateigröße?", a: "10 MB pro Foto. Bulk-Upload bis zu 100 Fotos auf einmal." },
        ],
      },
      {
        title: "Credits & Zahlung",
        items: [
          { q: "Was kostet 1 Credit?", a: "Hintergrund entfernen: 1. HD: 1. Studio Ultra HD: 2. Personen-/Objekt-Entfernung: 1." },
          { q: "Wie bezahle ich?", a: "Direkt auf der Seite mit Kredit-/Debitkarte, Apple Pay oder Google Pay über iyzico. Guthaben wird sofort gutgeschrieben." },
          { q: "Wann kommen die Credits?", a: "Meist innerhalb von 5 Minuten nach Zahlungsbestätigung, automatisch gutgeschrieben." },
        ],
      },
      {
        title: "Funktionen",
        items: [
          { q: "🔵 Smart-Auswahl — Tippen, auswählen, weg damit!", a: "Egal ob ein einzelnes Objekt oder 4-5 verschiedene Personen/Objekte im Foto: Tippe sie nacheinander an, das System erkennt alles automatisch, markiert es und entfernt es in einem sauberen Zug. Schnell, praktisch und ideal für Mehrfach-Reinigungen." },
          { q: "🔴 Manueller Pinsel — Profi-Retusche & Texturreparatur", a: "Für schwierige Szenen, Hand-/Fingerreflexionen oder komplexe Details nimm den Pinsel. Stelle die Pinselgröße im Panel ein und male frei über den Bereich — wir bauen Steine, Blumen und Texturen im Hintergrund makellos nach." },
          { q: "Was ist HD / Ultra HD?", a: "Fast HD schärft bestehende Pixel (Real-ESRGAN). Studio Ultra HD zeichnet mit niedriger Kreativität neu, um Markentext zu schützen." },
          { q: "Bulk mit Template-Hintergrund?", a: "Ja. Wähle in der Toolbar Farbe oder Template und lade alles als ZIP herunter." },
        ],
      },
      {
        title: "Datenschutz",
        items: [
          { q: "Werden Fotos gespeichert?", a: "Nein. Kostenlose Verarbeitung läuft im Browser. Kostenpflichtige Verarbeitung nur zur Rückgabe des Ergebnisses, nichts wird gespeichert." },
          { q: "DSGVO-konform?", a: "Ja — Details in der Datenschutzerklärung." },
        ],
      },
    ],
  },
  ru: {
    heading: "Центр помощи",
    intro: "Частые вопросы и быстрые решения. Если не нашли ответ — напишите нам на почту.",
    contactLine: "Не помогло? Напишите на e-mail:",
    emailLabel: "Написать на e-mail",
    sections: [
      {
        title: "Начало работы",
        items: [
          { q: "Нужна ли регистрация?", a: "Нет. Первое фото можно обработать без регистрации. Создайте бесплатный аккаунт — 1 кредит в подарок." },
          { q: "Какие форматы поддерживаются?", a: "PNG, JPG, WEBP. Для HEIC с iPhone — поделитесь как JPG из галереи." },
          { q: "Максимальный размер файла?", a: "10 МБ на фото. Массовая загрузка — до 100 фото за раз." },
        ],
      },
      {
        title: "Кредиты и оплата",
        items: [
          { q: "Что входит в 1 кредит?", a: "Удаление фона: 1. HD: 1. Studio Ultra HD: 2. Удаление человека/объекта: 1." },
          { q: "Как оплатить?", a: "Оплата картой, Apple Pay или Google Pay прямо на сайте через iyzico. Кредиты зачисляются мгновенно." },
          { q: "Когда придут кредиты?", a: "Обычно за 5 минут после подтверждения оплаты, начисляются автоматически." },
        ],
      },
      {
        title: "Функции",
        items: [
          { q: "🔵 Умный выбор — Коснись, выдели и убери!", a: "Один объект или 4-5 разных людей/предметов на фото: касайтесь их по очереди, система сама всё определит, обведёт и удалит одним чистым проходом. Быстро, удобно, идеально для множественной очистки." },
          { q: "🔴 Ручная кисть — Профи-ретушь и восстановление текстур", a: "Для сложных сцен, отражений рук/пальцев или запутанных деталей возьмите кисть. Настройте толщину в панели и свободно закрасьте область — мы безупречно восстановим камни, цветы и текстуры фона." },
          { q: "Что такое HD / Ultra HD?", a: "Fast HD повышает резкость пикселей (Real-ESRGAN). Studio Ultra HD рисует заново с низкой креативностью, сохраняя текст бренда." },
          { q: "Можно ли пакетно с шаблоном фона?", a: "Да. Выберите Цвет или Шаблон в верхней панели и скачайте всё в ZIP." },
        ],
      },
      {
        title: "Конфиденциальность",
        items: [
          { q: "Сохраняете ли фото?", a: "Нет. Бесплатные обработки идут в браузере. Платные — только для возврата результата, не хранятся." },
          { q: "GDPR?", a: "Да — подробности в Политике конфиденциальности." },
        ],
      },
    ],
  },
  ar: {
    heading: "مركز المساعدة",
    intro: "أسئلة شائعة وحلول سريعة. لم تجد إجابتك؟ تواصل معنا عبر واتساب أو البريد.",
    contactLine: "ما زلت بحاجة لمساعدة؟ راسلنا عبر واتساب أو البريد:",
    emailLabel: "إرسال بريد",
    sections: [
      {
        title: "البدء",
        items: [
          { q: "هل أحتاج حسابًا؟", a: "لا. يمكنك تجربة أول صورة دون تسجيل. أنشئ حسابًا مجانيًا للمزيد — رصيد مجاني هدية." },
          { q: "ما الصيغ المدعومة؟", a: "PNG و JPG و WEBP. لصور iPhone HEIC شاركها بصيغة JPG من المعرض." },
          { q: "أقصى حجم؟", a: "10 ميجابايت للصورة. الرفع الجماعي حتى 100 صورة دفعة واحدة." },
        ],
      },
      {
        title: "الرصيد والدفع",
        items: [
          { q: "ماذا يغطي رصيد واحد؟", a: "إزالة الخلفية: 1. HD: 1. Studio Ultra HD: 2. إزالة شخص/كائن: 1." },
          { q: "كيف أدفع؟", a: "ادفع مباشرة عبر بطاقة الائتمان أو Apple Pay أو Google Pay من خلال iyzico. تُضاف الأرصدة فورًا بعد الدفع." },
          { q: "متى يصل الرصيد؟", a: "عادةً خلال 5 دقائق بعد تأكيد الدفع، يُضاف تلقائيًا." },
        ],
      },
      {
        title: "الميزات",
        items: [
          { q: "🔵 الاختيار الذكي — المس، اختر واختفِ!", a: "سواء كائن واحد أو 4-5 أشخاص/أجسام مختلفة في الصورة: انقر عليهم واحدًا تلو الآخر، فيكتشفهم النظام جميعًا، ويحدّدهم ويزيلهم في تمريرة واحدة نظيفة. سريع وعملي ومثالي للتنظيفات المتعددة." },
          { q: "🔴 الفرشاة اليدوية — تنقيح احترافي وترميم النسيج", a: "للمشاهد الصعبة أو انعكاسات اليد/الأصابع أو التفاصيل المعقدة، أمسك الفرشاة. اضبط سماكتها من اللوحة ولوّن المنطقة بحرية — نعيد بناء الحجارة والزهور والخلفيات ببراعة." },
          { q: "ما HD / Ultra HD؟", a: "Fast HD يزيد حدة البكسلات (Real-ESRGAN). Studio Ultra HD يعيد الرسم بإبداع منخفض للحفاظ على نص العلامة." },
          { q: "هل يمكن استخدام قالب خلفية للدفعات؟", a: "نعم. اختر لون أو قالب من الشريط العلوي وحمّل كل شيء كملف ZIP." },
        ],
      },
      {
        title: "الخصوصية",
        items: [
          { q: "هل تُخزّن صوري؟", a: "لا. الصور المجانية تُعالج داخل المتصفح. المدفوعة تُعالج فقط لإرجاع النتيجة." },
          { q: "GDPR؟", a: "نعم — التفاصيل في سياسة الخصوصية." },
        ],
      },
    ],
  },
};

function HelpPage() {
  const lang = usePreferredLanguage("en") as Lang;
  const [open, setOpen] = useState<string | null>(null);
  const c = CONTENT[lang];
  const isRtl = lang === "ar";

  return (
    <article dir={isRtl ? "rtl" : "ltr"} className="container mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        {isRtl ? "→ العودة للرئيسية" : "← Back to home"}
      </Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-3">{c.heading}</h1>
      <p className="text-muted-foreground mb-10 leading-relaxed">{c.intro}</p>

      <div className="space-y-10">
        {c.sections.map((sec, si) => (
          <section key={si}>
            <h2 className="text-xl font-semibold mb-3">{sec.title}</h2>
            <div className="divide-y rounded-2xl border bg-card">
              {sec.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = open === key;
                return (
                  <button
                    key={key}
                    onClick={() => setOpen(isOpen ? null : key)}
                    className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.q}</p>
                      {isOpen && (
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                      )}
                    </div>
                    <ChevronDown className={`size-4 mt-1 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-3">{c.contactLine}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:support@bgremovify.com"
            className="rounded-xl border bg-background hover:bg-accent px-4 py-2 text-sm font-medium transition-colors"
          >
            {c.emailLabel}
          </a>
        </div>
      </div>
    </article>
  );
}
