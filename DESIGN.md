# Derin Sular — Tasarım Notları

> Çalışan taslak. Kod bu belgeyi takip eder, tersi değil.

## Tek cümlede

Denizin yandan kesitini görüyorsun; suda bir noktaya nişan alıp olta atıyorsun,
bekliyorsun, çıkan balık koleksiyona işlenip otomatik satılıyor, parayla daha
derine inebilen teçhizat alıyorsun.

## Çekirdek döngü

1. **Nişan** — Suda bir noktaya dokunuyorsun. Kısa dokunuş doğrudan atar;
   parmağını basılı tutarsan nişan halkası belirir ve parmağını kaydırarak
   hedefi ayarlarsın. İki jest de parmak kalkınca atışla bitiyor, yani
   öğrenilecek ayrı bir şey yok.
2. **Atış** — Parmağını kaldırdığında olta ekranın dışından bir yay çizerek
   geliyor, şamandıra o noktaya çakılıyor. Kanca seçtiğin derinliğe iniyor.
3. **Bekleyiş** — Rastgele bir süre (temelde 1.5–4 sn). Şamandıra suda
   sallanıyor. Bu ölü zaman değil: birden fazla oltan varsa diğerlerini
   atıyorsun.
4. **Sonuç** — Şamandıra batıyor. Üç ihtimal:
   - **Balık** → yukarı çekiliyor, koleksiyona işleniyor, otomatik satılıyor,
     para geliyor.
   - **Çöp** → para etmiyor ama Temiz Deniz sayacını besliyor.
   - **Boş** → hiçbir şey. Bu, "Yem" yükseltmesine varlık sebebi veriyor.
5. **Harcama** — Parayla teçhizat. Daha derine inebiliyorsun. Başa dön.

## Derinlik = tek ilerleme ekseni

Nişan aldığın nokta **ne kadar derinse balık o kadar değerli**. Karşılığında:

- Misinan yetmiyorsa oraya atamıyorsun (görsel olarak erişilemez bölge karanlık).
- Derin atışta bekleme süresi ve çekme süresi uzuyor.

Bu, dokunduğun noktayı anlamlı kılan şey. Yatay eksen (kıyıdan uzaklık) oyun
mekaniği taşımıyor — sadece sahneyi canlı tutuyor ve oltaların üst üste
binmesini engelliyor.

Derinlik bantları aynı zamanda bölge isimleri oluyor: Sığlık → Kıyı Suları →
Alacakaranlık → Derin Mavi → Uçurum → Hadal Bölge. Her bandın kendi balık
listesi var, bantlar birbirine biraz taşıyor ki geçiş sert olmasın.

## Koleksiyon

Her tür ilk yakalandığında **Balıkçı Defteri**'ne giriyor: o ana kadar siluet
olarak duran sprite'ı açılıyor, sayaç ve ağırlık rekoru tutuluyor. Defter hem "bir tane daha" motoru hem de derinliğe inmenin
görünür kaydı. Tamamlanan bandın kalıcı bir bonus vermesi planlanıyor
(örn. o bantta +%10 değer).

## Yükseltmeler

| Yükseltme | Etkisi | Neyi açar |
|---|---|---|
| Misina | Max derinlik ↑ | Yeni bantlar, yeni balıklar — asıl ilerleme |
| Yem | Isırma şansı ↑, nadir şansı ↑ | Boş dönüşü azaltır |
| Makara | Çekme hızı ↑ | Döngü süresi ↓ |
| Şamandıra | Bekleme süresi ↓ | Döngü süresi ↓ |
| Pazar | Satış fiyatı ↑ | Düz gelir çarpanı |
| Ekstra Olta | Aynı anda 8'e kadar şamandıra | Paralelleşme |
| Otomatik Olta | Son noktaya kendi atıyor | Idle'a geçiş |

Maliyetler üstel (`base × growth^level`), yükseltmeler belirli bir toplam
kazanca ulaşınca panelde beliriyor — ilk ekran kalabalık olmasın diye.

## Otomasyon

"Otomatik Olta" alındığında oltalar son nişan aldığın noktaya kendiliğinden
atılıyor. Oltalar indekslerine göre yayılarak atılır ki şamandıralar üst üste
binmesin. Manuel oynamanın anlamı, ısırma anındaki ×2 bonusu olarak korunuyor
(bkz. "Isırma anı").

