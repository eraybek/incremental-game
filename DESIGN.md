# Derin Sular — Tasarım Notları

> Çalışan taslak. Kod bu belgeyi takip eder, tersi değil.
> v2 — çekirdek mekanik "sabit derinliğe at, bekle"den, geçen balığı **zamanla
> ve kap** (Gold Miner mantığı) mekaniğine taşındı. Gerekçeler en altta
> "v1'den ne değişti" başlığında.

## Tek cümlede

Teknenden aşağı bir kanca sarkıtıyorsun; balıklar denizin kesitinde şeritler
halinde geçiyor; doğru anı yakalayıp geçen balığı kancalıyorsun, yukarı çekip
satıyorsun, parayla daha derine inen ve giderek kendi kendine avlanan teçhizat
alıyorsun. Aktif oynamak hızlandırır, bıraktığında kendi kendine ilerler.

## Tür ve his

Bu bir **idle incremental** — kimliği bu. Oyun sen bakmasan da ilerler,
çevrimdışı kazanç verir, sayılar büyür. Üstüne **Gold Miner'ın zamanlama
hazzını** koyuyoruz: elle oynadığında geçen balığı doğru anda kapmak beceri
ister ve daha çok kazandırır. İki katman çatışmaz; aktif oyun, idle tabanın
üstüne binen bir çarpandır (bkz. "Tempo").

Kısacası: **idle taban + aktif çarpan.** Tasarımın her kararı bu cümleye
hizmet etmeli. Bir mekanik idle oyuncuyu cezalandırıyorsa ya da aktif oyuncuya
yapacak anlamlı şey bırakmıyorsa yanlıştır.

## Çekirdek mekanik: kanca

### Balık şeritleri

Balıklar sahnede **yatay şeritlerde** yüzüp geçer. Şerit ne kadar derinse balık
o kadar değerli, o kadar hızlı ve o kadar seyrek geçer. Bu, `scene.ts`'deki
dekoratif balıkların oyunlaştırılmış hâli — artık dekor değil, hedefler.

Her şerit bir derinlik bandına denk gelir (Sığlık → Hadal). Bir bantta o
bandın balıkları, ağırlıklarına (`weight`) göre karışık geçer; bandın belirgin
nadir türü seyrek görünür — onu geçerken yakalamak "an"ı yaratan şey.

### Nişan ve bırakma

Kanca teknenin altında asılı durur; **sabit, dümdüz aşağı** iner. Zamanlama
kancadan değil, **balığın hareketinden** gelir: doğru balık kancanın hizasına
geldiği anda bırakırsın.

- **Nişan derinliği:** Parmağını dikey kaydırarak kancanın ineceği derinliği
  seçersin (misinanın izin verdiği kadar). Yatay konum tekneye/oltaya bağlı,
  sabit bir dikey hat.
- **Bırakma:** Dokunduğunda kanca o hat boyunca hedef derinliğe fırlar. Yolu
  üstünde (hattın geçtiği şeritlerde) bir balık varsa ona çarpıp kancalar.
- **Isabet penceresi:** Balık kancanın hattından geçerken ~0.3–0.6 sn'lik bir
  pencere açıktır; o pencerede bırakırsan yakalarsın. Tam ortasında yakalarsan
  "isabetli" sayılır (bkz. Tempo, ×2).

> **Değiştirilebilir karar:** Kanca sabit-dikey iniyor, balıklar yatay geçiyor.
> Alternatif, Gold Miner'ın birebir kopyası: kancayı sarkaç gibi sallandırıp
> açıyı zamanlamak. Balıkçı temasına dikey-hat + geçen balık daha doğal oturdu
> ve mobil dokunmaya daha yakın; ama sallanan kanca istenirse buraya döner.

### Kancalama ve çekme

Kanca bir şeye takıldığında yukarı sarılır. **Ağır olan yavaş gelir** (Gold
Miner'ın nugget'ı gibi) — bu, "hangi balığa gideyim" kararına ağırlık katar:
büyük bir orkinos çok para eder ama çekerken oltanı uzun süre meşgul eder, o
sırada başka balık kaçar. Boş kanca hızlı geri gelir.

