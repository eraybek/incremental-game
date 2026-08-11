# Derin Sular — Tasarım Notları

> Çalışan taslak. Kod bu belgeyi takip eder, tersi değil.

## Tek cümlede

Denizin yandan kesitini görüyorsun; suda bir noktaya nişan alıp olta atıyorsun,
bekliyorsun, çıkan balık koleksiyona işlenip otomatik satılıyor, parayla daha
derine inebilen teçhizat alıyorsun.

## Çekirdek döngü

1. **Nişan** — Suda bir noktaya parmağını basılı tutuyorsun. Nişan halkası ~1
   saniyede doluyor. Bu süre boyunca parmağını kaydırarak hedefi
   değiştirebiliyorsun.
2. **Atış** — Bıraktığında olta ekranın dışından bir yay çizerek geliyor,
   şamandıra o noktaya çakılıyor. Kanca seçtiğin derinliğe iniyor.
3. **Bekleyiş** — Rastgele bir süre (temelde 1.5–4 sn). Şamandıra suda
   sallanıyor. Bu ölü zaman değil: birden fazla oltan varsa diğerlerini
   atıyorsun.
4. **Sonuç** — Şamandıra batıyor. İki ihtimal:
   - **Balık** → yukarı çekiliyor, koleksiyona işleniyor, otomatik satılıyor,
     para geliyor.
   - **Boş / çöp** → hiçbir şey ya da plastik poşet (asset'te var). Bu, "Yem"
     yükseltmesine varlık sebebi veriyor.
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

Her tür ilk yakalandığında **Balıkçı Defteri**'ne giriyor: sprite'ı açılıyor,
sayaç tutuluyor. Defter hem "bir tane daha" motoru hem de derinliğe inmenin
görünür kaydı. Tamamlanan bandın kalıcı bir bonus vermesi planlanıyor
(örn. o bantta +%10 değer).

## Yükseltmeler

| Yükseltme | Etkisi | Neyi açar |
|---|---|---|
| Misina | Max derinlik ↑ | Yeni bantlar, yeni balıklar — asıl ilerleme |
| Yem | Isırma şansı ↑, nadir şansı ↑ | Boş dönüşü azaltır |
| Makara | Çekme hızı ↑ | Döngü süresi ↓ |
| Şamandıra | Bekleme süresi ↓ | Döngü süresi ↓ |
| Kol | Nişan süresi ↓ | Döngü süresi ↓ |
| Pazar | Satış fiyatı ↑ | Düz gelir çarpanı |
| Ekstra Olta | Aynı anda 2–4 şamandıra | Paralelleşme |
| Otomatik Olta | Son noktaya kendi atıyor | Idle'a geçiş |

Maliyetler üstel (`base × growth^level`), yükseltmeler belirli bir toplam
kazanca ulaşınca panelde beliriyor — ilk ekran kalabalık olmasın diye.

## Otomasyon

"Otomatik Olta" alındığında oltalar son nişan aldığın noktaya kendiliğinden
atılıyor. Manuel oynamanın anlamını korumak için manuel atışın küçük bir
avantajı olması gerekiyor (bkz. açık sorular).

## Kapsam dışı (şimdilik)

Prestij / reset katmanı, birden fazla harita bölgesi, tekne, hava durumu,
gece-gündüz. Çekirdek oturduktan sonra konuşulacak.

---

## Açık sorular

1. **Boyut varyasyonu** — Aynı türün farklı ağırlıklarda çıkması (ör. "4.2 kg
   Levrek", değeri ağırlıkla çarpılıyor, defter en büyüğünü kaydediyor).
   Çok ucuz ama koleksiyona ciddi derinlik katıyor. Var mı, yok mu?
2. **Çöp** — Plastik poşet sadece boş dönüş mü, yoksa satılabilir mi / bir
   "temiz deniz" sayacı mı besliyor?
3. **Manuel avantajı** — Otomasyon açıldıktan sonra elle atmak neden değerli
   olsun? (öneri: elle atışta ısırma anında dokunursan ×2 bonus)
4. **Isırma anı** — Şamandıra battığında oyuncunun tepki vermesi gerekiyor mu,
   yoksa balık kendiliğinden mi çekiliyor? Senin anlattığın akışta
   kendiliğinden anlıyorum; onaylar mısın?
5. **Çevrimdışı kazanç** — Kapalıyken üretim olsun mu? (öneri: sınırlı, tavanlı)

## Asset lisansı

`fishing_free` paketi **non-commercial** ve yeniden dağıtımı yasak. Prototipte
kullanılabilir; ticarileşme ihtimalinde sprite'lar değiştirilmeli ve pakette
repoya commit'lenmemeli.
