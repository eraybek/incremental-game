# MAGNET INCREMENTAL

Minimal Game Design Document
2D • Mobile Portrait • Skill-based Incremental / Collection

## 1. Oyun Özeti

Oyuncu, bilardo benzeri drag-and-release kontrolüyle mıknatısı sahaya fırlatır. Mıknatıs durduğu noktada manyetik alanını aktive eder ve menzilindeki metal objeleri kendine çeker. Objeler mıknatısa fiziksel olarak yapışır ve tur sonuna kadar üzerinde kalır. Oyuncunun hem sınırlı süresi hem de sınırlı atış hakkı vardır. Tur sonunda toplanan objeler paraya çevrilir; para ile mıknatısın istatistikleri ve yeni oynanış mekanikleri geliştirilir.

**Core loop:** Board → Aim → Shoot → Attract → Collect → Run Payout → Upgrade → New Board

## 2. Platform ve Kontrol

| | |
|---|---|
| Platform | Mobile-first: iOS / Android |
| Ekran | Portrait |
| Görsel | 2D, tercihen pixel art veya temiz stylized 2D |
| Kontrol | Tek parmak: drag → aim → release |
| Run yapısı | Süre + atış limiti |

## 3. Run Başlangıcı

- Her tur yeni ve rastgele bir board oluşturulur.
- Başlangıç sürümünde objeler run başlamadan önce yukarıdan sahaya düşer, sekerek zemine yerleşir.
- Objelerin türü ve rarity'si mevcut Loot Quality seviyesine göre belirlenir.
- Oyuncu board'u kısa süre içinde okuyup hangi cluster'lara ve değerli objelere yöneleceğine karar verir.
- Başlangıç hedef değeri prototipte yaklaşık 30 saniye ve 3 atıştır; test sonucuna göre ayarlanır.

## 4. Magnet Shot

Oyuncu mıknatısı geriye doğru sürükleyerek yön ve atış gücü belirler. Bıraktığında mıknatıs belirlenen trajectory boyunca kayar. Duvarlardan sekebilir. Early game'de mıknatıs hareket ederken çekim yapmaz; durduğunda kısa bir magnetic pulse çalışır.

Atış mesafesi başlangıçta sınırlıdır. Launch Distance geliştirmeleri trajectory uzunluğunu artırır.

## 5. Attraction ve Object Weight

Her objenin Weight değeri, mıknatısın Magnet Power değeri vardır. Sistem binary bir "çekebilir / çekemez" kapısı değildir. Ağır objeler düşük Power ile yalnızca belirli bir mesafe mıknatısa doğru sürüklenebilir ve yeni konumlarında kalırlar. Oyuncu sonraki atışlarda mıknatısı tekrar yakına göndererek aynı objeyi kademeli biçimde toplayabilir.

Power yükseldikçe daha önce 3 atışta toplanan ağır bir obje 2, ardından 1 atışta alınabilir. Böylece Power upgrade'i doğrudan oynanışta hissedilir.

## 6. Magnet Load / Ağırlaşma

Toplanan objeler tur boyunca mıknatısa yapışır. Bu objelerin toplam ağırlığı mıknatısın sonraki atış mesafesini ve/veya hareket verimliliğini azaltır. Bu durum oyuncuya bir risk-reward kararı verir: yüksek değerli ağır bir cluster'ı erken toplamak daha çok kazanç sağlar ancak kalan atışları zorlaştırabilir.

Load Efficiency geliştirmesi, taşınan ağırlığın mıknatıs hareketine verdiği cezayı azaltır. İleri milestone'larda küçük objelerin ağırlık etkisi tamamen kaldırılabilir.

## 7. Run Kuralları

- Süre veya atış hakkından hangisi önce biterse run sona erer.
- Kullanılmayan atışlar süre bittiğinde yanar.
- Tüm atışlar erken harcanırsa kalan süre beklenmez.
- Run sonunda board temizlenir; sonraki run yeni RNG board ile başlar.
- Toplanan objeler run sırasında para vermez; tur sonunda toplu payout yapılır.

## 8. Run Sonu / Payout

Tur bittiğinde mıknatısa yapışmış objeler görsel olarak sayılır ve değerleri hesaplanır. Oyuncuya en az toplam para, toplanan obje sayısı ve yeni Collection keşifleri gösterilir. Ardından Upgrade ekranına geçilir ve yeni run hemen başlatılabilir.

