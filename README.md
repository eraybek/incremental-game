# Magnet Incremental

Mobil-first, **dikey ekran (portrait)**, tek parmakla oynanan bir magnet-fizik / incremental oyunu. Tasarım detayları için [DESIGN.md](./DESIGN.md).

Mıknatısı geri çekip bırakırsın; çekim alanı sürekli açıktır, yani mıknatıs havada süzülürken bile menzilindeki metali kendine doğru sürükler. Hafif parçalar anında yapışır, ağırlar sadece biraz kayar ve yeni yerlerinde kalır — onları almak için ya tekrar üzerlerine gitmen ya da yanlarında beklemen gerekir. Toplanan yük mıknatısı ağırlaştırıp sonraki atışı kısaltır; süre ve atış hakkı biterken risk/ödül kararı budur.

Bir tur "vardiya" olarak adlandırılır: Ana menü → vardiya başlangıcı → oyun → vardiya sonu raporu → geliştirme → yeni vardiya.

## Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Masaüstünde oyun ortalanmış dikey bir kolon olarak letterbox'lanır, yani ayrıca cihaz simülasyonu gerekmez; istersen **dikey** bir cihaz (ör. 390×844) da seçebilirsin. Yatay tutulan telefonlarda "telefonu dik tut" ekranı gösterilir.

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
assets-src/
  sheet.png kaynak sprite sheet — public/assets bundan üretilir
scripts/
  slice-sheet.mjs  sheet'i tek tek sprite'lara ayırır
  build-assets.mjs ayrılan sprite'lara isim verip public/assets'i yazar
```

## Asset'ler

`public/assets/` elle düzenlenmez; tamamı `assets-src/sheet.png` dosyasından üretilir:

```
node scripts/build-assets.mjs
```

`slice-sheet.mjs` sheet'i sabit bir ızgarayla değil, her sprite'ın kendi piksellerini bularak kesiyor — satırlar düzensiz ve sağdaki sütunlar soldakilerle hizalı olmadığı için ızgara da satır/sütun projeksiyonu da tutmuyor. Bunun yerine bağlantılı bölgeler etiketleniyor. Sheet saydamlığı gerçek alfa yerine damalı desen olarak gömülü tuttuğundan `--checker` bayrağı o deseni yeniden kurup yalnızca ona uyan pikselleri arka plan sayıyor; sprite'ların siyah konturları düz bir parlaklık eşiğiyle yenip gideceği için bu şart.

Hangi sprite'ın hangi isimle çıkacağı `build-assets.mjs` içindeki `NAMES` haritasında duruyor. Sheet değişirse önce aracı tek başına çalıştırıp ürettiği `_contact.png` üzerinden numaraları doğrula:

```
node scripts/slice-sheet.mjs assets-src/sheet.png /tmp/cut --checker
```

Sheet'teki her sprite kullanılmıyor: üzerine İngilizce metin basılmış hazır HUD hapları ve rozetler (arayüz Türkçe) ile gölgeleri örtüştüğü için tek parça çıkan yığınlar bilerek dışarıda bırakıldı.
