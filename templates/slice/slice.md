# <SLICE-ID> — <tek cümlelik görev başlığı>

> Bu dosya ≤150 satır (`wc -l`). Tekrarlayan kuralı yazma; `<invariants-dosyası>` madde numarasına (`I3`) atıf ver. Uzun kanıt `<evidence-dizini>/<SLICE-ID>/` altına gider; burada yalnız bağlantı ve karar için gereken bulgu kalır. 150'yi aşan dilim bölünür.

Durum: TASLAK | GELİŞTİRMEDE | İNCELEMEDE | PASS | REVISE | KAPANDI
İnceleme sınıfı: TAM | HAFİF (gerekçe: <alan: para / yetki-kiracı / durum geçişi / göç / güvenlik ya da hiçbiri>)
Bağımlılık: <önceki dilimler ve durumları; sıcak dosya kilidi varsa `<locks-dosyası>` satırı>
Hat: <hat no> · Port: <port> · Test DB: <lane DB adı, ör. `{{project}}_testing_l<N>`>
Dal / taban: `<dal>` · `<taban-sha>`
Backlog: <B-kimlikleri ya da "yok">
Tarih: <YYYY-MM-DD>

Koordinatör yazar; geliştirici ve inceleyici yalnız okur. Raporlar: `<SLICE-ID>-dev-report.md`, `<SLICE-ID>-review.md`, gerekirse `<SLICE-ID>-review-r2.md`.

## Görev

<Kullanıcıya görünen sonuç, 3–6 cümle: kim, hangi ekranda/uçta, ne yapabilecek. Kararlar D1… ve kaydı. Eski davranıştan bilinçli sapma kanıtıyla tek satır.>

