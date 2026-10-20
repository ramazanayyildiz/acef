# <SLICE-ID> — hedefli yeniden inceleme (r<n>)

Aynı inceleyici oturumu (bulguları yazan oturum bağlamıyla devam eder; geliştiricinin oturumu asla değil). O oturum kaybolduysa (bağlam sınırı, çökme) yeni inceleyici oturumu önceki raporu + düzeltme diff'ini okur ve bunu buraya yazar: <aynı oturum | yeni oturum: neden>. Kapsam YALNIZ önceki turun bulguları + düzeltme diff'i. Tam inceleme tekrarlanmaz; önceki bağımsız temiz kanıt yalnız bağları ve kapsadığı davranış hâlâ geçerliyse yeniden kullanılır (`method/SLICE_LANE.md` "Evidence validity and reuse").

Karar: **PASS | REVISE**
Tarih: <YYYY-MM-DD> · Önceki inceleme: `<sha>` (`<SLICE-ID>-review.md`) · Aday: `<yeni sha>` · Worktree: `<yol>`, DB `<lane DB>`, port `<port>`
Güncel main `<sha>` / merge-base `<sha>`; test/standart/config, bağımlılık, DB/fixture, toolchain/ilgili ortam `<bağlar>`; yeniden kullanılan kanonik kayıtlar `<bağlantı + etkilenmeme gerekçesi>`. Aynı SHA veya `range-diff` tek başına yeterli değildir. Kod/taban/ilgili ortam değişimi etkilenen kanıtı geçersizleştirir; etki sınırlanamıyorsa geniş koşu gerekir. Aşağıdaki hedefli kontroller ve TAM/yüksek risk tekrarları korunur. Bu dosya bu inceleyicinin bu turdaki kanonik kararıdır; eski kayıtlar yeniden etiketlenmez.

## Kontroller

1. **Diff kapsamı:** `git diff <önceki-sha> <yeni-sha> --stat` → <n> dosya; izinli liste dışı: <yok / liste>.
2. **Her bulgu:**

| Bulgu | Sonuç | Kanıt (kendi yeniden üretimin: komut, istek, ekran) |
|---|---|---|
| R1 | KAPANDI / AÇIK / KABUL | <…> |

3. **Düzeltmeyi sabitleyen test:** düzeltmeyi geri al (mutasyon) → hangi test kırmızı; geri al, `git status --short` boş. HAFİF'te davranış değişikliği başına bir mutasyon; yeni/değişen davranış yoksa "uygulanmaz: <neden>" gerekçesini doğrula. Düzeltme UI'a (rota, görünüm, bileşen) dokunmuyorsa tarayıcı da gerekçeli uygulanmaz; uygulanabilir kontroller ve TAM şartları korunur.
4. **Gerileme:** düzeltmenin dokunduğu alanın testleri + kapı: `scripts/gate.sh <worktree>` → <son satır>.
5. **Geliştiricinin yeni iddiaları:** yalnız doğrula, düzeltme isteme; yeni iş backlog'a.

## Bulgular

- <yok | yeni bulgu: önem, bloklayıcı mı, öneri>

## Özet (≤4 satır)
