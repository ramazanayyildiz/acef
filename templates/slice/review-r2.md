# <SLICE-ID> — hedefli yeniden inceleme (r<n>)

Review scope: <narrow | full> — <gerekçe>
Reviewer session: <same — <oturum> | fresh — session gone: <neden>>
Yol: <native | HAFİF | TAM> — <gerekçe> (dilimden; review-r2.py brief kopyalar)

Bu brief `scripts/slice/review-r2.py brief` ile üretilir; elle yazılmış r2 brief'i kullanılmaz (`method/SLICE_LANE.md` adım 5). Aynı inceleyici oturumu (bulguları yazan oturum bağlamıyla devam eder; geliştiricinin oturumu asla değil). O oturum kaybolduysa (bağlam sınırı, çökme) yeni inceleyici oturumu önceki raporu + düzeltme diff'ini okur ve üstteki satır `Reviewer session: fresh — session gone: <neden>` olur. Kapsam varsayılan olarak dar (`narrow`): YALNIZ önceki turun bulguları, düzeltme diff'i ve düzeltmenin dokunduğu yer ("Kapsam" bölümü). Tam kapsam (`full`) yalnız şu gerekçelerden biriyle: `personal-data`, `tenant`, `permissions`, `money`, `schema`, `fix-larger-than-slice`, `redesign`; o zaman bütün dilim yeniden incelenir. İki satırın anahtarı ve değerleri sabit İngilizce sözcüklerdir; `review-r2.py check` ve `metrics.py` okur. 3. turdan itibaren brief `Re-ruling: redesign | split | narrow — <ne değişti>` ve `Blocking: <bulgu> money-loss | data-loss | permission-break` satırlarını, 4. turdan itibaren `Owner word: <tarih — sahibin sözü>` satırını da taşır (R-6); yoksa `review-r2.py` brief üretmez ve `check` FAIL verir. Hiçbir inceleme turunda tam takım koşmaz; merge öncesi entegrasyon koşusu tek tam koşudur. Önceki bağımsız temiz kanıt yalnız bağları ve kapsadığı davranış hâlâ geçerliyse yeniden kullanılır (`method/SLICE_LANE.md` "Evidence validity and reuse").

Karar: **PASS | REVISE**
Tarih: <YYYY-MM-DD> · Önceki inceleme: `<sha>` (`<SLICE-ID>-review.md`) · Aday: `<yeni sha>` · Worktree: `<yol>`, DB `<lane DB>`, port `<port>`
Güncel main `<sha>` / merge-base `<sha>`; test/standart/config, bağımlılık, DB/fixture, toolchain/ilgili ortam `<bağlar>`; yeniden kullanılan kanonik kayıtlar `<bağlantı + etkilenmeme gerekçesi>`. Aynı SHA veya `range-diff` tek başına yeterli değildir. Kod/taban/ilgili ortam değişimi etkilenen kanıtı geçersizleştirir; etki sınırlanamıyorsa geniş koşu gerekir. Aşağıdaki hedefli kontroller ve TAM/yüksek risk tekrarları korunur. Bu dosya bu inceleyicinin bu turdaki kanonik kararıdır; eski kayıtlar yeniden etiketlenmez.

## Kapsam

<!-- review-r2.py brief bu bölümü doldurur: önceki bulgular ve düzeltme parçaları, düzeltmelerin kesiştiği yerler, etkilenen testler, düzeltilen satırlarda mutasyonlar, dilimin yarış testleri, sözleşme seti. -->

## Kontroller

1. **Diff kapsamı:** `git diff <önceki-sha> <yeni-sha> --stat` → <n> dosya; izinli liste dışı: <yok / liste>.
2. **Her bulgu:**

| Bulgu | Sonuç | Kanıt (kendi yeniden üretimin: komut, istek, ekran) |
|---|---|---|
| R1 | KAPANDI / AÇIK / KABUL | <…> |

3. **Düzeltmeyi sabitleyen test:** "Kapsam"daki her düzeltme satırını geri al (mutasyon) → hangi test kırmızı; geri al, `git status --short` boş. HAFİF'te davranış değişikliği başına bir mutasyon; yeni/değişen davranış yoksa "uygulanmaz: <neden>" gerekçesini doğrula. Düzeltme UI'a (rota, görünüm, bileşen) dokunmuyorsa tarayıcı da gerekçeli uygulanmaz; uygulanabilir kontroller ve TAM şartları korunur.
4. **Kesişimler:** "Düzeltmelerin kesiştiği yerler"deki her çift için iki düzeltmeyi birlikte sınayan test (adı ya da yeni test) → kanıt; yoksa bulgu.
5. **Gerileme:** "Kapsam"daki etkilenen testler, yarış testleri ve (listelendiyse) sözleşme seti + dokunulan dosyalarda `{{static_analysis}}` / `{{standards_check}}`. Tam takım inceleme turunda koşmaz; kapı (`gate.sh`) test komutu tam takımı koşuyorsa o da koşmaz.
6. **Geliştiricinin yeni iddiaları:** yalnız doğrula, düzeltme isteme; yeni iş backlog'a.

## Bulgular

- <yok | yeni bulgu: önem, bloklayıcı mı, öneri>

Dilim turu varsa (`method/SLICE_LANE.md` adım 3b; `scripts/slice/tour.py check` yalnız bu güncel turu okur): `Tour report: <rapor yolu>` ya da `Tour exemption: confirmed — <gerekçe>` bu turda yeniden yazılır; yalnız değişen bulgular tabloya girecekse `Tour dispositions: carried forward from r<n-1>` satırı önceki turun satırlarını taşır (bu satır yoksa her bulgu bu turun tablosunda olmalıdır): `| Tur bulgusu | Durum | Blok | Çözüm |`.

## Özet (≤4 satır)
