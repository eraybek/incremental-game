# Magnet Incremental

Mobil-first, **yatay ekran (landscape)**, tek parmakla oynanan bir magnet-fizik / incremental oyunu. Tasarım detayları için [DESIGN.md](./DESIGN.md).

Mıknatısı geri çekip bırakırsın; çekim alanı sürekli açıktır, yani mıknatıs havada süzülürken bile menzilindeki metali kendine doğru sürükler. Hafif parçalar anında yapışır, ağırlar sadece biraz kayar ve yeni yerlerinde kalır — onları almak için ya tekrar üzerlerine gitmen ya da yanlarında beklemen gerekir. Toplanan yük mıknatısı ağırlaştırıp sonraki atışı kısaltır; süre ve atış hakkı biterken risk/ödül kararı budur.

Bir tur "vardiya" olarak adlandırılır: Ana menü → vardiya başlangıcı → oyun → vardiya sonu raporu → geliştirme → yeni vardiya.

## Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Mobil önizleme için tarayıcı dev tools'ta **yatay** bir cihaz simülasyonu (ör. 844×390) kullanın; portrait'te "telefonu yatay çevir" ekranı gösterilir.

## Ses

Sesler [ZzFX](https://github.com/KilledByAPixel/ZzFX) ile kodda üretilir; ses dosyası yoktur. Tüm presetler `src/audio/sfx.ts` içindeki tek bankada; akort etmek için oradaki sayıları değiştirmek yeterli.

```bash
npm run check:sfx   # presetleri offline render edip süre/seviye raporlar
```

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
  game/     saf oyun mantığı (board üretimi, magnet fiziği, çekim, vardiya/upgrade state)
  render/   canvas çizim katmanı ve asset loader
  ui/       DOM tabanlı ekranlar: menü, vardiya intro, HUD, rapor, geliştirme, koleksiyon, ayarlar
  main.ts   ekran akışı, girdi ve oyun döngüsü
public/
  assets/   sprite'lar (magnet, collectibles, environment, fx, buttons, rarity, hud icons)
```

## Asset'ler

`public/assets/` altındaki sprite'lar, ilk GDD teslimatıyla gelen referans sprite sheet'inden otomatik arka plan temizleme ve dilimleme ile çıkarılmış placeholder görsellerdir. Nihai onaylı asset paketi geldiğinde aynı dosya adlarının üzerine yazmak (veya `src/game/content.ts` içindeki yolları güncellemek) yeterlidir.
