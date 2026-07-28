# Pro Model Kütüphanesi & Akıllı Giydirme Planı

Amaç: Kullanıcı kendi elini/kolunu çekmek zorunda kalmasın. Ürünü seçtiğinde sistem hazır bir "insan modeli" (el, bilek, baş, gövde) üzerine oturtsun; ten tonu/cinsiyet değiştirilebilsin; ürün mikro transform ile ince ayarlansın.

## 1) Asset Havuzu Yapısı

`src/assets/pro-models/` altında kategori bazlı klasörler:

```text
pro-models/
  wrist/       (saat, bileklik)      -> male/female × light/wheat/dark
  hand/        (yüzük, tırnak, oje)
  head/        (şapka, gözlük, küpe)
  torso/       (tişört, ceket, kolye)
  full/        (tam boy giyim)
```

Her varyant: `wrist_female_light.webp`, `wrist_female_light.cutout.webp` (alpha), `wrist_female_light.anchor.json` (product slot: x/y/rot/scale + maskePolygon).

Build-time cutout script mevcut `scripts/build-cutouts` altyapısını kullanır — yeni klasör pattern'i eklenir.

## 2) SmartAsset Tip Genişletmesi

`src/lib/smart-templates.ts` içine `ProModelTemplate` tipi:
- `category: "wrist" | "hand" | "head" | "torso" | "full"`
- `gender: "female" | "male" | "neutral"`
- `skin: "light" | "wheat" | "dark"`
- `anchor: { x, y, rotation, scale, maskPath? }`
- `productLayerMode: "overlay" | "masked"` (masked = ürünün model eli/kolu tarafından örtülen kısmı kırpılır)

## 3) Templates Sekmesi Yeniden Düzenleme

Sol paneldeki Templates grid'i kategori chip'leriyle bölünür: **Wrist / Hand / Head / Torso / Full / Flat scenes**. Pro model kartları thumb olarak gerçek render gösterir (kadın/erkek + ten tonu badge'i).

## 4) Sağ Panel: Model Kontrolleri

Aktif template bir `ProModel` ise sağ panelde yeni bölüm:
- **Gender:** Kadın / Erkek toggle
- **Skin tone:** Açık / Buğday / Koyu (3 swatch)
- Seçim değişince aynı kategori+cinsiyet+ten tonu varyantı otomatik yüklenir; ürün katmanının anchor pozisyonu korunur.

## 5) Mikro Transform

Ürün katmanı için sağ panelde:
- X / Y kaydırma (slider + ok tuşlarıyla 1px)
- Rotation (-180° → 180°, slider + input)
- Scale (0.5x → 2x)
- "Reset to anchor" butonu

Canvas üzerinde de mevcut drag/rotate tutamaçları korunur; klavye ok tuşları seçili katmanı 1px, Shift+ok 10px kaydırır.

## 6) Katman Maskeleme (Akıllı Giydirme)

`productLayerMode: "masked"` şablonlarında (örn. saat kayışının bileğin arkasına geçmesi), model asset'inin `mask.png`'i product layer üzerinde `mask-image` CSS ile uygulanır. Böylece ürün gerçekçi şekilde bileğin/parmakların arkasına geçer.

## 7) i18n

Yeni anahtarlar 6 dilde: `proModel`, `gender`, `skinTone`, `light`, `wheat`, `dark`, `microTransform`, `resetAnchor`, `wrist`, `hand`, `head`, `torso`, `full`.

## 8) Faz Sırası

Faz A (bu sprint): Wrist (saat) — 2 cinsiyet × 3 ten tonu = 6 asset. Sağ panel model kontrolleri + mikro transform. En yüksek ROI çünkü saat/bileklik en çok satılan kategori.

Faz B: Head (şapka/gözlük) 6 asset.

Faz C: Torso (tişört) 6 asset + masking.

Her faz bağımsız kullanıcıya değer verir; A biter bitmez canlıya çıkabilirsin.

## Onay soruları

1. Faz A'yı **Wrist (saat/bileklik)** ile başlatalım mı, yoksa senin öncelik listen farklı mı?
2. AI ile üreteceğim 6 wrist görselinin stili: **stüdyo/beyaz zemin nötr** mü, yoksa **doğal ışık lifestyle** mı olsun?
3. Cinsiyet için sadece Kadın/Erkek yeter mi, yoksa "Neutral/Unisex" 3. seçenek de olsun mu?
