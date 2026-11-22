# Giriş kartı — <iş kimliği>

İşe başlamadan önce doldurulur. Yalnız gerçekler; öneri ya da yorum yazılmaz. Yol, gerçeklerden yönlendirme tablosuyla
çıkar (`method/SLICE_LANE.md`, "Sizing from the diff, not the name"). İş adı boyut kanıtı değildir.

| # | Gerçek | Cevap | Kanıt |
|---|---|---|---|
| G1 | Beklenen dosyalar ve klasörler | <liste, ~sayı> | `git grep` / yol listesi |
| G2 | Para (tutar, ödeme, iade, fatura, kredi) | evet / hayır | <dosya ya da gerekçe> |
| G3 | Yetki, rol, kiracı (rota, politika, kapı, middleware, sorgu kapsamı) | evet / hayır | <…> |
| G4 | Kişisel veri, token, kimlik bilgisi, dışa aktarım | evet / hayır | <…> |
| G5 | Şema/migration, kilit, yarış testi yolu, kuyruk | evet / hayır | <…> |
| G6 | Geri alınabilir, tek yüzeyli değişiklik (tek ekran/bileşen/belge) | evet / hayır | <…> |

**Yönlendirme tablosu**

| Koşul | Yol |
|---|---|
| G2–G5'ten herhangi biri "evet" | **TAM** |
| G2–G5 hepsi "hayır", G6 "evet" ve G1 küçük (yaklaşık ≤3 dosya) | **native** (dilim yok, ACEF durumu yok, yalnız odaklı doğrulama) |
| Diğer her durum | **HAFİF** |

Proje kendi eşiklerini ve risk yollarını teknoloji yığını profilinde tutar (`stacks/<stack>/`).

**Bilinen tuzaklar (koordinatör, karardan önce):** `acef-note search --tags <G2–G5'ten çıkan mod etiketleri> --text "<G1 yolları / iş özeti>" --limit 5`
(merkezi geri bildirim günlüğü, `method/FEEDBACK_LOOP.md`). Çıkan kimlikler tek satır olarak dilime yazılır; kural ya da
betiğe dönüşmüş dersler listede çıkmaz.

`Bilinen tuzaklar: <kimlikler | yok> @<acef-note version çıktısı>`

**Hedef kullanıcı (koordinatör; G6 ya da G1 bir ekrana, görünüme ya da UI metnine dokunuyorsa):** profil hostun
`user_profiles` dosyasından (`slice-method.json`), görev o profilin "Geldiği iş" listesinden. UI'a dokunmuyorsa
"UI yok: uygulanmaz". Kural: `method/PRODUCT_LANGUAGE.md`.

`Hedef kullanıcı: <profil> · Bu ekranda yapacağı iş: <görev>`

**Model (koordinatör, ajan başına; `method/MODEL_CHOICE.md`):** sınıf işten seçilir, diff boyutundan değil; projenin
kayıtlı kararı varsayılanı geçer.

`Model: <sınıf> → <model> (MODEL_CHOICE.md) · Effort: <low | medium | high>` (geliştirici ve inceleyici için ayrı satır)

**Sahiplik (koordinatör, geliştirme başlamadan önce; R-4):** iş, hostun tek ortak yerinde (ör. merge-queue ya da plan
satırı) bu koordinatör adına işaretlenir. `route.py card <kart> --work-id <iş kimliği>` aynı kimliği taşıyan
dal ya da worktree bulursa CLAIMED ile durur; `gh pr list --search <iş kimliği>` açık PR gösterirse de durulur. İkinci
oturum başlamaz, sahibe sorar. İş ortak bir kimlik aralığı ayırıyorsa (batch numarası, migration satır id'si ve
benzeri; 2026-11-22) o aralık da aynı yerde sahiplenilir: en büyük kullanılmış değer ayırma anında okunur ve ayrılan
aralık satıra yazılır; aynı aralığı ayırmış başka bir satır görülürse durulur.

`Sahiplik: <ortak yer + satır> · <koordinatör adı> · dal/PR denetimi temiz · Kimlik aralığı: <aralık + okunan en büyük | yok>`

**Değişmez (koordinatör; karar bir değişmez kuruyorsa: "asla", "X varken Y yok", "her çağıran", "son X", kilit
sırası, tarayıcı ya da koruma kuralı; 2026-11-22):** dev brief'ten önce sınıfın tamamı listelenir: her yazan, oluşturan,
yol ya da girdi sınıfı bir satır, `dosya:satır` ve onu sabitleyen test ile. `route.py card`, `Değişmez: evet` diyen
kartı her satırı `dosya:satır` taşıyan bir envanter olmadan reddeder. Tarayıcı ya da koruma kuralında
(`evet, tarayıcı`) negatif korpus round 1'de commit edilir.

`Değişmez: <evet | evet, tarayıcı | hayır>`

Envanter (yalnız `Değişmez: evet`):

| Yazan / yol / girdi sınıfı | Dosya:satır | Sabitleyen test |
|---|---|---|
| <…> | <dosya:satır> | <test ya da "round 1'de yazılır"> |

`Negatif korpus: <yol | uygulanmaz>` (yalnız tarayıcı ya da koruma kuralı)

**Karar satırı (işe başlamadan önce, sahip görebilsin):**

`Yol: native | HAFİF | TAM — <gerçeklere dayanan tek cümle>`

**Sonda:** birleşmeden önce gerçek diff aynı gerçeklerle yeniden sınıflanır (checklist A7). Diff daha ağır bir yol
gerektiriyorsa iş durur ve yeniden yönlendirilir. Ağır yolda önemsiz bir diff ise gereksiz ritüel olarak not edilir.
İki durum da kayda geçer.
