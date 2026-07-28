import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, Zap, Globe } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Hakkımızda — BgRemovify" },
      { name: "description", content: "BgRemovify hakkında: misyonumuz, teknolojimiz ve ekibimiz." },
      { property: "og:title", content: "Hakkımızda — BgRemovify" },
      { property: "og:description", content: "BgRemovify hakkında: misyonumuz, teknolojimiz ve ekibimiz." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <article className="container mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Ana sayfaya dön</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-4">Hakkımızda</h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-10">
        BgRemovify, e-ticaret satıcıları, içerik üreticileri ve tasarımcılar için geliştirilen,
        tarayıcı üzerinde çalışan yapay zeka tabanlı bir görsel işleme platformudur. Amacımız;
        arka plan silme, retuş ve stüdyo kalitesinde ürün fotoğrafı üretmeyi herkes için
        saniyeler içinde erişilebilir kılmak.
      </p>

      <section className="grid sm:grid-cols-2 gap-4 mb-12">
        <Feature icon={<Zap className="size-5" />} title="Anında sonuç">
          Görseller cihazınızda işlenir — sunucuya yüklenmez, saniyeler içinde biter.
        </Feature>
        <Feature icon={<ShieldCheck className="size-5" />} title="Gizlilik önce gelir">
          Fotoğraflarınız sunucularımıza gönderilmez; %100 tarayıcıda çalışır.
        </Feature>
        <Feature icon={<Sparkles className="size-5" />} title="Stüdyo kalitesi">
          4K çıktı, saç teli hassasiyetinde maske, AI stüdyo arkaplanları.
        </Feature>
        <Feature icon={<Globe className="size-5" />} title="Global & yerel">
          Türkiye, Kazakistan ve dünya çapında; yerel ödeme yöntemleri desteklenir.
        </Feature>
      </section>

      <section className="space-y-6 text-foreground/90 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold mb-2">Misyonumuz</h2>
          <p>
            Küçük işletmeden büyük markaya kadar herkesin profesyonel görsel üretimini
            demokratikleştirmek. Tek bir tıklamayla e-ticaret standartlarında ürün fotoğrafı,
            içerik ve reklam görseli hazırlanabilsin istiyoruz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Yasal Bilgiler</h2>
          <ul className="text-sm space-y-1">
            <li><strong>Ticari Ünvan:</strong> HAKAN BAZARBAŞI (Şahıs İşletmesi)</li>
            <li><strong>Vergi Numarası:</strong> 1600567582</li>
            <li><strong>Vergi Dairesi:</strong> Sultanbeyli Vergi Dairesi Müdürlüğü</li>
            <li><strong>Adres:</strong> Abdurrahmangazi Mah. Alpaslan Cad. 2, E-Blok Daire 14, Kat 2, Sultanbeyli / İstanbul</li>
            <li><strong>E-posta:</strong> <a className="underline" href="mailto:info@bgremovify.com">info@bgremovify.com</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">İletişime geçin</h2>
          <p>
            Her türlü soru, öneri ve iş birliği için{" "}
            <Link to="/contact" className="underline">iletişim sayfamızdan</Link> bize
            ulaşabilirsiniz.
          </p>
        </div>
      </section>
    </article>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="size-9 rounded-lg flex items-center justify-center text-primary-foreground mb-3" style={{ background: "var(--gradient-hero)" }}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