Hedef kullanıcı: <profil> · Bu ekranda yapacağı iş: <görev> (UI'a dokunmuyorsa "UI yok: uygulanmaz"; profil: `slice-method.json` → `user_profiles`; ekran metni kuralı: `method/PRODUCT_LANGUAGE.md` — süreç/kanıt notu ekrana yazılmaz, ham ajan notu gösterilmez)

## Değişmezler

Geçerli: `<invariants-dosyası>` I<n>, I<n> (yalnız dokunulan yüzeye göre). Kural metni burada TEKRARLANMAZ.
Dilime özgü istisna/ek (yoksa "yok"):
- <I<n> ek/istisna: ne, neden, hangi testle sabitlenir>

## Standart uyumu

Tabi kurallar: <S-… kimlikleri; ilgisizleri yazma>
| Kural | Bu dilimde nasıl | Kanıt (test / komut) | İstisna (gerekçe, sahip, kapanış dilimi) |
|---|---|---|---|
| <S-…> | <…> | <…> | <yok> |

Sayaçlar (önce → sonra, artmaz; değeri koordinatör merge'de yazar): `<GATE-X n → n>`. Not dosyası: `<standards-notes-dizini>/<SLICE-ID>.md`.
Yazılmamış istisna = REVISE. Belge kayması: davranış/izin/kapsam değişti mi, hangi belge güncellendi.

## Kabul maddeleri

Numaralı, tek tek sınanabilir: koşul + beklenen gözlem + kanıt (test adı / komut / senaryo adımı) + **kaynak** (sahibin cevap numarası, spec satırı ya da karar; kaynağı olmayan madde yazılmaz, sahibe sorulur). Değişmez testlerini yeniden yazma.

- K1 <…> — kanıt: `<TestAdı::test_…>` — kaynak: <cevap no / spec satırı>
- K2 <…> — kanıt: <…> — kaynak: <…>

Mutasyonlar (TAM: yeni/değişen her kural için 3–5; HAFİF: davranış değişikliği başına bir; inceleyici hepsini yeniden uygular + kendi bir tanesini ekler). Yeni/değişen davranış yoksa "uygulanmaz: <neden>" yaz; inceleyici doğrular:
- M1 <kuralı boz> → <kırmızı olması gereken test>
- M2 <…> → <…>

## Kapsam dışı

- <bilerek yapılmayan; hangi dilime / backlog kimliğine ait>

## İzinli dosyalar

Listede olmayan dosya değiştirilmez. Geliştirici gerekirse DURUR; koordinatör listeyi aşağıdaki "Ekler" bölümüne TARİHLE yazar. Sıcak dosyalar işaretlenir.

- Ürün: `<yol>` (yeni ise: neden)
- Test: `<yol>`
- Belge: `<SLICE-ID>*.md`, `<belge yolu>`
- DOKUNULMAZ: `<yollar>` (ör. sayaç taban dosyası, ana ağaç, başka depo)

**Kullanım taraması (zorunlu, koddan önce):** değişen her paylaşılan bileşen, sınıf, view/lang/config anahtarı, CSS kuralı, JS fonksiyonu için tüm kullanım yerleri. Paket anahtarı değişiyorsa tüketici depolarda da taranır (`<paket-öneki>`).

| Öğe | Komut | Kullanım yerleri | Listede mi / neden dışarıda |
|---|---|---|---|
| <…> | `git grep -n '<…>'` | <dosya:satır> | <…> |

### Ekler (koordinatör, tarihli)

- <YYYY-MM-DD>: <eklenen dosya> — <neden; hangi bulgu/karar>

## Komutlar

Hepsi depo kökünden; kendi worktree, kendi port, kendi DB. Paylaşılan DB ve ana ağacın önizleme portu yasak.

Yığına özgü komutlar `{{…}}` yer tutucularıdır; `slice-method.json` → `stack_profile` doldurur (`stacks/<yığın>/profile.json` kopyası).

- Kırmızı-önce: `{{test_command}} <dilim seçicisi>` yalnız-test commit'inde → beklenen kırmızı
- Dilim testi: `{{test_command}} <dilim seçicisi>`
- Kapı: `scripts/gate.sh <kendi worktree yolu>`
- Standart: `{{standards_check}}` · Statik analiz: `{{static_analysis}}` · Sınır: `{{boundary_check}}`
- Tarayıcı (varsa): `<APP_ORIGIN=http://127.0.0.1:<port> …>`

## Kullanıcı senaryoları (yalnız bu dilimin yeni senaryosu)

Giriş noktası (URL/menü) → eylem → ekranda görülmesi gereken. İnceleyici kullanıcı gibi yürür, 1280 ve 390 px. Dilim UI'a (rota, görünüm/şablon, UI bileşeni) dokunmuyorsa tarayıcı için "uygulanmaz: <neden>" yaz; inceleyici doğrular.

1. <rol> ile <URL> → <eylem> → <beklenen>

## Boyut ve derinlik

- Giriş kartı: `<bağlantı>` · **Yol: native | HAFİF | TAM — <tek cümle gerekçe>** (gerçeklerden, iş adından değil)
- Şekil bütçesi: dosya başına en fazla ~<n> satır; en fazla <n> yeni sınıf; önce yeniden kullanılacaklar: <mevcut yardımcı/sınıf listesi>. Aşılıyorsa geliştirici durur, koordinatöre sorar.
- Boyut: ürün kodu ~<n> satır; paylaşılan bileşen/JS/CSS: var/yok; sıcak dosyalar: <liste/yok>
- **Sınıf: TAM | HAFİF.** TAM = para, yetki/kiracı, durum geçişi, göç, güvenlik ya da sıcak/paylaşılan dosya. HAFİF = test-only, belge, araç, katalog ekranı, çeviri.
- TAM: ayrı oturum + farklı model ailesi (para ve göçte zorunlu, diğer TAM'da önerilir) + kural başına 3–5 mutasyon + UI'a dokunuyorsa gerçek tarayıcı 1280/390 + `templates/review-checklist.md` A–E.
- HAFİF: tek bağımsız inceleme; davranış değişikliği başına bir mutasyon, UI'a dokunuyorsa tarayıcı; aksi halde her biri için gerekçeli "uygulanmaz"; checklist A (+ ilgiliyse B/C). Gerekçeler dev raporuna taşınır ve inceleyici doğrular; uygulanabilir kontrol atlanmaz.
- İKİSİNDE de zorunlu: numaralı K maddeleri, taranmış izinli liste, temiz ağaçta yeniden koşu, bağımsız inceleyici, yeni senaryonun gerçek kanıtı.

## Raporlar ve sonuçlar (kısa)

- Geliştirici: <rapor bağlantısı>; bildirilen komutlar inceleme ÖNCESİ temiz ağaçta yeniden koşulur.
- İlk bağımsız temiz koşu: ağaç `<sha>`, `git status --short` boş; `<kanonik kayıt bağlantısı, çalıştıran koordinatör/inceleyici>`

Komut/sonuç/log tablosunu buraya kopyalama; kaydın aday, main/merge-base, test/standart ve ilgili ortam bağlarına atıf ver. Yeniden kullanım: `method/SLICE_LANE.md` "Evidence validity and reuse"; ilk bağımsız koşu, inceleyicinin hedefli kontrolleri ve TAM/merge kapıları korunur.

- İnceleme: <PASS/REVISE özeti + her zorunlu inceleyicinin güncel kanonik karar bağlantısı>; açık bloklayıcı kimlikleri ≤10 satır; bulguyu yeniden yazma.

## Kapanış notu (koordinatör, ≤10 satır; `templates/closing-note.md`)

- Karar: <PASS özeti> (<her zorunlu inceleyicinin güncel karar bağlantısı>, tur <n>) · Tarih: <YYYY-MM-DD>
- Ürün commit'i: `<sha>` · İncelenen commit: `<sha>` · Merge: `<sha>` (no-ff, sahibin sözüyle / dal politikasıyla)
- Süreler (dk): geliştirme <n> · inceleme <n> · yeniden inceleme <n> (ölçülmediyse "ölçülmedi")
- REVISE turu: <n> · Kaçan hata: <yok | B-kimliği, hangi dilimde bulundu>
- Etiket adayı: evet | hayır (<neden>)
- Ertelenen: <B-kimlikleri> · Temizlik: `git worktree list`, geçici dizinler, lane DB
