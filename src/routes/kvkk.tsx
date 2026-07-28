import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/kvkk")({
  head: () => ({
    meta: [
      { title: "KVKK Aydınlatma Metni — BgRemovify" },
      { name: "description", content: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni." },
      { property: "og:title", content: "KVKK Aydınlatma Metni — BgRemovify" },
      { property: "og:description", content: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni." },
    ],
  }),
  component: KvkkPage,
});

function KvkkPage() {
  return (
    <article className="container mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Ana sayfaya dön</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-2">KVKK Aydınlatma Metni</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: 10 Temmuz 2026</p>

      <section className="space-y-6 text-foreground/90 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla{" "}
            <strong>HAKAN BAZARBAŞI (BgRemovify — Şahıs Şirketi / Şahıs İşletmesi)</strong> tarafından, kişisel
            verileriniz aşağıda açıklanan kapsamda işlenmektedir.
          </p>
          <ul className="list-disc pl-6 mt-3 text-sm">
            <li><strong>Ticari Ünvan:</strong> HAKAN BAZARBAŞI</li>
            <li><strong>Vergi Numarası:</strong> 1600567582</li>
            <li><strong>Vergi Dairesi:</strong> Sultanbeyli Vergi Dairesi Müdürlüğü</li>
            <li><strong>Adres:</strong> Abdurrahmangazi Mah. Alpaslan Cad. 2, E-Blok Daire 14, Kat 2, Sultanbeyli / İstanbul</li>
            <li><strong>E-posta:</strong> <a className="underline" href="mailto:info@bgremovify.com">info@bgremovify.com</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. İşlenen Kişisel Veriler</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Kimlik / İletişim:</strong> Ad-soyad (opsiyonel), e-posta adresi.</li>
            <li><strong>Müşteri işlem:</strong> Satın alma geçmişi, kredi bakiyesi, abonelik durumu.</li>
            <li><strong>İşlem güvenliği:</strong> IP adresi, tarayıcı bilgisi, oturum verileri.</li>
            <li><strong>Ödeme verileri:</strong> Kart bilgileri BgRemovify tarafından saklanmaz; iyzico Ödeme Hizmetleri A.Ş. tarafından PCI-DSS standartlarında işlenir.</li>
            <li><strong>Görseller:</strong> Yüklediğiniz fotoğraflar sunucularımıza gönderilmez; tarayıcınızda (cihazınızda) işlenir.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. İşleme Amacı</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Üyelik oluşturma ve hesap yönetimi.</li>
            <li>Sipariş, ödeme ve kredi tahsisi süreçlerinin yürütülmesi.</li>
            <li>Yasal yükümlülüklerin (fatura, vergi mevzuatı) yerine getirilmesi.</li>
            <li>Hizmet güvenliği ve suistimalin önlenmesi.</li>
            <li>Kullanıcı deneyiminin iyileştirilmesi (anonim analitik).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Hukuki Sebep</h2>
          <p>
            Kişisel verileriniz KVKK'nın 5. maddesi kapsamında; sözleşmenin kurulması ve ifası için gerekli olması,
            yasal yükümlülüklerin yerine getirilmesi, meşru menfaatlerimiz ve açık rızanız gerektiği durumlarda
            rızanız hukuki sebeplerine dayanarak işlenmektedir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Aktarım</h2>
          <p>Kişisel verileriniz sadece aşağıdaki hizmet sağlayıcılarla, hizmetin ifası için gerekli olduğu ölçüde paylaşılır:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong>iyzico Ödeme Hizmetleri A.Ş.</strong> — ödeme altyapısı</li>
            <li><strong>Supabase / Cloudflare</strong> — hosting ve veritabanı altyapısı</li>
            <li><strong>Google (Analytics, Ads)</strong> — anonim kullanım analizi ve reklam ölçümü</li>
            <li>Yetkili kamu kurum ve kuruluşları — yasal talep halinde</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. KVKK Madde 11 Kapsamındaki Haklarınız</h2>
          <p>Veri sahibi olarak aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme.</li>
            <li>İşlenmişse bilgi talep etme.</li>
            <li>İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme.</li>
            <li>KVKK'nın 7. maddesi kapsamında silinmesini/yok edilmesini isteme.</li>
            <li>Aktarıldığı üçüncü kişilere bildirilmesini isteme.</li>
            <li>İşlenen verilerin münhasıran otomatik sistemlerle analizi sonucu aleyhinize bir sonuç doğmasına itiraz etme.</li>
            <li>Kanuna aykırı işleme sebebiyle zarara uğramanız halinde tazminat talep etme.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Başvuru</h2>
          <p>
            Yukarıdaki haklarınızı kullanmak için taleplerinizi{" "}
            <a className="underline" href="mailto:info@bgremovify.com">info@bgremovify.com</a> adresine
            iletebilirsiniz. Talebiniz en geç <strong>30 gün içinde</strong> sonuçlandırılır.
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            Genel gizlilik uygulamalarımız için ayrıca{" "}
            <Link to="/privacy" className="underline">Gizlilik Politikamıza</Link> bakınız.
          </p>
        </div>
      </section>
    </article>
  );
}
