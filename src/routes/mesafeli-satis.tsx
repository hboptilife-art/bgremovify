import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mesafeli-satis")({
  head: () => ({
    meta: [
      { title: "Mesafeli Satış Sözleşmesi — BgRemovify" },
      { name: "description", content: "BgRemovify dijital hizmetleri için Mesafeli Satış Sözleşmesi." },
      { property: "og:title", content: "Mesafeli Satış Sözleşmesi — BgRemovify" },
      { property: "og:description", content: "BgRemovify dijital hizmetleri için Mesafeli Satış Sözleşmesi." },
    ],
  }),
  component: DistanceSalesPage,
});

function DistanceSalesPage() {
  return (
    <article className="container mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Ana sayfaya dön</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-2">Mesafeli Satış Sözleşmesi</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: 10 Temmuz 2026</p>

      <section className="space-y-6 text-foreground/90 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Taraflar</h2>
          <p>
            İşbu sözleşme, bir tarafta BgRemovify markası altında hizmet veren <strong>Hakan Bazarbaşı</strong> (bundan sonra
            "SATICI" olarak anılacaktır) ile diğer tarafta www.bgremovify.com ("SİTE") üzerinden hizmet satın alan
            kullanıcı (bundan sonra "ALICI" olarak anılacaktır) arasında elektronik ortamda kurulmuştur.
          </p>
          <ul className="list-disc pl-6 mt-2 text-sm">
            <li><strong>Ünvan:</strong> HAKAN BAZARBAŞI (Şahıs Şirketi / Şahıs İşletmesi)</li>
            <li><strong>Vergi Numarası:</strong> 1600567582</li>
            <li><strong>Vergi Dairesi:</strong> Sultanbeyli Vergi Dairesi Müdürlüğü</li>
            <li><strong>Adres:</strong> Abdurrahmangazi Mah. Alpaslan Cad. 2, E-Blok Daire 14, Kat 2, Sultanbeyli / İstanbul</li>
            <li><strong>E-posta:</strong> <a className="underline" href="mailto:info@bgremovify.com">info@bgremovify.com</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. Sözleşmenin Konusu</h2>
          <p>
            İşbu sözleşmenin konusu; ALICI'nın SATICI'ya ait SİTE üzerinden elektronik ortamda siparişini verdiği,
            aşağıda nitelikleri ve satış bedeli belirtilen <strong>dijital hizmet / kredi paketi</strong> ürününün
            satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
            Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Sözleşme Konusu Hizmet</h2>
          <p>
            BgRemovify; AI tabanlı arka plan silme, görsel işleme ve ilgili görsel araçlarını sunan bir SaaS
            hizmetidir. ALICI, SİTE üzerinden <strong>kredi paketi</strong> veya <strong>aylık abonelik</strong>
            satın alarak hizmetten yararlanır. Fiyatlar, paket içerikleri ve kredi tutarları sipariş anında
            sitede açıkça belirtilmiştir. Ödemeye KDV dahildir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Ödeme ve Teslimat</h2>
          <p>
            Ödeme, iyzico (Kredi Kartı / Banka Kartı / Apple Pay / Google Pay) altyapısı üzerinden 256-bit SSL
            şifrelemesi ile alınır. Ödeme başarıyla tamamlandığı anda krediler <strong>otomatik ve anında</strong>
            ALICI'nın hesabına tanımlanır; ayrıca fiziki teslimat yoktur. Aylık aboneliklerde krediler her ay
            aynı gün otomatik yenilenir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Cayma Hakkı ve İstisnası</h2>
          <p>
            Mesafeli Sözleşmeler Yönetmeliği'nin 15/1-(ğ) maddesi uyarınca, <strong>elektronik ortamda anında
            ifa edilen hizmetler ve tüketiciye anında teslim edilen gayri maddi mallar</strong> cayma hakkı
            kapsamı dışındadır. ALICI, satın aldığı krediyi kullanmaya (herhangi bir görsel işlemeye) başladığı
            anda cayma hakkını peşinen kaybettiğini kabul, beyan ve taahhüt eder. Detaylı iade koşulları için{" "}
            <Link to="/iade" className="underline">İptal ve İade Politikamıza</Link> bakınız.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. Genel Hükümler</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>ALICI, sipariş vermeden önce sözleşmenin tüm koşullarını okuduğunu ve kabul ettiğini beyan eder.</li>
            <li>SATICI, mücbir sebepler ve teknik altyapı arızaları hariç, hizmeti kesintisiz sunmak için gereken özeni gösterir.</li>
            <li>ALICI, hesabını üçüncü kişilerle paylaşmamayı ve şifresinin gizliliğini korumayı taahhüt eder.</li>
            <li>Yüklenen görseller kullanıcının tarayıcısında işlenir; SATICI görselleri sunucularında saklamaz (detaylar Gizlilik Politikasında).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Uyuşmazlık Çözümü</h2>
          <p>
            İşbu sözleşmeden doğan uyuşmazlıklarda Sanayi ve Ticaret Bakanlığınca ilan edilen değere kadar Tüketici
            Hakem Heyetleri, aşan durumlarda ALICI'nın ve SATICI'nın yerleşim yerindeki Tüketici Mahkemeleri
            yetkilidir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">8. Yürürlük</h2>
          <p>
            ALICI, SİTE üzerinden siparişini onayladığı anda işbu sözleşmenin tüm koşullarını kabul etmiş sayılır
            ve sözleşme yürürlüğe girer.
          </p>
        </div>
      </section>
    </article>
  );
}
