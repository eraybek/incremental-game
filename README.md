# Derin Sular

Balıkçılık temalı bir incremental oyun. Denizin yandan kesitini görüyorsun;
suda bir noktaya nişan alıp olta atıyorsun, çıkan balık koleksiyona işlenip
otomatik satılıyor, parayla daha derine inebilen teçhizat alıyorsun.

Mobil öncelikli, yatay ekran için tasarlandı; dikey ekranda panel alta geçer.

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # tip kontrolü + üretim derlemesi
npm run preview  # derlenmiş sürümü çalıştır
```

## Nasıl oynanır

- **Suya basılı tut** — nişan halkası dolar, parmağını kaydırarak hedefi
  değiştirebilirsin. Halka dolduğunda olta kendiliğinden atılır.
- **Ne kadar derine atarsan balık o kadar değerli.** Misinan yetmeyen bölge
  karanlık görünür.
- **Şamandıra battığında ona dokun** — yakaladığın ×2 eder. Dokunmazsan balık
  yine de çekilir; kaçırmanın cezası yok.
- **Çöp** para etmez ama Temiz Deniz sayacını besler; sayaç eşiklerinde kalıcı
  ödüller açılır.

Tasarım kararları ve gerekçeleri: [DESIGN.md](DESIGN.md)

## Yapı

```
src/
  game/      oyun mantığı — render'dan tamamen bağımsız
    content.ts   balık tablosu, çöp, yükseltmeler, derinlik bantları
    state.ts     durum, olta durum makinesi, kayıt/yükleme
    types.ts     ortak tipler
    format.ts    büyük sayı ve ağırlık gösterimi
  render/    three.js sahnesi (ortografik 2D)
    scene.ts     su, ışık, oltalar, dekoratif balıklar
    atlas.ts     sprite atlası çözümleme (three + CSS)
  ui/hud.ts  panel, defter, Temiz Deniz, bildirimler
  main.ts    giriş yönetimi ve ana döngü
```

Oyun mantığı sprite'ları tanımaz; sadece `{sheet, i}` atlas referansı taşır.
Atlas değiştiğinde `content.ts` içindeki indeksler dışında hiçbir şey
değişmez.

## Asset'ler

`public/assets/` altındaki pixel art paketleri (`fishes.png` 144 deniz
canlısı, `objects.png` 20 obje, `fishing_gear.png` 36 teçhizat) proje sahibi
tarafından sağlandı ve kullanımı onaylandı.