## 9. Rarity ve Loot

Her board'un içeriği rastgeledir ancak yüksek rarity objeler erken oyunda hemen görünmez. Loot Quality geliştirmesi daha iyi objelerin spawn ihtimalini artırır; Epic ve Legendary gibi üst rarity katmanları milestone progression ile ayrıca açılabilir.

| Rarity | Örnek Early Game Dağılımı |
|---|---|
| Common | %85 |
| Uncommon | %14 |
| Rare | %1 |
| Epic | Kilitli |
| Legendary | Kilitli |

## 10. Collection

İlk kez toplanan objeler Collection'a kaydedilir. Collection, her bölgenin farklı metal/junk objelerini tamamlama hedefi verir. Değerli objelerin yalnızca renkli rarity çerçevesiyle değil, sprite ve siluetleriyle de daha özel görünmesi hedeflenir.

## 11. Stat Upgrades

- **Magnet Power:** Ağır objeleri daha hızlı ve daha uzağa çeker.
- **Attraction Range:** Mıknatısın pulse alanını genişletir.
- **Launch Distance:** Mıknatısın maksimum atış mesafesini artırır.
- **Load Efficiency:** Toplanan objelerin mıknatısı ağırlaştırma etkisini azaltır.
- **Loot Value:** Tur sonunda objelerin para değerini artırır.
- **Loot Quality:** Daha nadir/değerli objelerin board'da çıkma ihtimalini artırır.

## 12. Gameplay Unlocks / Milestones

- **Moving Attraction:** Early game sonrası açılır. Mıknatıs artık hareket ederken de güzergâhındaki objeleri çekebilir.
- **Live Drops:** Başlangıçta board sabittir. Unlock sonrası run sırasında yeni objeler yukarıdan düşmeye başlar.
- **Time Slow:** Başlangıç özelliği değildir. Unlock sonrası oyuncu aim yaparken dünya/zaman belirli oranda yavaşlar; geliştirilebilir.
- **Extra Shot:** Run başına atış sayısını milestone olarak artırır.
- **Extra Time:** Run süresini milestone olarak artırır.
- **Automation:** İleri oyunda küçük/değersiz objelerin toplanmasını otomatikleştirerek oyuncunun daha büyük hedeflere odaklanmasını sağlar.

## 13. Incremental Tasarım İlkesi

Oyuncu oyunun başında bilinçli olarak kısıtlı ve manuel çalışır. Kısa atış, küçük range, düşük power ve yük altında yavaşlama gibi sorunları bizzat deneyimler. İlerleme boyunca satın aldığı geliştirmeler bu sorunları sırayla çözer. Stat upgrade'leri sürekli küçük güçlenme sağlar; milestone unlock'ları ise oyunun oynanış biçimini değiştirir.

## 14. Önerilen Progression Hissi

Kısa menzilli zayıf magnet → Range/Power → ağır objeleri daha az atışta çekme → Load Efficiency → Launch Distance → Moving Attraction → rotalı/sekme atışları → Live Drops → daha dinamik board → Time Slow → Extra Shot/Time → Automation.

## 15. İlk Oynanabilir Prototip Kapsamı

- 1 sade arena / workshop teması
- Drag-aim-release magnet hareketi
- Duvarlardan sekme
- Mıknatıs durunca attraction pulse
- Object Weight + Magnet Power ve kademeli sürükleme
- Toplanan objelerin mıknatısa yapışması
- Load / ağırlaşma etkisi
- Süre + shot limiti
- RNG board ve temel rarity
- Run sonu payout
- Power, Range, Launch Distance, Load Efficiency, Loot Value ve Loot Quality
- Basit Collection
- Moving Attraction, Live Drops ve Time Slow kilitli olarak gösterilebilir; ilk prototipte uygulanmaları zorunlu değildir.

## 16. Tasarımda Şimdilik Olmayacaklar

Gerçek zamanlı enerji sistemi, reklam zorunluluğu, karmaşık crafting, karakter kontrolü, battle, görev zincirleri, çoklu currency ve başlangıçtan açık otomasyon prototip kapsamına dahil değildir.

