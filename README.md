# Magnet Incremental

Mobil-first, **yatay ekran (landscape)**, tek parmakla oynanan bir magnet-fizik / incremental oyunu. Tasarım detayları için [DESIGN.md](./DESIGN.md).

Mıknatısı geri çekip bırakırsın; durduğu noktada manyetik pulse atar ve menzilindeki metal objeleri kendine çeker. Ağır objeler tek pulse'ta gelmez, birkaç atışta kademeli olarak yaklaşır. Toplanan yük mıknatısı ağırlaştırıp sonraki atışı kısaltır — süre ve atış hakkı biterken risk/ödül kararı budur.

## Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Mobil önizleme için tarayıcı dev tools'ta **yatay** bir cihaz simülasyonu (ör. 844×390) kullanın; portrait'te "telefonu yatay çevir" ekranı gösterilir.

## Build

```bash
npm run build
npm run preview
```

## Deploy

`main` branch'ine her push'ta `.github/workflows/deploy.yml` projeyi build edip GitHub Pages'e yayınlar:

**https://eraybek.github.io/incremental-game/**

Pages bir proje alt yolunda (`/incremental-game/`) yayınlandığı için build `base: './'` ile göreli yollar üretir. Kodda çalışma anında oluşturulan asset URL'leri (`new Image().src = ...`) Vite tarafından yeniden yazılamaz, bu yüzden **hepsi `src/assetPath.ts` içindeki `asset()` yardımcısından geçmelidir** — doğrudan `/assets/...` yazmak alt yolda kırılır.

## Proje yapısı

```
src/
  game/     saf oyun mantığı (board üretimi, magnet fiziği, run/upgrade state)
  render/   canvas çizim katmanı ve asset loader
  ui/       DOM tabanlı HUD ve modal'lar (upgrade shop, collection, payout)
public/
  assets/   sprite'lar (magnet, collectibles, environment, fx, buttons, rarity, hud icons)
```

## Asset'ler

`public/assets/` altındaki sprite'lar, ilk GDD teslimatıyla gelen referans sprite sheet'inden otomatik arka plan temizleme ve dilimleme ile çıkarılmış placeholder görsellerdir. Nihai onaylı asset paketi geldiğinde aynı dosya adlarının üzerine yazmak (veya `src/game/content.ts` içindeki yolları güncellemek) yeterlidir.
