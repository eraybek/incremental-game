# Magnet Incremental

Mobil-first, tek parmakla oynanan bir magnet-fizik / incremental oyunu. Tasarım detayları için [DESIGN.md](./DESIGN.md).

## Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Mobil önizleme için tarayıcı dev tools'ta portrait bir cihaz simülasyonu kullanmanız önerilir.

## Build

```bash
npm run build
npm run preview
```

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
