# Kullanıcı profilleri — <uygulama>

Bu şablonun host kopyası hostta durur (ör. `docs/product/users.md`); yolu `slice-method.json` → `user_profiles` verir. Kural: `method/PRODUCT_LANGUAGE.md`. Koordinatör UI'a dokunan her işte buradan `Hedef kullanıcı: <profil> · Bu ekranda yapacağı iş: <görev>` satırını doldurur.

- **Profiller varsayımdır.** Her profilin "Son gerçek kullanımla karşılaştırma" satırı vardır; gerçek kullanım (görüşme, destek kaydı, kullanım verisi, sahibin gözlemi) farklı çıkarsa profil düzeltilir ve tarih güncellenir. Hiç karşılaştırılmadıysa "henüz yok" yazılır.
- **Profil yetki rolü değildir.** Aynı satış temsilcisi farklı izinlere sahip olabilir; erişim testleri (rol turları, D3/D7) ile kullanılabilirlik kontrolleri birbirinin yerini tutmaz. Rol adı yalnız bilgi olarak yazılır.
- Bir host birden çok profil tanımlayabilir. Her profil `## Profil: <ad>` başlığıyla başlar; başlık altındaki alt başlıklar aşağıdaki sırayla ve aynı adla kalır (`scripts/slice/ui-copy-hints.py` "Kafa karıştırabilecek terimler" listesini bu başlıktan okur, satır başına bir terim).

---

## Profil: <ad, ör. saha satış temsilcisi>

Son gerçek kullanımla karşılaştırma: <YYYY-MM-DD, kaynak | henüz yok>
Tipik yetki rolleri (bilgi; profil değildir): <rol adları>

### Kim

<1–3 cümle: işi, ekranı ne sıklıkla açtığı, işin içindeki yeri.>

### Geldiği iş (en sık görevler)

1. <ör. müşteriye indirimli teklif göndermek>
2. <…>
3. <…>

### Bildikleri

<Alan bilgisi, kullandığı diğer araçlar; neyi bilmediği (ör. sistemin iç durum adları, onay akışının teknik adı).>

### Kullandığı kelimeler

<Kendi işini anlatırken kullandığı terimler, ör. "teklif", "iskonto", "müşteri", "onaya gönder".>

### Kafa karıştırabilecek terimler

İnceleme ipucudur, yasak listesi DEĞİLDİR: bağlamında doğru kelime kalır (ör. "kayıt" bir üyelik formunda doğrudur). Satır başına bir terim:

- <ör. kaynak dayanaklı>
- <ör. teyitsiz>
- <ör. UNKNOWN>
- <ör. senkronizasyon>

### Cihaz ve bağlam

<Masaüstü / telefon / tablet; sahada, müşterinin yanında, gürültülü ortam, kötü bağlantı; ekranı kaç dakika kullanır.>

### İhtiyaçları

<Hız, mobil, az metin, büyük dokunma alanı, tek elle kullanım, yazdırma; neyin onu yavaşlattığı.>
