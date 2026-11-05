# Kullanıcı hedefi turu brief'i — <GRUP/FAZ>-GOAL-<n>

Rol turu (`exploration-tour.md`) erişim ve kırık akış arar; bu tur bir kullanıcının **gerçek işini** bitirip bitiremediğine bakar. Kural: `method/PRODUCT_LANGUAGE.md`. **Ne zaman:** kullanıcıya görünen bir sonuç (outcome) bittiğinde ve canlı öncesi; UI'a dokunmayan grupta "uygulanmaz: <neden>".

**Mod:** `Mode: slice | outcome`. **outcome:** yukarıdaki gibi, biten bir sonucun tam hedefi. **slice** (`method/SLICE_LANE.md` adım 3b): bir dilimin değiştirdiği kullanıcı davranışı — bir etkilenen profil, gerçek giriş noktasından bir hedef, bir ilgili mutlu-yol-dışı deneme (geri, çift gönderim, geçersiz girdi, yetkisiz rol…), web'de 1280 ve 390; hedef 5–10 dk, 15 dk'da durur ve kapsamı `incomplete` yazar. TAM yalnız değişikliğin ilgilendirdiği profil ve olumsuz durumları ekler. Dilim bitmemiş bir sonucun parçasıysa ulaşılan değişen kısım denenir, kalanı "Not reached"e yazılır. Tur kod incelemesinin yanında koşar; rapor inceleyicinin girdisidir.

**Sınır:** kullanıcı rolüne giren bir ajan faydalı bir ön kontroldür, **gerçek kullanıcı testi DEĞİLDİR**. Bulgular profil varsayımlarını düzeltmek için girdi olur; gerçek kullanımla karşılaştırma ayrıca yapılır (`user-profiles.md`).

## Ajan

- **Temiz bağlam:** ayrı oturum; bu dilimin geliştiricisi ya da kod inceleyicisi değil; tercihen farklı model ailesi.
- **Verilen YALNIZ şunlar:**
  - Profil: `<user_profiles dosyasından ilgili "## Profil: <ad>" bölümü, olduğu gibi>`
  - Hedef: `<tek cümle, kullanıcının kelimeleriyle; ör. "test müşterisine indirimli bir teklif gönder">`
  - Başlangıç bilgisi: `<başlangıç URL'si>`, `<test kullanıcı adı / parola — yalnız sentetik test hesabı>`, `<gereken test verisi, ör. "Deneme Müşteri A">`
- **Verilmeyenler:** kod, dosya yolu, seçici, test adı, dilim dosyası, ekran adı, çözüm adımları, menü yolu. Ajan yolu kendi bulur; takılırsa takıldığı yeri yazar, yardım istemez.

## Güvenli ortam

- Yalnız `127.0.0.1:<app-port>` (ya da sahibin adlandırdığı test ortamı); sentetik veri; kendi worktree'si ve DB'si.
- **Gerçek dış eylem yok:** gerçek kişiye e-posta, SMS, teklif, ödeme, fatura gitmez. Uygulama dış gönderim yapıyorsa koordinatör turdan önce sahte alıcı / yerel posta yakalayıcı / sağlayıcı test modu kurar ve brief'e yazar: `<dış gönderim nereye düşüyor>`.
- Görevi bitirmek dış eylem izni vermez. Bir adım gerçek dış etki doğuracaksa ajan orada durur ve bunu bulgu olarak yazar.
- Erişim ve tarayıcı kuralları `exploration-tour.md` ile aynıdır (sandbox dışı başsız Chrome, uygulama dışı istekler engelli, tur sonunda kapatılır).

## Rapor (önce kullanıcı sonucu, sonra teknik bulgular)

Dosya: `<evidence>/<ID>-GOAL-<n>/report.md` (slice modunda `<evidence>/<SLICE-ID>/tour/report.md`). İlk satır: `GÖREV: TAMAMLANDI | TAMAMLANMADI | KISMEN`. Ardından bağ satırları (`scripts/slice/tour.py check` okur; anahtarlar sabit):

```
FINDINGS: <n>
Mode: slice | outcome
Candidate: <aday-sha> · Base: <taban-sha>
Executor: <model · oturum kimliği>
Environment: <worktree · port · DB / fixture kimliği>
Persona: <profil adı>
Viewports: 1280×800, 390×844 | native: <simülatör / cihaz>
Off-happy-path: <denenen mutlu-yol-dışı adım>
Coverage: complete | incomplete — <ulaşılamayan>
```

1. **Görev sonucu:** tamamlandı mı; adım sayısı ve yaklaşık süre; 1280×800 ve 390×844'te ayrı ayrı.
2. **Takıldığı yerler:** ekran · ne arıyordu · ne gördü · nasıl çıktı (ya da çıkamadı).
3. **Anlaşılmayan metin:** ekrandaki tam ifade · neden anlaşılmadı · profilin kelimesiyle ne beklerdi.
4. **Hedefe hizmet etmeyen öğeler:** süreç/kanıt metni, gereksiz uyarı, ham ajan notu, işle ilgisiz alan.
5. **Bulgular:** takılma, anlaşılmayan metin, hata, kırık bağlantı, yavaşlık, düzen taşması — her biri tek tabloda `T<n>` kimliğiyle: `| id | önem | genişlik | yer | adımlar | beklenen | gerçek | ekran görüntüsü |`. `FINDINGS: <n>` bu tablonun satır sayısıdır, karar değildir. Durumu (`confirmed | needs_validation | rejected`) inceleyici verir.
6. Dış eylem girişimi: `yok | <adım, nerede durdu>`.
7. **Not reached:** ulaşılamayan adım ya da ekran ve neden (`yok` da yazılır).

**Sonra:** koordinatör worktree'nin `git status`'unu doğrular (yalnız kanıt klasörü). **slice modunda** bulgular dilimin güncel inceleme turuna girer (kod bulgularıyla aynı tur; inceleyici durumunu verir, düzeltme aynı dilimde yeniden denenir); ayrı FIX dilimi yalnız açık bir kapsam kararıyla açılır (sahip ya da koordinatör, dilimde kayıtlı). **outcome modunda** bulgular FIX dilimlerine ve gerekiyorsa profil düzeltmesine çevrilir. Rol turları ayrıca sürer.
