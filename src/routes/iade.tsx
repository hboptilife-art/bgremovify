import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/iade")({
  head: () => ({
    meta: [
      { title: "İptal ve İade Koşulları — BgRemovify" },
      { name: "description", content: "BgRemovify dijital hizmetleri için iptal ve iade politikası." },
      { property: "og:title", content: "İptal ve İade Koşulları — BgRemovify" },
      { property: "og:description", content: "BgRemovify dijital hizmetleri için iptal ve iade politikası." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <article className="container mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Ana sayfaya dön</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-2">İptal ve İade Koşulları</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: 10 Temmuz 2026</p>

      <section className="space-y-6 text-foreground/90 leading-relaxed">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="font-medium">
            Özet: BgRemovify dijital ve anında ifa edilen bir hizmettir. Krediler <strong>kullanılmadığı sürece</strong>
            {" "}satın alım tarihinden itibaren <strong>7 gün içinde</strong> iade edilebilir. Kredi harcandıktan sonra
            iade yapılmaz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">1. Yasal Dayanak</h2>
          <p>
            6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği'nin
            <strong> madde 15/1-(ğ)</strong> hükmü uyarınca; elektronik ortamda anında ifa edilen hizmetler ile
            tüketiciye anında teslim edilen gayri maddi mallar (dijital içerik) cayma hakkı kapsamı dışındadır.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. İade Yapılabilecek Durumlar</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Kullanılmamış kredi paketi:</strong> Satın alma tarihinden itibaren 7 gün içinde ve
              <strong> hiç kredi harcanmamışsa</strong>, ücretinizin tamamı iade edilir.
            </li>
            <li>
              <strong>Teknik hata / mükerrer ödeme:</strong> Ödeme başarılı olduğu halde kredi yüklenmemişse veya
              aynı işlem birden fazla kez çekildiyse, tespit sonrası tam iade yapılır.
            </li>
            <li>
              <strong>Abonelik iptali:</strong> Aylık aboneliği istediğiniz zaman hesap ayarlarınızdan iptal
              edebilirsiniz. İptal, mevcut dönem sonunda etkinleşir; kullanılmış aylar için geriye dönük iade
              yapılmaz.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. İade Yapılmayacak Durumlar</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Kredi paketinden en az bir kredi harcanmışsa (görsel işlenmişse) iade yapılmaz.</li>
            <li>Satın alma tarihinden 7 gün geçtikten sonra yapılan iade talepleri kabul edilmez.</li>
            <li>Aylık aboneliğin geçmiş dönemlerine (kullanılmış ay/aylar) ait ücretler iade edilmez.</li>
            <li>Kullanım koşullarımıza aykırı hareket nedeniyle askıya alınan hesaplara iade yapılmaz.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. İade Talebi Nasıl Yapılır?</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <a className="underline" href="mailto:info@bgremovify.com">info@bgremovify.com</a> adresine iade
              talebi maili gönderin.
            </li>
            <li>Mailin konusuna "İade Talebi" yazın ve içerikte sipariş numaranız ile ödeme yaptığınız e-posta adresini belirtin.</li>
            <li>Talebiniz 3 iş günü içinde değerlendirilir.</li>
            <li>Onaylanan iadeler, ödemenin yapıldığı karta <strong>10 iş günü</strong> içinde iyzico üzerinden aktarılır.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. İletişim</h2>
          <p>
            İade süreci hakkında her türlü soru için{" "}
            <a className="underline" href="mailto:info@bgremovify.com">info@bgremovify.com</a> veya{" "}
            <Link to="/contact" className="underline">iletişim sayfamız</Link> üzerinden bize ulaşabilirsiniz.
          </p>
        </div>
      </section>
    </article>
  );
}
