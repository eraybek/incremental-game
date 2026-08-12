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

## Implementasyon Notları (v0.2 prototip)

Bu bölüm GDD'nin üzerine, mevcut kod tabanının GDD'yi nasıl karşıladığını özetler.

### GDD'den bilinçli sapmalar

- **Ekran yönü: landscape (GDD §2 portrait diyor).** Oyun yatay ekran için tasarlandı. Gerekçe: mıknatısın atış menzili sahayı bir sekmeyle geçebilecek kadar uzun, ve geniş board hem cluster okumayı hem de sekmeli atış planlamayı çok daha iyi gösteriyor. Portrait telefonlarda "telefonu yatay çevir" ekranı gösteriliyor.
- **Mıknatıs başlangıç konumu rastgele (GDD sabit bir başlangıç varsaymıyordu ama prototip alt-orta kullanıyordu).** Her run mıknatıs sahada rastgele bir noktada başlar; board bu noktanın etrafında bir keepout bırakacak şekilde üretilir. Bu, her turun açılış kararını farklılaştırıyor.

### Teknik

- **Stack:** Vite + TypeScript + Canvas2D, framework'süz. DOM tabanlı HUD/modal'lar (`src/ui/hud.ts`) ve canvas tabanlı oyun sahnesi (`src/render/scene.ts`) ayrılmıştır.
- **Fizik:** `src/game/magnet.ts` — impulse launch + sürtünme ile yavaşlama + duvar sekmesi. `stepBody()` hem canlı mıknatıs hem de nişan önizlemesi tarafından paylaşılır, böylece gösterilen yörünge gerçek yörüngedir (sekmeler dahil).
- **Ölçekleme:** Tüm yarıçap ve menziller arenanın **kısa** kenarına (`scaleRef`), atış hızı ve sürtünme ise köşegene göre ölçeklenir. Böylece oyun 844×390 telefonda da 1280×720 masaüstünde de aynı hissi verir.
- **Çekim:** `src/game/run.ts` `doPulse()` — `requiredPulses = ceil(weight / power)` formülü ile GDD §5'teki kademeli çekimi birebir uygular. Kaldırılamayan obje mesafenin `1/required` kadarını kat eder ve yeni yerinde kalır.
- **Load:** Taşınan objelerin toplam ağırlığı sonraki atışın hızını `loadPenalty()` ile azaltır; HUD'da yüzde olarak canlı gösterilir. Load Efficiency upgrade'i bu cezayı düşürür.
- **Rarity/Loot Quality:** `src/game/board.ts` `pickRarity()` — Loot Quality seviyesi arttıkça uncommon/rare ihtimali kayar (GDD §9).
- **Milestone'lar (Moving Attraction, Live Drops, Time Slow, Extra Shot, Extra Time, Automation):** GDD §15'e göre ilk prototipte zorunlu değil; Upgrade ekranında kilitli/pasif liste olarak gösteriliyor, henüz fonksiyonel değil.
- **Assetler:** `public/assets/` altında GDD ile birlikte gelen referans sprite sheet'inden otomatik arka plan temizleme + dilimleme ile çıkarılan placeholder sprite'lar kullanılıyor. Nihai/onaylı asset paketi geldiğinde bu klasörlerin içeriği değiştirilebilir; kod dosya yollarına göre çalıştığı için çoğu değişiklik sadece asset dosyalarının üzerine yazılmasını gerektirir.
- **Arka plan:** Sprite sheet'te hazır bir zemin tile'ı tekrarlamak yerine sahne prosedürel çiziliyor — koyu çelik gradient, geniş zemin plakaları, düşük opaklıkta taş grain, yağ lekeleri, tavan ışığı ve vignette. Amaç collectible'ların sahnedeki en parlak şey olarak kalması.