## 17. Ana Doğrulama Soruları

- Drag-and-release magnet shot tek başına tekrar tekrar kullanıldığında tatmin edici mi?
- Ağır objeyi birkaç atışta kademeli olarak yaklaştırmak stratejik ve anlaşılır mı?
- Mıknatısa yapışan loot'un ağırlık cezası ilginç karar yaratıyor mu, yoksa oyuncuyu gereksiz cezalandırıyor mu?
- Süre + shot limiti oyuncuyu karar vermeye zorluyor mu, yoksa fazla stres yaratıyor mu?
- Upgrade aldıktan sonra oyuncu farkı görsel ve mekanik olarak hemen hissediyor mu?

---

## Implementasyon Notları (v0.3 prototip)

Bu bölüm GDD'nin üzerine, mevcut kod tabanının GDD'yi nasıl karşıladığını özetler.

### GDD'den bilinçli sapmalar

- **Ekran yönü: portrait (GDD §2 ile aynı).** Bir süre landscape denendi ve geri alındı: oyun menü-ağırlıklı (vardiya 10-30 saniye, ardından rapor → geliştirme → koleksiyon) ve bu ekranların hepsi doğası gereği dikey listeler. Yatayda içeriğe ~300px yükseklik kalıyor ve her şey sıkışıyordu; dikeyde ~800px var ve sorun doğmuyor. Ayrıca tek elle oynanıyor ve telefonu çevirme sürtünmesi ortadan kalkıyor. Arena dikeyde de sorunsuz çünkü fizik en-boy oranından bağımsız: yarıçap ve menziller kısa kenara, hız ve sürtünme köşegene göre ölçekleniyor.

  Oyun sabit ~0.6 en-boy oranlı bir **dikey kolon**: telefonda tam genişlik, masaüstünde ortalanmış ve letterbox'lanmış — böylece tarayıcıda da oynanabilir ve test edilebilir kalıyor. Yatay tutulan telefonlarda "telefonu dik tut" ekranı çıkıyor.
- **Mıknatıs başlangıç konumu her vardiyada rastgele.** Board bu noktanın etrafında bir keepout bırakacak şekilde üretilir; her turun açılış kararı farklı oluyor.
- **Moving Attraction artık temel mekanik, milestone değil (GDD §12'de unlock'tu).** Çekim sürekli ve her karede çalışıyor: mıknatıs havadayken de menzilindeki objeleri sürüklüyor. Pulse modeli (mıknatısın durmasını bekleme) tamamen kaldırıldı. Milestone listesinden çıkarıldı.
- **Tur birimi "vardiya" olarak adlandırıldı.** Hurdalık/atölye temasına "run"dan daha iyi oturuyor; ekran akışı da bunun üzerine kurulu.
- **Başlangıç 1 atış / 10 saniye (GDD §3 "yaklaşık 30 saniye ve 3 atış" diyordu).** Incremental eğrisi daha erken ve daha sert başlasın diye kısıldı; Extra Shot ve Extra Time artık kilitli milestone değil, satın alınabilir geliştirmeler (+1 atış / +2 saniye per seviye) ve ilerlemenin ana ekseni.
- **Nişan mıknatıstan değil, parmağın bastığı noktadan ölçülür.** Mıknatıstan geriye çekmek mobilde duvara sıkışmış mıknatısı o duvara doğru atmayı imkânsız kılıyordu (çekecek yer kalmıyor). Artık drag ekranın herhangi bir yerinden başlatılabilir; yön = basılan nokta − parmağın şu anki yeri. Yan faydası: başparmak mıknatısı kapatmıyor.

### Çekim modeli

Her karede, menzil içindeki her obje `PULL_SPEED × (power / weight) × falloff` hızıyla mıknatısa doğru çekilir; sprite'lar değdiğinde obje toplanır.

- Hafif obje neredeyse anında yapışır; ağır obje mıknatıs yanından geçerken sadece birkaç piksel sürüklenir ve **yeni konumunda kalır** — GDD §5'teki kademeli toplama, mıknatısın durmasını beklemeden.
- Mıknatıs durduğunda çekim devam eder, yani ağır objeler zamanla süzülerek gelir. Bu da süre ile atış hakkı arasında gerçek bir takas yaratır: bekleyip ağırı almak mı, atış harcayıp yeni cluster'a gitmek mi.
- Yakalama kontrolü, objenin **o karede varacağı** mesafeye bakar. Adımı `mesafe - yakalama` ile sınırlamak, objelerin yakalama yarıçapına sonsuza dek yaklaşıp asla tetiklememesine yol açıyordu; bu yüzden objeler mıknatısın dibine gelip orada takılı kalıyordu.

