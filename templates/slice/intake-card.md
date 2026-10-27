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

**Karar satırı (işe başlamadan önce, sahip görebilsin):**

`Yol: native | HAFİF | TAM — <gerçeklere dayanan tek cümle>`

**Sonda:** birleşmeden önce gerçek diff aynı gerçeklerle yeniden sınıflanır (checklist A7). Diff daha ağır bir yol
gerektiriyorsa iş durur ve yeniden yönlendirilir. Ağır yolda önemsiz bir diff ise gereksiz ritüel olarak not edilir.
İki durum da kayda geçer.