## Sahne ve arayüz

Sahnenin tamamı su altı; gökyüzü şeridi çizilmiyor. Oyun su altında geçtiği
için o şerit iş görmüyor ve yatay ekranda en kıt kaynak olan dikey alanı
yiyordu. Su yüzeyi ekranın en üstünde hareketli bir köpük/parlama şeridi
olarak duruyor, olta yine kadraj dışından geliyor.

Teçhizat paneli sürekli açık değil; sağdan (dikey ekranda alttan) gelen bir
sürgü. Sahne her zaman tam ekran. Panelin açma düğmesinde, satın alınabilir
bir yükseltme varsa bir nokta beliriyor — oyuncu paneli boşuna açmasın diye.

## Kapsam dışı (şimdilik)

Prestij / reset katmanı, birden fazla harita bölgesi, tekne, hava durumu,
gece-gündüz. Çekirdek oturduktan sonra konuşulacak.

## Boyut varyasyonu

Her tür bir temel ağırlık taşıyor; yakalanan birey bunun etrafında log-normal
dağılıyor. Satış değeri ağırlıkla ölçekleniyor (`değer × (kg/temel)^1.2`), yani
"4.2 kg Levrek" ile "0.9 kg Levrek" farklı para ediyor. Defter her türün **en
büyüğünü** kaydediyor — bu, zaten yakaladığın bir türü tekrar yakalamaya
sebep veriyor. Temelin 1.8 katını aşan birey "DEV" rozeti alıyor.

## Çöp ve Temiz Deniz

Her atış üç sonuçtan birini veriyor: **balık**, **çöp** ya da **boş**. Çöp
(plastik poşet, konserve, eski çizme, şişe) para etmiyor ama **Temiz Deniz**
sayacını besliyor. Sayaç eşiklere ulaştıkça kalıcı ödüller açılıyor:

| Eşik | Ödül |
|---|---|
| 10 | +%10 satış değeri |
| 40 | Isırma şansı +%8 |
| 120 | Bekleme süresi −%15 |
| 350 | Ekstra olta yuvası |
| 900 | +%50 satış değeri |

Böylece çöp yakalamak "kayıp tur" değil, ikinci bir ilerleme ekseni oluyor.
Nadiren çöp yerine **hazine** (sandık, madeni para) çıkıyor — yüksek değerli
sürpriz.

"Yem" yükseltmesi hem boş dönüşü hem çöp oranını düşürüyor.

## Isırma anı — karar

Balık **kendiliğinden çekiliyor**. Oyuncunun hiçbir şey yapmaması durumunda
balık kaybolmuyor; kaçırmanın cezası yok. Ama ısırma anında ~0.6 saniyelik bir
pencere açılıyor ve o şamandıraya dokunursan yakalanan ×2 ediyor.

Bu, "birden fazla oltaya yetişmek zor olur" endişesini çözüyor: yetişmek zorunda
değilsin. Yetiştiğin her olta bonus, yetişemediğin hiçbir olta kayıp değil.
Otomasyon açıldıktan sonra da manuel oynamanın anlamı bu bonus oluyor —
otomasyon rahatlık satıyor, elle oynamak performans satıyor.

Dokunuş çakışması: dokunduğun noktanın yakınında ısırmış bir şamandıra varsa o
dokunuş "çekme" sayılıyor, yoksa yeni bir nişan başlatıyor.

## Çevrimdışı kazanç

Şimdilik yok. Kayıt dosyasında zaman damgası tutuluyor ki sonradan eklemek
kolay olsun.

---

## Asset stratejisi

Oyun mantığı sprite'ları tanımıyor; her tür yalnızca bir `{sheet, i}` atlas
referansı taşıyor ve bunu render katmanı çözüyor. Atlas değişirse yalnızca
`content.ts` içindeki indeksler değişir.

Kullanılan paket: `fishing_icon_pack_2` — 144 deniz canlısı, 20 obje, 36
teçhizat. Proje sahibi kullanımını onayladı.

Elenen paket: `fishing_free` — non-commercial ve yeniden dağıtımı yasak
olduğu için kullanılmadı.
