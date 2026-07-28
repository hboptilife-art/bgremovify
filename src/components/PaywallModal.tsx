import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PricingSection, type PricingRegion } from "@/components/PricingSection";
import { Sparkles, Copy, Check, Lock, Loader2, ShieldCheck, Building2, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import { trackConversion } from "@/lib/conversions";
import { track } from "@/lib/analytics";
import { IYZICO_PLANS, computeCheckoutPricing, formatMoney, isIyzicoCurrency, type IyzicoPlan, type IyzicoCurrency } from "@/lib/iyzico-plans";
import { createIyzicoCheckout } from "@/lib/iyzico.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { detectGeo, type GeoRegion } from "@/lib/geo";


// ─────────────────────────────────────────────────────────────────────────────
// i18n — mirror the host page's language (tr / en / ru). es/de/ar fall back to en.
// ─────────────────────────────────────────────────────────────────────────────
type PaywallLang = "tr" | "en" | "es" | "de" | "ru" | "ar";

const LangCtx = createContext<PaywallLang>("tr");
const useLang = (): PaywallLang => useContext(LangCtx);

type Dict = {
  // PaywallModal headers
  badgeStudio: string;
  badgePremiumReq: string;
  badgeNoCredits: string;
  badgeBuy: string;
  titleStudio: string;
  titlePremiumReq: string;
  titleNoCredits: string;
  titleBuy: string;
  descStudio: string;
  descPremiumReq: string;
  descNoCredits: string;
  descBuy: string;

  // Kaspi sub-dialog wrapper

  // WhatsApp sub-dialog wrapper
  waDialogTitle: string;
  waDialogDesc: React.ReactNode;

  // WhatsApp order checkout (inner)
  waBadge: string;
  waProductTitle: string;
  waOrderNo: string;
  waPitchTitle: string;
  waPitch1: string;
  waPitch2: React.ReactNode;
  waPitch3: React.ReactNode;
  waPitch4: string;
  waBtnHakan: string;
  waBtnArdak: string;
  waOpened: React.ReactNode;
  waFootSecure: string;
  waFootSupport: string;
  waFootOrder: string;
  waClose: string;

  // Trust badges + refund guarantee
  trustCount: string;
  trustSpeed: string;
  trustLocal: string;
  refundTitle: string;
  refundBody: React.ReactNode;

  // WhatsApp prefilled message (string)
  waMsgGreeting: (name: string) => string;
  waMsgPackage: string;
  waMsgOrderRef: (ref: string) => string;
  waMsgAccount: (email: string) => string;
  waMsgAccountNone: string;
  waMsgHow: string;




  // WhatsApp fallback strip (shown when WA app might be blocked)
  waFallbackToast: string;
  waFallbackBlockedTitle: string;
  waFallbackOpenTitle: string;
  waCopyNumber: string;
  waCopyMessage: string;
};

const DICTS: Record<PaywallLang, Dict> = {
  tr: {
    badgeStudio: "🔒 Premium Studio",
    badgePremiumReq: "⚠️ Premium AI Gerekli",
    badgeNoCredits: "Kredilerin bitti",
    badgeBuy: "Kredi al",
    titleStudio: "🔒 10+ Premium AI Studio'yu Aç!",
    titlePremiumReq: "Kendi fotoğrafların için Premium AI motoru lazım",
    titleNoCredits: "Devam etmek için Pro'ya geç",
    titleBuy: "Pro paketi al",
    descStudio: "Ürünlerini anında Paris, Miami Beach veya lüks stüdyolara ışınla. Bu arka planı kullanmak için Premium'a geç.",
    descPremiumReq: "Yüksek çözünürlüklü kendi ürünlerini anında işlemek için Premium'a geç — ya da aşağıdaki örnek fotoğraflarla platformun hızını test et!",
    descNoCredits: "Kredin yok. Ön izlemeye devam edebilir ya da final çıktı almak için Pro paketi alabilirsin.",
    descBuy: "Daha fazla kredi al, reklamsız ve hızlı işle.",


    waDialogTitle: "WhatsApp ile Sipariş Ver",
    waDialogDesc: (<>80 Premium Kredi — <strong className="text-foreground">$7</strong>. Kurucu Ardak bizzat ilgilenir, ödeme onayından sonra krediler <strong className="text-foreground">5 dakikada</strong> hesabında.</>),

    waBadge: "Kişiye Özel Sipariş",
    waProductTitle: "bgremovify Pro — 80 Kredi",
    waOrderNo: "Sipariş No:",
    waPitchTitle: "Kişisel Aktivasyon · 5 dakikada hazır",
    waPitch1: "Papara, IBAN havalesi, Kaspi, kripto — sana uygun olanla öde",
    waPitch2: (<>Kurucu ekip <strong className="text-foreground">Hakan</strong> &amp; <strong className="text-foreground">Ardak</strong> bizzat ilgilenir</>),
    waPitch3: (<>Krediler ödeme onayından <strong className="text-foreground">5 dakika sonra</strong> hesabında</>),
    waPitch4: "Komisyon yok, fazla ücret yok — tam $7 karşılığı",
    waBtnHakan: "WhatsApp'tan Sipariş Ver — Hakan",
    waBtnArdak: "Veya Ardak'a yaz (yedek hat)",
    waOpened: (<>✅ WhatsApp'ı açtık. Hakan veya Ardak <strong>5 dakika içinde</strong> sana ödeme bilgisini gönderir. Bu pencereyi kapatabilirsin — kredilerin onaydan sonra otomatik yüklenecek.</>),
    waFootSecure: "Güvenli",
    waFootSupport: "Kişisel destek",
    waFootOrder: "Sipariş:",
    waClose: "Kapat",
    trustCount: "500+ mutlu müşteri",
    trustSpeed: "5 dk içinde aktif",
    trustLocal: "Yerel ödeme (Kaspi/Papara)",
    refundTitle: "🛡️ %100 İade Garantisi",
    refundBody: (<>Memnun kalmazsan <strong className="text-foreground">koşulsuz iade</strong> — paranı tam geri alırsın. Risk sıfır.</>),

    waMsgGreeting: (n) => `Selam ${n}! bgremovify Pro almak istiyorum 🚀`,
    waMsgPackage: "📦 Paket: 80 Premium Kredi — $7",
    waMsgOrderRef: (r) => `🔖 Sipariş No: ${r}`,
    waMsgAccount: (e) => `📧 Hesabım: ${e}`,
    waMsgAccountNone: "📧 Hesabım: (giriş yapmadım)",
    waMsgHow: "Ödemeyi nasıl yapabilirim?",

    waFallbackToast: "WhatsApp açılmazsa numara ve mesaj kopyalama altta hazır.",
    waFallbackBlockedTitle: "WhatsApp bloklanırsa direkt kopyala:",
    waFallbackOpenTitle: "WhatsApp açılmazsa:",
    waCopyNumber: "Numarayı kopyala",
    waCopyMessage: "Mesajı kopyala",
  },

  en: {
    badgeStudio: "🔒 Premium Studio",
    badgePremiumReq: "⚠️ Premium AI Required",
    badgeNoCredits: "Out of credits",
    badgeBuy: "Get credits",
    titleStudio: "🔒 Unlock 10+ Premium AI Studios!",
    titlePremiumReq: "Premium AI engine needed for your own photos",
    titleNoCredits: "Upgrade to Pro to continue",
    titleBuy: "Get the Pro pack",
    descStudio: "Teleport your products to Paris, Miami Beach, or luxury studios instantly. Upgrade to Premium to use this background.",
    descPremiumReq: "Upgrade to Premium to process your own high-resolution photos — or test the platform's speed with the sample photos below!",
    descNoCredits: "You have no credits. Keep previewing for free, or grab the Pro pack for final exports.",
    descBuy: "Get more credits — ad-free and lightning fast.",


    waDialogTitle: "Order via WhatsApp",
    waDialogDesc: (<>80 Premium Credits — <strong className="text-foreground">$7</strong>. Founder Ardak handles it personally — credits land in your account <strong className="text-foreground">within 5 minutes</strong> of payment confirmation.</>),

    waBadge: "Personal Order",
    waProductTitle: "bgremovify Pro — 80 Credits",
    waOrderNo: "Order No:",
    waPitchTitle: "Personal Activation · ready in 5 minutes",
    waPitch1: "Papara, IBAN, Kaspi, crypto — pay however works best for you",
    waPitch2: (<>Founders <strong className="text-foreground">Hakan</strong> &amp; <strong className="text-foreground">Ardak</strong> handle it personally</>),
    waPitch3: (<>Credits land in your account <strong className="text-foreground">5 minutes</strong> after payment</>),
    waPitch4: "No commission, no extra fees — exactly $7",
    waBtnHakan: "Order on WhatsApp — Hakan",
    waBtnArdak: "Or message Ardak (backup line)",
    waOpened: (<>✅ WhatsApp opened. Hakan or Ardak will send you payment details <strong>within 5 minutes</strong>. You can close this window — credits will load automatically after confirmation.</>),
    waFootSecure: "Secure",
    waFootSupport: "Personal support",
    waFootOrder: "Order:",
    waClose: "Close",
    trustCount: "500+ happy customers",
    trustSpeed: "Active in 5 minutes",
    trustLocal: "Local payment (Kaspi/Papara)",
    refundTitle: "🛡️ 100% Refund Guarantee",
    refundBody: (<>Not satisfied? <strong className="text-foreground">No-questions-asked refund</strong> — you get every cent back. Zero risk.</>),

    waMsgGreeting: (n) => `Hi ${n}! I'd like to buy bgremovify Pro 🚀`,
    waMsgPackage: "📦 Pack: 80 Premium Credits — $7",
    waMsgOrderRef: (r) => `🔖 Order No: ${r}`,
    waMsgAccount: (e) => `📧 Account: ${e}`,
    waMsgAccountNone: "📧 Account: (not signed in)",
    waMsgHow: "How can I pay?",

    waFallbackToast: "If WhatsApp doesn't open, copy the number and message below.",
    waFallbackBlockedTitle: "If WhatsApp is blocked, copy directly:",
    waFallbackOpenTitle: "If WhatsApp doesn't open:",
    waCopyNumber: "Copy number",
    waCopyMessage: "Copy message",
  },

  ru: {
    badgeStudio: "🔒 Премиум Студия",
    badgePremiumReq: "⚠️ Нужен Премиум AI",
    badgeNoCredits: "Кредиты закончились",
    badgeBuy: "Купить кредиты",
    titleStudio: "🔒 Откройте 10+ Премиум AI-студий!",
    titlePremiumReq: "Для ваших фото нужен Премиум AI-движок",
    titleNoCredits: "Перейдите на Pro, чтобы продолжить",
    titleBuy: "Купить пакет Pro",
    descStudio: "Перенесите ваши товары в Париж, Майами-Бич или люксовые студии мгновенно. Перейдите на Премиум, чтобы использовать этот фон.",
    descPremiumReq: "Перейдите на Премиум, чтобы мгновенно обрабатывать ваши фото в высоком разрешении — или протестируйте скорость платформы на примерах ниже!",
    descNoCredits: "У вас нет кредитов. Продолжайте бесплатный предпросмотр или купите Pro для финального экспорта.",
    descBuy: "Купите больше кредитов — без рекламы и молниеносно быстро.",


    waDialogTitle: "Заказать через WhatsApp",
    waDialogDesc: (<>80 Премиум-кредитов — <strong className="text-foreground">$7</strong>. Основатель Ардак лично занимается заказом — кредиты поступят на счёт <strong className="text-foreground">в течение 5 минут</strong> после подтверждения оплаты.</>),

    waBadge: "Персональный заказ",
    waProductTitle: "bgremovify Pro — 80 кредитов",
    waOrderNo: "Номер заказа:",
    waPitchTitle: "Персональная активация · готово за 5 минут",
    waPitch1: "Papara, IBAN, Kaspi, крипта — оплатите как удобно",
    waPitch2: (<>Основатели <strong className="text-foreground">Хакан</strong> &amp; <strong className="text-foreground">Ардак</strong> лично занимаются заказом</>),
    waPitch3: (<>Кредиты поступят на счёт <strong className="text-foreground">через 5 минут</strong> после оплаты</>),
    waPitch4: "Без комиссий и доплат — ровно $7",
    waBtnHakan: "Заказать в WhatsApp — Хакан",
    waBtnArdak: "Или написать Ардаку (резервная линия)",
    waOpened: (<>✅ WhatsApp открыт. Хакан или Ардак отправит вам реквизиты для оплаты <strong>в течение 5 минут</strong>. Можете закрыть это окно — кредиты начислятся автоматически после подтверждения.</>),
    waFootSecure: "Безопасно",
    waFootSupport: "Личная поддержка",
    waFootOrder: "Заказ:",
    waClose: "Закрыть",
    trustCount: "500+ довольных клиентов",
    trustSpeed: "Активация за 5 минут",
    trustLocal: "Локальная оплата (Kaspi/Papara)",
    refundTitle: "🛡️ 100% возврат средств",
    refundBody: (<>Не понравилось? <strong className="text-foreground">Безусловный возврат</strong> — вернём каждую копейку. Нулевой риск.</>),

    waMsgGreeting: (n) => `Привет, ${n}! Хочу купить bgremovify Pro 🚀`,
    waMsgPackage: "📦 Пакет: 80 Премиум-кредитов — $7",
    waMsgOrderRef: (r) => `🔖 Номер заказа: ${r}`,
    waMsgAccount: (e) => `📧 Аккаунт: ${e}`,
    waMsgAccountNone: "📧 Аккаунт: (не вошёл)",
    waMsgHow: "Как я могу оплатить?",

    waFallbackToast: "Если WhatsApp не откроется, номер и сообщение можно скопировать ниже.",
    waFallbackBlockedTitle: "Если WhatsApp заблокирован, скопируйте напрямую:",
    waFallbackOpenTitle: "Если WhatsApp не открылся:",
    waCopyNumber: "Скопировать номер",
    waCopyMessage: "Скопировать сообщение",
  },

  es: {
    badgeStudio: "🔒 Estudio Premium",
    badgePremiumReq: "⚠️ Se requiere IA Premium",
    badgeNoCredits: "Sin créditos",
    badgeBuy: "Obtener créditos",
    titleStudio: "🔒 ¡Desbloquea más de 10 estudios de IA Premium!",
    titlePremiumReq: "Necesitas el motor de IA Premium para tus propias fotos",
    titleNoCredits: "Pasa a Pro para continuar",
    titleBuy: "Obtén el pack Pro",
    descStudio: "Teletransporta tus productos a París, Miami Beach o estudios de lujo al instante. Pasa a Premium para usar este fondo.",
    descPremiumReq: "Pasa a Premium para procesar tus propias fotos en alta resolución al instante, ¡o prueba la velocidad de la plataforma con las fotos de muestra de abajo!",
    descNoCredits: "No tienes créditos. Sigue con la vista previa gratis o compra Pro para exportaciones finales.",
    descBuy: "Consigue más créditos: sin anuncios y a toda velocidad.",


    waDialogTitle: "Pedir por WhatsApp",
    waDialogDesc: (<>80 créditos Premium — <strong className="text-foreground">$7</strong>. El fundador Ardak se encarga personalmente — los créditos llegan a tu cuenta <strong className="text-foreground">en 5 minutos</strong> tras la confirmación del pago.</>),

    waBadge: "Pedido personal",
    waProductTitle: "bgremovify Pro — 80 créditos",
    waOrderNo: "N.º de pedido:",
    waPitchTitle: "Activación personal · lista en 5 minutos",
    waPitch1: "Papara, IBAN, Kaspi, cripto — paga como te resulte mejor",
    waPitch2: (<>Los fundadores <strong className="text-foreground">Hakan</strong> y <strong className="text-foreground">Ardak</strong> se encargan personalmente</>),
    waPitch3: (<>Los créditos llegan a tu cuenta <strong className="text-foreground">5 minutos</strong> después del pago</>),
    waPitch4: "Sin comisiones, sin cargos extra — exactamente $7",
    waBtnHakan: "Pedir por WhatsApp — Hakan",
    waBtnArdak: "O escribe a Ardak (línea de respaldo)",
    waOpened: (<>✅ WhatsApp abierto. Hakan o Ardak te enviará los datos de pago <strong>en 5 minutos</strong>. Puedes cerrar esta ventana — los créditos se cargarán automáticamente tras la confirmación.</>),
    waFootSecure: "Seguro",
    waFootSupport: "Soporte personal",
    waFootOrder: "Pedido:",
    waClose: "Cerrar",
    trustCount: "500+ clientes satisfechos",
    trustSpeed: "Activo en 5 minutos",
    trustLocal: "Pago local (Kaspi/Papara)",
    refundTitle: "🛡️ Garantía de reembolso 100%",
    refundBody: (<>¿No te convence? <strong className="text-foreground">Reembolso sin preguntas</strong> — te devolvemos cada céntimo. Riesgo cero.</>),

    waMsgGreeting: (n) => `¡Hola ${n}! Quiero comprar bgremovify Pro 🚀`,
    waMsgPackage: "📦 Pack: 80 créditos Premium — $7",
    waMsgOrderRef: (r) => `🔖 N.º de pedido: ${r}`,
    waMsgAccount: (e) => `📧 Cuenta: ${e}`,
    waMsgAccountNone: "📧 Cuenta: (sin iniciar sesión)",
    waMsgHow: "¿Cómo puedo pagar?",

    waFallbackToast: "Si WhatsApp no se abre, abajo puedes copiar el número y el mensaje.",
    waFallbackBlockedTitle: "Si WhatsApp está bloqueado, cópialo directamente:",
    waFallbackOpenTitle: "Si WhatsApp no se abre:",
    waCopyNumber: "Copiar número",
    waCopyMessage: "Copiar mensaje",
  },

  de: {
    badgeStudio: "🔒 Premium Studio",
    badgePremiumReq: "⚠️ Premium-KI erforderlich",
    badgeNoCredits: "Keine Credits mehr",
    badgeBuy: "Credits kaufen",
    titleStudio: "🔒 Schalte 10+ Premium-KI-Studios frei!",
    titlePremiumReq: "Für eigene Fotos brauchst du die Premium-KI-Engine",
    titleNoCredits: "Wechsle zu Pro, um fortzufahren",
    titleBuy: "Hol dir das Pro-Paket",
    descStudio: "Teleportiere deine Produkte sofort nach Paris, Miami Beach oder in Luxusstudios. Wechsle zu Premium, um diesen Hintergrund zu nutzen.",
    descPremiumReq: "Wechsle zu Premium, um deine eigenen hochauflösenden Fotos sofort zu bearbeiten — oder teste die Plattform mit den Beispielfotos unten!",
    descNoCredits: "Du hast keine Credits mehr. Nutze die kostenlose Vorschau weiter oder hol dir Pro für finale Exporte.",
    descBuy: "Mehr Credits holen — werbefrei und blitzschnell.",


    waDialogTitle: "Per WhatsApp bestellen",
    waDialogDesc: (<>80 Premium-Credits — <strong className="text-foreground">$7</strong>. Gründer Ardak kümmert sich persönlich — die Credits landen <strong className="text-foreground">innerhalb von 5 Minuten</strong> nach Zahlungsbestätigung auf deinem Konto.</>),

    waBadge: "Persönliche Bestellung",
    waProductTitle: "bgremovify Pro — 80 Credits",
    waOrderNo: "Bestell-Nr.:",
    waPitchTitle: "Persönliche Aktivierung · in 5 Minuten bereit",
    waPitch1: "Papara, IBAN, Kaspi, Krypto — zahle, wie es dir am besten passt",
    waPitch2: (<>Die Gründer <strong className="text-foreground">Hakan</strong> &amp; <strong className="text-foreground">Ardak</strong> kümmern sich persönlich</>),
    waPitch3: (<>Credits landen <strong className="text-foreground">5 Minuten</strong> nach Zahlung auf deinem Konto</>),
    waPitch4: "Keine Provision, keine Extragebühren — genau $7",
    waBtnHakan: "Auf WhatsApp bestellen — Hakan",
    waBtnArdak: "Oder Ardak schreiben (Reserveleitung)",
    waOpened: (<>✅ WhatsApp geöffnet. Hakan oder Ardak schickt dir <strong>innerhalb von 5 Minuten</strong> die Zahlungsdetails. Du kannst dieses Fenster schließen — die Credits werden nach Bestätigung automatisch geladen.</>),
    waFootSecure: "Sicher",
    waFootSupport: "Persönlicher Support",
    waFootOrder: "Bestellung:",
    waClose: "Schließen",
    trustCount: "500+ zufriedene Kunden",
    trustSpeed: "In 5 Minuten aktiv",
    trustLocal: "Lokale Zahlung (Kaspi/Papara)",
    refundTitle: "🛡️ 100% Geld-zurück-Garantie",
    refundBody: (<>Nicht zufrieden? <strong className="text-foreground">Bedingungslose Rückerstattung</strong> — du bekommst jeden Cent zurück. Null Risiko.</>),

    waMsgGreeting: (n) => `Hi ${n}! Ich möchte bgremovify Pro kaufen 🚀`,
    waMsgPackage: "📦 Paket: 80 Premium-Credits — $7",
    waMsgOrderRef: (r) => `🔖 Bestell-Nr.: ${r}`,
    waMsgAccount: (e) => `📧 Konto: ${e}`,
    waMsgAccountNone: "📧 Konto: (nicht angemeldet)",
    waMsgHow: "Wie kann ich bezahlen?",

    waFallbackToast: "Falls WhatsApp nicht öffnet, kannst du Nummer und Nachricht unten kopieren.",
    waFallbackBlockedTitle: "Falls WhatsApp blockiert ist, direkt kopieren:",
    waFallbackOpenTitle: "Falls WhatsApp nicht öffnet:",
    waCopyNumber: "Nummer kopieren",
    waCopyMessage: "Nachricht kopieren",
  },

  ar: {
    badgeStudio: "🔒 استوديو بريميوم",
    badgePremiumReq: "⚠️ مطلوب الذكاء الاصطناعي بريميوم",
    badgeNoCredits: "نفدت الأرصدة",
    badgeBuy: "احصل على أرصدة",
    titleStudio: "🔒 افتح أكثر من 10 استوديوهات ذكاء اصطناعي بريميوم!",
    titlePremiumReq: "تحتاج إلى محرك الذكاء الاصطناعي بريميوم لصورك الخاصة",
    titleNoCredits: "قم بالترقية إلى Pro للمتابعة",
    titleBuy: "احصل على باقة Pro",
    descStudio: "انقل منتجاتك فوراً إلى باريس أو ميامي بيتش أو استوديوهات فاخرة. قم بالترقية إلى بريميوم لاستخدام هذه الخلفية.",
    descPremiumReq: "قم بالترقية إلى بريميوم لمعالجة صورك عالية الدقة فوراً — أو اختبر سرعة المنصة بالصور النموذجية أدناه!",
    descNoCredits: "لا يوجد لديك رصيد. تابع المعاينة مجاناً أو احصل على Pro للتصدير النهائي.",
    descBuy: "احصل على المزيد من الأرصدة — بدون إعلانات وبسرعة فائقة.",


    waDialogTitle: "اطلب عبر واتساب",
    waDialogDesc: (<>80 رصيد بريميوم — <strong className="text-foreground">$7</strong>. المؤسس أرداك يهتم بالأمر شخصياً — الأرصدة تصل إلى حسابك <strong className="text-foreground">خلال 5 دقائق</strong> من تأكيد الدفع.</>),

    waBadge: "طلب شخصي",
    waProductTitle: "bgremovify Pro — 80 رصيد",
    waOrderNo: "رقم الطلب:",
    waPitchTitle: "تفعيل شخصي · جاهز خلال 5 دقائق",
    waPitch1: "Papara، IBAN، Kaspi، عملات رقمية — ادفع بالطريقة الأنسب لك",
    waPitch2: (<>المؤسسان <strong className="text-foreground">حقان</strong> و<strong className="text-foreground">أرداك</strong> يهتمان بالأمر شخصياً</>),
    waPitch3: (<>الأرصدة تصل إلى حسابك بعد <strong className="text-foreground">5 دقائق</strong> من الدفع</>),
    waPitch4: "بدون عمولة، بدون رسوم إضافية — بالضبط $7",
    waBtnHakan: "اطلب عبر واتساب — حقان",
    waBtnArdak: "أو راسل أرداك (خط احتياطي)",
    waOpened: (<>✅ تم فتح واتساب. سيرسل لك حقان أو أرداك تفاصيل الدفع <strong>خلال 5 دقائق</strong>. يمكنك إغلاق هذه النافذة — ستُحمَّل الأرصدة تلقائياً بعد التأكيد.</>),
    waFootSecure: "آمن",
    waFootSupport: "دعم شخصي",
    waFootOrder: "الطلب:",
    waClose: "إغلاق",
    trustCount: "500+ عميل راضٍ",
    trustSpeed: "تفعيل خلال 5 دقائق",
    trustLocal: "دفع محلي (Kaspi/Papara)",
    refundTitle: "🛡️ ضمان استرداد 100%",
    refundBody: (<>غير راضٍ؟ <strong className="text-foreground">استرداد بدون أسئلة</strong> — نُعيد لك كل قرش. صفر مخاطرة.</>),

    waMsgGreeting: (n) => `مرحباً ${n}! أريد شراء bgremovify Pro 🚀`,
    waMsgPackage: "📦 الباقة: 80 رصيد بريميوم — $7",
    waMsgOrderRef: (r) => `🔖 رقم الطلب: ${r}`,
    waMsgAccount: (e) => `📧 الحساب: ${e}`,
    waMsgAccountNone: "📧 الحساب: (لم أسجّل الدخول)",
    waMsgHow: "كيف يمكنني الدفع؟",

    waFallbackToast: "إذا لم يفتح واتساب، يمكنك نسخ الرقم والرسالة من الأسفل.",
    waFallbackBlockedTitle: "إذا كان واتساب محجوباً، انسخ مباشرة:",
    waFallbackOpenTitle: "إذا لم يفتح واتساب:",
    waCopyNumber: "نسخ الرقم",
    waCopyMessage: "نسخ الرسالة",
  },
};

function useT(): Dict {
  return DICTS[useLang()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Market = which set of payment methods to offer.
//   kz     → Kaspi + Crypto (USDT)
//   tr     → Papara, IBAN, Crypto (USDT)
//   global → Crypto (USDT) only
// Derived from the host page's lang (which mirrors IP-based detection at boot).
// ─────────────────────────────────────────────────────────────────────────────
type Market = "kz" | "tr" | "global";
function marketFromLang(lang: PaywallLang): Market {
  if (lang === "ru") return "kz";
  if (lang === "tr") return "tr";
  return "global";
}

const METHODS_LABEL: Record<Market, Record<PaywallLang, string>> = {
  kz: {
    tr: "Kaspi veya kripto (USDT) — sana uygun olanla öde",
    en: "Kaspi or crypto (USDT) — pay however works best",
    ru: "Kaspi или крипта (USDT) — оплатите как удобно",
    es: "Kaspi o cripto (USDT) — paga como te resulte mejor",
    de: "Kaspi oder Krypto (USDT) — zahle, wie es passt",
    ar: "Kaspi أو كريبتو (USDT) — ادفع بالطريقة الأنسب",
  },
  tr: {
    tr: "Papara, IBAN havalesi veya kripto (USDT) — sana uygun olanla öde",
    en: "Papara, IBAN transfer or crypto (USDT) — pay however works best",
    ru: "Papara, IBAN-перевод или крипта (USDT) — оплатите как удобно",
    es: "Papara, transferencia IBAN o cripto (USDT) — paga como te resulte mejor",
    de: "Papara, IBAN-Überweisung oder Krypto (USDT) — zahle, wie es passt",
    ar: "Papara أو حوالة IBAN أو كريبتو (USDT) — ادفع بالطريقة الأنسب",
  },
  global: {
    tr: "Sadece kripto (USDT) — anlık, güvenli ve global",
    en: "Crypto only (USDT) — instant, secure & global",
    ru: "Только крипта (USDT) — мгновенно, безопасно и глобально",
    es: "Solo cripto (USDT) — instantáneo, seguro y global",
    de: "Nur Krypto (USDT) — sofort, sicher & global",
    ar: "كريبتو فقط (USDT) — فوري وآمن وعالمي",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Local support hotline — dual WhatsApp coverage (Hakan KZ + Ardak TR).
// ─────────────────────────────────────────────────────────────────────────────
const HAKAN_WA_NUMBER = "77027548461";
const ARDAK_WA_NUMBER = "77072785100";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: "no_credits" | "manual" | "premium_required" | "studio_locked";
  defaultRegion?: PricingRegion;
  lang?: PaywallLang;
}

// bgremovify (Kaspi Kazakhstan) — TOO "OptiLife" corporate Kaspi number.
// Notifications: SMS + iMessage on this iPhone are bridged to /api/public/webhooks/kaspi-sms.

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-medium font-mono text-sm truncate">{value}</div>
      </div>
      <Button size="sm" variant="ghost" onClick={copy} className="shrink-0">
        {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function CopyMiniButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={copy} className="gap-2">
      {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ───────────────────────────────────────────────────────────────────────────
// WhatsApp Manual Order
// ───────────────────────────────────────────────────────────────────────────
function getWaNumber(contact: "hakan" | "ardak") {
  return contact === "hakan" ? HAKAN_WA_NUMBER : ARDAK_WA_NUMBER;
}

function formatWaNumber(number: string) {
  return `+${number}`;
}

function buildOrderWaMessage(
  t: Dict,
  orderRef: string,
  userEmail: string | undefined,
  name: string,
  methodsLine: string,
) {
  const lines = [
    t.waMsgGreeting(name),
    ``,
    t.waMsgPackage,
    t.waMsgOrderRef(orderRef),
    userEmail ? t.waMsgAccount(userEmail) : t.waMsgAccountNone,
    `💳 ${methodsLine}`,
    ``,
    t.waMsgHow,
  ];
  return lines.join("\n");
}

function buildWhatsAppAppUrl(number: string, message: string) {
  return `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`;
}

function buildWhatsAppWebUrl(number: string, message: string) {
  // wa.me is the universal entry point — on desktop it opens WhatsApp Desktop
  // if installed, or falls back to WhatsApp Web without forcing the QR-scan
  // landing page that web.whatsapp.com/send always shows first.
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const GATEWAY_NOTICE: Record<PaywallLang, { title: string; body: string }> = {
  tr: {
    title: "🚀 Akıllı Ödeme Altyapımız Hazırlanıyor",
    body: "Kredi Kartı, Apple Pay, Google Pay ve PayPal entegrasyonu tamamlanana kadar; işlemlerin aksamaması ve bonus kredilerinin manuel tanımlanması için ekibimiz WhatsApp üzerinden 7/24 hizmetinde.",
  },
  en: {
    title: "🚀 Global Payment Gateway Integration in Progress",
    body: "We're rolling out Credit Card, Apple Pay, Google Pay and PayPal for one-click checkout. During this short upgrade, our team processes your order instantly via WhatsApp — with special bonus credits applied.",
  },
  ru: {
    title: "🚀 Идёт интеграция глобальной платёжной системы",
    body: "Мы подключаем банковские карты, Apple Pay, Google Pay и PayPal для оплаты в один клик. На время обновления наша команда 24/7 оформляет заказы через WhatsApp — с бонусными кредитами.",
  },
  es: {
    title: "🚀 Integrando nuestra pasarela de pago global",
    body: "Estamos activando Tarjeta, Apple Pay, Google Pay y PayPal para pago en un clic. Durante esta actualización, nuestro equipo procesa tu pedido al instante por WhatsApp — con créditos de bonificación.",
  },
  de: {
    title: "🚀 Globale Zahlungsanbindung wird aktiviert",
    body: "Wir integrieren gerade Kreditkarte, Apple Pay, Google Pay und PayPal für One-Click-Checkout. Während dieses kurzen Upgrades bearbeitet unser Team deine Bestellung sofort per WhatsApp — inkl. Bonus-Credits.",
  },
  ar: {
    title: "🚀 جارٍ تفعيل بوابة الدفع العالمية",
    body: "نعمل حاليًا على تفعيل بطاقات الائتمان وApple Pay وGoogle Pay وPayPal للدفع بنقرة واحدة. خلال هذه الفترة القصيرة، فريقنا يعالج طلبك فورًا عبر واتساب مع إضافة أرصدة مكافأة.",
  },
};

function GatewayUpgradeNotice({ lang }: { lang: PaywallLang }) {
  const t = GATEWAY_NOTICE[lang] ?? GATEWAY_NOTICE.en;
  const isRtl = lang === "ar";
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card px-3.5 py-3 text-xs leading-relaxed"
    >
      <div className="font-semibold text-foreground text-[13px] mb-1">{t.title}</div>
      <div className="text-muted-foreground">{t.body}</div>
    </div>
  );
}

function WhatsAppOrderCheckout({ onClose, market }: { onClose: () => void; market: Market }) {

  const t = useT();
  const lang = useLang();
  const methodsLabel = METHODS_LABEL[market][lang];
  const orderRef = useRef<string>(`OPT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);

  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [opened, setOpened] = useState(false);
  const [fallbackTarget, setFallbackTarget] = useState<"hakan" | "ardak">("hakan");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUserEmail(data.user?.email ?? undefined);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getCheckoutUrl = (target: "hakan" | "ardak" = "hakan", mode: "web" | "app" = "web") => {
    const number = getWaNumber(target);
    const name = target === "hakan" ? "Hakan" : "Ardak";
    const message = buildOrderWaMessage(t, orderRef.current, userEmail, name, methodsLabel);
    return mode === "app" ? buildWhatsAppAppUrl(number, message) : buildWhatsAppWebUrl(number, message);
  };

  const handleOpen = (target: "hakan" | "ardak" = "hakan", mode: "web" | "app" = "web") => {
    void track("CheckoutStarted", {
      method: "whatsapp",
      target,
      mode,
      order_ref: orderRef.current,
      email: userEmail,
    });
    // Not a verified sale — WhatsApp handoff is intent only. Do NOT fire
    // Google Ads purchase conversion here; it inflates conv-rate and destroys
    // Smart Bidding. Real purchase fires from the iyzico/Kaspi success path.
    setFallbackTarget(target);
    setOpened(true);
    window.setTimeout(() => {
      toast.message(t.waFallbackToast);
    }, 700);
  };

  const fallbackNumber = getWaNumber(fallbackTarget);
  const fallbackName = fallbackTarget === "hakan" ? "Hakan" : "Ardak";
  const fallbackMessage = buildOrderWaMessage(t, orderRef.current, userEmail, fallbackName, methodsLabel);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4">
        <div className="flex items-start gap-3">
          <img src={logoImg} alt="bgremovify logo" width={44} height={44} className="size-11 rounded-xl shadow-sm shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold">
              <Building2 className="size-3" /> {t.waBadge}
            </div>
            <div className="font-semibold text-sm leading-tight mt-0.5">{t.waProductTitle}</div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              {t.waOrderNo} <span className="font-mono font-semibold text-foreground">{orderRef.current}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold leading-none">$7</div>
            <div className="text-[10px] text-muted-foreground">
              {market === "tr" ? "~₺239" : market === "kz" ? "~3990₸" : "USD"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#25D366]/30 bg-gradient-to-br from-[#25D366]/10 via-card to-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-[#25D366]" />
          <h3 className="font-bold text-sm">{t.waPitchTitle}</h3>
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
          <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-[#25D366] shrink-0 mt-0.5" /><span>{methodsLabel}</span></li>
          <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-[#25D366] shrink-0 mt-0.5" /><span>{t.waPitch2}</span></li>
          <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-[#25D366] shrink-0 mt-0.5" /><span>{t.waPitch3}</span></li>
          <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-[#25D366] shrink-0 mt-0.5" /><span>{t.waPitch4}</span></li>
        </ul>
      </div>

      {/* WA 1+5 combo (trust bar + refund) temporarily hidden until WA Business is live */}

      <GatewayUpgradeNotice lang={lang} />





      <Button asChild size="lg" className="w-full h-14 text-base font-bold bg-[#25D366] hover:bg-[#1FB957] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] gap-2">
        <a href={getCheckoutUrl("hakan", "web")} target="_blank" rel="noopener" onClick={() => handleOpen("hakan", "web")}>
        <MessageCircle className="size-5" />
        {t.waBtnHakan}
        </a>
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline" className="w-full gap-2 border-[#25D366]/40 text-[#1FB957] hover:bg-[#25D366]/10">
          <a href={getCheckoutUrl("ardak", "web")} target="_blank" rel="noopener" onClick={() => handleOpen("ardak", "web")}>
          <MessageCircle className="size-5" />
          {t.waBtnArdak}
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="w-full gap-2 border-[#25D366]/40 text-[#1FB957] hover:bg-[#25D366]/10">
          <a href={getCheckoutUrl("ardak", "app")} onClick={() => handleOpen("ardak", "app")}>
          <MessageCircle className="size-4" />
          WhatsApp App
          </a>
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-3 text-xs">
        <div className="font-medium text-foreground">{t.waFallbackBlockedTitle}</div>
        <div className="flex flex-wrap gap-2">
          <CopyMiniButton value={formatWaNumber(fallbackNumber)} label={t.waCopyNumber} />
          <CopyMiniButton value={fallbackMessage} label={t.waCopyMessage} />
        </div>
        <div className="font-mono text-[11px] text-muted-foreground break-all">{formatWaNumber(fallbackNumber)}</div>
      </div>

      {opened && (
        <div className="space-y-3 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center">{t.waOpened}</div>
          <div className="rounded-md bg-background/70 p-3 text-left space-y-2">
            <div className="font-medium text-foreground">{t.waFallbackOpenTitle}</div>
            <div className="flex flex-wrap gap-2">
              <CopyMiniButton value={formatWaNumber(fallbackNumber)} label={t.waCopyNumber} />
              <CopyMiniButton value={fallbackMessage} label={t.waCopyMessage} />
            </div>
            <div className="font-mono text-[11px] text-muted-foreground break-all">{formatWaNumber(fallbackNumber)}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-green-500" /> {t.waFootSecure}</span>
        <span className="flex items-center gap-1"><Lock className="size-3" /> {t.waFootSupport}</span>
        <span>· {t.waFootOrder} <span className="font-mono">{orderRef.current}</span></span>
      </div>

      {opened && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onClose}>
          {t.waClose}
        </Button>
      )}
    </div>
  );
}

function PaywallModalInner({ open, onOpenChange, reason, defaultRegion = "global" }: Omit<Props, "lang">) {
  const t = useT();
  const lang = useLang();
  const market = marketFromLang(lang);
  const [geo, setGeo] = useState<GeoRegion>("GLOBAL");
  const [payOpen, setPayOpen] = useState(false);
  const [, setPayRegion] = useState<PricingRegion>(defaultRegion);

  useEffect(() => {
    let cancelled = false;
    detectGeo().then((g) => {
      if (!cancelled) setGeo(g.region);
    });
    return () => { cancelled = true; };
  }, []);

  const isStudioLocked = reason === "studio_locked";
  const iyz = IYZ_DICT[lang] ?? IYZ_DICT.en;
  const payDialogTitle = iyz.headerTitle;
  const payDialogDesc = iyz.headerDesc;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium w-fit mb-2">
                <Sparkles className="size-3.5" />
                {isStudioLocked ? t.badgeStudio : reason === "premium_required" ? t.badgePremiumReq : reason === "no_credits" ? t.badgeNoCredits : t.badgeBuy}
              </div>
              <DialogTitle className="text-2xl">
                {isStudioLocked ? t.titleStudio : reason === "premium_required" ? t.titlePremiumReq : reason === "no_credits" ? t.titleNoCredits : t.titleBuy}
              </DialogTitle>
              <DialogDescription>
                {isStudioLocked ? t.descStudio : reason === "premium_required" ? t.descPremiumReq : reason === "no_credits" ? t.descNoCredits : t.descBuy}
              </DialogDescription>
            </DialogHeader>

            <PricingSection
              defaultRegion={market === "kz" ? defaultRegion : "global"}
              market={market}
              lang={lang}
              onBuy={(region) => {
                setPayRegion(region);
                setPayOpen(true);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="size-5 text-primary" />
              {payDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {payDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <IyzicoCheckoutList onClose={() => setPayOpen(false)} initialGeo={geo} />
        </DialogContent>
      </Dialog>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// iyzico checkout — full i18n (headers, plan names, consent, toasts, buttons)
// ─────────────────────────────────────────────────────────────────────────────
type IyzDict = {
  headerTitle: string;
  headerDesc: React.ReactNode;
  planName: Record<"starter" | "pro" | "premium", string>;
  creditsSuffix: (n: number) => string; // e.g. "50 credits · one-time"
  popularBadge: string;
  payAria: (label: string, amount: string) => string;
  authToastTitle: string;
  authToastDesc: string;
  failTitle: string;
  // consent block
  consentLabel: React.ReactNode;
  consentError: string;
  distance: string;
  refund: string;
  gateway: string;
  currencyNotice: (currency: string) => string;
  close: string;
};


const IYZ_DICT: Record<PaywallLang, IyzDict> = {
  tr: {
    headerTitle: "Güvenli Ödeme — iyzico",
    headerDesc: (<>Kredi Kartı · Apple Pay · Google Pay · 256-bit SSL. Ödeme sonrası kredilerin <strong>anında</strong> hesabına yüklenir.</>),
    planName: { starter: "Giriş Paketi", pro: "Pro Paket", premium: "Scale Paket" },
    creditsSuffix: (n) => `${n} kredi · Tek seferlik`,
    popularBadge: "En popüler",
    payAria: (l, a) => `${l} — ${a} ile öde`,
    authToastTitle: "Ödeme için önce kayıt olmalısın",
    authToastDesc: "Seni kayıt / giriş sayfasına yönlendiriyorum…",
    failTitle: "Ödeme başlatılamadı. Lütfen tekrar deneyin.",
    consentLabel: (<>Aşağıdaki sözleşmeleri okudum, onaylıyorum.</>),
    consentError: "Ödemeye devam edebilmek için sözleşmeleri onaylamanız gerekir.",
    distance: "Mesafeli Satış Sözleşmesi",
    refund: "İptal / İade Şartları",
    gateway: "iyzico altyapısı · 3D Secure · SSL şifreli",
    currencyNotice: (currency) => `Ödeme ekranında ${currency} görürsün; para birimi değişmez.`,
    close: "Kapat",

  },
  en: {
    headerTitle: "Secure Payment — iyzico",
    headerDesc: (<>Credit Card · Apple Pay · Google Pay · 256-bit SSL. Credits are loaded to your account <strong>instantly</strong> after payment.</>),
    planName: { starter: "Starter Pack", pro: "Pro Pack", premium: "Scale Pack" },
    creditsSuffix: (n) => `${n} credits · One-time`,
    popularBadge: "Most popular",
    payAria: (l, a) => `Pay ${a} for ${l}`,
    authToastTitle: "You need to sign up before paying",
    authToastDesc: "Redirecting you to the sign-up / sign-in page…",
    failTitle: "Could not start payment. Please try again.",
    consentLabel: (<>I have read and accept the agreements below.</>),
    consentError: "You must accept the agreements to continue.",
    distance: "Distance Sales Agreement",
    refund: "Cancellation / Refund Terms",
    gateway: "Powered by iyzico · 3D Secure · SSL encrypted",
    currencyNotice: (currency) => `You will see ${currency} on the payment screen; the currency does not change.`,
    close: "Close",

  },
  de: {
    headerTitle: "Sichere Zahlung — iyzico",
    headerDesc: (<>Kreditkarte · Apple Pay · Google Pay · 256-Bit-SSL. Deine Credits werden nach der Zahlung <strong>sofort</strong> gutgeschrieben.</>),
    planName: { starter: "Starter-Paket", pro: "Profi-Paket", premium: "Scale-Paket" },
    creditsSuffix: (n) => `${n} Credits · Einmalig`,
    popularBadge: "Beliebteste",
    payAria: (l, a) => `${l} für ${a} bezahlen`,
    authToastTitle: "Bitte registriere dich, um zu bezahlen",
    authToastDesc: "Ich leite dich zur Anmeldung / Registrierung weiter…",
    failTitle: "Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.",
    consentLabel: (<>Ich habe die untenstehenden Vereinbarungen gelesen und akzeptiere sie.</>),
    consentError: "Bitte akzeptiere die Vereinbarungen, um fortzufahren.",
    distance: "Fernabsatzvertrag",
    refund: "Widerrufs- / Rückerstattungsbedingungen",
    gateway: "Powered by iyzico · 3D Secure · SSL-verschlüsselt",
    currencyNotice: (currency) => `Du siehst ${currency} im Zahlungsfenster; die Währung ändert sich nicht.`,
    close: "Schließen",

  },
  es: {
    headerTitle: "Pago Seguro — iyzico",
    headerDesc: (<>Tarjeta · Apple Pay · Google Pay · SSL de 256 bits. Tus créditos se cargan <strong>al instante</strong> tras el pago.</>),
    planName: { starter: "Paquete Inicial", pro: "Paquete Pro", premium: "Paquete Scale" },
    creditsSuffix: (n) => `${n} créditos · Pago único`,
    popularBadge: "Más popular",
    payAria: (l, a) => `Pagar ${a} por ${l}`,
    authToastTitle: "Debes registrarte antes de pagar",
    authToastDesc: "Te redirijo a la página de registro / inicio de sesión…",
    failTitle: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    consentLabel: (<>He leído y acepto los acuerdos siguientes.</>),
    consentError: "Debes aceptar los acuerdos para continuar.",
    distance: "Contrato de Venta a Distancia",
    refund: "Términos de cancelación / reembolso",
    gateway: "Con tecnología de iyzico · 3D Secure · SSL cifrado",
    currencyNotice: (currency) => `Verás ${currency} en el pago; la moneda no cambia.`,
    close: "Cerrar",

  },
  ru: {
    headerTitle: "Безопасная оплата — iyzico",
    headerDesc: (<>Карта · Apple Pay · Google Pay · 256-bit SSL. Кредиты зачисляются на счёт <strong>мгновенно</strong> после оплаты.</>),
    planName: { starter: "Стартовый пакет", pro: "Про-пакет", premium: "Scale-пакет" },
    creditsSuffix: (n) => `${n} кредитов · Разовая оплата`,
    popularBadge: "Самый популярный",
    payAria: (l, a) => `Оплатить ${a} за ${l}`,
    authToastTitle: "Для оплаты нужно зарегистрироваться",
    authToastDesc: "Перенаправляю на страницу входа / регистрации…",
    failTitle: "Не удалось начать оплату. Попробуйте снова.",
    consentLabel: (<>Я прочитал(а) и принимаю указанные ниже соглашения.</>),
    consentError: "Для продолжения необходимо принять соглашения.",
    distance: "Договор дистанционной продажи",
    refund: "Условия отмены / возврата",
    gateway: "На платформе iyzico · 3D Secure · шифрование SSL",
    currencyNotice: (currency) => `На странице оплаты будет ${currency}; конвертации в TL не будет.`,
    close: "Закрыть",

  },
  ar: {
    headerTitle: "دفع آمن — iyzico",
    headerDesc: (<>بطاقة · Apple Pay · Google Pay · SSL 256-bit. تُضاف الرصيدات إلى حسابك <strong>فورًا</strong> بعد الدفع.</>),
    planName: { starter: "الباقة المبتدئة", pro: "باقة برو", premium: "باقة Scale" },
    creditsSuffix: (n) => `${n} رصيد · دفعة واحدة`,
    popularBadge: "الأكثر شيوعًا",
    payAria: (l, a) => `ادفع ${a} مقابل ${l}`,
    authToastTitle: "يجب التسجيل قبل الدفع",
    authToastDesc: "جارٍ توجيهك إلى صفحة التسجيل / الدخول…",
    failTitle: "تعذر بدء الدفع. يرجى المحاولة مرة أخرى.",
    consentLabel: (<>لقد قرأت وأوافق على الاتفاقيات أدناه.</>),
    consentError: "يجب قبول الاتفاقيات للمتابعة.",
    distance: "عقد البيع عن بُعد",
    refund: "شروط الإلغاء / الاسترداد",
    gateway: "مدعوم بواسطة iyzico · 3D Secure · تشفير SSL",
    currencyNotice: (currency) => `سترى ${currency} في صفحة الدفع؛ لن يتم تحويله إلى الليرة التركية.`,
    close: "إغلاق",

  },
};

function detectPaymentCurrency(geo: GeoRegion): { code: string; locale: string } {
  const map: Partial<Record<GeoRegion, { code: string; locale: string }>> = {
    TR: { code: "TRY", locale: "tr-TR" },
    DE: { code: "EUR", locale: "de-DE" },
    AT: { code: "EUR", locale: "de-AT" },
    FR: { code: "EUR", locale: "fr-FR" },
    ES: { code: "EUR", locale: "es-ES" },
    IT: { code: "EUR", locale: "it-IT" },
    NL: { code: "EUR", locale: "nl-NL" },
    BE: { code: "EUR", locale: "nl-BE" },
    PT: { code: "EUR", locale: "pt-PT" },
    IE: { code: "EUR", locale: "en-IE" },
    GR: { code: "EUR", locale: "el-GR" },
    FI: { code: "EUR", locale: "fi-FI" },
    GB: { code: "GBP", locale: "en-GB" },
    CH: { code: "CHF", locale: "de-CH" },
    KZ: { code: "KZT", locale: "ru-RU" },
    UZ: { code: "UZS", locale: "en-US" },
  };
  return map[geo] ?? { code: "USD", locale: "en-US" };
}

function IyzicoCheckoutList({ onClose, initialGeo }: { onClose: () => void; initialGeo: GeoRegion }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [geo, setGeo] = useState<GeoRegion>(initialGeo);
  const [usdTry, setUsdTry] = useState<number | null>(null);
  const [ratesPerUsd, setRatesPerUsd] = useState<Record<string, number> | null>(null);
  const createCheckout = useServerFn(createIyzicoCheckout);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const lang = useLang();
  const c = IYZ_DICT[lang] ?? IYZ_DICT.en;
  const paymentCurrency = detectPaymentCurrency(geo);
  const billingCurrency: IyzicoCurrency = isIyzicoCurrency(paymentCurrency.code) ? paymentCurrency.code : "USD";
  const displayCurrencyCode = paymentCurrency.code;

  useEffect(() => {
    let cancelled = false;
    detectGeo().then((g) => {
      if (!cancelled) setGeo(g.region);
    });
    // Non-TR: canlı FX display için. TR: enflasyon kalkanı dinamik TRY için.
    void import("@/lib/fx-rates").then((m) => {
      void m.refreshLiveFxRates();
      return m.fetchRatesPerUsd();
    }).then((rates) => {
      if (!cancelled) setRatesPerUsd(rates);
    });
    void import("@/lib/iyzico-pricing").then((m) => m.fetchUsdTryRate()).then((r) => {
      if (!cancelled) setUsdTry(r);
    });
    return () => { cancelled = true; };
  }, []);



  const redirectToAuth = (plan: IyzicoPlan) => {
    track("iyzico_checkout_needs_auth", { plan: plan.id });
    toast.info(c.authToastTitle, {
      description: c.authToastDesc,
    });
    onClose();
    void navigate({
      to: "/auth",
      search: {
        redirect: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/studio",
        plan: plan.id,
        mode: "signup",
      } as never,
    });
  };

  const startCheckout = async (plan: IyzicoPlan) => {
    if (loadingPlan) return;
    if (!consent) {
      setConsentError(true);
      return;
    }
    setLoadingPlan(plan.id);
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user && (!authLoading || !user)) {
        setLoadingPlan(null);
        redirectToAuth(plan);
        return;
      }

      const checkoutRegion = geo === "GLOBAL" ? (await detectGeo()).region : geo;
      const currentCurrency = detectPaymentCurrency(checkoutRegion);
      const billingCode: IyzicoCurrency = isIyzicoCurrency(currentCurrency.code) ? currentCurrency.code : "USD";
      track("iyzico_checkout_start", { plan: plan.id, credits: plan.credits, region: checkoutRegion, currency: billingCode, displayCurrency: currentCurrency.code });
      const result = await createCheckout({ data: { planId: plan.id, lang, currency: billingCode, displayCurrency: currentCurrency.code } });
      if (!result?.paymentPageUrl) throw new Error("no_payment_url");
      window.location.href = result.paymentPageUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[iyzico] checkout failed", err);
      if (/unauthorized|no authorization/i.test(msg)) {
        redirectToAuth(plan);
      } else {
        toast.error(c.failTitle, {
          description: msg.replace(/^iyzico_init_failed:/, ""),
        });
      }
      setLoadingPlan(null);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {IYZICO_PLANS.map((plan) => {
        const pricing = computeCheckoutPricing({ plan, billingCurrency: billingCurrency as IyzicoCurrency, displayCurrency: displayCurrencyCode as never, ratesPerUsd, usdTryRate: usdTry });
        const displayPrice = formatMoney(pricing.displayAmount, pricing.displayCurrency, paymentCurrency.locale);
        const billedNote = pricing.currency !== pricing.displayCurrency ? formatMoney(pricing.amount, pricing.currency, "en-US") : null;
        const localizedName = c.planName[plan.key];
        return (

          <button
            key={plan.id}
            type="button"
            onClick={() => startCheckout(plan)}
            disabled={loadingPlan !== null}
            aria-label={c.payAria(localizedName, displayPrice)}
            className={`group relative w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm active:scale-[0.99] ${
              plan.highlight
                ? "border-primary/40 bg-primary/[0.03]"
                : "border-border"
            } disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
          >
            <div className="min-w-0">
              <div className="font-medium text-sm text-foreground truncate flex items-center gap-2">
                {localizedName}
                {plan.highlight && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {c.popularBadge}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {c.creditsSuffix(plan.credits)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end leading-tight">
                <span className="font-semibold text-base">{displayPrice}</span>
                {billedNote && (
                  <span className="text-[10px] text-muted-foreground">≈ {billedNote}</span>
                )}
              </div>
              {loadingPlan === plan.id ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Lock className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
          </button>
        );
      })}

      {billingCurrency !== "TRY" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-foreground/85">
          <Lock className="size-3.5 mt-0.5 shrink-0 text-primary" />
          <span>{c.currencyNotice(billingCurrency)}</span>
        </div>
      )}



      <div
        className={`mt-3 rounded-lg border p-3 transition-colors ${
          consentError && !consent ? "border-destructive bg-destructive/5" : "border-border bg-card"
        }`}
      >
        <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) setConsentError(false);
            }}
            className="mt-0.5 size-4 rounded border-input accent-primary cursor-pointer shrink-0"
          />
          <span className="text-foreground/90">
            {c.consentLabel}{" "}
            <a href="/mesafeli-satis" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              {c.distance}
            </a>{" · "}
            <a href="/iade" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              {c.refund}
            </a>
          </span>
        </label>
        {consentError && !consent && (
          <p className="mt-1.5 text-[11px] text-destructive">{c.consentError}</p>
        )}
      </div>

      <div className="pt-3 flex flex-col gap-2">
        <PaymentBrandRow />
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            {c.gateway}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground underline">
            {c.close}
          </button>
        </div>
      </div>

    </div>
  );
}


function PaymentBrandRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {/* Visa */}
      <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm">
        <span className="italic font-black text-[12px] tracking-tight" style={{ color: "#1A1F71", fontFamily: "Georgia, serif" }}>VISA</span>
      </span>
      {/* Mastercard */}
      <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm">
        <svg width="26" height="16" viewBox="0 0 26 16" aria-label="Mastercard">
          <circle cx="9" cy="8" r="6" fill="#EB001B" />
          <circle cx="17" cy="8" r="6" fill="#F79E1B" />
          <path d="M13 3.6a6 6 0 0 0 0 8.8 6 6 0 0 0 0-8.8z" fill="#FF5F00" />
        </svg>
      </span>
      {/* Apple Pay */}
      <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm" aria-label="Apple Pay">
        <svg width="32" height="14" viewBox="0 0 40 16" fill="#000">
          <path d="M6.5 2.2c.5-.6.8-1.4.7-2.2-.7 0-1.5.4-2 1-.5.6-.9 1.4-.7 2.2.8 0 1.6-.4 2-1zM7.1 3.3c-1.1-.1-2 .6-2.6.6-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8C-1.9 7.4-.6 11 .6 13c.6 1 1.3 2 2.3 2 .9 0 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.6-1 2.2-2 .7-1.1 1-2.3 1-2.3s-1.9-.7-1.9-2.9c0-1.8 1.5-2.7 1.6-2.7-.9-1.3-2.2-1.5-2.7-1.5z"/>
          <text x="13" y="12" fontFamily="-apple-system, Helvetica, Arial, sans-serif" fontSize="10" fontWeight="600" fill="#000">Pay</text>
        </svg>
      </span>
      {/* Google Pay */}
      <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm" aria-label="Google Pay">
        <svg width="42" height="14" viewBox="0 0 52 16">
          <text x="0" y="12" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">
            <tspan fill="#4285F4">G</tspan>
            <tspan fill="#EA4335">o</tspan>
            <tspan fill="#FBBC04">o</tspan>
            <tspan fill="#4285F4">g</tspan>
            <tspan fill="#34A853">l</tspan>
            <tspan fill="#EA4335">e</tspan>
          </text>
          <text x="30" y="12" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600" fill="#5F6368">Pay</text>
        </svg>
      </span>
    </div>
  );
}


export function PaywallModal({ lang = "tr", ...rest }: Props) {
  return (
    <LangCtx.Provider value={lang}>
      <PaywallModalInner {...rest} />
    </LangCtx.Provider>
  );
}