### Vardiya bitiş koşulları

Üçünden hangisi önce olursa: süre dolar, atış hakkı biter (mıknatıs durup çekim de bitince), **veya sahnede obje kalmaz**. Sonuncusunda son toplamanın görülmesi için kısa bir bekleme var.

### Ekran akışı

`Ana Menü → Vardiya intro ("VARDİYA N") → Oyun → Vardiya sonu raporu` döngüsü `src/main.ts` içindeki akış kontrolü ve `src/ui/ui.ts` içindeki ekran yöneticisi ile kurulu.

**Hub:** Geliştirmeler, Koleksiyon ve Ayarlar ayrı modallar değil, altında sekme çubuğu olan tek bir tam ekran hub'ın sekmeleri. Aralarında geçiş tek dokunuş; geri butonu hub'a nereden girildiyse oraya (menü veya vardiya raporu) döner.

**Vardiya raporu:** solda toplanan hurdanın yığın görseli (phyllotaxis spirali, sırayla düşerek), sağda karar için gereken sayılar — toplanan parça, nadir bonusu, kalan süre, kalan atış ve sayarak artan toplam kazanç. Ürün bazlı kırılım katlanır bir bölümde: isteyen açar, istemeyen butonlara doğrudan ulaşır.

**Geliştirme kartları** mevcut değerin yanında satın alınca ne olacağını da gösterir (`7.0 güç → 7.8 güç`). Incremental oyunda alım kararını veren sayı bu. Alınabilir kartlar yeşil kenarlıkla öne çıkar, maksimuma ulaşanlar geri çekilir.

**Koleksiyon** rarity filtreleriyle gezilir (Epik/Efsanevi kilitli sekme olarak görünür — o katmanda henüz parça yok), bir parçaya dokununca ağırlığı ve değeri alttaki detay çubuğunda görünür.

**Ayarlar** bölümlere ayrıldı: Ses (açma/kapama + efekt seviyesi kaydırıcısı), Görüntü (parçacık efektleri), Cihaz (titreşim — yalnızca cihaz destekliyorsa, ana menü, ilerleme sıfırlama). Yalnızca gerçekten çalışan kontroller var; müzik ve dil seçenekleri o sistemler gelmeden eklenmedi.

### HUD yerleşimi

Barlar arenanın **üstünde ve altında ayrı satırlar** olarak durur, sahnenin üzerine binmez: canvas ikisinin arasında kalan alanı alır. Üst bar para/süre/atış ve sağda ayarlar; alt bar taşınan yük, toplanan hurda şeridi ve sağda "Vardiyayı Bitir". Barlar panel açıkken de yerini korur (sadece içerikleri gizlenir), böylece arena hiçbir ekran geçişinde boyut değiştirmez.

### Ses

[ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT, ~1 KB) ile **kodda üretilen** sesler; ses dosyası yok. Tüm presetler `src/audio/sfx.ts` içindeki tek bir bankada duruyor ve sayıları düzenleyerek yeniden akort edilebiliyor — başka hiçbir yer bu sayıları okumuyor.

- Sesler hurdalık temasına göre seçildi: bobin boşalması (atış), metal tokuşması (duvar), tık (toplama), fabrika kornası (vardiya başı), yazarkasa (vardiya sonu).
- Ardışık toplamalar **combo** ile perdeyi kademeli yükseltir (900 ms pencere, 12 adım); toplama serisi liste gibi değil akış gibi hissediliyor.
- Tarayıcılar audio context'i ilk gerçek dokunuşa kadar askıda tutuyor, bu yüzden ilk `pointerdown`/`keydown` onu resume ediyor.
- Ayarlardan açılıp kapatılabiliyor; tercih kayıtta tutuluyor ve **ilerleme sıfırlansa bile korunuyor** (cihaz tercihi, ilerleme değil).