Çekiş bitince balık koleksiyona işlenir ve otomatik satılır; para gelir. Olta
tekrar boşa (idle) döner.

## Derinlik = hedef ekseni (sürgü değil)

**En önemli değişiklik.** v1'de derinlik "sonuna kadar aç" denen bir sürgüydü;
her zaman en derine nişan almak optimaldi, o yüzden karar diye bir şey yoktu
(simülasyon: derin nişan her senaryoda değer/saniye'yi domine ediyordu).

Artık derinlik bir **hedef seçimi**: dipte pahalı balık *var* ama oraya bir
balık geçerken denk getirmen, uzun çekişi göze alman ve o sırada sığdaki kolay
balıkları feda etmen gerekir. Yani:

- Sığ şerit: sık, ucuz, hızlı çekiş → yüksek hacim, düşük birim değer.
- Derin şerit: seyrek, pahalı, yavaş çekiş → düşük hacim, yüksek birim değer.

Bu bir **gerçek denge kararı** yaratır; tek bir optimal derinlik yoktur, an'a
bağlıdır. Misina hâlâ ilerleme kapısı (daha derin = yeni türler) ama artık
"otomatik kazanan sürgü" değil.

## Odak sistemi — bir el, çok olta

Oltayı/tekneyi çoğaltmak istiyoruz (paralel gelir), ama oyuncu 8 tekneyi tek tek
kontrol edemez. Çözüm: **oyuncu tekneleri değil, tek bir "odak"ı yönetir.**

- Her an **tek bir olta odaktadır** — en son dokunduğun/kaydırdığın olta. Manuel
  avantajlar (derinlik nişanı, isabet, ×2, seri katkısı) yalnızca odaktaki
  oltaya işler.
- Diğer tüm oltalar **otomatik** çalışır: son ortak nişan noktasına atıp geçen
  ortalama balığı kapar. Bu idle tabanı üretir.
- Odağını istediğin oltaya "zıplatırsın" (dokunarak). Dipten nadir bir balık
  geçiyorsa oraya odaklan, kap, sonra başka oltaya geç.

Sonuç: **manuel iş yükü tekne sayısından bağımsız, sabit.** 1 olta da olsan 20
olta da olsan aynı anda tek bir şeyle ilgilenirsin. Tekne artışı yalnızca idle
tabanı büyütür ve odaklanacak fırsatları çoğaltır — kontrol karmaşası olmaz.

## Tempo (seri) — idle üstüne aktif çarpan

Odak tek oltayı hızlandırır; peki elle oynamak *bütün filoyu* neden etkilesin?
**Seri** bunun için:

- Her isabetli manuel yakalayış **seri barını** doldurur; bar bir **genel
  çarpan** verir (tüm oltaların satışına biner).
- Bar zamanla düşer: oynamayı bırakırsan birkaç saniyede **×1.0'a** iner.
- Tavan **ölçülü**: temel tasarım ×1 → ×3. Yükseltmelerle biraz açılabilir
  (bkz. Yükseltmeler → "Usta Balıkçı").

Böylece: **oynarsan tüm filo hızlanır, bırakırsan sorunsuz idle'a döner.**
Manuel oyun hiçbir zaman "gereksiz" değil, hep bir üst vites — ama idle oyuncu
da geride kalmış hissetmez çünkü çarpan ölçülü.

> **Değiştirilebilir karar:** Seri tavanı ×3 (ölçülü — idle dostu). Agresif
> istenirse (×10+) aktif oyuncu çok öne geçer; ama bu, idle kimliğini zayıflatır.
> Varsayılan ölçülü; tek sayı değiştirilerek ayarlanır.

## Manuel → idle → yine manuel yayı

Oyunun ömrü boyunca his böyle akar:

1. **Açılış (saf manuel).** Tek olta, otomasyon yok. Şeritleri, isabet
   penceresini, ağır balığın çekiş bedelini öğrenirsin. Gold Miner hissi en
   yoğun burada.
2. **İlk otomasyon.** "Otomatik Olta" açılınca odakta olmayan oltalar kendi
   atmaya başlar. Oyun burada idle'a kayar; artık bıraksan da ilerler.
3. **Filo büyür.** Ekstra oltalarla idle taban büyür; sen "odak zıplatma" ile
   büyükleri toplamaya devam edersin. Seri ile aktif seanslar tabanı kaldırır.
4. **Olgun oyun.** Elini çekersen tamamen idle + çevrimdışı kazanç ilerletir.
   Ama 2-3 dakikalık aktif "seri koşusu" (filoyu odakla besleyip tempoyu yüksek
   tutmak) saf idle'ın belirgin üstünde kazandırır.

İki oyuncu tipi de kazanır: "bıraktım gene ilerliyor" da, "oturup oynayacağım"
da. Çatışmazlar.

## Otomasyon detayları

- Otomatik oltalar **son ortak nişan noktasına** atar. Oltalar indekslerine göre
  hafifçe yayılır ki hatlar/şamandıralar üst üste binmesin.
- Otomatik yakalayış **isabet bonusu almaz** (×2 yok) ve **seriye katkı vermez**
  — bunlar manuel oyunun ödülü olarak korunur. Otomatik, o şeritteki ortalama
  balığı ortalama değerle alır.
- Otomasyon hızı ("Otomatik Olta" seviyesi) idle gelirin ana kolu.

## Çevrimdışı kazanç

Idle oyunun olmazsa olmazı. Kayıtta zaman damgası zaten var. Kapalı geçen süre
için:

- Kazanç = (otomatik olta throughput'u) × (kapanışta erişilen ortalama şerit
  değeri) × süre, bir **verim katsayısıyla** (örn. %50) — "izlemeden kazanç,
  izleyerek kazançtan az" hissi için.
- Bir **tavan** (örn. 8–12 saat) ki oyun tamamen kendi kendine bitmesin;
  dönmek için sebep kalsın.
- Dönüşte "yokken şu kadar kazandın" özeti — küçük ama önemli bir geri dönüş
  kancası.

## Yükseltmeler

v1'deki yükseltmelerin hepsi pasif oran artışıydı. Yeni kurgu bunları **aktif**
ve **idle** olarak ikiye ayırır — böylece hem oynayan hem bırakan oyuncunun
harcayacağı anlamlı şeyler olur.

### İdle kolu (bıraktığında çalışır)

| Yükseltme | Etkisi | Rolü |
|---|---|---|
| Misina | Max derinlik ↑ | Yeni şeritler/türler açar — asıl ilerleme kapısı |
| Ekstra Olta | Aynı anda daha çok olta | Paralel idle taban |
| Otomatik Olta | Otomatik atış hızı ↑ | Idle throughput'un ana kolu |
| Pazarlık | Satış fiyatı ↑ | Düz gelir çarpanı |
| Çevrimdışı Verim | Kapalı kazanç katsayısı ↑ | Uzun aralar için |

### Aktif kol (elle oynarken parlar)

| Yükseltme | Etkisi | Rolü |
|---|---|---|
| Kanca Hızı | Kanca daha hızlı iner/sarılır | Manuel döngü süresi ↓ |
| Kapma Yarıçapı | İsabet penceresi/çarpma alanı ↑ | Zamanlamayı affeder, erişilebilirlik |
| Zamanı Yavaşlat | Nişan alırken balıklar ağırlaşır | Gold Miner "odak" anı; derin hedefleme |
| Usta Balıkçı | Seri tavanı ve isabet ×'i ↑ | Aktif tavanı yükseltir |
| Yem | Balık yoğunluğu / nadir şansı ↑ | Hem şeritleri doldurur hem manuel fırsat |

Maliyetler üstel (`base × growth^level`), yükseltmeler belirli toplam kazanca
ulaşınca panelde belirir (ilk ekran kalabalık olmasın). **Seviye sayıları
gerçekten anlamlı olmalı** — v1'de Misina'nın 120 seviyesi vardı ama 27'de tüm
bölgeler bitiyordu (~90 ölü seviye). Yeni kural: bir yükseltmenin max seviyesi,
son seviyesi hâlâ hissedilir bir fark yaratacak kadar olmalı.

## Değer eğrisi ve denge

v1 simülasyonunda bölge geçişlerinde ortalama balık değeri **×49–×72** sıçrıyordu
(lvl 6→7 ×50, 11→12 ×72, 20→21 ×49). Bu "whiplash" yaratıyor: yeni bant açılınca
gelir patlıyor, önceki her yükseltme bir anda çöp oluyor, sonra yeni platoda
bekleniyor.

Hedef: **bant-içi ve bant-arası değer artışı pürüzsüz olsun.** Kaba kural,
erişilen ortalama balık değeri ~sabit bir çarpanla (örn. bant başına ×6–×10,
bant içinde kademeli) büyüsün; tek bir türün değeri komşusunun 50 katı olmasın.
Balık tablosu buna göre yeniden ölçeklenecek (yapı aynı kalır, sayılar
yumuşatılır).

Kabaca tempo hedefleri (denge testinde doğrulanacak):

- İlk yükseltme: ilk ~30–60 sn içinde alınabilsin.
- İlk bant geçişi (Sığlık→Kıyı): ilk birkaç dakika.
- İlk otomasyon (idle'a geçiş): ilk oturumun sonuna doğru (~15–25 dk aktif).
- Sonraki her bant: bir öncekinden hissedilir ama üstel şekilde uzayan sürede.

## Koleksiyon / Balıkçı Defteri

Korunuyor. Her tür ilk yakalandığında deftere girer; siluet açılır, sayaç ve
ağırlık rekoru tutulur. Bant tamamlanınca kalıcı bonus (o bantta +%10 değer).
Yeni mekanikte defter ekstra anlam kazanır: bir türü "görmek" (şeritte geçerken)
ile "yakalamak" ayrışır — nadir türü geçerken avlamak bir başarı anı olur.

Boyut varyasyonu (log-normal ağırlık, DEV rozeti) ve rekor-avı korunuyor.

## Çöp ve Temiz Deniz

Korunuyor ve yeni mekaniğe iyi oturuyor: kanca şerit yerine çöpe denk gelirse
para etmez ama **Temiz Deniz** sayacını besler; eşiklerde kalıcı ödüller açılır
(ikinci ilerleme ekseni). Nadiren çöp yerine hazine çıkar (yüksek değerli
sürpriz). Böylece "ıskaladın ama çöp kaptın" turu bile bir eksene yazılır.

## Kapsam dışı (şimdilik)

Prestij / reset katmanı, birden fazla harita/deniz, tekne görsel yükseltmeleri,
hava/gece-gündüz. Çekirdek (kanca + odak + seri + idle) oturduktan sonra
konuşulacak. Prestij, idle incremental'ın doğal uzun-vade katmanı olduğu için
muhtemelen ilk eklenecek şey.

---

## v1'den ne değişti ve neden

- **"Sabit derinliğe at, bekle" → "geçeni zamanla, kap".** v1'de nişan noktası
  statikti ve değer/saniye analizi her zaman en derini seçmeyi söylüyordu; karar
  yoktu. Geçen balığı yakalamak, an'a bağlı gerçek bir zamanlama kararı getirir
  (Gold Miner hazzı).
- **Derinlik: sürgü → hedef ekseni.** Artık "sonuna kadar aç" optimal değil;
  derin balık pahalı ama seyrek, yavaş çekişli ve sığdaki hacmi feda ettirir.
- **Çok olta: mikro-yönetim → odak sistemi.** Oyuncu tekneleri değil tek bir
  odağı + bir tempoyu yönetir; iş yükü tekne sayısından bağımsız sabit kalır.
- **Manuel/idle uzlaşması: seri çarpanı.** Aktif oyun idle tabanın üstüne
  ölçülü bir çarpan bindirir; bırakınca sorunsuz idle'a döner. Manuel hep bir
  üst vites, idle hiç cezalandırılmaz.
- **Yükseltmeler: hepsi pasif → aktif/idle ikili kolu.** Hem oynayanın hem
  bırakanın harcayacağı anlamlı şeyler olur; ölü seviye bırakılmaz.
- **Değer eğrisi: ×50–×72 sıçramalar → pürüzsüz büyüme.** Whiplash yerine
  kademeli, tatmin edici artış.