`npm run check:sfx` presetleri offline render edip süre ve seviye raporlar — akort değiştirince dokuzunu tek tek dinlemeden kontrol etmek için. Presetleri doğrudan `sfx.ts`'ten okur, ikinci bir kopya yoktur. Mevcut durum: hepsi duyulabilir genlikte (tepe 0.14–0.27), kırpılmıyor, süreler anlamlı (klik 0.06 sn ↔ korna 1.13 sn).

### Game feel / juice

Referans: Jonasson & Purho, "Juice it or Lose it". `src/render/fx.ts` içinde kısa ömürlü, tamamen kozmetik bir katman var — simülasyona geri beslemesi yok.

- **Toplama:** genişleyen halka + kıvılcım + yukarı süzülen `+değer` yazısı (rarity rengiyle) ve HUD şeridinde nabız.
- **Atış:** mıknatısta hacmi koruyan squash (gidiş ekseninde uzar, dikinde incelir).
- **Duvar:** hıza göre ölçeklenen kıvılcım spreyi ve kısa screen shake. Shake yalnızca sahne içeriğine uygulanır; çerçeve sabit kalır, böylece sarsıntı bay'in kendisini değil içindekileri titretiyor gibi okunur.
- **Vardiya raporu:** satırlar sırayla süzülerek gelir, toplam sıfırdan sayarak artar.
- `prefers-reduced-motion` seçen oyuncularda bu animasyonlar kapanır.

### Sunum kararları

- **Mıknatıs tek sprite, sabit boyut.** Durum bazlı sprite değişimi (idle/active/moving) kaldırıldı; farklı kırpma oranları yüzünden mıknatıs nişan alırken büyüyor gibi görünüyordu.
- **Nişan alırken sonuç gösterilmiyor.** Yörünge tahmini kaldırıldı; sadece lastik bandı, yön oku ve güç yayı var. Sekmeyi okumak oyuncunun işi.
- **Çekim menzili halkası çizilir** — toplama alanını görmek oyuncunun temel karar bilgisi. Nişan alırken güç yayı çizilmez; yön ve güç oktan okunur. Çekilen objelere kesikli bağ çizilir.
- **Zemin kasıtlı olarak düz:** lacivert taban + seyrek yatay çizgiler. Gölge, doku, plaka ve leke yok — sahnedeki en dikkat çekici şeyler loot ve mıknatıs olmalı.
- **Toplanan loot mıknatısın üzerinde değil HUD'da**, tek sıra ve kısa tutulur: en son toplanan birkaç tür gösterilir, gerisi `+N` sayacına düşer. Tam döküm zaten vardiya raporunda. Mıknatısın çevresine dizildiğinde sahneyi kalabalıklaştırıyor ve çekim alanının parçasıymış gibi okunuyordu.
- **Vardiya kartı sahnenin üzerinde açılır.** Arena hafif bir perdenin ardından görünür ve içinde yalnızca mıknatıs vardır; hurda ancak kart kalktıktan sonra düşmeye başlar, böylece oyuncu yazıyı okurken board'un dolmasını kaçırmaz.

### Teknik

- **Stack:** Vite + TypeScript + Canvas2D, framework'süz. DOM tabanlı ekranlar/HUD (`src/ui/`) ve canvas tabanlı arena (`src/render/scene.ts`) ayrı.
- **Ölçekleme:** Tüm yarıçap ve menziller arenanın **kısa** kenarına (`scaleRef`), atış hızı ve sürtünme ise köşegene göre ölçeklenir. Telefon ve masaüstünde his aynı.
- **Kalıcılık:** para, upgrade seviyeleri, koleksiyon ve tamamlanan vardiya sayısı localStorage'da.
- **Assetler:** GDD ile gelen referans sprite sheet'inden otomatik arka plan temizleme + dilimleme ile çıkarılan placeholder'lar. Çalışma anında kurulan asset URL'leri `src/assetPath.ts` içindeki `asset()` yardımcısından geçer (GitHub Pages alt yolu için gerekli).
- **Milestone'lar (Live Drops, Time Slow, Extra Shot, Extra Time, Automation):** henüz fonksiyonel değil, Geliştirme ekranında kilitli liste olarak duruyor. İleride skill tree ekranına taşınabilir.
